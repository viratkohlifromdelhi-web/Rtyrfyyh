import { ORIGIN_AUDIO_CONFIG } from './originScript';

/**
 * Zero-Latency Pre-Decoded Web Audio PCM Engine for Scene 5's kissing soundtrack
 * (`/origin-kiss-track.mp3`, backed by `public/In The Night No Control ... .mp3`).
 *
 * Architecture:
 * - Zero `HTMLAudioElement` / `new Audio(...)` usage anywhere (mobile browsers ignore
 *   `preload="auto"` on `<audio>` and spin up decoders lazily on Scene 5).
 * - Strictly ONE `fetch(src, { cache: 'force-cache' })` -> `ArrayBuffer` ->
 *   `AudioContext.decodeAudioData()` during the Stage 2 Intro Video (Wave 1), caching
 *   the decoded PCM `AudioBuffer` directly in RAM.
 * - Automatic leading/trailing silence trimmer (`computeActiveAudioBounds`) scans PCM
 *   samples for `Math.abs(sample) > 0.008` (~-42dB) so vocals/music begin cleanly with
 *   < 5ms start latency and sample-accurate ending.
 * - Dedicated audio-thread `GainNode` scheduling: 60ms fade-in to 0.84, smooth 180ms
 *   tail fade-out, and an instant click-free 55ms audio-thread stop when leaving Scene 5.
 * - Monotonically incrementing `playbackToken` prevents race conditions across rapid
 *   navigation, React StrictMode remounts, or slow-4G pending decodes.
 * - Hardened Web Audio chime fallback triggers ONLY when `hasFatalLoadError === true`.
 */

const SILENCE_THRESHOLD = 0.008;
const LEAD_MARGIN_SEC = 0.015;
const TAIL_MARGIN_SEC = 0.04;
const MIN_TRIM_DURATION_SEC = 0.2;

export const KISS_AUDIO_TARGET_GAIN = 0.84;
export const KISS_AUDIO_FADE_IN_SEC = 0.06;
export const KISS_AUDIO_END_FADE_OUT_SEC = 0.18;
export const KISS_AUDIO_STOP_FADE_SEC = 0.055;
export const KISS_AUDIO_IMMEDIATE_STOP_FADE_SEC = 0.02;

export interface ActiveAudioBounds {
  readonly trimStartSec: number;
  readonly trimDurationSec: number;
}

export interface StartKissAudioOptions {
  muted?: boolean;
  onEnded?: () => void;
}

type AudioContextCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;
let rawBytesPromise: Promise<ArrayBuffer | null> | null = null;
let rawBytesBuffer: ArrayBuffer | null = null;
let decodedBuffer: AudioBuffer | null = null;
let decodePromise: Promise<AudioBuffer | null> | null = null;
let trimStartSec = 0;
let trimDurationSec = 0;
let activeSource: AudioBufferSourceNode | null = null;
let activeGain: GainNode | null = null;
let activeFallbackNodes: AudioNode[] = [];
let activeFallbackGain: GainNode | null = null;
let activeFallbackEndTimer: number | null = null;
let playbackToken = 0;
let hasFatalLoadError = false;
let activeTrackSrc: string = ORIGIN_AUDIO_CONFIG.kissTrackSrc;

/**
 * Pure PCM silence trimmer: scans all channels of a decoded AudioBuffer for the first
 * and last sample exceeding `0.008` (~-42 dB) so leading/trailing MP3 encoder padding
 * and silent intro frames never delay Scene 5's kiss start or linger past the ending.
 */
