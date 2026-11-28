import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAPTIC_PATTERNS,
  TAPLI_DEBOUNCE_MS,
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

  const blockedEngine = createHapticsEngine({
    getNav: () => ({
      vibrate: () => false,
    }),
  });
  assert.equal(blockedEngine.isSupported(), true);
  assert.equal(blockedEngine.tap(), false);
  assert.equal(blockedEngine.trigger('celebrate'), false);

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

test('getScannerHapticStep matches the 3 Android-noticeable escalating Bauni-Meter progress tiers', () => {
  assert.deepEqual(getScannerHapticStep(0), { durationMs: 20, intervalMs: 240 });
  assert.deepEqual(getScannerHapticStep(34.9), { durationMs: 20, intervalMs: 240 });
  assert.deepEqual(getScannerHapticStep(35), { durationMs: 28, intervalMs: 140 });
  assert.deepEqual(getScannerHapticStep(69.9), { durationMs: 28, intervalMs: 140 });
  assert.deepEqual(getScannerHapticStep(70), { durationMs: 36, intervalMs: 80 });
  assert.deepEqual(getScannerHapticStep(99), { durationMs: 36, intervalMs: 80 });
});

test('wheel peg tick and tapliHit enforce 35ms debounce cleanly and never wedge on clock resets', () => {
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
  assert.equal(TAPLI_DEBOUNCE_MS, 35);
  assert.equal(engine.wheelPegTick(), true);
  clock += 20;
  assert.equal(engine.wheelPegTick(), false);
  clock += 14;
  assert.equal(engine.tick(), false);
  clock += 1;
  assert.equal(engine.wheelPegTick(), true);

  // Rapid Tapli hits: blocked only within 35ms, allowed at >= 35ms
  assert.equal(engine.tapliHit(1), true);
  clock += 20;
  assert.equal(engine.tapliHit(1), false);
  clock += 15;
  assert.equal(engine.tapliHit(3), true);

  // Clock jump backwards must never permanently wedge future ticks
  clock = 50;
  assert.equal(engine.tick(), true);
  assert.equal(engine.tapliHit(2), true);

  assert.deepEqual(calls, [16, 16, 28, [24, 30, 32], 16, 28]);
});

test('upgraded Android haptic presets and interactive methods emit exact noticeable vibration patterns', () => {
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
  engine.pop();
  engine.bonk();
  engine.success();
  engine.unlock();
  clock += 60;
  engine.celebrate();
  engine.error();
  engine.shake();
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
    20,
    20,
    32,
    32,
    28,
    [25, 45, 40],
    [25, 45, 40],
    [30, 45, 35, 45, 55],
    [45, 35, 45],
    [45, 35, 45],
    [45, 35, 45],
    20,
    28,
    36,
    [...HAPTIC_PATTERNS.scannerVerdict],
    32,
    [...HAPTIC_PATTERNS.wheelLand],
    20,
    [45, 35, 45],
    [25, 45, 40],
    32,
    [38, 28, 26, 28, 20],
    [30, 45, 35, 45, 55],
    32,
    32,
    32,
    [30, 45, 35, 45, 55],
    20,
    32,
    [25, 45, 40],
    [30, 45, 35, 45, 55],
    [30, 45, 35, 45, 55],
    20,
    20,
    20,
    20,
    20,
    20,
    32,
    20,
    24,
    0,
  ]);
});
