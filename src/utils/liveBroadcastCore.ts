export type LiveBroadcastMood = 'cheer' | 'tease' | 'hype' | 'whisper';

export interface LiveBroadcastRecord {
  broadcastId: string;
  message: string;
  mood: LiveBroadcastMood;
  confetti: boolean;
  sentAtMs: number;
  expiresAtMs: number;
}

export interface LiveBroadcastMoodOption {
  id: LiveBroadcastMood;
  label: string;
}

export const LIVE_BROADCAST_COLLECTION = 'site_config' as const;
export const LIVE_BROADCAST_DOC_ID = 'live_broadcast' as const;
export const LIVE_BROADCAST_TTL_MS = 90_000;
export const LIVE_BROADCAST_MAX_TTL_MS = 600_000;
export const LIVE_BROADCAST_MAX_CHARS = 220;
export const LIVE_BROADCAST_HOLD_MIN_MS = 7_500;
export const LIVE_BROADCAST_HOLD_MAX_MS = 13_000;
export const LIVE_BROADCAST_SEEN_STORAGE_KEY = 'bauni_seen_live_broadcasts';
export const LIVE_BROADCAST_LOCAL_EVENT = 'modino:live_broadcast';
const MAX_STORED_SEEN_IDS = 60;

export const LIVE_BROADCAST_MOODS: ReadonlyArray<LiveBroadcastMoodOption> = [
  { id: 'cheer', label: 'Cheer 🎉' },
  { id: 'tease', label: 'Tease 😂' },
  { id: 'hype', label: 'Hype ✨' },
  { id: 'whisper', label: 'Whisper 💌' },
];

export const LIVE_BROADCAST_PRESETS: ReadonlyArray<string> = [
  'Oye Morgan! Stop hammering Tapli and check your Gift Vault! 👀✨',
  'Wait... how did I know you are scrolling this right now? Happy 17th! 😂🎀',
  'Psst! Open the Baad Me reveal if you have not yet! 💌',
  "Still 5'2 on your 17th birthday too, just checking in! 😂👑",
  'Do not forget to wax seal your 18th Birthday Time Capsule! 🕯️',
];

const VALID_MOOD_SET: ReadonlySet<string> = new Set<LiveBroadcastMood>([
  'cheer',
  'tease',
  'hype',
  'whisper',
]);

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]{4,128}$/;

export function isLiveBroadcastMood(value: unknown): value is LiveBroadcastMood {
  return typeof value === 'string' && VALID_MOOD_SET.has(value);
}

/**
 * Normalizes a live broadcast message: removes visible dashes (em/en/hyphen)
 * to preserve the site's zero-dash typography, collapses whitespace, and clamps to 220 chars.
 */
