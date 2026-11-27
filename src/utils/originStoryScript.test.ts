import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIVE_TWO_INCHES,
  ORIGIN_AUDIO_CONFIG,
  ORIGIN_CAPTION_KEYWORDS,
  ORIGIN_CAST,
  ORIGIN_KISS_AUDIO_FILENAME,
  ORIGIN_RULER_TICKS,
  ORIGIN_SCENES,
  ORIGIN_TOTAL_SCENES,
  SCENE5_KISS_TIMING,
  SCENE_10_FREEZE_STEPS,
  SCENE_8_GROWTH_STEPS,
  SCENE_9_GROWTH_STEPS,
  buildOriginKissTrackSrc,
  computeScene5SyncedTimings,
  getIstMonthDay,
  getOriginFinaleCopy,
  getOriginRomanticGlowIntensity,
  getScene5KissPose,
  inchesToChartRatio,
  inchesToStageBottomPct,
  inchesToSvgCrownY,
} from '../components/originStory/originScript';

const VISIBLE_DASH_REGEX = /[-–—]/;

test('Origin Story defines all 11 interactive scenes with atmospheric backdrop moods', () => {
  assert.equal(ORIGIN_TOTAL_SCENES, 11);
  assert.equal(ORIGIN_SCENES.length, 11);

  ORIGIN_SCENES.forEach((scene, idx) => {
    assert.equal(scene.index, idx);
    assert.equal(scene.sceneNumber, idx + 1);
    assert.ok(scene.settleDurationMs > 0);
    assert.ok(scene.backdropMood.length > 0);
  });

  assert.equal(ORIGIN_SCENES[0].title, 'Before the Cake and the Chaos');
  assert.equal(ORIGIN_SCENES[1].nameplateSubtitle, 'Peaceful, proud, and smiling');
  assert.equal(ORIGIN_SCENES[2].nameplateSubtitle, 'Kind, graceful, and glowing');
  assert.equal(ORIGIN_SCENES[9].id, 'padlock_freeze');
  assert.equal(ORIGIN_SCENES[9].sceneNumber, 10);
  assert.equal(ORIGIN_SCENES[10].id, 'grand_finale');
  assert.equal(ORIGIN_SCENES[10].sceneNumber, 11);
  assert.equal(ORIGIN_SCENES[10].backdropMood, 'gala_finale');
});

test('Zero visible dashes appear in any user-facing Origin Story string', () => {
  const stringsToVerify: string[] = [
    ORIGIN_CAST.father.name,
    ORIGIN_CAST.father.subtitle,
    ORIGIN_CAST.mother.name,
    ORIGIN_CAST.mother.subtitle,
    ORIGIN_CAST.birthdayGirl.name,
    ORIGIN_CAST.birthdayGirl.birthDateStamp,
    ...ORIGIN_CAPTION_KEYWORDS,
  ];

  for (const scene of ORIGIN_SCENES) {
    stringsToVerify.push(scene.label, scene.caption);
    if (scene.secondaryCaption) stringsToVerify.push(scene.secondaryCaption);
    if (scene.eyebrow) stringsToVerify.push(scene.eyebrow);
    if (scene.title) stringsToVerify.push(scene.title);
    if (scene.nameplateTitle) stringsToVerify.push(scene.nameplateTitle);
    if (scene.nameplateSubtitle) stringsToVerify.push(scene.nameplateSubtitle);
    if (scene.stampTitle) stringsToVerify.push(scene.stampTitle);
  }

  for (const step of [...SCENE_8_GROWTH_STEPS, ...SCENE_9_GROWTH_STEPS, ...SCENE_10_FREEZE_STEPS]) {
    stringsToVerify.push(step.heightLabel);
  }

  for (const tick of ORIGIN_RULER_TICKS) {
    stringsToVerify.push(tick.label);
  }

  const birthdayCopy = getOriginFinaleCopy(new Date('2026-12-03T12:00:00+05:30'));
  const otherDayCopy = getOriginFinaleCopy(new Date('2026-11-27T12:00:00+05:30'));
  for (const copy of [birthdayCopy, otherDayCopy]) {
    stringsToVerify.push(copy.headline, copy.subcaption, copy.badgeLabel, copy.ctaLabel);
  }

  for (const text of stringsToVerify) {
    assert.equal(
      VISIBLE_DASH_REGEX.test(text),
      false,
      `Unexpected visible dash found in: "${text}"`,
    );
  }
});

