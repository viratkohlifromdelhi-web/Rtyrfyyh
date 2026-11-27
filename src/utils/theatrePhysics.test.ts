import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIO_FADE_END_SEC,
  AUDIO_HOLD_END_SEC,
  AUDIO_HOLD_GAIN,
  CLOSE_BOW_SEAL_START_SEC,
  CLOSE_CONFETTI_AND_UNLOCK_SEC,
  CLOSE_HOLD_END_SEC,
  CLOSE_POP_END_SEC,
  CLOSE_REVEAL_START_SEC,
  CLOSE_SLIDE_DUR_SEC,
  CLOSE_SNAP_END_SEC,
  CLOSE_STAGE1_END_SEC,
  CLOSE_TOTAL_SEC,
  CURTAIN_OPEN_TOTAL_SEC,
  CURTAIN_REST_SCALE_X,
  CURTAIN_SLIDE_START_SEC,
  CURTAIN_VIDEO_START_SEC,
  EXIT_TRIGGER_SEC,
  FINALE_CAPTION,
  INITIAL_CAPTION,
  MAX_DT_SEC,
  MUSIC_TAKEOVER_FADE_MS,
  PRELOADER_GRACE_MS,
  PRELOADER_MAX_TIMEOUT_MS,
  PRELOADER_TRICKLE_CAP_PCT,
  PRELOADER_UNREADY_CAP_PCT,
  RED_MARK_HOLD_START_SEC,
  SKIP_CLOSE_STAGE1_END_SEC,
  SKIP_CLOSE_TOTAL_SEC,
  STAGE3_AUDIO_END_PROGRESS_THRESHOLD,
  STAGE3_AUDIO_FADE_EXPONENT,
  STAGE3_AUDIO_INTERRUPT_FADE_MS,
  STAGE3_AUDIO_MIN_REMAINING_SEC,
  clampDeltaSec,
  computeClosingExitFrame,
  computeCurtainOpenFrame,
  computeIntroAudioGain,
  computePreloaderProgress,
  computeSmartPreloaderTarget,
  computeStage3RemainingTailSec,
  computeStage3TrailingAudioGain,
  cubicBezierStandard,
  getAudioTimelineCues,
  getPlaybackCues,
  getPreloaderStatusText,
  isStage3TrailingAudioAlreadyFinished,
  stepPreloaderDisplayPct,
} from './theatrePhysics';

test('delta-time clamping caps frame spikes to 0.05s max', () => {
  assert.equal(clampDeltaSec(16.67) < 0.017, true);
  assert.equal(clampDeltaSec(250), MAX_DT_SEC);
  assert.equal(clampDeltaSec(0), 0.001);
});

test('cubic-bezier(0.4, 0, 0.2, 1) evaluator is monotonic from 0 to 1', () => {
  assert.equal(cubicBezierStandard(0), 0);
  assert.equal(cubicBezierStandard(1), 1);
  const mid = cubicBezierStandard(0.5);
  assert.ok(mid > 0.7 && mid < 0.85, `expected standard ease mid near ~0.78, got ${mid}`);
});

test('opening sequence remains untouched: loader fades with bow pop (0-0.25s), curtains slide at 0.15s, video starts at 0.20s, settles at 1.55s', () => {
  const start = computeCurtainOpenFrame(0);
  assert.equal(start.loaderOpacity, 1);
  assert.equal(start.bowScale, 1);
  assert.equal(start.shouldStartVideo, false);

  const overlap = computeCurtainOpenFrame(CURTAIN_VIDEO_START_SEC);
  assert.equal(overlap.shouldStartVideo, true);
  assert.ok(overlap.panelScaleX < 1);

  let maxSkew = 0;
  for (let t = CURTAIN_SLIDE_START_SEC; t <= CURTAIN_OPEN_TOTAL_SEC; t += 0.02) {
    maxSkew = Math.max(maxSkew, Math.abs(computeCurtainOpenFrame(t).leftSkewDeg));
  }
  assert.ok(maxSkew >= 4.4 && maxSkew <= 5.6);

  const settled = computeCurtainOpenFrame(CURTAIN_OPEN_TOTAL_SEC + 0.02);
  assert.equal(settled.isSettled, true);
  assert.equal(settled.panelScaleX, CURTAIN_REST_SCALE_X);
  assert.equal(settled.leftSkewDeg, 0);
});

