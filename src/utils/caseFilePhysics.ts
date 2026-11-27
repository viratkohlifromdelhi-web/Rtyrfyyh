/**
 * Pure 60fps spring-solver physics, timeline interpolation, and live day counter
 * for the "Case File #0721" keepsake evidence folder.
 */

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
export const RECEIPT_IMG_SRC = `${BASE_URL}${encodeURIComponent('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png')}`;
export const FIRST_TEXT_DATE = '2026-07-21T00:29:00+05:30';

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringState {
  value: number;
  velocity: number;
}

export const CARD_SPRING_CONFIG: SpringConfig = {
  stiffness: 175,
  damping: 16,
  mass: 1.0,
};

export const MAX_PHYSICS_DT_SEC = 0.05;

// Open timeline milestones (seconds)
export const PRESS_DOWN_END_SEC = 0.065;
export const CLIP_UNCLIP_END_SEC = 0.28;
export const FLAP_HINGE_START_SEC = 0.06;
export const FLAP_HINGE_PEAK_SEC = 0.24;
export const FLAP_HINGE_END_SEC = 0.42;
export const CARD_PULL_START_SEC = 0.16;
export const CARD_Z_SWAP_SEC = 0.48;
export const CARD_SETTLE_TARGET_SEC = 0.92;
export const STAMP_IMPACT_SEC = 0.84;
export const STAMP_DURATION_SEC = 0.17;
export const RECOIL_DURATION_SEC = 0.09;
export const OPEN_COMPLETE_SEC = 1.18;

// Close (Tuck Back) timeline milestones (seconds)
export const CLOSE_LIFT_END_SEC = 0.3;
export const CLOSE_TUCK_END_SEC = 0.66;
export const CLOSE_CLIP_END_SEC = 0.86;

export const CARD_IDLE_Y_PX = 0; // Positioned via layout so ~18% peeks above the pocket notch
export const CARD_IDLE_SCALE = 0.96;
export const CARD_IDLE_ROT_DEG = -2.5;

export const CARD_PEAK_SCALE = 1.03;
export const CARD_PEAK_ROT_DEG = 1.8;

export const CARD_OPEN_Y_PX = -10;
export const CARD_OPEN_SCALE = 1.0;
export const CARD_OPEN_ROT_DEG = 0.8;

export const FOLDER_IDLE_TILT_DEG = -1.2;

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function clampPhysicsDt(rawDtSec: number): number {
  if (!Number.isFinite(rawDtSec) || rawDtSec <= 0) return 0;
  return Math.min(rawDtSec, MAX_PHYSICS_DT_SEC);
}

export function easeOutCubic(t: number): number {
  const u = clamp01(t);
  return 1 - Math.pow(1 - u, 3);
}

