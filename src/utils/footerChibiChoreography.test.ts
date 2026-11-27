import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHIBI_GEOMETRY,
  CHIBI_TIMING,
  FOOTER_BOTTOM_PROXIMITY_PX,
  FOOTER_INTERSECTION_ROOT_MARGIN,
  FOOTER_INTERSECTION_THRESHOLD,
  computeFooterChibiPose,
  computeFrontHandPositions,
  computeScrollAdvanceDirection,
  shouldAutoPlayFooterChibi,
} from './footerChibiChoreography';

test('character proportions preserve affectionate height difference (~12% shorter girl)', () => {
  assert.equal(CHIBI_GEOMETRY.boyHeightPx, 116);
  assert.equal(CHIBI_GEOMETRY.girlHeightPx, 102);
  const ratioDiff =
    (CHIBI_GEOMETRY.boyHeightPx - CHIBI_GEOMETRY.girlHeightPx) / CHIBI_GEOMETRY.boyHeightPx;
  assert.ok(ratioDiff > 0.11 && ratioDiff < 0.13);
});

test('Stage 1 starts 24px further apart, bounces playfully, and glides smoothly inward', () => {
  const start = computeFooterChibiPose(0);
  assert.equal(start.stage, 'ready');
  assert.equal(start.boyShiftX, -12);
  assert.equal(start.girlShiftX, 12);
  assert.equal(start.girlShiftX - start.boyShiftX, 24);
  assert.equal(start.openEyesOpacity, 1);
  assert.equal(start.hugEyesOpacity, 0);

  const mid = computeFooterChibiPose(275);
  assert.equal(mid.stage, 'step-in');
  assert.ok(mid.boyBounceY < -2, 'expected playful upward bounce mid-step');
  assert.ok(Math.abs(mid.girlBackHairDeg) > 0.2, 'expected subtle backHair sway on step-in');
});

test('Stage 2 handshake locks both mitten hands at (130, 92) and pumps in tight vertical sync', () => {
  // Right as hands finish reaching at 550 + 300 = 850ms
  const locked = computeFooterChibiPose(850);
  assert.equal(locked.stage, 'handshake');
  assert.equal(locked.claspOverlapOpacity, 1);

  const handsLocked = computeFrontHandPositions(locked);
  assert.ok(
    Math.hypot(handsLocked.boyHand.x - 130, handsLocked.boyHand.y - 92) < 1.2,
    `boy hand expected near (130, 92), got (${handsLocked.boyHand.x.toFixed(2)}, ${handsLocked.boyHand.y.toFixed(2)})`,
  );
  assert.ok(
    Math.hypot(handsLocked.girlHand.x - 130, handsLocked.girlHand.y - 92) < 1.2,
    `girl hand expected near (130, 92), got (${handsLocked.girlHand.x.toFixed(2)}, ${handsLocked.girlHand.y.toFixed(2)})`,
  );

  // Peak of down pump (+10deg boy / -10deg girl at 550 + 300 + 210 = 1060ms)
  const downPump = computeFooterChibiPose(1060);
  assert.equal(downPump.boyFrontArmDeg, 25);
  assert.equal(downPump.girlFrontArmDeg, -15);
  assert.equal(downPump.boyHeadDeg, 3);
  assert.equal(downPump.girlHeadDeg, -3);
  const handsDown = computeFrontHandPositions(downPump);
  assert.ok(
    Math.abs(handsDown.boyHand.y - handsDown.girlHand.y) < 1.0,
    'both hands must move down together in lockstep during pump',
  );

  // Second pump triggers the 3 Champagne-Gold radial motion ticks
  const tickPeak = computeFooterChibiPose(CHIBI_TIMING.handshakeTickStartMs + 126);
  assert.ok(tickPeak.handshakeTicksOpacity > 0.75);
  assert.ok(tickPeak.handshakeTicksScale > 0.85);
});

