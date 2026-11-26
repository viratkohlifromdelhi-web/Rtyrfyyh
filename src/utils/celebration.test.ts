import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blowOutCandles,
  CONFETTI_PALETTE,
  createInitialCakeState,
  MAX_CONFETTI_PARTICLES,
  relightCandles,
  spawnConfettiBurst,
  spawnSideCannons,
  splitHeadlineWords,
  stepConfettiParticles,
  toggleActiveSlot,
} from './celebration';

test('confetti burst spawns varied shapes with realistic air drag and 3D tumbling until expired', () => {
  const particles = spawnConfettiBurst({
    originX: 300,
    originY: 400,
    count: 25,
    random: () => 0.5,
  });

  assert.equal(particles.length, 25);
  assert.equal(MAX_CONFETTI_PARTICLES, 180);
  assert.ok(particles[0].drag >= 0.96 && particles[0].drag <= 0.985);
  assert.ok(CONFETTI_PALETTE.includes(particles[0].color));

  const afterStep = stepConfettiParticles(particles, 900, 1);
  assert.equal(afterStep.length, 25);
  assert.equal(afterStep[0].life, 1);
  assert.notEqual(afterStep[0].tiltAngle, particles[0].tiltAngle);
  assert.notEqual(afterStep[0].swayPhase, particles[0].swayPhase);

  let current = afterStep;
  for (let i = 0; i < 240; i++) {
    current = stepConfettiParticles(current, 900, 1);
  }
  assert.equal(current.length, 0);
});

test('spawnSideCannons launches twin angled bursts from bottom-left and bottom-right corners', () => {
  const cannonParticles = spawnSideCannons({
    viewportWidth: 390,
    viewportHeight: 844,
    countPerSide: 20,
    random: () => 0.5,
  });

  assert.equal(cannonParticles.length, 40);
  const left = cannonParticles[0];
  const right = cannonParticles[20];
  assert.ok(left.vx > 0 && left.vy < 0, 'left cannon should launch upward-right');
  assert.ok(right.vx < 0 && right.vy < 0, 'right cannon should launch upward-left');
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
