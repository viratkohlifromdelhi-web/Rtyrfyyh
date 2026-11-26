/**
 * Pure 60fps physics, timing cues, closing curtain & unified Style B snap-shut curves,
 * audio fade curves, and preloader logic for the Mini-Theatre Opening Curtain & Video Intro Screen.
 * All motion uses clamped delta-time (dt <= 0.05s) for locked 60fps mobile playback.
 */

export const INTRO_VIDEO_DURATION_SEC = 23.1;
export const PRELOADER_TARGET_BUFFER_SEC = 16;
export const PRELOADER_GRACE_MS = 150;
export const PRELOADER_TRICKLE_CAP_PCT = 28;
export const PRELOADER_TRICKLE_DURATION_MS = 2000;
export const PRELOADER_UNREADY_CAP_PCT = 92;
export const PRELOADER_GLIDE_TO_100_MS = 220;
export const PRELOADER_CARD_FADE_MS = 250;
export const PRELOADER_MAX_TIMEOUT_MS = 6500;
export const SKIP_FADE_IN_SEC = 4.0;

// Exact Playback & Background Audio Timeline
export const RED_MARK_HOLD_START_SEC = 12.5;
export const EXIT_TRIGGER_SEC = 13.5;
export const AUDIO_HOLD_END_SEC = 15.5; // Hold chorus full (0.95) across 13.5s -> 15.5s
export const AUDIO_FADE_END_SEC = 21.0; // Complete silence by 21.0s -> strictly sequential MP3 handoff

export const AUDIO_HOLD_GAIN = 0.95;
export const BG_MUSIC_TARGET_GAIN = 0.45;
export const BG_MUSIC_AUTOPLAY_FADE_MS = 1500;
export const SKIP_AUDIO_FADE_MS = 1200;
export const MUSIC_TAKEOVER_FADE_MS = 400;

// Opening Timeline (0.0s -> 1.55s) — UNTOUCHED
export const CURTAIN_BOW_UNTIE_SEC = 0.25;
export const CURTAIN_SLIDE_START_SEC = 0.15;
export const CURTAIN_VIDEO_START_SEC = 0.2;
export const CURTAIN_OPEN_TOTAL_SEC = 1.55;
export const CURTAIN_REST_SCALE_X = 0.21; // ~10.5% of total 16:9 stage width per panel

// Normal Three-Stage Closing Sequence (13.5s -> 15.9s, relative t = 0.00s -> 2.40s)
export const CLOSE_SLIDE_DUR_SEC = 1.1; // 13.5s -> 14.6s (1.1s smooth slide inward)
export const CLOSE_STAGE1_END_SEC = 1.5; // 14.6s -> 15.0s (0.4s damped settle + bow seal)
export const CLOSE_BOW_SEAL_START_SEC = 1.2; // 14.7s (bow pops & fades back in over 250ms)
export const CLOSE_BOW_SEAL_DUR_SEC = 0.25;
export const CLOSE_HOLD_END_SEC = 1.7; // 15.0s -> 15.2s (0.2s clean hold on bow-sealed curtains)
export const CLOSE_POP_END_SEC = 1.78; // 15.20s -> 15.28s (80ms anticipation pop to scale 1.025)
export const CLOSE_SNAP_END_SEC = 2.2; // 15.28s -> 15.70s (420ms vertical snap-shut collapse)
export const CLOSE_REVEAL_START_SEC = 1.85; // 15.35s -> 15.90s (550ms backdrop fade & site reveal)
export const CLOSE_CONFETTI_AND_UNLOCK_SEC = 2.1; // 15.60s (~70% faded -> pointer-events none, unlock scroll, confetti)
export const CLOSE_TOTAL_SEC = 2.4; // 15.90s (visual exit complete -> audioOnly or unmount)

// Fast Skip Intro Closing Sequence (0.65s curtain close + 0.45s Style B snap-shut = 1.10s total)
export const SKIP_CLOSE_STAGE1_END_SEC = 0.65;
export const SKIP_CLOSE_TOTAL_SEC = 1.1;

export const MAX_DT_SEC = 0.05;

