import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { ConfettiCanvas, type ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { SparkleStarSvg } from './components/DoodleSvgs';
import { FloatingConfettiButton } from './components/FloatingConfettiButton';
import { HeroSection } from './components/HeroSection';
import { MidnightLockOverlay } from './components/MidnightLockOverlay';
import { SparkleRainCanvas } from './components/SparkleRainCanvas';
import {
  TheatreIntroOverlay,
  type TheatreIntroOverlayHandle,
} from './components/TheatreIntroOverlay';
import { TopBar } from './components/TopBar';
import { ANAMIKA } from './data/celebrationData';
import { initAnalytics, trackEvent } from './utils/analytics';
import { isInsightsQuery } from './utils/analyticsCore';
import { haptics } from './utils/haptics';
import type { OneTimeSummaryGiftData } from './utils/infinityVault';
import { shouldShowMidnightLock } from './utils/midnightLock';
import { bgMusicPlayer } from './utils/musicSynth';
import {
  MAIN_PREMOUNT_BREATHER_MS,
  STAGE3_TO_MAIN_TIMING,
  getDefaultPreloadImageUrls,
  preloadMainPageDuringStory,
  startBackgroundWarmup,
  startIntroPlaybackPreload,
} from './utils/preloader';
import {
  BACKGROUND_SECTION_LOADERS,
  TIER1_MAIN_LOADERS,
  TIER2_MAIN_LOADERS,
  WAVE3_MAIN_PAGE_LOADERS,
  loadAdoptionCertificateSection,
  loadBackstorySection,
  loadBauniMeterSection,
  loadBirthdaySummaryCard,
  loadCalendarAndCounterSection,
  loadCaseFileSection,
  loadBaadMeRevealSection,
  loadChickenFarmSection,
  loadClosingSignOffFooter,
  loadDeveloperReviewSection,
  loadInfinityVaultSection,
  loadInteractiveTogglesSection,
  loadKeepsakePreviewModal,
  loadLifeStatsSection,
  loadMakeAWishCake,
  loadModinoPet,
  loadOwnerAnalyticsDashboard,
  loadRunawayAgreementSection,
  loadScratchCouponsSection,
  loadSpinWheelSection,
  loadStarterPackGrid,
  loadSurpriseGiftSection,
  loadTapliArenaSection,
  loadTimeCapsuleSection,
} from './utils/sectionLoaders';
import {
  StageBridgeTransition,
  type StageBridgeMode,
  type StageBridgePhase,
} from './components/StageBridgeTransition';
import { emitModinoEvent } from './utils/modinoBus';
import { playUiSfx } from './utils/uiSoundEngine';
import { soundEngine } from './utils/soundEngine';
import {
  BG_MUSIC_AUTOPLAY_FADE_MS,
  STAGE3_AUDIO_INTERRUPT_FADE_MS,
} from './utils/theatrePhysics';
import { unlockKissAudioContext } from './components/originStory/kissAudioSingleton';

// Code-split below-the-fold sections & owner-only dashboard into independent lazy chunks
const InteractiveTogglesSection = lazy(() =>
  loadInteractiveTogglesSection().then((m) => ({ default: m.InteractiveTogglesSection })),
);
const CalendarAndCounterSection = lazy(() =>
  loadCalendarAndCounterSection().then((m) => ({ default: m.CalendarAndCounterSection })),
);
const LifeStatsSection = lazy(() =>
  loadLifeStatsSection().then((m) => ({ default: m.LifeStatsSection })),
);
const BackstorySection = lazy(() =>
  loadBackstorySection().then((m) => ({ default: m.BackstorySection })),
);
const StarterPackGrid = lazy(() =>
  loadStarterPackGrid().then((m) => ({ default: m.StarterPackGrid })),
);
const RunawayAgreementSection = lazy(() =>
  loadRunawayAgreementSection().then((m) => ({ default: m.RunawayAgreementSection })),
);
const BauniMeterSection = lazy(() =>
  loadBauniMeterSection().then((m) => ({ default: m.BauniMeterSection })),
);
const AdoptionCertificateSection = lazy(() =>
  loadAdoptionCertificateSection().then((m) => ({ default: m.AdoptionCertificateSection })),
);
const CaseFileSection = lazy(() =>
  loadCaseFileSection().then((m) => ({ default: m.CaseFileSection })),
);
const BaadMeRevealSection = lazy(() =>
  loadBaadMeRevealSection().then((m) => ({ default: m.BaadMeRevealSection })),
);
const ScratchCouponsSection = lazy(() =>
  loadScratchCouponsSection().then((m) => ({ default: m.ScratchCouponsSection })),
);
const InfinityVaultSection = lazy(() =>
  loadInfinityVaultSection().then((m) => ({ default: m.InfinityVaultSection })),
);
const SpinWheelSection = lazy(() =>
  loadSpinWheelSection().then((m) => ({ default: m.SpinWheelSection })),
);
const SurpriseGiftSection = lazy(() =>
  loadSurpriseGiftSection().then((m) => ({ default: m.SurpriseGiftSection })),
);
const MakeAWishCake = lazy(() =>
  loadMakeAWishCake().then((m) => ({ default: m.MakeAWishCake })),
);
const BirthdaySummaryCard = lazy(() =>
  loadBirthdaySummaryCard().then((m) => ({ default: m.BirthdaySummaryCard })),
);
const TapliArenaSection = lazy(() =>
  loadTapliArenaSection().then((m) => ({ default: m.TapliArenaSection })),
);
const ChickenFarmSection = lazy(() =>
  loadChickenFarmSection().then((m) => ({ default: m.ChickenFarmSection })),
);
const TimeCapsuleSection = lazy(() =>
  loadTimeCapsuleSection().then((m) => ({ default: m.TimeCapsuleSection })),
);
const DeveloperReviewSection = lazy(() =>
  loadDeveloperReviewSection().then((m) => ({ default: m.DeveloperReviewSection })),
);
const ClosingSignOffFooter = lazy(() =>
  loadClosingSignOffFooter().then((m) => ({ default: m.ClosingSignOffFooter })),
);
const OwnerAnalyticsDashboard = lazy(() =>
  loadOwnerAnalyticsDashboard().then((m) => ({ default: m.OwnerAnalyticsDashboard })),
);
const KeepsakePreviewModal = lazy(() =>
  loadKeepsakePreviewModal().then((m) => ({ default: m.KeepsakePreviewModal })),
);
const ModinoPet = lazy(() =>
  loadModinoPet().then((m) => ({ default: m.ModinoPet })),
);
const loadOriginStoryPlay = () => import('./components/originStory/OriginStoryPlay');
const OriginStoryPlay = lazy(loadOriginStoryPlay);

type ExperienceStage = 'intro' | 'origin_story' | 'main';

function SectionPlaceholder({ id, minHeight }: { id?: string; minHeight: number }) {
  return (
    <div
      id={id}
      aria-hidden="true"
      className="w-full bg-[#FFF8FB]"
      style={{ minHeight: `${minHeight}px` }}
    />
  );
}

function shouldSkipIntroFromQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

function BirthdayWebsiteShell() {
  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);
  const theatreOverlayRef = useRef<TheatreIntroOverlayHandle | null>(null);
  const cancelWarmupRef = useRef<(() => void) | null>(null);

  const initialBypassIntro = shouldSkipIntroFromQuery();
  const [stage, setStage] = useState<ExperienceStage>(() =>
    initialBypassIntro ? 'main' : 'intro',
  );
  const stageRef = useRef<ExperienceStage>(initialBypassIntro ? 'main' : 'intro');
  const [showIntro, setShowIntro] = useState<boolean>(() => !initialBypassIntro);
  const [showOriginStory, setShowOriginStory] = useState<boolean>(false);
  const [introRunId, setIntroRunId] = useState(0);
  const [originStoryRunId, setOriginStoryRunId] = useState(0);
  const [siteRevealed, setSiteRevealed] = useState<boolean>(() => initialBypassIntro);
  const [visualExitDone, setVisualExitDone] = useState<boolean>(() => initialBypassIntro);
  const [curtainCompletedAtMs, setCurtainCompletedAtMs] = useState<number | null>(() =>
    initialBypassIntro ? Date.now() : null,
  );
  const [hasReachedMainStage, setHasReachedMainStage] = useState<boolean>(
    () => initialBypassIntro,
  );
  const [shouldPreMountMain, setShouldPreMountMain] = useState<boolean>(
    () => initialBypassIntro,
  );
  const [bridgeTransition, setBridgeTransition] = useState<{
    mode: StageBridgeMode;
    phase: StageBridgePhase;
  } | null>(null);
  const enteredOriginForRunRef = useRef(false);
  const originExitHandledRef = useRef(false);
  const originStoryModeRef = useRef<'pipeline' | 'replay'>('pipeline');
  const wasMusicPlayingBeforeReplayRef = useRef(false);
  const savedReplayScrollYRef = useRef(0);
  const originReturnTimerRef = useRef<number | null>(null);
  const bridgeTimersRef = useRef<number[]>([]);

  const [showMusicHint, setShowMusicHint] = useState(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isCaseFileLightboxOpen, setIsCaseFileLightboxOpen] = useState(false);
  const [isBaadMeLightboxOpen, setIsBaadMeLightboxOpen] = useState(false);
  const [isKeepsakeModalOpen, setIsKeepsakeModalOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.isEnabled());
  const [isBirthdayTruce, setIsBirthdayTruce] = useState(false);
  const [friendOverride, setFriendOverride] = useState(true);
  const [isSparkleRainOn, setIsSparkleRainOn] = useState(true);
  // Session-only one-time footer summary card state (strictly false on every page load)
  const [showOneTimeSummary, setShowOneTimeSummary] = useState(false);
  const [summaryGiftData, setSummaryGiftData] = useState<OneTimeSummaryGiftData | null>(null);

  const clearBridgeTimers = useCallback(() => {
    bridgeTimersRef.current.forEach((id) => window.clearTimeout(id));
    bridgeTimersRef.current = [];
  }, []);

  const scheduleBridgeTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      bridgeTimersRef.current = bridgeTimersRef.current.filter((item) => item !== id);
      fn();
    }, delayMs);
    bridgeTimersRef.current.push(id);
    return id;
  }, []);

  const triggerBackgroundWarmup = useCallback(() => {
    if (cancelWarmupRef.current) return;
    cancelWarmupRef.current = startBackgroundWarmup({
      imageUrls: getDefaultPreloadImageUrls(import.meta.env.BASE_URL),
      chunkLoaders: BACKGROUND_SECTION_LOADERS,
      onUpgradeAudioPreload: () => {
        bgMusicPlayer.upgradePreloadToAuto();
      },
    });
  }, []);

  useEffect(() => {
    bgMusicPlayer.warmUp();
    const unsubMusic = bgMusicPlayer.subscribe((snap) => {
      setIsPlaying(snap.isPlaying);
      setShowMusicHint(snap.showMusicHint);
    });
    const unsubscribeSfx = soundEngine.subscribe(setSfxEnabled);
    return () => {
      unsubMusic();
      unsubscribeSfx();
      cancelWarmupRef.current?.();
      cancelWarmupRef.current = null;
      clearBridgeTimers();
      if (originReturnTimerRef.current !== null) {
        window.clearTimeout(originReturnTimerRef.current);
        originReturnTimerRef.current = null;
      }
    };
  }, [clearBridgeTimers]);

  // Stage 2 preload is intentionally NOT fired at 0ms here so the Intro Video gets 100% of
  // startup bandwidth. Instead, `handleVideoSmoothPlayback` fires `startIntroPlaybackPreload()`
  // right after `<video>` confirms `playing` + 350ms breather (with a 1200ms safety fallback).

  // Stage 3 -> Stage 4 true silent background loading + pre-painting while Origin Story is ongoing:
  // 1. Trigger staggered Tier 1 (350ms) & Tier 2 (180ms idle slices) preload immediately on Stage 3 mount
  // 2. Begin pre-mounting & pre-painting the Main Page behind Stage 3 after a 450ms Scene 1 breather
  useEffect(() => {
    if (!showOriginStory) return;

    const cancelStoryPreload = preloadMainPageDuringStory({
      imageUrls: getDefaultPreloadImageUrls(import.meta.env.BASE_URL),
      tier1ChunkLoaders: TIER1_MAIN_LOADERS,
      tier2ChunkLoaders: TIER2_MAIN_LOADERS,
      onUpgradeAudioPreload: () => {
        bgMusicPlayer.upgradePreloadToAuto();
      },
    });

    const preMountTimer = window.setTimeout(() => {
      setShouldPreMountMain(true);
    }, MAIN_PREMOUNT_BREATHER_MS);

    return () => {
      window.clearTimeout(preMountTimer);
      // Only cancel if still unmounted before reaching Stage 4; keeping preload running across transition is safe
      if (stageRef.current === 'intro') {
        cancelStoryPreload();
      }
    };
  }, [showOriginStory]);

  // Keep body scroll strictly locked during Stage 3 (including after TheatreIntroOverlay unmounts),
  // and guarantee clean scroll unlock when Stage 4 activates.
  useEffect(() => {
    if (showOriginStory) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
    if (!showIntro) {
      document.body.style.overflow = '';
    }
  }, [showOriginStory, showIntro]);

  // If the intro is bypassed (?autostart=1) or skipped before smooth playback fired,
  // kick off the staggered background warmup after a 300ms breathing gap.
  useEffect(() => {
    if (!siteRevealed) return;
    setShouldPreMountMain(true);
    const timer = window.setTimeout(() => {
      triggerBackgroundWarmup();
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [siteRevealed, triggerBackgroundWarmup]);

  const handleVideoSmoothPlayback = useCallback(() => {
    startIntroPlaybackPreload({
      loadOriginStoryChunk: loadOriginStoryPlay,
      imageUrls: getDefaultPreloadImageUrls(import.meta.env.BASE_URL),
      wave3ChunkLoaders: WAVE3_MAIN_PAGE_LOADERS,
      onUpgradeAudioPreload: () => {
        bgMusicPlayer.upgradePreloadToAuto();
      },
    });
  }, []);

  // Idempotent safety backup at currentTime > 1.0s (no-op if smooth playback already kicked off Waves 1-3)
  const handleVideoPastOneSecond = useCallback(() => {
    handleVideoSmoothPlayback();
  }, [handleVideoSmoothPlayback]);

  const handleToggleSfx = useCallback(() => {
    haptics.tap();
    soundEngine.toggle();
    emitModinoEvent('interaction_hype', { source: 'sfx-toggle' });
  }, []);

  const handleToggleMusic = useCallback(() => {
    haptics.tap();
    soundEngine.playBubbleClick(isPlaying ? 0.92 : 1.08);
    emitModinoEvent(isPlaying ? 'interaction_hype' : 'cute', { source: 'music-toggle' });
    trackEvent('music_toggled', isPlaying ? 'Pause Music Button' : 'Play Music Button', {
      action: isPlaying ? 'pause' : 'play',
    });
    if (isPlaying) {
      // Fade smoothly to 0 over 0.45s, pause, and set userPaused = true
      bgMusicPlayer.pauseManual();
    } else {
      // If user taps Play Music early while hidden intro video audio is still fading (15.6s-21.0s),
      // immediately ramp hidden intro video down to 0 over 0.4s and unmount cleanly
      theatreOverlayRef.current?.fadeOutForMusicTakeover();
      void bgMusicPlayer.playManual();
    }
  }, [isPlaying]);

  const handleBurstConfetti = useCallback((originX?: number, originY?: number) => {
    confettiRef.current?.pop(originX, originY, 56);
  }, []);

  const handleCelebrationBurst = useCallback(() => {
    confettiRef.current?.fireCannons();
  }, []);

  const handleHeroPopConfetti = useCallback((originX?: number, originY?: number) => {
    confettiRef.current?.popWithCannons(originX, originY);
  }, []);

  const handleFirstVaultClaimUnlock = useCallback((summary: OneTimeSummaryGiftData) => {
    setSummaryGiftData(summary);
    setShowOneTimeSummary(true);
  }, []);

  const handleVaultReset = useCallback(() => {
    setShowOneTimeSummary(false);
    setSummaryGiftData(null);
  }, []);

  const handleVaultCodeUpdated = useCallback((newCode: string) => {
    setSummaryGiftData((prev) => (prev ? { ...prev, code: newCode } : prev));
  }, []);

  const handleHeaderEasterEgg = useCallback((originX: number, originY: number) => {
    confettiRef.current?.pop(originX, originY, 34);
    emitModinoEvent('friends_and_banter', { force: true, source: 'header-easter-egg' });
  }, []);

  const handleOpenKeepsakeModal = useCallback(() => {
    playUiSfx('tap');
    emitModinoEvent('cute', { force: true, source: 'keepsake-modal' });
    setIsKeepsakeModalOpen(true);
  }, []);

  const handleCloseKeepsakeModal = useCallback(() => {
    setIsKeepsakeModalOpen(false);
  }, []);

  // Entering Stage 3 (Origin Story Play) the moment Intro Video begins collapsing its curtain:
  // Mount OriginStoryPlay (z-9500) right behind the collapsing curtain (z-9999) for zero flash,
  // keep Milky strictly paused (volume = 0), and let 100% of any leftover unmuted Stage 2 intro
  // video audio fade progressively to 0 right until the video's natural end.
  const handleBeginMainReveal = useCallback(
    (opts: { audioUnlocked: boolean; willContinueVideoAudio: boolean }) => {
      bgMusicPlayer.resetForReplayIntro(80);
      if (opts.willContinueVideoAudio) {
        theatreOverlayRef.current?.startStage3TrailingAudioFade();
      } else {
        theatreOverlayRef.current?.interruptTrailingAudio(STAGE3_AUDIO_INTERRUPT_FADE_MS);
      }
      if (enteredOriginForRunRef.current) return;
      enteredOriginForRunRef.current = true;
      originStoryModeRef.current = 'pipeline';
      originExitHandledRef.current = false;
      stageRef.current = 'origin_story';
      setStage('origin_story');
      setOriginStoryRunId((n) => n + 1);
      setShowOriginStory(true);
      try {
        trackEvent('origin_story_started', 'Origin Story Play');
      } catch {
        // silent analytics fallback
      }
    },
    [],
  );

  // Only fire reveal cannons when Stage 4 is active (Stage 3 owns the screen during intro exit)
  const handleFireRevealConfetti = useCallback(() => {
    if (stageRef.current === 'main') {
      confettiRef.current?.fireCannons();
    }
  }, []);

  // Visual curtains have collapsed — do NOT kill or unmount TheatreIntroOverlay here if its
  // Stage 3 full-tail trailing audio fade is running; onFinishUnmount will unmount it cleanly
  // as soon as the video reaches its natural end or an interrupt fires.
  const handleVisualExitDone = useCallback(() => {
    if (!enteredOriginForRunRef.current) {
      enteredOriginForRunRef.current = true;
      originStoryModeRef.current = 'pipeline';
      originExitHandledRef.current = false;
      stageRef.current = 'origin_story';
      setStage('origin_story');
      setOriginStoryRunId((n) => n + 1);
      setShowOriginStory(true);
      try {
        trackEvent('origin_story_started', 'Origin Story Play');
      } catch {
        // silent analytics fallback
      }
    }
  }, []);

  // Guarded so Milky - Just The Way You Are NEVER starts during Stage 2 or Stage 3
  const handleIntroAudioFinished = useCallback((fadeMs = BG_MUSIC_AUTOPLAY_FADE_MS) => {
    if (stageRef.current !== 'main') return;
    void bgMusicPlayer.autoplayAfterIntro(fadeMs).then((started) => {
      if (started) {
        trackEvent('music_autoplay_started', 'Background Music Autoplay');
      }
    });
  }, []);

  const handleFinishIntroUnmount = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleInterruptIntroAudio = useCallback(() => {
    theatreOverlayRef.current?.interruptTrailingAudio(STAGE3_AUDIO_INTERRUPT_FADE_MS);
  }, []);

  const finishOriginStory = useCallback(
    (outcome: { kind: 'completed' } | { kind: 'skipped'; skippedAtMs: number }) => {
      if (originExitHandledRef.current) return;
      originExitHandledRef.current = true;
      clearBridgeTimers();

      // Immediately fast-fade (180ms) & stop any lingering Stage 2 intro audio before Stage 4 / Milky opens
      theatreOverlayRef.current?.interruptTrailingAudio(STAGE3_AUDIO_INTERRUPT_FADE_MS);

      const mode = originStoryModeRef.current;

      try {
        if (outcome.kind === 'completed') {
          trackEvent('origin_story_completed', 'Origin Story Play', { durationMs: 36500 });
        } else {
          trackEvent('origin_story_skipped', 'Origin Story Play', {
            skippedAtMs: Math.round(outcome.skippedAtMs),
          });
        }
      } catch {
        // silent analytics fallback
      }

      // Replay Origin Story return: snappy 350ms smooth warm crossfade back to saved scroll position
      // without re-running initial welcome confetti or Modino's first-time greeting.
      if (mode === 'replay') {
        setBridgeTransition({ mode: 'replay', phase: 'gather' });

        scheduleBridgeTimer(() => {
          stageRef.current = 'main';
          setShowOriginStory(false);
          setStage('main');
          setSiteRevealed(true);
          setVisualExitDone(true);
          setHasReachedMainStage(true);
          setBridgeTransition({ mode: 'replay', phase: 'parting' });

          try {
            window.scrollTo({ top: savedReplayScrollYRef.current, behavior: 'instant' });
          } catch {
            // silent
          }

          if (wasMusicPlayingBeforeReplayRef.current) {
            wasMusicPlayingBeforeReplayRef.current = false;
            try {
              void bgMusicPlayer.playManual(600);
            } catch {
              // silent
            }
          }
        }, STAGE3_TO_MAIN_TIMING.replayCrossfadeSwapMs);

        scheduleBridgeTimer(() => {
          setBridgeTransition(null);
          setCurtainCompletedAtMs((prev) => prev ?? Date.now());
        }, STAGE3_TO_MAIN_TIMING.replayCrossfadeTotalMs);
        return;
      }

      // Pipeline Mode (Initial Watch): 1850ms 3-Beat Rose-Cream & Champagne-Gold Silk Curtain Reveal
      try {
        haptics.celebrate();
      } catch {
        // silent haptic fallback
      }

      setShouldPreMountMain(true);
      const reducedMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion) {
        setBridgeTransition({ mode: 'reduced', phase: 'gather' });

        scheduleBridgeTimer(() => {
          stageRef.current = 'main';
          setShowOriginStory(false);
          setStage('main');
          setSiteRevealed(true);
          setHasReachedMainStage(true);
          try {
            window.scrollTo(0, 0);
          } catch {
            // silent
          }
          setBridgeTransition({ mode: 'reduced', phase: 'parting' });

          try {
            void bgMusicPlayer
              .autoplayAfterIntro(STAGE3_TO_MAIN_TIMING.musicFadeInMs)
              .then((started) => {
                if (started) {
                  try {
                    trackEvent('music_autoplay_started', 'Background Music Autoplay');
                  } catch {
                    // silent
                  }
                }
              });
          } catch {
            // silent
          }
        }, STAGE3_TO_MAIN_TIMING.reducedMotionSwapMs);

        scheduleBridgeTimer(() => {
          setVisualExitDone(true);
          setBridgeTransition(null);
          setCurtainCompletedAtMs(Date.now());
        }, STAGE3_TO_MAIN_TIMING.reducedMotionTotalMs);
        return;
      }

      // Beat 1 (0ms -> 380ms): Warm Luminescent Veil gathers while OriginStoryPlay gently zooms forward
      setBridgeTransition({ mode: 'curtain', phase: 'gather' });

      // +280ms: Milky - Just The Way You Are starts smoothly (0 -> targetVolume over 750ms)
      scheduleBridgeTimer(() => {
        try {
          void bgMusicPlayer
            .autoplayAfterIntro(STAGE3_TO_MAIN_TIMING.musicFadeInMs)
            .then((started) => {
              if (started) {
                try {
                  trackEvent('music_autoplay_started', 'Background Music Autoplay');
                } catch {
                  // silent
                }
              }
            });
        } catch {
          // autoplay safety fallback
        }
      }, STAGE3_TO_MAIN_TIMING.musicStartMs);

      // +360ms: Unmount OriginStoryPlay, scroll cleanly to top: 0, activate pre-painted Main Page behind veil
      scheduleBridgeTimer(() => {
        stageRef.current = 'main';
        setShowOriginStory(false);
        setStage('main');
        setSiteRevealed(true);
        setVisualExitDone(false);
        setHasReachedMainStage(true);
        try {
          window.scrollTo(0, 0);
        } catch {
          // silent
        }
      }, STAGE3_TO_MAIN_TIMING.stageSwapMs);

      // Beat 2 (+380ms -> +1780ms): Dual feathered Rose-Cream & Champagne-Gold Silk Curtains glide apart
      scheduleBridgeTimer(() => {
        setBridgeTransition({ mode: 'curtain', phase: 'parting' });
      }, STAGE3_TO_MAIN_TIMING.curtainPartStartMs);

      // +950ms: Main Page Welcome Confetti cannons fire cleanly as curtains clear center Hero
      scheduleBridgeTimer(() => {
        confettiRef.current?.fireCannons();
      }, STAGE3_TO_MAIN_TIMING.confettiBurstMs);

      // Beat 3 (+1850ms): Curtain overlay unmounts cleanly from DOM; Hero settle transform clears & Modino 2.0s post-curtain countdown starts
      scheduleBridgeTimer(() => {
        setVisualExitDone(true);
        setBridgeTransition(null);
        setCurtainCompletedAtMs(Date.now());
      }, STAGE3_TO_MAIN_TIMING.totalDurationMs);
    },
    [clearBridgeTimers, scheduleBridgeTimer],
  );

  const handleOriginStoryComplete = useCallback(() => {
    finishOriginStory({ kind: 'completed' });
  }, [finishOriginStory]);

  const handleOriginStorySkip = useCallback(
    (skippedAtMs: number) => {
      finishOriginStory({ kind: 'skipped', skippedAtMs });
    },
    [finishOriginStory],
  );

  const handleReplayOriginStory = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    unlockKissAudioContext();
    try {
      trackEvent('origin_story_replayed', 'Origin Story Play');
    } catch {
      // silent
    }

    // Never allow any trailing Stage 2 intro audio during a later Replay Origin Story
    theatreOverlayRef.current?.interruptTrailingAudio(STAGE3_AUDIO_INTERRUPT_FADE_MS);

    try {
      savedReplayScrollYRef.current = window.scrollY || 0;
    } catch {
      savedReplayScrollYRef.current = 0;
    }

    const snap = bgMusicPlayer.getSnapshot();
    wasMusicPlayingBeforeReplayRef.current = Boolean(snap.isPlaying);
    if (snap.isPlaying) {
      bgMusicPlayer.pauseManual(250);
    }

    originStoryModeRef.current = 'replay';
    originExitHandledRef.current = false;
    stageRef.current = 'origin_story';
    setStage('origin_story');
    setOriginStoryRunId((n) => n + 1);
    setShowOriginStory(true);
  }, []);

  const handleReplayIntro = useCallback(() => {
    haptics.tap();
    soundEngine.playBubbleClick(1.06);
    trackEvent('intro_replayed', 'Replay Intro Button');
    clearBridgeTimers();
    setBridgeTransition(null);
    // Smoothly fade local MP3 down to 0 (0.4s), pause, reset currentTime = 0 & button state
    bgMusicPlayer.resetForReplayIntro();
    window.scrollTo({ top: 0, behavior: 'instant' });
    enteredOriginForRunRef.current = false;
    originExitHandledRef.current = false;
    stageRef.current = 'intro';
    setStage('intro');
    setShowOriginStory(false);
    setSiteRevealed(false);
    setVisualExitDone(false);
    setCurtainCompletedAtMs(null);
    setIntroRunId((n) => n + 1);
    setShowIntro(true);
  }, [clearBridgeTimers]);

  const handleSetBirthdayTruce = useCallback(
    (next: boolean) => {
      if (isBirthdayTruce === next) return;
      haptics.modeSwitch();
      soundEngine.playModeChime(next);
      playUiSfx('toggle_click');
      emitModinoEvent('friends_and_banter', { source: 'note-deck-mode' });
      trackEvent(
        'note_mode_switched',
        next ? 'Birthday Truce Mode' : 'No Filter Mode',
        { mode: next ? 'Birthday Truce' : 'No Filter' },
      );
      // No Filter = 0.40, Birthday Truce = 0.50 (1.0s smooth GainNode transition)
      bgMusicPlayer.setVibeMode(next);
      setIsBirthdayTruce(next);
    },
    [isBirthdayTruce],
  );

  const handleToggleBirthdayTruce = useCallback(() => {
    const next = !isBirthdayTruce;
    haptics.modeSwitch();
    soundEngine.playModeChime(next);
    playUiSfx('toggle_click');
    emitModinoEvent('friends_and_banter', { source: 'truce-toggle' });
    trackEvent(
      'note_mode_switched',
      next ? 'Birthday Truce Mode' : 'No Filter Mode',
      { mode: next ? 'Birthday Truce' : 'No Filter' },
    );
    bgMusicPlayer.setVibeMode(next);
    setIsBirthdayTruce(next);
  }, [isBirthdayTruce]);

  const handleToggleSparkleRain = useCallback(() => {
    const next = !isSparkleRainOn;
    haptics.sparkleToggle();
    playUiSfx('toggle_click');
    emitModinoEvent('interaction_hype', { source: 'sparkle-toggle' });
    if (next) {
      soundEngine.playSparkleTwinkle();
    } else {
      soundEngine.playBubbleClick(0.92);
    }
    trackEvent(
      'sparkle_rain_toggled',
      next ? 'Sparkle Rain On' : 'Sparkle Rain Off',
      { enabled: next },
    );
    setIsSparkleRainOn(next);
  }, [isSparkleRainOn]);

  const handleToggleFriendOverride = useCallback(() => {
    const next = !friendOverride;
    setFriendOverride(next);
    haptics.rankSlide();
    soundEngine.playPaperSlideTick(next);
    playUiSfx('toggle_click');
    emitModinoEvent('friends_and_banter', { source: 'friend-override' });
    if (next) {
      confettiRef.current?.pop(window.innerWidth * 0.65, window.innerHeight * 0.45, 52);
    }
  }, [friendOverride]);

  // Pause background floating sparkles & 1s ticking timers while Stage 2 (Intro visual) or Stage 3 (Origin Story) owns the screen
  const isIntroVisualActive = showIntro && stage === 'intro';
  const isMainStageActive = stage === 'main' && siteRevealed && !isIntroVisualActive && !showOriginStory;
  const pauseBackgroundWork = !isMainStageActive;
  const suppressSparkleRain =
    pauseBackgroundWork ||
    isPhotoLightboxOpen ||
    isCaseFileLightboxOpen ||
    isBaadMeLightboxOpen ||
    isKeepsakeModalOpen;

  return (
    <div
      data-stage={stage}
      className="relative z-0 min-h-screen overflow-x-clip bg-[#FFF8FB] text-[#3A1233]"
    >
      {showIntro && (
        <TheatreIntroOverlay
          ref={theatreOverlayRef}
          key={introRunId}
          onBeginMainReveal={handleBeginMainReveal}
          onFireRevealConfetti={handleFireRevealConfetti}
          onVisualExitDone={handleVisualExitDone}
          onIntroAudioFinished={handleIntroAudioFinished}
          onFinishUnmount={handleFinishIntroUnmount}
          onVideoSmoothPlayback={handleVideoSmoothPlayback}
          onVideoPastOneSecond={handleVideoPastOneSecond}
        />
      )}

      {showOriginStory && (
        <Suspense
          fallback={
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[9500] bg-[#FFF8FB]"
            />
          }
        >
          <OriginStoryPlay
            key={originStoryRunId}
            onComplete={handleOriginStoryComplete}
            onSkip={handleOriginStorySkip}
            onInterruptIntroAudio={handleInterruptIntroAudio}
          />
        </Suspense>
      )}

      {bridgeTransition && (
        <StageBridgeTransition
          mode={bridgeTransition.mode}
          phase={bridgeTransition.phase}
        />
      )}

      <SparkleRainCanvas enabled={isSparkleRainOn} suppressed={suppressSparkleRain} />
      <ConfettiCanvas ref={confettiRef} />

      <TopBar
        isPlaying={isPlaying}
        onToggleMusic={handleToggleMusic}
        sfxEnabled={sfxEnabled}
        onToggleSfx={handleToggleSfx}
        showMusicHint={showMusicHint}
        onHeaderEasterEgg={handleHeaderEasterEgg}
      />

      {/* Pre-mounted & pre-painted main birthday website quietly underneath Stage 3 (zero flash & zero layout stutter) */}
      <div
        data-testid="main-site-shell"
        data-revealed={String(siteRevealed)}
        data-premounted={String(shouldPreMountMain)}
        data-bg-paused={String(pauseBackgroundWork)}
        aria-hidden={!isMainStageActive || undefined}
        className={`${!isMainStageActive ? 'pointer-events-none' : ''} ${
          isMainStageActive && !visualExitDone
            ? 'stage-bridge-hero-settle will-change-[transform,opacity]'
            : 'opacity-100'
        }`}
      >
        {/* CRITICAL: Keep <main> free of content-visibility / contain / overflow:hidden so Backstory sticky stacking never breaks */}
        <main className="overflow-x-clip" style={{ paddingTop: 'calc(var(--header-h) + var(--safe-top))' }}>
          {/* Keep Main Page DOM pre-painting starting cleanly behind Stage 3 (after 450ms breather),
              never competing with Stage 2 Intro Video decoding — while benefiting from 100% pre-fetched
              JS chunks, GPU-decoded images, and buffered songs already warm in memory from Stage 2. */}
          {(shouldPreMountMain || stage === 'main') && (
            <>
          {/* 1. Hero Section (Pre-painted behind Stage 3 with already GPU-decoded portrait for instant zero-flash reveal) */}
          <HeroSection
            isBirthdayTruce={isBirthdayTruce}
            onPopConfetti={handleHeroPopConfetti}
            isSiteRevealed={isMainStageActive}
            onPhotoLightboxChange={setIsPhotoLightboxOpen}
          />

          {/* 2. Interactive Toggles & Control Bar */}
          <Suspense fallback={<SectionPlaceholder id="toggles" minHeight={720} />}>
            <InteractiveTogglesSection
              isBirthdayTruce={isBirthdayTruce}
              onToggleBirthdayTruce={handleToggleBirthdayTruce}
              onSetBirthdayTruce={handleSetBirthdayTruce}
              friendOverride={friendOverride}
              onToggleFriendOverride={handleToggleFriendOverride}
              sparkleRain={isSparkleRainOn}
              onToggleSparkleRain={handleToggleSparkleRain}
              onReplayOriginStory={handleReplayOriginStory}
            />
          </Suspense>

          {/* 3. December 2026 Calendar & Live Friendship Counter */}
          <Suspense fallback={<SectionPlaceholder id="calendar" minHeight={640} />}>
            <CalendarAndCounterSection
              onBirthdayDateTap={handleBurstConfetti}
              paused={pauseBackgroundWork}
            />
          </Suspense>

          {/* 4. Live "Time on Earth" Fun Stats Dashboard (Since 03 Dec 2009) */}
          <Suspense fallback={<SectionPlaceholder id="life-stats" minHeight={520} />}>
            <LifeStatsSection paused={pauseBackgroundWork} />
          </Suspense>

          {/* 5. Our Backstory Timeline ("From Classmates to #1 HG") */}
          <Suspense fallback={<SectionPlaceholder id="backstory" minHeight={980} />}>
            <BackstorySection isSiteRevealed={isMainStageActive} />
          </Suspense>

          {/* 6. Tappable Inside-Joke Cards ("The Morgan Starter Pack" — Icons/SVGs Only) */}
          <Suspense fallback={<SectionPlaceholder id="starter-pack" minHeight={560} />}>
            <StarterPackGrid />
          </Suspense>

          {/* 7. The Runaway "No" Button Card ("Official Best-Friend Agreement") */}
          <Suspense fallback={<SectionPlaceholder id="agreement" minHeight={480} />}>
            <RunawayAgreementSection onAcceptConfetti={handleCelebrationBurst} />
          </Suspense>

          {/* 8. Fake "Bauni-Meter" Height Scanner */}
          <Suspense fallback={<SectionPlaceholder id="bauni-meter" minHeight={520} />}>
            <BauniMeterSection />
          </Suspense>

          {/* 9. Official "Daughter Morgan" Adoption Certificate */}
          <Suspense fallback={<SectionPlaceholder id="adoption-certificate" minHeight={540} />}>
            <AdoptionCertificateSection onStampConfetti={handleBurstConfetti} />
          </Suspense>

          {/* 10. Case File #0721 — Animated Pastel Evidence Folder (First-Text Receipt) */}
          <Suspense fallback={<SectionPlaceholder id="case-file" minHeight={560} />}>
            <CaseFileSection onLightboxChange={setIsCaseFileLightboxOpen} />
          </Suspense>

          {/* 10B. The "Baad Me" Mystery Reveal Card (Companion Instagram Receipt Exhibit) */}
          <Suspense fallback={null}>
            <BaadMeRevealSection onLightboxChange={setIsBaadMeLightboxOpen} />
          </Suspense>

          {/* 11. Finger Scratch-Off Coupons Section ("Morgan's Birthday Scratch Cards") */}
          <Suspense fallback={<SectionPlaceholder id="scratch-coupons" minHeight={600} />}>
            <ScratchCouponsSection onCardRevealConfetti={handleBurstConfetti} />
          </Suspense>

          {/* 12. The Infinity Gift Vault (6 Avengers Infinity Stones + ₹250 Reveal) */}
          <Suspense fallback={<SectionPlaceholder id="infinity-vault" minHeight={680} />}>
            <InfinityVaultSection
              onRevealConfetti={handleBurstConfetti}
              onFirstClaimUnlock={handleFirstVaultClaimUnlock}
              onVaultReset={handleVaultReset}
              onCodeUpdated={handleVaultCodeUpdated}
              showFooterSummaryJump={showOneTimeSummary}
              onOpenKeepsakeModal={handleOpenKeepsakeModal}
            />
          </Suspense>

          {/* 13. Rigged "Spin the Wheel for Your Birthday Gift" Section */}
          <Suspense fallback={<SectionPlaceholder id="spin-wheel" minHeight={640} />}>
            <SpinWheelSection />
          </Suspense>

          {/* 14. "Tap to Reveal" Surprise Gift Section ("GAWAAR") */}
          <Suspense fallback={<SectionPlaceholder id="gift" minHeight={540} />}>
            <SurpriseGiftSection onRevealConfetti={handleCelebrationBurst} />
          </Suspense>

          {/* 15. Interactive "Make a Wish" Cake Footer */}
          <Suspense fallback={<SectionPlaceholder id="make-a-wish" minHeight={560} />}>
            <MakeAWishCake onBlowOutConfetti={handleCelebrationBurst} />
          </Suspense>
            </>
          )}
        </main>

        <div className="relative z-[2] border-t border-[#F2C6D8] bg-transparent pt-8 pb-2">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div className="flex items-center justify-center gap-2 text-sm text-[#6B3B64] sm:justify-start">
              <SparkleStarSvg className="h-4 w-4 shrink-0 text-[#D94B7D]" />
              <span className="font-display italic text-[#3A1233]">
                Made for {ANAMIKA.fullName} (aka {ANAMIKA.nickname}) &middot; Turning {ANAMIKA.age} on{' '}
                {ANAMIKA.birthdayLabel}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                data-testid="replay-intro-btn"
                onClick={handleReplayIntro}
                className="text-xs font-semibold text-[#6B3B64] transition-colors hover:text-[#3A1233] hover:underline underline-offset-4 cursor-pointer"
              >
                Replay Intro 🎬
              </button>
              <span aria-hidden="true" className="text-[#E3B8CC]">
                &middot;
              </span>
              <a
                href="#top"
                onClick={() => {
                  trackEvent('back_to_top_clicked', 'Back to Top Link');
                  emitModinoEvent('interaction_hype', { source: 'back-to-top' });
                }}
                className="text-xs font-semibold text-[#D94B7D] transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
              >
                Back to top
              </a>
            </div>
          </div>

          {/* One-Time Screenshot-Ready Birthday Summary Card (renders strictly once on first Vault unlock, directly above The Little Coop & Closing Sign-Off Footer) */}
          {showOneTimeSummary && summaryGiftData && (
            <Suspense fallback={<SectionPlaceholder id="birthday-summary-card" minHeight={360} />}>
              <BirthdaySummaryCard
                data={summaryGiftData}
                onOpenKeepsakeModal={handleOpenKeepsakeModal}
              />
            </Suspense>
          )}
        </div>

        {(shouldPreMountMain || stage === 'main') && (
          <>
            {/* Interactive Digitapli-inspired Tapli Arena Mini-Game (directly above Mini Chicken Farm) */}
            <Suspense fallback={null}>
              <TapliArenaSection />
            </Suspense>

            {/* Bonus Canon Lore Mini Pastel Chicken Farm Comic Card */}
            <Suspense fallback={<SectionPlaceholder id="little-coop" minHeight={360} />}>
              <ChickenFarmSection isSiteRevealed={isMainStageActive} />
            </Suspense>

            {/* Wax-Sealed Time Capsule for 18 Year Old Anamika (03 Dec 2027) */}
            <Suspense fallback={null}>
              <TimeCapsuleSection />
            </Suspense>

            {/* Final Pastel Stationery Review & Postcard Card (directly above Closing Sign-Off Footer) */}
            <Suspense fallback={null}>
              <DeveloperReviewSection />
            </Suspense>

            <Suspense fallback={<SectionPlaceholder id="closing-signoff" minHeight={260} />}>
              <ClosingSignOffFooter isSiteRevealed={isMainStageActive} />
            </Suspense>
          </>
        )}
      </div>

      <FloatingConfettiButton onPop={handleBurstConfetti} />

      {(shouldPreMountMain || hasReachedMainStage) && (
        <Suspense fallback={null}>
          <ModinoPet
            isSiteRevealed={isMainStageActive}
            isCurtainComplete={visualExitDone && bridgeTransition === null}
            curtainCompletedAtMs={curtainCompletedAtMs}
            entranceDelayMs={STAGE3_TO_MAIN_TIMING.modinoDelayAfterCurtainMs}
            isBlockedByOverlay={
              isIntroVisualActive ||
              showOriginStory ||
              bridgeTransition !== null ||
              isPhotoLightboxOpen ||
              isCaseFileLightboxOpen ||
              isBaadMeLightboxOpen ||
              isKeepsakeModalOpen
            }
          />
        </Suspense>
      )}

      {isKeepsakeModalOpen && (
        <Suspense fallback={null}>
          <KeepsakePreviewModal onClose={handleCloseKeepsakeModal} />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  const [showOwnerDashboard, setShowOwnerDashboard] = useState<boolean>(
    () => typeof window !== 'undefined' && isInsightsQuery(window.location.search),
  );
  const [isMidnightLocked, setIsMidnightLocked] = useState<boolean>(() =>
    shouldShowMidnightLock(Date.now()),
  );

  useEffect(() => {
    if (showOwnerDashboard) {
      try {
        bgMusicPlayer.pauseManual();
      } catch {
        // silent
      }
      return;
    }
    initAnalytics({ isMidnightLocked });
  }, [showOwnerDashboard, isMidnightLocked]);

  const handleCloseOwnerDashboard = useCallback(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('insights');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // silent
    }
    setShowOwnerDashboard(false);
  }, []);

  // Synchronously unlock the Scene 5 Web AudioContext on the very first user tap/key anywhere
  // so mobile Chrome/Safari/in-app browsers pre-decode & start Scene 5 audio in < 5ms.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFirstGesture = () => {
      unlockKissAudioContext();
    };
    window.addEventListener('pointerdown', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const handleMidnightUnlock = useCallback(() => {
    unlockKissAudioContext();
    bgMusicPlayer.warmUp();
    setIsMidnightLocked(false);
  }, []);

  if (showOwnerDashboard) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#120A16]" />}>
        <OwnerAnalyticsDashboard onClose={handleCloseOwnerDashboard} />
      </Suspense>
    );
  }

  if (isMidnightLocked) {
    return <MidnightLockOverlay onUnlock={handleMidnightUnlock} />;
  }

  return <BirthdayWebsiteShell />;
}
