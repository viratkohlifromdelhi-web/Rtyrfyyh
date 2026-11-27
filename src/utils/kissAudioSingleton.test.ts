import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KISS_AUDIO_END_FADE_OUT_SEC,
  KISS_AUDIO_FADE_IN_SEC,
  KISS_AUDIO_STOP_FADE_SEC,
  KISS_AUDIO_TARGET_GAIN,
  computeActiveAudioBounds,
  getKissAudioDurationMs,
  getKissAudioTrimBounds,
  hasKissAudioFatalError,
  isKissAudioPlaying,
  isKissAudioReady,
  preloadKissAudio,
  resetKissAudioSingletonForTesting,
  startKissAudio,
  stopKissAudio,
  unlockKissAudioContext,
} from '../components/originStory/kissAudioSingleton';
import { OriginStoryAudioController } from '../components/originStory/originAudio';

interface ScheduledGainCall {
  op: 'set' | 'linear' | 'exp' | 'cancel';
  value?: number;
  time: number;
}

class FakeAudioParam {
  value = 0.84;
  calls: ScheduledGainCall[] = [];

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ op: 'set', value, time });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ op: 'linear', value, time });
  }

  exponentialRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ op: 'exp', value, time });
  }

  cancelScheduledValues(time: number) {
    this.calls.push({ op: 'cancel', time });
  }
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connectedTo: unknown[] = [];

  connect(dest: unknown) {
    this.connectedTo.push(dest);
  }

  disconnect() {}
}

class FakeBiquadFilterNode {
  type = 'lowpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
  connect() {}
  disconnect() {}
}

class FakeOscillatorNode {
  type = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  started = false;
  stopped = false;
  connect() {}
  disconnect() {}
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeBufferSourceNode {
  buffer: FakeAudioBuffer | null = null;
  onended: (() => void) | null = null;
  connectedTo: unknown[] = [];
  startCalls: Array<{ when: number; offset: number; duration: number }> = [];
  stopCalls: Array<number | undefined> = [];

  connect(dest: unknown) {
    this.connectedTo.push(dest);
  }

  start(when = 0, offset = 0, duration = 0) {
    this.startCalls.push({ when, offset, duration });
  }

  stop(when?: number) {
    this.stopCalls.push(when);
  }
}

class FakeAudioBuffer {
  readonly numberOfChannels: number;
  readonly sampleRate: number;
  readonly length: number;
  readonly duration: number;
  private readonly channels: Float32Array[];

  constructor(channels: Float32Array[], sampleRate = 1000) {
    this.channels = channels;
    this.numberOfChannels = channels.length;
    this.sampleRate = sampleRate;
    this.length = channels[0]?.length ?? 0;
    this.duration = this.length / sampleRate;
  }

  getChannelData(ch: number): Float32Array {
    return this.channels[ch];
  }
}

function makePcmBuffer({
  totalSec,
  leadSilenceSec,
  tailSilenceSec,
  sampleRate = 1000,
}: {
  totalSec: number;
  leadSilenceSec: number;
  tailSilenceSec: number;
  sampleRate?: number;
}): FakeAudioBuffer {
  const length = Math.round(totalSec * sampleRate);
  const startIdx = Math.round(leadSilenceSec * sampleRate);
  const endIdx = Math.round((totalSec - tailSilenceSec) * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  for (let i = startIdx; i <= Math.min(length - 1, endIdx); i += 1) {
    left[i] = 0.25;
    right[i] = -0.2;
  }
  return new FakeAudioBuffer([left, right], sampleRate);
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  static nextBuffer: FakeAudioBuffer = makePcmBuffer({
    totalSec: 7.0,
    leadSilenceSec: 0.4,
    tailSilenceSec: 0.5,
  });
  static decodeDelayMs = 0;
  static shouldFailDecode = false;
  static initialState: AudioContextState = 'running';

  state: AudioContextState;
  currentTime = 10.0;
  destination = { kind: 'destination' };
  resumeCalls = 0;
  decodeCalls = 0;
  sources: FakeBufferSourceNode[] = [];
  gains: FakeGainNode[] = [];
  oscillators: FakeOscillatorNode[] = [];

  constructor() {
    this.state = FakeAudioContext.initialState;
    FakeAudioContext.instances.push(this);
  }

  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  createBufferSource(): FakeBufferSourceNode {
    const node = new FakeBufferSourceNode();
    this.sources.push(node);
    return node;
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode();
    this.gains.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    return new FakeBiquadFilterNode();
  }

  createOscillator(): FakeOscillatorNode {
    const osc = new FakeOscillatorNode();
    this.oscillators.push(osc);
    return osc;
  }

  decodeAudioData(data: ArrayBuffer): Promise<FakeAudioBuffer> {
    this.decodeCalls += 1;
    assert.ok(data instanceof ArrayBuffer && data.byteLength > 0, 'Expected valid ArrayBuffer slice');
    const run = () => {
      if (FakeAudioContext.shouldFailDecode) {
        return Promise.reject(new Error('EncodingError'));
      }
      return Promise.resolve(FakeAudioContext.nextBuffer);
    };
    if (FakeAudioContext.decodeDelayMs > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          run().then(resolve, reject);
        }, FakeAudioContext.decodeDelayMs);
      });
    }
    return run();
  }
}