export const INITIAL_CAPTION = 'Watch for a second, bauni 👀';
export const FINALE_CAPTION = 'Opening your surprise, bachhaww ✨';

export interface CurtainOpenFrame {
  /** Loader pill opacity (1 -> 0 simultaneously with bow pop over 250ms) */
  loaderOpacity: number;
  /** Bow pop scale (1.0 -> 1.12 -> 0.84) */
  bowScale: number;
  /** Bow opacity (1 -> 0 over 250ms) */
  bowOpacity: number;
  /** Horizontal panel scaleX (1.0 closed -> 0.21 gathered ~10% per side) */
  panelScaleX: number;
  /** Dynamic pendulum cloth lag skewX for the left panel (right panel is -leftSkewDeg) */
  leftSkewDeg: number;
  /** Subtle horizontal wave ripple offset while sliding */
  waveRipple: number;
  /** Normalized open progress 0..1 */
  openProgress: number;
  /** True once elapsedSec >= 0.20s so video.play() triggers right as curtains part */
  shouldStartVideo: boolean;
  /** True once curtain opening + damped spring settle has completed (1.55s) */
  isSettled: boolean;
}

export interface ClosingExitFrame {
  elapsedSec: number;
  subStage: 'closingCurtains' | 'hold' | 'snapShut' | 'done';
  /** Horizontal panel scaleX (from startScaleX ~0.21 back to 1.0 fully closed) */
  panelScaleX: number;
  /** Subtle outward cloth inertia skewX for left panel (peaks around -4deg; right panel is -leftSkewDeg) */
  leftSkewDeg: number;
  /** Center ribbon bow seal-back-in scale (0.85 -> 1.0) & opacity (0 -> 1) */
  bowScale: number;
  bowOpacity: number;
  /** Unified stageWrapperRef (window + anchored rod + curtains + bow) Style B transforms */
  stageScaleX: number;
  stageScaleY: number;
  stageOpacity: number;
  /** Rose-Cream backdrop & above/below text opacity (1 -> 0 across 15.35s -> 15.90s) */
  backdropOpacity: number;
  /** Fires soft UI shut/pop chime as Style B snap-shut begins */
  shouldPlayWindowShutChime: boolean;
  /** Fires main website reveal underneath (scale 0.97 -> 1.0, opacity 0.9 -> 1.0) */
  shouldTriggerMainReveal: boolean;
  /** Fires scroll unlock, pointer-events: none, background resume & twin side-cannon confetti */
  shouldUnlockAndFireConfetti: boolean;
  /** True once visual exit finishes cleanly (15.90s normal / 1.10s skip) */
  isVisualComplete: boolean;
}

export interface PlaybackCueState {
  showSparkleGlints: boolean;
  captionText: string;
  captionPhase: 'initial' | 'finale';
  shouldTriggerExit: boolean;
}

