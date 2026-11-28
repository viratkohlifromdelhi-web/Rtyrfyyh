/**
 * Pure domain logic for the "Time Capsule for 18 Year Old Anamika" (03 Dec 2027) section.
 * Strictly zero visible dashes (`—`, `–`, `-`) in every user-facing string.
 */

import type { ModinoReaction } from './modinoReactions';

export const TIME_CAPSULE_COLLECTION = 'time_capsules';
export const TIME_CAPSULE_STORAGE_KEY = 'bauni_sealed_time_capsules';
export const TIME_CAPSULE_UNLOCK_DATE_LABEL = '03 Dec 2027';
export const TIME_CAPSULE_UNLOCK_TIME_MS = new Date('2027-12-03T00:00:00+05:30').getTime();

export const TIME_CAPSULE_MIN_CHARS = 3;
export const TIME_CAPSULE_MAX_CHARS = 1200;
export const TIME_CAPSULE_MAX_NUMBER = 100;

export const TIME_CAPSULE_CATEGORIES = [
  'Big 18th Wish ✨',
  'Chaotic Prediction 😂',
  'Promise to Myself 🎀',
  'Note to Future Me 💌',
] as const;

export type TimeCapsuleCategory = (typeof TIME_CAPSULE_CATEGORIES)[number];

export const DEFAULT_TIME_CAPSULE_CATEGORY: TimeCapsuleCategory = TIME_CAPSULE_CATEGORIES[0];

export const TIME_CAPSULE_STARTERS = [
  'By my 18th birthday, I really hope...',
  'Dear 18 year old me, did we finally...',
  "Prediction for 03 Dec 2027: I will still be 5'2 and...",
] as const;

export const TIME_CAPSULE_COPY = {
  eyebrow: 'SEALED FOR 03 DEC 2027 · ONE YEAR FROM TODAY',
  headline: 'Time Capsule for 18 Year Old Anamika',
  subtitle:
    'Write a wish, goal, or chaotic prediction for your 18th birthday self. Seal it with wax now and read it next year.',
  heightStamp: `Height at 17: 5'2" · Predicted at 18: Still 5'2"`,
  textareaPlaceholder:
    'Dear 18 year old Anamika, write anything you want to remember next December...',
  ctaIdle: 'Lock & Wax Seal for 03 Dec 2027 🕯️',
  ctaSealing: 'Pressing Wax Seal...',
  emptyValidationNudge: 'Write at least a tiny line for your 18 year old self first!',
  networkErrorFallback:
    'Could not reach the vault right now. Your letter is still right here so try sealing again in a moment.',
  sealedEyebrow: 'TIME CAPSULE SEALED · OPENS 03 DEC 2027',
  sealedHeadline: 'Wax Sealed for Your 18th Birthday',
  sealedNote: 'Your letter is tucked inside the 2027 vault and safely saved.',
  peekOpenLabel: 'Peek Inside My Seal',
  peekHideLabel: 'Hide Again',
  sealAnotherLabel: 'Seal Another Capsule ✨',
} as const;

export const TIME_CAPSULE_MODINO_REACTION: ModinoReaction = {
  text: 'Wax seal lag gaya! Ab ye seedha 03 Dec 2027 ko 18th birthday pe khulega! 🕯️💌',
  mood: 'shy_blush',
  sfx: 'awww_chime',
};

