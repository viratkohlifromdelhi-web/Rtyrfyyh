import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { SparkleStarSvg } from './DoodleSvgs';
import { trackEvent } from '../utils/analytics';
import { soundEngine } from '../utils/soundEngine';
import {
  BG_MUSIC_AUTOPLAY_FADE_MS,
  CURTAIN_REST_SCALE_X,
  EXIT_TRIGGER_SEC,
  FINALE_CAPTION,
  INITIAL_CAPTION,
  MUSIC_TAKEOVER_FADE_MS,
  PRELOADER_CARD_FADE_MS,
  PRELOADER_GLIDE_TO_100_MS,
  PRELOADER_MAX_TIMEOUT_MS,
  SKIP_AUDIO_FADE_MS,
  SKIP_FADE_IN_SEC,
  clampDeltaSec,
  computeClosingExitFrame,
  computeCurtainOpenFrame,
  computeSmartPreloaderTarget,
  getAudioTimelineCues,
  getPlaybackCues,
  getPreloaderStatusText,
  stepPreloaderDisplayPct,
} from '../utils/theatrePhysics';

const INTRO_VIDEO_URL =
  'https://res.cloudinary.com/yloczgpk/video/upload/Sabrina_Carpenter_Kissing_Screen_Wallpaper_4K_HD.mp4';

export interface TheatreIntroOverlayHandle {
  /** Called if user taps Play Music early while hidden intro audio is still fading out (0.4s ramp down) */
  fadeOutForMusicTakeover: () => void;
}

interface TheatreIntroOverlayProps {
  /** Fired at 15.35s to reveal pre-mounted main website underneath (scale 0.97 -> 1.0, opacity 0.9 -> 1.0) */
  onBeginMainReveal: (opts: { audioUnlocked: boolean; willContinueVideoAudio: boolean }) => void;
  /** Fired at 15.60s to fire twin side-cannon confetti */
  onFireRevealConfetti: () => void;
  /** Fired once visual exit ends (15.90s) so main site shell clears transform even if hidden audio continues */
  onVisualExitDone: () => void;
  /** Fired strictly AFTER intro video audio finishes fading to 0 and stops (zero overlap) to autoplay local MP3 */
  onIntroAudioFinished: (fadeMs?: number) => void;
  /** Fired once both visual exit AND hidden background audio fade have fully completed */
  onFinishUnmount: () => void;
  /** Fired once the intro video has buffered and begun smooth playback (triggers idle warmup) */
  onVideoSmoothPlayback?: () => void;
  /** Fired once the intro video reaches currentTime > 1.0s (triggers gentle MP3 preload upgrade) */
  onVideoPastOneSecond?: () => void;
}

type TheatrePhase = 'loading' | 'opening' | 'playing' | 'exiting' | 'audioOnly' | 'done';

const AMBIENT_BACKDROP_SPARKLES = [
  { top: '9%', left: '11%', size: 'h-4 w-4', color: 'text-[#E7A8C2]', delay: '0s' },
  { top: '16%', right: '13%', size: 'h-3.5 w-3.5', color: 'text-[#D7BEF6]', delay: '0.9s' },
  { top: '42%', left: '5%', size: 'h-3 w-3', color: 'text-[#F0CF7B]', delay: '1.6s' },
  { top: '54%', right: '6%', size: 'h-4 w-4', color: 'text-[#E7A8C2]', delay: '0.5s' },
  { bottom: '18%', left: '14%', size: 'h-3.5 w-3.5', color: 'text-[#D7BEF6]', delay: '1.2s' },
  { bottom: '12%', right: '12%', size: 'h-4 w-4', color: 'text-[#F0CF7B]', delay: '2.1s' },
];

// 6 pastel sparkle glints popping gently around the OUTER border of the 16:9 window at 12.5s - 13.5s
const OUTER_BORDER_GLINTS = [
  { pos: '-top-4 -left-3', size: 'h-5 w-5', color: 'text-[#D94B7D]', delay: '0ms' },
  { pos: '-top-5 left-[28%]', size: 'h-4 w-4', color: 'text-[#F0BD52]', delay: '110ms' },
  { pos: '-top-4 right-[22%]', size: 'h-5 w-5', color: 'text-[#B98AE8]', delay: '200ms' },
  { pos: '-right-4 top-[36%]', size: 'h-5 w-5', color: 'text-[#D94B7D]', delay: '150ms' },
  { pos: '-bottom-4 right-[18%]', size: 'h-4 w-4', color: 'text-[#F0BD52]', delay: '240ms' },
  { pos: '-bottom-4 left-[20%]', size: 'h-5 w-5', color: 'text-[#E87AA4]', delay: '80ms' },
];

const CURTAIN_RINGS = [12, 31, 50, 69, 88];

function PastelRibbonBowSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 88 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M40 31C35 38 30 46 25 53L33 50L37 54C40 46 42 38 43 32Z"
        fill="#FFE6F0"
        stroke="#D94B7D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M48 31C53 38 58 46 63 53L55 50L51 54C48 46 46 38 45 32Z"
        fill="#FFE6F0"
        stroke="#D94B7D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M42 27C30 13 11 10 8 22C5 33 21 38 42 29Z"
        fill="#FFF3F8"
        stroke="#D94B7D"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M36 27C26 21 17 20 15 24"
        stroke="#E89CB9"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M46 27C58 13 77 10 80 22C83 33 67 38 46 29Z"
        fill="#FFF3F8"
        stroke="#D94B7D"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M52 27C62 21 71 20 73 24"
        stroke="#E89CB9"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect
        x="38"
        y="21"
        width="12"
        height="13"
        rx="5.5"
        fill="#FFF3C4"
        stroke="#C94277"
        strokeWidth="2.2"
      />
      <circle cx="44" cy="27.5" r="2.2" fill="#E6B25E" />
    </svg>
  );
}

const PLEAT_GRADIENT_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(90deg, #B53466 0%, #D9578A 7%, #EE8BB2 14%, #C94277 21%, #9E2957 25%)',
  backgroundSize: '100% 100%',
} as const;

