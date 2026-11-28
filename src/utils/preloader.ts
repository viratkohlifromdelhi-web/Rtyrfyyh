/**
 * Bandwidth-safe, strictly idempotent full-pipeline background preloader for SparkleBirth.
 *
 * Stage 2 (Intro Video) 3-Wave Staggered Pipeline (`startIntroPlaybackPreload`):
 *   Triggered strictly AFTER the Intro Video confirms smooth playback (`playing` + 350ms grace
 *   breather, or 1200ms safety fallback) so zero parallel downloads compete with video startup:
 *   - Wave 1 (+0ms after trigger): OriginStoryPlay JS/animation bundle, single shared Scene 5
 *     kiss audio singleton (`preloadKissAudio()`), and silent UI SFX engine warmup.
 *   - Wave 2 (+750ms after trigger): Single shared Milky background song `preload="auto"`
 *     upgrade (strictly paused at volume = 0) + all 8 critical images (Hero portrait, Case File
 *     #0721, Baad Me Reveal, and all 5 Friend List PFPs) preloaded & GPU-decoded in staggered
 *     pairs of 2 every 180ms.
 *   - Wave 3 (+1600ms after trigger): All Main Birthday Page lazy chunks in priority order
 *     (above-the-fold -> mid-page -> lower-page) inside requestIdleCallback slices spaced 160ms
 *     apart (strictly excluding OwnerAnalyticsDashboard).
 *
 * Stage 3 (`preloadMainPageDuringStory`) & fallback (`startBackgroundWarmup`) share the exact
 * same module-level deduplication Sets/Map/flags so anything already loaded during the Intro
 * Video is skipped in 0ms and zero files ever download twice.
 */

import { ORIGIN_AUDIO_CONFIG } from '../components/originStory/originScript';
import { preloadKissAudio } from '../components/originStory/kissAudioSingleton';
import { scheduleGithubSfxPreload } from './uiSoundEngine';

export const PRELOAD_GAP_MS = 120;
export const PRELOAD_IDLE_TIMEOUT_MS = 1200;

/** Stage 2 Intro Video playback trigger protection constants */
export const INTRO_PRELOAD_GRACE_BREATHER_MS = 350;
export const INTRO_PRELOAD_SAFETY_FALLBACK_MS = 1200;

/** Stage 2 3-Wave staggered preload timings (relative to trigger t = 0ms) */
export const INTRO_WAVE1_DELAY_MS = 0;
export const INTRO_WAVE2_DELAY_MS = 750;
export const INTRO_WAVE3_DELAY_MS = 1600;
export const INTRO_IMAGE_PAIR_SIZE = 2;
export const INTRO_IMAGE_PAIR_GAP_MS = 180;
export const INTRO_WAVE3_CHUNK_GAP_MS = 160;

export type PreloadTaskKind = 'image' | 'chunk' | 'audio' | 'sfx';

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

export const FRIEND_PFP_FILENAMES = [
  'abhay.png',
  'Anamika.png',
  'ankit.png',
  'ayush.png',
  'harsh.png',
] as const;

export const CORE_PRELOAD_IMAGE_COUNT = 3;

export function getFriendPfpImageUrls(baseUrl = '/'): readonly string[] {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return FRIEND_PFP_FILENAMES.map((filename) => `${normalizedBase}${encodeURIComponent(filename)}`);
}

export function getDefaultPreloadImageUrls(baseUrl = '/'): readonly string[] {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return [
    `${normalizedBase}${encodeURIComponent('IMG_20261126_131911_725.jpg')}`,
    `${normalizedBase}${encodeURIComponent('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png')}`,
    `${normalizedBase}${encodeURIComponent('Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png')}`,
    ...getFriendPfpImageUrls(normalizedBase),
  ];
}

// ============================================================================
// Shared Module-Level Deduplication Caches (Zero Duplicate Downloads)
// ============================================================================

// Retain strong references to preloaded HTMLImageElement instances so the browser
// keeps decoded bitmaps warm in MemoryCache and never fetches any URL twice.
const decodedImageCache = new Map<string, HTMLImageElement>();

// Tracks every URL whose decode was already initiated (covers both browser cache & test mocks).
const preloadedImageUrls = new Set<string>();

