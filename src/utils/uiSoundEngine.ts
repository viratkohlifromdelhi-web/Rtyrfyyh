/**
 * Hybrid Public-GitHub Open-Source UI SFX + Zero-Latency Procedural Web Audio Synthesizer.
 *
 * Layer 1: Lazy-loads tiny MIT/CC0 public GitHub open-source UI sounds via jsDelivr CDN
 *          ONLY after the first user interaction inside requestIdleCallback (1500ms timeout).
 * Layer 2: Instant procedural Web Audio API fallback synthesizer guarantees 0ms latency,
 *          100% offline/4G reliability, soft capped gains (0.05-0.14), and ZERO interference
 *          with `Milky - Just The Way You Are (Official Audio).mp3`.
 */

export type UiSfxName =
  | 'tap'
  | 'toggle_click'
  | 'jump'
  | 'confetti_burst'
  | 'awww_chime'
  | 'ew_boing'
  | 'kiss_pop'
  | 'giggle'
  | 'surprise_bling'
  | 'wheel_tick'
  | 'sleep_sigh'
  | 'wake_chirp';

export const MODINO_SFX_STORAGE_KEY = 'modino_sfx_muted';
export const WHEEL_TICK_MIN_INTERVAL_MS = 35;

/**
 * Layer 1 — Public GitHub Open-Source UI Audio Manifest (MIT / CC0 via jsDelivr GitHub CDN).
 */
export const GITHUB_SFX_MANIFEST: Partial<Record<UiSfxName, string>> = {
  tap: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/button_tiny.mp3',
  toggle_click: 'https://cdn.jsdelivr.net/gh/joshwcomeau/use-sound@main/stories/sounds/pop-down.mp3',
  jump: 'https://cdn.jsdelivr.net/gh/joshwcomeau/use-sound@main/stories/sounds/pop-up-on.mp3',
  confetti_burst: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/bell_ring.mp3',
  awww_chime: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/glass.mp3',
  ew_boing: 'https://cdn.jsdelivr.net/gh/joshwcomeau/use-sound@main/stories/sounds/pop-up-off.mp3',
  kiss_pop: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/water_droplet_3.mp3',
  giggle: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/water_droplet_2.mp3',
  surprise_bling: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/cd_tray.mp3',
  wheel_tick: 'https://cdn.jsdelivr.net/gh/IonDen/ion.sound@master/sounds/snap.mp3',
};

const decodedBufferCache = new Map<UiSfxName, AudioBuffer>();
const muteListeners = new Set<(muted: boolean) => void>();

let sharedAudioCtx: AudioContext | null = null;
let preloadScheduled = false;
let lastWheelTickMs = -Infinity;
let userGestureUnlocked = false;
let gestureListenersAttached = false;

function hasUserActivation(): boolean {
  if (userGestureUnlocked) return true;
  if (typeof navigator !== 'undefined') {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
      .userActivation;
    if (ua?.hasBeenActive) {
      userGestureUnlocked = true;
      return true;
    }
  }
  return false;
}

function attachUserGestureUnlockListeners(): void {
  if (gestureListenersAttached || typeof window === 'undefined') return;
  gestureListenersAttached = true;

  const markUnlocked = () => {
    userGestureUnlocked = true;
    window.removeEventListener('pointerdown', markUnlocked, true);
    window.removeEventListener('touchstart', markUnlocked, true);
    window.removeEventListener('click', markUnlocked, true);
    window.removeEventListener('keydown', markUnlocked, true);
  };

  window.addEventListener('pointerdown', markUnlocked, { capture: true, passive: true });
  window.addEventListener('touchstart', markUnlocked, { capture: true, passive: true });
  window.addEventListener('click', markUnlocked, { capture: true, passive: true });
  window.addEventListener('keydown', markUnlocked, { capture: true, passive: true });
}

if (typeof window !== 'undefined') {
  attachUserGestureUnlockListeners();
}

function readInitialMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(MODINO_SFX_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let sfxMuted = readInitialMuted();

export function isUiSfxMuted(): boolean {
  return sfxMuted;
}

export function setUiSfxMuted(nextMuted: boolean): boolean {
  sfxMuted = Boolean(nextMuted);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODINO_SFX_STORAGE_KEY, String(sfxMuted));
    }
  } catch {
    // ignore storage restrictions
  }
  muteListeners.forEach((listener) => {
    try {
      listener(sfxMuted);
    } catch {
      // silent
    }
  });
  return sfxMuted;
}

export function toggleUiSfxMute(): boolean {
  return setUiSfxMuted(!sfxMuted);
}

export function subscribeUiSfxMute(listener: (muted: boolean) => void): () => void {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!hasUserActivation()) return null;
  try {
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioCtxCtor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {
        // autoplay policy will unlock on next gesture
      });
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 1500): Promise<Response> {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return fetch(url, { signal: AbortSignal.timeout(timeoutMs), mode: 'cors' });
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, mode: 'cors' });
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Lazily fetches & decodes public GitHub open-source UI sounds inside idle time
 * strictly AFTER the first user interaction so boot & intro video stay 0ms blocked.
 */