test('playback timeline holds 1s on red mark (12.5s-13.5s) with sparkle glints and triggers exit at 13.5s', () => {
  const mainClip = getPlaybackCues(9.8);
  assert.equal(mainClip.showSparkleGlints, false);
  assert.equal(mainClip.captionPhase, 'initial');
  assert.equal(mainClip.captionText, INITIAL_CAPTION);
  assert.equal(mainClip.shouldTriggerExit, false);

  const redMarkBeat = getPlaybackCues(RED_MARK_HOLD_START_SEC);
  assert.equal(redMarkBeat.showSparkleGlints, true);
  assert.equal(redMarkBeat.captionPhase, 'finale');
  assert.equal(redMarkBeat.captionText, FINALE_CAPTION);
  assert.equal(redMarkBeat.shouldTriggerExit, false);

  const exitTrigger = getPlaybackCues(EXIT_TRIGGER_SEC);
  assert.equal(exitTrigger.showSparkleGlints, false);
  assert.equal(exitTrigger.shouldTriggerExit, true);
});

test('Stage 1 closing sequence slides curtains inward with +/-4deg cloth inertia, settles to 1.0, and seals bow at 14.7s', () => {
  const start = computeClosingExitFrame(0);
  assert.equal(start.subStage, 'closingCurtains');
  assert.equal(start.panelScaleX, CURTAIN_REST_SCALE_X);
  assert.equal(start.bowOpacity, 0);
  assert.equal(start.stageScaleX, 1);
  assert.equal(start.stageScaleY, 1);

  let minLeftSkew = 0;
  for (let t = 0; t <= CLOSE_SLIDE_DUR_SEC; t += 0.02) {
    const f = computeClosingExitFrame(t);
    minLeftSkew = Math.min(minLeftSkew, f.leftSkewDeg);
  }
  assert.ok(
    minLeftSkew <= -3.7 && minLeftSkew >= -4.2,
    `expected outward cloth inertia near -4deg, got ${minLeftSkew}`,
  );

  // Center meet at 1.1s (14.6s)
  const meet = computeClosingExitFrame(CLOSE_SLIDE_DUR_SEC);
  assert.equal(meet.panelScaleX, 1);
  assert.equal(meet.bowOpacity, 0);

  // Bow sealing starts at 1.2s (14.7s) and completes by 1.45s
  const bowMid = computeClosingExitFrame(CLOSE_BOW_SEAL_START_SEC + 0.1);
  assert.ok(bowMid.bowOpacity > 0 && bowMid.bowOpacity < 1);
  assert.ok(bowMid.bowScale > 0.85 && bowMid.bowScale < 1.0);

  // Stage 2 clean 200ms hold (1.5s -> 1.7s, i.e., 15.0s -> 15.2s)
  const hold = computeClosingExitFrame(CLOSE_STAGE1_END_SEC + 0.1);
  assert.equal(hold.subStage, 'hold');
  assert.equal(hold.panelScaleX, 1);
  assert.equal(hold.leftSkewDeg, 0);
  assert.equal(hold.bowScale, 1);
  assert.equal(hold.bowOpacity, 1);
  assert.equal(hold.stageScaleX, 1);
  assert.equal(hold.stageScaleY, 1);
  assert.equal(hold.shouldPlayWindowShutChime, false);
});