test('Stage 3 hug glides 14px closer, crossfades to ^ ^ eyes, tilts heads ±6deg, back-pats, and floats pastel particles', () => {
  const hugHold = computeFooterChibiPose(2400);
  assert.equal(hugHold.stage, 'hug');
  assert.equal(hugHold.boyShiftX, 14);
  assert.equal(hugHold.girlShiftX, -14);
  assert.equal(hugHold.shadowMerge01, 1);
  assert.equal(hugHold.openEyesOpacity, 0);
  assert.equal(hugHold.hugEyesOpacity, 1);
  assert.equal(hugHold.boyHeadDeg, 6);
  assert.equal(hugHold.girlHeadDeg, -6);
  assert.ok(hugHold.hugParticlesOpacity > 0.8);
  assert.ok(hugHold.hugParticlesProgress01 > 0 && hugHold.hugParticlesProgress01 < 1);

  // Verify boy's wrapping arm performs ±5deg back-pat oscillation during hug hold
  const patSamples: number[] = [];
  for (let ms = 2190; ms <= 3030; ms += 20) {
    patSamples.push(computeFooterChibiPose(ms).boyFrontArmDeg);
  }
  const spread = Math.max(...patSamples) - Math.min(...patSamples);
  assert.ok(spread >= 9.5, `expected ~10deg peak-to-peak back-pat range, got ${spread.toFixed(2)}`);
});

test('Stage 4 settles into cozy resting pose with idle breathing, and reduced-motion skips motion cleanly', () => {
  const resting = computeFooterChibiPose(CHIBI_TIMING.totalDurationMs + 200);
  assert.equal(resting.stage, 'resting');
  assert.equal(resting.isIdleBreathing, true);
  assert.equal(resting.openEyesOpacity, 1);
  assert.equal(resting.hugEyesOpacity, 0);

  const reduced = computeFooterChibiPose(900, true);
  assert.equal(reduced.stage, 'resting');
  assert.equal(reduced.isIdleBreathing, false);
  assert.equal(reduced.openEyesOpacity, 1);
  assert.equal(reduced.hugEyesOpacity, 0);
});

test('scroll direction tracker detects advancing down toward footer (up) vs scrolling back toward Chicken Farm (down)', () => {
  assert.equal(FOOTER_INTERSECTION_THRESHOLD, 0.45);
  assert.equal(FOOTER_INTERSECTION_ROOT_MARGIN, '0px 0px -40px 0px');
  assert.equal(FOOTER_BOTTOM_PROXIMITY_PX, 140);

  assert.equal(computeScrollAdvanceDirection(520, 480, 'idle'), 'up');
  assert.equal(computeScrollAdvanceDirection(440, 520, 'up'), 'down');
  // Tiny sub-deadzone jitter preserves previous direction
  assert.equal(computeScrollAdvanceDirection(440.5, 440, 'down'), 'down');
  assert.equal(computeScrollAdvanceDirection(520.2, 520, 'up'), 'up');
});

test('footer auto-play gate blocks premature trigger while viewing Chicken Farm or scrolling back upward', () => {
  // User is centered on Chicken Farm, only clipping top 10% of footer (not well in view, far from bottom)
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: false,
      isSiteRevealed: true,
      isFooterWellInView: false,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 260,
      scrollDirection: 'up',
    }),
    false,
  );

  // User scrolled back UP toward Chicken Farm (direction === 'down') — hold calmly even if footer is partially/well visible
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: false,
      isSiteRevealed: true,
      isFooterWellInView: true,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 80,
      scrollDirection: 'down',
    }),
    false,
  );

  // User scrolls down into the footer (direction === 'up' + well in view) -> triggers cleanly!
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: false,
      isSiteRevealed: true,
      isFooterWellInView: true,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 180,
      scrollDirection: 'up',
    }),
    true,
  );

  // User reaches bottom of page (within 140px) while footer is visible -> triggers cleanly!
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: false,
      isSiteRevealed: true,
      isFooterWellInView: false,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 120,
      scrollDirection: 'idle',
    }),
    true,
  );

  // Never fires twice automatically and never before site reveal
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: true,
      isSiteRevealed: true,
      isFooterWellInView: true,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 0,
      scrollDirection: 'up',
    }),
    false,
  );
  assert.equal(
    shouldAutoPlayFooterChibi({
      hasAutoPlayed: false,
      isSiteRevealed: false,
      isFooterWellInView: true,
      isFooterVisibleAtAll: true,
      distanceFromBottomPx: 0,
      scrollDirection: 'up',
    }),
    false,
  );
});

