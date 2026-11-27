import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HEADER_EASTER_EGG_MESSAGE,
  HEADER_EASTER_EGG_TARGET_TAPS,
  HEADER_EASTER_EGG_TOAST_FADE_MS,
  HEADER_EASTER_EGG_TOAST_VISIBLE_MS,
  HEADER_EASTER_EGG_WINDOW_MS,
  advanceHeaderTapStreak,
} from './headerEasterEgg';

test('5 quick taps within 1400ms unlock the secret header easter egg and reset count to 0', () => {
  assert.equal(HEADER_EASTER_EGG_TARGET_TAPS, 5);
  assert.equal(HEADER_EASTER_EGG_WINDOW_MS, 1400);
  assert.equal(HEADER_EASTER_EGG_TOAST_VISIBLE_MS, 2800);
  assert.equal(HEADER_EASTER_EGG_TOAST_FADE_MS, 240);
  assert.equal(HEADER_EASTER_EGG_MESSAGE, 'Okay, okay, stop poking the header, bauni!');
  assert.equal(/[—–-]/.test(HEADER_EASTER_EGG_MESSAGE), false);

  let count = 0;
  let lastTapMs: number | null = null;

  for (let tap = 1; tap <= 4; tap++) {
    const res = advanceHeaderTapStreak({ count, lastTapMs }, tap * 300);
    assert.equal(res.unlocked, false);
    assert.equal(res.nextCount, tap);
    count = res.nextCount;
    lastTapMs = res.nextLastTapMs;
  }

  const fifth = advanceHeaderTapStreak({ count, lastTapMs }, 1500);
  assert.equal(fifth.unlocked, true);
  assert.equal(fifth.nextCount, 0);
  assert.equal(fifth.nextLastTapMs, null);
});

test('gaps greater than 1400ms reset the tap streak cleanly to 1', () => {
  const tap1 = advanceHeaderTapStreak({ count: 0, lastTapMs: null }, 1000);
  const tap2 = advanceHeaderTapStreak(
    { count: tap1.nextCount, lastTapMs: tap1.nextLastTapMs },
    1500,
  );
  assert.equal(tap2.nextCount, 2);

  // Wait 1401ms -> resets cleanly to 1
  const expired = advanceHeaderTapStreak(
    { count: tap2.nextCount, lastTapMs: tap2.nextLastTapMs },
    2901,
  );
  assert.equal(expired.unlocked, false);
  assert.equal(expired.nextCount, 1);
  assert.equal(expired.nextLastTapMs, 2901);

  // Exact boundary 1400ms still counts
  const boundary = advanceHeaderTapStreak(
    { count: expired.nextCount, lastTapMs: expired.nextLastTapMs },
    2901 + 1400,
  );
  assert.equal(boundary.unlocked, false);
  assert.equal(boundary.nextCount, 2);
});
