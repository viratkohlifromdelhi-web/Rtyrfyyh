import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRELOAD_GAP_MS,
  buildWarmupQueue,
  getDefaultPreloadImageUrls,
  resetBackgroundWarmupForTesting,
  runWarmupQueue,
  startBackgroundWarmup,
  type WarmupScheduler,
} from './preloader';

function createImmediateTestScheduler(recordedGaps: number[]): WarmupScheduler {
  return {
    scheduleIdle(fn: () => void) {
      let active = true;
      queueMicrotask(() => {
        if (active) fn();
      });
      return () => {
        active = false;
      };
    },
    delay(ms: number, fn: () => void) {
      recordedGaps.push(ms);
      let active = true;
      queueMicrotask(() => {
        if (active) fn();
      });
      return () => {
        active = false;
      };
    },
  };
}

test('getDefaultPreloadImageUrls lists core images plus all 5 exact case-sensitive friend PFPs', () => {
  const urls = getDefaultPreloadImageUrls('/');
  assert.equal(urls.length, 8);
  assert.equal(urls[0], '/IMG_20261126_131911_725.jpg');
  assert.equal(urls[1], '/Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png');
  assert.equal(urls[2], '/Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png');
  assert.deepEqual(urls.slice(3), [
    '/abhay.png',
    '/Anamika.png',
    '/ankit.png',
    '/ayush.png',
    '/harsh.png',
  ]);
});

test('runWarmupQueue executes images -> lazy chunks -> audio in strict priority order with 120ms gaps', async () => {
  const executed: string[] = [];
  const gaps: number[] = [];
  const scheduler = createImmediateTestScheduler(gaps);

  const tasks = buildWarmupQueue({
    imageUrls: ['/hero.jpg', '/receipt.png'],
    chunkLoaders: [
      async () => {
        executed.push('loader:toggles');
      },
      async () => {
        executed.push('loader:calendar');
      },
    ],
    decodeImage: async (url) => {
      executed.push(`decode:${url}`);
    },
    onUpgradeAudioPreload: () => {
      executed.push('audio:auto');
    },
  });

  await new Promise<void>((resolve) => {
    runWarmupQueue(tasks, {
      scheduler,
      onAllComplete: resolve,
    });
  });

  assert.deepEqual(executed, [
    'decode:/hero.jpg',
    'decode:/receipt.png',
    'loader:toggles',
    'loader:calendar',
    'audio:auto',
  ]);
  assert.deepEqual(gaps, [PRELOAD_GAP_MS, PRELOAD_GAP_MS, PRELOAD_GAP_MS, PRELOAD_GAP_MS]);
});

test('runWarmupQueue stays resilient if an image decode or chunk loader throws', async () => {
  const completed: string[] = [];
  const scheduler = createImmediateTestScheduler([]);

  const tasks = buildWarmupQueue({
    imageUrls: ['/broken.jpg'],
    chunkLoaders: [
      async () => {
        throw new Error('transient network error');
      },
      async () => {},
    ],
    decodeImage: async () => {
      throw new Error('decode unsupported');
    },
    onUpgradeAudioPreload: () => {},
  });

  await new Promise<void>((resolve) => {
    runWarmupQueue(tasks, {
      scheduler,
      onTaskComplete: (id) => completed.push(id),
      onAllComplete: resolve,
    });
  });

  assert.deepEqual(completed, ['image:0', 'chunk:0', 'chunk:1', 'audio:upgrade']);
});

test('startBackgroundWarmup is idempotent within a session and cancellation halts pending work', async () => {
  resetBackgroundWarmupForTesting();
  let runs = 0;
  let pendingTrigger: (() => void) | null = null;

  const manualScheduler: WarmupScheduler = {
    scheduleIdle(fn: () => void) {
      pendingTrigger = fn;
      return () => {
        pendingTrigger = null;
      };
    },
    delay(_ms: number, fn: () => void) {
      pendingTrigger = fn;
      return () => {
        pendingTrigger = null;
      };
    },
  };

  const cancel = startBackgroundWarmup({
    imageUrls: ['/hero.jpg'],
    chunkLoaders: [
      async () => {
        runs += 1;
      },
    ],
    decodeImage: async () => {
      runs += 1;
    },
    scheduler: manualScheduler,
  });

  // Second invocation in same session should be ignored
  startBackgroundWarmup({
    imageUrls: ['/duplicate.jpg'],
    chunkLoaders: [],
    decodeImage: async () => {
      runs += 99;
    },
    scheduler: manualScheduler,
  });

  // Cancel before first idle callback fires
  cancel();
  assert.equal(pendingTrigger, null);
  assert.equal(runs, 0);

  resetBackgroundWarmupForTesting();
});

