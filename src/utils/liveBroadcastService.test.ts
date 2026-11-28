import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LIVE_BROADCAST_HOLD_MAX_MS,
  LIVE_BROADCAST_HOLD_MIN_MS,
  LIVE_BROADCAST_MAX_CHARS,
  LIVE_BROADCAST_MOODS,
  LIVE_BROADCAST_PRESETS,
  LIVE_BROADCAST_TTL_MS,
  buildLiveBroadcastWriteFields,
  computeLiveBroadcastHoldMs,
  computeLiveBroadcastRemainingSec,
  createLiveBroadcastId,
  isLiveBroadcastDeliverable,
  markLiveBroadcastIdSeen,
  parseLiveBroadcastData,
  readSeenLiveBroadcastIds,
  sanitizeLiveBroadcastMessage,
} from './liveBroadcastCore.ts';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test('all preset messages and mood labels contain zero visible dashes', () => {
  const dashPattern = /[—–-]/;
  assert.equal(LIVE_BROADCAST_PRESETS.length, 5);
  for (const preset of LIVE_BROADCAST_PRESETS) {
    assert.equal(dashPattern.test(preset), false, `Found dash in preset: ${preset}`);
    assert.ok(preset.length <= LIVE_BROADCAST_MAX_CHARS);
  }
  assert.equal(LIVE_BROADCAST_MOODS.length, 4);
  for (const mood of LIVE_BROADCAST_MOODS) {
    assert.equal(dashPattern.test(mood.label), false, `Found dash in mood label: ${mood.label}`);
  }
});

test('sanitizeLiveBroadcastMessage strips dashes, collapses spaces, and clamps to 220 chars', () => {
  assert.equal(
    sanitizeLiveBroadcastMessage('  Happy 17th — check your gift-vault – now!  '),
    'Happy 17th check your gift vault now!',
  );
  const longText = 'A'.repeat(260);
  assert.equal(sanitizeLiveBroadcastMessage(longText).length, LIVE_BROADCAST_MAX_CHARS);
});

test('computeLiveBroadcastHoldMs clamps smoothly between 7.5s and 13s', () => {
  assert.equal(computeLiveBroadcastHoldMs('Hi!'), LIVE_BROADCAST_HOLD_MIN_MS);
  assert.equal(computeLiveBroadcastHoldMs('A'.repeat(80)), 80 * 75 + 3500);
  assert.equal(computeLiveBroadcastHoldMs('A'.repeat(220)), LIVE_BROADCAST_HOLD_MAX_MS);
});

test('buildLiveBroadcastWriteFields creates valid 7-field-compatible payload with 90s TTL', () => {
  const now = 1780000000000;
  const payload = buildLiveBroadcastWriteFields({
    message: '  Oye Morgan! Check Gift Vault!  ',
    mood: 'hype',
    confetti: true,
    nowMs: now,
  });

  assert.match(payload.broadcastId, /^bc_1780000000000_[a-zA-Z0-9]+$/);
  assert.equal(payload.message, 'Oye Morgan! Check Gift Vault!');
  assert.equal(payload.mood, 'hype');
  assert.equal(payload.confetti, true);
  assert.equal(payload.sentAtMs, now);
  assert.equal(payload.expiresAtMs, now + LIVE_BROADCAST_TTL_MS);

  assert.throws(() =>
    buildLiveBroadcastWriteFields({
      message: '   ---   ',
      mood: 'cheer',
      confetti: false,
      nowMs: now,
    }),
  );
});

test('parseLiveBroadcastData validates fields and rejects malformed or invalid TTL payloads', () => {
  const now = 1780000000000;
  const valid = parseLiveBroadcastData({
    broadcastId: createLiveBroadcastId(now, 'abc123'),
    message: 'Happy 17th Morgan!',
    mood: 'whisper',
    confetti: false,
    sentAtMs: now,
    expiresAtMs: now + 90_000,
  });
  assert.ok(valid);
  assert.equal(valid.mood, 'whisper');
  assert.equal(valid.confetti, false);

  // Rejects bad broadcastId
  assert.equal(
    parseLiveBroadcastData({
      broadcastId: 'bad id with spaces',
      message: 'Hi',
      mood: 'cheer',
      confetti: true,
      sentAtMs: now,
      expiresAtMs: now + 90_000,
    }),
    null,
  );

  // Rejects TTL exceeding 600_000ms rule cap
  assert.equal(
    parseLiveBroadcastData({
      broadcastId: 'bc_1780000000000_xyz',
      message: 'Hi',
      mood: 'cheer',
      confetti: true,
      sentAtMs: now,
      expiresAtMs: now + 700_000,
    }),
    null,
  );
});

test('isLiveBroadcastDeliverable enforces TTL freshness and zero-repeat seenBroadcastIds guard', () => {
  const now = 1780000000000;
  const record = buildLiveBroadcastWriteFields({
    message: 'Psst! Open Baad Me!',
    mood: 'tease',
    confetti: true,
    nowMs: now,
    broadcastId: 'bc_1780000000000_fresh1',
  });

  const storage = createMemoryStorage();
  const initialSeen = readSeenLiveBroadcastIds(storage);
  assert.equal(isLiveBroadcastDeliverable(record, initialSeen, now + 5_000), true);

  // Expired after 90s TTL -> must NOT deliver
  assert.equal(
    isLiveBroadcastDeliverable(record, initialSeen, now + LIVE_BROADCAST_TTL_MS + 1),
    false,
  );

  // After marking seen in sessionStorage -> must NOT replay on reload
  const updatedSeen = markLiveBroadcastIdSeen(record.broadcastId, storage);
  assert.equal(isLiveBroadcastDeliverable(record, updatedSeen, now + 10_000), false);
  const reloadedSeen = readSeenLiveBroadcastIds(storage);
  assert.equal(reloadedSeen.has(record.broadcastId), true);
  assert.equal(computeLiveBroadcastRemainingSec(record.expiresAtMs, now + 40_000), 50);
});
