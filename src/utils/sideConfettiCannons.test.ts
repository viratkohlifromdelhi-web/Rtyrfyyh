import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HERO_CANNON_DURATION_MS,
  HERO_CANNON_INTERVAL_MS,
  HERO_CANNON_PALETTE,
  HERO_PHOTO_CANNONS_KEY,
  spawnHeroCannonVolley,
  stepHeroCannonParticles,
  tryConsumeHeroPhotoCannons,
  type SessionStorageLike,
} from './sideConfettiCannons.ts';

function createMemorySessionStorage(): SessionStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

test('tryConsumeHeroPhotoCannons fires strictly once per session and persists sessionStorage guard', () => {
  const store = createMemorySessionStorage();
  const ref = { current: false };

  assert.equal(HERO_CANNON_DURATION_MS, 3000);
  assert.equal(HERO_CANNON_INTERVAL_MS, 180);

  // First interaction consumes cleanly
  assert.equal(tryConsumeHeroPhotoCannons(ref, store), true);
  assert.equal(ref.current, true);
  assert.equal(store.getItem(HERO_PHOTO_CANNONS_KEY), 'true');

  // Subsequent interactions on same component instance must NOT refire
  assert.equal(tryConsumeHeroPhotoCannons(ref, store), false);
  assert.equal(tryConsumeHeroPhotoCannons(ref, store), false);

  // Fresh component mount in same session must also respect sessionStorage guard
  const freshRef = { current: false };
  assert.equal(tryConsumeHeroPhotoCannons(freshRef, store), false);
  assert.equal(freshRef.current, true);
});

test('spawnHeroCannonVolley launches paired left/right pastel bursts at y=0.65 and settles cleanly', () => {
  const volley = spawnHeroCannonVolley({
    viewportWidth: 390,
    viewportHeight: 844,
    countPerSide: 10,
  });

  assert.equal(volley.length, 20);
  const left = volley.slice(0, 10);
  const right = volley.slice(10, 20);

  for (const p of left) {
    assert.equal(p.x, 0);
    assert.ok(p.vx > 0, 'left cannon must shoot rightward');
    assert.ok(p.vy < 0, 'left cannon must shoot upward');
    assert.ok((HERO_CANNON_PALETTE as readonly string[]).includes(p.color));
  }

  for (const p of right) {
    assert.equal(p.x, 390);
    assert.ok(p.vx < 0, 'right cannon must shoot leftward');
    assert.ok(p.vy < 0, 'right cannon must shoot upward');
    assert.ok((HERO_CANNON_PALETTE as readonly string[]).includes(p.color));
  }

  let active = volley;
  for (let f = 0; f < 240; f++) {
    active = stepHeroCannonParticles(active, 844, 1 / 60);
  }
  assert.equal(active.length, 0);
});