export function computeActiveAudioBounds(buffer: {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  getChannelData: (channel: number) => ArrayLike<number>;
}): ActiveAudioBounds {
  const { numberOfChannels, length, sampleRate, duration } = buffer;
  if (!Number.isFinite(duration) || duration <= 0 || length <= 0 || sampleRate <= 0 || numberOfChannels <= 0) {
    return { trimStartSec: 0, trimDurationSec: Math.max(0, Number.isFinite(duration) ? duration : 0) };
  }

  let firstActiveSample = length;
  let lastActiveSample = -1;

  for (let ch = 0; ch < numberOfChannels; ch += 1) {
    const channelData = buffer.getChannelData(ch);
    const len = channelData.length;

    // Scan forward only up to the earliest active sample found so far
    for (let i = 0; i < Math.min(len, firstActiveSample); i += 1) {
      if (Math.abs(channelData[i]) > SILENCE_THRESHOLD) {
        firstActiveSample = i;
        break;
      }
    }

    // Scan backward only down to the latest active sample found so far
    for (let i = len - 1; i > lastActiveSample; i -= 1) {
      if (Math.abs(channelData[i]) > SILENCE_THRESHOLD) {
        lastActiveSample = i;
        break;
      }
    }
  }

  // Entirely silent buffer: play full duration from 0
  if (lastActiveSample < 0 || firstActiveSample >= length) {
    return { trimStartSec: 0, trimDurationSec: duration };
  }

  const computedStart = Math.max(0, firstActiveSample / sampleRate - LEAD_MARGIN_SEC);
  const computedEnd = Math.min(duration, lastActiveSample / sampleRate + TAIL_MARGIN_SEC);
  const rawSpan = Math.max(MIN_TRIM_DURATION_SEC, computedEnd - computedStart);
  const maxAvailableSpan = Math.max(0, duration - computedStart);
  const computedDuration =
    maxAvailableSpan >= MIN_TRIM_DURATION_SEC
      ? Math.min(maxAvailableSpan, rawSpan)
      : maxAvailableSpan;

  return {
    trimStartSec: computedStart,
    trimDurationSec: computedDuration,
  };
}

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return win.AudioContext || win.webkitAudioContext || null;
}

function ensureKissAudioContext(): AudioContext | null {
  if (audioCtx && audioCtx.state !== 'closed') {
    return audioCtx;
  }
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function decodeArrayBufferWithContext(
  ctx: AudioContext,
  data: ArrayBuffer,
): Promise<AudioBuffer> {
  return new Promise<AudioBuffer>((resolve, reject) => {
    let settled = false;
    const onSuccess = (buf: AudioBuffer) => {
      if (settled) return;
      settled = true;
      resolve(buf);
    };
    const onError = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    try {
      // Pass a detached-safe copy so retry after unlock always has intact bytes
      const copy = data.slice(0);
      const maybePromise = ctx.decodeAudioData(copy, onSuccess, onError);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(onSuccess, onError);
      }
    } catch (err) {
      onError(err);
    }
  });
}

function decodeKissBytes(rawBytes: ArrayBuffer): Promise<AudioBuffer | null> {
  if (decodedBuffer) {
    return Promise.resolve(decodedBuffer);
  }
  if (decodePromise) {
    return decodePromise;
  }

  const ctx = ensureKissAudioContext();
  if (!ctx) {
    return Promise.resolve(null);
  }

  decodePromise = decodeArrayBufferWithContext(ctx, rawBytes)
    .then((audioBuffer) => {
      decodedBuffer = audioBuffer;
      const bounds = computeActiveAudioBounds(audioBuffer);
      trimStartSec = bounds.trimStartSec;
      trimDurationSec = bounds.trimDurationSec;
      hasFatalLoadError = false;
      return audioBuffer;
    })
    .catch(() => {
      decodePromise = null;
      // Only flag fatal decode failure when AudioContext is active; if suspended on a
      // strict browser, keep rawBytesBuffer intact so unlockKissAudioContext() retries cleanly.
      if (ctx.state === 'running') {
        hasFatalLoadError = true;
      }
      return null;
    });

  return decodePromise;
}

/**
 * Synchronously creates/resumes the Web AudioContext on any early user gesture
 * (Midnight Lock unlock, Intro tap, Scenes 1–4 Next taps) and immediately kicks off
 * `decodeAudioData` if raw bytes have already arrived.
 */
