import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addWishToWall,
  createWishEntry,
  loadWishesFromStorage,
  parseStoredWishes,
  pickStickyRotation,
  removeWishFromWall,
  saveWishesToStorage,
  validateWishInput,
  type GuestbookWish,
} from './guestbook';

test('validateWishInput rejects empty name and message', () => {
  const res = validateWishInput('   ', '');
  assert.equal(res.valid, false);
  assert.ok(res.nameError);
  assert.ok(res.messageError);
});

test('validateWishInput rejects overly short message', () => {
  const res = validateWishInput('Sienna', 'Hi');
  assert.equal(res.valid, false);
  assert.equal(res.nameError, undefined);
  assert.ok(res.messageError);
});

test('validateWishInput accepts valid inputs', () => {
  const res = validateWishInput('Sienna', 'Happy 24th birthday Kiara!');
  assert.equal(res.valid, true);
  assert.equal(res.nameError, undefined);
  assert.equal(res.messageError, undefined);
});

test('createWishEntry trims fields and prepends via addWishToWall', () => {
  const existing: GuestbookWish[] = [
    {
      id: 'seed-1',
      name: 'Maya',
      message: 'Best night ever!',
      tone: 'blush',
      createdAt: '2026-11-24T00:00:00.000Z',
      rotation: -1.5,
    },
  ];

  const created = createWishEntry({
    name: '  Sienna  ',
    message: '  Wishing you the sparkliest year!  ',
    tone: 'champagne',
    existingCount: existing.length,
    id: 'wish-test-1',
  });

  assert.equal(created.name, 'Sienna');
  assert.equal(created.message, 'Wishing you the sparkliest year!');
  assert.equal(created.rotation, pickStickyRotation(1));

  const next = addWishToWall(existing, created);
  assert.equal(next.length, 2);
  assert.equal(next[0].id, 'wish-test-1');

  const removed = removeWishFromWall(next, 'wish-test-1');
  assert.equal(removed.length, 1);
  assert.equal(removed[0].id, 'seed-1');
});

test('storage round-trip persists and recovers gracefully on bad JSON', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  const fallback: GuestbookWish[] = [
    {
      id: 'seed-1',
      name: 'Chloe',
      message: 'Love you endlessly!',
      tone: 'cream',
      createdAt: '2026-11-24T00:00:00.000Z',
      rotation: 1.5,
    },
  ];

  const userWish = createWishEntry({
    name: 'Priya',
    message: 'Cheers to 24!',
    tone: 'lavender',
    existingCount: 2,
    id: 'wish-priya',
  });

  const saved = saveWishesToStorage([userWish, ...fallback], mockStorage);
  assert.equal(saved, true);

  const loaded = loadWishesFromStorage(fallback, mockStorage);
  assert.equal(loaded.length, 2);
  assert.equal(loaded[0].name, 'Priya');

  const recovered = parseStoredWishes('{bad-json', fallback);
  assert.deepEqual(recovered, fallback);
});
