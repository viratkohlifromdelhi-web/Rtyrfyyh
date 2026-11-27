export interface WheelSlice {
  index: number;
  label: string;
  isTroll: boolean;
  fill: string;
  textColor: string;
  resultMessage?: string;
  resultEmojis?: string[];
}

export const SLICE_COUNT = 10;
export const SLICE_ANGLE_DEG = 360 / SLICE_COUNT; // 36°
export const TROLL_INDICES = [0, 2, 4, 6, 8] as const;

export const SPIN_DURATION_MIN_MS = 6400;
export const SPIN_DURATION_MAX_MS = 7200;
export const SPIN_RECOIL_DURATION_MS = 280;
export const SPIN_TOTAL_DURATION_MS = 6800;
export const SPIN_DECEL_DURATION_MS = SPIN_TOTAL_DURATION_MS - SPIN_RECOIL_DURATION_MS; // 6520ms

/** Fraction of deceleration phase at which the wheel crosses the final dividing peg (last ~0.85s breakthrough) */
export const SPIN_PLOT_TWIST_PEG_U = 0.87;
export const SPIN_BREAKTHROUGH_MIN_DEG = 7;
export const SPIN_BREAKTHROUGH_MAX_DEG = 13;

export const WHEEL_SLICES: WheelSlice[] = [
  {
    index: 0,
    label: 'Try Again 🙃',
    isTroll: true,
    fill: '#FFE4F0', // soft pastel pink
    textColor: '#3B1535',
    resultMessage: 'So close! Spin again, Morgan 👀',
    resultEmojis: ['🙃', '✨', '🎀', '👀'],
  },
  {
    index: 1,
    label: 'New iPhone 📱',
    isTroll: false,
    fill: '#EBE3FF', // lavender
    textColor: '#3B1535',
  },
  {
    index: 2,
    label: 'LOL 😂',
    isTroll: true,
    fill: '#FFE898', // butter yellow
    textColor: '#3B1535',
    resultMessage: "LOL. That's literally your prize.",
    resultEmojis: ['😂', '💀', '🤣', '✨'],
  },
  {
    index: 3,
    label: '₹10,000 Cash 💸',
    isTroll: false,
    fill: '#DDF6EC', // pastel mint
    textColor: '#234438',
  },
  {
    index: 4,
    label: 'Hehehehhehehe 😈',
    isTroll: true,
    fill: '#FFFDF8', // warm cream
    textColor: '#3B1535',
    resultMessage: "Did you really think you'd get an iPhone or cash?",
    resultEmojis: ['😈', '💸', '😂', '✨'],
  },
  {
    index: 5,
    label: 'Shopping Spree 🛍️',
    isTroll: false,
    fill: '#FCD2E5', // blush rose
    textColor: '#3B1535',
  },
  {
    index: 6,
    label: '🐍🐍🐍🐍',
    isTroll: true,
    fill: '#E5DCFF', // soft lavender
    textColor: '#3B1535',
    resultMessage: 'Caught a snake. Happy Birthday! 🐍',
    resultEmojis: ['🐍', '🐍', '🐍', '🎂'],
  },
  {
    index: 7,
    label: 'Dream Trip ✈️',
    isTroll: false,
    fill: '#FFF2BE', // soft butter
    textColor: '#3B1535',
  },
  {
    index: 8,
    label: 'Bauni 📏',
    isTroll: true,
    fill: '#DDF6EC', // pastel mint
    textColor: '#3B1535',
    resultMessage: "Even the wheel knows you're a bauni, bachhaww 😂",
    resultEmojis: ['📏', '😂', '🎀', '🤏'],
  },
  {
    index: 9,
    label: 'Luxury Perfume ✨',
    isTroll: false,
    fill: '#FFE4F0', // pastel pink
    textColor: '#3B1535',
  },
];

export interface RiggedSpinPlan {
  startAngleDeg: number;
  targetAngleDeg: number;
  targetIndex: number;
  decoyIndex: number;
  fullSpins: number;
  nearMissFraction: number;
  breakthroughDeg: number;
  totalDurationMs: number;
  decelDurationMs: number;
}

export interface FlapperSpringState {
  angleDeg: number;
  velocityDegPerSec: number;
}

/**
 * Normalizes any angle in degrees into [0, 360).
 */
