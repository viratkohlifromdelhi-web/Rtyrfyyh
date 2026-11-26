import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOPLAY_HANDOFF_FADE_MS,
  BG_MUSIC_SRC,
  CASE_FILE_DUCK_DOWN_MS,
  CASE_FILE_DUCK_GAIN,
  CASE_FILE_RESTORE_MS,
  CELEBRATION_DIP_GAIN,
  CELEBRATION_DIP_HOLD_MS,
  CELEBRATION_SWELL_GAIN,
  CELEBRATION_SWELL_HOLD_MS,
  DEFAULT_BG_MUSIC_GAIN,
  MANUAL_PAUSE_FADE_MS,
  MANUAL_PLAY_FADE_MS,
  MODE_TRANSITION_MS,
  REPLAY_FADE_OUT_MS,
  ROAST_MODE_BG_MUSIC_GAIN,
  SCANNER_DUCK_GAIN,
  SCANNER_DUCK_DOWN_MS,
  SCANNER_RESTORE_MS,
  SCANNER_VERDICT_HOLD_MS,
  SCRATCH_DUCK_GAIN,
  SCRATCH_DUCK_HOLD_MS,
  UNLOCK_FADE_MS,
  VAULT_DUCK_DOWN_MS,
  VAULT_DUCK_GAIN,
  VAULT_RESTORE_DELAY_MS,
  VAULT_RESTORE_MS,
  WHEEL_DUCK_DOWN_MS,
  WHEEL_DUCK_GAIN,
  WHEEL_RESTORE_DELAY_MS,
  WHEEL_RESTORE_MS,
  WHOLESOME_MODE_BG_MUSIC_GAIN,
  buildBgMusicSrc,
  getBaseGainForMode,
  resolveEffectiveMusicGain,
  shouldTriggerAutoplayUnlock,
} from './musicController';

test('BG_MUSIC_SRC encodes local public MP3 path cleanly with Vite BASE_URL and zero external URL', () => {
  assert.equal(
    BG_MUSIC_SRC,
    '/Milky%20-%20Just%20The%20Way%20You%20Are%20(Official%20Audio).mp3',
  );
  assert.equal(
    buildBgMusicSrc('/birthday-site/'),
    '/birthday-site/Milky%20-%20Just%20The%20Way%20You%20Are%20(Official%20Audio).mp3',
  );
  assert.equal(
    buildBgMusicSrc('/birthday-site'),
    '/birthday-site/Milky%20-%20Just%20The%20Way%20You%20Are%20(Official%20Audio).mp3',
  );
  assert.equal(BG_MUSIC_SRC.startsWith('/'), true);
  assert.equal(BG_MUSIC_SRC.includes('cloudinary'), false);
});

test('base loudness and fade timings match specification', () => {
  assert.equal(DEFAULT_BG_MUSIC_GAIN, 0.45);
  assert.equal(ROAST_MODE_BG_MUSIC_GAIN, 0.4);
  assert.equal(WHOLESOME_MODE_BG_MUSIC_GAIN, 0.5);

  assert.equal(MANUAL_PLAY_FADE_MS, 1200);
  assert.equal(MANUAL_PAUSE_FADE_MS, 450);
  assert.equal(AUTOPLAY_HANDOFF_FADE_MS, 1500);
  assert.equal(UNLOCK_FADE_MS, 1200);
  assert.equal(REPLAY_FADE_OUT_MS, 400);
  assert.equal(MODE_TRANSITION_MS, 1000);

  assert.equal(getBaseGainForMode('default'), 0.45);
  assert.equal(getBaseGainForMode('roast'), 0.4);
  assert.equal(getBaseGainForMode('wholesome'), 0.5);
});

