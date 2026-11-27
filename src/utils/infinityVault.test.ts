import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIMED_DATE_LABEL,
  INFINITY_STONES,
  ORBIT_BASE_SPEED_RAD,
  ORBIT_STOP_DURATION_SEC,
  PRIZE_POOL_TIERS,
  RIGGED_GIFT_VALUE,
  SUMMARY_CONSUMED_KEY,
  VAULT_CUSTOM_CODE_STORAGE_KEY,
  VAULT_OWNER_EDIT_CODE,
  VAULT_RESET_CODE,
  VAULT_STORAGE_KEY,
  VAULT_UNLOCK_CODE,
  clampVaultDt,
  clearSummaryConsumed,
  clearVaultClaim,
  computeStoneOrbitPosition,
  computeStoppingAngularVelocity,
  consumeOneTimeSummary,
  evaluateVaultPasscode,
  formatVaultGiftCodeDisplay,
  generateGiftCardCode,
  getRawCopyableVaultCode,
  isSummaryConsumed,
  isValidVaultGiftCode,
  readLocalCustomVaultCode,
  readVaultClaim,
  resolveVaultRewardValue,
  sanitizeVaultGiftCode,
  spawnStoneDustParticles,
  stepDustParticles,
  writeLocalCustomVaultCode,
  writeVaultClaim,
  type StorageLike,
  type VaultClaimRecord,
} from './infinityVault';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('all 6 Avengers Infinity Stones and prize pool tiers match exact specification', () => {
  assert.equal(INFINITY_STONES.length, 6);
  assert.deepEqual(
    INFINITY_STONES.map((s) => s.name),
    [
      'Space Stone',
      'Mind Stone',
      'Reality Stone',
      'Power Stone',
      'Time Stone',
      'Soul Stone',
    ],
  );
  assert.equal(INFINITY_STONES[0].bodyStart, '#2A9BFF');
  assert.equal(INFINITY_STONES[0].darkEdge, '#03154A');
  assert.equal(INFINITY_STONES[0].aura, '#38A7FF');
  assert.equal(INFINITY_STONES[1].bodyStart, '#FFD538');
  assert.equal(INFINITY_STONES[1].darkEdge, '#5E3300');
  assert.equal(INFINITY_STONES[1].aura, '#FFCC33');
  assert.equal(INFINITY_STONES[2].bodyStart, '#F21B38');
  assert.equal(INFINITY_STONES[2].darkEdge, '#3D000A');
  assert.equal(INFINITY_STONES[2].aura, '#FF2947');
  assert.equal(INFINITY_STONES[3].bodyStart, '#B238FF');
  assert.equal(INFINITY_STONES[3].darkEdge, '#250052');
  assert.equal(INFINITY_STONES[3].aura, '#BD4DFF');
  assert.equal(INFINITY_STONES[4].bodyStart, '#0CE67E');
  assert.equal(INFINITY_STONES[4].darkEdge, '#00331A');
  assert.equal(INFINITY_STONES[4].aura, '#19F08A');
  assert.equal(INFINITY_STONES[5].bodyStart, '#FF8811');
  assert.equal(INFINITY_STONES[5].darkEdge, '#521800');
  assert.equal(INFINITY_STONES[5].aura, '#FF9124');

  assert.deepEqual([...PRIZE_POOL_TIERS], ['₹50', '₹100', '₹150', '₹250', '₹500', '₹1,000']);
});

test('strict rigged outcome always resolves to ₹250 for every Infinity Stone', () => {
  for (const stone of INFINITY_STONES) {
    assert.equal(resolveVaultRewardValue(stone.id), RIGGED_GIFT_VALUE);
    assert.equal(resolveVaultRewardValue(stone.id), 250);
  }
});

test('passcode gate enforces 1845 unlock/alreadyClaimed, 9876 universal reset, 1507 owner editor, and wrong code rejection', () => {
  assert.equal(VAULT_UNLOCK_CODE, '1845');
  assert.equal(VAULT_RESET_CODE, '9876');
  assert.equal(VAULT_OWNER_EDIT_CODE, '1507');

  const claimedRecord: VaultClaimRecord = {
    claimed: true,
    code: '4829 · 7104 · 9362',
    stoneName: 'Reality Stone',
    stoneId: 'reality',
    claimedOn: CLAIMED_DATE_LABEL,
  };

  // Unclaimed state
  assert.equal(evaluateVaultPasscode('1845', null), 'unlock');
  assert.equal(evaluateVaultPasscode('9876', null), 'reset');
  assert.equal(evaluateVaultPasscode('1507', null), 'ownerEdit');
  assert.equal(evaluateVaultPasscode('0000', null), 'wrong');
  assert.equal(evaluateVaultPasscode('1234', null), 'wrong');

  // Claimed state (including after reload on 3rd Dec)
  assert.equal(evaluateVaultPasscode('1845', claimedRecord), 'alreadyClaimed');
  assert.equal(evaluateVaultPasscode('9876', claimedRecord), 'reset');
  assert.equal(evaluateVaultPasscode('1507', claimedRecord), 'ownerEdit');
  assert.equal(evaluateVaultPasscode('5555', claimedRecord), 'wrong');
});

