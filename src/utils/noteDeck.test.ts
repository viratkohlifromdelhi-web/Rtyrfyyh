import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIRTHDAY_TRUCE_NOTES,
  NO_FILTER_NOTES,
  formatCardCounter,
  getModeLabel,
  getNextCardIndex,
  getNotesForMode,
  getVisibleStackIndices,
  shouldCommitSwipe,
} from './noteDeck';

test('note decks contain 4 authentic notes per mode with zero Roast/Wholesome buzzwords or dashes', () => {
  assert.equal(NO_FILTER_NOTES.length, 4);
  assert.equal(BIRTHDAY_TRUCE_NOTES.length, 4);
  assert.equal(getModeLabel('noFilter'), 'No Filter');
  assert.equal(getModeLabel('birthdayTruce'), 'Birthday Truce');

  const allText = [...getNotesForMode('noFilter'), ...getNotesForMode('birthdayTruce')]
    .map((n) => n.text)
    .join(' ');
  assert.equal(/\broast\b|\bwholesome\b/i.test(allText), false);
  assert.equal(/[—–-]/.test(allText), false);
});

test('getNextCardIndex and getVisibleStackIndices cycle endlessly through the 4-card stack', () => {
  assert.equal(getNextCardIndex(0, 4), 1);
  assert.equal(getNextCardIndex(3, 4), 0);
  assert.deepEqual(getVisibleStackIndices(0, 4), [0, 1, 2]);
  assert.deepEqual(getVisibleStackIndices(3, 4), [3, 0, 1]);
});

test('formatCardCounter formats crisp compact header tags for both modes', () => {
  assert.equal(formatCardCounter('noFilter', 0, 4), 'NO FILTER · 01/04');
  assert.equal(formatCardCounter('birthdayTruce', 2, 4), 'BIRTHDAY TRUCE · 03/04');
});

test('shouldCommitSwipe commits left/right on threshold distance or quick flick and snaps back otherwise', () => {
  assert.equal(shouldCommitSwipe(-75, 0.1), 'left');
  assert.equal(shouldCommitSwipe(82, 0.1), 'right');
  assert.equal(shouldCommitSwipe(-34, -0.52), 'left');
  assert.equal(shouldCommitSwipe(36, 0.6), 'right');
  assert.equal(shouldCommitSwipe(22, 0.1), null);
  assert.equal(shouldCommitSwipe(-40, -0.2), null);
});