export const TheatreIntroOverlay = forwardRef<TheatreIntroOverlayHandle, TheatreIntroOverlayProps>(
  function TheatreIntroOverlay(
    {
      onBeginMainReveal,
      onFireRevealConfetti,
      onVisualExitDone,
      onIntroAudioFinished,
      onFinishUnmount,
      onVideoSmoothPlayback,
      onVideoPastOneSecond,
    },
    ref,
  ) {
    // Discrete React phases ONLY (never mutated inside requestAnimationFrame)
    const [phase, setPhase] = useState<TheatrePhase>('loading');
    const [pointerEventsDisabled, setPointerEventsDisabled] = useState(false);
    const [showSoundPill, setShowSoundPill] = useState(false);
    const [showSkipLink, setShowSkipLink] = useState(false);
    const [captionPhase, setCaptionPhase] = useState<'initial' | 'finale'>('initial');
    const [showSparkleGlints, setShowSparkleGlints] = useState(false);
    const [videoMissingFallback, setVideoMissingFallback] = useState(false);

    // Direct DOM refs for 100% GPU-composited 60fps transforms & opacity
    const rootOverlayRef = useRef<HTMLDivElement | null>(null);
    const backdropLayerRef = useRef<HTMLDivElement | null>(null);
    const ambientSparklesRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLElement | null>(null);
    const footerCaptionRef = useRef<HTMLDivElement | null>(null);
    const stageWrapperRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const loaderPillRef = useRef<HTMLDivElement | null>(null);
    const loaderBarRef = useRef<HTMLDivElement | null>(null);
    const loaderPctRef = useRef<HTMLSpanElement | null>(null);
    const loaderStatusRef = useRef<HTMLSpanElement | null>(null);
    const fallbackBarRef = useRef<HTMLDivElement | null>(null);
    const leftPanelRef = useRef<HTMLDivElement | null>(null);
    const rightPanelRef = useRef<HTMLDivElement | null>(null);
    const leftRingsRef = useRef<HTMLDivElement | null>(null);
    const rightRingsRef = useRef<HTMLDivElement | null>(null);
    const bowRef = useRef<HTMLDivElement | null>(null);

    // Web Audio API GainNode routing refs for mobile/iOS Safari-safe video audio fades
    const audioCtxRef = useRef<AudioContext | null>(null);
    const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const currentGainRef = useRef<number>(1);
    const webAudioAttachedRef = useRef(false);

    // Mutable state refs (guarded once-only cues, zero rAF React renders)
    const phaseRef = useRef<TheatrePhase>('loading');
    const videoMissingRef = useRef(false);
    const audioUnlockedRef = useRef(false);
    const exitTriggeredRef = useRef(false);
    const windowShutChimePlayedRef = useRef(false);
    const revealTriggeredRef = useRef(false);
    const unlockConfettiTriggeredRef = useRef(false);
    const visualExitCompleteRef = useRef(false);
    const videoPlayStartedRef = useRef(false);
    const audioFadeActiveRef = useRef(false);
    const audioFinishedRef = useRef(false);
    const suppressBgMusicHandoffRef = useRef(false);
    const bgMusicHandoffTriggeredRef = useRef(false);
    const smoothPlaybackNotifiedRef = useRef(false);
    const pastOneSecondNotifiedRef = useRef(false);
    const lastGlintsRef = useRef(false);
    const lastCaptionPhaseRef = useRef<'initial' | 'finale'>('initial');

    // Active rAF & timeout IDs for guaranteed clean teardown
    const loaderRafRef = useRef<number | null>(null);
    const openRafRef = useRef<number | null>(null);
    const playbackWatchRafRef = useRef<number | null>(null);
    const finaleRafRef = useRef<number | null>(null);
    const audioFadeRafRef = useRef<number | null>(null);
    const fallbackClockRafRef = useRef<number | null>(null);
    const skipTimerRef = useRef<number | null>(null);

    // Latest callback refs
    const onBeginMainRevealRef = useRef(onBeginMainReveal);
    const onFireRevealConfettiRef = useRef(onFireRevealConfetti);
    const onVisualExitDoneRef = useRef(onVisualExitDone);
    const onIntroAudioFinishedRef = useRef(onIntroAudioFinished);
    const onFinishUnmountRef = useRef(onFinishUnmount);
    const onVideoSmoothPlaybackRef = useRef(onVideoSmoothPlayback);
    const onVideoPastOneSecondRef = useRef(onVideoPastOneSecond);
    onBeginMainRevealRef.current = onBeginMainReveal;
    onFireRevealConfettiRef.current = onFireRevealConfetti;
    onVisualExitDoneRef.current = onVisualExitDone;
    onIntroAudioFinishedRef.current = onIntroAudioFinished;
    onFinishUnmountRef.current = onFinishUnmount;
    onVideoSmoothPlaybackRef.current = onVideoSmoothPlayback;
    onVideoPastOneSecondRef.current = onVideoPastOneSecond;

    const notifySmoothPlaybackOnce = useCallback(() => {
      if (smoothPlaybackNotifiedRef.current) return;
      smoothPlaybackNotifiedRef.current = true;
      onVideoSmoothPlaybackRef.current?.();
    }, []);

    const notifyPastOneSecondOnce = useCallback(() => {
      if (pastOneSecondNotifiedRef.current) return;
      pastOneSecondNotifiedRef.current = true;
      onVideoPastOneSecondRef.current?.();
    }, []);

    const setPhaseSync = useCallback((next: TheatrePhase) => {
      phaseRef.current = next;
      setPhase(next);
    }, []);

    const unlockBodyScroll = useCallback(() => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }, []);

    const cancelAllTimersAndRafs = useCallback(() => {
      if (loaderRafRef.current !== null) {
        window.cancelAnimationFrame(loaderRafRef.current);
        loaderRafRef.current = null;
      }
      if (openRafRef.current !== null) {
        window.cancelAnimationFrame(openRafRef.current);
        openRafRef.current = null;
      }
      if (playbackWatchRafRef.current !== null) {
        window.cancelAnimationFrame(playbackWatchRafRef.current);
        playbackWatchRafRef.current = null;
      }
      if (finaleRafRef.current !== null) {
        window.cancelAnimationFrame(finaleRafRef.current);
        finaleRafRef.current = null;
      }
      if (audioFadeRafRef.current !== null) {
        window.cancelAnimationFrame(audioFadeRafRef.current);
        audioFadeRafRef.current = null;
      }
      if (fallbackClockRafRef.current !== null) {
        window.cancelAnimationFrame(fallbackClockRafRef.current);
        fallbackClockRafRef.current = null;
      }
      if (skipTimerRef.current !== null) {
        window.clearTimeout(skipTimerRef.current);
        skipTimerRef.current = null;
      }
    }, []);

    /**
     * Applies gain (0..1) via Web Audio GainNode when attached (iOS Safari safe),
     * falling back cleanly to HTMLVideoElement.volume if CORS/AudioContext prevents Web Audio routing.
     */
    const applyVideoAudioGain = useCallback((gain01: number) => {
      const clamped = Math.max(0, Math.min(1, gain01));
      currentGainRef.current = clamped;
      if (rootOverlayRef.current) {
        rootOverlayRef.current.dataset.audioGain = clamped.toFixed(3);
      }

      const gainNode = gainNodeRef.current;
      const ctx = audioCtxRef.current;
      if (webAudioAttachedRef.current && gainNode && ctx && ctx.state === 'running') {
        try {
          gainNode.gain.setTargetAtTime(clamped, ctx.currentTime, 0.015);
          return;
        } catch {
          // Fall through to video.volume fallback
        }
      }

      const video = videoRef.current;
      if (video) {
        try {
          video.volume = clamped;
        } catch {
          // Ignore volume property restrictions on iOS Safari
        }
      }
    }, []);

    /**
     * Safely attaches MediaElementAudioSourceNode -> GainNode inside try/catch
     * ONLY when AudioContext is running (so suspended contexts never silence video playback).
     */
    const tryAttachWebAudioGain = useCallback(async () => {
      if (webAudioAttachedRef.current) return true;
      const video = videoRef.current;
      if (!video || typeof window === 'undefined') return false;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        if (ctx.state !== 'running') {
          return false;
        }

        const source = ctx.createMediaElementSource(video);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(currentGainRef.current, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);

        mediaSourceRef.current = source;
        gainNodeRef.current = gain;
        webAudioAttachedRef.current = true;
        return true;
      } catch {
        // External host lacks CORS or source already created — gracefully use video.volume fallback
        return false;
      }
    }, []);

    const finalizeAndUnmountAll = useCallback(
      (shouldAutoplayBgMusic = true) => {
        if (phaseRef.current === 'done') return;
        audioFinishedRef.current = true;
        audioFadeActiveRef.current = false;

        if (audioFadeRafRef.current !== null) {
          window.cancelAnimationFrame(audioFadeRafRef.current);
          audioFadeRafRef.current = null;
        }

        const video = videoRef.current;
        if (video) {
          try {
            video.pause();
            video.currentTime = 0;
            video.volume = 1;
          } catch {
            // Ignore cleanup errors
          }
        }
        unlockBodyScroll();
        setPhaseSync('done');
        onFinishUnmountRef.current();

        // Strictly sequential handoff: start local MP3 ONLY after intro video audio has stopped
        if (
          shouldAutoplayBgMusic &&
          !suppressBgMusicHandoffRef.current &&
          !bgMusicHandoffTriggeredRef.current
        ) {
          bgMusicHandoffTriggeredRef.current = true;
          onIntroAudioFinishedRef.current(BG_MUSIC_AUTOPLAY_FADE_MS);
        }
      },
      [setPhaseSync, unlockBodyScroll],
    );

    /**
     * Smoothly ramps hidden intro video audio from its current gain down to 0 over `durationMs`,
     * then pauses & unmounts cleanly (used for Skip Intro 1.2s fade & early Play Music 0.4s takeover).
     * Strictly sequential: waits until gain reaches 0 & video pauses before handing off to local MP3.
     */
    const startTimedAudioFadeOut = useCallback(
      (durationMs: number, options: { handoffToBgMusicOnFinish?: boolean } = {}) => {
        const shouldHandoff = Boolean(options.handoffToBgMusicOnFinish);
        const video = videoRef.current;
        if (!video || video.paused || video.muted || videoMissingRef.current) {
          audioFadeActiveRef.current = false;
          audioFinishedRef.current = true;
          if (visualExitCompleteRef.current) {
            finalizeAndUnmountAll(shouldHandoff);
          }
          return;
        }

        if (audioFadeRafRef.current !== null) {
          window.cancelAnimationFrame(audioFadeRafRef.current);
          audioFadeRafRef.current = null;
        }

        audioFadeActiveRef.current = true;
        audioFinishedRef.current = false;
        void tryAttachWebAudioGain();

        const startGain = currentGainRef.current;
        const fadeStartTs = performance.now();

        const stepFade = (now: number) => {
          const elapsedMs = Math.max(0, now - fadeStartTs);
          const u = Math.min(1, elapsedMs / Math.max(1, durationMs));
          const smooth = u * u * (3 - 2 * u);
          const nextGain = startGain * (1 - smooth);
          applyVideoAudioGain(nextGain);

          if (u >= 1 || nextGain <= 0.002) {
            applyVideoAudioGain(0);
            audioFadeRafRef.current = null;
            audioFadeActiveRef.current = false;
            audioFinishedRef.current = true;
            try {
              video.pause();
            } catch {
              // Ignore pause errors
            }
            if (visualExitCompleteRef.current) {
              finalizeAndUnmountAll(shouldHandoff);
            }
            return;
          }

          audioFadeRafRef.current = window.requestAnimationFrame(stepFade);
        };

        audioFadeRafRef.current = window.requestAnimationFrame(stepFade);
      },
      [applyVideoAudioGain, finalizeAndUnmountAll, tryAttachWebAudioGain],
    );

    /**
     * Natural detached background audio fade loop (13.5s -> 21.0s):
     * - 13.5s - 15.5s: Holds chorus at 0.95 while curtains close, window snaps shut & confetti pops
     * - 15.5s - 21.0s: Smooth exponential / ease-out curve 0.95 -> 0.0 (local MP3 stays completely paused)
     * - 21.0s: Stops, unmounts hidden <video>, and immediately triggers sequential local MP3 autoplay
     */
    const startNaturalAudioFadeLoop = useCallback(() => {
      const video = videoRef.current;
      if (!video || video.muted || video.paused || videoMissingRef.current) {
        audioFadeActiveRef.current = false;
        audioFinishedRef.current = true;
        return;
      }

      if (audioFadeRafRef.current !== null) {
        window.cancelAnimationFrame(audioFadeRafRef.current);
        audioFadeRafRef.current = null;
      }

      audioFadeActiveRef.current = true;
      audioFinishedRef.current = false;
      void tryAttachWebAudioGain();

      const stepNatural = () => {
        if (phaseRef.current === 'done' || !audioFadeActiveRef.current) {
          audioFadeRafRef.current = null;
          return;
        }

        const currentTime = video.currentTime;
        const audioCue = getAudioTimelineCues(currentTime);

        applyVideoAudioGain(audioCue.gain);

        if (audioCue.shouldFinishAudio || video.ended || video.paused) {
          applyVideoAudioGain(0);
          audioFadeRafRef.current = null;
          audioFadeActiveRef.current = false;
          audioFinishedRef.current = true;
          try {
            video.pause();
          } catch {
            // Ignore pause errors
          }
          if (visualExitCompleteRef.current) {
            finalizeAndUnmountAll(true);
          }
          return;
        }

        audioFadeRafRef.current = window.requestAnimationFrame(stepNatural);
      };

      audioFadeRafRef.current = window.requestAnimationFrame(stepNatural);
    }, [applyVideoAudioGain, finalizeAndUnmountAll, tryAttachWebAudioGain]);

    // Expose imperative takeover hook for App.tsx when user taps "Play Music" early
    useImperativeHandle(
      ref,
      () => ({
        fadeOutForMusicTakeover() {
          if (phaseRef.current === 'done') return;
          // Suppress sequential handoff since user just manually started local MP3
          suppressBgMusicHandoffRef.current = true;
          if (phaseRef.current === 'audioOnly' || audioFadeActiveRef.current) {
            startTimedAudioFadeOut(MUSIC_TAKEOVER_FADE_MS, { handoffToBgMusicOnFinish: false });
          }
        },
      }),
      [startTimedAudioFadeOut],
    );

    // Lock body scrolling while intro window is visible; unlock on unmount
    useEffect(() => {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        document.documentElement.style.overflow = prevHtmlOverflow || '';
      };
    }, []);

    // Reset unified stage wrapper inline styles cleanly when switching to visually hidden audioOnly mode
    useEffect(() => {
      if (phase === 'audioOnly' && stageWrapperRef.current) {
        stageWrapperRef.current.style.transform = '';
        stageWrapperRef.current.style.opacity = '';
        stageWrapperRef.current.style.willChange = 'auto';
      }
    }, [phase]);

    // Guaranteed full teardown on unmount or Replay Intro
    useEffect(() => {
      return () => {
        cancelAllTimersAndRafs();
        const video = videoRef.current;
        if (video) {
          try {
            video.pause();
            video.currentTime = 0;
            video.volume = 1;
          } catch {
            // Ignore cleanup errors
          }
        }
        if (mediaSourceRef.current) {
          try {
            mediaSourceRef.current.disconnect();
          } catch {
            // Ignore disconnect errors
          }
          mediaSourceRef.current = null;
        }
        gainNodeRef.current = null;
        webAudioAttachedRef.current = false;
        if (audioCtxRef.current) {
          void audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      };
    }, [cancelAllTimersAndRafs]);

    // Gently fade in subtle "Skip Intro ->" link at 4.0s
    useEffect(() => {
      skipTimerRef.current = window.setTimeout(() => {
        setShowSkipLink(true);
      }, SKIP_FADE_IN_SEC * 1000);
      return () => {
        if (skipTimerRef.current !== null) {
          window.clearTimeout(skipTimerRef.current);
          skipTimerRef.current = null;
        }
      };
    }, []);

    /**
     * Three-Stage Closing Sequence at 13.5s (13.5s -> 15.9s, or snappy 1.1s Skip version):
     * - Stage 1 (0.00s - 1.50s): Permanently anchored rod + rings; curtains slide smoothly inward
     *   (scaleX ~0.21 -> 1.0) with +/-4deg outward cloth inertia, damped settle, and bow pop/seal at 14.7s.
     * - Stage 2 (1.50s - 1.70s): 200ms clean beat holding on bow-sealed closed curtains.
     * - Stage 3 (1.70s - 2.40s): Unified Style B snap-shut on stageWrapperRef (window + rod + curtains + bow):
     *   80ms pop (1.0 -> 1.025) + 420ms vertical snap-shut (scaleY 0.03, scaleX 0.78, opacity 0) + shut chime;
     *   simultaneous 550ms backdrop/text fade & site reveal (15.35s); scroll unlock, pointer-events none &
     *   twin side-cannon confetti at 15.60s; visual unmount / audioOnly handoff at 15.90s.
     */
    const startExitSequence = useCallback(
      (triggeredBySkip: boolean) => {
        if (
          exitTriggeredRef.current ||
          phaseRef.current === 'exiting' ||
          phaseRef.current === 'audioOnly' ||
          phaseRef.current === 'done'
        ) {
          return;
        }
        exitTriggeredRef.current = true;

        const currentVideoSec = Number((videoRef.current?.currentTime ?? 0).toFixed(1));
        if (triggeredBySkip) {
          trackEvent('intro_skipped', 'Skip Intro Button', { atVideoSecond: currentVideoSec });
          audioUnlockedRef.current = true;
          soundEngine.unlock();
        } else {
          trackEvent('intro_completed', 'Opening Curtain Intro');
        }

        // Stop preloader, opening & playback watchers
        if (loaderRafRef.current !== null) {
          window.cancelAnimationFrame(loaderRafRef.current);
          loaderRafRef.current = null;
        }
        if (openRafRef.current !== null) {
          window.cancelAnimationFrame(openRafRef.current);
          openRafRef.current = null;
        }
        if (playbackWatchRafRef.current !== null) {
          window.cancelAnimationFrame(playbackWatchRafRef.current);
          playbackWatchRafRef.current = null;
        }
        if (fallbackClockRafRef.current !== null) {
          window.cancelAnimationFrame(fallbackClockRafRef.current);
          fallbackClockRafRef.current = null;
        }

        const video = videoRef.current;
        const canContinueVideoAudio = Boolean(
          video && !video.muted && !video.paused && !videoMissingRef.current,
        );

        // CRITICAL: Never unmount or pause unmuted <video> at 13.5s!
        if (triggeredBySkip) {
          if (canContinueVideoAudio) {
            // Smooth 1.2s fade-out of skipped video audio -> strictly sequential MP3 autoplay once stopped
            startTimedAudioFadeOut(SKIP_AUDIO_FADE_MS, { handoffToBgMusicOnFinish: true });
          } else {
            if (video && !video.paused) {
              try {
                video.pause();
              } catch {
                // Ignore pause errors
              }
            }
            audioFinishedRef.current = true;
          }
        } else if (canContinueVideoAudio) {
          // Natural 13.5s exit with unmuted audio: hold 0.95 through 15.5s, fade 0.95 -> 0 by 21.0s
          startNaturalAudioFadeLoop();
        } else {
          // Muted autoplay or fallback: pause immediately & skip hidden audio phase
          if (video && !video.paused) {
            try {
              video.pause();
            } catch {
              // Ignore pause errors
            }
          }
          audioFinishedRef.current = true;
        }

        setPhaseSync('exiting');
        setShowSoundPill(false);
        if (lastGlintsRef.current) {
          lastGlintsRef.current = false;
          setShowSparkleGlints(false);
        }

        if (loaderPillRef.current) loaderPillRef.current.style.opacity = '0';

        // Promote GPU layers cleanly for closing & unified Style B snap-shut motion
        if (leftPanelRef.current) leftPanelRef.current.style.willChange = 'transform';
        if (rightPanelRef.current) rightPanelRef.current.style.willChange = 'transform';
        if (leftRingsRef.current) leftRingsRef.current.style.willChange = 'transform';
        if (rightRingsRef.current) rightRingsRef.current.style.willChange = 'transform';
        if (bowRef.current) bowRef.current.style.willChange = 'transform, opacity';
        if (stageWrapperRef.current) stageWrapperRef.current.style.willChange = 'transform, opacity';
        if (backdropLayerRef.current) backdropLayerRef.current.style.willChange = 'opacity';

        // Soft fabric-swish SFX as curtains glide smoothly back to center
        soundEngine.playCurtainRustle();

        const startScaleX = leftPanelRef.current?.dataset.scaleX
          ? Number(leftPanelRef.current.dataset.scaleX) || CURTAIN_REST_SCALE_X
          : CURTAIN_REST_SCALE_X;

        const exitStartTs = performance.now();
        let lastTs = exitStartTs;

        const stepExit = (now: number) => {
          // Clamp frame delta for smooth mobile stability while keeping exact wall-clock timeline sync
          void clampDeltaSec(now - lastTs);
          lastTs = now;
          const elapsedSec = Math.max(0, (now - exitStartTs) / 1000);
          const frame = computeClosingExitFrame(elapsedSec, {
            startScaleX,
            fastSkip: triggeredBySkip,
          });

          if (rootOverlayRef.current) {
            rootOverlayRef.current.dataset.exitSubstage = frame.subStage;
          }

          // Stage 1: Permanently anchored rod + rings; curtains glide smoothly inward to 1.0 with +/-4deg cloth inertia
          const sxStr = frame.panelScaleX.toFixed(4);
          if (leftPanelRef.current) {
            leftPanelRef.current.dataset.scaleX = sxStr;
            leftPanelRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sxStr}) skewX(${frame.leftSkewDeg.toFixed(2)}deg)`;
          }
          if (rightPanelRef.current) {
            rightPanelRef.current.dataset.scaleX = sxStr;
            rightPanelRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sxStr}) skewX(${(-frame.leftSkewDeg).toFixed(2)}deg)`;
          }
          if (leftRingsRef.current) {
            leftRingsRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sxStr})`;
          }
          if (rightRingsRef.current) {
            rightRingsRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sxStr})`;
          }

          // Bow pops & fades back in at 14.7s (scale 0.85 -> 1.0, opacity 0 -> 1) to seal closed curtains
          if (bowRef.current) {
            bowRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${frame.bowScale.toFixed(4)})`;
            bowRef.current.style.opacity = frame.bowOpacity.toFixed(3);
          }

          // Stage 3: Unified Style B Snap-Shut on stageWrapperRef (window + anchored rod + closed curtains + bow)
          if (frame.shouldPlayWindowShutChime && !windowShutChimePlayedRef.current) {
            windowShutChimePlayedRef.current = true;
            soundEngine.playWindowShutChime();
          }

          if (stageWrapperRef.current) {
            stageWrapperRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${frame.stageScaleX.toFixed(4)}) scaleY(${frame.stageScaleY.toFixed(4)})`;
            stageWrapperRef.current.style.opacity = frame.stageOpacity.toFixed(3);
          }

          // Simultaneous Rose-Cream backdrop & above/below text fade (15.35s -> 15.90s, 550ms)
          const bgOpacityStr = frame.backdropOpacity.toFixed(3);
          if (backdropLayerRef.current) backdropLayerRef.current.style.opacity = bgOpacityStr;
          if (ambientSparklesRef.current) ambientSparklesRef.current.style.opacity = bgOpacityStr;
          if (headerRef.current) headerRef.current.style.opacity = bgOpacityStr;
          if (footerCaptionRef.current) footerCaptionRef.current.style.opacity = bgOpacityStr;

          // 15.35s: Begin revealing pre-mounted main birthday site underneath (scale 0.97 -> 1.0, opacity 0.9 -> 1.0)
          if (frame.shouldTriggerMainReveal && !revealTriggeredRef.current) {
            revealTriggeredRef.current = true;
            onBeginMainRevealRef.current({
              audioUnlocked: audioUnlockedRef.current,
              willContinueVideoAudio: canContinueVideoAudio,
            });
          }

          // 15.60s (~70% faded): Instant interaction unlock (pointer-events none, scroll unlock) & twin side-cannon confetti
          if (frame.shouldUnlockAndFireConfetti && !unlockConfettiTriggeredRef.current) {
            unlockConfettiTriggeredRef.current = true;
            unlockBodyScroll();
            setPointerEventsDisabled(true);
            onFireRevealConfettiRef.current();
          }

          // 15.90s: Visual exit complete -> enter hidden audioOnly (keeping exact <video> mounted) or unmount cleanly
          if (frame.isVisualComplete) {
            finaleRafRef.current = null;
            visualExitCompleteRef.current = true;

            if (!revealTriggeredRef.current) {
              revealTriggeredRef.current = true;
              onBeginMainRevealRef.current({
                audioUnlocked: audioUnlockedRef.current,
                willContinueVideoAudio: canContinueVideoAudio,
              });
            }
            if (!unlockConfettiTriggeredRef.current) {
              unlockConfettiTriggeredRef.current = true;
              unlockBodyScroll();
              setPointerEventsDisabled(true);
              onFireRevealConfettiRef.current();
            }

            onVisualExitDoneRef.current();

            if (canContinueVideoAudio && !audioFinishedRef.current && audioFadeActiveRef.current) {
              setPhaseSync('audioOnly');
            } else {
              // Muted intro or audio fade already finished -> unmount & immediately trigger sequential MP3 autoplay
              finalizeAndUnmountAll(true);
            }
            return;
          }

          finaleRafRef.current = window.requestAnimationFrame(stepExit);
        };

        finaleRafRef.current = window.requestAnimationFrame(stepExit);
      },
      [
        finalizeAndUnmountAll,
        setPhaseSync,
        startNaturalAudioFadeLoop,
        startTimedAudioFadeOut,
        unlockBodyScroll,
      ],
    );

    // Lightweight milestone guard: checks 1.0s warmup, 12.5s red-mark beat & 13.5s exit trigger strictly once
    const evaluatePlaybackMilestones = useCallback(
      (currentTimeSec: number) => {
        if (currentTimeSec > 1.0) {
          notifyPastOneSecondOnce();
        }
        if (exitTriggeredRef.current) return;
        const cues = getPlaybackCues(currentTimeSec);

        if (cues.showSparkleGlints !== lastGlintsRef.current) {
          lastGlintsRef.current = cues.showSparkleGlints;
          setShowSparkleGlints(cues.showSparkleGlints);
        }
        if (cues.captionPhase !== lastCaptionPhaseRef.current) {
          lastCaptionPhaseRef.current = cues.captionPhase;
          setCaptionPhase(cues.captionPhase);
        }
        if (cues.shouldTriggerExit) {
          startExitSequence(false);
        }
      },
      [notifyPastOneSecondOnce, startExitSequence],
    );

    // Lightweight rAF playback watcher (zero setState except at exact 12.5s / 13.5s milestones)
    const startPlaybackMilestoneWatcher = useCallback(() => {
      if (playbackWatchRafRef.current !== null) return;
      const tickWatch = () => {
        if (
          exitTriggeredRef.current ||
          phaseRef.current === 'exiting' ||
          phaseRef.current === 'audioOnly' ||
          phaseRef.current === 'done'
        ) {
          playbackWatchRafRef.current = null;
          return;
        }
        const video = videoRef.current;
        if (video && video.readyState >= 1) {
          evaluatePlaybackMilestones(video.currentTime);
        }
        playbackWatchRafRef.current = window.requestAnimationFrame(tickWatch);
      };
      playbackWatchRafRef.current = window.requestAnimationFrame(tickWatch);
    }, [evaluatePlaybackMilestones]);

    // Mobile-safe autoplay helper: tries unmuted first at 0.20s, falls back to muted + "Tap for Sound" pill
    const startVideoPlayback = useCallback(async () => {
      if (videoPlayStartedRef.current) return;
      videoPlayStartedRef.current = true;

      const startFallbackTimeline = () => {
        let elapsedSec = 0;
        let lastTs = performance.now();
        const tickFallback = (now: number) => {
          if (exitTriggeredRef.current || phaseRef.current === 'done') return;
          const dtSec = clampDeltaSec(now - lastTs);
          lastTs = now;
          elapsedSec += dtSec;

          if (fallbackBarRef.current) {
            const ratio = Math.min(1, elapsedSec / EXIT_TRIGGER_SEC);
            fallbackBarRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
          }
          evaluatePlaybackMilestones(elapsedSec);

          if (elapsedSec >= EXIT_TRIGGER_SEC) {
            fallbackClockRafRef.current = null;
            startExitSequence(false);
            return;
          }
          fallbackClockRafRef.current = window.requestAnimationFrame(tickFallback);
        };
        fallbackClockRafRef.current = window.requestAnimationFrame(tickFallback);
      };

      const video = videoRef.current;
      if (!video || videoMissingRef.current) {
        notifySmoothPlaybackOnce();
        startFallbackTimeline();
        return;
      }

      const handlePlayingSignal = () => {
        video.removeEventListener('playing', handlePlayingSignal);
        notifySmoothPlaybackOnce();
      };
      video.addEventListener('playing', handlePlayingSignal, { once: true });

      try {
        // Avoid redundant currentTime = 0 seek flash when frame 1 is already decoded at start
        if (video.currentTime > 0.05) {
          video.currentTime = 0;
        }
        video.volume = 1;
        currentGainRef.current = 1;
        video.muted = false;
        await video.play();
        audioUnlockedRef.current = true;
        setShowSoundPill(false);
        if (video.readyState >= 3) {
          notifySmoothPlaybackOnce();
        }
        startPlaybackMilestoneWatcher();
      } catch {
        try {
          video.muted = true;
          await video.play();
          setShowSoundPill(true);
          if (video.readyState >= 3) {
            notifySmoothPlaybackOnce();
          }
          startPlaybackMilestoneWatcher();
        } catch {
          video.removeEventListener('playing', handlePlayingSignal);
          videoMissingRef.current = true;
          setVideoMissingFallback(true);
          setShowSoundPill(false);
          notifySmoothPlaybackOnce();
          startFallbackTimeline();
        }
      }
    }, [
      evaluatePlaybackMilestones,
      notifySmoothPlaybackOnce,
      startExitSequence,
      startPlaybackMilestoneWatcher,
    ]);

    /**
     * Seamless 60fps Opening Loop (0.0s -> 1.55s, clamped dt <= 0.05s, zero setState inside rAF):
     * - 0.00s - 0.25s: Loader pill fades out simultaneously as center bow pops (1.12x) & unties.
     * - 0.15s - 1.55s: Curtains slide outward along mini rod with GPU translate3d/scaleX/skewX (±5deg)
     *                  and gentle damped spring settle leaving ~10% gathered per side.
     * - 0.20s: Triggers video.play().
     */
    const startCurtainOpening = useCallback(() => {
      if (phaseRef.current !== 'loading') return;
      setPhaseSync('opening');
      soundEngine.playCurtainRustle();

      let elapsedSec = 0;
      let lastTs = performance.now();
      let videoTriggered = false;

      const animateOpen = (now: number) => {
        if (exitTriggeredRef.current || phaseRef.current === 'done') return;

        const dtSec = clampDeltaSec(now - lastTs);
        lastTs = now;
        elapsedSec += dtSec;

        const frame = computeCurtainOpenFrame(elapsedSec);

        // Loader card is already hidden before opening starts (never re-flash on cached / fast loads)
        if (loaderPillRef.current) {
          loaderPillRef.current.style.opacity = '0';
          loaderPillRef.current.style.pointerEvents = 'none';
          loaderPillRef.current.dataset.loaderVisible = 'false';
        }

        if (bowRef.current) {
          bowRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${frame.bowScale.toFixed(4)})`;
          bowRef.current.style.opacity = frame.bowOpacity.toFixed(3);
        }

        if (!videoTriggered && frame.shouldStartVideo) {
          videoTriggered = true;
          void startVideoPlayback();
        }

        const rippleScale = 1 + frame.waveRipple * 0.014;
        const sx = (frame.panelScaleX * rippleScale).toFixed(4);
        if (leftPanelRef.current) {
          leftPanelRef.current.dataset.scaleX = frame.panelScaleX.toFixed(4);
          leftPanelRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sx}) skewX(${frame.leftSkewDeg.toFixed(2)}deg)`;
        }
        if (rightPanelRef.current) {
          rightPanelRef.current.dataset.scaleX = frame.panelScaleX.toFixed(4);
          rightPanelRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${sx}) skewX(${(-frame.leftSkewDeg).toFixed(2)}deg)`;
        }
        if (leftRingsRef.current) {
          leftRingsRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${frame.panelScaleX.toFixed(4)})`;
        }
        if (rightRingsRef.current) {
          rightRingsRef.current.style.transform = `translate3d(0, 0, 0) scaleX(${frame.panelScaleX.toFixed(4)})`;
        }

        if (frame.isSettled) {
          openRafRef.current = null;
          // Release will-change while idle during video playback to conserve mobile GPU memory
          if (leftPanelRef.current) leftPanelRef.current.style.willChange = 'auto';
          if (rightPanelRef.current) rightPanelRef.current.style.willChange = 'auto';
          if (leftRingsRef.current) leftRingsRef.current.style.willChange = 'auto';
          if (rightRingsRef.current) rightRingsRef.current.style.willChange = 'auto';
          if (bowRef.current) bowRef.current.style.willChange = 'auto';
          if (phaseRef.current === 'opening') {
            setPhaseSync('playing');
          }
          if (!videoTriggered) {
            videoTriggered = true;
            void startVideoPlayback();
          }
          return;
        }

        openRafRef.current = window.requestAnimationFrame(animateOpen);
      };

      openRafRef.current = window.requestAnimationFrame(animateOpen);
    }, [setPhaseSync, startVideoPlayback]);

    // Smart, Calculative Zero-Black-Screen Preloader:
    // - Instantly skips loader (0ms delay, 0 flash) if video is already cached (readyState >= 3)
    // - 150ms anti-flash grace check: skips loader cleanly if fast Wi-Fi / browser cache finishes within 150ms
    // - Tracks real video.buffered ranges toward 16s target with smooth 60fps rAF scaleX interpolation
    // - Keeps curtains firmly shut until readyState >= 3 AND loadeddata confirm frame 1 is ready to paint
    // - Smooth handoff: glides bar to 100% (220ms), fades card out (250ms), then fires bow pop & curtains
    // - 6.5s safety fallback (proceeds once readyState >= 2) + dead-network graceful fallback
    useEffect(() => {
      if (phaseRef.current !== 'loading') return;

      const video = videoRef.current;

      // Smart cache detection: if video is already buffered in memory (readyState >= 3), skip loader immediately
      if (video && video.readyState >= 3) {
        if (loaderPillRef.current) {
          loaderPillRef.current.style.opacity = '0';
          loaderPillRef.current.dataset.loaderVisible = 'false';
          loaderPillRef.current.dataset.loaderSkipped = 'true';
        }
        trackEvent('intro_loader_finished', 'Intro Video Smart Preloader', {
          bufferMs: 0,
          wasCached: true,
        });
        startCurtainOpening();
        return;
      }

      const mountTs = performance.now();
      let lastTs = mountTs;
      let displayPct = 0;
      let lastStatusText = '';
      let hasLoadedData = Boolean(video && video.readyState >= 2);
      let loaderCardShown = false;
      let loaderShownAtTs = 0;
      let finishingStartTs: number | null = null;
      let finishStartPct = 0;
      let opened = false;

      const updateLoaderDom = (pct: number) => {
        const clamped = Math.max(0, Math.min(100, pct));
        const rounded = Math.round(clamped);
        if (loaderBarRef.current) {
          loaderBarRef.current.style.transform = `scaleX(${(clamped / 100).toFixed(4)})`;
        }
        if (loaderPctRef.current) {
          loaderPctRef.current.textContent = `${rounded}%`;
        }
        if (loaderStatusRef.current) {
          const nextStatus = getPreloaderStatusText(rounded);
          if (nextStatus !== lastStatusText) {
            lastStatusText = nextStatus;
            loaderStatusRef.current.textContent = nextStatus;
          }
        }
      };

      const readBufferedEndSec = (v: HTMLVideoElement | null): number => {
        if (!v || !v.buffered || v.buffered.length === 0) return 0;
        let bestEnd = 0;
        for (let i = 0; i < v.buffered.length; i++) {
          try {
            const start = v.buffered.start(i);
            const end = v.buffered.end(i);
            if (start <= 0.5 && end > bestEnd) {
              bestEnd = end;
            } else if (bestEnd === 0 && end > bestEnd) {
              bestEnd = end;
            }
          } catch {
            // Ignore transient TimeRanges errors
          }
        }
        return bestEnd;
      };

      const beginReadyHandoff = (now: number) => {
        if (opened || phaseRef.current !== 'loading') return;

        // If video became ready within the 150ms anti-flash grace window (never showed card), skip straight to curtains!
        if (!loaderCardShown) {
          opened = true;
          if (loaderRafRef.current !== null) {
            window.cancelAnimationFrame(loaderRafRef.current);
            loaderRafRef.current = null;
          }
          if (loaderPillRef.current) {
            loaderPillRef.current.style.opacity = '0';
            loaderPillRef.current.dataset.loaderVisible = 'false';
            loaderPillRef.current.dataset.loaderSkipped = 'true';
          }
          trackEvent('intro_loader_finished', 'Intro Video Smart Preloader', {
            bufferMs: Math.max(0, Math.round(now - mountTs)),
            wasCached: true,
          });
          startCurtainOpening();
          return;
        }

        if (finishingStartTs === null) {
          finishingStartTs = now;
          finishStartPct = displayPct;
        }
      };

      const markLoadedData = () => {
        hasLoadedData = true;
        if (video && video.readyState >= 3) {
          beginReadyHandoff(performance.now());
        }
      };

      const handleReadyEvent = () => {
        if (video && video.readyState >= 2) {
          hasLoadedData = true;
        }
        if (video && video.readyState >= 3 && hasLoadedData) {
          beginReadyHandoff(performance.now());
        }
      };

      const handleCanPlayThrough = () => {
        hasLoadedData = true;
        beginReadyHandoff(performance.now());
      };

      const handleVideoError = () => {
        videoMissingRef.current = true;
        setVideoMissingFallback(true);
        beginReadyHandoff(performance.now());
      };

      const tickLoader = (now: number) => {
        if (opened || exitTriggeredRef.current || phaseRef.current !== 'loading') {
          loaderRafRef.current = null;
          return;
        }

        const dtSec = clampDeltaSec(now - lastTs);
        lastTs = now;
        const elapsedMs = Math.max(0, now - mountTs);

        // Handoff phase: smoothly glide bar to 100% (220ms), then fade card out (250ms), then open curtains
        if (finishingStartTs !== null) {
          const finElapsedMs = Math.max(0, now - finishingStartTs);
          if (finElapsedMs < PRELOADER_GLIDE_TO_100_MS) {
            const u = finElapsedMs / PRELOADER_GLIDE_TO_100_MS;
            const eased = 1 - Math.pow(1 - u, 3);
            displayPct = finishStartPct + (100 - finishStartPct) * eased;
            updateLoaderDom(displayPct);
          } else {
            displayPct = 100;
            updateLoaderDom(100);
            const fadeU = Math.min(
              1,
              (finElapsedMs - PRELOADER_GLIDE_TO_100_MS) / PRELOADER_CARD_FADE_MS,
            );
            if (loaderPillRef.current) {
              loaderPillRef.current.style.opacity = (1 - fadeU).toFixed(3);
            }
            if (fadeU >= 1) {
              opened = true;
              loaderRafRef.current = null;
              if (loaderPillRef.current) {
                loaderPillRef.current.style.opacity = '0';
                loaderPillRef.current.dataset.loaderVisible = 'false';
              }
              trackEvent('intro_loader_finished', 'Intro Video Smart Preloader', {
                bufferMs: Math.max(0, Math.round(now - mountTs)),
                wasCached: false,
              });
              startCurtainOpening();
              return;
            }
          }
          loaderRafRef.current = window.requestAnimationFrame(tickLoader);
          return;
        }

        const readyState = video ? video.readyState : 0;
        if (readyState >= 2) {
          hasLoadedData = true;
        }

        const state = computeSmartPreloaderTarget({
          bufferedEndSec: readBufferedEndSec(video),
          durationSec: video ? video.duration : undefined,
          readyState,
          hasLoadedData,
          elapsedMs,
          maxTimeoutMs: PRELOADER_MAX_TIMEOUT_MS,
        });

        // Reveal loading card only after 150ms anti-flash grace check when video truly needs buffering
        if (!loaderCardShown && state.shouldShowLoaderCard) {
          loaderCardShown = true;
          loaderShownAtTs = now;
          if (loaderPillRef.current) {
            loaderPillRef.current.dataset.loaderVisible = 'true';
            loaderPillRef.current.dataset.loaderSkipped = 'false';
          }
        }

        displayPct = stepPreloaderDisplayPct(displayPct, state.targetPct, dtSec);
        if (loaderCardShown) {
          if (loaderPillRef.current) {
            const fadeInU = Math.min(1, (now - loaderShownAtTs) / 180);
            loaderPillRef.current.style.opacity = fadeInU.toFixed(3);
          }
          updateLoaderDom(displayPct);
        }

        if (state.isReady) {
          beginReadyHandoff(now);
        } else if (elapsedMs >= PRELOADER_MAX_TIMEOUT_MS + 3000) {
          // Hard dead-network guard (9.5s total) so intro can never hang forever if offline
          videoMissingRef.current = true;
          setVideoMissingFallback(true);
          beginReadyHandoff(now);
        }

        if (!opened) {
          loaderRafRef.current = window.requestAnimationFrame(tickLoader);
        }
      };

      if (video) {
        video.addEventListener('loadstart', handleReadyEvent);
        video.addEventListener('loadedmetadata', handleReadyEvent);
        video.addEventListener('progress', handleReadyEvent);
        video.addEventListener('loadeddata', markLoadedData);
        video.addEventListener('canplay', handleReadyEvent);
        video.addEventListener('canplaythrough', handleCanPlayThrough);
        video.addEventListener('error', handleVideoError);
      }

      loaderRafRef.current = window.requestAnimationFrame(tickLoader);

      return () => {
        if (loaderRafRef.current !== null) {
          window.cancelAnimationFrame(loaderRafRef.current);
          loaderRafRef.current = null;
        }
        if (video) {
          video.removeEventListener('loadstart', handleReadyEvent);
          video.removeEventListener('loadedmetadata', handleReadyEvent);
          video.removeEventListener('progress', handleReadyEvent);
          video.removeEventListener('loadeddata', markLoadedData);
          video.removeEventListener('canplay', handleReadyEvent);
          video.removeEventListener('canplaythrough', handleCanPlayThrough);
          video.removeEventListener('error', handleVideoError);
        }
      };
    }, [startCurtainOpening]);

    const handleTapForSound = () => {
      trackEvent('intro_unmuted_tapped', 'Intro Tap for Sound Button');
      audioUnlockedRef.current = true;
      soundEngine.unlock();
      soundEngine.playBubbleClick(1.1);
      const video = videoRef.current;
      if (video) {
        video.volume = 1;
        currentGainRef.current = 1;
        video.muted = false;
        if (video.paused) {
          void video.play().catch(() => {});
        }
        // Attach Web Audio GainNode on user gesture so iOS Safari gain fades work seamlessly
        void tryAttachWebAudioGain();
      }
      setShowSoundPill(false);
    };

    const isAudioOnly = phase === 'audioOnly';
    const isVisualInteractive = phase !== 'exiting' && phase !== 'audioOnly' && phase !== 'done';

    // CRITICAL STABLE-TREE STRUCTURE:
    // Ancestor chain down to <video> stays identical across loading -> opening -> playing -> exiting -> audioOnly
    // so React NEVER unmounts or interrupts the <video> element when the visual theatre closes at 13.5s!
    return (
      <div
        ref={rootOverlayRef}
        data-testid="theatre-intro-overlay"
        data-stage={phase}
        data-audio-only={String(isAudioOnly)}
        data-audio-gain="1.000"
        data-music-crossfade="false"
        role={isAudioOnly ? undefined : 'dialog'}
        aria-modal={isAudioOnly ? undefined : true}
        aria-hidden={isAudioOnly || undefined}
        aria-label={isAudioOnly ? undefined : 'Birthday intro mini-theatre'}
        className={
          isAudioOnly
            ? 'pointer-events-none fixed top-0 left-0 h-[1px] w-[1px] overflow-hidden bg-transparent opacity-0'
            : `fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden px-4 py-6 select-none ${
                pointerEventsDisabled ? 'pointer-events-none' : ''
              }`
        }
      >
        {/* Dedicated GPU-composited Soft Rose-Cream Backdrop Layer (unmounts in audioOnly) */}
        {!isAudioOnly && (
          <div
            ref={backdropLayerRef}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 bg-[#FFF6F9] will-change-[opacity]"
          />
        )}

        {/* Ultra-subtle drifting pastel accents in outer Rose-Cream backdrop */}
        {!isAudioOnly && (
          <div
            ref={ambientSparklesRef}
            className="pointer-events-none fixed inset-0 overflow-hidden will-change-[opacity]"
            aria-hidden="true"
          >
            {AMBIENT_BACKDROP_SPARKLES.map((sp, i) => (
              <SparkleStarSvg
                key={i}
                className={`animate-twinkle absolute opacity-50 ${sp.size} ${sp.color}`}
                style={{
                  top: sp.top,
                  left: sp.left,
                  right: sp.right,
                  bottom: sp.bottom,
                  animationDelay: sp.delay,
                }}
              />
            ))}
          </div>
        )}

        <div
          className={
            isAudioOnly
              ? 'h-[1px] w-[1px] overflow-hidden'
              : 'relative z-10 flex w-full max-w-2xl flex-col items-center justify-center'
          }
        >
          {/* SPACE ABOVE THE 16:9 WINDOW */}
          {!isAudioOnly && (
            <header
              ref={headerRef}
              className="relative z-10 mb-6 flex flex-col items-center text-center will-change-[opacity] sm:mb-8"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2C3D8] bg-[#FFE6F0] px-3.5 py-1 text-[11px] font-bold tracking-[0.08em] text-[#D94B7D] sm:text-xs">
                <span>🎀 03 DECEMBER 2026</span>
              </span>

              <h1 className="font-display mt-3 text-balance text-2xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
                Happy 17th Birthday, Morgan
              </h1>

              <p className="mt-1.5 max-w-md text-sm font-medium text-[#6B3B64] sm:text-[15px]">
                Hold on, your actual birthday site is right behind this.
              </p>
            </header>
          )}

          {/* UNIFIED 16:9 STAGE WRAPPER (Window frame + permanently anchored rod, rings, curtains & bow animate together in Style B snap-shut) */}
          <div
            ref={stageWrapperRef}
            data-testid="theatre-stage-wrapper"
            className={
              isAudioOnly
                ? 'h-[1px] w-[1px] overflow-hidden'
                : 'relative z-20 mx-auto will-change-[transform,opacity]'
            }
            style={
              isAudioOnly
                ? undefined
                : { width: 'min(92vw, 560px)', transformOrigin: 'center center' }
            }
          >
            {/* 12.5s - 13.5s Outer Border Pastel Sparkle Glints (never cover the red mark) */}
            {!isAudioOnly && showSparkleGlints && (
              <div
                data-testid="theatre-kiss-glints"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-30"
              >
                {OUTER_BORDER_GLINTS.map((g, idx) => (
                  <SparkleStarSvg
                    key={idx}
                    className={`animate-theatre-glint absolute ${g.pos} ${g.size} ${g.color}`}
                    style={{ animationDelay: g.delay }}
                  />
                ))}
              </div>
            )}

            {/* Cute Minimal Pastel Window Frame: 18px radius, rose-gold border, 3-dot top bar, single static shadow */}
            <div
              data-testid="theatre-video-frame"
              className={
                isAudioOnly
                  ? 'h-[1px] w-[1px] overflow-hidden'
                  : 'relative w-full overflow-hidden rounded-[18px] border border-[#E7B7C8] bg-[#FFFDFB] shadow-[0_18px_40px_-18px_rgba(58,18,51,0.22)]'
              }
            >
              {/* Soft Top Pastel Window-Bar Accent with 3 Tiny Blush / Cream Dots */}
              {!isAudioOnly && (
                <div
                  data-testid="theatre-window-bar"
                  aria-hidden="true"
                  className="flex h-[24px] items-center justify-between border-b border-[#F2CADB] bg-[#FFF1F6] px-3"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-[7px] w-[7px] rounded-full bg-[#E87AA4]" />
                    <span className="h-[7px] w-[7px] rounded-full border border-[#E7C67A] bg-[#FFF3C4]" />
                    <span className="h-[7px] w-[7px] rounded-full border border-[#E5B8CC] bg-[#FFE6F0]" />
                  </div>
                  <span className="text-[10px] font-semibold tracking-[0.08em] text-[#B36A8E]">
                    03 &middot; 12 &middot; 26
                  </span>
                </div>
              )}

              {/* Exact 16:9 Edge-to-Edge Video Stage (Soft Rose-Cream background — never black) */}
              <div
                data-testid="theatre-video-viewport"
                className={
                  isAudioOnly
                    ? 'h-[1px] w-[1px] overflow-hidden'
                    : 'relative aspect-video w-full overflow-hidden bg-[#FFF6F9]'
                }
              >
                <video
                  ref={videoRef}
                  data-testid="theatre-intro-video"
                  src={INTRO_VIDEO_URL}
                  crossOrigin="anonymous"
                  preload="auto"
                  playsInline
                  onTimeUpdate={(e) => evaluatePlaybackMilestones(e.currentTarget.currentTime)}
                  onEnded={() => {
                    if (!exitTriggeredRef.current) {
                      startExitSequence(false);
                    } else if (visualExitCompleteRef.current) {
                      finalizeAndUnmountAll();
                    }
                  }}
                  className={
                    isAudioOnly
                      ? 'h-[1px] w-[1px]'
                      : `h-full w-full bg-[#FFF6F9] object-cover ${videoMissingFallback ? 'hidden' : 'block'}`
                  }
                />

                {/* Offline Fallback Card (only shown if video network request fails) */}
                {!isAudioOnly && videoMissingFallback && (
                  <div
                    data-testid="theatre-fallback-stage"
                    className="relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#3A1233] via-[#591C4D] to-[#9E2A5B] px-11 text-center text-[#FFFDFB] sm:px-14"
                  >
                    <span className="rounded-full border border-[#FFE6F0]/30 bg-[#FFFDFB]/10 px-3 py-0.5 text-[10px] font-bold tracking-widest text-[#FFF3C4] uppercase">
                      Now Showing · 03 Dec 2026
                    </span>
                    <p className="font-display mt-2.5 text-lg font-semibold text-[#FFFDFB] sm:mt-3 sm:text-2xl">
                      Morgan Turns 17 🎀✨
                    </p>
                    <p className="mt-1 max-w-[230px] text-[11px] leading-snug text-[#FFE6F0]/85 sm:mt-1.5 sm:max-w-xs sm:text-sm">
                      Your birthday surprise is right behind these curtains.
                    </p>
                    <div className="mt-3.5 h-1.5 w-32 overflow-hidden rounded-full bg-[#FFFDFB]/20 sm:mt-4 sm:w-36">
                      <div
                        ref={fallbackBarRef}
                        style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
                        className="h-full w-full rounded-full bg-gradient-to-r from-[#FFE6F0] to-[#FFF3C4] will-change-transform"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VIDEO-SIZED MINI CURTAIN RIG (Mounted strictly over the 16:9 video frame below the 24px window bar, extending 6px-8px past top & side edges) */}
            {!isAudioOnly && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-[19px] -right-[6px] bottom-0 -left-[6px] z-40"
              >
                {/* Permanently Anchored Slim Rose-Gold Curtain Rod (height: 8px) with Rounded Finials & Gold Rings */}
                <div
                  data-testid="theatre-curtain-rod"
                  className="relative z-30 -mx-[2px] flex h-3 items-center"
                >
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#B57B63] bg-gradient-to-br from-[#FBE0CE] via-[#DFA292] to-[#B67468]" />

                  <div className="relative h-[8px] flex-1 rounded-full bg-gradient-to-b from-[#FCE6D8] via-[#DDA094] to-[#A6655F]">
                    <div
                      ref={leftRingsRef}
                      style={{ transformOrigin: 'left center' }}
                      className="absolute inset-y-0 left-0 w-1/2 will-change-transform"
                    >
                      {CURTAIN_RINGS.map((pct) => (
                        <span
                          key={`l-${pct}`}
                          style={{ left: `${pct}%` }}
                          className="absolute top-1/2 h-3.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#F8DF9C]"
                        />
                      ))}
                    </div>

                    <div
                      ref={rightRingsRef}
                      style={{ transformOrigin: 'right center' }}
                      className="absolute inset-y-0 right-0 w-1/2 will-change-transform"
                    >
                      {CURTAIN_RINGS.map((pct) => (
                        <span
                          key={`r-${pct}`}
                          style={{ left: `${pct}%` }}
                          className="absolute top-1/2 h-3.5 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-[#F8DF9C]"
                        />
                      ))}
                    </div>
                  </div>

                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-[#B57B63] bg-gradient-to-br from-[#FBE0CE] via-[#DFA292] to-[#B67468]" />
                </div>

                {/* Pleated Rose Berry & Blush Curtain Panels */}
                <div className="relative -mt-[2px] h-[calc(100%-9px)] w-full overflow-visible">
                  {/* Left Pleated Panel */}
                  <div
                    ref={leftPanelRef}
                    data-testid="theatre-curtain-left"
                    data-scale-x="1"
                    style={{
                      ...PLEAT_GRADIENT_STYLE,
                      transformOrigin: 'left center',
                    }}
                    className="absolute top-0 bottom-0 left-0 w-[50.8%] rounded-tl-[10px] rounded-bl-[18px] rounded-br-[5px] shadow-[inset_-10px_0_16px_-8px_rgba(58,18,51,0.38)] will-change-transform"
                  >
                    <div className="absolute inset-0 rounded-tl-[10px] rounded-bl-[18px] bg-gradient-to-b from-[#FFF3F8]/18 via-transparent to-[#3A1233]/22" />
                    <div className="absolute top-0 right-0 bottom-0 w-[2.5px] bg-gradient-to-b from-[#FCE6A6] via-[#E5B863] to-[#C88E3F] opacity-90" />
                  </div>

                  {/* Right Pleated Panel */}
                  <div
                    ref={rightPanelRef}
                    data-testid="theatre-curtain-right"
                    data-scale-x="1"
                    style={{
                      ...PLEAT_GRADIENT_STYLE,
                      transformOrigin: 'right center',
                    }}
                    className="absolute top-0 right-0 bottom-0 w-[50.8%] rounded-tr-[10px] rounded-br-[18px] rounded-bl-[5px] shadow-[inset_10px_0_16px_-8px_rgba(58,18,51,0.38)] will-change-transform"
                  >
                    <div className="absolute inset-0 rounded-tr-[10px] rounded-br-[18px] bg-gradient-to-b from-[#FFF3F8]/18 via-transparent to-[#3A1233]/22" />
                    <div className="absolute top-0 bottom-0 left-0 w-[2.5px] bg-gradient-to-b from-[#FCE6A6] via-[#E5B863] to-[#C88E3F] opacity-90" />
                  </div>

                  {/* Centered Pastel Ribbon Bow SVG pinning curtains closed */}
                  <div
                    ref={bowRef}
                    data-testid="theatre-ribbon-bow"
                    style={{ transform: 'translate3d(-50%, -50%, 0) scale(1)' }}
                    className="absolute top-1/2 left-1/2 z-20 will-change-[transform,opacity]"
                  >
                    <PastelRibbonBowSvg className="h-14 w-20 sm:h-16 sm:w-24" />
                  </div>

                  {/* Smart, Calculative Rose-Cream & Rose-Gold Loading Card (hidden unless video buffers >150ms) */}
                  <div
                    ref={loaderPillRef}
                    data-testid="theatre-preloader-pill"
                    data-loader-visible="false"
                    data-loader-skipped="false"
                    style={{ opacity: 0 }}
                    className="pointer-events-none absolute top-1/2 left-1/2 z-30 flex w-[min(84%,296px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 rounded-2xl border border-[#EBC0CF] bg-[#FFFDFB]/97 px-4 py-3 shadow-[0_14px_30px_-10px_rgba(58,18,51,0.38)] will-change-[opacity]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        ref={loaderStatusRef}
                        data-testid="theatre-preloader-status"
                        className="truncate text-[11px] font-semibold text-[#5A1E4E] sm:text-xs"
                      >
                        Setting up Morgan&rsquo;s stage...
                      </span>
                      <span
                        ref={loaderPctRef}
                        data-testid="theatre-preloader-pct"
                        className="shrink-0 text-[11px] font-bold tabular-nums text-[#3A1233] sm:text-xs"
                      >
                        0%
                      </span>
                    </div>

                    {/* 8px Sliding Progress Bar with Warm Rose Berry Gradient + Gliding Light Shimmer */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#F7D7E4]">
                      <div
                        ref={loaderBarRef}
                        data-testid="theatre-preloader-bar"
                        style={{
                          transform: 'scaleX(0)',
                          transformOrigin: 'left center',
                          background: 'linear-gradient(90deg, #D94B7D 0%, #F07AA5 100%)',
                        }}
                        className="relative h-full w-full overflow-hidden rounded-full will-change-transform"
                      >
                        <div
                          aria-hidden="true"
                          className="animate-loader-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SPACE BELOW THE 16:9 WINDOW (Clean Airy Spacing, Zero Overlays Blocking Video) */}
          {!isAudioOnly && (
            <div
              ref={footerCaptionRef}
              className="relative z-10 mt-6 flex min-h-[108px] flex-col items-center gap-3 text-center will-change-[opacity] sm:mt-7"
            >
              {/* Smooth Opacity Crossfade Caption Slot (0s-12.5s -> 12.5s-13.5s) */}
              <div
                data-testid="theatre-caption"
                data-caption-phase={captionPhase}
                className="relative grid place-items-center text-sm font-semibold text-[#5A1E4E] sm:text-[15px]"
              >
                <span
                  className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                    captionPhase === 'initial' ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {INITIAL_CAPTION}
                </span>
                <span
                  className={`col-start-1 row-start-1 transition-opacity duration-500 ${
                    captionPhase === 'finale' ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {FINALE_CAPTION}
                </span>
              </div>

              {/* Pulsing "Tap for Sound" Pill — ONLY shown if mobile blocks unmuted autoplay */}
              {showSoundPill && isVisualInteractive && (
                <button
                  type="button"
                  data-testid="theatre-sound-btn"
                  onClick={handleTapForSound}
                  className="relative inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#EBAEC7] bg-[#3A1233] px-5 py-2 text-xs font-bold text-[#FFFDFB] transition-transform duration-150 hover:bg-[#521C49] active:scale-[0.96] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                >
                  <span
                    aria-hidden="true"
                    className="animate-theatre-sound-pulse pointer-events-none absolute inset-0 rounded-full border-2 border-[#D94B7D] will-change-[transform,opacity]"
                  />
                  <Volume2
                    className="relative z-10 h-3.5 w-3.5 text-[#FFF3C4]"
                    aria-hidden="true"
                  />
                  <span className="relative z-10">Tap for Sound 🔊</span>
                </button>
              )}

              {/* Subtle "Skip Intro ->" Link fading in softly at 4.0s */}
              <button
                type="button"
                data-testid="theatre-skip-btn"
                onClick={() => startExitSequence(true)}
                disabled={!showSkipLink || !isVisualInteractive}
                aria-hidden={!showSkipLink}
                tabIndex={showSkipLink ? 0 : -1}
                className={`mt-0.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#8A4E79] transition-opacity duration-500 hover:text-[#3A1233] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
                  showSkipLink && isVisualInteractive
                    ? 'pointer-events-auto opacity-85 hover:opacity-100 cursor-pointer'
                    : 'pointer-events-none opacity-0'
                }`}
              >
                Skip Intro &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