test('interactive ducking constants match calibrated values', () => {
  assert.equal(WHEEL_DUCK_GAIN, 0.12);
  assert.equal(WHEEL_DUCK_DOWN_MS, 300);
  assert.equal(WHEEL_RESTORE_DELAY_MS, 1500);
  assert.equal(WHEEL_RESTORE_MS, 1200);

  assert.equal(SCANNER_DUCK_GAIN, 0.1);
  assert.equal(SCANNER_DUCK_DOWN_MS, 250);
  assert.equal(SCANNER_VERDICT_HOLD_MS, 1000);
  assert.equal(SCANNER_RESTORE_MS, 800);

  assert.equal(CELEBRATION_DIP_GAIN, 0.15);
  assert.equal(CELEBRATION_DIP_HOLD_MS, 600);
  assert.equal(CELEBRATION_SWELL_GAIN, 0.55);
  assert.equal(CELEBRATION_SWELL_HOLD_MS, 3000);

  assert.equal(SCRATCH_DUCK_GAIN, 0.22);
  assert.equal(SCRATCH_DUCK_HOLD_MS, 1200);

  assert.equal(CASE_FILE_DUCK_GAIN, 0.18);
  assert.equal(CASE_FILE_DUCK_DOWN_MS, 250);
  assert.equal(CASE_FILE_RESTORE_MS, 900);

  assert.equal(VAULT_DUCK_GAIN, 0.14);
  assert.equal(VAULT_DUCK_DOWN_MS, 350);
  assert.equal(VAULT_RESTORE_DELAY_MS, 1500);
  assert.equal(VAULT_RESTORE_MS, 1000);
});

test('resolveEffectiveMusicGain prioritizes dips over swells and picks the quietest overlapping dip', () => {
  assert.equal(resolveEffectiveMusicGain('default', {}), 0.45);
  assert.equal(resolveEffectiveMusicGain('roast', {}), 0.4);
  assert.equal(resolveEffectiveMusicGain('wholesome', {}), 0.5);

  // Individual channels
  assert.equal(resolveEffectiveMusicGain('default', { wheel: WHEEL_DUCK_GAIN }), 0.12);
  assert.equal(resolveEffectiveMusicGain('default', { scanner: SCANNER_DUCK_GAIN }), 0.1);
  assert.equal(resolveEffectiveMusicGain('default', { scratch: SCRATCH_DUCK_GAIN }), 0.22);
  assert.equal(resolveEffectiveMusicGain('default', { caseFile: CASE_FILE_DUCK_GAIN }), 0.18);
  assert.equal(resolveEffectiveMusicGain('default', { vault: VAULT_DUCK_GAIN }), 0.14);
  assert.equal(
    resolveEffectiveMusicGain('default', { celebration: CELEBRATION_DIP_GAIN }),
    0.15,
  );
  assert.equal(
    resolveEffectiveMusicGain('default', { celebration: CELEBRATION_SWELL_GAIN }),
    0.55,
  );

  // Dip always wins over celebration swell so SFX cut through
  assert.equal(
    resolveEffectiveMusicGain('wholesome', {
      celebration: CELEBRATION_SWELL_GAIN,
      scratch: SCRATCH_DUCK_GAIN,
    }),
    0.22,
  );

  // Quietest dip wins when multiple dips overlap
  assert.equal(
    resolveEffectiveMusicGain('default', {
      wheel: WHEEL_DUCK_GAIN,
      scanner: SCANNER_DUCK_GAIN,
    }),
    0.1,
  );
});

test('passive autoplay unlock guard respects manual userPaused flag', () => {
  assert.equal(
    shouldTriggerAutoplayUnlock({ awaitingUnlock: true, userPaused: false, isPlaying: false }),
    true,
  );
  assert.equal(
    shouldTriggerAutoplayUnlock({ awaitingUnlock: true, userPaused: true, isPlaying: false }),
    false,
  );
  assert.equal(
    shouldTriggerAutoplayUnlock({ awaitingUnlock: true, userPaused: false, isPlaying: true }),
    false,
  );
  assert.equal(
    shouldTriggerAutoplayUnlock({ awaitingUnlock: false, userPaused: false, isPlaying: false }),
    false,
  );
});
