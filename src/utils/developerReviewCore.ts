/**
 * Pure domain logic, sanitization, formatting, Modino rating reaction builder,
 * localStorage sent-history helpers, and owner-dashboard summary aggregators
 * for the "Before You Say Bye" Developer Review & Postcard Card.
 *
 * Strictly enforces ZERO visible dashes (`-`, `–`, `—`) in all rendered user-facing text.
 */

import type { ModinoReaction } from './modinoReactions';

export const DEVELOPER_REVIEW_COLLECTION = 'developer_reviews' as const;
export const SENT_REVIEWS_STORAGE_KEY = 'bauni_sent_developer_reviews' as const;
export const TAPLI_SESSION_STORAGE_KEY = 'bauni_tapli_session_total' as const;

export const MAX_FAVORITE_SELECTIONS = 3;
export const MAX_REVIEW_MESSAGE_LENGTH = 1000;
export const MAX_LOCAL_SENT_HISTORY = 30;

export const DEVELOPER_REVIEW_FAVORITES = [
  'Origin Story Play',
  'Modino Pet',
  'Baad Me Reveal',
  'Tapli Arena',
  'Mini Chicken Farm',
  'Friend List',
  'Cake & Gift Vault',
  'Literally Everything',
] as const;

export type DeveloperReviewFavorite = (typeof DEVELOPER_REVIEW_FAVORITES)[number];

export const DEVELOPER_REVIEW_STARTERS = [
  "Honestly I didn't expect...",
  'My favorite roast was...',
  'Next year you owe me...',
] as const;

export type DeveloperReviewRating = 0 | 1 | 2 | 3 | 4 | 5 | 10;
export type ValidSubmittedRating = 1 | 2 | 3 | 4 | 5 | 10;
export type ReviewDeviceType = 'Mobile' | 'Tablet' | 'Desktop';

export interface LocalSentDeveloperReview {
  reviewId: string;
  rating: ValidSubmittedRating;
  isBonusRating: boolean;
  bestThings: DeveloperReviewFavorite[];
  message: string;
  noteNumber: number;
  submittedAtMs: number;
  submittedAtIST: string;
  deviceType: ReviewDeviceType;
  sessionTaplis: number;
}

export interface DeveloperReviewWriteFields {
  reviewId: string;
  rating: ValidSubmittedRating;
  isBonusRating: boolean;
  bestThings: DeveloperReviewFavorite[];
  message: string;
  noteNumber: number;
  submittedAtMs: number;
  submittedAtIST: string;
  sessionId: string;
  deviceType: ReviewDeviceType;
  sessionTaplis: number;
}

export interface DeveloperReviewDashboardRecord {
  reviewId: string;
  rating: number;
  isBonusRating: boolean;
  bestThings: string[];
  message: string;
  noteNumber: number;
  submittedAtMs: number;
  submittedAtIST: string;
  sessionId: string;
  deviceType: ReviewDeviceType;
  sessionTaplis: number;
}

export interface DeveloperReviewSummaryStats {
  totalNotes: number;
  averageRating: number | null;
  averageRatingLabel: string;
  topFavorite: string;
}

const VALID_FAVORITES_SET = new Set<string>(DEVELOPER_REVIEW_FAVORITES);

/**
 * Strips any visible dash variants (`-`, `–`, `—`) from user-facing display strings.
 */