export interface AudioTimelineCueState {
  gain: number;
  shouldStartBgMusicAfterIntro: boolean;
  shouldFinishAudio: boolean;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Clamps raw frame delta in milliseconds to seconds in [0.001, 0.05]
 * so brief decode hiccups on mobile never cause jumps or teleports.
 */
export function clampDeltaSec(dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return 0.001;
  return Math.min(Math.max(dtMs / 1000, 0.001), MAX_DT_SEC);
}

/**
 * Exact Material / CSS `cubic-bezier(0.4, 0, 0.2, 1)` easing curve evaluator.
 */
export function cubicBezierStandard(t: number): number {
  const x = clamp01(t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let lo = 0;
  let hi = 1;
  let u = x;
  for (let i = 0; i < 10; i++) {
    const inv = 1 - u;
    const bx = 3 * inv * inv * u * 0.4 + 3 * inv * u * u * 0.2 + u * u * u;
    if (bx < x) lo = u;
    else hi = u;
    u = (lo + hi) * 0.5;
  }

  const inv = 1 - u;
  return 3 * inv * u * u * 1.0 + u * u * u;
}

function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/**
 * Evaluates the seamless 60fps opening curtain state at elapsedSec (0.0s -> 1.55s).
 * Kept 100% untouched.
 */
export function computeCurtainOpenFrame(elapsedSec: number): CurtainOpenFrame {
  const t = Math.max(0, elapsedSec);

  const loaderFadeNorm = clamp01(t / CURTAIN_BOW_UNTIE_SEC);
  const loaderOpacity = 1 - loaderFadeNorm;

  let bowScale = 1;
  let bowOpacity = 1;
  if (t <= 0.1) {
    const p = clamp01(t / 0.1);
    bowScale = 1 + 0.12 * Math.sin((p * Math.PI) / 2);
    bowOpacity = 1;
  } else if (t < CURTAIN_BOW_UNTIE_SEC) {
    const p = clamp01((t - 0.1) / (CURTAIN_BOW_UNTIE_SEC - 0.1));
    bowScale = 1.12 - 0.28 * p;
    bowOpacity = 1 - p * p;
  } else {
    bowScale = 0.84;
    bowOpacity = 0;
  }

  const shouldStartVideo = t >= CURTAIN_VIDEO_START_SEC;

  if (t <= CURTAIN_SLIDE_START_SEC) {
    return {
      loaderOpacity,
      bowScale,
      bowOpacity,
      panelScaleX: 1,
      leftSkewDeg: 0,
      waveRipple: 0,
      openProgress: 0,
      shouldStartVideo,
      isSettled: false,
    };
  }

  const slideElapsed = t - CURTAIN_SLIDE_START_SEC;
  const slideTotal = CURTAIN_OPEN_TOTAL_SEC - CURTAIN_SLIDE_START_SEC; // 1.40s
  const norm = clamp01(slideElapsed / slideTotal);

  if (norm >= 1) {
    return {
      loaderOpacity: 0,
      bowScale: 0.84,
      bowOpacity: 0,
      panelScaleX: CURTAIN_REST_SCALE_X,
      leftSkewDeg: 0,
      waveRipple: 0,
      openProgress: 1,
      shouldStartVideo: true,
      isSettled: true,
    };
  }

  const mainSlideNorm = clamp01(norm / 0.68);
  const baseOpen = easeInOutCubic(mainSlideNorm);

  const settleElapsed = Math.max(0, slideElapsed - 0.9);
  const settleSpring =
    settleElapsed > 0
      ? Math.exp(-6.2 * settleElapsed) * Math.sin(settleElapsed * 15.2) * 0.022
      : 0;

  const openProgress = clamp01(baseOpen + settleSpring);
  const panelScaleX = 1 - openProgress * (1 - CURTAIN_REST_SCALE_X);

  const velocityFactor = mainSlideNorm < 1 ? Math.sin(mainSlideNorm * Math.PI) ** 1.15 : 0;
  const dragSkew = velocityFactor * 5.0;
  const settleSkew =
    settleElapsed > 0
      ? Math.exp(-6.4 * settleElapsed) * Math.sin(settleElapsed * 14.5 + 0.6) * -2.2
      : 0;
  const endFade = norm > 0.9 ? clamp01((1 - norm) / 0.1) : 1;
  const leftSkewDeg = (dragSkew + settleSkew) * endFade;
  const waveRipple = velocityFactor * Math.sin(slideElapsed * 17) * endFade;

  return {
    loaderOpacity,
    bowScale,
    bowOpacity,
    panelScaleX,
    leftSkewDeg,
    waveRipple,
    openProgress,
    shouldStartVideo,
    isSettled: false,
  };
}

/**
 * Evaluates the Three-Stage Closing Sequence (rod & curtains permanently anchored inside stageWrapperRef):
 *
 * Normal mode (fastSkip = false, 13.5s -> 15.9s, t = 0.00s -> 2.40s):
 * - Stage 1 (0.00s -> 1.50s):
 *   - 0.00s -> 1.10s: Ease-in-out cubic inward curtain slide (scaleX startScaleX -> 1.0) with outward
 *     cloth inertia skewX peaking around +/-4deg as bottom hem trails top rings.
 *   - 1.10s -> 1.50s: Clean 0px center meet + gentle damped pendulum sway decaying to 0deg.
 *   - 1.20s -> 1.45s (14.7s): Center pastel ribbon bow fades & pops back in (scale 0.85 -> 1.0, opacity 0 -> 1).
 * - Stage 2 (1.50s -> 1.70s): 200ms clean beat holding on bow-sealed closed curtains.
 * - Stage 3 (1.70s -> 2.40s): Unified Style B window snap-shut on stageWrapperRef:
 *   - 1.70s -> 1.78s (80ms): Anticipation micro-pop (scale 1.0 -> 1.025) + soft UI shut chime.
 *   - 1.78s -> 2.20s (420ms): Vertical snap-shut collapse (scaleY 1.025 -> 0.03, scaleX 1.025 -> 0.78, opacity 1 -> 0)
 *     using cubic-bezier(0.4, 0, 0.2, 1).
 *   - 1.85s -> 2.40s (550ms): Simultaneous backdrop & text fade (opacity 1 -> 0) + main site reveal.
 *   - 2.10s (15.60s): Pointer-events none, scroll unlock, resume background effects & fire confetti.
 *   - 2.40s (15.90s): Visual exit complete -> audioOnly (if unmuted) or unmount.
 *
 * Fast Skip mode (fastSkip = true, 0.65s curtain close + 0.45s Style B snap-shut = 1.10s total).
 */
export function computeClosingExitFrame(
  elapsedSec: number,
  options?: { startScaleX?: number; fastSkip?: boolean },
): ClosingExitFrame {
  const t = Math.max(0, elapsedSec);
  const startScaleX = clamp01(options?.startScaleX ?? CURTAIN_REST_SCALE_X);
  const fastSkip = Boolean(options?.fastSkip);

  // Parameterize timeline milestones cleanly for normal (2.40s) vs fast Skip (1.10s)
  const slideDur = fastSkip ? 0.5 : CLOSE_SLIDE_DUR_SEC; // 1.10s normal / 0.50s skip
  const stage1End = fastSkip ? SKIP_CLOSE_STAGE1_END_SEC : CLOSE_STAGE1_END_SEC; // 1.50s / 0.65s
  const bowStart = fastSkip ? 0.48 : CLOSE_BOW_SEAL_START_SEC; // 1.20s / 0.48s
  const bowDur = fastSkip ? 0.16 : CLOSE_BOW_SEAL_DUR_SEC; // 0.25s / 0.16s
  const holdEnd = fastSkip ? SKIP_CLOSE_STAGE1_END_SEC : CLOSE_HOLD_END_SEC; // 1.70s / 0.65s
  const popEnd = fastSkip ? 0.71 : CLOSE_POP_END_SEC; // 1.78s / 0.71s
  const snapEnd = fastSkip ? 1.01 : CLOSE_SNAP_END_SEC; // 2.20s / 1.01s
  const revealStart = fastSkip ? 0.72 : CLOSE_REVEAL_START_SEC; // 1.85s / 0.72s
  const confettiAt = fastSkip ? 0.92 : CLOSE_CONFETTI_AND_UNLOCK_SEC; // 2.10s / 0.92s
  const totalDur = fastSkip ? SKIP_CLOSE_TOTAL_SEC : CLOSE_TOTAL_SEC; // 2.40s / 1.10s

  // 1. Curtain inward closing + damped pendulum settle (Stage 1: 0 -> stage1End)
  let panelScaleX = 1;
  let leftSkewDeg = 0;

  if (t < slideDur) {
    const slideNorm = clamp01(t / slideDur);
    const eased = easeInOutCubic(slideNorm);
    panelScaleX = startScaleX + (1 - startScaleX) * eased;

    // Outward cloth inertia: bottom hem trails slightly behind top rings pulling inward (~ +/-4deg peak)
    const velocityFactor = Math.sin(slideNorm * Math.PI) ** 1.15;
    leftSkewDeg = -4.0 * velocityFactor;
  } else if (t < stage1End) {
    panelScaleX = 1;
    const settleDur = Math.max(0.05, stage1End - slideDur);
    const settleElapsed = t - slideDur;
    const settleNorm = clamp01(settleElapsed / settleDur);
    const endFade = settleNorm > 0.8 ? clamp01((1 - settleNorm) / 0.2) : 1;
    // Gentle damped pendulum sway decaying cleanly to 0deg
    leftSkewDeg = Math.exp(-6.5 * settleElapsed) * Math.sin(settleElapsed * 15.5) * 2.1 * endFade;
  } else {
    panelScaleX = 1;
    leftSkewDeg = 0;
  }

  // 2. Center pastel ribbon bow pops & fades back in to seal closed curtains (14.7s normal / 0.48s skip)
  let bowScale = 0.85;
  let bowOpacity = 0;
  if (t >= bowStart) {
    const bowNorm = clamp01((t - bowStart) / bowDur);
    const easedBow = cubicBezierStandard(bowNorm);
    bowScale = 0.85 + 0.15 * easedBow; // 0.85 -> 1.0
    bowOpacity = easedBow; // 0 -> 1
  }

  // 3. Stage 3: Unified Style B Window Snap-Shut on stageWrapperRef
  let stageScaleX = 1;
  let stageScaleY = 1;
  let stageOpacity = 1;
  const shouldPlayWindowShutChime = t >= holdEnd;

  if (t >= holdEnd) {
    if (t < popEnd) {
      // Anticipation micro-pop: scale(1.0 -> 1.025) over 80ms
      const popP = clamp01((t - holdEnd) / Math.max(0.01, popEnd - holdEnd));
      const popScale = 1 + 0.025 * Math.sin((popP * Math.PI) / 2);
      stageScaleX = popScale;
      stageScaleY = popScale;
      stageOpacity = 1;
    } else {
      // Vertical snap-shut collapse: scaleY(1.025 -> 0.03), scaleX(1.025 -> 0.78), opacity(1 -> 0)
      const shutNorm = clamp01((t - popEnd) / Math.max(0.01, snapEnd - popEnd));
      const easedShut = cubicBezierStandard(shutNorm);
      stageScaleY = 1.025 + (0.03 - 1.025) * easedShut;
      stageScaleX = 1.025 + (0.78 - 1.025) * easedShut;
      stageOpacity = 1 - easedShut;
    }
  }

  // 4. Simultaneous Rose-Cream backdrop & above/below text fade (15.35s -> 15.90s, 550ms)
  let backdropOpacity = 1;
  if (t >= revealStart) {
    const fadeNorm = clamp01((t - revealStart) / Math.max(0.01, totalDur - revealStart));
    backdropOpacity = 1 - cubicBezierStandard(fadeNorm);
  }

  const shouldTriggerMainReveal = t >= revealStart;
  const shouldUnlockAndFireConfetti = t >= confettiAt;
  const isVisualComplete = t >= totalDur;

  let subStage: ClosingExitFrame['subStage'] = 'closingCurtains';
  if (isVisualComplete) {
    subStage = 'done';
  } else if (t >= holdEnd) {
    subStage = 'snapShut';
  } else if (t >= stage1End) {
    subStage = 'hold';
  }

  return {
    elapsedSec: t,
    subStage,
    panelScaleX,
    leftSkewDeg,
    bowScale,
    bowOpacity,
    stageScaleX,
    stageScaleY,
    stageOpacity,
    backdropOpacity,
    shouldPlayWindowShutChime,
    shouldTriggerMainReveal,
    shouldUnlockAndFireConfetti,
    isVisualComplete,
  };
}

/**
 * Returns synced visual cues for the 0.0s - 13.5s intro playback timeline:
 * - 0.0s - 12.5s: Unobstructed video playback + initial caption
 * - 12.5s - 13.5s: 1-second beat on the red mark with outer border sparkle glints + caption crossfade
 * - >= 13.5s: Auto-trigger Three-Stage Closing Sequence
 */
export function getPlaybackCues(currentTimeSec: number): PlaybackCueState {
  const t = Math.max(0, currentTimeSec);
  const inRedMarkBeat = t >= RED_MARK_HOLD_START_SEC && t < EXIT_TRIGGER_SEC;
  const isFinaleCaption = t >= RED_MARK_HOLD_START_SEC;

  return {
    showSparkleGlints: inRedMarkBeat,
    captionText: isFinaleCaption ? FINALE_CAPTION : INITIAL_CAPTION,
    captionPhase: isFinaleCaption ? 'finale' : 'initial',
    shouldTriggerExit: t >= EXIT_TRIGGER_SEC,
  };
}

/**
 * Computes exact background video audio gain curve (13.5s -> 21.0s):
 * - 0.0s - 13.5s: 1.0
 * - 13.5s - 15.5s: Keeps chorus full at 0.95 (smooth 250ms glide 1.0 -> 0.95 so zero step click)
 *   while curtains close, window snaps shut, and confetti pops.
 * - 15.5s - 21.0s (5.5s): Smooth exponential / ease-out fade from 0.95 -> 0.0, silent at 21.0s.
 * - >= 21.0s: 0.0 (pause & unmount cleanly well before 23.1s abrupt cutoff).
 */
export function computeIntroAudioGain(currentTimeSec: number): number {
  const t = Math.max(0, currentTimeSec);
  if (t <= EXIT_TRIGGER_SEC) return 1.0;

  if (t <= AUDIO_HOLD_END_SEC) {
    const glide = clamp01((t - EXIT_TRIGGER_SEC) / 0.25);
    return 1.0 - (1.0 - AUDIO_HOLD_GAIN) * glide;
  }

  if (t >= AUDIO_FADE_END_SEC) return 0;

  const u = clamp01((t - AUDIO_HOLD_END_SEC) / (AUDIO_FADE_END_SEC - AUDIO_HOLD_END_SEC));
  // Smooth ease-out exponential decay 0.95 -> 0.0 over 5.5s
  const smooth = u * u * (3 - 2 * u);
  return AUDIO_HOLD_GAIN * Math.pow(1 - smooth, 1.4);
}

/**
 * Returns synced background audio cues for detached video playback (13.5s -> 21.0s)
 * with strictly sequential zero-overlap handoff to the local MP3 once gain hits 0 at 21.0s.
 */
export function getAudioTimelineCues(currentTimeSec: number): AudioTimelineCueState {
  const t = Math.max(0, currentTimeSec);
  const finished = t >= AUDIO_FADE_END_SEC;
  return {
    gain: computeIntroAudioGain(t),
    shouldStartBgMusicAfterIntro: finished,
    shouldFinishAudio: finished,
  };
}

export interface SmartPreloaderState {
  /** Real buffered percentage toward the 16s target buffer window (0..100) */
  realPct: number;
  /** Target display percentage (0..100), capped at 92% until readyState confirms smooth playback */
  targetPct: number;
  /** True once readyState >= 3 & loadeddata fired, or 6.5s safety fallback hits with readyState >= 2 */
  isReady: boolean;
  /** False during the 150ms anti-flash grace window or when video is already ready/cached */
  shouldShowLoaderCard: boolean;
}

/**
 * Returns the casual micro-status copy synced to the calculated loading percentage:
 * - 0% – 35%: "Setting up Morgan's stage..."
 * - 35% – 75%: "Getting the curtains ready..."
 * - 75% – 99%: "Almost there, bauni..."
 * - 100%: "Showtime ✨"
 */
export function getPreloaderStatusText(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (clamped >= 100) return 'Showtime ✨';
  if (clamped >= 75) return 'Almost there, bauni...';
  if (clamped >= 35) return 'Getting the curtains ready...';
  return "Setting up Morgan's stage...";
}

/**
 * Smart, calculative buffer progress calculation for the 16:9 mini-theatre preloader:
 * - Measures real buffered seconds against `Math.min(duration || 23.1, 16)` seconds.
 * - While waiting for the first network chunk (`realPct === 0`), gently trickles up to 28% over 2s.
 * - Jumps smoothly to real buffered chunks as data arrives, capping at 92% until `readyState >= 3`
 *   AND `loadeddata` confirm frame 1 is genuinely ready to paint (zero black screen).
 * - Enforces a 150ms anti-flash grace check so cached / fast-Wi-Fi loads never show the loading card.
 * - Includes a 6.5s safety fallback (proceeding as soon as `readyState >= 2`) so slow networks never stall.
 */
export function computeSmartPreloaderTarget(params: {
  bufferedEndSec: number;
  durationSec?: number;
  readyState: number;
  hasLoadedData: boolean;
  elapsedMs: number;
  maxTimeoutMs?: number;
}): SmartPreloaderState {
  const maxTimeout = params.maxTimeoutMs ?? PRELOADER_MAX_TIMEOUT_MS;
  const elapsedMs = Math.max(0, params.elapsedMs);
  const validDuration =
    typeof params.durationSec === 'number' &&
    Number.isFinite(params.durationSec) &&
    params.durationSec > 0
      ? params.durationSec
      : INTRO_VIDEO_DURATION_SEC;
  const targetDuration = Math.min(validDuration, PRELOADER_TARGET_BUFFER_SEC);

  const safeBuffered =
    Number.isFinite(params.bufferedEndSec) && params.bufferedEndSec > 0
      ? params.bufferedEndSec
      : 0;
  const realPct = Math.min(100, (safeBuffered / targetDuration) * 100);

  const hasFrameAndBuffer = params.readyState >= 3 && params.hasLoadedData;
  const hitSafetyFallback = elapsedMs >= maxTimeout && params.readyState >= 2;
  const isReady = hasFrameAndBuffer || hitSafetyFallback;

  if (isReady) {
    return {
      realPct: Math.max(realPct, 100),
      targetPct: 100,
      isReady: true,
      shouldShowLoaderCard: false,
    };
  }

  // Gentle capped trickle up to 28% over 2s while waiting for the first chunk
  const trickleNorm = clamp01(elapsedMs / PRELOADER_TRICKLE_DURATION_MS);
  const trickleEased = 1 - Math.pow(1 - trickleNorm, 2);
  const tricklePct = PRELOADER_TRICKLE_CAP_PCT * trickleEased;

  const rawTarget = realPct > 0 ? Math.max(tricklePct, realPct) : tricklePct;
  const targetPct = Math.min(PRELOADER_UNREADY_CAP_PCT, rawTarget);

  return {
    realPct,
    targetPct,
    isReady: false,
    shouldShowLoaderCard: elapsedMs >= PRELOADER_GRACE_MS,
  };
}

/**
 * Smooth frame-rate-independent rAF interpolation of `displayPct` toward `targetPct`
 * so chunked mobile downloads animate fluidly at locked 60fps.
 */
export function stepPreloaderDisplayPct(
  currentPct: number,
  targetPct: number,
  dtSec: number,
): number {
  const safeTarget = Math.max(0, Math.min(100, targetPct));
  const safeCurrent = Math.max(0, Math.min(100, currentPct));
  if (safeTarget <= safeCurrent) return safeCurrent;

  const clampedDt = Math.min(Math.max(dtSec, 0.001), MAX_DT_SEC);
  const alpha = 1 - Math.exp(-8.5 * clampedDt);
  const next = safeCurrent + (safeTarget - safeCurrent) * alpha;
  if (safeTarget - next < 0.08) return safeTarget;
  return next;
}

/**
 * Backwards-compatible normalized loading ratio wrapper (0..1).
 */
export function computePreloaderProgress(params: {
  bufferedRatio: number;
  readyState: number;
  elapsedMs: number;
  maxTimeoutMs?: number;
}): { progress01: number; isReady: boolean } {
  const maxTimeout = params.maxTimeoutMs ?? PRELOADER_MAX_TIMEOUT_MS;
  const state = computeSmartPreloaderTarget({
    bufferedEndSec: clamp01(params.bufferedRatio) * PRELOADER_TARGET_BUFFER_SEC,
    durationSec: INTRO_VIDEO_DURATION_SEC,
    readyState: params.readyState,
    hasLoadedData: params.readyState >= 2,
    elapsedMs: params.elapsedMs,
    maxTimeoutMs: maxTimeout,
  });

  if (state.isReady || params.elapsedMs >= maxTimeout) {
    return { progress01: 1, isReady: true };
  }

  return {
    progress01: Math.max(0.04, state.targetPct / 100),
    isReady: false,
  };
}
