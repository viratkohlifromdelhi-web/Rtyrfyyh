import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAPLI_COOL_DOWN_LINE,
  TAPLI_DEFAULT_IDLE_LINE,
  TAPLI_FX_POOL_SIZE,
  TAPLI_MODINO_MILESTONES,
  TAPLI_POP_WORDS,
  TAPLI_STAGES,
  computeTapliCombo,
  computeTapliVisualPalette,
  getTapliMilestone,
  getTapliStage,
  getTapliStageProgress,
  isTapliAnalyticsMilestone,
  isTapliStageUnlock,
  pickNextTapliDialogue,
  pickTapliPopWord,
  resolveTapliDirection,
} from './tapliArenaCore';

test('getTapliStage maps exact tap thresholds across all 8 escalating stages (0 to 150+)', () => {
  assert.equal(getTapliStage(0).moodLabel, 'Sweet & Clueless');
  assert.equal(getTapliStage(4).moodLabel, 'Sweet & Clueless');
  assert.equal(getTapliStage(5).moodLabel, 'Side Eye Alert');
  assert.equal(getTapliStage(14).moodLabel, 'Side Eye Alert');
  assert.equal(getTapliStage(15).moodLabel, 'Pouty & Offended');
  assert.equal(getTapliStage(29).moodLabel, 'Pouty & Offended');
  assert.equal(getTapliStage(30).moodLabel, 'Full Tomato Mode');
  assert.equal(getTapliStage(49).moodLabel, 'Full Tomato Mode');
  assert.equal(getTapliStage(50).moodLabel, 'Dizzy Chaos');
  assert.equal(getTapliStage(74).moodLabel, 'Dizzy Chaos');
  assert.equal(getTapliStage(75).moodLabel, 'Drama Queen Tears');
  assert.equal(getTapliStage(99).moodLabel, 'Drama Queen Tears');
  assert.equal(getTapliStage(100).moodLabel, 'Soul Left The Body');
  assert.equal(getTapliStage(149).moodLabel, 'Soul Left The Body');
  assert.equal(getTapliStage(150).moodLabel, 'Tapli Zen Goddess');
  assert.equal(getTapliStage(320).moodLabel, 'Tapli Zen Goddess');
});

test('computeTapliVisualPalette activates exact skin tints and props for every stage', () => {
  const s1 = computeTapliVisualPalette(0);
  assert.equal(s1.skinTop, '#FDE1CE');
  assert.equal(s1.skinBottom, '#F4C7AD');
  assert.equal(s1.blushOpacity, 0.34);
  assert.equal(s1.showAngerMark, false);
  assert.equal(s1.showHeadBump, false);

  const s3 = computeTapliVisualPalette(15);
  assert.equal(s3.skinTop, '#FBC1B2');
  assert.equal(s3.showAngerMark, true);
  assert.equal(s3.showSteamPuffs, false);

  const s4 = computeTapliVisualPalette(30);
  assert.equal(s4.skinTop, '#FA9E94');
  assert.equal(s4.skinBottom, '#E86F6A');
  assert.equal(s4.showHeadBump, true);
  assert.equal(s4.showSteamPuffs, true);
  assert.equal(s4.showAngerMark, true);

  const s5 = computeTapliVisualPalette(50);
  assert.equal(s5.skinTop, '#FA9289');
  assert.equal(s5.showDizzyRing, true);
  assert.equal(s5.showOrbitStars, true);
  assert.equal(s5.showHeadBump, true);
  assert.equal(s5.showSteamPuffs, false);

  const s6 = computeTapliVisualPalette(75);
  assert.equal(s6.skinTop, '#FBA79F');
  assert.equal(s6.showBandage, true);
  assert.equal(s6.showDramaStreaks, true);
  assert.equal(s6.showOrbitStars, false);

  const s7 = computeTapliVisualPalette(100);
  assert.equal(s7.skinTop, '#F2EBF5');
  assert.equal(s7.skinBottom, '#DDD1E8');
  assert.equal(s7.showGhostSoul, true);
  assert.equal(s7.showBandage, false);

  const s8 = computeTapliVisualPalette(150);
  assert.equal(s8.showZenHalo, true);
  assert.equal(s8.showZenRays, true);
  assert.equal(s8.showGhostSoul, false);
});

test('pickNextTapliDialogue never repeats the exact previous dialogue line back-to-back across all 8 stages', () => {
  for (const stage of TAPLI_STAGES) {
    let prev = '';
    for (let i = 0; i < 16; i++) {
      const next = pickNextTapliDialogue(stage.id, prev, () => (i * 0.37) % 0.99);
      assert.notEqual(next, prev);
      assert.equal(stage.dialogues.includes(next), true);
      prev = next;
    }
  }
});

