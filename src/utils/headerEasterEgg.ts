/**
 * Pure state machine for the Secret Header Easter Egg
 * (5 quick taps on "Anamika's 17th" inside the sticky TopBar).
 */

export const HEADER_EASTER_EGG_TARGET_TAPS = 5;
export const HEADER_EASTER_EGG_WINDOW_MS = 1400;
export const HEADER_EASTER_EGG_TOAST_VISIBLE_MS = 2800;
export const HEADER_EASTER_EGG_TOAST_FADE_MS = 240;
export const HEADER_EASTER_EGG_MESSAGE = 'Okay, okay, stop poking the header, bauni!';

export interface HeaderTapStreakState {
  count: number;
  lastTapMs: number | null;
}

export interface HeaderTapStreakStepResult {
  nextCount: number;
  nextLastTapMs: number | null;
  unlocked: boolean;
}

/**
 * Advances the hidden tap streak.
 * - If more than `windowMs` (1400ms) passed since the previous tap, resets streak cleanly to 1.
 * - On tap 5 within the window, resets count to 0 and returns `unlocked: true`.
 */
export function advanceHeaderTapStreak(
  state: HeaderTapStreakState,
  nowMs: number,
  windowMs = HEADER_EASTER_EGG_WINDOW_MS,
  targetTaps = HEADER_EASTER_EGG_TARGET_TAPS,
): HeaderTapStreakStepResult {
  const safeNow = Number.isFinite(nowMs) ? nowMs : 0;
  const withinWindow =
    state.lastTapMs !== null &&
    Number.isFinite(state.lastTapMs) &&
    safeNow >= state.lastTapMs &&
    safeNow - state.lastTapMs <= windowMs;

  const incremented = withinWindow ? state.count + 1 : 1;

  if (incremented >= targetTaps) {
    return {
      nextCount: 0,
      nextLastTapMs: null,
      unlocked: true,
    };
  }

  return {
    nextCount: incremented,
    nextLastTapMs: safeNow,
    unlocked: false,
  };
}