export function stripVisibleDashes(input: string): string {
  return input.replace(/[-–—]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Handles star taps including the Secret 10 / 5 Easter Egg:
 * tapping the 5th star once selects 5; tapping the 5th star again upgrades to 10 / 5.
 */
export function computeNextStarRating(
  current: DeveloperReviewRating,
  tappedStar: 1 | 2 | 3 | 4 | 5,
): { rating: ValidSubmittedRating; triggeredBonus: boolean } {
  if (tappedStar === 5 && (current === 5 || current === 10)) {
    return { rating: 10, triggeredBonus: true };
  }
  return { rating: tappedStar, triggeredBonus: false };
}

/**
 * Fixed-height live reaction caption displayed below the 5-star row.
 */
export function getRatingReactionCaption(rating: DeveloperReviewRating): string {
  switch (rating) {
    case 1:
      return '1 star?! After 2 hours of Baad Me?! Harsh!';
    case 2:
      return "2 stars?! Okay, deducting points for the 5'2 jokes?";
    case 3:
      return '3 stars! Safe passing marks achieved.';
    case 4:
      return '4 stars! So close to perfection, respect!';
    case 5:
      return '5 out of 5! Official masterpiece status unlocked!';
    case 10:
      return '10 out of 5?! Adinomide is framing this forever!';
    default:
      return 'Tap a star to rate the effort';
  }
}

/**
 * Toggles a favorite feature chip with a max selection cap (default 3).
 * Tapping a 4th chip gently swaps out the oldest selected chip.
 */
export function toggleFavoriteChip(
  selected: readonly DeveloperReviewFavorite[],
  chip: DeveloperReviewFavorite,
  maxSelections = MAX_FAVORITE_SELECTIONS,
): DeveloperReviewFavorite[] {
  if (selected.includes(chip)) {
    return selected.filter((item) => item !== chip);
  }
  if (selected.length < maxSelections) {
    return [...selected, chip];
  }
  return [...selected.slice(selected.length - maxSelections + 1), chip];
}

/**
 * Applies a tap-to-fill starter chip into the postcard message cleanly without exceeding max length.
 */
export function applyStarterChip(
  currentMessage: string,
  starter: string,
  maxLength = MAX_REVIEW_MESSAGE_LENGTH,
): string {
  const trimmed = currentMessage.trim();
  if (!trimmed) {
    return `${starter} `.slice(0, maxLength);
  }
  if (trimmed.toLowerCase().includes(starter.toLowerCase())) {
    return currentMessage.slice(0, maxLength);
  }
  const joined = `${trimmed}\n${starter} `;
  return joined.slice(0, maxLength);
}

/**
 * Returns the exact rating-aware Modino Pet speech bubble & mood reaction.
 */
export function getModinoReviewReaction(rating: ValidSubmittedRating): ModinoReaction {
  if (rating === 1 || rating === 2) {
    return {
      text: 'Sirf itne kam stars?! Adinomide ki saari mehnat par paani fer diya! 😭😂',
      mood: 'surprised',
      sfx: 'ew_boing',
    };
  }
  if (rating === 3) {
    return {
      text: '3 stars! Chalo safe pass ho gaya, birthday treat Bach gayi! 😅✨',
      mood: 'shy_blush',
      sfx: 'giggle',
    };
  }
  if (rating === 4) {
    return {
      text: "4 stars! 1 star un 5'2 jokes ki wajah se kata na? 😂🎀",
      mood: 'laugh',
      sfx: 'giggle',
    };
  }
  if (rating === 10) {
    return {
      text: '10 OUT OF 5?! Core memory unlocked forever, legendary! 👑💖',
      mood: 'jump',
      sfx: 'confetti_burst',
    };
  }
  return {
    text: '5 STARS!! Adinomide is literally doing a victory dance right now! 🎉✨',
    mood: 'happy_smile',
    sfx: 'confetti_burst',
  };
}

/**
 * Formats an epoch millisecond timestamp in IST (Asia/Kolkata) with ZERO dashes,
 * e.g. `03 Dec 2026 · 12:14 AM IST`.
 */
export function formatReviewISTTimestamp(ms: number): string {
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  try {
    const date = new Date(safeMs);
    const dateParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).formatToParts(date);

    const day = dateParts.find((p) => p.type === 'day')?.value ?? '03';
    const month = dateParts.find((p) => p.type === 'month')?.value ?? 'Dec';
    const year = dateParts.find((p) => p.type === 'year')?.value ?? '2026';

    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);

    const hour = timeParts.find((p) => p.type === 'hour')?.value ?? '12';
    const minute = timeParts.find((p) => p.type === 'minute')?.value ?? '00';
    const dayPeriod = (timeParts.find((p) => p.type === 'dayPeriod')?.value ?? 'AM').toUpperCase();

    return stripVisibleDashes(`${day} ${month} ${year} · ${hour}:${minute} ${dayPeriod} IST`);
  } catch {
    return '03 Dec 2026 · 12:00 AM IST';
  }
}

/**
 * Lightweight device classification for Firestore metadata (`Mobile | Tablet | Desktop`).
 */
