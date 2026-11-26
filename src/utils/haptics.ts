/**
 * Crash-proof Mobile Haptic Feedback Engine (`navigator.vibrate`).
 *
 * - Safely no-ops on unsupported browsers (iOS Safari, desktop, SSR) with zero warnings or errors.
 * - Includes a >= 22ms throttling guard for high-frequency ticks (wheel pegs) so Android
 *   vibration motors never lag or queue delayed vibrations.
 * - Automatically cancels active vibrations on `visibilitychange` when the tab hides or phone locks.
 */

export const WHEEL_TICK_THROTTLE_MS = 22;
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
  scannerVerdict: [30, 45, 50] as const,
  wheelPegTick: 10,
  wheelLand: [22, 40, 42] as const,
  vaultKeypadTap: 10,
  vaultWrongCode: [28, 35, 28] as const,
  vaultUnlock: [15, 30, 25] as const,
  vaultStopRing: 16,
  vaultDustSnap: [35, 25, 20, 22, 12] as const,
  vaultRewardReveal: [20, 35, 38] as const,
  giftBoxWiggle: [12, 85, 14] as const,
  giftBoxRibbonPeel: 15,
  giftBoxLidPop: 28,
  giftBoxReveal: [18, 35, 30] as const,
  casePaperclip: 12,
  caseStamp: 24,
  scratchReveal: [16, 30, 24] as const,
  celebrationBurst: [20, 30, 35] as const,
  dodgeTap: 10,
  summaryCopyTap: 15,
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
}) {
  const getNav = options?.getNav ?? getDefaultNavigator;
  const now = options?.now ?? getDefaultNow;

  let lastTickTime = -Infinity;
  let lastCelebrationTime = -Infinity;

  const vibrateSafe = (pattern: HapticPattern): boolean => {
    const nav = getNav();
    if (!nav || typeof nav.vibrate !== 'function') {
      return false;
    }
    try {
      const arg = typeof pattern === 'number' ? pattern : [...pattern];
      return Boolean(nav.vibrate(arg));
    } catch {
      return false;
    }
  };

  const stopHaptics = (): boolean => {
    return vibrateSafe(0);
  };

  const vibrateThrottled = (
    durationMs: number,
    minIntervalMs = WHEEL_TICK_THROTTLE_MS,
  ): boolean => {
    const current = now();
    if (current - lastTickTime < minIntervalMs) {
      return false;
    }
    lastTickTime = current;
    return vibrateSafe(durationMs);
  };

  const vibrateCelebration = (): boolean => {
    const current = now();
    if (current - lastCelebrationTime < CELEBRATION_DEDUP_MS) {
      return false;
    }
    lastCelebrationTime = current;
    return vibrateSafe(HAPTIC_PATTERNS.celebrationBurst);
  };

  return {
    vibrateSafe,
    vibrateThrottled,
    stopHaptics,

    // Bauni-Meter Hold Scanner
    scannerPulse: (progressPct: number) =>
      vibrateSafe(getScannerHapticStep(progressPct).durationMs),
    scannerVerdict: () => vibrateSafe(HAPTIC_PATTERNS.scannerVerdict),

    // Spin the Wheel
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
