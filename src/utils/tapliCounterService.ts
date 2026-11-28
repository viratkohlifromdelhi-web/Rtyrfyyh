/**
 * Optimistic zero-lag batched global Tapli counter sync for Firestore `/site_config/tapli_counter`.
 *
 * - Never fires a Firestore write per tap (batches taps every 1100ms while tapping
 *   or 650ms after tapping pauses, capped at 500 per atomic increment write).
 * - Displays `serverCount + pendingDelta + inFlightDelta` at 0ms latency with zero flicker.
 * - Keeps a lightweight `localStorage` backup (`bauni_tapli_session_total`) for offline resilience.
 * - Flushes remaining pending taps on `visibilitychange` (hidden) and component unmount.
 */

import {
  doc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const TAPLI_COUNTER_COLLECTION = 'site_config';
export const TAPLI_COUNTER_DOC_ID = 'tapli_counter';
export const TAPLI_COUNTER_PATH = `${TAPLI_COUNTER_COLLECTION}/${TAPLI_COUNTER_DOC_ID}`;
export const TAPLI_LOCAL_STORAGE_KEY = 'bauni_tapli_session_total';

export const TAPLI_FLUSH_ACTIVE_MS = 1100;
export const TAPLI_FLUSH_IDLE_MS = 650;
export const TAPLI_MAX_BATCH_SIZE = 500;

export interface TapliCounterSnapshot {
  serverCount: number;
  pendingDelta: number;
  inFlightDelta: number;
  displayedGlobalCount: number;
  hasSynced: boolean;
  offlineFallback: boolean;
}

export interface TapliSyncScheduler {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
}

export interface TapliSyncControllerOptions {
  flushBatch: (batchDelta: number) => Promise<void>;
  activeFlushMs?: number;
  idleFlushMs?: number;
  maxBatchSize?: number;
  initialServerCount?: number;
  initialHasSynced?: boolean;
  scheduler?: TapliSyncScheduler;
  onChange?: (snapshot: TapliCounterSnapshot) => void;
  persistPending?: (totalLocalBackup: number) => void;
}

export interface TapliSyncController {
  getSnapshot: () => TapliCounterSnapshot;
  recordTap: (count?: number) => TapliCounterSnapshot;
  applyServerCount: (nextServerCount: number) => TapliCounterSnapshot;
  markOfflineFallback: () => TapliCounterSnapshot;
  flushNow: () => Promise<void>;
  dispose: () => void;
}

const defaultScheduler: TapliSyncScheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (id) => globalThis.clearTimeout(id),
};

export function readLocalTapliBackup(): number {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const raw = window.localStorage.getItem(TAPLI_LOCAL_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function writeLocalTapliBackup(value: number): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const safe = Math.max(0, Math.floor(value));
    window.localStorage.setItem(TAPLI_LOCAL_STORAGE_KEY, String(safe));
  } catch {
    // Ignore restricted storage environments
  }
}

/**
 * Pure, framework-agnostic optimistic batching controller so every rapid tap updates UI
 * instantaneously while writes stay safely below Firestore's 1-write/sec document ceiling.
 */
