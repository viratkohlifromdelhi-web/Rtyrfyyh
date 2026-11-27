/**
 * Pure physics & Web Audio breath-strength processing engine for the
 * 3-Second Microphone (and Hold-Fallback) Birthday Cake Candle Blow-Out.
 */

export const BLOW_CALIBRATION_MS = 220;
export const BLOW_EMA_ALPHA = 0.22;
export const BLOW_STRENGTH_THRESHOLD = 0.16;
export const BLOW_TARGET_SECONDS = 2.9;
export const BLOW_DECAY_PER_SEC = 0.16;
export const BLOW_SIMULATED_HOLD_BASE = 0.85;
export const BLOW_NOISE_FLOOR_MULTIPLIER = 1.35;

export interface CakeBlowPhysicsState {
  noiseFloor: number;
  calibrationSamples: number;
  calibrationSum: number;
  strength: number;
  blowProgress: number;
  extinguished: boolean;
}

export interface FlamePhysicsVisual {
  tiltDeg: number;
  scaleY: number;
  scaleX: number;
  opacity: number;
  sparkOpacity: number;
}

export function createInitialCakeBlowState(): CakeBlowPhysicsState {
  return {
    noiseFloor: 0.04,
    calibrationSamples: 0,
    calibrationSum: 0,
    strength: 0,
    blowProgress: 0,
    extinguished: false,
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Extracts normalized breath-turbulence energy in [0, 1] from AnalyserNode PCM time-domain
 * samples and low-mid broadband frequency bins (bins 2..48).
 */
export function computeRawBreathEnergy(
  timeDomain: Uint8Array,
  freqBins: Uint8Array,
): number {
  let rmsSum = 0;
  const tdLen = timeDomain.length || 1;
  for (let i = 0; i < tdLen; i++) {
    const centered = (timeDomain[i] - 128) / 128;
    rmsSum += centered * centered;
  }
  const rms = Math.sqrt(rmsSum / tdLen);

  // Broadband low-mid breath turbulence spans bins 2..48 (approx ~170Hz to ~4.1kHz at 44.1kHz/512)
  const startBin = Math.min(2, freqBins.length);
  const endBin = Math.min(48, freqBins.length);
  let bandSum = 0;
  let bandCount = 0;
  for (let b = startBin; b < endBin; b++) {
    bandSum += freqBins[b] / 255;
    bandCount += 1;
  }
  const bandMean = bandCount > 0 ? bandSum / bandCount : 0;

  // Blend RMS amplitude with broadband airflow energy for crisp mic breath detection
  return clamp(rms * 1.9 + bandMean * 0.95, 0, 1);
}

/**
 * Generates natural simulated breath turbulence around ~0.85 while the user holds the
 * fallback "Hold 3 Seconds to Blow Out Candles" button.
 */
export function computeSimulatedHoldBreath(elapsedSec: number): number {
  const flutter =
    Math.sin(elapsedSec * 11.4) * 0.065 +
    Math.cos(elapsedSec * 19.2) * 0.045 +
    Math.sin(elapsedSec * 5.3) * 0.03;
  return clamp(BLOW_SIMULATED_HOLD_BASE + flutter, 0.68, 0.98);
}

/**
 * Advances the 3-second candle blow-out integrator by `dtSec`.
 * - Calibrates ambient noise floor during the first 220ms of mic listening.
 * - Subtracts `noiseFloor * 1.35`, applies EMA smoothing (alpha = 0.22).
 * - Integrates `blowProgress` toward 1.0 when `strength > 0.16`, gently decaying when paused.
 */
export function stepCakeBlowPhysics(
  state: CakeBlowPhysicsState,
  input: {
    rawEnergy: number;
    dtSec: number;
    elapsedMs: number;
    isHoldFallback: boolean;
    isHolding?: boolean;
  },
): CakeBlowPhysicsState {
  if (state.extinguished) {
    return state;
  }

  const dt = clamp(input.dtSec, 0.001, 0.05);
  let noiseFloor = state.noiseFloor;
  let calibrationSamples = state.calibrationSamples;
  let calibrationSum = state.calibrationSum;
  let targetStrength = 0;

  if (input.isHoldFallback) {
    targetStrength = input.isHolding
      ? computeSimulatedHoldBreath(input.elapsedMs / 1000)
      : 0;
  } else if (input.elapsedMs < BLOW_CALIBRATION_MS) {
    calibrationSamples += 1;
    calibrationSum += clamp(input.rawEnergy, 0, 1);
    noiseFloor = clamp(calibrationSum / calibrationSamples, 0.015, 0.35);
    targetStrength = 0;
  } else {
    const netEnergy = Math.max(
      0,
      clamp(input.rawEnergy, 0, 1) - noiseFloor * BLOW_NOISE_FLOOR_MULTIPLIER,
    );
    // Normalize remaining headroom cleanly into [0, 1]
    const denom = Math.max(0.18, 0.62 - noiseFloor * 0.5);
    targetStrength = clamp(netEnergy / denom, 0, 1);
  }

  // Exponential Moving Average smoothing (alpha = 0.22)
  const strength = clamp(
    state.strength * (1 - BLOW_EMA_ALPHA) + targetStrength * BLOW_EMA_ALPHA,
    0,
    1,
  );

  let blowProgress = state.blowProgress;
  if (strength > BLOW_STRENGTH_THRESHOLD) {
    blowProgress = Math.min(
      1,
      blowProgress + (Math.max(0.28, strength) * dt) / BLOW_TARGET_SECONDS,
    );
  } else if (blowProgress < 1) {
    blowProgress = Math.max(0, blowProgress - BLOW_DECAY_PER_SEC * dt);
  }

  const extinguished = blowProgress >= 1;

  return {
    noiseFloor,
    calibrationSamples,
    calibrationSum,
    strength: extinguished ? 0 : strength,
    blowProgress,
    extinguished,
  };
}

/**
 * Maps real-time blow strength `S(t)` and cumulative `blowProgress` onto GPU-composited
 * SVG flame tilt, squash/stretch scale, flicker opacity, and spark shimmer.
 */
export function computeFlamePhysicsVisual(
  strength: number,
  blowProgress: number,
  timeSec: number,
  candleIndex: number,
): FlamePhysicsVisual {
  const s = clamp(strength, 0, 1);
  const p = clamp(blowProgress, 0, 1);

  const turbulence =
    Math.sin(timeSec * (23 + candleIndex * 3.7) + candleIndex * 1.7) * 0.65 +
    Math.cos(timeSec * (37 + candleIndex * 2.9) + candleIndex * 0.9) * 0.35;

  const tiltDeg = s * 46 + turbulence * 10 * Math.max(0.12, s);
  const scaleY = clamp(1 - 0.55 * p - 0.25 * s, 0.22, 1.05);
  const scaleX = 1 + 0.18 * s;
  const opacity = clamp(1 - p * 0.32 + turbulence * 0.1 * s, 0.42, 1);
  const sparkOpacity = s > 0.55 ? clamp((s - 0.55) / 0.45, 0, 1) : 0;

  return {
    tiltDeg,
    scaleY,
    scaleX,
    opacity,
    sparkOpacity,
  };
}
