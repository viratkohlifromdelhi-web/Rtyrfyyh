/**
 * Pure 60fps physics & particle-pool math for the global Sparkle Rain canvas overlay.
 * Whisper-soft pastel glints drifting gently behind cards, photos, and text.
 */

export const SPARKLE_COLORS = [
  '224, 186, 114', // Pale Champagne Gold
  '232, 146, 180', // Soft Petal Blush
  '182, 160, 224', // Muted Warm Lilac
] as const;

export const SPARKLE_FADE_OUT_SEC = 0.35; // 350ms smooth fade out on toggle OFF
export const SPARKLE_FADE_IN_SEC = 0.25;
export const SPARKLE_MAX_DT_SEC = 0.05;
export const SPARKLE_MIN_OPACITY = 0.16;
export const SPARKLE_MAX_OPACITY = 0.38;
export const SPARKLE_MIN_VY = 12;
export const SPARKLE_MAX_VY = 24;

export type SparkleKind = 'diamond' | 'mote';

export interface SparkleParticle {
  kind: SparkleKind;
  rgb: string;
  baseX: number;
  x: number;
  y: number;
  vy: number;
  size: number;
  drift: number;
  swaySpeed: number;
  phase: number;
  twinkleSpeed: number;
  twinklePhase: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
}

/**
 * Returns a calm, airy particle count (14 on mobile, 20 max on desktop).
 */
export function getSparkleParticleCount(viewportWidth: number): number {
  return viewportWidth < 768 ? 14 : 20;
}

/**
 * Caps devicePixelRatio at 1.5 on mobile viewports (< 768px) and 2 on desktop
 * for crisp high-DPI rendering without mobile GPU memory bloat.
 */
export function getCappedDpr(
  devicePixelRatio: number | undefined,
  viewportWidth = 1024,
): number {
  const raw =
    typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio)
      ? devicePixelRatio
      : 1;
  const maxDpr = viewportWidth < 768 ? 1.5 : 2;
  return Math.min(Math.max(raw, 1), maxDpr);
}

/**
 * Computes whisper-soft twinkle opacity strictly bounded within [0.16, 0.38].
 */
export function computeTwinkleOpacity(
  elapsedSec: number,
  twinkleSpeed: number,
  twinklePhase: number,
): number {
  const wave = 0.5 + 0.5 * Math.sin(elapsedSec * twinkleSpeed + twinklePhase);
  return SPARKLE_MIN_OPACITY + wave * (SPARKLE_MAX_OPACITY - SPARKLE_MIN_OPACITY);
}

/**
 * Creates a single delicate sparkle particle distributed across the viewport (`initial = true`)
 * or respawned cleanly above the top edge (`y = -12`).
 */
export function createSparkleParticle(
  width: number,
  height: number,
  initial: boolean,
  rand: () => number = Math.random,
): SparkleParticle {
  const safeW = Math.max(width, 320);
  const safeH = Math.max(height, 480);
  const isDiamond = rand() < 0.55;
  const colorIndex = Math.min(
    SPARKLE_COLORS.length - 1,
    Math.floor(rand() * SPARKLE_COLORS.length),
  );
  const baseX = rand() * safeW;
  const y = initial ? rand() * safeH : -12 - rand() * 8;
  const vy = SPARKLE_MIN_VY + rand() * (SPARKLE_MAX_VY - SPARKLE_MIN_VY);
  // Delicate micro-sizing: 4px–6.5px thin 4-point glints, 1.5px–2.5px pinprick stardust dots
  const size = isDiamond ? 4 + rand() * 2.5 : 1.5 + rand() * 1.0;
  const drift = 6 + rand() * 8;
  const swaySpeed = 0.5 + rand() * 0.65;
  const phase = rand() * Math.PI * 2;
  const twinkleSpeed = 1.1 + rand() * 1.5;
  const twinklePhase = rand() * Math.PI * 2;
  const rotation = rand() * Math.PI * 2;
  const rotSpeed = (rand() < 0.5 ? -1 : 1) * (0.2 + rand() * 0.35);

  return {
    kind: isDiamond ? 'diamond' : 'mote',
    rgb: SPARKLE_COLORS[colorIndex],
    baseX,
    x: baseX,
    y,
    vy,
    size,
    drift,
    swaySpeed,
    phase,
    twinkleSpeed,
    twinklePhase,
    opacity: computeTwinkleOpacity(0, twinkleSpeed, twinklePhase),
    rotation,
    rotSpeed,
  };
}

/**
 * Initializes the particle pool naturally distributed across the viewport.
 */
export function createSparklePool(
  width: number,
  height: number,
  rand: () => number = Math.random,
): SparkleParticle[] {
  const count = getSparkleParticleCount(width);
  const pool: SparkleParticle[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(createSparkleParticle(width, height, true, rand));
  }
  return pool;
}

/**
 * Advances a single sparkle particle by one frame (mutates in place for zero GC churn).
 */
export function stepSparkleParticle(
  p: SparkleParticle,
  rawDtSec: number,
  elapsedSec: number,
  width: number,
  height: number,
  rand: () => number = Math.random,
): void {
  const dt = Math.min(Math.max(rawDtSec, 0), SPARKLE_MAX_DT_SEC);
  p.y += p.vy * dt;
  p.x = p.baseX + Math.sin(elapsedSec * p.swaySpeed + p.phase) * p.drift;
  p.rotation += p.rotSpeed * dt;
  p.opacity = computeTwinkleOpacity(elapsedSec, p.twinkleSpeed, p.twinklePhase);

  if (p.y > height + 16) {
    const safeW = Math.max(width, 320);
    p.y = -12;
    p.baseX = rand() * safeW;
    p.x = p.baseX;
    p.phase = rand() * Math.PI * 2;
    p.vy = SPARKLE_MIN_VY + rand() * (SPARKLE_MAX_VY - SPARKLE_MIN_VY);
  }
}

/**
 * Smoothly steps the global canvas fade opacity (0..1) over 350ms wall-clock time on toggle OFF.
 */
export function stepFadeOpacity(
  currentAlpha: number,
  targetAlpha: number,
  rawDtSec: number,
): number {
  const dt = Math.max(rawDtSec, 0);
  if (targetAlpha > currentAlpha) {
    return Math.min(targetAlpha, currentAlpha + dt / SPARKLE_FADE_IN_SEC);
  }
  if (targetAlpha < currentAlpha) {
    return Math.max(targetAlpha, currentAlpha - dt / SPARKLE_FADE_OUT_SEC);
  }
  return currentAlpha;
}