export function detectReviewDeviceType(
  userAgent?: string,
  viewportWidth?: number,
): ReviewDeviceType {
  const ua = (
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  ).toLowerCase();

  if (/ipad|tablet|playbook|silk|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'Mobile';
  }
  const width =
    typeof viewportWidth === 'number'
      ? viewportWidth
      : typeof window !== 'undefined'
        ? window.innerWidth
        : 1280;
  if (width < 640) return 'Mobile';
  if (width < 1024) return 'Tablet';
  return 'Desktop';
}

/**
 * Reads the visitor's session Tapli Arena count from `localStorage` (`bauni_tapli_session_total`).
 */
export function readSessionTapliCount(
  storage?: Pick<Storage, 'getItem'> | null,
): number {
  try {
    const store =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined'
          ? window.localStorage
          : null;
    if (!store) return 0;
    const raw = store.getItem(TAPLI_SESSION_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, 100000);
  } catch {
    return 0;
  }
}

/**
 * Generates a unique, append-only Firestore document ID matching `^[a-zA-Z0-9_]+$`.
 */
export function generateReviewId(nowMs = Date.now()): string {
  const randomSuffix = Math.random().toString(36).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'note01';
  return `rev_${Math.floor(nowMs)}_${randomSuffix}`;
}

/**
 * Normalizes a sessionId to match Firestore rule constraints (1..128 safe chars).
 */
export function sanitizeReviewSessionId(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return 'direct_session';
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  return cleaned.length >= 4 ? cleaned : 'direct_session';
}

/**
 * Sanitizes and builds the Firestore write fields (paired with `submittedAt: serverTimestamp()`).
 */
export function buildDeveloperReviewWriteFields(input: {
  reviewId?: string;
  rating: ValidSubmittedRating;
  bestThings: readonly string[];
  message: string;
  noteNumber: number;
  nowMs?: number;
  sessionId?: string | null;
  deviceType?: ReviewDeviceType;
  sessionTaplis?: number;
}): DeveloperReviewWriteFields {
  const submittedAtMs =
    typeof input.nowMs === 'number' && Number.isFinite(input.nowMs)
      ? Math.floor(input.nowMs)
      : Date.now();
  const reviewId =
    input.reviewId && /^[a-zA-Z0-9_-]{4,128}$/.test(input.reviewId)
      ? input.reviewId
      : generateReviewId(submittedAtMs);

  const uniqueFavorites: DeveloperReviewFavorite[] = [];
  for (const item of input.bestThings) {
    if (
      VALID_FAVORITES_SET.has(item) &&
      !uniqueFavorites.includes(item as DeveloperReviewFavorite) &&
      uniqueFavorites.length < MAX_FAVORITE_SELECTIONS
    ) {
      uniqueFavorites.push(item as DeveloperReviewFavorite);
    }
  }

  const trimmedMessage = input.message.trim().slice(0, MAX_REVIEW_MESSAGE_LENGTH);
  const safeNoteNumber = Number.isFinite(input.noteNumber)
    ? Math.max(1, Math.min(1000, Math.floor(input.noteNumber)))
    : 1;
  const safeTaplis =
    typeof input.sessionTaplis === 'number' && Number.isFinite(input.sessionTaplis)
      ? Math.max(0, Math.min(100000, Math.floor(input.sessionTaplis)))
      : 0;

  return {
    reviewId,
    rating: input.rating,
    isBonusRating: input.rating === 10,
    bestThings: uniqueFavorites,
    message: trimmedMessage,
    noteNumber: safeNoteNumber,
    submittedAtMs,
    submittedAtIST: formatReviewISTTimestamp(submittedAtMs).slice(0, 64),
    sessionId: sanitizeReviewSessionId(input.sessionId),
    deviceType: input.deviceType ?? detectReviewDeviceType(),
    sessionTaplis: safeTaplis,
  };
}

function isValidRatingNumber(value: unknown): value is ValidSubmittedRating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 10;
}

/**
 * Reads persisted sent notes from `localStorage` (`bauni_sent_developer_reviews`).
 */