export function unlockKissAudioContext(): void {
  const ctx = ensureKissAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    try {
      const resumeResult = ctx.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') {
        void resumeResult.catch(() => {
          // Ignore autoplay restriction silently
        });
      }
    } catch {
      // Ignore resume errors
    }
  }

  if (!decodedBuffer && !decodePromise) {
    if (rawBytesBuffer) {
      void decodeKissBytes(rawBytesBuffer);
    } else if (rawBytesPromise) {
      void rawBytesPromise.then((buf) => {
        if (buf && !decodedBuffer && !decodePromise) {
          void decodeKissBytes(buf);
        }
      });
    }
  }
}

/**
 * Strictly idempotent single-fetch preloader + PCM decoder for Scene 5's kiss track.
 * Safe to call during Stage 2 Intro Video (Wave 1), Stage 3, or StrictMode remounts:
 * `fetch(src, { cache: 'force-cache' })` is guaranteed to execute at most ONCE.
 */
export function preloadKissAudio(
  src: string = ORIGIN_AUDIO_CONFIG.kissTrackSrc,
): Promise<AudioBuffer | null> {
  if (decodedBuffer) {
    return Promise.resolve(decodedBuffer);
  }
  if (decodePromise) {
    return decodePromise;
  }
  if (rawBytesPromise) {
    return rawBytesPromise.then((buf) => (buf ? decodeKissBytes(buf) : null));
  }

  activeTrackSrc = src;

  rawBytesPromise = (async () => {
    if (typeof fetch !== 'function') {
      return null;
    }
    try {
      const res = await fetch(src, { cache: 'force-cache' });
      if (!res.ok) {
        hasFatalLoadError = true;
        return null;
      }
      const arrayBuf = await res.arrayBuffer();
      if (!arrayBuf || arrayBuf.byteLength === 0) {
        hasFatalLoadError = true;
        return null;
      }
      rawBytesBuffer = arrayBuf;
      hasFatalLoadError = false;
      return arrayBuf;
    } catch {
      hasFatalLoadError = true;
      return null;
    }
  })();

  return rawBytesPromise.then((buf) => {
    if (!buf) return null;
    return decodeKissBytes(buf);
  });
}

function stopFallbackChime(fadeSec = KISS_AUDIO_STOP_FADE_SEC): void {
  if (activeFallbackEndTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(activeFallbackEndTimer);
    activeFallbackEndTimer = null;
  }

  const ctx = audioCtx;
  const gain = activeFallbackGain;
  const nodes = activeFallbackNodes;
  activeFallbackGain = null;
  activeFallbackNodes = [];

  if (!gain || !ctx || ctx.state === 'closed') {
    return;
  }

  try {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    const currentVal = Number.isFinite(gain.gain.value) ? Math.max(0.0001, gain.gain.value) : 0.06;
    gain.gain.setValueAtTime(currentVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.015, fadeSec));

    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        for (const node of nodes) {
          try {
            if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
              (node as OscillatorNode).stop();
            }
          } catch {
            // already stopped
          }
          try {
            node.disconnect();
          } catch {
            // already disconnected
          }
        }
      }, Math.ceil(fadeSec * 1000) + 40);
    }
  } catch {
    // silent teardown
  }
}