// Tracks every lazy chunk loader function already initiated across Waves 1-3 & Stage 3.
const preloadedChunkLoaders = new Set<() => Promise<unknown>>();

// Guards the single shared Milky background audio `preload="auto"` upgrade across all waves/stages.
let mainAudioPreloadTriggered = false;

// Guards the single shared Scene 5 kiss audio singleton preload across waves/stages.
let kissAudioPreloadTriggered = false;

// Guards lightweight silent UI SFX engine warmup.
let uiSfxWarmupTriggered = false;

export function getDecodedImageCacheSize(): number {
  return decodedImageCache.size;
}

export function hasPreloadedImageUrl(url: string): boolean {
  return decodedImageCache.has(url) || preloadedImageUrls.has(url);
}

export function hasPreloadedChunkLoader(loader: () => Promise<unknown>): boolean {
  return preloadedChunkLoaders.has(loader);
}

export function hasTriggeredMainAudioPreload(): boolean {
  return mainAudioPreloadTriggered;
}

export function clearDecodedImageCacheForTesting(): void {
  decodedImageCache.clear();
  preloadedImageUrls.clear();
}

export function resetAllPreloadDeduplicationForTesting(): void {
  decodedImageCache.clear();
  preloadedImageUrls.clear();
  preloadedChunkLoaders.clear();
  mainAudioPreloadTriggered = false;
  kissAudioPreloadTriggered = false;
  uiSfxWarmupTriggered = false;
}

function invokeChunkLoaderOnce(loader: () => Promise<unknown>): Promise<void> {
  if (preloadedChunkLoaders.has(loader)) {
    return Promise.resolve();
  }
  preloadedChunkLoaders.add(loader);
  try {
    return Promise.resolve(loader())
      .then(() => {})
      .catch(() => {
        // Allow React.lazy / a later stage to retry naturally if a transient network glitch happened
        preloadedChunkLoaders.delete(loader);
      });
  } catch {
    preloadedChunkLoaders.delete(loader);
    return Promise.resolve();
  }
}

function invokeMainAudioPreloadOnce(onUpgradeAudioPreload?: () => void): boolean {
  if (!onUpgradeAudioPreload || mainAudioPreloadTriggered) {
    return false;
  }
  mainAudioPreloadTriggered = true;
  try {
    onUpgradeAudioPreload();
  } catch {
    // Non-fatal
  }
  return true;
}

function invokeKissAudioPreloadOnce(
  kissAudioSrc: string,
  preloadAudioFn: (src: string) => void,
): boolean {
  if (kissAudioPreloadTriggered) {
    return false;
  }
  kissAudioPreloadTriggered = true;
  try {
    preloadAudioFn(kissAudioSrc);
  } catch {
    // Non-fatal
  }
  return true;
}

function invokeUiSfxWarmupOnce(warmUpFn: () => void): boolean {
  if (uiSfxWarmupTriggered) {
    return false;
  }
  uiSfxWarmupTriggered = true;
  try {
    warmUpFn();
  } catch {
    // Non-fatal silent warmup
  }
  return true;
}

function findExistingDomImage(url: string): HTMLImageElement | null {
  if (typeof document === 'undefined' || !document.images) return null;
  for (let i = 0; i < document.images.length; i += 1) {
    const existing = document.images[i];
    const attrSrc = existing.getAttribute('src');
    if (attrSrc === url || (existing.src && existing.src.endsWith(url))) {
      return existing;
    }
  }
  return null;
}

/**
 * Preloads and GPU-decodes an image cleanly via `img.decode()` wrapped in try/catch
 * so unsupported browsers or transient network glitches never reject the queue.
 * Retains a module-level cache reference so decoded bitmaps stay warm until rendered
 * and strictly deduplicates URLs across waves and stages.
 */