export function sanitizeLiveBroadcastMessage(raw: string): string {
  const cleaned = raw
    .replace(/[—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= LIVE_BROADCAST_MAX_CHARS) {
    return cleaned;
  }
  return cleaned.slice(0, LIVE_BROADCAST_MAX_CHARS).trim();
}

export function createLiveBroadcastId(
  nowMs: number = Date.now(),
  randomSuffix?: string,
): string {
  const safeNow = Math.max(1700000000001, Math.floor(nowMs));
  const rawSuffix =
    typeof randomSuffix === 'string' && randomSuffix.length > 0
      ? randomSuffix
      : Math.random().toString(36).slice(2, 10);
  const cleanSuffix = rawSuffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'live';
  return `bc_${safeNow}_${cleanSuffix}`;
}

/**
 * Computes comfortable reading duration for a live Modino broadcast:
 * clamp(7500ms, message.length * 75ms + 3500ms, 13000ms).
 */
export function computeLiveBroadcastHoldMs(message: string): number {
  const length = typeof message === 'string' ? message.trim().length : 0;
  const computed = length * 75 + 3500;
  return Math.min(LIVE_BROADCAST_HOLD_MAX_MS, Math.max(LIVE_BROADCAST_HOLD_MIN_MS, computed));
}

export function computeLiveBroadcastRemainingSec(
  expiresAtMs: number,
  nowMs: number = Date.now(),
): number {
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
}

export function parseLiveBroadcastData(raw: unknown): LiveBroadcastRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  if (typeof d.broadcastId !== 'string' || !VALID_ID_REGEX.test(d.broadcastId)) {
    return null;
  }
  if (typeof d.message !== 'string') return null;
  const message = sanitizeLiveBroadcastMessage(d.message);
  if (message.length < 1 || message.length > LIVE_BROADCAST_MAX_CHARS) {
    return null;
  }
  const mood: LiveBroadcastMood = isLiveBroadcastMood(d.mood) ? d.mood : 'cheer';
  const confetti = typeof d.confetti === 'boolean' ? d.confetti : true;
  const sentAtMs =
    typeof d.sentAtMs === 'number' && Number.isFinite(d.sentAtMs)
      ? Math.floor(d.sentAtMs)
      : null;
  const expiresAtMs =
    typeof d.expiresAtMs === 'number' && Number.isFinite(d.expiresAtMs)
      ? Math.floor(d.expiresAtMs)
      : null;

  if (sentAtMs === null || expiresAtMs === null) return null;
  if (sentAtMs <= 1700000000000 || sentAtMs >= 4102444800000) return null;
  if (expiresAtMs < sentAtMs || expiresAtMs > sentAtMs + LIVE_BROADCAST_MAX_TTL_MS) {
    return null;
  }

  return {
    broadcastId: d.broadcastId,
    message,
    mood,
    confetti,
    sentAtMs,
    expiresAtMs,
  };
}

export function isLiveBroadcastDeliverable(
  record: LiveBroadcastRecord | null,
  seenIds: ReadonlySet<string>,
  nowMs: number = Date.now(),
): boolean {
  if (!record) return false;
  if (!record.message || record.message.trim().length === 0) return false;
  if (seenIds.has(record.broadcastId)) return false;
  if (nowMs > record.expiresAtMs) return false;
  return true;
}

export function buildLiveBroadcastWriteFields(input: {
  message: string;
  mood: LiveBroadcastMood;
  confetti: boolean;
  nowMs?: number;
  ttlMs?: number;
  broadcastId?: string;
}): LiveBroadcastRecord {
  const cleanMessage = sanitizeLiveBroadcastMessage(input.message);
  if (!cleanMessage) {
    throw new Error('Broadcast message cannot be empty.');
  }
  const nowMs = Math.floor(input.nowMs ?? Date.now());
  const ttlMs = Math.min(
    LIVE_BROADCAST_MAX_TTL_MS,
    Math.max(1_000, Math.floor(input.ttlMs ?? LIVE_BROADCAST_TTL_MS)),
  );
  const broadcastId =
    input.broadcastId && VALID_ID_REGEX.test(input.broadcastId)
      ? input.broadcastId
      : createLiveBroadcastId(nowMs);
  const mood: LiveBroadcastMood = isLiveBroadcastMood(input.mood) ? input.mood : 'cheer';

  return {
    broadcastId,
    message: cleanMessage,
    mood,
    confetti: Boolean(input.confetti),
    sentAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
  };
}

export function readSeenLiveBroadcastIds(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined'
    ? window.sessionStorage
    : null,
): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(LIVE_BROADCAST_SEEN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

export function markLiveBroadcastIdSeen(
  broadcastId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window !== 'undefined'
    ? window.sessionStorage
    : null,
): Set<string> {
  const seen = readSeenLiveBroadcastIds(storage);
  seen.add(broadcastId);
  if (storage) {
    try {
      const compact = Array.from(seen).slice(-MAX_STORED_SEEN_IDS);
      storage.setItem(LIVE_BROADCAST_SEEN_STORAGE_KEY, JSON.stringify(compact));
      return new Set(compact);
    } catch {
      // Ignore private browsing or storage quota errors
    }
  }
  return seen;
}
