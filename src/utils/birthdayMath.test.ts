import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecember2026Calendar,
  computeFriendshipDuration,
  computeLifeStats,
  formatCommaNumber,
  getOrderedFriendList,
  type FriendRankEntry,
} from './birthdayMath';

test('December 2026 calendar starts on Tuesday (index 2) and highlights Dec 3', () => {
  const cells = buildDecember2026Calendar();
  assert.equal(cells[0].day, null); // Sun
  assert.equal(cells[1].day, null); // Mon
  assert.equal(cells[2].day, 1);    // Tue Dec 1
  assert.equal(cells[4].day, 3);    // Thu Dec 3
  assert.equal(cells[4].isBirthday, true);

  const numberedDays = cells.filter((c) => c.day !== null);
  assert.equal(numberedDays.length, 31);
  assert.equal(cells.length % 7, 0);
});

test('computeFriendshipDuration calculates accurate elapsed time since 22 July 2026', () => {
  const start = new Date(2026, 6, 22, 0, 0, 0);
  const target = new Date(2026, 10, 24, 10, 30, 45); // Nov 24, 2026 10:30:45
  const duration = computeFriendshipDuration(target, start);
  assert.equal(duration.totalDays, 125);
  assert.equal(duration.hours, 10);
  assert.equal(duration.minutes, 30);
  assert.equal(duration.seconds, 45);
});

test('computeFriendshipDuration clamps cleanly to zero if date is before start', () => {
  const start = new Date(2026, 6, 22, 0, 0, 0);
  const before = new Date(2026, 5, 1, 0, 0, 0);
  const duration = computeFriendshipDuration(before, start);
  assert.deepEqual(duration, { totalDays: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('getOrderedFriendList promotes Anamika (Morgan) straight to Rank #1 when override is active', () => {
  const base: FriendRankEntry[] = [
    { id: 'f1', name: 'Aarav', tag: 'Day-1 bro' },
    { id: 'f2', name: 'Rohan', tag: 'Gaming duo' },
    { id: 'f3', name: 'Kabir', tag: 'Cricket gang' },
    { id: 'anamika', name: 'Anamika (Morgan)', tag: 'Undisputed Greatest HG', isAnamika: true },
  ];

  const defaultOrder = getOrderedFriendList(base, false);
  assert.equal(defaultOrder[0].id, 'f1');
  assert.equal(defaultOrder[3].id, 'anamika');

  const overridden = getOrderedFriendList(base, true);
  assert.equal(overridden[0].id, 'anamika');
  assert.equal(overridden.length, 4);
});

test('computeLifeStats accurately calculates days, hours, minutes, seconds, and full moons since 03 Dec 2009', () => {
  const birth = new Date(2009, 11, 3, 0, 0, 0);
  const exact17th = new Date(2026, 11, 3, 0, 0, 0);
  const stats = computeLifeStats(exact17th, birth);

  assert.equal(stats.totalDays, 6209);
  assert.equal(stats.totalHours, 6209 * 24);
  assert.equal(stats.totalMinutes, 6209 * 24 * 60);
  assert.equal(stats.totalSeconds, 6209 * 24 * 60 * 60);
  assert.equal(stats.fullMoons, Math.floor(6209 / 29.53));
  assert.equal(formatCommaNumber(stats.totalDays), '6,209');
  assert.equal(formatCommaNumber(stats.totalSeconds), '536,457,600');
});
