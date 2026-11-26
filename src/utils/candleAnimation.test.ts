import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDLE_SPECS,
  CANDLE_TIMING,
  getBlowOutCompleteDelayMs,
  getRelightCompleteDelayMs,
} from './candleAnimation';

test('defines 5 candles with distinct staggered flame durations and left-to-right ordering', () => {
  assert.equal(CANDLE_SPECS.length, 5);

  // Strictly increasing horizontal positions
  for (let i = 1; i < CANDLE_SPECS.length; i++) {
    assert.ok(
      CANDLE_SPECS[i].cx > CANDLE_SPECS[i - 1].cx,
      'candles should be ordered left to right',
    );
  }

  // Distinct organic flame durations across all 5 candles
  const uniqueDurations = new Set(CANDLE_SPECS.map((c) => c.flameDurSec));
  assert.equal(uniqueDurations.size, 5);
  assert.deepEqual(
    CANDLE_SPECS.map((c) => c.flameDur),
    ['0.70s', '0.85s', '0.95s', '0.78s', '0.90s'],
  );
});

test('blow-out sequence waits for all 5 wind-gust flames to finish before switching to out', () => {
  assert.equal(CANDLE_TIMING.gustDurationMs, 250);
  assert.equal(CANDLE_TIMING.emberDurationMs, 1200);
  assert.equal(CANDLE_TIMING.smokeDurationMs, 1800);

  const lastGustEnd =
    CANDLE_SPECS[CANDLE_SPECS.length - 1].gustDelayMs +
    CANDLE_TIMING.gustDurationMs;
  const completeDelay = getBlowOutCompleteDelayMs(CANDLE_SPECS);

  assert.ok(
    completeDelay >= lastGustEnd,
    `blow-out delay (${completeDelay}ms) must not cut off last flame gust (${lastGustEnd}ms)`,
  );
  assert.ok(
    completeDelay <= 340,
    'blow-out transition should remain crisp right after the ~0.25s gust',
  );
});

test('relight ignite sequence staggers candles left-to-right by 100ms and settles cleanly', () => {
  assert.deepEqual(
    CANDLE_SPECS.map((c) => c.relightDelayMs),
    [0, 100, 200, 300, 400],
  );

  const lastSparkleEnd = 400 + CANDLE_TIMING.sparkleDurationMs;
  const lastIgniteEnd = 400 + CANDLE_TIMING.igniteDurationMs;
  const completeDelay = getRelightCompleteDelayMs(CANDLE_SPECS);

  assert.ok(completeDelay >= lastIgniteEnd);
  assert.ok(completeDelay >= lastSparkleEnd);
});
