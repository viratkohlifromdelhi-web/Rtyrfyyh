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

test('getDefaultPreloadImageUrls lists Anamika portrait first and 21 July receipt second', () => {
  const urls = getDefaultPreloadImageUrls('/');
  assert.equal(urls.length, 2);
  assert.ok(urls[0].includes('IMG_20261126_131911_725.jpg'));
  assert.ok(urls[1].includes('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png'));
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