test('computeTapliCombo tracks 680ms chain window, labels, and 10x+ Golden Combo Overdrive', () => {
  const first = computeTapliCombo(0, null, 1000);
  assert.equal(first.count, 1);
  assert.equal(first.label, null);
  assert.equal(first.isOverdrive, false);

  const combo3 = computeTapliCombo(2, 1200, 1500);
  assert.equal(combo3.count, 3);
  assert.equal(combo3.label, 'Combo x3');
  assert.equal(combo3.isOverdrive, false);

  const streak5 = computeTapliCombo(4, 1500, 2180);
  assert.equal(streak5.count, 5);
  assert.equal(streak5.label, '5x Streak!');
  assert.equal(streak5.isOverdrive, false);

  const overdrive10 = computeTapliCombo(9, 2180, 2500);
  assert.equal(overdrive10.count, 10);
  assert.equal(overdrive10.label, '10x Streak!');
  assert.equal(overdrive10.isOverdrive, true);

  const turbo15 = computeTapliCombo(14, 2500, 2800);
  assert.equal(turbo15.count, 15);
  assert.equal(turbo15.label, '15x Turbo Tapli!');
  assert.equal(turbo15.isOverdrive, true);

  const unstoppable30 = computeTapliCombo(29, 2800, 3100);
  assert.equal(unstoppable30.count, 30);
  assert.equal(unstoppable30.label, '30x Unstoppable!');
  assert.equal(unstoppable30.isOverdrive, true);

  const reset = computeTapliCombo(30, 3100, 3850);
  assert.equal(reset.count, 1);
  assert.equal(reset.label, null);
  assert.equal(reset.isOverdrive, false);
});

test('resolveTapliDirection maps left/right taps and alternates cleanly at center', () => {
  assert.equal(resolveTapliDirection(0.2, 1), -1);
  assert.equal(resolveTapliDirection(0.8, 1), 1);
  assert.equal(resolveTapliDirection(0.5, 1), -1);
  assert.equal(resolveTapliDirection(0.5, 2), 1);
  assert.equal(resolveTapliDirection(null, 3), -1);
  assert.equal(resolveTapliDirection(null, 4), 1);
});

test('stage progress, milestones, pop words, and FX pool size match Tapli Arena 2.0 specs', () => {
  assert.equal(TAPLI_FX_POOL_SIZE, 10);

  const p1 = getTapliStageProgress(0);
  assert.equal(p1.stageIndex, 1);
  assert.equal(p1.totalStages, 8);
  assert.equal(p1.nextHint, 'Next mood at 5');

  const p8 = getTapliStageProgress(150);
  assert.equal(p8.stageIndex, 8);
  assert.equal(p8.pct, 100);
  assert.equal(p8.nextHint, 'Max zen unlocked');

  for (const m of [1, 5, 15, 30, 50, 75, 100, 150]) {
    assert.equal(getTapliMilestone(m), m);
  }
  assert.equal(getTapliMilestone(2), null);
  assert.equal(getTapliMilestone(151), null);

  assert.equal(isTapliStageUnlock(1), false);
  assert.equal(isTapliStageUnlock(5), true);
  assert.equal(isTapliStageUnlock(75), true);
  assert.equal(isTapliStageUnlock(100), true);
  assert.equal(isTapliStageUnlock(150), true);

  assert.equal(isTapliAnalyticsMilestone(1), true);
  assert.equal(isTapliAnalyticsMilestone(5), false);
  assert.equal(isTapliAnalyticsMilestone(15), true);
  assert.equal(isTapliAnalyticsMilestone(30), true);
  assert.equal(isTapliAnalyticsMilestone(50), true);
  assert.equal(isTapliAnalyticsMilestone(75), false);
  assert.equal(isTapliAnalyticsMilestone(100), true);
  assert.equal(isTapliAnalyticsMilestone(150), true);

  assert.equal(pickTapliPopWord(1, 0), 'PAT!');
  assert.equal(pickTapliPopWord(7, 0), 'SOUL OUT!');
  assert.equal(pickTapliPopWord(8, 2), 'LEGEND!');
});

test('strict zero-dash audit across all 8 stages, dialogues, pop words, toasts, combo labels, cooldown, and Modino lines', () => {
  const dashPattern = /[—–-]/;
  assert.equal(dashPattern.test(TAPLI_COOL_DOWN_LINE), false);
  assert.equal(dashPattern.test(TAPLI_DEFAULT_IDLE_LINE), false);

  for (const word of TAPLI_POP_WORDS) {
    assert.equal(dashPattern.test(word), false, `Dash found in pop word: ${word}`);
  }
  for (const stage of TAPLI_STAGES) {
    assert.equal(dashPattern.test(stage.moodLabel), false, `Dash found in moodLabel: ${stage.moodLabel}`);
    assert.equal(dashPattern.test(stage.unlockToast), false, `Dash found in unlockToast: ${stage.unlockToast}`);
    for (const line of stage.dialogues) {
      assert.equal(dashPattern.test(line), false, `Dash found in dialogue: ${line}`);
    }
  }
  for (const reaction of Object.values(TAPLI_MODINO_MILESTONES)) {
    assert.equal(dashPattern.test(reaction.text), false, `Dash found in Modino line: ${reaction.text}`);
  }
});
