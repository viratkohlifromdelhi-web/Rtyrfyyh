import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceScannerProgress,
  calculateClearedRatio,
  computeDodgePosition,
  getDodgeMessage,
  getScannerStageMessage,
  RUNAWAY_TAUNTS,
  SCANNER_MAX_PROGRESS,
  shouldAutoRevealScratch,
} from './interactiveFun';

test('getDodgeMessage cycles cleanly through cheeky taunts', () => {
  assert.equal(getDodgeMessage(1), 'Nice try, bauni');
  assert.equal(getDodgeMessage(2), 'Too slow, Morgan!');
  assert.equal(getDodgeMessage(3), 'Stop fighting the truth');
  assert.equal(getDodgeMessage(4), 'Just tap Yes already 😂');
  assert.equal(getDodgeMessage(RUNAWAY_TAUNTS.length + 1), RUNAWAY_TAUNTS[0]);
});

test('computeDodgePosition keeps button strictly inside container bounds and avoids Yes button', () => {
  const bounds = { width: 340, height: 220 };
  const buttonSize = { width: 108, height: 48 };
  const yesRect = { x: 24, y: 20, width: 168, height: 48 };

  let seed = 0.13;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  let current = { x: 200, y: 20 };
  for (let i = 0; i < 30; i++) {
    const next = computeDodgePosition(bounds, buttonSize, current, seededRandom, yesRect, 12);

    assert.ok(next.x >= 12, `x (${next.x}) should be >= 12`);
    assert.ok(next.y >= 12, `y (${next.y}) should be >= 12`);
    assert.ok(
      next.x + buttonSize.width <= bounds.width - 12,
      `right edge (${next.x + buttonSize.width}) should fit inside bounds`,
    );
    assert.ok(
      next.y + buttonSize.height <= bounds.height - 12,
      `bottom edge (${next.y + buttonSize.height}) should fit inside bounds`,
    );

    const overlapsYes = !(
      next.x + buttonSize.width + 10 <= yesRect.x ||
      yesRect.x + yesRect.width + 10 <= next.x ||
      next.y + buttonSize.height + 10 <= yesRect.y ||
      yesRect.y + yesRect.height + 10 <= next.y
    );
    assert.equal(overlapsYes, false, 'dodged button should not overlap the Yes button');
    assert.ok(
      Math.hypot(next.x - current.x, next.y - current.y) > 20,
      'dodged button should visibly move away from its previous position',
    );
    current = next;
  }
});

test('getScannerStageMessage progresses through all 3 funny scanning stages', () => {
  assert.equal(getScannerStageMessage(12), 'Calibrating microscope...');
  assert.equal(getScannerStageMessage(50), 'Zooming in 500x...');
  assert.equal(getScannerStageMessage(88), 'Searching near the floor...');
  assert.equal(getScannerStageMessage(99), 'Searching near the floor...');
});

test('advanceScannerProgress caps cleanly at 99% and flags verdict', () => {
  const mid = advanceScannerProgress(0, 1200, 2400);
  assert.equal(mid.reachedVerdict, false);
  assert.ok(mid.progress > 45 && mid.progress < 55);

  const end = advanceScannerProgress(90, 500, 2400);
  assert.equal(end.progress, SCANNER_MAX_PROGRESS);
  assert.equal(end.reachedVerdict, true);
});

test('calculateClearedRatio and shouldAutoRevealScratch detect 50% cleared foil accurately', () => {
  // 100 pixels (400 RGBA bytes): 40 cleared (alpha = 0), 60 opaque (alpha = 255)
  const fortyPercent = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) {
    fortyPercent[i * 4 + 3] = i < 40 ? 0 : 255;
  }
  assert.equal(calculateClearedRatio(fortyPercent, 1), 0.4);
  assert.equal(shouldAutoRevealScratch(calculateClearedRatio(fortyPercent, 1)), false);

  // 55 cleared pixels => 0.55 => triggers auto-reveal
  const fiftyFivePercent = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) {
    fiftyFivePercent[i * 4 + 3] = i < 55 ? 0 : 255;
  }
  assert.equal(calculateClearedRatio(fiftyFivePercent, 1), 0.55);
  assert.equal(shouldAutoRevealScratch(calculateClearedRatio(fiftyFivePercent, 1)), true);
});
