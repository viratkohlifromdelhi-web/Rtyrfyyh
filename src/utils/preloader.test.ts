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

test('getDefaultPreloadImageUrls lists Anamika portrait, 21 July receipt, and Baad Me receipt', () => {
  const urls = getDefaultPreloadImageUrls('/');
  assert.equal(urls.length, 3);
  assert.ok(urls[0].includes('IMG_20261126_131911_725.jpg'));
  assert.ok(urls[1].includes('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png'));
  assert.ok(urls[2].includes('Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png'));
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