export function normalizeDeg(deg: number): number {
  const mod = deg % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Given the wheel's clockwise CSS rotation (in degrees), returns the exact slice
 * index (0..9) sitting under the 12 o'clock top flapper.
 *
 * Wheel slice `i` spans local clockwise angles `[i * 36°, (i + 1) * 36°)` with `0°` at 12 o'clock.
 * Rotating the wheel clockwise by `rotationDeg` brings local angle `(-rotationDeg) mod 360`
 * under 12 o'clock.
 */
export function getSliceIndexAtTop(rotationDeg: number): number {
  const localTopDeg = normalizeDeg(-rotationDeg);
  return Math.floor(localTopDeg / SLICE_ANGLE_DEG) % SLICE_COUNT;
}

/**
 * Selects the next troll slice strictly from `[0, 2, 4, 6, 8]`,
 * guaranteeing it never repeats `lastTrollIndex` twice in a row.
 */
export function pickRiggedTrollIndex(
  lastTrollIndex: number | null,
  rng: () => number = Math.random,
): number {
  const candidates = TROLL_INDICES.filter((idx) => idx !== lastTrollIndex);
  const clamped = Math.min(0.999999, Math.max(0, rng()));
  const pickIdx = Math.floor(clamped * candidates.length);
  return candidates[pickIdx];
}

/**
 * Computes a deterministic clockwise spin plan (6 or 7 full 360° rotations, 6.4s to 7.2s total)
 * that visibly lingers across the adjacent bait decoy segment `k_decoy = (targetIndex + 1) % 10`,
 * nearly stalls against the dividing peg, and barely breaks past it by 7° to 13° into `targetIndex`.
 */
export function computeRiggedSpinPlan(
  startAngleDeg: number,
  lastTrollIndex: number | null,
  rng: () => number = Math.random,
): RiggedSpinPlan {
  const rSpin = Math.min(0.999999, Math.max(0, rng()));
  const rBreak = Math.min(1, Math.max(0, rng()));
  const rDur = Math.min(1, Math.max(0, rng()));

  const targetIndex = pickRiggedTrollIndex(lastTrollIndex, rng);
  const decoyIndex = (targetIndex + 1) % SLICE_COUNT;
  const fullSpins = 6 + Math.floor(rSpin * 2); // 6 or 7 full spins (2160° to 2520°)
  const breakthroughDeg =
    SPIN_BREAKTHROUGH_MIN_DEG + rBreak * (SPIN_BREAKTHROUGH_MAX_DEG - SPIN_BREAKTHROUGH_MIN_DEG); // 7° to 13°
  const nearMissFraction = breakthroughDeg / SLICE_ANGLE_DEG;

  const totalDurationMs = Math.round(
    SPIN_DURATION_MIN_MS + rDur * (SPIN_DURATION_MAX_MS - SPIN_DURATION_MIN_MS),
  );
  const decelDurationMs = totalDurationMs - SPIN_RECOIL_DURATION_MS;

  // During clockwise rotation, local top angle decreases across the leading border peg
  // at `(targetIndex + 1) * 36°` from decoy bait slice `(targetIndex + 1) % 10` into `targetIndex`.
  const leadingEdgeLocalDeg = (targetIndex + 1) * SLICE_ANGLE_DEG;
  const targetLocalTopDeg = leadingEdgeLocalDeg - breakthroughDeg;
  const desiredMod360 = normalizeDeg(360 - targetLocalTopDeg);

  const currentMod360 = normalizeDeg(startAngleDeg);
  const extraDelta = normalizeDeg(desiredMod360 - currentMod360);
  const targetAngleDeg = startAngleDeg + fullSpins * 360 + extraDelta;

  return {
    startAngleDeg,
    targetAngleDeg,
    targetIndex,
    decoyIndex,
    fullSpins,
    nearMissFraction,
    breakthroughDeg,
    totalDurationMs,
    decelDurationMs,
  };
}

/**
 * Evaluates wheel rotation angle at `elapsedMs` across the 6.4s-7.2s two-stage suspense curve:
 * - Stage 1 (0 .. u_peg = 0.87 of decel): energetic launch + high-order smooth drag leaving a full
 *   2.5s-3.0s crawl across the final ~2.5 segments, visibly lingering across decoy bait slice `k_decoy`
 *   with a realistic peg-resistance hesitation dip right before the dividing peg.
 * - Stage 2 (u_peg .. 1.0 of decel, final ~0.85s): remaining momentum barely clears the peg and rolls
 *   7° to 13° into `k_final` with exact C1 velocity continuity.
 * - Stage 3 (final 280ms): damped spring recoil settling (+1.6° -> -0.8° -> 0°) strictly inside `k_final`.
 */
export function evaluateWheelAngle(plan: RiggedSpinPlan, elapsedMs: number): number {
  const totalDuration = plan.totalDurationMs || SPIN_TOTAL_DURATION_MS;
  const decelDuration = plan.decelDurationMs || totalDuration - SPIN_RECOIL_DURATION_MS;
  const recoilDuration = Math.max(1, totalDuration - decelDuration);

  if (elapsedMs <= 0) {
    return plan.startAngleDeg;
  }
  if (elapsedMs >= totalDuration) {
    return plan.targetAngleDeg;
  }

  const totalDelta = plan.targetAngleDeg - plan.startAngleDeg;
  const breakthroughDeg = plan.breakthroughDeg || plan.nearMissFraction * SLICE_ANGLE_DEG;
  const pegDistance = Math.max(1, totalDelta - breakthroughDeg);
  const pegAngle = plan.startAngleDeg + pegDistance;

  if (elapsedMs <= decelDuration) {
    const u = elapsedMs / decelDuration;
    const uPeg = SPIN_PLOT_TWIST_PEG_U;
    const postPower = 2.2;

    if (u <= uPeg) {
      const s = u / uPeg; // [0, 1]
      // Match C1 angular velocity cleanly across the dividing peg at u = uPeg
      const slopeAtPeg = Math.min(
        0.18,
        (breakthroughDeg * postPower * uPeg) / (pegDistance * (1 - uPeg)),
      );
      // High-order smooth drag p_base(s) = 1 - (1 - s)^4.6 blended with peg-clearance slope
      const baseProgress = (1 - slopeAtPeg) * (1 - Math.pow(1 - s, 4.6)) + slopeAtPeg * s;

      // Subtle peg-resistance hesitation dip right as the pointer presses against the final peg
      // (zero at s=0 and s=1; strictly preserves forward motion d(angle)/ds > 0)
      const resistanceWindow = Math.exp(-Math.pow((s - 0.935) / 0.045, 2));
      const resistanceOffset = -0.00055 * resistanceWindow * (1 - s) * 16;
      const progress = Math.max(0, Math.min(1, baseProgress + resistanceOffset));

      return plan.startAngleDeg + pegDistance * progress;
    }

    // Final ~0.85s breakthrough: clears the dividing peg and rolls 7° to 13° into target slice
    const t = (u - uPeg) / (1 - uPeg); // (0, 1]
    const postEase = 1 - Math.pow(1 - t, postPower);
    return pegAngle + breakthroughDeg * postEase;
  }

  // Final 280ms: realistic damped spring recoil (+1.55° -> -0.75° -> 0°), strictly inside target slice
  const r = (elapsedMs - decelDuration) / recoilDuration; // (0, 1]
  const recoilDeg = 2.55 * Math.sin(r * Math.PI * 2.5) * Math.exp(-1.75 * r) * (1 - r);
  return plan.targetAngleDeg + recoilDeg;
}

/**
 * Returns the monotonic peg boundary counter for clockwise rotation.
 * Every integer increment signals a peg crossing under the 12 o'clock flapper.
 */
export function getPegCrossingIndex(rotationDeg: number): number {
  return Math.floor(rotationDeg / SLICE_ANGLE_DEG);
}

/**
 * Computes how far the wheel is from crossing the next dividing peg (0° = right on peg, 36° = just passed).
 */
export function getDegreesUntilNextPeg(rotationDeg: number): number {
  const withinSlice = normalizeDeg(rotationDeg) % SLICE_ANGLE_DEG;
  return SLICE_ANGLE_DEG - withinSlice;
}

/**
 * Applies a backward angular impulse to the top pointer flapper whenever a peg strikes it:
 * kicks sharply up to -24° at high speed and gently snaps back during slow crawl.
 */
export function applyFlapperImpulse(
  state: FlapperSpringState,
  wheelSpeedDegPerSec: number,
): FlapperSpringState {
  const absSpeed = Math.abs(wheelSpeedDegPerSec);
  const speedNorm = Math.min(1, Math.max(0, absSpeed / 780));
  const kickAngle = -(14 + speedNorm * 10); // -14° at slow click up to -24° at high speed
  const nextAngle = Math.max(-34, Math.min(state.angleDeg, kickAngle));
  const kickVel = -(140 + speedNorm * 320);
  return {
    angleDeg: nextAngle,
    velocityDegPerSec: Math.min(state.velocityDegPerSec, kickVel),
  };
}

/**
 * Computes physical peg-pressure bend when the wheel is crawling slowly (< 75°/s)
 * and a peg is pressing right against the top pointer flapper (bends slowly down to -34°
 * before snapping back to 0° once the peg clears).
 */
export function applyCrawlPegBend(
  state: FlapperSpringState,
  rotationDeg: number,
  wheelSpeedDegPerSec: number,
): FlapperSpringState {
  const absSpeed = Math.abs(wheelSpeedDegPerSec);
  if (absSpeed > 75 || absSpeed < 0.8) {
    return state;
  }

  const degToPeg = getDegreesUntilNextPeg(rotationDeg);
  // Peg engages the pointer tip within the final 8.5° before crossing
  if (degToPeg <= 8.5 && degToPeg > 0.15) {
    const contactRatio = 1 - degToPeg / 8.5; // 0 -> 1 as peg pushes past pointer
    const targetBend = -(8 + contactRatio * 26); // smoothly bends down to -34°
    if (targetBend < state.angleDeg) {
      return {
        angleDeg: Math.max(-34, targetBend),
        velocityDegPerSec: -20,
      };
    }
  }
  return state;
}

/**
 * Steps the top flapper's damped spring back toward 0° on every animation frame.
 */
export function stepFlapperSpring(
  state: FlapperSpringState,
  dtSec: number,
  stiffness = 460,
  damping = 22,
): FlapperSpringState {
  const dt = Math.min(0.033, Math.max(0, dtSec));
  if (dt === 0) return state;

  const accel = -stiffness * state.angleDeg - damping * state.velocityDegPerSec;
  const nextVel = state.velocityDegPerSec + accel * dt;
  const nextAngle = Math.max(-36, Math.min(10, state.angleDeg + nextVel * dt));

  if (Math.abs(nextAngle) < 0.08 && Math.abs(nextVel) < 0.4) {
    return { angleDeg: 0, velocityDegPerSec: 0 };
  }

  return {
    angleDeg: nextAngle,
    velocityDegPerSec: nextVel,
  };
}
