import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODINO_SPAM_COOLDOWN_MS,
  emitModinoEvent,
  resetModinoBusCooldown,
  type ModinoReactionCategory,
} from './modinoBus';
import {
  GLOBAL_HISTORY_SIZE,
  MODINO_HEART_COLORS,
  MODINO_MAX_ACTIVE_HEARTS,
  MODINO_REACTION_BANKS,
  MODINO_SIGNATURE_GREETING,
  MODINO_SLEEP_MUTTERS,
  MODINO_WAKE_LINES,
  createModinoMicroHearts,
  createModinoReactionEngine,
  getModinoDialogueStats,
  getModinoMicroHeartCount,
} from './modinoReactions';
import { GITHUB_SFX_MANIFEST, isUiSfxMuted, setUiSfxMuted, toggleUiSfxMute } from './uiSoundEngine';

test('Modino dialogue bank has 70+ unique lines and zero visible dashes across every string', () => {
  const dashRegex = /[\u2014\u2013-]/;
  const stats = getModinoDialogueStats();

  assert.ok(
    stats.uniqueTexts >= 70,
    `Expected at least 70 unique Modino dialogue lines, got ${stats.uniqueTexts}`,
  );
  assert.ok(
    stats.totalEntries >= 100,
    `Expected 100+ total dialogue entries across categories, got ${stats.totalEntries}`,
  );

  for (const [category, items] of Object.entries(MODINO_REACTION_BANKS)) {
    assert.ok(items.length > 0, `Category ${category} must not be empty`);
    for (const item of items) {
      assert.equal(
        dashRegex.test(item.text),
        false,
        `Dash found in ${category}: "${item.text}"`,
      );
    }
  }

  for (const mutter of MODINO_SLEEP_MUTTERS) {
    assert.equal(dashRegex.test(mutter), false, `Dash found in sleep mutter: "${mutter}"`);
  }

  for (const wake of MODINO_WAKE_LINES) {
    assert.equal(dashRegex.test(wake.text), false, `Dash found in wake line: "${wake.text}"`);
  }
});

test('Modino delivers signature greeting first, exhausts all direct taps without repeats, and avoids back-to-back mood repeats', () => {
  let seed = 0.17;
  const deterministicRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const engine = createModinoReactionEngine(deterministicRandom);

  const firstGreeting = engine.next('greeting');
  assert.equal(firstGreeting.text, MODINO_SIGNATURE_GREETING.text);
  assert.equal(firstGreeting.mood, 'greeting');

  const directPoolLen = MODINO_REACTION_BANKS.direct_tap.length;
  assert.ok(directPoolLen >= 28, `Expected at least 28 direct_tap lines, got ${directPoolLen}`);

  const seenFirstPass = new Set<string>();
  let prevText = '';
  let prevMood = '';
  for (let i = 0; i < directPoolLen; i++) {
    const r = engine.next('direct_tap');
    assert.notEqual(r.text, prevText, `Consecutive text repeat at direct tap ${i}`);
    if (i > 0) {
      assert.notEqual(r.mood, prevMood, `Consecutive mood repeat (${r.mood}) at direct tap ${i}`);
    }
    seenFirstPass.add(r.text);
    prevText = r.text;
    prevMood = r.mood;
  }

  assert.equal(
    seenFirstPass.size,
    directPoolLen,
    'Per-category shuffle bag must visit every direct_tap reaction before reshuffling',
  );

  // Across a fresh reshuffle boundary, neither text nor mood should repeat back-to-back
  const afterReshuffle = engine.next('direct_tap');
  assert.notEqual(afterReshuffle.text, prevText);
  assert.notEqual(afterReshuffle.mood, prevMood);
});

test('Global 18-item recent-memory ring buffer blocks cross-category repeats and falls back to LRU on small categories', () => {
  const engine = createModinoReactionEngine(() => 0.37);
  assert.equal(GLOBAL_HISTORY_SIZE, 18);

  // Trigger a mix of categories and ensure no text repeats within the last 18 spoken lines
  const sequence: ModinoReactionCategory[] = [
    'greeting',
    'cute',
    'gift_ew',
    'backstory',
    'interaction_hype',
    'spin',
    'friends_and_banter',
    'last_playback',
    'ending',
    'direct_tap',
    'cute',
    'friends_and_banter',
    'direct_tap',
    'interaction_hype',
    'backstory',
    'gift_ew',
    'spin',
    'direct_tap',
  ];

  const spoken: string[] = [];
  for (const cat of sequence) {
    const r = engine.next(cat);
    assert.equal(
      spoken.includes(r.text),
      false,
      `Line "${r.text}" repeated within global 18-item window`,
    );
    spoken.push(r.text);
  }
  assert.equal(engine.getRecentTexts().length, GLOBAL_HISTORY_SIZE);

  // Repeatedly drawing from the smallest category (ending: 5 items) should never repeat back-to-back
  // and should always pick the least-recently-used line once all 5 are inside global history
  const endingEngine = createModinoReactionEngine(() => 0.5);
  const firstRound = new Set<string>();
  let lastEnding = '';
  for (let i = 0; i < MODINO_REACTION_BANKS.ending.length; i++) {
    const r = endingEngine.next('ending');
    assert.notEqual(r.text, lastEnding);
    firstRound.add(r.text);
    lastEnding = r.text;
  }
  assert.equal(firstRound.size, MODINO_REACTION_BANKS.ending.length);
  const lruNext = endingEngine.next('ending');
  assert.notEqual(lruNext.text, lastEnding);
});