test('Stage 3 unified Style B snap-shut pops to 1.025, collapses scaleY->0.03 & scaleX->0.78, reveals at 15.35s, unlocks+confetti at 15.60s, completes at 15.90s', () => {
  // 80ms anticipation pop (1.70s -> 1.78s)
  const popPeak = computeClosingExitFrame(CLOSE_POP_END_SEC - 0.005);
  assert.equal(popPeak.subStage, 'snapShut');
  assert.equal(popPeak.shouldPlayWindowShutChime, true);
  assert.ok(popPeak.stageScaleX >= 1.023 && popPeak.stageScaleX <= 1.026);
  assert.ok(popPeak.stageScaleY >= 1.023 && popPeak.stageScaleY <= 1.026);
  assert.equal(popPeak.shouldTriggerMainReveal, false);

  // Main site reveal begins at 1.85s (15.35s)
  const atReveal = computeClosingExitFrame(CLOSE_REVEAL_START_SEC);
  assert.equal(atReveal.shouldTriggerMainReveal, true);
  assert.equal(atReveal.shouldUnlockAndFireConfetti, false);

  // Scroll unlock + pointer-events none + confetti at 2.10s (15.60s)
  const atConfetti = computeClosingExitFrame(CLOSE_CONFETTI_AND_UNLOCK_SEC);
  assert.equal(atConfetti.shouldUnlockAndFireConfetti, true);
  assert.ok(atConfetti.backdropOpacity < 0.4);

  // Snap-shut completed by 2.20s (15.70s)
  const afterSnap = computeClosingExitFrame(CLOSE_SNAP_END_SEC);
  assert.ok(Math.abs(afterSnap.stageScaleY - 0.03) < 0.002);
  assert.ok(Math.abs(afterSnap.stageScaleX - 0.78) < 0.002);
  assert.equal(afterSnap.stageOpacity, 0);

  // Full visual completion at 2.40s (15.90s)
  const done = computeClosingExitFrame(CLOSE_TOTAL_SEC);
  assert.equal(done.subStage, 'done');
  assert.equal(done.isVisualComplete, true);
  assert.equal(done.backdropOpacity, 0);
});

test('fast Skip Intro exit runs 0.65s curtain close + 0.45s Style B snap-shut (1.10s total)', () => {
  const closed = computeClosingExitFrame(SKIP_CLOSE_STAGE1_END_SEC, { fastSkip: true });
  assert.equal(closed.panelScaleX, 1);
  assert.equal(closed.bowOpacity, 1);
  assert.equal(closed.shouldPlayWindowShutChime, true);

  const done = computeClosingExitFrame(SKIP_CLOSE_TOTAL_SEC, { fastSkip: true });
  assert.equal(done.isVisualComplete, true);
  assert.equal(done.shouldTriggerMainReveal, true);
  assert.equal(done.shouldUnlockAndFireConfetti, true);
  assert.equal(done.stageOpacity, 0);
  assert.equal(done.backdropOpacity, 0);
});

test('background audio holds chorus at 0.95 through 15.5s, fades smoothly to 0 by 21.0s, and hands off sequentially with zero overlap', () => {
  assert.equal(computeIntroAudioGain(12.0), 1.0);
  assert.equal(computeIntroAudioGain(EXIT_TRIGGER_SEC), 1.0);
  assert.equal(MUSIC_TAKEOVER_FADE_MS, 400);

  // Hold full chorus at 0.95 from 13.8s -> 15.5s
  assert.equal(computeIntroAudioGain(14.5), AUDIO_HOLD_GAIN);
  assert.equal(computeIntroAudioGain(AUDIO_HOLD_END_SEC), AUDIO_HOLD_GAIN);

  // Smooth fade between 15.5s and 21.0s with strictly zero overlap (MP3 stays paused until 21.0s)
  const midFade = computeIntroAudioGain(18.25);
  assert.ok(midFade > 0.25 && midFade < 0.5, `expected mid fade gain ~0.36, got ${midFade}`);
  assert.equal(getAudioTimelineCues(19.0).shouldStartBgMusicAfterIntro, false);
  assert.equal(getAudioTimelineCues(20.95).shouldStartBgMusicAfterIntro, false);
  assert.equal(getAudioTimelineCues(20.95).shouldFinishAudio, false);

  // Complete silence, stop & immediate sequential MP3 handoff at 21.0s
  const atEnd = getAudioTimelineCues(AUDIO_FADE_END_SEC);
  assert.equal(atEnd.gain, 0);
  assert.equal(atEnd.shouldFinishAudio, true);
  assert.equal(atEnd.shouldStartBgMusicAfterIntro, true);
});