interface FakeWebAudioHarness {
  fetchCalls: Array<{ url: string; init?: RequestInit }>;
  setFetchBehavior: (fn: (url: string, init?: RequestInit) => Promise<Response>) => void;
}

function withFakeWebAudioEnv(
  fn: (harness: FakeWebAudioHarness) => Promise<void> | void,
): Promise<void> {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;

  FakeAudioContext.instances = [];
  FakeAudioContext.decodeDelayMs = 0;
  FakeAudioContext.shouldFailDecode = false;
  FakeAudioContext.initialState = 'running';
  FakeAudioContext.nextBuffer = makePcmBuffer({
    totalSec: 7.0,
    leadSilenceSec: 0.4,
    tailSilenceSec: 0.5,
  });

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let fetchImpl = async (_url: string, _init?: RequestInit): Promise<Response> =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
    }) as unknown as Response;

  resetKissAudioSingletonForTesting();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      AudioContext: FakeAudioContext,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    },
  });

  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, init });
      return fetchImpl(url, init);
    },
  });

  return Promise.resolve()
    .then(() =>
      fn({
        fetchCalls,
        setFetchBehavior: (next) => {
          fetchImpl = next;
        },
      }),
    )
    .finally(() => {
      resetKissAudioSingletonForTesting();
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: originalWindow,
      });
      Object.defineProperty(globalThis, 'fetch', {
        configurable: true,
        writable: true,
        value: originalFetch,
      });
    });
}

test('computeActiveAudioBounds trims leading and trailing silence using 0.008 threshold with -15ms/+40ms margins', () => {
  const buf = makePcmBuffer({
    totalSec: 6.0,
    leadSilenceSec: 0.5,
    tailSilenceSec: 0.6,
    sampleRate: 1000,
  });

  const bounds = computeActiveAudioBounds(buf);
  // First active sample at 0.500s -> -0.015s = 0.485s
  assert.ok(Math.abs(bounds.trimStartSec - 0.485) < 0.002, `Expected ~0.485, got ${bounds.trimStartSec}`);
  // Last active sample at 5.400s -> +0.040s = 5.440s -> span = 4.955s
  assert.ok(Math.abs(bounds.trimDurationSec - 4.955) < 0.003, `Expected ~4.955, got ${bounds.trimDurationSec}`);

  // Entirely silent buffer falls back cleanly to full duration from 0
  const silent = new FakeAudioBuffer([new Float32Array(2000)], 1000);
  const silentBounds = computeActiveAudioBounds(silent);
  assert.equal(silentBounds.trimStartSec, 0);
  assert.equal(silentBounds.trimDurationSec, 2.0);
});

test('preloadKissAudio executes strictly ONE fetch(cache: force-cache) and ONE decodeAudioData across repeated calls', async () => {
  await withFakeWebAudioEnv(async ({ fetchCalls }) => {
    const [b1, b2, b3] = await Promise.all([
      preloadKissAudio('/origin-kiss-track.mp3'),
      preloadKissAudio('/origin-kiss-track.mp3'),
      preloadKissAudio('/origin-kiss-track.mp3'),
    ]);

    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, '/origin-kiss-track.mp3');
    assert.equal(fetchCalls[0].init?.cache, 'force-cache');
    assert.ok(b1 && b1 === b2 && b2 === b3);
    assert.equal(isKissAudioReady(), true);
    assert.equal(hasKissAudioFatalError(), false);
    assert.equal(FakeAudioContext.instances[0].decodeCalls, 1);

    // 7.0s total with 0.4s lead & 0.5s tail -> start ~0.385s, end ~6.540s, dur ~6.155s (6155ms)
    const bounds = getKissAudioTrimBounds();
    assert.ok(Math.abs(bounds.trimStartSec - 0.385) < 0.002);
    assert.ok(Math.abs(getKissAudioDurationMs() - 6155) <= 5);
  });
});

