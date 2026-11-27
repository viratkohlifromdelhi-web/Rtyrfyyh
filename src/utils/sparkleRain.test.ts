import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeTwinkleOpacity,
  createSparklePool,
  getCappedDpr,
  getSparkleParticleCount,
  SPARKLE_COLORS,
  SPARKLE_MAX_OPACITY,
  SPARKLE_MAX_VY,
  SPARKLE_MIN_OPACITY,
  SPARKLE_MIN_VY,
  stepFadeOpacity,
  stepSparkleParticle,
} from './sparkleRain';

function makeSeededRand(seed = 42): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('getSparkleParticleCount returns 14 on mobile and 20 on desktop, and getCappedDpr caps at 2', () => {
  assert.equal(getSparkleParticleCount(390), 14);
  assert.equal(getSparkleParticleCount(767), 14);
  assert.equal(getSparkleParticleCount(768), 20);
  assert.equal(getSparkleParticleCount(1440), 20);

  assert.equal(getCappedDpr(1), 1);
  assert.equal(getCappedDpr(2), 2);
  assert.equal(getCappedDpr(3), 2);
  assert.equal(getCappedDpr(undefined), 1);
});

test('createSparklePool distributes whisper-soft micro-particles within 12-24 px/s and 0.16-0.38 opacity', () => {
  const rand = makeSeededRand(7);
  const pool = createSparklePool(390, 844, rand);
  assert.equal(pool.length, 14);

  const validColors = new Set<string>(SPARKLE_COLORS);
  let diamonds = 0;
  let motes = 0;

  for (const p of pool) {
    assert.ok(validColors.has(p.rgb), `Unexpected rgb ${p.rgb}`);
    assert.ok(p.y >= 0 && p.y <= 844);
    assert.ok(p.vy >= SPARKLE_MIN_VY && p.vy <= SPARKLE_MAX_VY);
    assert.ok(p.opacity >= SPARKLE_MIN_OPACITY && p.opacity <= SPARKLE_MAX_OPACITY);
    if (p.kind === 'diamond') {
      assert.ok(p.size >= 4 && p.size <= 6.5);
      diamonds++;
    } else {
      assert.ok(p.size >= 1.5 && p.size <= 2.5);
      motes++;
    }
  }

  assert.ok(diamonds > 0 && motes > 0);
});

test('stepSparkleParticle drifts gently downward with sway, twinkles in [0.16, 0.38], and respawns at y=-12', () => {
  const rand = makeSeededRand(99);
  const pool = createSparklePool(400, 800, rand);
  const p = pool[0];
  p.y = 100;
  const startY = p.y;

  stepSparkleParticle(p, 0.016, 1.2, 400, 800, rand);
  assert.ok(p.y > startY);
  assert.ok(p.opacity >= SPARKLE_MIN_OPACITY && p.opacity <= SPARKLE_MAX_OPACITY);

  p.y = 820;
  stepSparkleParticle(p, 0.016, 2.5, 400, 800, rand);
  assert.equal(p.y, -12);

  for (let t = 0; t < 20; t += 0.37) {
    const alpha = computeTwinkleOpacity(t, 1.8, 0.5);
    assert.ok(alpha >= SPARKLE_MIN_OPACITY - 1e-9 && alpha <= SPARKLE_MAX_OPACITY + 1e-9);
  }
});

test('stepFadeOpacity smoothly fades out to 0 over 350ms wall-clock time and fades in to 1 cleanly', () => {
  let alpha = 1;
  for (let i = 0; i < 7; i++) {
    alpha = stepFadeOpacity(alpha, 0, 0.05);
  }
  assert.ok(alpha <= 1e-6, `Expected fade-out complete at 350ms, got ${alpha}`);

  let alphaIn = 0;
  for (let i = 0; i < 6; i++) {
    alphaIn = stepFadeOpacity(alphaIn, 1, 0.05);
  }
  assert.equal(alphaIn, 1);
});
