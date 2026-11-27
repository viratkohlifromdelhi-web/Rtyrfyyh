/**
 * Staggered idle background preloader for SparkleBirth.
 *
 * Runs strictly AFTER the intro video begins smooth playback (or after a brief 300ms
 * grace window if the intro is skipped/bypassed) so it never competes with initial
 * paint or video startup bandwidth.
 *
 * Priority order (120ms breathing gaps between idle tasks):
 *   1. GPU image pre-decode (`img.decode()` inside try/catch):
 *      - Anamika's hero portrait (`IMG_20261126_131911_725.jpg`)
 *      - Case File 21 July screenshot (`Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png`)
 *   2. Lazy below-the-fold JS chunks in exact top-to-bottom visual scroll order
 *      (never loads OwnerAnalyticsDashboard)
 *   3. Gentle background MP3 preload upgrade (`preload="metadata"` -> `preload="auto"`)
 */

import { ORIGIN_AUDIO_CONFIG } from '../components/originStory/originScript';

export const PRELOAD_GAP_MS = 120;
export const PRELOAD_IDLE_TIMEOUT_MS = 1200;

export type PreloadTaskKind = 'image' | 'chunk' | 'audio';

export interface PreloadTask {
  id: string;
  kind: PreloadTaskKind;
  run: () => Promise<void>;
}

export interface WarmupScheduler {
  scheduleIdle: (fn: () => void, timeoutMs: number) => () => void;
  delay: (ms: number, fn: () => void) => () => void;
}

export interface BackgroundWarmupOptions {
  imageUrls: readonly string[];
  chunkLoaders: ReadonlyArray<() => Promise<unknown>>;
  onUpgradeAudioPreload?: () => void;
  gapMs?: number;
  idleTimeoutMs?: number;
  decodeImage?: (url: string) => Promise<void>;
  scheduler?: WarmupScheduler;
  onTaskComplete?: (taskId: string, kind: PreloadTaskKind) => void;
}

export function getDefaultPreloadImageUrls(baseUrl = '/'): readonly string[] {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return [
    `${normalizedBase}${encodeURIComponent('IMG_20261126_131911_725.jpg')}`,
    `${normalizedBase}${encodeURIComponent('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png')}`,
  ];
}

/**
 * Preloads and GPU-decodes an image cleanly via `img.decode()` wrapped in try/catch
 * so unsupported browsers or transient network glitches never reject the queue.
 */
export async function preDecodeImageUrl(url: string): Promise<void> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  try {
    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.src = url;

    if (typeof img.decode === 'function') {
      await img.decode();
      return;
    }

    await new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }
      const done = () => {
        img.onload = null;
        img.onerror = null;
        resolve();
      };
      img.onload = done;
      img.onerror = done;
    });
  } catch {
    // Non-fatal: browser will still decode image naturally when rendered
  }
}

export function createBrowserWarmupScheduler(): WarmupScheduler {
  const win = typeof window !== 'undefined'
    ? (window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      })
    : undefined;

  return {
    scheduleIdle(fn: () => void, timeoutMs: number): () => void {
      if (win && typeof win.requestIdleCallback === 'function') {
        const id = win.requestIdleCallback(fn, { timeout: timeoutMs });
        return () => {
          win.cancelIdleCallback?.(id);
        };
      }
      // Safari / non-rIC fallback
      const timerId = setTimeout(fn, 16);
      return () => {
        clearTimeout(timerId);
      };
    },
    delay(ms: number, fn: () => void): () => void {
      const timerId = setTimeout(fn, ms);
      return () => {
        clearTimeout(timerId);
      };
    },
  };
}

/**
 * Builds the exact ordered warmup queue:
 * Priority 1 (images) -> Priority 2 (lazy chunks) -> Priority 3 (audio preload upgrade).
 */
export function buildWarmupQueue(options: BackgroundWarmupOptions): PreloadTask[] {
  const decodeFn = options.decodeImage ?? preDecodeImageUrl;
  const tasks: PreloadTask[] = [];

  options.imageUrls.forEach((url, index) => {
    tasks.push({
      id: `image:${index}`,
      kind: 'image',
      run: async () => {
        try {
          await decodeFn(url);
        } catch {
          // Always resilient
        }
      },
    });
  });

  options.chunkLoaders.forEach((loader, index) => {
    tasks.push({
      id: `chunk:${index}`,
      kind: 'chunk',
      run: async () => {
        try {
          await loader();
        } catch {
          // Retry naturally when React.lazy mounts
        }
      },
    });
  });

  if (options.onUpgradeAudioPreload) {
    const upgradeAudio = options.onUpgradeAudioPreload;
    tasks.push({
      id: 'audio:upgrade',
      kind: 'audio',
      run: async () => {
        try {
          upgradeAudio();
        } catch {
          // Non-fatal
        }
      },
    });
  }

  return tasks;
}

