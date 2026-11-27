import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOW_CALIBRATION_MS,
  computeFlamePhysicsVisual,
  computeRawBreathEnergy,
  createInitialCakeBlowState,
  stepCakeBlowPhysics,
} from './cakeBlowPhysics.ts';

test('computeRawBreathEnergy distinguishes quiet ambient buffers from strong breath airflow', () => {
  const quietTd = new Uint8Array(512).fill(128);
  const quietFreq = new Uint8Array(256).fill(4);
  const quietEnergy = computeRawBreathEnergy(quietTd, quietFreq);

  const blowTd = new Uint8Array(512);
  for (let i = 0; i < blowTd.length; i++) {
    blowTd[i] = i % 2 === 0 ? 186 : 70;
  }
  const blowFreq = new Uint8Array(256).fill(140);
  const blowEnergy = computeRawBreathEnergy(blowTd, blowFreq);

  assert.ok(quietEnergy < 0.05, `expected quiet energy < 0.05, got ${quietEnergy}`);
  assert.ok(blowEnergy > 0.75, `expected strong blow energy > 0.75, got ${blowEnergy}`);
});

test('mic mode calibrates noise floor over 220ms, ignores ambient hum, and extinguishes cleanly under steady breath', () => {
  let state = createInitialCakeBlowState();
  const dt = 1 / 60;

  // 220ms ambient calibration at rawEnergy = 0.08
  for (let ms = 0; ms < BLOW_CALIBRATION_MS; ms += 16) {
    state = stepCakeBlowPhysics(state, {
      rawEnergy: 0.08,
      dtSec: dt,
      elapsedMs: ms,
      isHoldFallback: false,
    });
  }
  assert.ok(Math.abs(state.noiseFloor - 0.08) < 0.01);
  assert.equal(state.blowProgress, 0);

  // Ambient room hum (~0.09) stays below noiseFloor * 1.35 and must NOT blow out candles
  for (let i = 0; i < 60; i++) {
    state = stepCakeBlowPhysics(state, {
      rawEnergy: 0.09,
      dtSec: dt,
      elapsedMs: BLOW_CALIBRATION_MS + i * 16.6,
      isHoldFallback: false,
    });
  }
  assert.equal(state.blowProgress, 0);
  assert.equal(state.extinguished, false);

  // Sustained steady breath (rawEnergy = 0.75) should extinguish in ~3.0s
  let elapsed = BLOW_CALIBRATION_MS + 1000;
  let blowDurationSec = 0;
  while (!state.extinguished && blowDurationSec < 5) {
    state = stepCakeBlowPhysics(state, {
      rawEnergy: 0.75,
      dtSec: dt,
      elapsedMs: elapsed,
      isHoldFallback: false,
    });
    elapsed += dt * 1000;
    blowDurationSec += dt;
  }

  assert.equal(state.extinguished, true);
  assert.equal(state.blowProgress, 1);
  assert.ok(
    blowDurationSec >= 2.5 && blowDurationSec <= 3.6,
    `expected mic extinguish around ~3s, got ${blowDurationSec.toFixed(2)}s`,
  );
});

test('hold fallback feeds simulated breath into the 3-second physics engine and decays gently when released early', () => {
  let state = createInitialCakeBlowState();
  const dt = 1 / 60;

  // Hold for 1.5s -> partial progress (~0.40 - 0.55)
  for (let i = 0; i < 90; i++) {
    state = stepCakeBlowPhysics(state, {
      rawEnergy: 0,
      dtSec: dt,
      elapsedMs: i * 16.67,
      isHoldFallback: true,
      isHolding: true,
    });
  }
  const midProgress = state.blowProgress;
  assert.ok(midProgress > 0.3 && midProgress < 0.7, `got midProgress=${midProgress}`);
  assert.equal(state.extinguished, false);

  // Release for 1.0s -> progress decays gently rather than staying frozen
  for (let i = 0; i < 60; i++) {
    state = stepCakeBlowPhysics(state, {
      rawEnergy: 0,
      dtSec: dt,
      elapsedMs: 1500 + i * 16.67,
      isHoldFallback: true,
      isHolding: false,
    });
  }
  assert.ok(state.blowProgress < midProgress);

  // Hold continuously from fresh state -> extinguishes around ~3.3s-3.5s
  let fresh = createInitialCakeBlowState();
  let sec = 0;
  while (!fresh.extinguished && sec < 5) {
    fresh = stepCakeBlowPhysics(fresh, {
      rawEnergy: 0,
      dtSec: dt,
      elapsedMs: sec * 1000,
      isHoldFallback: true,
      isHolding: true,
    });
    sec += dt;
  }
  assert.equal(fresh.extinguished, true);
  assert.ok(sec >= 2.8 && sec <= 3.9, `expected ~3s hold extinguish, got ${sec.toFixed(2)}s`);
});

test('computeFlamePhysicsVisual bends, squashes, and sparks dynamically under strong breath', () => {
  const calm = computeFlamePhysicsVisual(0, 0, 1.0, 2);
  const strong = computeFlamePhysicsVisual(0.85, 0.65, 1.0, 2);

  assert.ok(Math.abs(calm.tiltDeg) < 2);
  assert.ok(Math.abs(calm.scaleY - 1) < 0.01);
  assert.equal(calm.sparkOpacity, 0);

  assert.ok(strong.tiltDeg > 28, `expected strong tilt > 28°, got ${strong.tiltDeg}`);
  assert.ok(strong.scaleY < 0.55 && strong.scaleY >= 0.22);
  assert.ok(strong.scaleX > 1.12);
  assert.ok(strong.sparkOpacity > 0.5);
});
