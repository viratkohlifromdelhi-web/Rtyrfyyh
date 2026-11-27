import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUFF_GATE_COPY,
  BLUFF_PASSCODE,
  evaluateBluffPasscode,
  sanitizeBluffPasscodeInput,
} from './secretBluffGate';

test('evaluateBluffPasscode unlocks bluff strictly on 1507 and preserves owner 9876 without error', () => {
  assert.equal(BLUFF_PASSCODE, '1507');
  assert.equal(evaluateBluffPasscode('1507'), 'unlock_bluff');
  assert.equal(evaluateBluffPasscode(' 1507 '), 'unlock_bluff');
  assert.equal(evaluateBluffPasscode('9876'), 'ignore_owner');
  assert.equal(evaluateBluffPasscode('1845'), 'wrong');
  assert.equal(evaluateBluffPasscode('0000'), 'wrong');
  assert.equal(evaluateBluffPasscode(''), 'wrong');
});

test('sanitizeBluffPasscodeInput strips non-digits and clamps to 6 characters', () => {
  assert.equal(sanitizeBluffPasscodeInput('15a07!'), '1507');
  assert.equal(sanitizeBluffPasscodeInput('123456789'), '123456');
  assert.equal(sanitizeBluffPasscodeInput('abcd'), '');
});

test('BLUFF_GATE_COPY preserves exact requested headline spelling and contains zero visible dashes', () => {
  assert.equal(
    `${BLUFF_GATE_COPY.revealHeadlineLead} ${BLUFF_GATE_COPY.revealHeadlinePunch}`,
    'Ho gya scam? No Suprises Ahead!!',
  );
  assert.equal(BLUFF_GATE_COPY.revealHeadlineFull, 'Ho gya scam? No Suprises Ahead!!');

  const dashRegex = /[\u2014\u2013-]/;
  for (const [key, value] of Object.entries(BLUFF_GATE_COPY)) {
    assert.equal(
      dashRegex.test(value),
      false,
      `BLUFF_GATE_COPY.${key} must not contain any visible dashes: "${value}"`,
    );
  }
});
