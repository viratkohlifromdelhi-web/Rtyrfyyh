/**
 * Hardened Android-Reliable Mobile Haptic Feedback Engine (`navigator.vibrate`).
 *
 * - Direct feature check (`typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'`)
 *   wrapped in `try/catch`, returning the exact boolean result from `navigator.vibrate(...)` so callers
 *   and owner diagnostics know immediately whether the browser accepted or blocked the buzz.
 * - Defaults to enabled (`true`) on load; NEVER silently disabled when sound is muted or when
 *   `prefers-reduced-motion` is toggled.
 * - Uses crisp, Android-motor-noticeable pulse durations (`20ms` light/tap, `32ms` medium/pop,
 *   `28ms` / `[24, 30, 32]` Tapli bonks, `[25, 45, 40]` success/unlock, `[30, 45, 35, 45, 55]`
 *   celebrate, `[45, 35, 45]` error/shake) so linear & ERM motors spin up reliably.
 * - Uses a minimal `35ms` debounce max for rapid wheel ticks and Tapli hits so rapid consecutive
 *   taps still buzz cleanly without dropping gestures.
 * - Automatically cancels active vibrations on `visibilitychange` when the tab hides or phone locks.
 */

export const WHEEL_TICK_THROTTLE_MS = 35;
export const TAPLI_DEBOUNCE_MS = 35;
export const CELEBRATION_DEDUP_MS = 50;

export type HapticPattern = number | readonly number[];

export interface NavigatorVibrateLike {
  vibrate?: (pattern: number | number[]) => boolean;
}

export interface ScannerHapticStep {
  durationMs: number;
  intervalMs: number;
}

export const HAPTIC_PATTERNS = {
  // Standardized base tactile patterns (tuned for Android motor spin-up)
  tap: 20,
  light: 20,
  tick: 16,
  medium: 32,
  pop: 32,
  tapli: 28,
  bonk: 28,
  tapliHeavy: [24, 30, 32] as const,
  success: [25, 45, 40] as const,
  unlock: [25, 45, 40] as const,
  celebrate: [30, 45, 35, 45, 55] as const,
  error: [45, 35, 45] as const,
  shake: [45, 35, 45] as const,
  bump: [45, 35, 45] as const,

  // Feature-specific named patterns mapped onto standardized strengths
  scannerVerdict: [25, 45, 40] as const,
  wheelPegTick: 16,
  wheelSpinStart: 32,
  wheelLand: [30, 45, 35, 45, 55] as const,
  vaultKeypadTap: 20,
  vaultWrongCode: [45, 35, 45] as const,
  vaultUnlock: [25, 45, 40] as const,
  vaultStopRing: 32,
  vaultDustSnap: [38, 28, 26, 28, 20] as const,
  vaultRewardReveal: [30, 45, 35, 45, 55] as const,
  giftBoxWiggle: 32,
  giftBoxRibbonPeel: 32,
  giftBoxLidPop: 32,
  giftBoxReveal: [30, 45, 35, 45, 55] as const,
  casePaperclip: 20,
  caseStamp: 32,
  scratchReveal: [25, 45, 40] as const,
  celebrationBurst: [30, 45, 35, 45, 55] as const,
  dodgeTap: 20,
  summaryCopyTap: 20,
  cardFlip: 20,
  lighterSpark: 32,
  heroPopConfetti: 20,
  heroOpenGift: 20,
  emojiBounce: 20,
  modeSwitch: 20,
  noteCardFlick: 20,
  rankSlide: 20,
  sparkleToggle: 20,
  timelineNodeClimax: 32,
  timelineReceiptJump: 20,
  footerChibiReplay: 24,
  coopKissTick: 20,
  coopHatchCelebrate: [30, 45, 35, 45, 55] as const,
  bluffMiddleFinger: [32, 40, 40] as const,
  tapliLight: 28,
  tapliPunchy: [24, 30, 32] as const,
  tapliMilestone: [30, 45, 35, 45, 55] as const,
} as const;

export type HapticPresetName = keyof typeof HAPTIC_PATTERNS;

/**
 * Escalating Bauni-Meter pulse schedule (clearly felt on Android motors):
 * - 0% – 35%: 20ms pulse every 240ms
 * - 35% – 70%: 28ms pulse every 140ms
 * - 70% – 99%: 36ms pulse every 80ms
 */
export function getScannerHapticStep(progressPct: number): ScannerHapticStep {
  if (progressPct < 35) {
    return { durationMs: 20, intervalMs: 240 };
  }
  if (progressPct < 70) {
    return { durationMs: 28, intervalMs: 140 };
  }
  return { durationMs: 36, intervalMs: 80 };
}

function getDefaultNavigator(): NavigatorVibrateLike | undefined {
  return typeof navigator !== 'undefined' ? (navigator as NavigatorVibrateLike) : undefined;
}

function getDefaultNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function createHapticsEngine(options?: {
  getNav?: () => NavigatorVibrateLike | undefined;
  now?: () => number;
  initialEnabled?: boolean;
}) {
  const getNav = options?.getNav ?? getDefaultNavigator;
  const now = options?.now ?? getDefaultNow;

  let enabled = options?.initialEnabled ?? true;
  let lastTickTime = -Infinity;
  let lastTapliTime = -Infinity;
  let lastCelebrationTime = -Infinity;

  const isSupported = (): boolean => {
    try {
      const nav = getNav();
      return Boolean(nav && typeof nav.vibrate === 'function');
    } catch {
      return false;
    }
  };

  const isEnabled = (): boolean => enabled;

  const setEnabled = (next: boolean): void => {
    enabled = Boolean(next);
    if (!enabled) {
      stopHaptics();
    }
  };

  const vibrateSafe = (pattern: HapticPattern): boolean => {
    if (!enabled) return false;
    try {
      const nav = getNav();
      if (!nav || typeof nav.vibrate !== 'function') {
        return false;
      }
      const arg = typeof pattern === 'number' ? pattern : [...pattern];
      return Boolean(nav.vibrate(arg));
    } catch {
      return false;
    }
  };

  const stopHaptics = (): boolean => {
    try {
      const nav = getNav();
      if (!nav || typeof nav.vibrate !== 'function') {
        return false;
      }
      return Boolean(nav.vibrate(0));
    } catch {
      return false;
    }
  };

  const vibrateThrottled = (
    durationMs: number,
    minIntervalMs = WHEEL_TICK_THROTTLE_MS,
  ): boolean => {
    if (!enabled) return false;
    const current = now();
    if (current < lastTickTime) {
      lastTickTime = -Infinity;
    }
    if (current - lastTickTime < minIntervalMs) {
      return false;
    }
    lastTickTime = current;
    return vibrateSafe(durationMs);
  };

  const vibrateTapliDebounced = (pattern: HapticPattern): boolean => {
    if (!enabled) return false;
    const current = now();
    if (current < lastTapliTime) {
      lastTapliTime = -Infinity;
    }
    if (current - lastTapliTime < TAPLI_DEBOUNCE_MS) {
      return false;
    }
    lastTapliTime = current;
    return vibrateSafe(pattern);
  };

  const vibrateCelebration = (): boolean => {
    if (!enabled) return false;
    const current = now();
    if (current < lastCelebrationTime) {
      lastCelebrationTime = -Infinity;
    }
    if (current - lastCelebrationTime < CELEBRATION_DEDUP_MS) {
      return false;
    }
    lastCelebrationTime = current;
    return vibrateSafe(HAPTIC_PATTERNS.celebrate);
  };

  const resetThrottles = (): void => {
    lastTickTime = -Infinity;
    lastTapliTime = -Infinity;
    lastCelebrationTime = -Infinity;
  };

  const trigger = (presetOrPattern: HapticPresetName | HapticPattern): boolean => {
    if (typeof presetOrPattern === 'string') {
      return vibrateSafe(HAPTIC_PATTERNS[presetOrPattern]);
    }
    return vibrateSafe(presetOrPattern);
  };

  return {
    isSupported,
    isEnabled,
    setEnabled,
    resetThrottles,
    vibrateSafe,
    vibrateThrottled,
    stopHaptics,
    trigger,

    // Standardized base patterns
    tap: () => vibrateSafe(HAPTIC_PATTERNS.tap),
    light: () => vibrateSafe(HAPTIC_PATTERNS.light),
    tick: () => vibrateThrottled(HAPTIC_PATTERNS.tick, WHEEL_TICK_THROTTLE_MS),
    medium: () => vibrateSafe(HAPTIC_PATTERNS.medium),
    pop: () => vibrateSafe(HAPTIC_PATTERNS.pop),
    tapli: () => vibrateTapliDebounced(HAPTIC_PATTERNS.tapli),
    bonk: () => vibrateSafe(HAPTIC_PATTERNS.bonk),
    success: () => vibrateSafe(HAPTIC_PATTERNS.success),
    unlock: () => vibrateSafe(HAPTIC_PATTERNS.unlock),
    celebrate: () => vibrateCelebration(),
    error: () => vibrateSafe(HAPTIC_PATTERNS.error),
    shake: () => vibrateSafe(HAPTIC_PATTERNS.shake),
    bump: () => vibrateSafe(HAPTIC_PATTERNS.bump),

    // Bauni-Meter Hold Scanner
    scannerPulse: (progressPct: number) =>
      vibrateSafe(getScannerHapticStep(progressPct).durationMs),
    scannerVerdict: () => vibrateSafe(HAPTIC_PATTERNS.scannerVerdict),

    // Spin the Wheel
    wheelSpinStart: () => vibrateSafe(HAPTIC_PATTERNS.wheelSpinStart),
    wheelPegTick: () =>
      vibrateThrottled(HAPTIC_PATTERNS.wheelPegTick, WHEEL_TICK_THROTTLE_MS),
    wheelLand: () => vibrateSafe(HAPTIC_PATTERNS.wheelLand),

    // Infinity Gift Vault
    vaultKeypadTap: () => vibrateSafe(HAPTIC_PATTERNS.vaultKeypadTap),
    vaultWrongCode: () => vibrateSafe(HAPTIC_PATTERNS.vaultWrongCode),
    vaultUnlock: () => vibrateSafe(HAPTIC_PATTERNS.vaultUnlock),
    vaultStopRing: () => vibrateSafe(HAPTIC_PATTERNS.vaultStopRing),
    vaultDustSnap: () => vibrateSafe(HAPTIC_PATTERNS.vaultDustSnap),
    vaultRewardReveal: () => vibrateSafe(HAPTIC_PATTERNS.vaultRewardReveal),

    // Birthday Gift Box Unwrap
    giftBoxWiggle: () => vibrateSafe(HAPTIC_PATTERNS.giftBoxWiggle),
    giftBoxRibbonPeel: () => vibrateSafe(HAPTIC_PATTERNS.giftBoxRibbonPeel),
    giftBoxLidPop: () => vibrateSafe(HAPTIC_PATTERNS.giftBoxLidPop),
    giftBoxReveal: () => vibrateSafe(HAPTIC_PATTERNS.giftBoxReveal),

    // Remaining Micro-Interactions
    casePaperclip: () => vibrateSafe(HAPTIC_PATTERNS.casePaperclip),
    caseStamp: () => vibrateSafe(HAPTIC_PATTERNS.caseStamp),
    scratchReveal: () => vibrateSafe(HAPTIC_PATTERNS.scratchReveal),
    cakeBlowout: () => vibrateCelebration(),
    confettiCannon: () => vibrateCelebration(),
    dodgeTap: () => vibrateSafe(HAPTIC_PATTERNS.dodgeTap),
    summaryCopyTap: () => vibrateSafe(HAPTIC_PATTERNS.summaryCopyTap),
    cardFlip: () => vibrateSafe(HAPTIC_PATTERNS.cardFlip),
    lighterSpark: () => vibrateSafe(HAPTIC_PATTERNS.lighterSpark),
    heroPopConfetti: () => vibrateSafe(HAPTIC_PATTERNS.heroPopConfetti),
    heroOpenGift: () => vibrateSafe(HAPTIC_PATTERNS.heroOpenGift),
    emojiBounce: () => vibrateSafe(HAPTIC_PATTERNS.emojiBounce),
    modeSwitch: () => vibrateSafe(HAPTIC_PATTERNS.modeSwitch),
    noteCardFlick: () => vibrateSafe(HAPTIC_PATTERNS.noteCardFlick),
    rankSlide: () => vibrateSafe(HAPTIC_PATTERNS.rankSlide),
    sparkleToggle: () => vibrateSafe(HAPTIC_PATTERNS.sparkleToggle),
    timelineNodeClimax: () => vibrateSafe(HAPTIC_PATTERNS.timelineNodeClimax),
    timelineReceiptJump: () => vibrateSafe(HAPTIC_PATTERNS.timelineReceiptJump),
    footerChibiReplay: () => vibrateSafe(HAPTIC_PATTERNS.footerChibiReplay),
    coopKissTick: () => vibrateSafe(HAPTIC_PATTERNS.coopKissTick),
    coopHatchCelebrate: () => vibrateSafe(HAPTIC_PATTERNS.coopHatchCelebrate),
    bluffMiddleFinger: () => vibrateSafe(HAPTIC_PATTERNS.bluffMiddleFinger),
    tapliHit: (stageId: number) =>
      vibrateTapliDebounced(
        stageId >= 3 ? HAPTIC_PATTERNS.tapliPunchy : HAPTIC_PATTERNS.tapliLight,
      ),
    tapliMilestone: () => vibrateSafe(HAPTIC_PATTERNS.tapliMilestone),
  };
}

export const haptics = createHapticsEngine();

/**
 * Direct synchronous helper returning the exact `navigator.vibrate` acceptance boolean.
 */
export const triggerHaptic = (presetOrPattern: HapticPresetName | HapticPattern): boolean =>
  haptics.trigger(presetOrPattern);

export const stopHaptics = (): boolean => haptics.stopHaptics();

// Automatically stop any ongoing vibration when the tab hides or phone locks
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopHaptics();
    }
  });
}
