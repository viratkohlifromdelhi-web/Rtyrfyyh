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
  assert.equal(noNavEngine.isSupported(), false);
  assert.equal(noNavEngine.isEnabled(), true);
  assert.equal(noNavEngine.tap(), false);
  assert.equal(noNavEngine.vaultKeypadTap(), false);
  assert.equal(noNavEngine.stopHaptics(), false);

  const safariEngine = createHapticsEngine({ getNav: () => ({}) });
  assert.equal(safariEngine.isSupported(), false);
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
    assert.equal(throwingEngine.celebrate(), false);
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

test('wheel peg tick enforces 35ms throttle cleanly and never gets stuck on clock resets', () => {
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

  assert.equal(WHEEL_TICK_THROTTLE_MS, 35);
  assert.equal(engine.wheelPegTick(), true);
  clock += 20; // within 35ms window -> throttled
  assert.equal(engine.wheelPegTick(), false);
  clock += 14; // 34ms elapsed -> still throttled
  assert.equal(engine.tick(), false);
  clock += 1; // 35ms elapsed -> fires cleanly
  assert.equal(engine.wheelPegTick(), true);

  // Clock jump backwards must never permanently wedge future ticks
  clock = 50;
  assert.equal(engine.tick(), true);

  assert.deepEqual(calls, [8, 8, 8]);
});

test('standardized base patterns and all interactive methods emit exact expected vibration patterns', () => {
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

  assert.equal(engine.isSupported(), true);
  assert.equal(engine.isEnabled(), true);

  // Standardized base methods
  engine.tap();
  engine.light();
  engine.medium();
  engine.success();
  clock += 60;
  engine.celebrate();
  engine.error();
  engine.bump();

  // Feature-specific methods
  engine.scannerPulse(10);
  engine.scannerPulse(50);
  engine.scannerPulse(85);
  engine.scannerVerdict();
  engine.wheelSpinStart();
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

  clock += 60;
  engine.cakeBlowout();
  // Immediate confettiCannon within 50ms dedupes so cake blowout doesn't double-buzz
  assert.equal(engine.confettiCannon(), false);
  clock += 60;
  assert.equal(engine.confettiCannon(), true);

  engine.dodgeTap();
  engine.summaryCopyTap();
  engine.cardFlip();
  engine.heroPopConfetti();
  engine.heroOpenGift();
  engine.rankSlide();
  engine.timelineNodeClimax();
  engine.timelineReceiptJump();
  engine.footerChibiReplay();
  engine.stopHaptics();

  assert.deepEqual(calls, [
    12,
    12,
    18,
    [18, 45, 28],
    [18, 45, 28],
    [25, 35, 25],
    [25, 35, 25],
    12,
    18,
    24,
    [...HAPTIC_PATTERNS.scannerVerdict],
    18,
    [...HAPTIC_PATTERNS.wheelLand],
    12,
    [25, 35, 25],
    [18, 45, 28],
    18,
    [35, 25, 20, 22, 12],
    [18, 45, 28],
    18,
    18,
    18,
    [18, 45, 28],
    12,
    18,
    [18, 45, 28],
    [18, 45, 28],
    [18, 45, 28],
    12,
    12,
    12,
    12,
    12,
    12,
    18,
    12,
    12,
    0,
  ]);
});