test('preloadOriginStoryStageAssets warms chunk and kiss audio once on idle and stays resilient to errors', async () => {
  const { preloadOriginStoryStageAssets, resetOriginStoryPreloadForTesting } = await import(
    './preloader'
  );
  resetOriginStoryPreloadForTesting();

  const events: string[] = [];
  const scheduler = createImmediateTestScheduler([]);

  preloadOriginStoryStageAssets({
    loadOriginStoryChunk: async () => {
      events.push('chunk:originStory');
      throw new Error('transient fetch error');
    },
    preloadAudio: (src) => {
      events.push(`audio:${src}`);
    },
    scheduler,
  });

  // Second call in same session should be idempotent no-op
  preloadOriginStoryStageAssets({
    loadOriginStoryChunk: async () => {
      events.push('chunk:duplicate');
    },
    preloadAudio: () => {
      events.push('audio:duplicate');
    },
    scheduler,
  });

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.deepEqual(events, [
    'chunk:originStory',
    'audio:/origin-kiss-track.mp3',
  ]);

  resetOriginStoryPreloadForTesting();
});

test('preloadMainPageDuringStory runs Tier 1 after 350ms, then Tier 2 in 180ms idle slices, and is idempotent', async () => {
  const {
    STORY_PRELOAD_TIER1_DELAY_MS,
    STORY_PRELOAD_TIER2_GAP_MS,
    STAGE3_TO_MAIN_TIMING,
    preloadMainPageDuringStory,
    resetStoryMainPreloadForTesting,
  } = await import('./preloader');
  resetStoryMainPreloadForTesting();

  const recordedDelays: number[] = [];
  const executed: string[] = [];
  const scheduler = createImmediateTestScheduler(recordedDelays);

  await new Promise<void>((resolve) => {
    preloadMainPageDuringStory({
      imageUrls: ['/hero.jpg'],
      tier1ChunkLoaders: [
        async () => {
          executed.push('tier1:toggles');
        },
        async () => {
          executed.push('tier1:modino');
        },
      ],
      tier2ChunkLoaders: [
        async () => {
          executed.push('tier2:calendar');
        },
        async () => {
          executed.push('tier2:backstory');
        },
        async () => {
          executed.push('tier2:footer');
        },
      ],
      decodeImage: async (url) => {
        executed.push(`decode:${url}`);
      },
      onUpgradeAudioPreload: () => {
        executed.push('audio:milky_auto');
      },
      scheduler,
      onTier1Complete: () => {
        executed.push('tier1:done');
      },
      onAllComplete: resolve,
    });

    // Second call must be ignored (idempotent)
    preloadMainPageDuringStory({
      imageUrls: ['/duplicate.jpg'],
      tier1ChunkLoaders: [
        async () => {
          executed.push('duplicate');
        },
      ],
      scheduler,
    });
  });

  // First delay must be Tier 1's 350ms breather; subsequent delays must be Tier 2's 180ms slices
  assert.equal(recordedDelays[0], STORY_PRELOAD_TIER1_DELAY_MS);
  assert.equal(STORY_PRELOAD_TIER1_DELAY_MS, 350);
  assert.deepEqual(recordedDelays.slice(1), [STORY_PRELOAD_TIER2_GAP_MS, STORY_PRELOAD_TIER2_GAP_MS]);
  assert.equal(STORY_PRELOAD_TIER2_GAP_MS, 180);

  // All Tier 1 work completes strictly before Tier 2 begins
  const tier1DoneIdx = executed.indexOf('tier1:done');
  assert.ok(tier1DoneIdx > 0);
  assert.ok(executed.indexOf('tier1:toggles') < tier1DoneIdx);
  assert.ok(executed.indexOf('tier1:modino') < tier1DoneIdx);
  assert.ok(executed.indexOf('decode:/hero.jpg') < tier1DoneIdx);
  assert.ok(executed.indexOf('audio:milky_auto') < tier1DoneIdx);
  assert.deepEqual(executed.slice(tier1DoneIdx + 1), [
    'tier2:calendar',
    'tier2:backstory',
    'tier2:footer',
  ]);
  assert.equal(executed.includes('duplicate'), false);

  // Verify exact Stage 3 -> Stage 4 staggered arrival timing contract
  assert.equal(STAGE3_TO_MAIN_TIMING.musicStartMs, 280);
  assert.equal(STAGE3_TO_MAIN_TIMING.musicFadeInMs, 750);
  assert.equal(STAGE3_TO_MAIN_TIMING.stageSwapMs, 360);
  assert.equal(STAGE3_TO_MAIN_TIMING.curtainPartStartMs, 380);
  assert.equal(STAGE3_TO_MAIN_TIMING.confettiBurstMs, 650);
  assert.equal(STAGE3_TO_MAIN_TIMING.totalDurationMs, 1150);
  assert.equal(
    STAGE3_TO_MAIN_TIMING.stageSwapMs + STAGE3_TO_MAIN_TIMING.modinoDelayAfterMainMountMs,
    STAGE3_TO_MAIN_TIMING.modinoArrivalFromTransitionMs,
  );
  assert.ok(
    STAGE3_TO_MAIN_TIMING.modinoArrivalFromTransitionMs >= 1950 &&
      STAGE3_TO_MAIN_TIMING.modinoArrivalFromTransitionMs <= 2100,
  );

  resetStoryMainPreloadForTesting();
});

