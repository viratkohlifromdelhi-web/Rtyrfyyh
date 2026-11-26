/**
 * Pure domain logic for the full-screen Midnight Countdown Lock Overlay
 * gating the birthday website until 12:00 AM IST on December 3, 2026.
 */

export const UNLOCK_TIME_MS = new Date('2026-12-03T00:00:00+05:30').getTime();
export const MIDNIGHT_BYPASS_STORAGE_KEY = 'morgan_midnight_bypass_v1';
export const MIDNIGHT_BYPASS_CODE = '9876';

export const MIDNIGHT_CELEBRATION_HOLD_MS = 1200;
export const MIDNIGHT_FADE_OUT_MS = 450;
export const BYPASS_TOAST_HOLD_MS = 380;
export const BYPASS_FADE_OUT_MS = 400;

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface MidnightCountdownParts {
  remainingMs: number;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  daysStr: string;
  hoursStr: string;
  minsStr: string;
  secsStr: string;
  isFinalFiveSeconds: boolean;
  isUnlocked: boolean;
}

export type MidnightBypassResult = 'bypass' | 'wrong';

export function readMidnightBypass(storage?: SessionStorageLike | null): boolean {
  const store = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  if (!store) return false;
  try {
    return store.getItem(MIDNIGHT_BYPASS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeMidnightBypass(storage?: SessionStorageLike | null): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  if (!store) return;
  try {
    store.setItem(MIDNIGHT_BYPASS_STORAGE_KEY, 'true');
  } catch {
    // Ignore sessionStorage restrictions in private browsing
  }
}

/**
 * Returns true iff the site must remain locked behind the Midnight Countdown Lock Overlay:
 * strictly locked while `nowMs < UNLOCK_TIME_MS` AND session bypass has not been activated.
 * Once `nowMs >= UNLOCK_TIME_MS`, always returns false so the overlay never renders.
 */
export function shouldShowMidnightLock(
  nowMs: number = Date.now(),
  storage?: SessionStorageLike | null,
  targetTimeMs: number = UNLOCK_TIME_MS,
): boolean {
  if (nowMs >= targetTimeMs) {
    return false;
  }
  return !readMidnightBypass(storage);
}

/**
 * Evaluates a 4-digit secret bypass entry. Only `9876` unlocks early.
 */
export function evaluateMidnightBypassCode(rawCode: string): MidnightBypassResult {
  return rawCode.trim() === MIDNIGHT_BYPASS_CODE ? 'bypass' : 'wrong';
}

function padTwo(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/**
 * Computes clean, non-jittering Days/Hours/Mins/Secs countdown units and final-5-second state.
 */
export function computeCountdownParts(
  nowMs: number,
  targetTimeMs: number = UNLOCK_TIME_MS,
): MidnightCountdownParts {
  const remainingMs = Math.max(0, targetTimeMs - nowMs);
  if (remainingMs <= 0) {
    return {
      remainingMs: 0,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      daysStr: '00',
      hoursStr: '00',
      minsStr: '00',
      secsStr: '00',
      isFinalFiveSeconds: false,
      isUnlocked: true,
    };
  }

  // Use Math.ceil so `1..5000ms` displays 1..5s and hits 00:00:00:00 precisely at midnight
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    remainingMs,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    daysStr: padTwo(days),
    hoursStr: padTwo(hours),
    minsStr: padTwo(minutes),
    secsStr: padTwo(seconds),
    isFinalFiveSeconds: totalSeconds > 0 && totalSeconds <= 5,
    isUnlocked: false,
  };
}