function playHardenedFallbackChime(
  ctx: AudioContext,
  myToken: number,
  onEnded?: () => void,
): void {
  if (myToken !== playbackToken || ctx.state === 'closed') return;

  try {
    stopFallbackChime(KISS_AUDIO_IMMEDIATE_STOP_FADE_SEC);

    const now = ctx.currentTime;
    const totalSec = Math.max(1.5, ORIGIN_AUDIO_CONFIG.fallbackSynthDurationMs / 1000);
    const fadeOutSec = 0.45;
    const holdUntilSec = Math.max(0.5, totalSec - fadeOutSec);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.075, now + 0.14);
    masterGain.gain.setValueAtTime(0.075, now + holdUntilSec);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + totalSec);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(0.8, now);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    const freqs = [261.63, 329.63, 392.0, 493.88, 587.33];
    const created: AudioNode[] = [filter, masterGain];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.detune.setValueAtTime((idx - 2) * 3.5, now);

      voiceGain.gain.setValueAtTime(idx < 3 ? 0.24 : 0.14, now);
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now + idx * 0.04);
      osc.stop(now + totalSec + 0.08);
      created.push(osc, voiceGain);
    });

    activeFallbackGain = masterGain;
    activeFallbackNodes = created;

    if (typeof window !== 'undefined') {
      const gainRef = masterGain;
      activeFallbackEndTimer = window.setTimeout(() => {
        activeFallbackEndTimer = null;
        if (activeFallbackGain === gainRef) {
          activeFallbackGain = null;
          activeFallbackNodes = [];
          if (myToken === playbackToken) {
            onEnded?.();
          }
        }
      }, Math.ceil(totalSec * 1000) + 100);
    }
  } catch {
    // never throw on fallback synthesis
  }
}

/**
 * Click-free audio-thread stop for Scene 5's kiss track.
 * - Immediately increments `playbackToken` so any pending async slow-4G decode aborts cleanly.
 * - Schedules an exponential ramp to `0.0001` over `55ms` (or `20ms` when `immediate = true`)
 *   on the dedicated audio thread and calls `source.stop(now + stopDelay)`.
 */
export function stopKissAudio(immediate = false): void {
  playbackToken += 1;

  const fadeSec = immediate ? KISS_AUDIO_IMMEDIATE_STOP_FADE_SEC : KISS_AUDIO_STOP_FADE_SEC;
  const stopDelaySec = immediate ? 0.025 : 0.06;

  stopFallbackChime(fadeSec);

  const source = activeSource;
  const gain = activeGain;
  activeSource = null;
  activeGain = null;

  if (!source) return;

  try {
    source.onended = null;
  } catch {
    // ignore
  }

  const ctx = audioCtx;
  if (gain && ctx && ctx.state !== 'closed') {
    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      const currentVal = Number.isFinite(gain.gain.value)
        ? Math.max(0.0001, gain.gain.value)
        : KISS_AUDIO_TARGET_GAIN;
      gain.gain.setValueAtTime(currentVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
      source.stop(now + stopDelaySec);
      return;
    } catch {
      // fall through to direct stop
    }
  }

  try {
    source.stop();
  } catch {
    // already stopped
  }
}

/**
 * Zero-latency (< 5ms) synchronous trigger for Scene 5's pre-decoded PCM `AudioBuffer`.
 *
 * - Fast path (normal case after Stage 2 preload): synchronously creates an
 *   `AudioBufferSourceNode` -> `GainNode` -> `destination`, schedules the audio-thread
 *   fade-in (60ms -> 0.84) and natural end fade-out (180ms -> 0.0001), and starts playback
 *   at `trimStartSec` for `trimDurationSec` with zero main-thread rAF loops.
 * - Slow-4G fallback: if decode is still in flight, awaits `decodePromise` and starts
 *   automatically if `playbackToken` is still current.
 * - Fatal-only chime fallback: fires ONLY if `hasFatalLoadError === true`.
 */