export function readSentReviewsHistory(
  storage?: Pick<Storage, 'getItem'> | null,
): LocalSentDeveloperReview[] {
  try {
    const store =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined'
          ? window.localStorage
          : null;
    if (!store) return [];
    const raw = store.getItem(SENT_REVIEWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: LocalSentDeveloperReview[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      if (typeof obj.reviewId !== 'string' || !isValidRatingNumber(obj.rating)) continue;
      const bestThings = Array.isArray(obj.bestThings)
        ? obj.bestThings
            .filter((entry): entry is DeveloperReviewFavorite => typeof entry === 'string' && VALID_FAVORITES_SET.has(entry))
            .slice(0, MAX_FAVORITE_SELECTIONS)
        : [];
      const submittedAtMs =
        typeof obj.submittedAtMs === 'number' && Number.isFinite(obj.submittedAtMs)
          ? obj.submittedAtMs
          : Date.now();
      const noteNumber =
        typeof obj.noteNumber === 'number' && Number.isFinite(obj.noteNumber) && obj.noteNumber >= 1
          ? Math.floor(obj.noteNumber)
          : valid.length + 1;
      const deviceType: ReviewDeviceType =
        obj.deviceType === 'Mobile' || obj.deviceType === 'Tablet' || obj.deviceType === 'Desktop'
          ? obj.deviceType
          : 'Mobile';

      valid.push({
        reviewId: obj.reviewId,
        rating: obj.rating,
        isBonusRating: obj.rating === 10,
        bestThings,
        message: typeof obj.message === 'string' ? obj.message.slice(0, MAX_REVIEW_MESSAGE_LENGTH) : '',
        noteNumber,
        submittedAtMs,
        submittedAtIST:
          typeof obj.submittedAtIST === 'string' && obj.submittedAtIST.trim()
            ? stripVisibleDashes(obj.submittedAtIST)
            : formatReviewISTTimestamp(submittedAtMs),
        deviceType,
        sessionTaplis:
          typeof obj.sessionTaplis === 'number' && Number.isFinite(obj.sessionTaplis)
            ? Math.max(0, Math.floor(obj.sessionTaplis))
            : 0,
      });
    }
    return valid.slice(0, MAX_LOCAL_SENT_HISTORY);
  } catch {
    return [];
  }
}

/**
 * Prepends a newly sent review to `localStorage` (`bauni_sent_developer_reviews`) and returns the updated array.
 */
export function appendSentReviewHistory(
  existing: readonly LocalSentDeveloperReview[],
  entry: LocalSentDeveloperReview,
  storage?: Pick<Storage, 'setItem'> | null,
): LocalSentDeveloperReview[] {
  const deduped = existing.filter((item) => item.reviewId !== entry.reviewId);
  const next = [entry, ...deduped].slice(0, MAX_LOCAL_SENT_HISTORY);
  try {
    const store =
      storage !== undefined
        ? storage
        : typeof window !== 'undefined'
          ? window.localStorage
          : null;
    store?.setItem(SENT_REVIEWS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage disabled or full; keep in-memory state cleanly
  }
  return next;
}

/**
 * Computes the next sequential note number (1, 2, 3...) from local sent history.
 */
export function getNextNoteNumber(existing: readonly LocalSentDeveloperReview[]): number {
  if (existing.length === 0) return 1;
  let maxNum = 0;
  for (const item of existing) {
    if (item.noteNumber > maxNum) maxNum = item.noteNumber;
  }
  return Math.max(existing.length, maxNum) + 1;
}

/**
 * Aggregates live Firestore review records for the Owner Analytics Dashboard summary strip.
 */
export function computeDeveloperReviewSummary(
  reviews: readonly DeveloperReviewDashboardRecord[],
): DeveloperReviewSummaryStats {
  const totalNotes = reviews.length;
  if (totalNotes === 0) {
    return {
      totalNotes: 0,
      averageRating: null,
      averageRatingLabel: 'No ratings yet',
      topFavorite: 'No picks yet',
    };
  }

  let ratingSum = 0;
  const favoriteCounts = new Map<string, number>();

  for (const rev of reviews) {
    ratingSum += rev.rating;
    for (const fav of rev.bestThings) {
      favoriteCounts.set(fav, (favoriteCounts.get(fav) ?? 0) + 1);
    }
  }

  const avg = Math.round((ratingSum / totalNotes) * 10) / 10;
  const averageRatingLabel = `${avg.toFixed(1)} / 5 ★`;

  let topFavorite = 'No picks yet';
  let topCount = 0;
  for (const [fav, count] of favoriteCounts.entries()) {
    if (count > topCount) {
      topCount = count;
      topFavorite = fav;
    }
  }

  return {
    totalNotes,
    averageRating: avg,
    averageRatingLabel,
    topFavorite,
  };
}