export async function preDecodeImageUrl(url: string): Promise<void> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return;
  if (decodedImageCache.has(url)) return;

  preloadedImageUrls.add(url);

  try {
    // If the DOM already mounted an <img> for this exact URL, reuse it without firing a second fetch
    const existingDomImg = findExistingDomImage(url);
    if (existingDomImg) {
      decodedImageCache.set(url, existingDomImg);
      if (typeof existingDomImg.decode === 'function') {
        await existingDomImg.decode().catch(() => {});
      }
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      // Silently swallow image preload errors so zero console noise occurs
    };
    decodedImageCache.set(url, img);
    img.src = url;

    if (typeof img.decode === 'function') {
      await img.decode().catch(() => {
        // Non-fatal: per-component onError fallback handles any broken image cleanly
      });
      return;
    }

    await new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
        return;
      }
      const done = () => {
        img.onload = null;
        img.onerror = () => {};
        resolve();
      };
      img.onload = done;
      img.onerror = done;
    });
  } catch {
    // Non-fatal: browser will still decode image naturally when rendered
  }
}

async function decodeImageUrlOnce(
  url: string,
  decodeFn: (u: string) => Promise<void>,
): Promise<boolean> {
  if (hasPreloadedImageUrl(url)) {
    return false;
  }
  preloadedImageUrls.add(url);
  try {
    await decodeFn(url);
  } catch {
    // Non-fatal: component fallback handles any broken image cleanly
  }
  return true;
}