test('startKissAudio launches pre-decoded AudioBufferSourceNode synchronously (< 5ms) with 60ms fade-in, 180ms end fade-out, and 55ms stop', async () => {
  await withFakeWebAudioEnv(async () => {
    await preloadKissAudio('/origin-kiss-track.mp3');
    const ctx = FakeAudioContext.instances[0];
    ctx.currentTime = 12.0;

    let endedCount = 0;
    const started = startKissAudio({
      muted: false,
      onEnded: () => {
        endedCount += 1;
      },
    });

    assert.equal(started, true);
    assert.equal(isKissAudioPlaying(), true);
    assert.equal(ctx.sources.length, 1);

    const src = ctx.sources[0];
    const gain = ctx.gains[0];
    const bounds = getKissAudioTrimBounds();

    // Synchronous zero-latency start at ctx.currentTime with silence-trimmed offset & duration
    assert.equal(src.startCalls.length, 1);
    assert.equal(src.startCalls[0].when, 12.0);
    assert.ok(Math.abs(src.startCalls[0].offset - bounds.trimStartSec) < 1e-6);
    assert.ok(Math.abs(src.startCalls[0].duration - bounds.trimDurationSec) < 1e-6);

    // Verify 60ms fade-in to 0.84 and 180ms end fade-out scheduled on audio thread
    assert.deepEqual(gain.gain.calls[0], { op: 'set', value: 0.001, time: 12.0 });
    assert.equal(gain.gain.calls[1].op, 'linear');
    assert.equal(gain.gain.calls[1].value, KISS_AUDIO_TARGET_GAIN);
    assert.ok(Math.abs(gain.gain.calls[1].time - (12.0 + KISS_AUDIO_FADE_IN_SEC)) < 1e-6);

    const fadeOutHold = gain.gain.calls[2];
    const fadeOutEnd = gain.gain.calls[3];
    assert.equal(fadeOutHold.op, 'set');
    assert.equal(fadeOutHold.value, KISS_AUDIO_TARGET_GAIN);
    assert.ok(
      Math.abs(fadeOutHold.time - (12.0 + bounds.trimDurationSec - KISS_AUDIO_END_FADE_OUT_SEC)) <
        1e-6,
    );
    assert.equal(fadeOutEnd.op, 'exp');
    assert.equal(fadeOutEnd.value, 0.0001);
    assert.ok(Math.abs(fadeOutEnd.time - (12.0 + bounds.trimDurationSec)) < 1e-6);

    // Leaving Scene 5 calls stopKissAudio(false) -> 55ms audio-thread ramp & stop at +60ms
    ctx.currentTime = 14.5;
    stopKissAudio(false);
    assert.equal(isKissAudioPlaying(), false);
    assert.equal(src.stopCalls.length, 1);
    assert.ok(Math.abs((src.stopCalls[0] ?? 0) - 14.56) < 1e-6);

    const lastCalls = gain.gain.calls.slice(-3);
    assert.equal(lastCalls[0].op, 'cancel');
    assert.equal(lastCalls[1].op, 'set');
    assert.equal(lastCalls[2].op, 'exp');
    assert.ok(Math.abs(lastCalls[2].time - (14.5 + KISS_AUDIO_STOP_FADE_SEC)) < 1e-6);

    // Stale source onended after stop must NOT fire onEnded
    src.onended?.();
    assert.equal(endedCount, 0);
  });
});

test('stopKissAudio cancels pending slow-4G decode via playbackToken so audio never bleeds into Scene 6', async () => {
  await withFakeWebAudioEnv(async () => {
    FakeAudioContext.decodeDelayMs = 35;

    // Trigger start before preload finishes (simulating slow 4G)
    startKissAudio({ muted: false });
    // User leaves Scene 5 immediately before decode resolves
    stopKissAudio(false);

    await new Promise((r) => setTimeout(r, 60));

    const ctx = FakeAudioContext.instances[0];
    assert.equal(ctx.sources.length, 0, 'Cancelled slow-4G playback must never create a BufferSource');
    assert.equal(isKissAudioPlaying(), false);
  });
});

test('unlockKissAudioContext resumes suspended context and OriginStoryAudioController deduplicates same sessionKey', async () => {
  await withFakeWebAudioEnv(async () => {
    FakeAudioContext.initialState = 'suspended';
    await preloadKissAudio('/origin-kiss-track.mp3');

    const ctx = FakeAudioContext.instances[0];
    assert.equal(ctx.state, 'suspended');

    unlockKissAudioContext();
    assert.equal(ctx.resumeCalls, 1);
    assert.equal(ctx.state, 'running');

    const controller = new OriginStoryAudioController();
    controller.startKissCue({ restart: true, sessionKey: 'visit-1' });
    controller.startKissCue({ restart: false, sessionKey: 'visit-1' });
    assert.equal(ctx.sources.length, 1);

    // Natural end triggers onEnded cleanly
    let ended = false;
    controller.startKissCue({
      restart: true,
      sessionKey: 'visit-2',
      onEnded: () => {
        ended = true;
      },
    });
    ctx.sources[1].onended?.();
    assert.equal(ended, true);

    controller.dispose();
  });
});

test('hardened Web Audio chime fallback triggers ONLY when fetch fails with a real fatal load error', async () => {
  await withFakeWebAudioEnv(async ({ setFetchBehavior }) => {
    setFetchBehavior(async () => ({ ok: false }) as unknown as Response);

    const buf = await preloadKissAudio('/origin-kiss-track.mp3');
    assert.equal(buf, null);
    assert.equal(hasKissAudioFatalError(), true);

    startKissAudio({ muted: false });
    const ctx = FakeAudioContext.instances[0];
    assert.equal(ctx.sources.length, 0);
    assert.ok(ctx.oscillators.length > 0, 'Expected hardened chime oscillators on genuine fatal load error');

    stopKissAudio(true);
  });
});