test('Sleepy mutters and startled wake-up reactions cycle through all defined lines without consecutive repeats', () => {
  const engine = createModinoReactionEngine(() => 0.41);

  const seenSleep = new Set<string>();
  let prevSleep = '';
  for (let i = 0; i < MODINO_SLEEP_MUTTERS.length; i++) {
    const mutter = engine.nextSleepMutter();
    assert.notEqual(mutter, prevSleep);
    seenSleep.add(mutter);
    prevSleep = mutter;
  }
  assert.equal(seenSleep.size, MODINO_SLEEP_MUTTERS.length);
  // Across reshuffle boundary, never repeat consecutively
  assert.notEqual(engine.nextSleepMutter(), prevSleep);

  const seenWake = new Set<string>();
  let prevWake = '';
  for (let i = 0; i < MODINO_WAKE_LINES.length; i++) {
    const wake = engine.nextWakeUp();
    assert.notEqual(wake.text, prevWake);
    assert.ok(wake.mood === 'surprised' || wake.mood === 'jump');
    seenWake.add(wake.text);
    prevWake = wake.text;
  }
  assert.equal(seenWake.size, MODINO_WAKE_LINES.length);
  assert.notEqual(engine.nextWakeUp().text, prevWake);
});

test('Micro-hearts emitter enforces contextual rules, never emits during sleepy_zzz/ew_cringe, and respects reduced motion', () => {
  // Never emit during sleepy_zzz or ew_cringe
  assert.equal(
    getModinoMicroHeartCount({ trigger: 'direct_tap', mood: 'sleepy_zzz', randomFn: () => 0.1 }),
    0,
  );
  assert.equal(
    getModinoMicroHeartCount({ trigger: 'direct_tap', mood: 'ew_cringe', randomFn: () => 0.1 }),
    0,
  );
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'category',
      category: 'gift_ew',
      mood: 'ew_cringe',
      randomFn: () => 0.1,
    }),
    0,
  );

  // Direct tap emits 2 to 4 hearts
  const minTap = getModinoMicroHeartCount({
    trigger: 'direct_tap',
    mood: 'happy_smile',
    randomFn: () => 0,
  });
  const maxTap = getModinoMicroHeartCount({
    trigger: 'direct_tap',
    mood: 'happy_smile',
    randomFn: () => 0.99,
  });
  assert.equal(minTap, 2);
  assert.equal(maxTap, 4);

  // Warm contextual moods/categories emit 2 to 3 hearts
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'category',
      category: 'cute',
      mood: 'shy_blush',
      randomFn: () => 0,
    }),
    2,
  );
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'category',
      category: 'ending',
      mood: 'kiss',
      randomFn: () => 0.99,
    }),
    3,
  );

  // Positive section milestones emit 1 ambient heart at ~35% probability
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'category',
      category: 'spin',
      mood: 'laugh',
      randomFn: () => 0.2,
    }),
    1,
  );
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'category',
      category: 'spin',
      mood: 'laugh',
      randomFn: () => 0.8,
    }),
    0,
  );

  // Reduced motion emits at most 1 gentle heart
  assert.equal(
    getModinoMicroHeartCount({
      trigger: 'direct_tap',
      mood: 'kiss',
      reducedMotion: true,
      randomFn: () => 0.99,
    }),
    1,
  );

  // Generated heart particles stay within exact size/motion/color bounds
  let idCounter = 1;
  const particles = createModinoMicroHearts(4, () => idCounter++, { randomFn: () => 0.5 });
  assert.equal(particles.length, 4);
  assert.equal(MODINO_MAX_ACTIVE_HEARTS, 12);
  for (const p of particles) {
    assert.ok(p.size >= 8 && p.size <= 13);
    assert.ok((MODINO_HEART_COLORS as readonly string[]).includes(p.color));
    assert.ok(p.dx >= -26 && p.dx <= 26);
    assert.ok(p.dy <= -48 && p.dy >= -82);
    assert.ok(p.rot >= -18 && p.rot <= 18);
    assert.ok(p.durationMs >= 1350 && p.durationMs <= 1850);
  }
});

test('emitModinoEvent enforces 750ms spam cooldown unless force=true', () => {
  resetModinoBusCooldown();
  assert.equal(emitModinoEvent('cute', { nowMs: 1000 }), true);
  assert.equal(emitModinoEvent('cute', { nowMs: 1000 + MODINO_SPAM_COOLDOWN_MS - 1 }), false);
  assert.equal(emitModinoEvent('gift_ew', { force: true, nowMs: 1200 }), true);
  assert.equal(emitModinoEvent('backstory', { nowMs: 1200 + MODINO_SPAM_COOLDOWN_MS + 1 }), true);
});

test('Hybrid UI SFX manifest lists GitHub CDN URLs and mute toggle updates cleanly', () => {
  assert.ok(Object.keys(GITHUB_SFX_MANIFEST).length >= 10);
  for (const url of Object.values(GITHUB_SFX_MANIFEST)) {
    assert.ok(typeof url === 'string' && url.startsWith('https://cdn.jsdelivr.net/gh/'));
  }

  setUiSfxMuted(false);
  assert.equal(isUiSfxMuted(), false);
  assert.equal(toggleUiSfxMute(), true);
  assert.equal(isUiSfxMuted(), true);
  setUiSfxMuted(false);
});
