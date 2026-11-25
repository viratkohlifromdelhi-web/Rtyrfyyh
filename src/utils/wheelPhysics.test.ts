import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyFlapperImpulse,
  computeRiggedSpinPlan,
  evaluateWheelAngle,
  getPegCrossingIndex,
  getSliceIndexAtTop,
  pickRiggedTrollIndex,
  SPIN_DECEL_DURATION_MS,
  SPIN_TOTAL_DURATION_MS,
  stepFlapperSpring,
  TROLL_INDICES,
  WHEEL_SLICES,
} from './wheelPhysics.ts';

test('WHEEL_SLICES defines 10 alternating troll and bait slices with exact labels', () => {
  assert.equal(WHEEL_SLICES.length, 10);
  for (let i = 0; i < 10; i++) {
    assert.equal(WHEEL_SLICES[i].index, i);
    assert.equal(WHEEL_SLICES[i].isTroll, i % 2 === 0);
  }
  assert.equal(WHEEL_SLICES[0].label, 'Try Again 🙃');
  assert.equal(WHEEL_SLICES[1].label, 'New iPhone 📱');
  assert.equal(WHEEL_SLICES[8].label, 'Bauni 📏');
  assert.equal(WHEEL_SLICES[9].label, 'Luxury Perfume ✨');
});

test('pickRiggedTrollIndex only picks from [0, 2, 4, 6, 8] and never repeats twice in a row', () => {
  let prev: number | null = null;
  for (let step = 0; step < 50; step++) {
    const next = pickRiggedTrollIndex(prev, () => ((step * 37) % 100) / 100);
    assert.ok((TROLL_INDICES as readonly number[]).includes(next));
    assert.notEqual(next, prev);
    prev = next;
  }
});

test('computeRiggedSpinPlan lands strictly on chosen troll slice after 6-8 spins with near-miss crawl off adjacent bait', () => {
  let angle = 0;
  let lastTroll: number | null = null;

  for (let i = 0; i < 20; i++) {
    const plan = computeRiggedSpinPlan(angle, lastTroll, () => ((i * 29 + 11) % 97) / 97);
    assert.ok(plan.fullSpins >= 6 && plan.fullSpins <= 8);
    assert.ok(plan.nearMissFraction >= 0.25 && plan.nearMissFraction <= 0.35);
    assert.ok((TROLL_INDICES as readonly number[]).includes(plan.targetIndex));
    assert.notEqual(plan.targetIndex, lastTroll);

    // Exact alignment guarantee at full settle
    const finalAngle = evaluateWheelAngle(plan, SPIN_TOTAL_DURATION_MS);
    assert.equal(finalAngle, plan.targetAngleDeg);
    assert.equal(getSliceIndexAtTop(finalAngle), plan.targetIndex);

    // Micro-recoil during the last 350ms stays within ±1.2° and NEVER leaves the target troll slice
    for (let ms = SPIN_DECEL_DURATION_MS; ms <= SPIN_TOTAL_DURATION_MS; ms += 15) {
      const a = evaluateWheelAngle(plan, ms);
      assert.ok(Math.abs(a - plan.targetAngleDeg) <= 1.25);
      assert.equal(getSliceIndexAtTop(a), plan.targetIndex);
    }

    // Just before crossing the leading border peg (~15° earlier), the wheel was creeping across the bait slice (targetIndex + 1)
    const rightBeforePegAngle = plan.targetAngleDeg - 15;
    assert.equal(getSliceIndexAtTop(rightBeforePegAngle), (plan.targetIndex + 1) % 10);
    assert.equal(WHEEL_SLICES[getSliceIndexAtTop(rightBeforePegAngle)].isTroll, false);

    angle = finalAngle;
    lastTroll = plan.targetIndex;
  }
});

test('peg crossing counter increments cleanly every 36° and flapper spring recoils back to 0°', () => {
  assert.equal(getPegCrossingIndex(35.9), 0);
  assert.equal(getPegCrossingIndex(36.0), 1);
  assert.equal(getPegCrossingIndex(72.5), 2);

  let flapper = applyFlapperImpulse({ angleDeg: 0, velocityDegPerSec: 0 }, 1100);
  assert.ok(flapper.angleDeg <= -30 && flapper.angleDeg >= -38);

  for (let f = 0; f < 120; f++) {
    flapper = stepFlapperSpring(flapper, 1 / 60);
  }
  assert.equal(flapper.angleDeg, 0);
  assert.equal(flapper.velocityDegPerSec, 0);
});
