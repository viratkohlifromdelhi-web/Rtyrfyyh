import assert from 'node:assert/strict';
import test from 'node:test';
import { clamp01, computeTimelineRailProgress } from './timelineProgress';

test('clamp01 strictly bounds values to [0, 1] and handles non-finite input', () => {
  assert.equal(clamp01(-0.4), 0);
  assert.equal(clamp01(0), 0);
  assert.equal(clamp01(0.55), 0.55);
  assert.equal(clamp01(1.8), 1);
  assert.equal(clamp01(Number.NaN), 0);
});

test('computeTimelineRailProgress progresses monotonically from 0 before entry to 1 when Chapter 3 is in view', () => {
  const viewportH = 844;
  const railH = 520;

  // Rail still below entry anchor -> 0
  assert.equal(computeTimelineRailProgress(viewportH * 0.85, railH, viewportH), 0);
  assert.equal(computeTimelineRailProgress(viewportH * 0.78, railH, viewportH), 0);

  // Mid-scroll through timeline -> strictly between 0 and 1 and monotonic
  const p1 = computeTimelineRailProgress(viewportH * 0.5, railH, viewportH);
  const p2 = computeTimelineRailProgress(viewportH * 0.25, railH, viewportH);
  assert.ok(p1 > 0 && p1 < p2 && p2 < 1, `Expected 0 < ${p1} < ${p2} < 1`);

  // Rail bottom at or above 68% viewport -> 1
  const bottomAtAnchorTop = viewportH * 0.68 - railH;
  assert.equal(computeTimelineRailProgress(bottomAtAnchorTop, railH, viewportH), 1);
  assert.equal(computeTimelineRailProgress(bottomAtAnchorTop - 200, railH, viewportH), 1);
});