export function createTapliSyncController(
  options: TapliSyncControllerOptions,
): TapliSyncController {
  const activeFlushMs = options.activeFlushMs ?? TAPLI_FLUSH_ACTIVE_MS;
  const idleFlushMs = options.idleFlushMs ?? TAPLI_FLUSH_IDLE_MS;
  const maxBatchSize = Math.max(1, Math.min(TAPLI_MAX_BATCH_SIZE, options.maxBatchSize ?? TAPLI_MAX_BATCH_SIZE));
  const scheduler = options.scheduler ?? defaultScheduler;

  let serverCount = Math.max(0, Math.floor(options.initialServerCount ?? 0));
  let pendingDelta = 0;
  let inFlightDelta = 0;
  let hasSynced = Boolean(options.initialHasSynced);
  let offlineFallback = false;
  let disposed = false;

  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let activeTimer: ReturnType<typeof setTimeout> | null = null;

  const getSnapshot = (): TapliCounterSnapshot => ({
    serverCount,
    pendingDelta,
    inFlightDelta,
    displayedGlobalCount: serverCount + pendingDelta + inFlightDelta,
    hasSynced,
    offlineFallback,
  });

  const emit = (): TapliCounterSnapshot => {
    const snap = getSnapshot();
    options.onChange?.(snap);
    return snap;
  };

  const clearTimers = () => {
    if (idleTimer !== null) {
      scheduler.clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (activeTimer !== null) {
      scheduler.clearTimeout(activeTimer);
      activeTimer = null;
    }
  };

  const flushNow = async (): Promise<void> => {
    if (inFlightDelta > 0 || pendingDelta <= 0) {
      return;
    }

    clearTimers();

    const batch = Math.min(maxBatchSize, pendingDelta);
    const targetServerFloor = serverCount + batch;
    pendingDelta -= batch;
    inFlightDelta = batch;
    emit();

    try {
      await options.flushBatch(batch);
      // Advance local server baseline to at least targetServerFloor (immune to double-counting
      // even if an onSnapshot update arrived concurrently during the in-flight write)
      serverCount = Math.max(serverCount, targetServerFloor);
      inFlightDelta = 0;
      offlineFallback = false;
      hasSynced = true;
      options.persistPending?.(serverCount + pendingDelta);
      emit();

      // If more taps arrived while this batch was in flight, schedule another flush cleanly
      if (!disposed && pendingDelta > 0) {
        activeTimer = scheduler.setTimeout(() => {
          activeTimer = null;
          void flushNow();
        }, activeFlushMs);
      }
    } catch {
      // Never lose taps on transient network hiccups — restore batch back to pending queue
      pendingDelta += batch;
      inFlightDelta = 0;
      offlineFallback = true;
      hasSynced = true;
      options.persistPending?.(serverCount + pendingDelta);
      emit();
    }
  };

  const scheduleFlush = () => {
    if (disposed) return;

    // Reset short idle pause timer so tapping stops -> quick 650ms flush
    if (idleTimer !== null) {
      scheduler.clearTimeout(idleTimer);
    }
    idleTimer = scheduler.setTimeout(() => {
      idleTimer = null;
      void flushNow();
    }, idleFlushMs);

    // Maintain a steady 1100ms ceiling timer during continuous rapid tapping
    if (activeTimer === null) {
      activeTimer = scheduler.setTimeout(() => {
        activeTimer = null;
        void flushNow();
      }, activeFlushMs);
    }
  };

  const recordTap = (count = 1): TapliCounterSnapshot => {
    const delta = Math.max(1, Math.floor(count));
    pendingDelta += delta;
    options.persistPending?.(serverCount + pendingDelta + inFlightDelta);
    const snap = emit();
    scheduleFlush();
    return snap;
  };

  const applyServerCount = (nextServerCount: number): TapliCounterSnapshot => {
    const safeServer = Math.max(0, Math.floor(nextServerCount));
    serverCount = Math.max(safeServer, serverCount);
    hasSynced = true;
    offlineFallback = false;
    options.persistPending?.(serverCount + pendingDelta + inFlightDelta);
    return emit();
  };

  const markOfflineFallback = (): TapliCounterSnapshot => {
    hasSynced = true;
    offlineFallback = true;
    return emit();
  };

  const dispose = (): void => {
    disposed = true;
    clearTimers();
    if (pendingDelta > 0 && inFlightDelta === 0) {
      void flushNow();
    }
  };

  return {
    getSnapshot,
    recordTap,
    applyServerCount,
    markOfflineFallback,
    flushNow,
    dispose,
  };
}

/**
 * Atomic Firestore increment write targeting `/site_config/tapli_counter`.
 * Strictly adheres to `firestore.rules`:
 *   - Keys strictly `['totalTaplis', 'updatedAt', 'updatedAtMs']`
 *   - `batchDelta` clamped to `1..500`
 *   - `updatedAt: serverTimestamp()` (`request.time`)
 */
export async function flushTapliBatchToFirestore(batchDelta: number): Promise<void> {
  const safeBatch = Math.max(1, Math.min(TAPLI_MAX_BATCH_SIZE, Math.floor(batchDelta)));
  if (!db) {
    throw new Error('Firestore instance unavailable');
  }

  const ref = doc(db, TAPLI_COUNTER_COLLECTION, TAPLI_COUNTER_DOC_ID);
  try {
    await setDoc(
      ref,
      {
        totalTaplis: increment(safeBatch),
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, TAPLI_COUNTER_PATH, { silent: true });
    throw error;
  }
}

export interface LiveTapliCounterHandle {
  recordTap: () => TapliCounterSnapshot;
  flushNow: () => Promise<void>;
  getSnapshot: () => TapliCounterSnapshot;
  destroy: () => void;
}

/**
 * Connects the optimistic batched Tapli sync controller to live Firestore `onSnapshot`
 * updates and browser `visibilitychange` flush hooks.
 */
export function connectLiveTapliCounter(
  onChange: (snapshot: TapliCounterSnapshot) => void,
): LiveTapliCounterHandle {
  const localBackup = readLocalTapliBackup();

  const controller = createTapliSyncController({
    flushBatch: flushTapliBatchToFirestore,
    initialServerCount: localBackup,
    initialHasSynced: !db,
    onChange,
    persistPending: writeLocalTapliBackup,
  });

  let unsubscribeSnapshot: (() => void) | null = null;

  if (db) {
    const ref = doc(db, TAPLI_COUNTER_COLLECTION, TAPLI_COUNTER_DOC_ID);
    unsubscribeSnapshot = onSnapshot(
      ref,
      (snap) => {
        // Ignore local latency-compensated pending-write echoes so inFlightDelta is never double-counted
        if (snap.metadata?.hasPendingWrites) {
          return;
        }
        if (!snap.exists()) {
          controller.applyServerCount(localBackup);
          return;
        }
        const raw = snap.data()?.totalTaplis;
        const count = typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0;
        controller.applyServerCount(count);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, TAPLI_COUNTER_PATH, { silent: true });
        controller.markOfflineFallback();
      },
    );
  } else {
    controller.markOfflineFallback();
  }

  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      void controller.flushNow();
    }
  };

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return {
    recordTap: () => controller.recordTap(1),
    flushNow: () => controller.flushNow(),
    getSnapshot: () => controller.getSnapshot(),
    destroy: () => {
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      unsubscribeSnapshot?.();
      unsubscribeSnapshot = null;
      controller.dispose();
    },
  };
}
