import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODINO_SPAM_COOLDOWN_MS,
  emitModinoEvent,
  resetModinoBusCooldown,
} from './modinoBus';
import {
  MODINO_REACTION_BANKS,
  MODINO_SIGNATURE_GREETING,
  MODINO_SLEEP_MUTTERS,
  MODINO_WAKE_LINES,
  createModinoReactionEngine,
} from './modinoReactions';
import { GITHUB_SFX_MANIFEST, isUiSfxMuted, setUiSfxMuted, toggleUiSfxMute } from './uiSoundEngine';

test('Modino reaction banks contain zero visible dashes across all speech lines', () => {
  const dashRegex = /[\u2014\u2013-]/;

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

test('Modino always delivers the exact signature greeting first and never repeats consecutively across direct taps', () => {
  const engine = createModinoReactionEngine(() => 0.42);

  const firstGreeting = engine.next('greeting');
  assert.equal(firstGreeting.text, MODINO_SIGNATURE_GREETING.text);
  assert.equal(firstGreeting.mood, 'greeting');

  const seenFirstPass = new Set<string>();
  const directPoolLen = MODINO_REACTION_BANKS.direct_tap.length;
  assert.ok(directPoolLen >= 22, 'direct_tap pool must contain at least 22 reactions');

  let prevText = '';
  for (let i = 0; i < directPoolLen; i++) {
    const r = engine.next('direct_tap');
    assert.notEqual(r.text, prevText, `Consecutive repeat at tap ${i}`);
    seenFirstPass.add(r.text);
    prevText = r.text;
  }
  assert.equal(
    seenFirstPass.size,
    directPoolLen,
    'Fisher-Yates deck must visit every direct_tap reaction before repeating',
  );

  // First item after reshuffle must not repeat last item of previous deck
  const afterReshuffle = engine.next('direct_tap');
  assert.notEqual(afterReshuffle.text, prevText);
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
