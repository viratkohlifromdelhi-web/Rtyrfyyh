import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHIBI_GEOMETRY,
  CHIBI_TIMING,
  FOOTER_BOTTOM_PROXIMITY_PX,
  FOOTER_INTERSECTION_ROOT_MARGIN,
  FOOTER_INTERSECTION_THRESHOLD,
  computeFooterChibiPose,
  computeScrollAdvanceDirection,
  shouldAutoPlayFooterChibi,
} from './footerChibiChoreography';

test('character proportions enforce playful 15% to 18% height contrast (taller Boy, petite 5\'2" Girl)', () => {
  assert.equal(CHIBI_GEOMETRY.boyHeightPx, 166);
  assert.equal(CHIBI_GEOMETRY.girlHeightPx, 140);
  const ratioDiff =
    (CHIBI_GEOMETRY.boyHeightPx - CHIBI_GEOMETRY.girlHeightPx) / CHIBI_GEOMETRY.boyHeightPx;
  assert.ok(
    ratioDiff >= 0.15 && ratioDiff <= 0.18,
    `expected 15%..18% height difference, got ${(ratioDiff * 100).toFixed(2)}%`,
  );
});

test('Stage 1 (~0.46s) steps smoothly inward with a playful soft bounce and hair sway', () => {
  const start = computeFooterChibiPose(0);
  assert.equal(start.stage, 'ready');
  assert.equal(start.boyShiftX, -10);
  assert.equal(start.girlShiftX, 10);
  assert.equal(start.boyOpenEyesOpacity, 1);
  assert.equal(start.girlOpenEyesOpacity, 1);

  const mid = computeFooterChibiPose(230);
  assert.equal(mid.stage, 'step-in');
  assert.ok(mid.boyBounceY < -3, 'expected soft upward bounce for boy mid-entrance');
  assert.ok(mid.girlBounceY < -3, 'expected soft upward bounce for girl mid-entrance');
  assert.ok(Math.abs(mid.girlBackHairDeg) > 0.2, 'expected gentle hair sway during step-in');
});

test('Stage 2 (wave-greet) performs joyful girl wave + happy blink + sparkle and boy chuckle-nod + casual wave', () => {
  const waveSamples: number[] = [];
  const boyWaveSamples: number[] = [];
  const boyHeadSamples: number[] = [];

  for (let ms = CHIBI_TIMING.greetStartMs; ms <= CHIBI_TIMING.greetEndMs; ms += 20) {
    const pose = computeFooterChibiPose(ms);
    waveSamples.push(pose.girlWaveArmDeg);
    boyWaveSamples.push(pose.boyWaveArmDeg);
    boyHeadSamples.push(pose.boyHeadDeg);
  }

  const girlWaveSpread = Math.max(...waveSamples) - Math.min(...waveSamples);
  assert.ok(girlWaveSpread >= 16, `expected lively girl wave range, got ${girlWaveSpread.toFixed(2)}`);

  const boyWaveSpread = Math.max(...boyWaveSamples) - Math.min(...boyWaveSamples);
  assert.ok(boyWaveSpread >= 12, `expected casual boy wave range, got ${boyWaveSpread.toFixed(2)}`);

  const boyNodSpread = Math.max(...boyHeadSamples) - Math.min(...boyHeadSamples);
  assert.ok(boyNodSpread >= 5, `expected warm boy chuckle-nod range, got ${boyNodSpread.toFixed(2)}`);

  // Peak of Girl happy eye-blink + hand sparkle pop (~830ms)
  const blinkPeak = computeFooterChibiPose(830);
  assert.equal(blinkPeak.stage, 'wave-greet');
  assert.ok(blinkPeak.girlHappyEyesOpacity > 0.8, 'expected girl happy eye-blink peak');
  assert.ok(blinkPeak.girlHandSparkleOpacity > 0.8, 'expected sparkle pop near girl waving hand');
  assert.ok(blinkPeak.ambientSparklesOpacity > 0.7, 'expected floating pastel stars above them');
});

test('Stage 4 settles cleanly at ~1.62s with idle breathing, and reduced-motion skips motion', () => {
  assert.ok(
    CHIBI_TIMING.totalDurationMs >= 1500 && CHIBI_TIMING.totalDurationMs <= 1700,
    'expected ~1.6s lively sequence duration',
  );

  const resting = computeFooterChibiPose(CHIBI_TIMING.totalDurationMs + 100);
  assert.equal(resting.stage, 'resting');
  assert.equal(resting.isIdleBreathing, true);
  assert.equal(resting.boyOpenEyesOpacity, 1);
  assert.equal(resting.girlOpenEyesOpacity, 1);
  assert.equal(resting.girlHandSparkleOpacity, 0);

  const reduced = computeFooterChibiPose(800, true);
  assert.equal(reduced.stage, 'resting');
  assert.equal(reduced.isIdleBreathing, false);
  assert.equal(reduced.boyOpenEyesOpacity, 1);
  assert.equal(reduced.girlOpenEyesOpacity, 1);
});

test('scroll direction tracker detects advancing down toward footer (up) vs scrolling back toward Chicken Farm (down)', () => {
  assert.equal(FOOTER_INTERSECTION_THRESHOLD, 0.45);
  assert.equal(FOOTER_INTERSECTION_ROOT_MARGIN, '0px 0px -40px 0px');
  assert.equal(FOOTER_BOTTOM_PROXIMITY_PX, 140);

  assert.equal(computeScrollAdvanceDirection(520, 480, 'idle'), 'up');
  assert.equal(computeScrollAdvanceDirection(440, 520, 'up'), 'down');
  assert.equal(computeScrollAdvanceDirection(440.5, 440, 'down'), 'down');
  assert.equal(computeScrollAdvanceDirection(520.2, 520, 'up'), 'up');
});

test('footer auto-play gate blocks premature trigger while viewing Chicken Farm or scrolling back upward', () => {
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
