import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AMBIENT_EMBERS,
  DOSSIER_SPECS,
  IGNITE_AURA_TOASTS,
  MAX_CARD_TILT_DEG,
  computeCardTilt,
  createIgniteSparks,
  createRestTiltState,
  getNextAuraToastIndex,
  stepTiltState,
} from './editorialCard.ts';

test('computeCardTilt clamps pointer tilt strictly within ±5deg and centers flat at (0.5, 0.5)', () => {
  const center = computeCardTilt(0.5, 0.5);
  assert.equal(center.rotateX, 0);
  assert.equal(center.rotateY, 0);

  const topLeft = computeCardTilt(0, 0);
  assert.equal(topLeft.rotateX, MAX_CARD_TILT_DEG);
  assert.equal(topLeft.rotateY, -MAX_CARD_TILT_DEG);

  const bottomRight = computeCardTilt(1, 1);
  assert.equal(bottomRight.rotateX, -MAX_CARD_TILT_DEG);
  assert.equal(bottomRight.rotateY, MAX_CARD_TILT_DEG);

  // Out-of-bounds inputs clamp safely
  const overflow = computeCardTilt(5, -3);
  assert.ok(Math.abs(overflow.rotateX) <= MAX_CARD_TILT_DEG);
  assert.ok(Math.abs(overflow.rotateY) <= MAX_CARD_TILT_DEG);

  // Custom ±4deg scrapbook glossy print tilt
  const glossyCorner = computeCardTilt(1, 0, 4);
  assert.equal(glossyCorner.rotateX, 4);
  assert.equal(glossyCorner.rotateY, 4);
  assert.ok(glossyCorner.sheenOpacity > 0.25);
});

test('stepTiltState smoothly converges back to flat (0deg) rest state without overshoot', () => {
  let state = { rotateX: 5, rotateY: -5, sheenX: 30, sheenY: -20, sheenOpacity: 0.35 };
  const rest = createRestTiltState();
  let settled = false;

  for (let i = 0; i < 90; i++) {
    const res = stepTiltState(state, rest, 0.016);
    state = res.next;
    if (res.settled) {
      settled = true;
      break;
    }
  }

  assert.equal(settled, true);
  assert.equal(state.rotateX, 0);
  assert.equal(state.rotateY, 0);
  assert.equal(state.sheenOpacity, 0);
});

test('getNextAuraToastIndex cycles cleanly across all 4 funny one-liners', () => {
  assert.equal(IGNITE_AURA_TOASTS.length, 4);
  assert.equal(getNextAuraToastIndex(-1), 0);
  assert.equal(getNextAuraToastIndex(0), 1);
  assert.equal(getNextAuraToastIndex(1), 2);
  assert.equal(getNextAuraToastIndex(2), 3);
  assert.equal(getNextAuraToastIndex(3), 0);
});

test('createIgniteSparks spawns exactly 14 upward golden-amber spark vectors and dossier has 4 specs', () => {
  const sparks = createIgniteSparks(1);
  assert.equal(sparks.length, 14);
  for (const s of sparks) {
    assert.ok(s.dy.startsWith('-'), `Expected upward dy, got ${s.dy}`);
    assert.ok(s.sizePx >= 2 && s.sizePx <= 5);
  }
  assert.equal(DOSSIER_SPECS.length, 4);
  assert.ok(AMBIENT_EMBERS.length >= 6 && AMBIENT_EMBERS.length <= 8);
});