test('Growth pacing enforces exact 1000ms per year for Ages 10 to 14 and Ages 14 to 17', () => {
  // Scene 8: Ages 0..3 at 700ms each
  assert.deepEqual(
    SCENE_8_GROWTH_STEPS.map((s) => ({ age: s.age, ms: s.durationMs, stage: s.stage })),
    [
      { age: 0, ms: 700, stage: 'newborn' },
      { age: 1, ms: 700, stage: 'toddler' },
      { age: 2, ms: 700, stage: 'toddler' },
      { age: 3, ms: 700, stage: 'toddler' },
    ],
  );

  // Scene 9: Ages 4..9 at 400ms, Ages 10..14 at STRICT 1000ms
  for (const step of SCENE_9_GROWTH_STEPS) {
    if (step.age <= 9) {
      assert.equal(step.durationMs, 400, `Expected 400ms for age ${step.age}`);
      assert.equal(step.stage, 'girl');
    } else {
      assert.equal(step.durationMs, 1000, `Expected 1000ms for age ${step.age}`);
      assert.equal(step.stage, step.age === 14 ? 'teen' : 'girl');
    }
  }

  // Scene 10 of 11: Ages 14..17 frozen dead-flat at 62" (5'2") for 1000ms each
  assert.deepEqual(
    SCENE_10_FREEZE_STEPS.map((s) => ({
      age: s.age,
      year: s.year,
      inches: s.inches,
      heightLabel: s.heightLabel,
      durationMs: s.durationMs,
      stage: s.stage,
    })),
    [
      { age: 14, year: 2023, inches: FIVE_TWO_INCHES, heightLabel: "5'2\"", durationMs: 1000, stage: 'teen' },
      { age: 15, year: 2024, inches: FIVE_TWO_INCHES, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen' },
      { age: 16, year: 2025, inches: FIVE_TWO_INCHES, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen' },
      { age: 17, year: 2026, inches: FIVE_TWO_INCHES, heightLabel: "Still 5'2\"", durationMs: 1000, stage: 'teen' },
    ],
  );
});

test('Unified proportional height ruler math locks 5\'2" (62") to exact 79% and includes all foot ticks 1\'0" to 6\'0"', () => {
  const ratio = inchesToChartRatio(FIVE_TWO_INCHES);
  assert.ok(Math.abs(ratio - 0.79) < 1e-9, `Expected 0.79, got ${ratio}`);

  const crownY = inchesToSvgCrownY(FIVE_TWO_INCHES);
  assert.ok(Math.abs(crownY - 46.2) < 1e-6, `Expected 46.2, got ${crownY}`);

  const stageBottomPct = inchesToStageBottomPct(FIVE_TWO_INCHES);
  assert.ok(stageBottomPct > 79 && stageBottomPct < 81);

  const majorLabels = ORIGIN_RULER_TICKS.filter((t) => t.major).map((t) => t.label);
  assert.deepEqual(majorLabels, ["6'0\"", "5'2\"", "5'0\"", "4'0\"", "3'0\"", "2'0\"", "1'0\""]);
});

test('Live IST (Asia/Kolkata) finale copy switches cleanly between 03 December and all other dates', () => {
  // 03 Dec 2026 00:05 IST = 02 Dec 2026 18:35 UTC
  const dec3IstStart = new Date('2026-12-02T18:35:00.000Z');
  assert.deepEqual(getIstMonthDay(dec3IstStart), { month: '12', day: '03' });
  const birthdayCopy = getOriginFinaleCopy(dec3IstStart);
  assert.equal(birthdayCopy.isBirthdayToday, true);
  assert.equal(birthdayCopy.badgeLabel, 'CHAPTER 17 · UNLOCKED');
  assert.equal(birthdayCopy.headline, 'Today, she is turning 17!');
  assert.equal(birthdayCopy.ctaLabel, 'Enter Birthday World');
  assert.equal(
    birthdayCopy.subcaption,
    "Still 5'2 feet. Still pure sunshine and chaos. Happy 17th Birthday, Anamika!",
  );

  // 02 Dec 2026 23:55 IST = 02 Dec 2026 18:25 UTC (still Dec 2 in IST)
  const dec2IstEnd = new Date('2026-12-02T18:25:00.000Z');
  assert.deepEqual(getIstMonthDay(dec2IstEnd), { month: '12', day: '02' });
  const beforeCopy = getOriginFinaleCopy(dec2IstEnd);
  assert.equal(beforeCopy.isBirthdayToday, false);
  assert.equal(beforeCopy.badgeLabel, 'CHAPTER 17 · UNLOCKED');
  assert.equal(beforeCopy.headline, 'She has turned 17 on 03 Dec 2026!');
  assert.equal(beforeCopy.ctaLabel, 'Enter Birthday World');
  assert.equal(
    beforeCopy.subcaption,
    "Still 5'2 feet. Still pure sunshine and chaos. Welcome to Anamika's 17th Birthday!",
  );
});

test('Scene 5 starry kiss 5-phase timeline, audio cues, and pose contact geometry stay synchronized', () => {
  const expectedFilename =
    'In The Night No Control 🖤🔥  Song Lyrics Status #shorts_ #lyrics_.mp3';

  assert.equal(ORIGIN_KISS_AUDIO_FILENAME, expectedFilename);
  assert.equal(buildOriginKissTrackSrc('/'), '/origin-kiss-track.mp3');
  assert.equal(buildOriginKissTrackSrc('/birthday-site/'), '/birthday-site/origin-kiss-track.mp3');
  assert.equal(ORIGIN_AUDIO_CONFIG.kissTrackSrc, buildOriginKissTrackSrc('/'));

  // Exact 5-phase choreography milestones (0ms immediate kiss audio start, full track to natural end)
  assert.equal(SCENE5_KISS_TIMING.phase2StepStartMs, 750);
  assert.equal(SCENE5_KISS_TIMING.phase3LeanInStartMs, 1850);
  assert.equal(SCENE5_KISS_TIMING.audioSwellStartMs, 0);
  assert.equal(SCENE5_KISS_TIMING.phase4KissStartMs, 2400);
  assert.equal(SCENE5_KISS_TIMING.phase4KissHoldMs, 3500);
  assert.equal('audioFadeOutStartMs' in SCENE5_KISS_TIMING, false);
  assert.equal(SCENE5_KISS_TIMING.phase5AfterglowStartMs, 5900);
  assert.equal(SCENE5_KISS_TIMING.settleMs, 6600);
  assert.equal(ORIGIN_AUDIO_CONFIG.playFullTrackToEnd, true);
  assert.equal(ORIGIN_AUDIO_CONFIG.fadeInMs, 180);
  assert.equal(ORIGIN_AUDIO_CONFIG.interruptFadeOutMs, 140);
  assert.equal(ORIGIN_AUDIO_CONFIG.maxVolume, 0.82);

  const kissScene = ORIGIN_SCENES.find((s) => s.id === 'starry_kiss');
  assert.ok(kissScene);
  assert.equal(kissScene.settleDurationMs, SCENE5_KISS_TIMING.settleMs);

  // Resolution-independent contact math verification:
  // Apart (+/-74u) -> Stepped in (+/-41u) -> Lean in (+/-37.5u) -> Kiss contact (+/-36u) -> Shy pull-back (+/-47u)
  const moonlight = getScene5KissPose('moonlight');
  const stepping = getScene5KissPose('stepping');
  const leanIn = getScene5KissPose('leanIn');
  const kissing = getScene5KissPose('kissing');
  const afterglow = getScene5KissPose('afterglow');

  assert.equal(moonlight.shivjee.dxUnits, -74);
  assert.equal(moonlight.archana.dxUnits, 74);
  assert.ok(Math.abs(stepping.shivjee.dxUnits) < Math.abs(moonlight.shivjee.dxUnits));
  assert.ok(Math.abs(leanIn.shivjee.dxUnits) < Math.abs(stepping.shivjee.dxUnits));
  assert.equal(kissing.shivjee.dxUnits, -36);
  assert.equal(kissing.archana.dxUnits, 36);
  assert.equal(kissing.shivjee.torsoRotateDeg, 3.5);
  assert.equal(kissing.archana.torsoRotateDeg, -3.5);
  assert.equal(kissing.shivjee.headTiltDeg, 7);
  assert.equal(kissing.archana.headTiltDeg, -7);
  assert.ok(kissing.archana.dyUnits < 0, 'Archana should have subtle upward tiptoe lift during kiss');
  assert.ok(Math.abs(afterglow.shivjee.dxUnits) > Math.abs(kissing.shivjee.dxUnits));
  assert.equal(afterglow.shivjee.headTiltDeg, 0);
  assert.equal(afterglow.archana.headTiltDeg, 0);
});

test('Romantic soft-pink radial lighting intensity ramps up to peak during the Scene 5 kiss', () => {
  assert.equal(getOriginRomanticGlowIntensity('prologue', 'twilight'), 'ambient');
  assert.equal(getOriginRomanticGlowIntensity('happy_together', 'kissing'), 'ambient');
  assert.equal(getOriginRomanticGlowIntensity('starry_kiss', 'twilight'), 'twilight');
  assert.equal(getOriginRomanticGlowIntensity('starry_kiss', 'shyGlance'), 'building');
  assert.equal(getOriginRomanticGlowIntensity('starry_kiss', 'leanIn'), 'building');
  assert.equal(getOriginRomanticGlowIntensity('starry_kiss', 'kissing'), 'peak');
  assert.equal(getOriginRomanticGlowIntensity('starry_kiss', 'afterglow'), 'afterglow');
});

test('computeScene5SyncedTimings aligns afterglow pull-back with decoded Web Audio clip duration and clamps safely', () => {
  // Undecoded (0ms) or too short (< 3200ms) -> preserves default 5900ms / 6600ms
  const fallback = computeScene5SyncedTimings(0);
  assert.equal(fallback.phase5AfterglowStartMs, SCENE5_KISS_TIMING.phase5AfterglowStartMs);
  assert.equal(fallback.settleMs, SCENE5_KISS_TIMING.settleMs);

  // Mid-length 5400ms trimmed clip -> pulls back at 4700ms, settles at 5400ms
  const syncedMid = computeScene5SyncedTimings(5400);
  assert.equal(syncedMid.phase4KissStartMs, 2400);
  assert.equal(syncedMid.phase5AfterglowStartMs, 4700);
  assert.equal(syncedMid.settleMs, 5400);

  // Short-ish 3500ms clip -> enforces minimum 3600ms afterglow so kiss hold is never skipped
  const syncedMin = computeScene5SyncedTimings(3500);
  assert.equal(syncedMin.phase5AfterglowStartMs, 3600);
  assert.equal(syncedMin.settleMs, 4300);

  // Very long 15000ms clip -> caps afterglow at 9500ms so kiss hold stays graceful
  const syncedMax = computeScene5SyncedTimings(15000);
  assert.equal(syncedMax.phase5AfterglowStartMs, 9500);
  assert.equal(syncedMax.settleMs, 10200);
});