test('Stage 3 preload decodes all 5 friend PFPs in staggered idle slices and retains bitmaps in module cache', async () => {
  const {
    clearDecodedImageCacheForTesting,
    getDecodedImageCacheSize,
    getDefaultPreloadImageUrls: getUrls,
    preDecodeImageUrl,
    preloadMainPageDuringStory,
    resetStoryMainPreloadForTesting,
  } = await import('./preloader');
  resetStoryMainPreloadForTesting();
  clearDecodedImageCacheForTesting();

  const decodedOrder: string[] = [];
  const gaps: number[] = [];
  const scheduler = createImmediateTestScheduler(gaps);

  await new Promise<void>((resolve) => {
    preloadMainPageDuringStory({
      imageUrls: getUrls('/'),
      tier1ChunkLoaders: [],
      tier2ChunkLoaders: [
        async () => {
          decodedOrder.push('chunk:after-pfps');
        },
      ],
      decodeImage: async (url) => {
        decodedOrder.push(url);
      },
      scheduler,
      onTier1Complete: () => {
        decodedOrder.push('tier1:done');
      },
      onAllComplete: resolve,
    });
  });

  const tier1DoneIdx = decodedOrder.indexOf('tier1:done');
  assert.equal(tier1DoneIdx, 3);
  assert.deepEqual(decodedOrder.slice(tier1DoneIdx + 1), [
    '/abhay.png',
    '/Anamika.png',
    '/ankit.png',
    '/ayush.png',
    '/harsh.png',
    'chunk:after-pfps',
  ]);

  // Verify preDecodeImageUrl retains strong references in decodedImageCache and deduplicates URLs
  const originalWindow = globalThis.window;
  const originalImage = globalThis.Image;
  const createdSrcs: string[] = [];

  class MockImage {
    decoding = '';
    referrerPolicy = '';
    complete = true;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    set src(val: string) {
      this._src = val;
      createdSrcs.push(val);
    }
    get src() {
      return this._src;
    }
    async decode() {
      if (this._src === '/broken-pfp.png') {
        throw new Error('decode failed');
      }
    }
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {},
  });
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    writable: true,
    value: MockImage,
  });

  try {
    await preDecodeImageUrl('/abhay.png');
    await preDecodeImageUrl('/Anamika.png');
    await preDecodeImageUrl('/abhay.png'); // duplicate should be skipped cleanly
    await preDecodeImageUrl('/broken-pfp.png'); // failed decode should never throw
    assert.equal(getDecodedImageCacheSize(), 3);
    assert.deepEqual(createdSrcs, ['/abhay.png', '/Anamika.png', '/broken-pfp.png']);
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      writable: true,
      value: originalImage,
    });
    clearDecodedImageCacheForTesting();
    resetStoryMainPreloadForTesting();
  }
});

