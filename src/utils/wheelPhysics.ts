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

export const SPIN_TOTAL_DURATION_MS = 5500;
export const SPIN_DECEL_DURATION_MS = 5150;
export const SPIN_RECOIL_DURATION_MS = SPIN_TOTAL_DURATION_MS - SPIN_DECEL_DURATION_MS; // 350ms

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
  fullSpins: number;
  nearMissFraction: number;
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
 * Computes a deterministic clockwise spin plan (6 to 8 full 360° rotations)
 * landing strictly inside a rigged troll slice with a dramatic near-miss offset
 * (25%–35% past its leading border peg so it agonizingly creeps off the adjacent bait prize).
 */
export function computeRiggedSpinPlan(
  startAngleDeg: number,
  lastTrollIndex: number | null,
  rng: () => number = Math.random,
): RiggedSpinPlan {
  const targetIndex = pickRiggedTrollIndex(lastTrollIndex, rng);
  const fullSpins = 6 + Math.floor(Math.min(0.999999, Math.max(0, rng())) * 3); // 6, 7, or 8
  const nearMissFraction = 0.25 + Math.min(1, Math.max(0, rng())) * 0.1; // 0.25 to 0.35

  // During clockwise rotation, local top angle decreases across the leading border peg
  // at `(targetIndex + 1) * 36°` into slice `targetIndex`.
  const leadingEdgeLocalDeg = (targetIndex + 1) * SLICE_ANGLE_DEG;
  const targetLocalTopDeg = leadingEdgeLocalDeg - nearMissFraction * SLICE_ANGLE_DEG;
  const desiredMod360 = normalizeDeg(360 - targetLocalTopDeg);

  const currentMod360 = normalizeDeg(startAngleDeg);
  const extraDelta = normalizeDeg(desiredMod360 - currentMod360);
  const targetAngleDeg = startAngleDeg + fullSpins * 360 + extraDelta;

  return {
    startAngleDeg,
    targetAngleDeg,
    targetIndex,
    fullSpins,
    nearMissFraction,
  };
}

/**
 * Evaluates wheel rotation angle at `elapsedMs` across the 5.5s multi-phase physics curve:
 * - Phase 1 (0..5150ms): energetic launch + high-friction ease-out (`1 - (1 - u)^4.2`)
 * - Phase 2 (5150..5500ms): subtle damped micro-recoil settle (±1.2° damped sine wave)
 */
export function evaluateWheelAngle(plan: RiggedSpinPlan, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return plan.startAngleDeg;
  }
  if (elapsedMs >= SPIN_TOTAL_DURATION_MS) {
    return plan.targetAngleDeg;
  }

  const totalDelta = plan.targetAngleDeg - plan.startAngleDeg;

  if (elapsedMs <= SPIN_DECEL_DURATION_MS) {
    const u = elapsedMs / SPIN_DECEL_DURATION_MS;
    const eased = 1 - Math.pow(1 - u, 4.2);
    return plan.startAngleDeg + totalDelta * eased;
  }

  const r = (elapsedMs - SPIN_DECEL_DURATION_MS) / SPIN_RECOIL_DURATION_MS; // (0, 1]
  // Peaks around +1.15° and gently rocks back to 0° with exact C0 boundary continuity
  const recoilDeg = 2.15 * Math.sin(r * Math.PI * 2.5) * Math.exp(-2.8 * r) * (1 - r);
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
 * Applies a backward angular impulse (counter-clockwise, up to -38°) to the top flapper
 * whenever a wheel peg strikes it.
 */
export function applyFlapperImpulse(
  state: FlapperSpringState,
  wheelSpeedDegPerSec: number,
): FlapperSpringState {
  const speedNorm = Math.min(1, Math.max(0, Math.abs(wheelSpeedDegPerSec) / 900));
  const kickAngle = -(13 + speedNorm * 25); // -13° at crawl up to -38° at fast spin
  const nextAngle = Math.max(-38, Math.min(state.angleDeg, kickAngle));
  const kickVel = -(180 + speedNorm * 420);
  return {
    angleDeg: nextAngle,
    velocityDegPerSec: Math.min(state.velocityDegPerSec, kickVel),
  };
}

/**
 * Steps the top flapper's damped spring back toward 0° on every animation frame.
 */
export function stepFlapperSpring(
  state: FlapperSpringState,
  dtSec: number,
  stiffness = 420,
  damping = 24,
): FlapperSpringState {
  const dt = Math.min(0.033, Math.max(0, dtSec));
  if (dt === 0) return state;

  const accel = -stiffness * state.angleDeg - damping * state.velocityDegPerSec;
  const nextVel = state.velocityDegPerSec + accel * dt;
  const nextAngle = Math.max(-38, Math.min(10, state.angleDeg + nextVel * dt));

  if (Math.abs(nextAngle) < 0.08 && Math.abs(nextVel) < 0.4) {
    return { angleDeg: 0, velocityDegPerSec: 0 };
  }

  return {
    angleDeg: nextAngle,
    velocityDegPerSec: nextVel,
  };
}
