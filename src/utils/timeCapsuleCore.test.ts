import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TIME_CAPSULE_CATEGORY,
  TIME_CAPSULE_CATEGORIES,
  TIME_CAPSULE_COPY,
  TIME_CAPSULE_MODINO_REACTION,
  TIME_CAPSULE_STARTERS,
  TIME_CAPSULE_UNLOCK_TIME_MS,
  appendSealedCapsule,
  applyStarterPrompt,
  buildTimeCapsulePayload,
  computeDaysUntilEighteenth,
  createTimeCapsuleId,
  formatCapsuleISTTimestamp,
  formatUnlockCountdownPill,
  readSealedCapsules,
  validateTimeCapsuleLetter,
  type StorageLike,
} from './timeCapsuleCore.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

test('computes IST days until 03 Dec 2027 accurately', () => {
  const bday17Ms = new Date('2026-12-03T00:00:00+05:30').getTime();
  assert.equal(computeDaysUntilEighteenth(bday17Ms, TIME_CAPSULE_UNLOCK_TIME_MS), 365);
  assert.equal(
    formatUnlockCountdownPill(bday17Ms, TIME_CAPSULE_UNLOCK_TIME_MS),
    'Unlocks in 365 Days · 03 Dec 2027',
  );
  assert.equal(computeDaysUntilEighteenth(TIME_CAPSULE_UNLOCK_TIME_MS + 1000), 0);
  assert.equal(
    formatUnlockCountdownPill(TIME_CAPSULE_UNLOCK_TIME_MS + 1000),
    'Unlocked Today · 03 Dec 2027',
  );
});

test('validates letter minimum 3 non-whitespace chars and clamps max length', () => {
  assert.equal(validateTimeCapsuleLetter('   ').valid, false);
  assert.equal(validateTimeCapsuleLetter('hi').valid, false);
  assert.equal(validateTimeCapsuleLetter('hey').valid, true);
  assert.equal(validateTimeCapsuleLetter('a'.repeat(1500)).trimmed.length, 1200);
});

test('applies starter prompts cleanly and persists sealed capsules append-only', () => {
  assert.equal(
    applyStarterPrompt('', TIME_CAPSULE_STARTERS[0]),
    'By my 18th birthday, I really hope... ',
  );
  const store = createMemoryStorage();
  const id = createTimeCapsuleId(1796236200000, 'abc123');
  assert.match(id, /^cap_\d+_[a-zA-Z0-9]+$/);

  const payload = buildTimeCapsulePayload({
    capsuleId: id,
    category: DEFAULT_TIME_CAPSULE_CATEGORY,
    letter: 'Dear 18 year old Anamika, hope college is amazing!',
    capsuleNumber: 1,
    sealedAtMs: 1796236200000,
    sessionId: 'sess_test_1234',
    deviceType: 'Mobile',
  });
  assert.equal(payload.unlockDate, '03 Dec 2027');
  assert.equal(payload.capsuleNumber, 1);

  appendSealedCapsule(payload, store);
  const restored = readSealedCapsules(store);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].capsuleId, id);
});

test('strict zero-dash audit across all Time Capsule user-facing copy and IST timestamps', () => {
  const dashPattern = /[\u2014\u2013-]/;
  const allStrings = [
    ...Object.values(TIME_CAPSULE_COPY),
    ...TIME_CAPSULE_CATEGORIES,
    ...TIME_CAPSULE_STARTERS,
    TIME_CAPSULE_MODINO_REACTION.text,
    formatCapsuleISTTimestamp(1796236200000),
    formatUnlockCountdownPill(1796236200000),
  ];

  for (const str of allStrings) {
    assert.equal(
      dashPattern.test(str),
      false,
      `Found forbidden dash character in Time Capsule copy: "${str}"`,
    );
  }
});
