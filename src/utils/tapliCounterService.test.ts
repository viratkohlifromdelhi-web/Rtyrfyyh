import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTapliSyncController,
  type TapliSyncScheduler,
} from './tapliCounterService';

function createFakeScheduler() {
  let nextId = 1;
  const tasks = new Map<number, { fn: () => void; ms: number }>();

  const scheduler: TapliSyncScheduler = {
    setTimeout(fn, ms) {
      const id = nextId++;
      tasks.set(id, { fn, ms });
      return id as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimeout(id) {
      tasks.delete(id as unknown as number);
    },
  };

  return {
    scheduler,
    pendingTimers: () => Array.from(tasks.entries()),
    runShortestTimer: () => {
      const entries = Array.from(tasks.entries()).sort((a, b) => a[1].ms - b[1].ms);
      if (entries.length === 0) return false;
      const [id, task] = entries[0];
      tasks.delete(id);
      task.fn();
      return true;
    },
  };
}

test('rapid tapping updates displayedGlobalCount instantaneously and batches into a single Firestore write', async () => {
  const fake = createFakeScheduler();
  const flushedBatches: number[] = [];

  const controller = createTapliSyncController({
    initialServerCount: 100,
    initialHasSynced: true,
    scheduler: fake.scheduler,
    flushBatch: async (batch) => {
      flushedBatches.push(batch);
    },
  });

  // 12 rapid taps -> zero immediate writes, instant optimistic count 112
  for (let i = 0; i < 12; i++) {
    controller.recordTap();
  }
  assert.equal(controller.getSnapshot().displayedGlobalCount, 112);
  assert.equal(controller.getSnapshot().pendingDelta, 12);
  assert.equal(flushedBatches.length, 0);

  // Trigger idle pause flush (650ms)
  assert.equal(fake.runShortestTimer(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(flushedBatches, [12]);
  assert.equal(controller.getSnapshot().serverCount, 112);
  assert.equal(controller.getSnapshot().pendingDelta, 0);
  assert.equal(controller.getSnapshot().displayedGlobalCount, 112);
});

test('batch flush caps each write at 500 to satisfy firestore.rules and automatically drains remainder', async () => {
  const fake = createFakeScheduler();
  const flushedBatches: number[] = [];

  const controller = createTapliSyncController({
    initialServerCount: 10,
    initialHasSynced: true,
    scheduler: fake.scheduler,
    flushBatch: async (batch) => {
      flushedBatches.push(batch);
    },
  });

  controller.recordTap(620);
  assert.equal(controller.getSnapshot().displayedGlobalCount, 630);

  await controller.flushNow();
  assert.deepEqual(flushedBatches, [500]);
  assert.equal(controller.getSnapshot().pendingDelta, 120);
  assert.equal(controller.getSnapshot().displayedGlobalCount, 630);

  // Next scheduled flush drains the remaining 120
  assert.equal(fake.runShortestTimer(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(flushedBatches, [500, 120]);
  assert.equal(controller.getSnapshot().serverCount, 630);
  assert.equal(controller.getSnapshot().pendingDelta, 0);
});

test('failed Firestore flush safely restores pending taps with zero data loss', async () => {
  const fake = createFakeScheduler();
  let shouldFail = true;

  const controller = createTapliSyncController({
    initialServerCount: 50,
    initialHasSynced: true,
    scheduler: fake.scheduler,
    flushBatch: async () => {
      if (shouldFail) throw new Error('offline');
    },
  });

  controller.recordTap(7);
  await controller.flushNow();

  // Taps preserved even when offline
  assert.equal(controller.getSnapshot().offlineFallback, true);
  assert.equal(controller.getSnapshot().pendingDelta, 7);
  assert.equal(controller.getSnapshot().displayedGlobalCount, 57);

  // Reconnects and flushes cleanly
  shouldFail = false;
  await controller.flushNow();
  assert.equal(controller.getSnapshot().offlineFallback, false);
  assert.equal(controller.getSnapshot().serverCount, 57);
  assert.equal(controller.getSnapshot().pendingDelta, 0);
});

test('concurrent server snapshot arriving during an in-flight batch never double-counts global taps', async () => {
  const fake = createFakeScheduler();
  const deferred: { resolve: (() => void) | null } = { resolve: null };

  const controller = createTapliSyncController({
    initialServerCount: 0,
    initialHasSynced: true,
    scheduler: fake.scheduler,
    flushBatch: () =>
      new Promise<void>((resolve) => {
        deferred.resolve = resolve;
      }),
  });

  controller.recordTap(12);
  const flushPromise = controller.flushNow();
  // Simulate server snapshot echoing back 12 before flushBatch promise resolves
  controller.applyServerCount(12);
  deferred.resolve?.();
  await flushPromise;

  assert.equal(controller.getSnapshot().serverCount, 12);
  assert.equal(controller.getSnapshot().displayedGlobalCount, 12);
});
