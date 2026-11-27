import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_SPRING_CONFIG,
  CLIP_UNCLIP_END_SEC,
  FIRST_TEXT_DATE,
  RECEIPT_IMG_SRC,
  STAMP_DURATION_SEC,
  STAMP_IMPACT_SEC,
  clampPhysicsDt,
  computeDaysSinceFirstText,
  computeFolderPressScale,
  computeFrontFlapOpenFrame,
  computePaperclipOpenFrame,
  computeStampImpactFrame,
  formatDaysSinceLabel,
  isSpringSettled,
  stepSpring,
} from './caseFilePhysics';

test('local receipt path and first text date constants match spec', () => {
  assert.equal(
    RECEIPT_IMG_SRC,
    `/${encodeURIComponent('Screenshot_2026-11-26-13-11-51-847_com.instagram.android.png')}`,
  );
  assert.equal(FIRST_TEXT_DATE, '2026-07-21T00:29:00+05:30');
  assert.equal(CARD_SPRING_CONFIG.stiffness, 175);
  assert.equal(CARD_SPRING_CONFIG.damping, 16);
  assert.equal(CARD_SPRING_CONFIG.mass, 1.0);
});

test('clampPhysicsDt clamps frame spikes to 0.05s max', () => {
  assert.equal(clampPhysicsDt(0.016), 0.016);
  assert.equal(clampPhysicsDt(0.25), 0.05);
  assert.equal(clampPhysicsDt(-0.02), 0);
  assert.equal(clampPhysicsDt(Number.NaN), 0);
});

test('damped harmonic spring solver overshoots once gently and settles to target', () => {
  let state = { value: -260, velocity: 0 };
  const target = -10;
  let maxVal = -Infinity;

  // Simulate 2 seconds at 60fps
  for (let i = 0; i < 120; i++) {
    state = stepSpring(state, target, 1 / 60, CARD_SPRING_CONFIG);
    if (state.value > maxVal) maxVal = state.value;
  }

  // With stiffness=175, damping=16 (zeta ~ 0.60), it creates one subtle cardstock overshoot > -10 then settles
  assert.ok(maxVal > target, `expected subtle cardstock overshoot above ${target}, got ${maxVal}`);
  assert.ok(maxVal < target + 35, `overshoot should stay realistic, got ${maxVal}`);
  assert.equal(isSpringSettled(state, target), true);
  assert.ok(Math.abs(state.value - target) < 0.1);
});

test('Stage 1 press, paperclip unclip, and front flap 3D hinge match timeline', () => {
  assert.equal(computeFolderPressScale(0), 1);
  assert.ok(Math.abs(computeFolderPressScale(0.065) - 0.985) < 0.001);
  assert.equal(computeFolderPressScale(0.25), 1);

  const clipStart = computePaperclipOpenFrame(0);
  assert.equal(clipStart.opacity, 1);
  assert.equal(clipStart.txPx, 0);

  const clipEnd = computePaperclipOpenFrame(CLIP_UNCLIP_END_SEC);
  assert.equal(clipEnd.txPx, 16);
  assert.equal(clipEnd.tyPx, -24);
  assert.equal(clipEnd.rotDeg, 28);
  assert.equal(clipEnd.opacity, 0);

  const flapClosed = computeFrontFlapOpenFrame(0.02);
  assert.equal(flapClosed.rotateXDeg, 0);
  assert.equal(flapClosed.opacity, 1);

  const flapPeak = computeFrontFlapOpenFrame(0.24);
  assert.equal(flapPeak.rotateXDeg, -24);

  const flapRelaxed = computeFrontFlapOpenFrame(0.95);
  assert.equal(flapRelaxed.rotateXDeg, -6);
  assert.ok(Math.abs(flapRelaxed.opacity - 0.82) < 0.001);
});

test('Stage 3 stamp impact scales 2.1 -> 1.0, opacity 0 -> 0.92, with subtle recoil', () => {
  const before = computeStampImpactFrame(0.7);
  assert.equal(before.visible, false);
  assert.equal(before.opacity, 0);
  assert.equal(before.cardRecoilYPx, 0);

  const atContact = computeStampImpactFrame(STAMP_IMPACT_SEC + STAMP_DURATION_SEC * 0.72 + 0.045);
  assert.equal(atContact.visible, true);
  assert.ok(atContact.cardRecoilYPx > 2.0 && atContact.cardRecoilYPx <= 2.5);

  const after = computeStampImpactFrame(1.15);
  assert.equal(after.visible, true);
  assert.equal(after.scale, 1.0);
  assert.equal(after.rotateDeg, -11);
  assert.ok(Math.abs(after.opacity - 0.92) < 0.001);
  assert.equal(after.cardRecoilYPx, 0);
});

test('live days-since-first-text counter computes exact days cleanly', () => {
  // Same day -> 0 days
  assert.equal(
    computeDaysSinceFirstText(FIRST_TEXT_DATE, new Date('2026-07-21T14:00:00+05:30')),
    0,
  );
  // Next day after 12:29 AM -> 1 day (singular)
  const oneDay = computeDaysSinceFirstText(FIRST_TEXT_DATE, new Date('2026-07-22T09:00:00+05:30'));
  assert.equal(oneDay, 1);
  assert.equal(formatDaysSinceLabel(oneDay), '⏳ 1 day since my 12:29 AM first text');
  // Birthday (03 Dec 2026, 12:00 PM IST): July(10) + Aug(31) + Sep(30) + Oct(31) + Nov(30) + Dec(3) = 135 days
  const onBirthday = computeDaysSinceFirstText(
    FIRST_TEXT_DATE,
    new Date('2026-12-03T12:00:00+05:30'),
  );
  assert.equal(onBirthday, 135);
  assert.equal(formatDaysSinceLabel(onBirthday), '⏳ 135 days since my 12:29 AM first text');
  // Before start date clamps safely to 0
  assert.equal(
    computeDaysSinceFirstText(FIRST_TEXT_DATE, new Date('2026-07-10T12:00:00+05:30')),
    0,
  );
});