export function createBrowserWarmupScheduler(): WarmupScheduler {
  const win =
    typeof window !== 'undefined'
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
 * Splits an array into fixed-size batches (e.g., pairs of 2 images for 60fps mobile decode).
 */
export function chunkIntoPairs<T>(items: readonly T[], pairSize = INTRO_IMAGE_PAIR_SIZE): T[][] {
  const size = Math.max(1, Math.floor(pairSize));
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Builds the exact ordered warmup queue:
 * Priority 1 (images) -> Priority 2 (lazy chunks) -> Priority 3 (audio preload upgrade).
 * When `deduplicate: true`, skips any image/chunk/audio already handled in Stage 2 or Stage 3.
 */
export function buildWarmupQueue(
  options: BackgroundWarmupOptions & { deduplicate?: boolean },
): PreloadTask[] {
  const decodeFn = options.decodeImage ?? preDecodeImageUrl;
  const deduplicate = Boolean(options.deduplicate);
  const tasks: PreloadTask[] = [];

  options.imageUrls.forEach((url, index) => {
    if (deduplicate && hasPreloadedImageUrl(url)) return;
    tasks.push({
      id: `image:${index}`,
      kind: 'image',
      run: async () => {
        if (deduplicate) {
          await decodeImageUrlOnce(url, decodeFn);
          return;
        }
        try {
          await decodeFn(url);
        } catch {
          // Always resilient
        }
      },
    });
  });

  options.chunkLoaders.forEach((loader, index) => {
    if (deduplicate && preloadedChunkLoaders.has(loader)) return;
    tasks.push({
      id: `chunk:${index}`,
      kind: 'chunk',
      run: async () => {
        if (deduplicate) {
          await invokeChunkLoaderOnce(loader);
          return;
        }
        try {
          await loader();
        } catch {
          // Retry naturally when React.lazy mounts
        }
      },
    });
  });

  if (options.onUpgradeAudioPreload && (!deduplicate || !mainAudioPreloadTriggered)) {
    const upgradeAudio = options.onUpgradeAudioPreload;
    tasks.push({
      id: 'audio:upgrade',
      kind: 'audio',
      run: async () => {
        if (deduplicate) {
          invokeMainAudioPreloadOnce(upgradeAudio);
          return;
        }
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
 * Starts the idempotent session-level background warmup queue once (used when intro is bypassed).
 */
export function startBackgroundWarmup(options: BackgroundWarmupOptions): () => void {
  if (sessionWarmupStarted) {
    return () => {};
  }
  sessionWarmupStarted = true;

  const tasks = buildWarmupQueue({ ...options, deduplicate: true });
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
  resetAllPreloadDeduplicationForTesting();
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

function preloadOriginKissSingleton(src: string): void {
  void preloadKissAudio(src);
}

/**
 * Legacy Stage 2 -> Stage 3 helper retained for compatibility; shares the exact same
 * singleton & chunk deduplication guards as `startIntroPlaybackPreload`.
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
  const preloadAudio = options.preloadAudio ?? preloadOriginKissSingleton;

  let cancelled = false;
  const cancelIdle = scheduler.scheduleIdle(() => {
    activeCancelOriginPreload = null;
    if (cancelled) return;

    void invokeChunkLoaderOnce(options.loadOriginStoryChunk);
    invokeKissAudioPreloadOnce(kissAudioSrc, preloadAudio);
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
  kissAudioPreloadTriggered = false;
  preloadedChunkLoaders.clear();
}

// ============================================================================
// Stage 2 Intro Video 3-Wave Full-Pipeline Preloader
// ============================================================================

export interface IntroPlaybackPreloadOptions {
  /** Wave 1 (+0ms): OriginStoryPlay bundle (brings in OriginCharacters, OriginStageBackdrop, originScript) */
  loadOriginStoryChunk: () => Promise<unknown>;
  /** Wave 1 (+0ms): Optional kiss track URL override (defaults to ORIGIN_AUDIO_CONFIG.kissTrackSrc) */
  kissAudioSrc?: string;
  /** Wave 1 (+0ms): Optional kiss audio preload override (defaults to kissAudioSingleton.preloadKissAudio) */
  preloadKissAudioFn?: (src: string) => void;
  /** Wave 1 (+0ms): Optional silent UI SFX warmup override (defaults to scheduleGithubSfxPreload) */
  warmUpUiSfx?: () => void;
  /** Wave 2 (+750ms): Single shared Milky background audio element preload="auto" upgrade */
  onUpgradeAudioPreload?: () => void;
  /** Wave 2 (+750ms): All critical images (Hero, Case File, Baad Me, 5 Friend PFPs) decoded in pairs of 2 every 180ms */
  imageUrls?: readonly string[];
  /** Wave 3 (+1600ms): Priority-ordered Main Page lazy chunks in 160ms idle slices */
  wave3ChunkLoaders?: ReadonlyArray<() => Promise<unknown>>;
  /** Optional overrides for deterministic unit testing */
  wave2DelayMs?: number;
  wave3DelayMs?: number;
  imagePairSize?: number;
  imagePairGapMs?: number;
  wave3ChunkGapMs?: number;
  idleTimeoutMs?: number;
  decodeImage?: (url: string) => Promise<void>;
  scheduler?: WarmupScheduler;
  onWaveStart?: (wave: 1 | 2 | 3) => void;
  onTaskComplete?: (taskId: string, kind: PreloadTaskKind) => void;
  onWaveComplete?: (wave: 1 | 2 | 3) => void;
  onAllComplete?: () => void;
}

let introPreloadStarted = false;
let activeCancelIntroPreload: (() => void) | null = null;

export function hasIntroPlaybackPreloadStarted(): boolean {
  return introPreloadStarted;
}

/**
 * Full-pipeline 3-wave staggered preloader triggered strictly AFTER the Stage 2 Intro Video
 * confirms smooth playback (`playing` + 350ms grace breather, or 1200ms safety fallback).
 *
 * Strictly guarded by `introPreloadStarted` so it runs at most ONCE per session and shares
 * deduplication state with Stage 3 (`preloadMainPageDuringStory`) so zero files download twice.
 */
export function startIntroPlaybackPreload(
  options: IntroPlaybackPreloadOptions,
): () => void {
  if (introPreloadStarted) {
    return () => {};
  }
  introPreloadStarted = true;
  originStoryPreloadStarted = true;

  const scheduler = options.scheduler ?? createBrowserWarmupScheduler();
  const idleTimeoutMs = options.idleTimeoutMs ?? PRELOAD_IDLE_TIMEOUT_MS;
  const wave2DelayMs = options.wave2DelayMs ?? INTRO_WAVE2_DELAY_MS;
  const wave3DelayMs = options.wave3DelayMs ?? INTRO_WAVE3_DELAY_MS;
  const imagePairSize = options.imagePairSize ?? INTRO_IMAGE_PAIR_SIZE;
  const imagePairGapMs = options.imagePairGapMs ?? INTRO_IMAGE_PAIR_GAP_MS;
  const wave3ChunkGapMs = options.wave3ChunkGapMs ?? INTRO_WAVE3_CHUNK_GAP_MS;
  const kissAudioSrc = options.kissAudioSrc ?? ORIGIN_AUDIO_CONFIG.kissTrackSrc;
  const preloadKissFn = options.preloadKissAudioFn ?? preloadOriginKissSingleton;
  const warmUpSfxFn = options.warmUpUiSfx ?? scheduleGithubSfxPreload;
  const decodeFn = options.decodeImage ?? preDecodeImageUrl;
  const imageUrls = options.imageUrls ?? getDefaultPreloadImageUrls('/');
  const wave3ChunkLoaders = options.wave3ChunkLoaders ?? [];

  let cancelled = false;
  const pendingCancels = new Set<() => void>();
  let wave1Done = false;
  let wave2Done = false;
  let wave3Done = false;

  const trackCancel = (cancelFn: () => void): (() => void) => {
    const wrapped = () => {
      pendingCancels.delete(wrapped);
      cancelFn();
    };
    pendingCancels.add(wrapped);
    return wrapped;
  };

  const checkAllComplete = () => {
    if (!cancelled && wave1Done && wave2Done && wave3Done) {
      activeCancelIntroPreload = null;
      options.onAllComplete?.();
    }
  };

  // ---- WAVE 1 (+0ms after trigger): Origin Story bundle + Kiss singleton + Silent UI SFX warmup ----
  const runWave1 = () => {
    if (cancelled) return;
    options.onWaveStart?.(1);

    const originChunkPromise = invokeChunkLoaderOnce(options.loadOriginStoryChunk).finally(() => {
      if (!cancelled) options.onTaskComplete?.('wave1:chunk:originStory', 'chunk');
    });

    if (invokeKissAudioPreloadOnce(kissAudioSrc, preloadKissFn)) {
      options.onTaskComplete?.('wave1:audio:kissSingleton', 'audio');
    }

    if (invokeUiSfxWarmupOnce(warmUpSfxFn)) {
      options.onTaskComplete?.('wave1:sfx:uiWarmup', 'sfx');
    }

    void originChunkPromise.finally(() => {
      if (cancelled) return;
      wave1Done = true;
      options.onWaveComplete?.(1);
      checkAllComplete();
    });
  };

  const cancelWave1Idle = trackCancel(
    scheduler.scheduleIdle(() => {
      pendingCancels.delete(cancelWave1Idle);
      runWave1();
    }, idleTimeoutMs),
  );

  // ---- WAVE 2 (+750ms after trigger): Milky preload="auto" + Critical Images in pairs of 2 every 180ms ----
  const cancelWave2Delay = trackCancel(
    scheduler.delay(wave2DelayMs, () => {
      pendingCancels.delete(cancelWave2Delay);
      if (cancelled) return;
      options.onWaveStart?.(2);

      // 2A: Upgrade single shared Milky <audio> element to preload="auto" (paused, volume = 0)
      if (invokeMainAudioPreloadOnce(options.onUpgradeAudioPreload)) {
        options.onTaskComplete?.('wave2:audio:milkyAuto', 'audio');
      }

      // 2B: Preload & async GPU-decode all critical images in staggered pairs of 2 every 180ms
      const remainingImages = imageUrls.filter((url) => !hasPreloadedImageUrl(url));
      const imagePairs = chunkIntoPairs(remainingImages, imagePairSize);

      if (imagePairs.length === 0) {
        wave2Done = true;
        options.onWaveComplete?.(2);
        checkAllComplete();
        return;
      }

      const pairTasks: PreloadTask[] = imagePairs.map((pair, pairIdx) => ({
        id: `wave2:imagePair:${pairIdx}`,
        kind: 'image',
        run: async () => {
          await Promise.allSettled(pair.map((url) => decodeImageUrlOnce(url, decodeFn)));
        },
      }));

      const cancelPairsQueue = trackCancel(
        runWarmupQueue(pairTasks, {
          gapMs: imagePairGapMs,
          idleTimeoutMs,
          scheduler,
          onTaskComplete: options.onTaskComplete,
          onAllComplete: () => {
            pendingCancels.delete(cancelPairsQueue);
            if (cancelled) return;
            wave2Done = true;
            options.onWaveComplete?.(2);
            checkAllComplete();
          },
        }),
      );
    }),
  );

  // ---- WAVE 3 (+1600ms after trigger): All Main Birthday Page lazy chunks in 160ms idle slices ----
  const cancelWave3Delay = trackCancel(
    scheduler.delay(wave3DelayMs, () => {
      pendingCancels.delete(cancelWave3Delay);
      if (cancelled) return;
      options.onWaveStart?.(3);

      const wave3Tasks: PreloadTask[] = wave3ChunkLoaders
        .filter((loader) => !preloadedChunkLoaders.has(loader))
        .map((loader, idx) => ({
          id: `wave3:chunk:${idx}`,
          kind: 'chunk',
          run: async () => {
            await invokeChunkLoaderOnce(loader);
          },
        }));

      if (wave3Tasks.length === 0) {
        wave3Done = true;
        options.onWaveComplete?.(3);
        checkAllComplete();
        return;
      }

      const cancelWave3Queue = trackCancel(
        runWarmupQueue(wave3Tasks, {
          gapMs: wave3ChunkGapMs,
          idleTimeoutMs,
          scheduler,
          onTaskComplete: options.onTaskComplete,
          onAllComplete: () => {
            pendingCancels.delete(cancelWave3Queue);
            if (cancelled) return;
            wave3Done = true;
            options.onWaveComplete?.(3);
            checkAllComplete();
          },
        }),
      );
    }),
  );

  const cancel = () => {
    cancelled = true;
    Array.from(pendingCancels).forEach((fn) => fn());
    pendingCancels.clear();
    if (activeCancelIntroPreload === cancel) {
      activeCancelIntroPreload = null;
    }
  };
  activeCancelIntroPreload = cancel;

  return cancel;
}

export function resetIntroPlaybackPreloadForTesting(): void {
  if (activeCancelIntroPreload) {
    activeCancelIntroPreload();
    activeCancelIntroPreload = null;
  }
  introPreloadStarted = false;
  originStoryPreloadStarted = false;
  resetAllPreloadDeduplicationForTesting();
}

export const STORY_PRELOAD_TIER1_DELAY_MS = 350;
export const STORY_PRELOAD_TIER2_GAP_MS = 180;
export const MAIN_PREMOUNT_BREATHER_MS = 450;

/**
 * Exact 3-Beat Stage 3 -> Stage 4 Rose-Cream & Champagne-Gold Silk Curtain Reveal
 * and Staggered Main Page Arrival Timings (anchored to transition start t = 0ms).
 *
 * Silk curtain transition duration is 1850ms (+700ms lush parting glide), and Modino
 * arrives reliably 2000ms (2.0s) strictly AFTER the silk curtain transition completes
 * (1850ms + 2000ms = 3850ms from transition start).
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
  /** Beat 2 parting animation duration (700ms + 700ms = 1400ms lush glide) */
  curtainPartDurationMs: 1400,
  /** Beat 2 complete: Silk curtains finish parting (380 + 1400 = 1780ms) */
  curtainPartEndMs: 1780,
  /** Veil parting fade duration (740ms + 700ms = 1440ms) */
  veilPartingDurationMs: 1440,
  /** Main Page Welcome Confetti cannons fire cleanly as curtains clear center Hero */
  confettiBurstMs: 950,
  /** Beat 3: Curtain overlay fades to 0 and unmounts cleanly from DOM (1150ms + 700ms = 1850ms) */
  totalDurationMs: 1850,
  /** Delay strictly AFTER silk curtain transition completes before Modino glides in (2.0s) */
  modinoDelayAfterCurtainMs: 2000,
  /** Total arrival timestamp for Modino from transition start (1850 + 2000 = 3850ms) */
  modinoArrivalFromTransitionMs: 3850,
  /** Equivalent offset from stageSwapMs for reference (360 + 3490 = 3850ms) */
  modinoDelayAfterMainMountMs: 3490,
  /** Reduced-motion warm ivory crossfade timings */
  reducedMotionSwapMs: 180,
  reducedMotionTotalMs: 350,
  /** Snappy Replay Origin Story return crossfade timings */
  replayCrossfadeSwapMs: 175,
  replayCrossfadeTotalMs: 350,
} as const;

/**
 * Pure helper calculating how many milliseconds remain before Modino should enter,
 * strictly anchored to the timestamp when the silk curtain transition completed.
 *
 * Returns `null` while the silk curtain transition is still running (`curtainCompletedAtMs === null`),
 * preventing Modino from ever starting its entrance countdown prematurely.
 * Clamps to `>= 0` so lazy chunk latency, tab switches, or temporary overlays never cause drift
 * or leave Modino stuck unentered.
 */
export function computeModinoEntranceDelayMs(params: {
  curtainCompletedAtMs: number | null;
  nowMs: number;
  delayAfterCurtainMs?: number;
}): number | null {
  if (params.curtainCompletedAtMs === null) {
    return null;
  }
  const targetDelay = Math.max(
    0,
    params.delayAfterCurtainMs ?? STAGE3_TO_MAIN_TIMING.modinoDelayAfterCurtainMs,
  );
  const elapsedSinceCurtainMs = Math.max(0, params.nowMs - params.curtainCompletedAtMs);
  return Math.max(0, targetDelay - elapsedSinceCurtainMs);
}

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
 * Stage 3 -> Stage 4 seamless idempotent continuation triggered the moment OriginStoryPlay mounts.
 *
 * Shares deduplication Sets/Map/flags with `startIntroPlaybackPreload`:
 * - Anything already loaded during the Stage 2 Intro Video is skipped in 0ms.
 * - Anything still remaining on slower mobile networks finishes smoothly in Tier 1 (350ms)
 *   and Tier 2 (180ms idle slices) while she reads Scenes 1-11.
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

    // Tier 1A: Above-the-fold & companion lazy chunks (skips any already loaded in Stage 2 Wave 3)
    tier1ChunkLoaders.forEach((loader, idx) => {
      if (preloadedChunkLoaders.has(loader)) return;
      tier1Promises.push(
        invokeChunkLoaderOnce(loader).finally(() => {
          if (!cancelled) options.onTaskComplete?.(`tier1:chunk:${idx}`, 'chunk');
        }),
      );
    });

    // Tier 1B: Preload & GPU-decode core above-the-fold & receipt images (skips any already decoded in Wave 2)
    const tier1Images = imageUrls.slice(0, CORE_PRELOAD_IMAGE_COUNT);
    const tier2StaggeredImages = imageUrls.slice(CORE_PRELOAD_IMAGE_COUNT);

    tier1Images.forEach((url, idx) => {
      if (hasPreloadedImageUrl(url)) return;
      tier1Promises.push(
        decodeImageUrlOnce(url, decodeFn).finally(() => {
          if (!cancelled) options.onTaskComplete?.(`tier1:image:${idx}`, 'image');
        }),
      );
    });

    // Tier 1C: Warm up Milky audio strictly paused at volume 0 (skipped in 0ms if Wave 2 already did it)
    if (invokeMainAudioPreloadOnce(options.onUpgradeAudioPreload)) {
      options.onTaskComplete?.('tier1:audio:upgrade', 'audio');
    }

    void Promise.allSettled(tier1Promises).finally(() => {
      if (cancelled) return;
      options.onTier1Complete?.();

      // Priority Tier 2: Staggered 180ms requestIdleCallback slices for any remaining friend PFPs + below-the-fold chunks
      const tier2ImageTasks: PreloadTask[] = tier2StaggeredImages
        .filter((url) => !hasPreloadedImageUrl(url))
        .map((url, idx) => ({
          id: `tier2:image:${idx}`,
          kind: 'image',
          run: async () => {
            await decodeImageUrlOnce(url, decodeFn);
          },
        }));

      const tier2ChunkTasks: PreloadTask[] = tier2ChunkLoaders
        .filter((loader) => !preloadedChunkLoaders.has(loader))
        .map((loader, idx) => ({
          id: `tier2:chunk:${idx}`,
          kind: 'chunk',
          run: async () => {
            await invokeChunkLoaderOnce(loader);
          },
        }));

      const tier2Tasks: PreloadTask[] = [...tier2ImageTasks, ...tier2ChunkTasks];

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
  resetIntroPlaybackPreloadForTesting();
  resetBackgroundWarmupForTesting();
}