/**
 * Executes a staggered idle warmup queue with `gapMs` breathing gaps between tasks.
 * Returns a cancellation function that halts any pending timers or idle callbacks.
 */
export function runWarmupQueue(
  tasks: readonly PreloadTask[],
  options: {
    gapMs?: number;
    idleTimeoutMs?: number;
    scheduler?: WarmupScheduler;
    onTaskComplete?: (taskId: string, kind: PreloadTaskKind) => void;
    onAllComplete?: () => void;
  } = {},
): () => void {
  const gapMs = options.gapMs ?? PRELOAD_GAP_MS;
  const idleTimeoutMs = options.idleTimeoutMs ?? PRELOAD_IDLE_TIMEOUT_MS;
  const scheduler = options.scheduler ?? createBrowserWarmupScheduler();

  let cancelled = false;
  let cancelPending: (() => void) | null = null;
  let cursor = 0;

  const scheduleNext = () => {
    if (cancelled) return;
    if (cursor >= tasks.length) {
      options.onAllComplete?.();
      return;
    }

    const currentTask = tasks[cursor++];
    cancelPending = scheduler.scheduleIdle(() => {
      cancelPending = null;
      if (cancelled) return;

      void currentTask.run().finally(() => {
        if (cancelled) return;
        options.onTaskComplete?.(currentTask.id, currentTask.kind);
        if (cursor >= tasks.length) {
          options.onAllComplete?.();
          return;
        }
        cancelPending = scheduler.delay(gapMs, scheduleNext);
      });
    }, idleTimeoutMs);
  };

  scheduleNext();

  return () => {
    cancelled = true;
    if (cancelPending) {
      cancelPending();
      cancelPending = null;
    }
  };
}

let sessionWarmupStarted = false;
let activeCancelWarmup: (() => void) | null = null;

/**
 * Starts the idempotent session-level background warmup queue once.
 */
export function startBackgroundWarmup(options: BackgroundWarmupOptions): () => void {
  if (sessionWarmupStarted) {
    return () => {};
  }
  sessionWarmupStarted = true;

  const tasks = buildWarmupQueue(options);
  const cancel = runWarmupQueue(tasks, {
    gapMs: options.gapMs,
    idleTimeoutMs: options.idleTimeoutMs,
    scheduler: options.scheduler,
    onTaskComplete: options.onTaskComplete,
    onAllComplete: () => {
      activeCancelWarmup = null;
    },
  });
  activeCancelWarmup = cancel;

  return () => {
    cancel();
    if (activeCancelWarmup === cancel) {
      activeCancelWarmup = null;
    }
  };
}

export function resetBackgroundWarmupForTesting(): void {
  if (activeCancelWarmup) {
    activeCancelWarmup();
    activeCancelWarmup = null;
  }
  sessionWarmupStarted = false;
}

export interface OriginStoryPreloadOptions {
  loadOriginStoryChunk: () => Promise<unknown>;
  kissAudioSrc?: string;
  preloadAudio?: (src: string) => void;
  scheduler?: WarmupScheduler;
  idleTimeoutMs?: number;
}

let originStoryPreloadStarted = false;
let activeCancelOriginPreload: (() => void) | null = null;

function quietPreloadAudioAsset(src: string): void {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return;
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0;
    audio.onerror = () => {
      // Silently ignore missing optional MP3 so zero console noise occurs
    };
    audio.src = src;
    audio.load();
  } catch {
    // Silently ignore in restricted environments
  }
}

/**
 * Stage 2 -> Stage 3 silent background preloader.
 * Runs inside requestIdleCallback (with setTimeout fallback) while the Opening
 * Curtain / Intro Video plays, warming up the lazy OriginStoryPlay JS chunk and
 * quietly preloading the Scene 5 kissing MP3 with zero console errors.
 */
