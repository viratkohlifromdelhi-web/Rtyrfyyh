import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  LIVE_BROADCAST_COLLECTION,
  LIVE_BROADCAST_DOC_ID,
  buildLiveBroadcastWriteFields,
  parseLiveBroadcastData,
  type LiveBroadcastMood,
  type LiveBroadcastRecord,
} from './liveBroadcastCore';

export * from './liveBroadcastCore';

/**
 * Subscribes to `/site_config/live_broadcast` in real time.
 * Gracefully degrades to a no-op if Firestore is unavailable or permission/network errors occur.
 */
export function subscribeToLiveBroadcast(
  onUpdate: (record: LiveBroadcastRecord | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  if (!db) {
    onUpdate(null);
    return () => {};
  }

  let unsub: Unsubscribe | null = null;
  try {
    const ref = doc(db, LIVE_BROADCAST_COLLECTION, LIVE_BROADCAST_DOC_ID);
    unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        onUpdate(parseLiveBroadcastData(snap.data()));
      },
      (err) => {
        onError?.(err);
      },
    );
  } catch (err) {
    onError?.(err);
  }

  return () => {
    if (unsub) {
      try {
        unsub();
      } catch {
        // silent cleanup
      }
    }
  };
}

/**
 * Owner-only write to `/site_config/live_broadcast`.
 * Strictly enforces the 7-field schema matching `firestore.rules`.
 */
export async function sendLiveBroadcast(input: {
  message: string;
  mood: LiveBroadcastMood;
  confetti: boolean;
}): Promise<LiveBroadcastRecord> {
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const record = buildLiveBroadcastWriteFields(input);
  const ref = doc(db, LIVE_BROADCAST_COLLECTION, LIVE_BROADCAST_DOC_ID);
  await setDoc(ref, {
    broadcastId: record.broadcastId,
    message: record.message,
    mood: record.mood,
    confetti: record.confetti,
    sentAt: serverTimestamp(),
    sentAtMs: record.sentAtMs,
    expiresAtMs: record.expiresAtMs,
  });

  return record;
}

/**
 * Owner-only delete of `/site_config/live_broadcast` to clear an active broadcast immediately.
 */
export async function clearActiveLiveBroadcast(): Promise<void> {
  if (!db) {
    throw new Error('Firestore is unavailable.');
  }

  const ref = doc(db, LIVE_BROADCAST_COLLECTION, LIVE_BROADCAST_DOC_ID);
  await deleteDoc(ref);
}
