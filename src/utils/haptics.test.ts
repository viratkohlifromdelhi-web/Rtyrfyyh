import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAPTIC_PATTERNS,
  WHEEL_TICK_THROTTLE_MS,
  createHapticsEngine,
  getScannerHapticStep,
} from './haptics';

test('haptics engine safely no-ops when navigator or navigator.vibrate is unavailable or throws', () => {
  const noNavEngine = createHapticsEngine({ getNav: () => undefined });
  assert.equal(noNavEngine.vaultKeypadTap(), false);
  assert.equal(noNavEngine.stopHaptics(), false);

  const safariEngine = createHapticsEngine({ getNav: () => ({}) });
  assert.equal(safariEngine.wheelPegTick(), false);
  assert.equal(safariEngine.scannerVerdict(), false);

  const throwingEngine = createHapticsEngine({
    getNav: () => ({
      vibrate: () => {
        throw new Error('blocked by user gesture policy');
      },
    }),
  });
  assert.doesNotThrow(() => {
    assert.equal(throwingEngine.vaultDustSnap(), false);
    assert.equal(throwingEngine.stopHaptics(), false);
  });
});

test('getScannerHapticStep matches the exact 3 escalating Bauni-Meter progress tiers', () => {
  assert.deepEqual(getScannerHapticStep(0), { durationMs: 12, intervalMs: 240 });
  assert.deepEqual(getScannerHapticStep(34.9), { durationMs: 12, intervalMs: 240 });
  assert.deepEqual(getScannerHapticStep(35), { durationMs: 18, intervalMs: 140 });
  assert.deepEqual(getScannerHapticStep(69.9), { durationMs: 18, intervalMs: 140 });
  assert.deepEqual(getScannerHapticStep(70), { durationMs: 24, intervalMs: 80 });
  assert.deepEqual(getScannerHapticStep(99), { durationMs: 24, intervalMs: 80 });
});

test('wheel peg tick enforces >= 22ms throttling guard so rapid frames never queue lag', () => {
  let clock = 1000;
  const calls: Array<number | number[]> = [];
  const engine = createHapticsEngine({
    getNav: () => ({
      vibrate: (pattern) => {
        calls.push(pattern);
        return true;
      },
    }),
    now: () => clock,
  });

  assert.equal(WHEEL_TICK_THROTTLE_MS, 22);
  assert.equal(engine.wheelPegTick(), true);
  clock += 10; // within 22ms window -> throttled
  assert.equal(engine.wheelPegTick(), false);
  clock += 11; // 21ms elapsed -> still throttled
  assert.equal(engine.wheelPegTick(), false);
  clock += 1; // 22ms elapsed -> fires cleanly
  assert.equal(engine.wheelPegTick(), true);

  assert.deepEqual(calls, [10, 10]);
});

test('all interactive haptic methods emit the exact specified vibration patterns and stopHaptics emits 0', () => {
  let clock = 100;
  const calls: Array<number | number[]> = [];
  const engine = createHapticsEngine({
    getNav: () => ({
      vibrate: (pattern) => {
        calls.push(pattern);
        return true;
      },
    }),
    now: () => clock,
  });

  engine.scannerPulse(10);
  engine.scannerPulse(50);
  engine.scannerPulse(85);
  engine.scannerVerdict();
  engine.wheelLand();
  engine.vaultKeypadTap();
  engine.vaultWrongCode();
  engine.vaultUnlock();
  engine.vaultStopRing();
  engine.vaultDustSnap();
  engine.vaultRewardReveal();
  engine.giftBoxWiggle();
  engine.giftBoxRibbonPeel();
  engine.giftBoxLidPop();
  engine.giftBoxReveal();
  engine.casePaperclip();
  engine.caseStamp();
  engine.scratchReveal();
  engine.cakeBlowout();
  // Immediate confettiCannon within 50ms dedupes so cake blowout doesn't double-buzz
  assert.equal(engine.confettiCannon(), false);
  clock += 60;
  assert.equal(engine.confettiCannon(), true);
  engine.dodgeTap();
  engine.summaryCopyTap();
  engine.cardFlip();
  engine.rankSlide();
  engine.stopHaptics();

  assert.deepEqual(calls, [
    12,
    18,
    24,
    [...HAPTIC_PATTERNS.scannerVerdict],
    [...HAPTIC_PATTERNS.wheelLand],
    10,
    [28, 35, 28],
    [15, 30, 25],
    16,
    [35, 25, 20, 22, 12],
    [20, 35, 38],
    [12, 85, 14],
    15,
    28,
    [18, 35, 30],
    12,
    24,
    [16, 30, 24],
    [20, 30, 35],
    [20, 30, 35],
    10,
    15,
    14,
    12,
    0,
  ]);
});