export function preloadOriginStoryStageAssets(
  options: OriginStoryPreloadOptions,
): () => void {
  if (originStoryPreloadStarted) {
    return () => {};
  }
  originStoryPreloadStarted = true;

  const scheduler = options.scheduler ?? createBrowserWarmupScheduler();
  const idleTimeoutMs = options.idleTimeoutMs ?? PRELOAD_IDLE_TIMEOUT_MS;
  const kissAudioSrc = options.kissAudioSrc ?? ORIGIN_AUDIO_CONFIG.kissTrackSrc;
  const preloadAudio = options.preloadAudio ?? quietPreloadAudioAsset;

  let cancelled = false;
  const cancelIdle = scheduler.scheduleIdle(() => {
    activeCancelOriginPreload = null;
    if (cancelled) return;

    try {
      void Promise.resolve(options.loadOriginStoryChunk()).catch(() => {
        // React.lazy will retry naturally on mount
      });
    } catch {
      // React.lazy will retry naturally on mount
    }

    try {
      preloadAudio(kissAudioSrc);
    } catch {
      // Non-fatal
    }
  }, idleTimeoutMs);

  const cancel = () => {
    cancelled = true;
    cancelIdle();
    if (activeCancelOriginPreload === cancel) {
      activeCancelOriginPreload = null;
    }
  };
  activeCancelOriginPreload = cancel;

  return cancel;
}

export function resetOriginStoryPreloadForTesting(): void {
  if (activeCancelOriginPreload) {
    activeCancelOriginPreload();
    activeCancelOriginPreload = null;
  }
  originStoryPreloadStarted = false;
}

export const STORY_PRELOAD_TIER1_DELAY_MS = 350;
export const STORY_PRELOAD_TIER2_GAP_MS = 180;
export const MAIN_PREMOUNT_BREATHER_MS = 450;

/**
 * Exact 3-Beat Stage 3 -> Stage 4 Rose-Cream & Champagne-Gold Silk Curtain Reveal
 * and Staggered Main Page Arrival Timings (anchored to transition start t = 0ms).
 */
export const STAGE3_TO_MAIN_TIMING = {
  /** Beat 1: Warm luminescent veil gathers while OriginStoryPlay gently zooms forward */
  veilGatherMs: 380,
  /** Exact instant OriginStoryPlay unmounts and pre-painted Stage 4 switches active behind veil */
  stageSwapMs: 360,
  /** Milky - Just The Way You Are starts smoothly as the silk curtains prepare to part */
  musicStartMs: 280,
  /** Smooth Milky audio volume fade-in ramp (0 -> targetVolume) */
  musicFadeInMs: 750,
  /** Beat 2: Dual feathered silk curtains begin gliding apart outward */
  curtainPartStartMs: 380,
  /** Beat 2 complete: Silk curtains finish parting */
  curtainPartEndMs: 1080,
  /** Main Page Welcome Confetti cannons fire cleanly as curtains clear center Hero */
  confettiBurstMs: 650,
  /** Beat 3: Curtain overlay fades to 0 and unmounts cleanly from DOM */
  totalDurationMs: 1150,
  /** Total arrival timestamp for Modino (+1000ms extra delay after curtain/confetti) */
  modinoArrivalFromTransitionMs: 2000,
  /** Delay passed to ModinoPet once Stage 4 activates at 360ms (360 + 1640 = 2000ms) */
  modinoDelayAfterMainMountMs: 1640,
  /** Reduced-motion warm ivory crossfade timings */
  reducedMotionSwapMs: 180,
  reducedMotionTotalMs: 350,
  /** Snappy Replay Origin Story return crossfade timings */
  replayCrossfadeSwapMs: 175,
  replayCrossfadeTotalMs: 350,
} as const;

export interface StoryMainPreloadOptions {
  imageUrls?: readonly string[];
  tier1ChunkLoaders?: ReadonlyArray<() => Promise<unknown>>;
  tier2ChunkLoaders?: ReadonlyArray<() => Promise<unknown>>;
  onUpgradeAudioPreload?: () => void;
  tier1DelayMs?: number;
  tier2GapMs?: number;
  idleTimeoutMs?: number;
  decodeImage?: (url: string) => Promise<void>;
  scheduler?: WarmupScheduler;
  onTaskComplete?: (taskId: string, kind: PreloadTaskKind) => void;
  onTier1Complete?: () => void;
  onAllComplete?: () => void;
}

let storyMainPreloadStarted = false;
let activeCancelStoryMainPreload: (() => void) | null = null;

/**
 * Stage 3 -> Stage 4 idempotent silent preloader triggered the moment OriginStoryPlay mounts.
 *
 * - Priority Tier 1 (starts at 350ms after Scene 1 paint settles):
 *   1. Imports above-the-fold lazy Main Page chunks (`InteractiveTogglesSection`, `ModinoPet`)
 *   2. Preloads & GPU-decodes Anamika's Hero Scrapbook Photo and critical main-page images
 *   3. Upgrades `Milky - Just The Way You Are` to `preload="auto"` (strictly paused, volume = 0)
 *
 * - Priority Tier 2 (staggered `requestIdleCallback` slices separated by 180ms):
 *   Quietly imports all remaining below-the-fold Main Page sections without dropping frames.
 */
