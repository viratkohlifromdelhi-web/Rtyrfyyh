import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyCrawlPegBend,
  applyFlapperImpulse,
  computeRiggedSpinPlan,
  evaluateWheelAngle,
  getPegCrossingIndex,
  getSliceIndexAtTop,
  pickRiggedTrollIndex,
  SPIN_BREAKTHROUGH_MAX_DEG,
  SPIN_BREAKTHROUGH_MIN_DEG,
  SPIN_DURATION_MAX_MS,
  SPIN_DURATION_MIN_MS,
  SPIN_PLOT_TWIST_PEG_U,
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

test('computeRiggedSpinPlan runs 6.4s-7.2s, teases bait decoy during 2.5s+ crawl, and breaks 7°-13° past peg into troll slice', () => {
  let angle = 18;
  let lastTroll: number | null = null;

  for (let i = 0; i < 20; i++) {
    let call = 0;
    const plan = computeRiggedSpinPlan(angle, lastTroll, () => {
      call += 1;
      return ((i * 29 + call * 17) % 97) / 97;
    });

    assert.ok(plan.fullSpins === 6 || plan.fullSpins === 7);
    assert.ok(
      plan.totalDurationMs >= SPIN_DURATION_MIN_MS && plan.totalDurationMs <= SPIN_DURATION_MAX_MS,
    );
    assert.ok(
      plan.breakthroughDeg >= SPIN_BREAKTHROUGH_MIN_DEG &&
        plan.breakthroughDeg <= SPIN_BREAKTHROUGH_MAX_DEG,
    );
    assert.ok((TROLL_INDICES as readonly number[]).includes(plan.targetIndex));
    assert.equal(plan.decoyIndex, (plan.targetIndex + 1) % 10);
    assert.equal(WHEEL_SLICES[plan.decoyIndex].isTroll, false);
    assert.notEqual(plan.targetIndex, lastTroll);

    // Monotonic forward motion throughout deceleration phase (never reverses before recoil)
    let prevA = plan.startAngleDeg;
    for (let ms = 16; ms <= plan.decelDurationMs; ms += 16) {
      const a = evaluateWheelAngle(plan, ms);
      assert.ok(a >= prevA - 0.0001, `expected forward motion at ${ms}ms: ${a} < ${prevA}`);
      prevA = a;
    }

    // Dramatic suspense crawl: with ~2.5s remaining, wheel is within the final ~2.5 segments (<= 95°)
    const angleAt2500Left = evaluateWheelAngle(plan, plan.decelDurationMs - 2500);
    const remainingAt2500Left = plan.targetAngleDeg - angleAt2500Left;
    assert.ok(
      remainingAt2500Left > 25 && remainingAt2500Left <= 105,
      `expected suspense crawl at -2.5s (25°..105° left), got ${remainingAt2500Left.toFixed(1)}°`,
    );

    // Just before crossing the final dividing peg (u = 0.84), wheel is visibly on the bait decoy prize!
    const angleBeforePeg = evaluateWheelAngle(plan, plan.decelDurationMs * (SPIN_PLOT_TWIST_PEG_U - 0.03));
    assert.equal(getSliceIndexAtTop(angleBeforePeg), plan.decoyIndex);

    // Just after crossing the dividing peg (u = 0.94), wheel has clicked over into the rigged troll slice!
    const angleAfterPeg = evaluateWheelAngle(plan, plan.decelDurationMs * 0.94);
    assert.equal(getSliceIndexAtTop(angleAfterPeg), plan.targetIndex);

    // Exact alignment guarantee at full settle
    const finalAngle = evaluateWheelAngle(plan, plan.totalDurationMs);
    assert.equal(finalAngle, plan.targetAngleDeg);
    assert.equal(getSliceIndexAtTop(finalAngle), plan.targetIndex);

    // Damped spring recoil over last 280ms stays within ±1.75° and NEVER leaves the target troll slice
    for (let ms = plan.decelDurationMs; ms <= plan.totalDurationMs; ms += 12) {
      const a = evaluateWheelAngle(plan, ms);
      assert.ok(Math.abs(a - plan.targetAngleDeg) <= 1.75);
      assert.equal(getSliceIndexAtTop(a), plan.targetIndex);
    }

    angle = finalAngle;
    lastTroll = plan.targetIndex;
  }
});

test('peg crossing counter, high-speed flapper kick (-24°), crawl peg bend (-34°), and spring recoil to 0°', () => {
  assert.equal(getPegCrossingIndex(35.9), 0);
  assert.equal(getPegCrossingIndex(36.0), 1);
  assert.equal(getPegCrossingIndex(72.5), 2);

  // High-speed kick reaches around -24°
  let flapper = applyFlapperImpulse({ angleDeg: 0, velocityDegPerSec: 0 }, 900);
  assert.ok(flapper.angleDeg <= -20 && flapper.angleDeg >= -25);

  // Slow crawl pressing right against a peg bends flapper down toward -34°
  const bent = applyCrawlPegBend({ angleDeg: 0, velocityDegPerSec: 0 }, 35.4, 18);
  assert.ok(bent.angleDeg <= -30 && bent.angleDeg >= -34);

  // Spring returns cleanly to 0°
  for (let f = 0; f < 120; f++) {
    flapper = stepFlapperSpring(flapper, 1 / 60);
  }
  assert.equal(flapper.angleDeg, 0);
  assert.equal(flapper.velocityDegPerSec, 0);
});