test('preloader status text updates cleanly across 0-35%, 35-75%, 75-99%, and 100%', () => {
  assert.equal(getPreloaderStatusText(0), "Setting up Morgan's stage...");
  assert.equal(getPreloaderStatusText(34), "Setting up Morgan's stage...");
  assert.equal(getPreloaderStatusText(35), 'Getting the curtains ready...');
  assert.equal(getPreloaderStatusText(74), 'Getting the curtains ready...');
  assert.equal(getPreloaderStatusText(75), 'Almost there, bauni...');
  assert.equal(getPreloaderStatusText(99), 'Almost there, bauni...');
  assert.equal(getPreloaderStatusText(100), 'Showtime ✨');
});

test('smart preloader skips card during 150ms grace or when cached, trickles up to 28%, caps at 92% until readyState>=3+loadeddata, and supports 6.5s safety fallback', () => {
  // Already cached on mount -> instant ready, never show loader card
  const cached = computeSmartPreloaderTarget({
    bufferedEndSec: 16,
    durationSec: 23.1,
    readyState: 3,
    hasLoadedData: true,
    elapsedMs: 0,
  });
  assert.equal(cached.isReady, true);
  assert.equal(cached.targetPct, 100);
  assert.equal(cached.shouldShowLoaderCard, false);

  // Within 150ms anti-flash grace window -> loader card stays hidden
  const grace = computeSmartPreloaderTarget({
    bufferedEndSec: 0,
    durationSec: 23.1,
    readyState: 0,
    hasLoadedData: false,
    elapsedMs: PRELOADER_GRACE_MS - 30,
  });
  assert.equal(grace.isReady, false);
  assert.equal(grace.shouldShowLoaderCard, false);

  // Waiting for first chunk after 150ms -> card visible, trickle capped at 28%
  const trickling = computeSmartPreloaderTarget({
    bufferedEndSec: 0,
    durationSec: 23.1,
    readyState: 1,
    hasLoadedData: false,
    elapsedMs: 2500,
  });
  assert.equal(trickling.isReady, false);
  assert.equal(trickling.shouldShowLoaderCard, true);
  assert.equal(trickling.targetPct, PRELOADER_TRICKLE_CAP_PCT);

  // Real chunks arriving -> tracks real buffer toward 16s target, capped at 92% until readyState>=3 & loadeddata
  const midChunk = computeSmartPreloaderTarget({
    bufferedEndSec: 8,
    durationSec: 23.1,
    readyState: 2,
    hasLoadedData: true,
    elapsedMs: 600,
  });
  assert.equal(midChunk.realPct, 50);
  assert.equal(midChunk.targetPct, 50);
  assert.equal(midChunk.isReady, false);

  const highChunkNotReady = computeSmartPreloaderTarget({
    bufferedEndSec: 20,
    durationSec: 23.1,
    readyState: 2,
    hasLoadedData: true,
    elapsedMs: 900,
  });
  assert.equal(highChunkNotReady.targetPct, PRELOADER_UNREADY_CAP_PCT);
  assert.equal(highChunkNotReady.isReady, false);

  // 6.5s safety fallback proceeds as soon as readyState >= 2
  assert.equal(PRELOADER_MAX_TIMEOUT_MS, 6500);
  const safetyWait = computeSmartPreloaderTarget({
    bufferedEndSec: 1,
    durationSec: 23.1,
    readyState: 1,
    hasLoadedData: false,
    elapsedMs: PRELOADER_MAX_TIMEOUT_MS,
  });
  assert.equal(safetyWait.isReady, false);

  const safetyProceed = computeSmartPreloaderTarget({
    bufferedEndSec: 2,
    durationSec: 23.1,
    readyState: 2,
    hasLoadedData: true,
    elapsedMs: PRELOADER_MAX_TIMEOUT_MS,
  });
  assert.equal(safetyProceed.isReady, true);
  assert.equal(safetyProceed.targetPct, 100);

  // Smooth rAF display interpolation advances monotonically toward target
  const nextPct = stepPreloaderDisplayPct(10, 60, 0.016);
  assert.ok(nextPct > 10 && nextPct < 60);

  // Legacy wrapper still proceeds on readyState >= 3 or timeout
  const ready = computePreloaderProgress({ bufferedRatio: 0.1, readyState: 3, elapsedMs: 120 });
  assert.equal(ready.isReady, true);
  assert.equal(ready.progress01, 1);
});

