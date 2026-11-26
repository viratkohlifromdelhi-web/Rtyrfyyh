import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecember2026Calendar,
  computeBirthdayCountdown,
  computeFriendshipDuration,
  computeLifeStats,
  formatCommaNumber,
  getOrderedFriendList,
  getRandomDateToast,
  type FriendRankEntry,
} from './birthdayMath';

test('December 2026 calendar fills 5 balanced rows with Nov 29-30, Dec 1-31, Jan 1-2 and highlights Dec 3', () => {
  const cells = buildDecember2026Calendar();
  assert.equal(cells.length, 35);
  assert.equal(cells[0].day, 29);
  assert.equal(cells[0].isCurrentMonth, false);
  assert.equal(cells[0].isWeekend, true);
  assert.equal(cells[1].day, 30);
  assert.equal(cells[1].isCurrentMonth, false);
  assert.equal(cells[2].day, 1);
  assert.equal(cells[2].isCurrentMonth, true);
  assert.equal(cells[4].day, 3);
  assert.equal(cells[4].isBirthday, true);
  assert.equal(cells[33].day, 1);
  assert.equal(cells[33].isCurrentMonth, false);
  assert.equal(cells[34].day, 2);
  assert.equal(cells[34].isCurrentMonth, false);
  assert.equal(cells[34].isWeekend, true);

  const decDays = cells.filter((c) => c.isCurrentMonth);
  assert.equal(decDays.length, 31);
});

test('computeBirthdayCountdown handles upcoming, today, and passed states and getRandomDateToast returns a cheeky line', () => {
  const upcoming = computeBirthdayCountdown(new Date(2026, 10, 27, 15, 0, 0));
  assert.equal(upcoming.status, 'upcoming');
  assert.equal(upcoming.daysLeft, 6);
  assert.equal(upcoming.label, '6 days left till Morgan turns 17');

  const today = computeBirthdayCountdown(new Date(2026, 11, 3, 12, 0, 0));
  assert.equal(today.status, 'today');

  const passed = computeBirthdayCountdown(new Date(2026, 11, 10, 12, 0, 0));
  assert.equal(passed.status, 'passed');

  const toast = getRandomDateToast(14);
  assert.ok(toast.length > 5);
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

test('getOrderedFriendList places Morgan at Rank #2 right behind Abhay when override is active', () => {
  const base: FriendRankEntry[] = [
    { id: 'abhay', name: 'Abhay', tag: 'Day-1 bro' },
    { id: 'ankit', name: 'Ankit', tag: 'Homie' },
    { id: 'ayush', name: 'Ayush', tag: 'Homie' },
    { id: 'harsh', name: 'Harsh', tag: 'Homie' },
    { id: 'morgan', name: 'Morgan', tag: 'Greatest HG', isAnamika: true },
  ];

  const defaultOrder = getOrderedFriendList(base, false);
  assert.deepEqual(
    defaultOrder.map((f) => f.name),
    ['Abhay', 'Ankit', 'Ayush', 'Harsh', 'Morgan'],
  );

  const overridden = getOrderedFriendList(base, true);
  assert.deepEqual(
    overridden.map((f) => f.name),
    ['Abhay', 'Morgan', 'Ankit', 'Ayush', 'Harsh'],
  );
  assert.equal(overridden[1].id, 'morgan');
  assert.equal(overridden.length, 5);
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