test('startIntroPlaybackPreload executes Waves 1, 2, 3 with exact stagger timings and is strictly idempotent', async () => {
  const {
    INTRO_IMAGE_PAIR_GAP_MS,
    INTRO_IMAGE_PAIR_SIZE,
    INTRO_PRELOAD_GRACE_BREATHER_MS,
    INTRO_PRELOAD_SAFETY_FALLBACK_MS,
    INTRO_WAVE1_DELAY_MS,
    INTRO_WAVE2_DELAY_MS,
    INTRO_WAVE3_CHUNK_GAP_MS,
    INTRO_WAVE3_DELAY_MS,
    chunkIntoPairs,
    getDefaultPreloadImageUrls: getUrls,
    hasIntroPlaybackPreloadStarted,
    resetIntroPlaybackPreloadForTesting,
    startIntroPlaybackPreload,
  } = await import('./preloader');
  resetIntroPlaybackPreloadForTesting();

  assert.equal(INTRO_PRELOAD_GRACE_BREATHER_MS, 350);
  assert.equal(INTRO_PRELOAD_SAFETY_FALLBACK_MS, 1200);
  assert.equal(INTRO_WAVE1_DELAY_MS, 0);
  assert.equal(INTRO_WAVE2_DELAY_MS, 750);
  assert.equal(INTRO_WAVE3_DELAY_MS, 1600);
  assert.equal(INTRO_IMAGE_PAIR_SIZE, 2);
  assert.equal(INTRO_IMAGE_PAIR_GAP_MS, 180);
  assert.equal(INTRO_WAVE3_CHUNK_GAP_MS, 160);
  assert.equal(hasIntroPlaybackPreloadStarted(), false);

  const defaultImages = getUrls('/');
  const pairs = chunkIntoPairs(defaultImages, INTRO_IMAGE_PAIR_SIZE);
  assert.equal(pairs.length, 4);
  assert.deepEqual(
    pairs.map((p) => p.length),
    [2, 2, 2, 2],
  );

  const recordedDelays: number[] = [];
  const events: string[] = [];
  const scheduler = createImmediateTestScheduler(recordedDelays);

  const loadOrigin = async () => {
    events.push('wave1:originStory');
  };
  const loadToggles = async () => {
    events.push('wave3:toggles');
  };
  const loadModino = async () => {
    events.push('wave3:modino');
  };
  const loadFooter = async () => {
    events.push('wave3:footer');
  };

  await new Promise<void>((resolve) => {
    startIntroPlaybackPreload({
      loadOriginStoryChunk: loadOrigin,
      preloadKissAudioFn: (src) => {
        events.push(`wave1:kiss:${src}`);
      },
      warmUpUiSfx: () => {
        events.push('wave1:sfx');
      },
      onUpgradeAudioPreload: () => {
        events.push('wave2:milky');
      },
      imageUrls: defaultImages,
      decodeImage: async (url) => {
        events.push(`wave2:img:${url}`);
      },
      wave3ChunkLoaders: [loadToggles, loadModino, loadFooter],
      scheduler,
      onAllComplete: resolve,
    });

    assert.equal(hasIntroPlaybackPreloadStarted(), true);

    // Second invocation in same session must be an idempotent no-op
    startIntroPlaybackPreload({
      loadOriginStoryChunk: async () => {
        events.push('duplicate:origin');
      },
      preloadKissAudioFn: () => {
        events.push('duplicate:kiss');
      },
      onUpgradeAudioPreload: () => {
        events.push('duplicate:milky');
      },
      imageUrls: ['/duplicate.png'],
      decodeImage: async () => {
        events.push('duplicate:img');
      },
      wave3ChunkLoaders: [
        async () => {
          events.push('duplicate:chunk');
        },
      ],
      scheduler,
    });
  });

  // Verify Wave 1, Wave 2, Wave 3 tasks all executed strictly once
  assert.equal(events.filter((e) => e === 'wave1:originStory').length, 1);
  assert.equal(events.filter((e) => e === 'wave1:kiss:/origin-kiss-track.mp3').length, 1);
  assert.equal(events.filter((e) => e === 'wave1:sfx').length, 1);
  assert.equal(events.filter((e) => e === 'wave2:milky').length, 1);
  for (const url of defaultImages) {
    assert.equal(events.filter((e) => e === `wave2:img:${url}`).length, 1);
  }
  assert.equal(events.filter((e) => e === 'wave3:toggles').length, 1);
  assert.equal(events.filter((e) => e === 'wave3:modino').length, 1);
  assert.equal(events.filter((e) => e === 'wave3:footer').length, 1);
  assert.equal(
    events.some((e) => e.startsWith('duplicate:')),
    false,
  );

  // Verify wave delays (750ms Wave 2, 1600ms Wave 3), 180ms image-pair gaps (3 gaps for 4 pairs), and 160ms chunk gaps (2 gaps for 3 chunks)
  assert.ok(recordedDelays.includes(750));
  assert.ok(recordedDelays.includes(1600));
  assert.equal(recordedDelays.filter((d) => d === 180).length, 3);
  assert.equal(recordedDelays.filter((d) => d === 160).length, 2);

  resetIntroPlaybackPreloadForTesting();
});

