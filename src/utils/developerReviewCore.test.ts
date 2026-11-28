import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVELOPER_REVIEW_FAVORITES,
  DEVELOPER_REVIEW_STARTERS,
  SENT_REVIEWS_STORAGE_KEY,
  TAPLI_SESSION_STORAGE_KEY,
  appendSentReviewHistory,
  applyStarterChip,
  buildDeveloperReviewWriteFields,
  computeDeveloperReviewSummary,
  computeNextStarRating,
  detectReviewDeviceType,
  formatReviewISTTimestamp,
  getModinoReviewReaction,
  getNextNoteNumber,
  getRatingReactionCaption,
  readSentReviewsHistory,
  readSessionTapliCount,
  toggleFavoriteChip,
  type DeveloperReviewDashboardRecord,
  type ValidSubmittedRating,
} from './developerReviewCore';

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('developerReviewCore', () => {
  it('supports 1 to 5 stars plus the secret 10 / 5 Easter Egg on second 5th star tap', () => {
    assert.deepEqual(computeNextStarRating(0, 3), { rating: 3, triggeredBonus: false });
    assert.deepEqual(computeNextStarRating(3, 5), { rating: 5, triggeredBonus: false });
    assert.deepEqual(computeNextStarRating(5, 5), { rating: 10, triggeredBonus: true });
    assert.deepEqual(computeNextStarRating(10, 5), { rating: 10, triggeredBonus: true });
    assert.deepEqual(computeNextStarRating(10, 4), { rating: 4, triggeredBonus: false });
  });

  it('enforces zero visible dashes in every rating caption, Modino line, starter, favorite, and IST timestamp', () => {
    const dashPattern = /[-–—]/;

    for (const r of [0, 1, 2, 3, 4, 5, 10] as const) {
      const caption = getRatingReactionCaption(r);
      assert.equal(dashPattern.test(caption), false, `Caption for ${r} had a dash: ${caption}`);
    }

    for (const r of [1, 2, 3, 4, 5, 10] as ValidSubmittedRating[]) {
      const reaction = getModinoReviewReaction(r);
      assert.equal(
        dashPattern.test(reaction.text),
        false,
        `Modino reaction for ${r} had a dash: ${reaction.text}`,
      );
    }

    for (const fav of DEVELOPER_REVIEW_FAVORITES) {
      assert.equal(dashPattern.test(fav), false, `Favorite chip had a dash: ${fav}`);
    }

    for (const starter of DEVELOPER_REVIEW_STARTERS) {
      assert.equal(dashPattern.test(starter), false, `Starter chip had a dash: ${starter}`);
    }

    const ist = formatReviewISTTimestamp(Date.UTC(2026, 11, 2, 18, 44, 0));
    assert.equal(dashPattern.test(ist), false, `IST timestamp had a dash: ${ist}`);
    assert.match(ist, /03 Dec 2026 · 12:14 AM IST/);
  });

  it('toggles up to 3 favorite chips and swaps oldest on a 4th pick', () => {
    let picked = toggleFavoriteChip([], 'Origin Story Play');
    picked = toggleFavoriteChip(picked, 'Modino Pet');
    picked = toggleFavoriteChip(picked, 'Tapli Arena');
    assert.deepEqual(picked, ['Origin Story Play', 'Modino Pet', 'Tapli Arena']);

    // Selecting a 4th gently swaps out oldest ('Origin Story Play')
    picked = toggleFavoriteChip(picked, 'Mini Chicken Farm');
    assert.deepEqual(picked, ['Modino Pet', 'Tapli Arena', 'Mini Chicken Farm']);

    // Tapping an active chip removes it
    picked = toggleFavoriteChip(picked, 'Tapli Arena');
    assert.deepEqual(picked, ['Modino Pet', 'Mini Chicken Farm']);
  });

  it('applies starter chips cleanly to empty and non-empty drafts', () => {
    const first = applyStarterChip('', "Honestly I didn't expect...");
    assert.equal(first, "Honestly I didn't expect... ");

    const repeated = applyStarterChip(first, "Honestly I didn't expect...");
    assert.equal(repeated, first);

    const appended = applyStarterChip('Loved this so much!', 'Next year you owe me...');
    assert.equal(appended, 'Loved this so much!\nNext year you owe me... ');
  });

  it('sanitizes Firestore write fields and clamps lengths cleanly', () => {
    const fields = buildDeveloperReviewWriteFields({
      rating: 10,
      bestThings: [
        'Origin Story Play',
        'Invalid Chip',
        'Modino Pet',
        'Tapli Arena',
        'Friend List',
      ],
      message: `   ${'a'.repeat(1200)}   `,
      noteNumber: 2,
      nowMs: 1796237040000,
      sessionId: 'sess_abc12345',
      deviceType: 'Mobile',
      sessionTaplis: 47,
    });

    assert.match(fields.reviewId, /^rev_\d+_[a-z0-9]+$/);
    assert.equal(fields.rating, 10);
    assert.equal(fields.isBonusRating, true);
    assert.deepEqual(fields.bestThings, ['Origin Story Play', 'Modino Pet', 'Tapli Arena']);
    assert.equal(fields.message.length, 1000);
    assert.equal(fields.noteNumber, 2);
    assert.equal(fields.sessionId, 'sess_abc12345');
    assert.equal(fields.deviceType, 'Mobile');
    assert.equal(fields.sessionTaplis, 47);
    assert.equal(/[-–—]/.test(fields.submittedAtIST), false);
  });

  it('persists multi-note sent history in localStorage and increments noteNumber', () => {
    const storage = createMemoryStorage();
    storage.setItem(TAPLI_SESSION_STORAGE_KEY, '29');
    assert.equal(readSessionTapliCount(storage), 29);

    let history = readSentReviewsHistory(storage);
    assert.equal(history.length, 0);
    assert.equal(getNextNoteNumber(history), 1);

    history = appendSentReviewHistory(
      history,
      {
        reviewId: 'rev_1001_aa',
        rating: 5,
        isBonusRating: false,
        bestThings: ['Modino Pet'],
        message: 'First note!',
        noteNumber: 1,
        submittedAtMs: 1796237040000,
        submittedAtIST: '03 Dec 2026 · 12:14 AM IST',
        deviceType: 'Mobile',
        sessionTaplis: 29,
      },
      storage,
    );

    assert.equal(getNextNoteNumber(history), 2);
    const reloaded = readSentReviewsHistory(storage);
    assert.equal(reloaded.length, 1);
    assert.equal(reloaded[0].reviewId, 'rev_1001_aa');
    assert.ok(storage.getItem(SENT_REVIEWS_STORAGE_KEY)?.includes('First note!'));
  });

  it('classifies devices and computes owner dashboard summary stats accurately', () => {
    assert.equal(detectReviewDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 390), 'Mobile');
    assert.equal(detectReviewDeviceType('Mozilla/5.0 (iPad; CPU OS 17_0)', 820), 'Tablet');
    assert.equal(detectReviewDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 1366), 'Desktop');

    const emptySummary = computeDeveloperReviewSummary([]);
    assert.equal(emptySummary.totalNotes, 0);
    assert.equal(emptySummary.averageRating, null);
    assert.equal(/[-–—]/.test(emptySummary.averageRatingLabel), false);
    assert.equal(/[-–—]/.test(emptySummary.topFavorite), false);

    const records: DeveloperReviewDashboardRecord[] = [
      {
        reviewId: 'rev_1',
        rating: 5,
        isBonusRating: false,
        bestThings: ['Origin Story Play', 'Modino Pet'],
        message: 'Amazing!',
        noteNumber: 1,
        submittedAtMs: 1796237040000,
        submittedAtIST: '03 Dec 2026 · 12:14 AM IST',
        sessionId: 's_1',
        deviceType: 'Mobile',
        sessionTaplis: 12,
      },
      {
        reviewId: 'rev_2',
        rating: 10,
        isBonusRating: true,
        bestThings: ['Modino Pet', 'Tapli Arena'],
        message: '10/5!',
        noteNumber: 2,
        submittedAtMs: 1796237140000,
        submittedAtIST: '03 Dec 2026 · 12:16 AM IST',
        sessionId: 's_1',
        deviceType: 'Mobile',
        sessionTaplis: 24,
      },
    ];

    const stats = computeDeveloperReviewSummary(records);
    assert.equal(stats.totalNotes, 2);
    assert.equal(stats.averageRating, 7.5);
    assert.equal(stats.averageRatingLabel, '7.5 / 5 ★');
    assert.equal(stats.topFavorite, 'Modino Pet');
  });
});
