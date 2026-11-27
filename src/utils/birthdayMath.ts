export interface CalendarCell {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  isBirthday: boolean;
  isWeekend: boolean;
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
  instagramHandle?: string;
  instagramUrl?: string;
  isAnamika?: boolean;
}

export interface BirthdayCountdown {
  status: 'upcoming' | 'today' | 'passed';
  daysLeft: number;
  label: string;
}

// 21 July 2026, 12:29 AM IST — First Instagram DM timestamp
export const FRIENDSHIP_START_ISO = '2026-07-21T00:29:00+05:30';

const CHEEKY_DATE_TOASTS = [
  'Wrong date, tap 3 👀',
  'Just a normal boring day',
  'Still a bauni on this day too',
  'Nope, tap 3 for the actual birthday 😂',
  'Regular day, zero birthday cake 🍰',
  'Nice try, scroll your thumb to 3',
] as const;

export function getRandomDateToast(day: number): string {
  const index = Math.abs(day) % CHEEKY_DATE_TOASTS.length;
  return CHEEKY_DATE_TOASTS[index];
}

/**
 * Generates the exact 5-row monthly calendar grid for December 2026 (Sun–Sat).
 * December 1, 2026 falls on Tuesday (weekday index 2), so leading cells are
 * Nov 29 & 30 and trailing cells are Jan 1 & 2 (35 cells total).
 */
export function buildDecember2026Calendar(): CalendarCell[] {
  const firstDayWeekday = new Date(2026, 11, 1).getDay(); // 2 = Tuesday
  const prevMonthDays = new Date(2026, 11, 0).getDate(); // 30 days in Nov 2026
  const totalDays = 31;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    const day = prevMonthDays - firstDayWeekday + 1 + i;
    const col = cells.length % 7;
    cells.push({
      key: `prev-${day}`,
      day,
      isCurrentMonth: false,
      isBirthday: false,
      isWeekend: col === 0 || col === 6,
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    const col = cells.length % 7;
    cells.push({
      key: `dec-${day}`,
      day,
      isCurrentMonth: true,
      isBirthday: day === 3,
      isWeekend: col === 0 || col === 6,
    });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const col = cells.length % 7;
    cells.push({
      key: `next-${nextDay}`,
      day: nextDay,
      isCurrentMonth: false,
      isBirthday: false,
      isWeekend: col === 0 || col === 6,
    });
    nextDay += 1;
  }

  return cells;
}

/**
 * Extracts the calendar date (YYYY-MM-DD) in India Standard Time (Asia/Kolkata, UTC+05:30)
 * as a UTC midnight timestamp so day diffs are timezone-independent worldwide.
 */
function getIstDayStartUtcMs(date: Date): number {
  try {
    const istDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    const [y, m, d] = istDateStr.split('-').map(Number);
    if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
      return Date.UTC(y, m - 1, d);
    }
  } catch {
    // Fallback to fixed +05:30 offset if Intl timezone data is unavailable
  }
  const istShifted = new Date(date.getTime() + 330 * 60 * 1000);
  return Date.UTC(
    istShifted.getUTCFullYear(),
    istShifted.getUTCMonth(),
    istShifted.getUTCDate(),
  );
}

// 03 December 2026, 12:00 AM IST — Morgan's 17th birthday target
export const BIRTHDAY_2026_IST_ISO = '2026-12-03T00:00:00+05:30';

/**
 * Computes a live birthday countdown strip message toward 03 December 2026 (IST).
 */
export function computeBirthdayCountdown(
  now: Date,
  birthdayDate: Date = new Date(BIRTHDAY_2026_IST_ISO),
): BirthdayCountdown {
  const startOfToday = getIstDayStartUtcMs(now);
  const startOfBday = getIstDayStartUtcMs(birthdayDate);

  const dayDiff = Math.round((startOfBday - startOfToday) / 86400000);

  if (dayDiff > 1) {
    return {
      status: 'upcoming',
      daysLeft: dayDiff,
      label: `${dayDiff} days left till Morgan turns 17`,
    };
  }
  if (dayDiff === 1) {
    return {
      status: 'upcoming',
      daysLeft: 1,
      label: '1 day left till Morgan turns 17',
    };
  }
  if (dayDiff === 0) {
    return {
      status: 'today',
      daysLeft: 0,
      label: "It's today! Happy 17th Birthday, Morgan!",
    };
  }
  return {
    status: 'passed',
    daysLeft: 0,
    label: 'Morgan turned 17 on 03 Dec 2026',
  };
}

/**
 * Computes elapsed days/hours/minutes/seconds since 21 July 2026, 12:29 AM IST.
 */
export function computeFriendshipDuration(
  now: Date,
  start: Date = new Date(FRIENDSHIP_START_ISO),
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
 * When override is active, Morgan moves right to #2 (below Abhay at #1 and above Ankit, Ayush, Harsh).
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
  if (!anamika) {
    return [...baseList];
  }
  if (others.length === 0) {
    return [anamika];
  }
  return [others[0], anamika, ...others.slice(1)];
}

// 03 December 2009, 12:00 AM IST — Anamika's birth timestamp
export const ANAMIKA_BIRTH_ISO = '2009-12-03T00:00:00+05:30';
export const LUNAR_SYNODIC_DAYS = 29.53;

export interface LifeStats {
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  fullMoons: number;
}

/**
 * Calculates live cumulative Time on Earth metrics from 03 December 2009 00:00:00 IST
 * up to `now`, including Full Moons witnessed (`Math.floor(totalDays / 29.53)`).
 */
export function computeLifeStats(
  now: Date,
  birthDate: Date = new Date(ANAMIKA_BIRTH_ISO),
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
