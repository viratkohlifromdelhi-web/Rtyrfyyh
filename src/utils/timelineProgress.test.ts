import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clamp01,
  computeStickyCardScale,
  computeTimelineRailProgress,
} from './timelineProgress';

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

  assert.equal(computeTimelineRailProgress(viewportH * 0.85, railH, viewportH), 0);
  assert.equal(computeTimelineRailProgress(viewportH * 0.78, railH, viewportH), 0);

  const p1 = computeTimelineRailProgress(viewportH * 0.5, railH, viewportH);
  const p2 = computeTimelineRailProgress(viewportH * 0.25, railH, viewportH);
  assert.ok(p1 > 0 && p1 < p2 && p2 < 1, `Expected 0 < ${p1} < ${p2} < 1`);

  const bottomAtAnchorTop = viewportH * 0.68 - railH;
  assert.equal(computeTimelineRailProgress(bottomAtAnchorTop, railH, viewportH), 1);
  assert.equal(computeTimelineRailProgress(bottomAtAnchorTop - 200, railH, viewportH), 1);
});

test('computeStickyCardScale scales smoothly from 1 down to 0.965 as the next sticky sheet stacks over it', () => {
  // Next sheet far below -> untouched scale 1
  assert.equal(
    computeStickyCardScale({
      nextTop: 520,
      currentStickyTop: 82,
      nextStickyTop: 122,
    }),
    1,
  );

  // Mid-approach -> monotonically decreasing between 0.965 and 1
  const midHigh = computeStickyCardScale({
    nextTop: 280,
    currentStickyTop: 82,
    nextStickyTop: 122,
  });
  const midLow = computeStickyCardScale({
    nextTop: 180,
    currentStickyTop: 82,
    nextStickyTop: 122,
  });
  assert.ok(
    midHigh < 1 && midLow < midHigh && midLow > 0.965,
    `Expected 0.965 < ${midLow} < ${midHigh} < 1`,
  );

  // Next sheet locked at sticky offset -> settles cleanly at 0.965
  assert.equal(
    computeStickyCardScale({
      nextTop: 122,
      currentStickyTop: 82,
      nextStickyTop: 122,
    }),
    0.965,
  );

  // Non-finite inputs safely return 1
  assert.equal(
    computeStickyCardScale({
      nextTop: Number.NaN,
      currentStickyTop: 82,
      nextStickyTop: 122,
    }),
    1,
  );
});
