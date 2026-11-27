import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HEADER_OFFSET_PX,
  computeScrollDestinationY,
  easeInOutQuart,
  easeOutQuint,
  interpolateScrollY,
} from './smoothScroll';

test('easeInOutQuart and easeOutQuint start at 0, end at 1, and climb monotonically', () => {
  assert.equal(easeInOutQuart(-0.2), 0);
  assert.equal(easeInOutQuart(0), 0);
  assert.equal(easeInOutQuart(0.5), 0.5);
  assert.equal(easeInOutQuart(1), 1);
  assert.equal(easeInOutQuart(1.5), 1);

  assert.equal(easeOutQuint(0), 0);
  assert.equal(easeOutQuint(1), 1);

  let prevQuart = 0;
  let prevQuint = 0;
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const q = easeInOutQuart(t);
    const qu = easeOutQuint(t);
    assert.ok(q >= prevQuart, `easeInOutQuart should be monotonic at t=${t}`);
    assert.ok(qu >= prevQuint, `easeOutQuint should be monotonic at t=${t}`);
    prevQuart = q;
    prevQuint = qu;
  }
});

test('computeScrollDestinationY subtracts sticky header height + 16px, falls back to 80px, and clamps bounds', () => {
  // Sticky header 56px + 16px gap = 72px offset
  assert.equal(
    computeScrollDestinationY({
      elementTopInDoc: 900,
      headerHeight: 56,
      maxScrollY: 3000,
    }),
    828,
  );

  // Missing header (height 0) falls back to 80px offset
  assert.equal(
    computeScrollDestinationY({
      elementTopInDoc: 900,
      headerHeight: 0,
      maxScrollY: 3000,
    }),
    900 - DEFAULT_HEADER_OFFSET_PX,
  );

  // Clamps to 0 at top and maxScrollY at bottom
  assert.equal(
    computeScrollDestinationY({
      elementTopInDoc: 40,
      headerHeight: 56,
      maxScrollY: 3000,
    }),
    0,
  );
  assert.equal(
    computeScrollDestinationY({
      elementTopInDoc: 4200,
      headerHeight: 56,
      maxScrollY: 3000,
    }),
    3000,
  );
});

test('interpolateScrollY glides smoothly from startY to targetY and finishes cleanly', () => {
  const atStart = interpolateScrollY(0, 1000, 0, 850);
  assert.equal(atStart.y, 0);
  assert.equal(atStart.done, false);

  const atMid = interpolateScrollY(0, 1000, 425, 850);
  assert.equal(atMid.y, 500);
  assert.equal(atMid.done, false);

  const atEnd = interpolateScrollY(0, 1000, 850, 850);
  assert.equal(atEnd.y, 1000);
  assert.equal(atEnd.done, true);
});
