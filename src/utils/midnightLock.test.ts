import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUNTDOWN_BLUFF_COPY,
  MIDNIGHT_BLUFF_0312_CODE,
  MIDNIGHT_BLUFF_1507_CODE,
  MIDNIGHT_BYPASS_CODE,
  MIDNIGHT_BYPASS_STORAGE_KEY,
  UNLOCK_TIME_MS,
  computeCountdownParts,
  evaluateMidnightBypassCode,
  readMidnightBypass,
  shouldShowMidnightLock,
  writeMidnightBypass,
  type SessionStorageLike,
} from './midnightLock.ts';

function createMemorySessionStorage(): SessionStorageLike {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

test('UNLOCK_TIME_MS matches exact 12:00 AM IST on December 3, 2026', () => {
  // 2026-12-03 00:00:00+05:30 === 2026-12-02T18:30:00.000Z
  assert.equal(new Date(UNLOCK_TIME_MS).toISOString(), '2026-12-02T18:30:00.000Z');
  assert.equal(MIDNIGHT_BYPASS_STORAGE_KEY, 'morgan_midnight_bypass_v1');
  assert.equal(MIDNIGHT_BYPASS_CODE, '9876');
  assert.equal(MIDNIGHT_BLUFF_1507_CODE, '1507');
  assert.equal(MIDNIGHT_BLUFF_0312_CODE, '0312');
});

test('shouldShowMidnightLock gates before midnight unless bypassed and never renders at or after midnight', () => {
  const storage = createMemorySessionStorage();
  const beforeMidnight = UNLOCK_TIME_MS - 10_000;

  assert.equal(shouldShowMidnightLock(beforeMidnight, storage), true);
  assert.equal(readMidnightBypass(storage), false);

  writeMidnightBypass(storage);
  assert.equal(readMidnightBypass(storage), true);
  assert.equal(shouldShowMidnightLock(beforeMidnight, storage), false);

  // Even without bypass, once midnight arrives it is unlocked
  const freshStorage = createMemorySessionStorage();
  assert.equal(shouldShowMidnightLock(UNLOCK_TIME_MS, freshStorage), false);
  assert.equal(shouldShowMidnightLock(UNLOCK_TIME_MS + 60_000, freshStorage), false);
});

test('computeCountdownParts calculates tabular Days/Hours/Mins/Secs, final-5s pulse, and midnight zero', () => {
  const twoDaysPlus = UNLOCK_TIME_MS - ((2 * 86400 + 5 * 3600 + 9 * 60 + 42) * 1000);
  const parts = computeCountdownParts(twoDaysPlus);
  assert.equal(parts.daysStr, '02');
  assert.equal(parts.hoursStr, '05');
  assert.equal(parts.minsStr, '09');
  assert.equal(parts.secsStr, '42');
  assert.equal(parts.isFinalFiveSeconds, false);
  assert.equal(parts.isUnlocked, false);

  const fiveSecLeft = computeCountdownParts(UNLOCK_TIME_MS - 5000);
  assert.equal(fiveSecLeft.secsStr, '05');
  assert.equal(fiveSecLeft.isFinalFiveSeconds, true);
  assert.equal(fiveSecLeft.isUnlocked, false);

  const oneSecLeft = computeCountdownParts(UNLOCK_TIME_MS - 400);
  assert.equal(oneSecLeft.secsStr, '01');
  assert.equal(oneSecLeft.isFinalFiveSeconds, true);
  assert.equal(oneSecLeft.isUnlocked, false);

  const atMidnight = computeCountdownParts(UNLOCK_TIME_MS);
  assert.equal(atMidnight.daysStr, '00');
  assert.equal(atMidnight.hoursStr, '00');
  assert.equal(atMidnight.minsStr, '00');
  assert.equal(atMidnight.secsStr, '00');
  assert.equal(atMidnight.isFinalFiveSeconds, false);
  assert.equal(atMidnight.isUnlocked, true);
});

test('evaluateMidnightBypassCode handles 9876 bypass, 1507 clown bluff, 0312 hand bluff, and wrong codes', () => {
  assert.equal(evaluateMidnightBypassCode('9876'), 'bypass');
  assert.equal(evaluateMidnightBypassCode(' 9876 '), 'bypass');
  assert.equal(evaluateMidnightBypassCode('1507'), 'bluff_1507');
  assert.equal(evaluateMidnightBypassCode('0312'), 'bluff_0312');
  assert.equal(evaluateMidnightBypassCode('1845'), 'wrong');
  assert.equal(evaluateMidnightBypassCode('0000'), 'wrong');
  assert.equal(evaluateMidnightBypassCode('9875'), 'wrong');
});

test('COUNTDOWN_BLUFF_COPY preserves exact spelling for 1507 and 0312 and has zero visible dashes', () => {
  assert.equal(COUNTDOWN_BLUFF_COPY['1507'].headlineFull, 'Ho gya scam? No Suprises Ahead!!');
  assert.equal(
    `${COUNTDOWN_BLUFF_COPY['1507'].headlineLead} ${COUNTDOWN_BLUFF_COPY['1507'].headlinePunch}`,
    'Ho gya scam? No Suprises Ahead!!',
  );
  assert.equal(COUNTDOWN_BLUFF_COPY['0312'].headlineFull, 'You have again become a stupid.');
  assert.equal(
    `${COUNTDOWN_BLUFF_COPY['0312'].headlineLead} ${COUNTDOWN_BLUFF_COPY['0312'].headlinePunch}`,
    'You have again become a stupid.',
  );
  assert.equal(COUNTDOWN_BLUFF_COPY['0312'].subtext, "Please don't try again.");

  const dashRegex = /[\u2014\u2013-]/;
  for (const [code, fields] of Object.entries(COUNTDOWN_BLUFF_COPY)) {
    for (const [key, value] of Object.entries(fields)) {
      assert.equal(
        dashRegex.test(value),
        false,
        `COUNTDOWN_BLUFF_COPY[${code}].${key} must contain zero dashes: "${value}"`,
      );
    }
  }
});