test('Stage 3 trailing intro audio fades monotonically over full remaining video tail (duration - handoffTime) using (1 - p)^1.5', () => {
  assert.equal(STAGE3_AUDIO_FADE_EXPONENT, 1.5);
  assert.equal(STAGE3_AUDIO_INTERRUPT_FADE_MS, 180);
  assert.equal(STAGE3_AUDIO_MIN_REMAINING_SEC, 0.12);
  assert.equal(STAGE3_AUDIO_END_PROGRESS_THRESHOLD, 0.995);

  // Already-finished guard: ended === true or duration - currentTime <= 0.12s
  assert.equal(
    isStage3TrailingAudioAlreadyFinished({ ended: true, currentTimeSec: 10, durationSec: 23.1 }),
    true,
  );
  assert.equal(
    isStage3TrailingAudioAlreadyFinished({ ended: false, currentTimeSec: 23.0, durationSec: 23.1 }),
    true,
  );
  assert.equal(
    isStage3TrailingAudioAlreadyFinished({ ended: false, currentTimeSec: 15.35, durationSec: 23.1 }),
    false,
  );

  // Full remaining tail calculation (e.g., 15.35s -> 23.1s = 7.75s remaining, or NaN -> null)
  const remainingSec = computeStage3RemainingTailSec(23.1, 15.35);
  assert.ok(remainingSec !== null && Math.abs(remainingSec - 7.75) < 1e-6);
  assert.equal(computeStage3RemainingTailSec(Number.NaN, 15.35), null);
  assert.equal(computeStage3RemainingTailSec(Number.POSITIVE_INFINITY, 15.35), null);

  // Pending duration holds start volume safely until duration resolves or ended fires
  const pending = computeStage3TrailingAudioGain({
    currentTimeSec: 16.0,
    handoffTimeSec: 15.35,
    remainingSec: null,
    startVolume: 0.95,
  });
  assert.equal(pending.gain, 0.95);
  assert.equal(pending.isDone, false);

  // Start of handoff (p = 0)
  const start = computeStage3TrailingAudioGain({
    currentTimeSec: 15.35,
    handoffTimeSec: 15.35,
    remainingSec,
    startVolume: 1.0,
  });
  assert.equal(start.progress, 0);
  assert.equal(start.gain, 1.0);
  assert.equal(start.isDone, false);

  // Halfway through remaining tail (p = 0.5 -> (0.5)^1.5 ≈ 0.35355)
  const mid = computeStage3TrailingAudioGain({
    currentTimeSec: 15.35 + (remainingSec ?? 0) * 0.5,
    handoffTimeSec: 15.35,
    remainingSec,
    startVolume: 1.0,
  });
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-6);
  const expectedMid = Math.pow(0.5, 1.5);
  assert.ok(Math.abs(mid.gain - expectedMid) < 1e-6, `Expected ${expectedMid}, got ${mid.gain}`);
  assert.equal(mid.isDone, false);

  // Strictly monotonic decrease all the way from 15.35s to 23.1s
  let prev = 1.0;
  for (let frac = 0.05; frac <= 1.0; frac += 0.05) {
    const f = computeStage3TrailingAudioGain({
      currentTimeSec: 15.35 + (remainingSec ?? 0) * frac,
      handoffTimeSec: 15.35,
      remainingSec,
      startVolume: 1.0,
    });
    assert.ok(f.gain <= prev, `Expected gain at frac=${frac} (${f.gain}) <= ${prev}`);
    prev = f.gain;
  }

  // Clean teardown once p >= 0.995
  const nearEnd = computeStage3TrailingAudioGain({
    currentTimeSec: 15.35 + (remainingSec ?? 0) * 0.996,
    handoffTimeSec: 15.35,
    remainingSec,
    startVolume: 1.0,
  });
  assert.equal(nearEnd.gain, 0);
  assert.equal(nearEnd.progress, 1);
  assert.equal(nearEnd.isDone, true);
});