export interface SealedTimeCapsuleRecord {
  capsuleId: string;
  category: TimeCapsuleCategory;
  letter: string;
  capsuleNumber: number;
  unlockDate: '03 Dec 2027';
  sealedAtMs: number;
  sealedAtIST: string;
  sessionId: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const VISIBLE_DASH_REGEX = /[\u2014\u2013-]/g;

export function stripVisibleDashes(input: string): string {
  return input.replace(VISIBLE_DASH_REGEX, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function isValidTimeCapsuleCategory(value: unknown): value is TimeCapsuleCategory {
  return (
    typeof value === 'string' &&
    (TIME_CAPSULE_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Computes whole days remaining until 12:00 AM IST on 03 Dec 2027.
 */
export function computeDaysUntilEighteenth(
  nowMs: number = Date.now(),
  targetMs: number = TIME_CAPSULE_UNLOCK_TIME_MS,
): number {
  const remainingMs = targetMs - nowMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 86_400_000);
}

/**
 * Formats the dynamic countdown pill string (zero visible dashes).
 */
export function formatUnlockCountdownPill(
  nowMs: number = Date.now(),
  targetMs: number = TIME_CAPSULE_UNLOCK_TIME_MS,
): string {
  const days = computeDaysUntilEighteenth(nowMs, targetMs);
  if (days <= 0) {
    return `Unlocked Today · ${TIME_CAPSULE_UNLOCK_DATE_LABEL}`;
  }
  const dayWord = days === 1 ? 'Day' : 'Days';
  return `Unlocks in ${days} ${dayWord} · ${TIME_CAPSULE_UNLOCK_DATE_LABEL}`;
}

/**
 * Validates the user's letter input before allowing wax seal submission.
 */
export function validateTimeCapsuleLetter(rawLetter: string): {
  valid: boolean;
  trimmed: string;
  error: string | null;
} {
  const trimmed = rawLetter.trim().slice(0, TIME_CAPSULE_MAX_CHARS);
  if (trimmed.length < TIME_CAPSULE_MIN_CHARS) {
    return {
      valid: false,
      trimmed,
      error: TIME_CAPSULE_COPY.emptyValidationNudge,
    };
  }
  return {
    valid: true,
    trimmed,
    error: null,
  };
}

/**
 * Applies a starter prompt chip cleanly into the textarea.
 */
export function applyStarterPrompt(currentValue: string, starter: string): string {
  const trimmed = currentValue.trim();
  if (!trimmed) return `${starter} `;
  const combined = `${trimmed}\n${starter} `;
  return combined.slice(0, TIME_CAPSULE_MAX_CHARS);
}

/**
 * Formats an epoch timestamp into a clean, zero-dash IST display string
 * (e.g. `03 Dec 2026, 12:04 AM IST`).
 */
export function formatCapsuleISTTimestamp(epochMs: number = Date.now()): string {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(epochMs));
    return `${stripVisibleDashes(formatted).replace(/\bam\b/i, 'AM').replace(/\bpm\b/i, 'PM')} IST`;
  } catch {
    return '03 Dec 2026, 12:00 AM IST';
  }
}

/**
 * Builds an alphanumeric Firestore-safe document ID: `cap_${Date.now()}_${randomSuffix}`.
 */
export function createTimeCapsuleId(nowMs: number = Date.now(), randomSuffix?: string): string {
  const suffix =
    randomSuffix ??
    Math.random()
      .toString(36)
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 6)
      .padEnd(6, 'x');
  const cleanSuffix = suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'seal18';
  return `cap_${Math.floor(nowMs)}_${cleanSuffix}`;
}

/**
 * Builds the validated Firestore document payload (excluding `sealedAt: serverTimestamp()`).
 */
export function buildTimeCapsulePayload(input: {
  capsuleId: string;
  category: TimeCapsuleCategory;
  letter: string;
  capsuleNumber: number;
  sealedAtMs: number;
  sessionId: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
}): SealedTimeCapsuleRecord {
  const safeNumber = Math.min(
    TIME_CAPSULE_MAX_NUMBER,
    Math.max(1, Math.floor(input.capsuleNumber)),
  );
  const safeSessionId =
    input.sessionId && input.sessionId.length >= 4
      ? input.sessionId.slice(0, 128)
      : 'direct_session';

  return {
    capsuleId: input.capsuleId,
    category: isValidTimeCapsuleCategory(input.category)
      ? input.category
      : DEFAULT_TIME_CAPSULE_CATEGORY,
    letter: input.letter.trim().slice(0, TIME_CAPSULE_MAX_CHARS),
    capsuleNumber: safeNumber,
    unlockDate: TIME_CAPSULE_UNLOCK_DATE_LABEL,
    sealedAtMs: Math.floor(input.sealedAtMs),
    sealedAtIST: formatCapsuleISTTimestamp(input.sealedAtMs),
    sessionId: safeSessionId,
    deviceType: input.deviceType,
  };
}

export function readSealedCapsules(storage?: StorageLike | null): SealedTimeCapsuleRecord[] {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return [];
  try {
    const raw = store.getItem(TIME_CAPSULE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SealedTimeCapsuleRecord =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.capsuleId === 'string' &&
        isValidTimeCapsuleCategory(item.category) &&
        typeof item.letter === 'string' &&
        typeof item.capsuleNumber === 'number' &&
        typeof item.sealedAtMs === 'number' &&
        typeof item.sealedAtIST === 'string',
    );
  } catch {
    return [];
  }
}

export function appendSealedCapsule(
  record: SealedTimeCapsuleRecord,
  storage?: StorageLike | null,
): SealedTimeCapsuleRecord[] {
  const existing = readSealedCapsules(storage);
  const next = [record, ...existing.filter((item) => item.capsuleId !== record.capsuleId)].slice(
    0,
    TIME_CAPSULE_MAX_NUMBER,
  );
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (store) {
    try {
      store.setItem(TIME_CAPSULE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota / private mode restrictions
    }
  }
  return next;
}
