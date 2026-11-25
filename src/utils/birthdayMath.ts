export interface CalendarCell {
  key: string;
  day: number | null;
  isBirthday: boolean;
}

export interface FriendshipDuration {
  totalDays: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface FriendRankEntry {
  id: string;
  name: string;
  tag: string;
  isAnamika?: boolean;
}

// 22 July 2026 — The Instagram plot twist date
export const FRIENDSHIP_START_ISO = '2026-07-22T00:00:00';

/**
 * Generates the exact monthly calendar grid for December 2026 (Sun–Sat).
 * December 1, 2026 falls on Tuesday (weekday index 2).
 */
export function buildDecember2026Calendar(): CalendarCell[] {
  const firstDayWeekday = new Date(2026, 11, 1).getDay(); // 2 = Tuesday
  const totalDays = 31;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    cells.push({
      key: `empty-start-${i}`,
      day: null,
      isBirthday: false,
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    cells.push({
      key: `dec-${day}`,
      day,
      isBirthday: day === 3,
    });
  }

  // Pad trailing blanks so grid rows stay clean
  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      day: null,
      isBirthday: false,
    });
  }

  return cells;
}

/**
 * Computes elapsed days/hours/minutes/seconds since 22 July 2026.
 */
export function computeFriendshipDuration(
  now: Date,
  start: Date = new Date(2026, 6, 22, 0, 0, 0),
): FriendshipDuration {
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalDays = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalDays, hours, minutes, seconds };
}

/**
 * Returns the friend leaderboard order before and after "Friend List Override".
 */
export function getOrderedFriendList(
  baseList: FriendRankEntry[],
  overrideActive: boolean,
): FriendRankEntry[] {
  if (!overrideActive) {
    return [...baseList];
  }
  const anamika = baseList.find((item) => item.isAnamika);
  const others = baseList.filter((item) => !item.isAnamika);
  return anamika ? [anamika, ...others] : [...baseList];
}

// 03 December 2009 — Anamika's birth timestamp
export const ANAMIKA_BIRTH_ISO = '2009-12-03T00:00:00';
export const LUNAR_SYNODIC_DAYS = 29.53;

export interface LifeStats {
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  fullMoons: number;
}

/**
 * Calculates live cumulative Time on Earth metrics from 03 December 2009 00:00:00
 * up to `now`, including Full Moons witnessed (`Math.floor(totalDays / 29.53)`).
 */
export function computeLifeStats(
  now: Date,
  birthDate: Date = new Date(2009, 11, 3, 0, 0, 0),
): LifeStats {
  const diffMs = Math.max(0, now.getTime() - birthDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);
  const fullMoons = Math.floor(totalDays / LUNAR_SYNODIC_DAYS);

  return {
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
    fullMoons,
  };
}

export function formatCommaNumber(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('en-US');
}