test('owner real gift card code validation, 4-char space grouping (zero dashes), raw copy, and local cache', () => {
  assert.equal(sanitizeVaultGiftCode(' abcd efgh 1234 5678 '), 'ABCDEFGH12345678');
  assert.equal(isValidVaultGiftCode('ABCDEFGH12345678'), true); // 16 chars
  assert.equal(isValidVaultGiftCode('ab12 cd34 ef56 gh78 ij90'), true); // 20 chars
  assert.equal(isValidVaultGiftCode('SHORT1234567890'), false); // 15 chars
  assert.equal(isValidVaultGiftCode('TOOLONG12345678901234'), false); // 21 chars
  assert.equal(isValidVaultGiftCode('ABCD-EFGH-IJKL-MNOP'), false); // dashes rejected

  assert.equal(formatVaultGiftCodeDisplay('abcdefgh12345678'), 'ABCD EFGH 1234 5678');
  assert.equal(formatVaultGiftCodeDisplay('ABCD1234EFGH5678IJ90'), 'ABCD 1234 EFGH 5678 IJ90');
  assert.equal(formatVaultGiftCodeDisplay('ABCD1234EFGH5678').includes('-'), false);
  assert.equal(getRawCopyableVaultCode('abcd efgh 1234 5678'), 'ABCDEFGH12345678');

  const storage = createMemoryStorage();
  assert.equal(readLocalCustomVaultCode(storage), null);
  writeLocalCustomVaultCode('abcd efgh ijkl mnop', storage);
  assert.equal(storage.getItem(VAULT_CUSTOM_CODE_STORAGE_KEY), 'ABCDEFGHIJKLMNOP');
  assert.equal(readLocalCustomVaultCode(storage), 'ABCDEFGHIJKLMNOP');

  writeLocalCustomVaultCode(null, storage);
  assert.equal(readLocalCustomVaultCode(storage), null);
});

test('generateGiftCardCode creates 12-digit code formatted as XXXX · XXXX · XXXX', () => {
  for (let i = 0; i < 25; i++) {
    const code = generateGiftCardCode();
    assert.match(code, /^[1-9]\d{3} · \d{4} · \d{4}$/);
  }
});

test('orbital deceleration follows cubic ease-out from 1.5 rad/s to 0 over 1.4s and positions 6 stones evenly', () => {
  assert.equal(clampVaultDt(200), 0.05);
  assert.equal(computeStoppingAngularVelocity(0), ORBIT_BASE_SPEED_RAD);
  const mid = computeStoppingAngularVelocity(ORBIT_STOP_DURATION_SEC * 0.5);
  assert.ok(Math.abs(mid - ORBIT_BASE_SPEED_RAD * 0.125) < 0.001);
  assert.equal(computeStoppingAngularVelocity(ORBIT_STOP_DURATION_SEC), 0);

  // 6 evenly spaced stones at radius 100px
  const p0 = computeStoneOrbitPosition(0, 0, 100);
  const p3 = computeStoneOrbitPosition(3, 0, 100);
  assert.ok(Math.abs(p0.x) < 0.01 && Math.abs(p0.y + 100) < 0.01);
  assert.ok(Math.abs(p3.x) < 0.01 && Math.abs(p3.y - 100) < 0.01);
});

test('Thanos-snap dust particles drift upward-rightward and decay completely to zero active particles', () => {
  let particles = spawnStoneDustParticles({
    cx: 150,
    cy: 150,
    spreadPx: 22,
    count: 160,
    palette: INFINITY_STONES[2].dustPalette,
    intensity: 'chosen',
  });
  assert.equal(particles.length, 160);

  // Step forward 0.4s -> particles should be drifting upward & rightward
  for (let i = 0; i < 24; i++) {
    particles = stepDustParticles(particles, 1 / 60);
  }
  assert.ok(particles.length > 0);
  const avgY = particles.reduce((sum, p) => sum + p.y, 0) / particles.length;
  const avgX = particles.reduce((sum, p) => sum + p.x, 0) / particles.length;
  assert.ok(avgY < 150, `expected particles to drift upward (y < 150), got ${avgY}`);
  assert.ok(avgX > 150, `expected particles to drift rightward (x > 150), got ${avgX}`);

  // Step another 2.0s -> all particles completely faded & pruned (0 ongoing GPU/CPU)
  for (let i = 0; i < 120; i++) {
    particles = stepDustParticles(particles, 1 / 60);
  }
  assert.equal(particles.length, 0);
});

test('vault claim state persists cleanly in localStorage and clears completely on reset', () => {
  const storage = createMemoryStorage();
  assert.equal(readVaultClaim(storage), null);

  const rec: VaultClaimRecord = {
    claimed: true,
    code: '6291 - 4058 - 7731',
    stoneName: 'Time Stone',
    stoneId: 'time',
    claimedOn: '3 Dec',
  };
  writeVaultClaim(rec, storage);
  assert.ok(storage.getItem(VAULT_STORAGE_KEY));

  const restored = readVaultClaim(storage);
  assert.deepEqual(restored, rec);

  clearVaultClaim(storage);
  assert.equal(readVaultClaim(storage), null);
});

test('one-time footer summary flag consumes strictly once and clears cleanly on 9876 reset', () => {
  const storage = createMemoryStorage();
  assert.equal(SUMMARY_CONSUMED_KEY, 'morgan_summary_consumed_v1');
  assert.equal(isSummaryConsumed(storage), false);

  // First unlock consumes the flag and allows rendering once
  assert.equal(consumeOneTimeSummary(storage), true);
  assert.equal(isSummaryConsumed(storage), true);
  assert.equal(storage.getItem(SUMMARY_CONSUMED_KEY), 'true');

  // Repeat unlock / reload must NOT consume again
  assert.equal(consumeOneTimeSummary(storage), false);
  assert.equal(isSummaryConsumed(storage), true);

  // Secret reset 9876 clears the flag so first-time unlock works again
  clearSummaryConsumed(storage);
  assert.equal(isSummaryConsumed(storage), false);
  assert.equal(consumeOneTimeSummary(storage), true);
});
