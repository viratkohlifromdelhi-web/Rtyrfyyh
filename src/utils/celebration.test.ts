import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blowOutCandles,
  createInitialCakeState,
  relightCandles,
  spawnConfettiBurst,
  splitHeadlineWords,
  stepConfettiParticles,
  toggleActiveSlot,
} from './celebration';

test('confetti burst spawns requested particles and steps under gravity until expired', () => {
  const particles = spawnConfettiBurst({
    originX: 300,
    originY: 400,
    count: 25,
    random: () => 0.5,
  });

  assert.equal(particles.length, 25);
  const afterStep = stepConfettiParticles(particles, 900);
  assert.equal(afterStep.length, 25);
  assert.equal(afterStep[0].life, 1);

  let current = afterStep;
  for (let i = 0; i < 160; i++) {
    current = stepConfettiParticles(current, 900);
  }
  assert.equal(current.length, 0);
});

test('cake state machine extinguishes, increments wishes, and relights cleanly', () => {
  const initial = createInitialCakeState();
  assert.equal(initial.candlesLit, true);
  assert.equal(initial.showWishPopup, false);

  const blown = blowOutCandles(initial);
  assert.equal(blown.candlesLit, false);
  assert.equal(blown.wishCount, 1);
  assert.equal(blown.showWishPopup, true);

  // Blowing out again while unlit does not double-count
  const blownAgain = blowOutCandles(blown);
  assert.equal(blownAgain.wishCount, 1);

  const relit = relightCandles(blownAgain);
  assert.equal(relit.candlesLit, true);
  assert.equal(relit.showWishPopup, false);
  assert.equal(relit.wishCount, 1);
});

test('toggleActiveSlot highlights a new slot and collapses the active one', () => {
  assert.equal(toggleActiveSlot(null, 'slot-1'), 'slot-1');
  assert.equal(toggleActiveSlot('slot-1', 'slot-2'), 'slot-2');
  assert.equal(toggleActiveSlot('slot-2', 'slot-2'), null);
});

test('splitHeadlineWords preserves words and individual letters', () => {
  const words = splitHeadlineWords('Kiara is 24!');
  assert.equal(words.length, 3);
  assert.deepEqual(words[0].letters, ['K', 'i', 'a', 'r', 'a']);
  assert.deepEqual(words[2].letters, ['2', '4', '!']);
});