test('Stage 3 preloadMainPageDuringStory skips already-loaded Stage 2 assets in 0ms and only finishes remaining items', async () => {
  const {
    preloadMainPageDuringStory,
    resetStoryMainPreloadForTesting,
    startIntroPlaybackPreload,
  } = await import('./preloader');
  resetStoryMainPreloadForTesting();

  const counts = new Map<string, number>();
  const bump = (key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  const loadOrigin = async () => bump('origin');
  const loadToggles = async () => bump('toggles');
  const loadModino = async () => bump('modino');
  const loadRemaining = async () => bump('remaining_slow_4g_chunk');

  const scheduler = createImmediateTestScheduler([]);

  // Stage 2 completes Wave 1, Wave 2 (2 images + Milky), and 2 of 3 Wave 3 chunks
  await new Promise<void>((resolve) => {
    startIntroPlaybackPreload({
      loadOriginStoryChunk: loadOrigin,
      preloadKissAudioFn: () => bump('kiss'),
      warmUpUiSfx: () => bump('sfx'),
      onUpgradeAudioPreload: () => bump('milky'),
      imageUrls: ['/IMG_20261126_131911_725.jpg', '/abhay.png'],
      decodeImage: async (url) => bump(`img:${url}`),
      wave3ChunkLoaders: [loadToggles, loadModino],
      scheduler,
      onAllComplete: resolve,
    });
  });

  // Now Stage 3 mounts and calls preloadMainPageDuringStory with overlapping + 1 new chunk & 1 new image
  await new Promise<void>((resolve) => {
    preloadMainPageDuringStory({
      imageUrls: [
        '/IMG_20261126_131911_725.jpg',
        '/abhay.png',
        '/Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png',
        '/ayush.png',
      ],
      tier1ChunkLoaders: [loadToggles, loadModino],
      tier2ChunkLoaders: [loadRemaining],
      onUpgradeAudioPreload: () => bump('milky'),
      decodeImage: async (url) => bump(`img:${url}`),
      scheduler,
      onAllComplete: resolve,
    });
  });

  // Zero duplicate downloads for anything already handled in Stage 2!
  assert.equal(counts.get('origin'), 1);
  assert.equal(counts.get('kiss'), 1);
  assert.equal(counts.get('milky'), 1);
  assert.equal(counts.get('toggles'), 1);
  assert.equal(counts.get('modino'), 1);
  assert.equal(counts.get('img:/IMG_20261126_131911_725.jpg'), 1);
  assert.equal(counts.get('img:/abhay.png'), 1);

  // Remaining items not yet loaded during Stage 2 finish seamlessly in Stage 3!
  assert.equal(counts.get('remaining_slow_4g_chunk'), 1);
  assert.equal(counts.get('img:/Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png'), 1);
  assert.equal(counts.get('img:/ayush.png'), 1);

  resetStoryMainPreloadForTesting();
});

test('WAVE3_MAIN_PAGE_LOADERS covers all Main Birthday Page sections in priority order and strictly excludes OwnerAnalyticsDashboard', async () => {
  const {
    BACKGROUND_SECTION_LOADERS,
    WAVE3_MAIN_PAGE_LOADERS,
    loadInteractiveTogglesSection,
    loadModinoPet,
    loadClosingSignOffFooter,
    loadOwnerAnalyticsDashboard,
  } = await import('./sectionLoaders');

  // Above-the-fold first
  assert.equal(WAVE3_MAIN_PAGE_LOADERS[0], loadInteractiveTogglesSection);
  assert.equal(WAVE3_MAIN_PAGE_LOADERS[1], loadModinoPet);
  // Closing Footer last
  assert.equal(WAVE3_MAIN_PAGE_LOADERS[WAVE3_MAIN_PAGE_LOADERS.length - 1], loadClosingSignOffFooter);
  // Owner dashboard strictly excluded
  assert.equal(WAVE3_MAIN_PAGE_LOADERS.includes(loadOwnerAnalyticsDashboard), false);
  // Covers every section in BACKGROUND_SECTION_LOADERS with zero duplicates
  assert.equal(new Set(WAVE3_MAIN_PAGE_LOADERS).size, WAVE3_MAIN_PAGE_LOADERS.length);
  for (const loader of BACKGROUND_SECTION_LOADERS) {
    assert.equal(WAVE3_MAIN_PAGE_LOADERS.includes(loader), true);
  }
});