export function easeInOutCubic(t: number): number {
  const u = clamp01(t);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

export function easeOutQuart(t: number): number {
  const u = clamp01(t);
  return 1 - Math.pow(1 - u, 4);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Steps a damped harmonic oscillator forward by `dtSec` (clamped <= 0.05s)
 * using semi-implicit Euler integration for crisp, unconditional 60fps stability.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  rawDtSec: number,
  config: SpringConfig = CARD_SPRING_CONFIG,
): SpringState {
  const dt = clampPhysicsDt(rawDtSec);
  if (dt === 0) return state;

  const displacement = state.value - target;
  const springForce = -config.stiffness * displacement;
  const dampingForce = -config.damping * state.velocity;
  const acceleration = (springForce + dampingForce) / config.mass;

  const nextVelocity = state.velocity + acceleration * dt;
  const nextValue = state.value + nextVelocity * dt;

  return {
    value: nextValue,
    velocity: nextVelocity,
  };
}

export function isSpringSettled(
  state: SpringState,
  target: number,
  posThreshold = 0.08,
  velThreshold = 0.12,
): boolean {
  return (
    Math.abs(state.value - target) <= posThreshold &&
    Math.abs(state.velocity) <= velThreshold
  );
}

/**
 * Computes the folder press-down tactile scale response (`0.985` for 65ms -> `1.0`).
 */
export function computeFolderPressScale(elapsedSec: number): number {
  if (elapsedSec <= 0) return 1;
  if (elapsedSec <= PRESS_DOWN_END_SEC) {
    const p = clamp01(elapsedSec / PRESS_DOWN_END_SEC);
    return lerp(1, 0.985, easeOutCubic(p));
  }
  const reboundP = clamp01((elapsedSec - PRESS_DOWN_END_SEC) / 0.14);
  return lerp(0.985, 1, easeOutCubic(reboundP));
}

/**
 * Computes the rose-gold paperclip unclip transform during Stage 1 (`0.0s - 0.28s`).
 */
export function computePaperclipOpenFrame(elapsedSec: number): {
  txPx: number;
  tyPx: number;
  rotDeg: number;
  opacity: number;
} {
  const p = easeOutCubic(clamp01(elapsedSec / CLIP_UNCLIP_END_SEC));
  return {
    txPx: lerp(0, 16, p),
    tyPx: lerp(0, -24, p),
    rotDeg: lerp(0, 28, p),
    opacity: clamp01(1 - p),
  };
}

/**
 * Computes the front pocket flap 3D hinge (`rotateX`) and focus opacity across Stages 1 & 2.
 */
export function computeFrontFlapOpenFrame(elapsedSec: number): {
  rotateXDeg: number;
  opacity: number;
} {
  if (elapsedSec <= FLAP_HINGE_START_SEC) {
    return { rotateXDeg: 0, opacity: 1 };
  }
  if (elapsedSec <= FLAP_HINGE_PEAK_SEC) {
    const p = easeOutCubic(
      (elapsedSec - FLAP_HINGE_START_SEC) / (FLAP_HINGE_PEAK_SEC - FLAP_HINGE_START_SEC),
    );
    return { rotateXDeg: lerp(0, -24, p), opacity: 1 };
  }
  if (elapsedSec <= FLAP_HINGE_END_SEC) {
    const p = easeInOutCubic(
      (elapsedSec - FLAP_HINGE_PEAK_SEC) / (FLAP_HINGE_END_SEC - FLAP_HINGE_PEAK_SEC),
    );
    return { rotateXDeg: lerp(-24, -14, p), opacity: 1 };
  }
  if (elapsedSec <= CARD_Z_SWAP_SEC) {
    return { rotateXDeg: -14, opacity: 1 };
  }
  const relaxP = easeOutCubic(
    clamp01((elapsedSec - CARD_Z_SWAP_SEC) / (CARD_SETTLE_TARGET_SEC - CARD_Z_SWAP_SEC)),
  );
  return {
    rotateXDeg: lerp(-14, -6, relaxP),
    opacity: lerp(1, 0.82, relaxP),
  };
}

/**
 * Computes the ink stamp (`VERIFIED • 21 JULY`) impact frame (`0.84s - 1.01s`)
 * and subtle `+2.5px` card micro-recoil (`90ms`).
 */
export function computeStampImpactFrame(elapsedSec: number): {
  visible: boolean;
  scale: number;
  opacity: number;
  rotateDeg: number;
  cardRecoilYPx: number;
} {
  if (elapsedSec < STAMP_IMPACT_SEC) {
    return {
      visible: false,
      scale: 2.1,
      opacity: 0,
      rotateDeg: -11,
      cardRecoilYPx: 0,
    };
  }

  const dtStamp = elapsedSec - STAMP_IMPACT_SEC;
  const pStamp = easeOutQuart(clamp01(dtStamp / STAMP_DURATION_SEC));

  // Micro-recoil hits right as the stamp makes contact (~75% through stamp travel) and springs back over 90ms
  const impactContactSec = STAMP_IMPACT_SEC + STAMP_DURATION_SEC * 0.72;
  let recoilY = 0;
  if (elapsedSec >= impactContactSec && elapsedSec <= impactContactSec + RECOIL_DURATION_SEC) {
    const r = (elapsedSec - impactContactSec) / RECOIL_DURATION_SEC;
    recoilY = Math.sin(r * Math.PI) * 2.5;
  }

  return {
    visible: true,
    scale: lerp(2.1, 1.0, pStamp),
    opacity: lerp(0, 0.92, pStamp),
    rotateDeg: -11,
    cardRecoilYPx: recoilY,
  };
}

/**
 * Computes the live whole-day count since `FIRST_TEXT_DATE` ('2026-07-21T00:29:00+05:30').
 * Supports exact ISO timestamps with timezone offset as well as YYYY-MM-DD dates.
 */
export function computeDaysSinceFirstText(
  firstTextDateIso: string = FIRST_TEXT_DATE,
  now: Date = new Date(),
): number {
  if (firstTextDateIso.includes('T')) {
    const parsedStartMs = Date.parse(firstTextDateIso);
    if (!Number.isFinite(parsedStartMs)) {
      return 0;
    }
    const diffDays = Math.floor((now.getTime() - parsedStartMs) / 86_400_000);
    return Math.max(0, diffDays);
  }

  const parts = firstTextDateIso.split('-').map((n) => Number.parseInt(n, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  const [year, month, day] = parts;
  const startUtcMs = Date.UTC(year, month - 1, day);
  const todayUtcMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((todayUtcMs - startUtcMs) / 86_400_000);
  return Math.max(0, diffDays);
}

export function formatDaysSinceLabel(days: number): string {
  const safeDays = Math.max(0, Math.floor(days));
  return `⏳ ${safeDays.toLocaleString('en-US')} ${safeDays === 1 ? 'day' : 'days'} since my 12:29 AM first text`;
}