export function scheduleGithubSfxPreload(): void {
  if (preloadScheduled || typeof window === 'undefined' || typeof fetch === 'undefined') {
    return;
  }
  preloadScheduled = true;

  const entries = Object.entries(GITHUB_SFX_MANIFEST) as Array<[UiSfxName, string]>;
  let cursor = 0;

  const loadNext = () => {
    if (cursor >= entries.length) return;
    const [cue, url] = entries[cursor];
    cursor += 1;

    const ctx = getOrCreateAudioContext();
    if (!ctx || decodedBufferCache.has(cue)) {
      scheduleStep();
      return;
    }

    void fetchWithTimeout(url, 1500)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((arr) => ctx.decodeAudioData(arr))
      .then((buffer) => {
        // Keep only crisp short UI cues (< 1.5s) so nothing feels sluggish
        if (buffer && buffer.duration > 0 && buffer.duration <= 1.5) {
          decodedBufferCache.set(cue, buffer);
        }
      })
      .catch(() => {
        // Silently fall back to Layer 2 procedural synthesizer
      })
      .finally(() => {
        scheduleStep();
      });
  };

  const scheduleStep = () => {
    if (cursor >= entries.length) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => loadNext(), { timeout: 2000 });
    } else {
      window.setTimeout(loadNext, 220);
    }
  };

  scheduleStep();
}

function playDecodedBuffer(ctx: AudioContext, buffer: AudioBuffer, volume: number): boolean {
  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.min(0.14, Math.max(0.02, volume)), ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    return true;
  } catch {
    return false;
  }
}

/**
 * Layer 2 — Built-in zero-latency procedural Web Audio pastel synthesizer.
 */
function synthesizePastelSfx(ctx: AudioContext, name: UiSfxName): void {
  const now = ctx.currentTime;

  switch (name) {
    case 'tap':
    case 'toggle_click': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(name === 'tap' ? 660 : 620, now);
      osc.frequency.exponentialRampToValueAtTime(name === 'tap' ? 880 : 840, now + 0.045);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.095, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
      return;
    }

    case 'jump': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.13);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.145);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.155);
      return;
    }

    case 'giggle': {
      const notes = [740, 880, 1046.5];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.052;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.07, start + 0.042);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.095, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.056);
      });
      return;
    }

    case 'kiss_pop': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(1120, now + 0.075);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.095);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.115, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.115);
      return;
    }

    case 'awww_chime': {
      const bellNotes = [
        { offset: 0, freq: 1046.5 },
        { offset: 0.09, freq: 1318.51 },
      ];
      bellNotes.forEach((n) => {
        const start = now + n.offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.095, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.255);
      });
      return;
    }

    case 'ew_boing': {
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.19);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(22, now);
      lfoGain.gain.setValueAtTime(18, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.21);
      osc.stop(now + 0.21);
      return;
    }

    case 'surprise_bling': {
      const notes = [587.33, 880, 1174.66];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.13);
      });
      return;
    }

    case 'sleep_sigh': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
      return;
    }

    case 'wake_chirp': {
      const chirps = [
        { offset: 0, from: 620, to: 810 },
        { offset: 0.05, from: 760, to: 930 },
      ];
      chirps.forEach((c) => {
        const start = now + c.offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.from, start);
        osc.frequency.exponentialRampToValueAtTime(c.to, start + 0.042);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.095, start + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.052);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.06);
      });
      return;
    }

    case 'confetti_burst': {
      const triad = [523.25, 659.25, 783.99, 1046.5];
      triad.forEach((freq, idx) => {
        const start = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.095, start + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.175);
      });
      return;
    }

    case 'wheel_tick': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.018);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.024);
      return;
    }
  }
}

/**
 * Plays a crisp pastel UI sound effect:
 * 1) Uses decoded GitHub CDN buffer if already cached;
 * 2) Otherwise synthesizes seamlessly via Web Audio API at 0ms latency.
 */
export function playUiSfx(name: UiSfxName): boolean {
  if (sfxMuted) return false;

  if (name === 'wheel_tick') {
    const nowMs =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    if (nowMs < lastWheelTickMs) {
      lastWheelTickMs = -Infinity;
    }
    if (nowMs - lastWheelTickMs < WHEEL_TICK_MIN_INTERVAL_MS) {
      return false;
    }
    lastWheelTickMs = nowMs;
  }

  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return false;

    scheduleGithubSfxPreload();

    // Sleep sigh and wake chirp stay ultra-delicate procedural cues for exact pastel character tone
    if (name !== 'sleep_sigh' && name !== 'wake_chirp') {
      const cached = decodedBufferCache.get(name);
      if (cached) {
        const gainLevel = name === 'wheel_tick' ? 0.09 : 0.12;
        if (playDecodedBuffer(ctx, cached, gainLevel)) {
          return true;
        }
      }
    }

    synthesizePastelSfx(ctx, name);
    return true;
  } catch {
    return false;
  }
}