export function startKissAudio(options: StartKissAudioOptions = {}): boolean {
  stopKissAudio(true);
  const myToken = ++playbackToken;

  if (options.muted) {
    return false;
  }

  const ctx = ensureKissAudioContext();
  if (!ctx) {
    return false;
  }

  if (ctx.state === 'suspended') {
    try {
      const resumeResult = ctx.resume();
      if (resumeResult && typeof resumeResult.catch === 'function') {
        void resumeResult.catch(() => {
          // ignore autoplay restriction
        });
      }
    } catch {
      // ignore
    }
  }

  const scheduleBuffer = (buffer: AudioBuffer): boolean => {
    if (myToken !== playbackToken || ctx.state === 'closed') {
      return false;
    }

    try {
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      const playDuration =
        trimDurationSec > 0
          ? trimDurationSec
          : Math.max(MIN_TRIM_DURATION_SEC, buffer.duration - trimStartSec);
      const fadeOutStart = Math.max(
        now + KISS_AUDIO_FADE_IN_SEC + 0.02,
        now + playDuration - KISS_AUDIO_END_FADE_OUT_SEC,
      );

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(KISS_AUDIO_TARGET_GAIN, now + KISS_AUDIO_FADE_IN_SEC);
      gain.gain.setValueAtTime(KISS_AUDIO_TARGET_GAIN, fadeOutStart);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + playDuration);

      source.connect(gain);
      gain.connect(ctx.destination);

      activeSource = source;
      activeGain = gain;

      source.onended = () => {
        if (activeSource === source) {
          activeSource = null;
          activeGain = null;
        }
        if (myToken === playbackToken) {
          options.onEnded?.();
        }
      };

      source.start(now, trimStartSec, playDuration);
      return true;
    } catch {
      if (hasFatalLoadError && myToken === playbackToken) {
        playHardenedFallbackChime(ctx, myToken, options.onEnded);
      }
      return false;
    }
  };

  // Fast path (< 5ms synchronous start from pre-decoded RAM buffer)
  if (decodedBuffer) {
    return scheduleBuffer(decodedBuffer);
  }

  // Genuine fatal load error -> hardened fallback chime
  if (hasFatalLoadError) {
    playHardenedFallbackChime(ctx, myToken, options.onEnded);
    return true;
  }

  // Slow-4G edge case: await in-flight fetch/decode and launch as soon as ready
  const pendingDecode =
    decodePromise ??
    (rawBytesBuffer ? decodeKissBytes(rawBytesBuffer) : preloadKissAudio(activeTrackSrc));

  void pendingDecode.then((buf) => {
    if (myToken !== playbackToken) return;
    if (buf) {
      if (ctx.state === 'suspended') {
        try {
          void ctx.resume().catch(() => {});
        } catch {
          // ignore
        }
      }
      scheduleBuffer(buf);
    } else if (hasFatalLoadError) {
      playHardenedFallbackChime(ctx, myToken, options.onEnded);
    } else {
      options.onEnded?.();
    }
  });

  return true;
}

/**
 * Returns the trimmed, silence-free duration of the decoded Scene 5 kiss clip in milliseconds
 * (or `0` if not decoded yet).
 */
export function getKissAudioDurationMs(): number {
  if (!decodedBuffer || trimDurationSec <= 0) {
    return 0;
  }
  return Math.round(trimDurationSec * 1000);
}

export function getKissAudioTrimBounds(): ActiveAudioBounds {
  return {
    trimStartSec,
    trimDurationSec,
  };
}

export function hasKissAudioFatalError(): boolean {
  return hasFatalLoadError;
}

export function isKissAudioReady(): boolean {
  return Boolean(decodedBuffer);
}

export function isKissAudioPlaying(): boolean {
  return Boolean(activeSource || activeFallbackGain);
}

export function resetKissAudioSingletonForTesting(): void {
  stopKissAudio(true);
  if (audioCtx) {
    try {
      if (typeof audioCtx.close === 'function' && audioCtx.state !== 'closed') {
        void audioCtx.close().catch(() => {});
      }
    } catch {
      // ignore
    }
  }
  audioCtx = null;
  rawBytesPromise = null;
  rawBytesBuffer = null;
  decodedBuffer = null;
  decodePromise = null;
  trimStartSec = 0;
  trimDurationSec = 0;
  activeSource = null;
  activeGain = null;
  activeFallbackNodes = [];
  activeFallbackGain = null;
  activeFallbackEndTimer = null;
  playbackToken = 0;
  hasFatalLoadError = false;
  activeTrackSrc = ORIGIN_AUDIO_CONFIG.kissTrackSrc;
}
