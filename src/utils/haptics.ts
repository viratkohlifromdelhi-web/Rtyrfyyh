/**
 * Crash-proof Mobile Haptic Feedback Engine (`navigator.vibrate`).
 *
 * - Direct feature check (`typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'`)
 *   wrapped in `try/catch` — zero user-agent sniffing and zero `prefers-reduced-motion` blocking.
 * - Defaults to enabled (`true`) on load; silently no-ops with zero errors on iOS Safari / desktop / SSR.
 * - Standardized tactile patterns (`tap`/`light`, `tick`, `medium`, `success`/`celebrate`, `error`/`bump`)
 *   while preserving every named interactive export across the site.
 * - Clean monotonic-safe `35ms` tick throttle so rapid Spin Wheel `requestAnimationFrame` peg crossings
 *   stay crisp and never jam Android's vibration motor or get stuck.
 * - Automatically cancels active vibrations on `visibilitychange` when the tab hides or phone locks.
 */

export const WHEEL_TICK_THROTTLE_MS = 35;
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
  // Standardized base tactile patterns
  tap: 12,
  light: 12,
  tick: 8,
  medium: 18,
  success: [18, 45, 28] as const,
  celebrate: [18, 45, 28] as const,
  error: [25, 35, 25] as const,
  bump: [25, 35, 25] as const,

  // Feature-specific named patterns mapped onto standardized strengths
  scannerVerdict: [18, 45, 28] as const,
  wheelPegTick: 8,
  wheelSpinStart: 18,
  wheelLand: [18, 45, 28] as const,
  vaultKeypadTap: 12,
  vaultWrongCode: [25, 35, 25] as const,
  vaultUnlock: [18, 45, 28] as const,
  vaultStopRing: 18,
  vaultDustSnap: [35, 25, 20, 22, 12] as const,
  vaultRewardReveal: [18, 45, 28] as const,
  giftBoxWiggle: 18,
  giftBoxRibbonPeel: 18,
  giftBoxLidPop: 18,
  giftBoxReveal: [18, 45, 28] as const,
  casePaperclip: 12,
  caseStamp: 18,
  scratchReveal: [18, 45, 28] as const,
  celebrationBurst: [18, 45, 28] as const,
  dodgeTap: 12,
  summaryCopyTap: 12,
  cardFlip: 12,
  lighterSpark: 18,
  heroPopConfetti: 12,
  heroOpenGift: 12,
  emojiBounce: 12,
  modeSwitch: 12,
  noteCardFlick: 12,
  rankSlide: 12,
  sparkleToggle: 12,
  timelineNodeClimax: 18,
  timelineReceiptJump: 12,
  footerChibiReplay: 12,
  coopKissTick: 8,
  coopHatchCelebrate: [18, 45, 28] as const,
  bluffMiddleFinger: [20, 40, 28] as const,
} as const;

/**
 * Escalating Bauni-Meter pulse schedule:
 * - 0% – 35%: 12ms pulse every 240ms
 * - 35% – 70%: 18ms pulse every 140ms
 * - 70% – 99%: 24ms pulse every 80ms
 */
export function getScannerHapticStep(progressPct: number): ScannerHapticStep {
  if (progressPct < 35) {
    return { durationMs: 12, intervalMs: 240 };
  }
  if (progressPct < 70) {
    return { durationMs: 18, intervalMs: 140 };
  }
  return { durationMs: 24, intervalMs: 80 };
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
    // Guard against non-monotonic clocks so throttles can never get stuck
    if (current < lastTickTime) {
      lastTickTime = -Infinity;
    }
    if (current - lastTickTime < minIntervalMs) {
      return false;
    }
    lastTickTime = current;
    return vibrateSafe(durationMs);
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
    lastCelebrationTime = -Infinity;
  };

  return {
    isSupported,
    isEnabled,
    setEnabled,
    resetThrottles,
    vibrateSafe,
    vibrateThrottled,
    stopHaptics,

    // Standardized base patterns
    tap: () => vibrateSafe(HAPTIC_PATTERNS.tap),
    light: () => vibrateSafe(HAPTIC_PATTERNS.light),
    tick: () => vibrateThrottled(HAPTIC_PATTERNS.tick, WHEEL_TICK_THROTTLE_MS),
    medium: () => vibrateSafe(HAPTIC_PATTERNS.medium),
    success: () => vibrateCelebration(),
    celebrate: () => vibrateCelebration(),
    error: () => vibrateSafe(HAPTIC_PATTERNS.error),
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
  };
}

export const haptics = createHapticsEngine();

export const stopHaptics = (): boolean => haptics.stopHaptics();

// Automatically stop any ongoing vibration when the tab hides or phone locks
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopHaptics();
    }
  });
}