export function preloadMainPageDuringStory(
  options: StoryMainPreloadOptions = {},
): () => void {
  if (storyMainPreloadStarted) {
    return () => {};
  }
  storyMainPreloadStarted = true;
  // Prevent startBackgroundWarmup from duplicating already-queued Stage 3 preloads
  sessionWarmupStarted = true;

  const scheduler = options.scheduler ?? createBrowserWarmupScheduler();
  const tier1DelayMs = options.tier1DelayMs ?? STORY_PRELOAD_TIER1_DELAY_MS;
  const tier2GapMs = options.tier2GapMs ?? STORY_PRELOAD_TIER2_GAP_MS;
  const idleTimeoutMs = options.idleTimeoutMs ?? PRELOAD_IDLE_TIMEOUT_MS;
  const decodeFn = options.decodeImage ?? preDecodeImageUrl;
  const imageUrls = options.imageUrls ?? getDefaultPreloadImageUrls('/');
  const tier1ChunkLoaders = options.tier1ChunkLoaders ?? [];
  const tier2ChunkLoaders = options.tier2ChunkLoaders ?? [];

  let cancelled = false;
  let cancelDelay: (() => void) | null = null;
  let cancelTier2Queue: (() => void) | null = null;

  cancelDelay = scheduler.delay(tier1DelayMs, () => {
    cancelDelay = null;
    if (cancelled) return;

    const tier1Promises: Promise<unknown>[] = [];

    // Tier 1A: Above-the-fold & companion lazy chunks
    tier1ChunkLoaders.forEach((loader, idx) => {
      tier1Promises.push(
        Promise.resolve()
          .then(() => loader())
          .then(() => {
            if (!cancelled) options.onTaskComplete?.(`tier1:chunk:${idx}`, 'chunk');
          })
          .catch(() => {
            if (!cancelled) options.onTaskComplete?.(`tier1:chunk:${idx}`, 'chunk');
          }),
      );
    });

    // Tier 1B: Preload & GPU-decode Hero portrait and critical images
    imageUrls.forEach((url, idx) => {
      tier1Promises.push(
        Promise.resolve()
          .then(() => decodeFn(url))
          .then(() => {
            if (!cancelled) options.onTaskComplete?.(`tier1:image:${idx}`, 'image');
          })
          .catch(() => {
            if (!cancelled) options.onTaskComplete?.(`tier1:image:${idx}`, 'image');
          }),
      );
    });

    // Tier 1C: Warm up Milky audio strictly paused at volume 0
    if (options.onUpgradeAudioPreload) {
      try {
        options.onUpgradeAudioPreload();
      } catch {
        // Non-fatal
      }
      options.onTaskComplete?.('tier1:audio:upgrade', 'audio');
    }

    void Promise.allSettled(tier1Promises).finally(() => {
      if (cancelled) return;
      options.onTier1Complete?.();

      // Priority Tier 2: Staggered 180ms requestIdleCallback slices for all below-the-fold sections
      const tier2Tasks: PreloadTask[] = tier2ChunkLoaders.map((loader, idx) => ({
        id: `tier2:chunk:${idx}`,
        kind: 'chunk',
        run: async () => {
          try {
            await loader();
          } catch {
            // React.lazy will retry naturally if needed
          }
        },
      }));

      if (tier2Tasks.length === 0) {
        activeCancelStoryMainPreload = null;
        options.onAllComplete?.();
        return;
      }

      cancelTier2Queue = runWarmupQueue(tier2Tasks, {
        gapMs: tier2GapMs,
        idleTimeoutMs,
        scheduler,
        onTaskComplete: options.onTaskComplete,
        onAllComplete: () => {
          cancelTier2Queue = null;
          activeCancelStoryMainPreload = null;
          options.onAllComplete?.();
        },
      });
    });
  });

  const cancel = () => {
    cancelled = true;
    if (cancelDelay) {
      cancelDelay();
      cancelDelay = null;
    }
    if (cancelTier2Queue) {
      cancelTier2Queue();
      cancelTier2Queue = null;
    }
    if (activeCancelStoryMainPreload === cancel) {
      activeCancelStoryMainPreload = null;
    }
  };
  activeCancelStoryMainPreload = cancel;

  return cancel;
}

export function resetStoryMainPreloadForTesting(): void {
  if (activeCancelStoryMainPreload) {
    activeCancelStoryMainPreload();
    activeCancelStoryMainPreload = null;
  }
  storyMainPreloadStarted = false;
  resetBackgroundWarmupForTesting();
}


