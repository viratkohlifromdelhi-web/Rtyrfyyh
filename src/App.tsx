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
  getDefaultPreloadImageUrls,
  preloadOriginStoryStageAssets,
  startBackgroundWarmup,
} from './utils/preloader';
import {
  BACKGROUND_SECTION_LOADERS,
  loadAdoptionCertificateSection,
  loadBackstorySection,
  loadBauniMeterSection,
  loadBirthdaySummaryCard,
  loadCalendarAndCounterSection,
  loadCaseFileSection,
  loadChickenFarmSection,
  loadClosingSignOffFooter,
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
} from './utils/sectionLoaders';
import { emitModinoEvent } from './utils/modinoBus';
import { playUiSfx } from './utils/uiSoundEngine';
import { soundEngine } from './utils/soundEngine';
import { BG_MUSIC_AUTOPLAY_FADE_MS } from './utils/theatrePhysics';

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
const ChickenFarmSection = lazy(() =>
  loadChickenFarmSection().then((m) => ({ default: m.ChickenFarmSection })),
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
  const [hasReachedMainStage, setHasReachedMainStage] = useState<boolean>(
    () => initialBypassIntro,
  );
  const enteredOriginForRunRef = useRef(false);
  const originExitHandledRef = useRef(false);
  const originStoryModeRef = useRef<'pipeline' | 'replay'>('pipeline');
  const wasMusicPlayingBeforeReplayRef = useRef(false);

  const [showMusicHint, setShowMusicHint] = useState(false);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [isCaseFileLightboxOpen, setIsCaseFileLightboxOpen] = useState(false);
  const [isKeepsakeModalOpen, setIsKeepsakeModalOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.isEnabled());
  const [isBirthdayTruce, setIsBirthdayTruce] = useState(false);
  const [friendOverride, setFriendOverride] = useState(true);
  const [isSparkleRainOn, setIsSparkleRainOn] = useState(true);
  // Session-only one-time footer summary card state (strictly false on every page load)
  const [showOneTimeSummary, setShowOneTimeSummary] = useState(false);
  const [summaryGiftData, setSummaryGiftData] = useState<OneTimeSummaryGiftData | null>(null);

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
    };
  }, []);

  // Stage 2 -> Stage 3 silent preload while Opening Curtain / Intro Video plays
  useEffect(() => {
    if (!showIntro) return;
    const cancelOriginPreload = preloadOriginStoryStageAssets({
      loadOriginStoryChunk: loadOriginStoryPlay,
    });
    return () => {
      cancelOriginPreload();
    };
  }, [showIntro]);

  // Stage 3 -> Stage 4 preload: trigger main-page lazy chunks + hero image decode the moment OriginStoryPlay mounts
  useEffect(() => {
    if (!showOriginStory) return;
    triggerBackgroundWarmup();
  }, [showOriginStory, triggerBackgroundWarmup]);

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
    const timer = window.setTimeout(() => {
      triggerBackgroundWarmup();
    }, 300);
    return () => {
      window.clearTimeout(timer);
    };
  }, [siteRevealed, triggerBackgroundWarmup]);

  const handleVideoSmoothPlayback = useCallback(() => {
    preloadOriginStoryStageAssets({
      loadOriginStoryChunk: loadOriginStoryPlay,
    });
  }, []);

  const handleVideoPastOneSecond = useCallback(() => {
    bgMusicPlayer.upgradePreloadToAuto();
  }, []);

  const handleToggleSfx = useCallback(() => {
    haptics.tap();
    soundEngine.toggle();
  }, []);

  const handleToggleMusic = useCallback(() => {
    haptics.tap();
    soundEngine.playBubbleClick(isPlaying ? 0.92 : 1.08);
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
  // immediately fade out any intro video audio, and keep Milky strictly paused (volume = 0).
  const handleBeginMainReveal = useCallback(
    (_opts: { audioUnlocked: boolean; willContinueVideoAudio: boolean }) => {
      theatreOverlayRef.current?.fadeOutForMusicTakeover();
      bgMusicPlayer.resetForReplayIntro(80);
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

  // Once Intro visual exit finishes, cleanly unmount TheatreIntroOverlay so zero hidden video audio lingers
  const handleVisualExitDone = useCallback(() => {
    theatreOverlayRef.current?.fadeOutForMusicTakeover();
    setShowIntro(false);
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

  const finishOriginStory = useCallback(
    (outcome: { kind: 'completed' } | { kind: 'skipped'; skippedAtMs: number }) => {
      if (originExitHandledRef.current) return;
      originExitHandledRef.current = true;

      const mode = originStoryModeRef.current;
      stageRef.current = 'main';
      setShowOriginStory(false);
      setStage('main');
      setSiteRevealed(true);
      setVisualExitDone(true);
      setHasReachedMainStage(true);

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

      if (mode === 'pipeline') {
        try {
          window.scrollTo(0, 0);
        } catch {
          // silent
        }
        confettiRef.current?.fireCannons();
        try {
          void bgMusicPlayer.autoplayAfterIntro(600).then((started) => {
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
      } else if (wasMusicPlayingBeforeReplayRef.current) {
        wasMusicPlayingBeforeReplayRef.current = false;
        try {
          void bgMusicPlayer.playManual(600);
        } catch {
          // silent
        }
      }
    },
    [],
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
      haptics.vibrateSafe(12);
    } catch {
      // silent
    }
    try {
      trackEvent('origin_story_replayed', 'Origin Story Play');
    } catch {
      // silent
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
    setIntroRunId((n) => n + 1);
    setShowIntro(true);
  }, []);

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

  // Pause background floating sparkles & 1s ticking timers while Stage 2 (Intro) or Stage 3 (Origin Story) owns the screen
  const isMainStageActive = stage === 'main' && siteRevealed && !showIntro && !showOriginStory;
  const pauseBackgroundWork = !isMainStageActive;
  const suppressSparkleRain =
    pauseBackgroundWork ||
    isPhotoLightboxOpen ||
    isCaseFileLightboxOpen ||
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
          />
        </Suspense>
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

      {/* Pre-rendered main birthday website quietly underneath (zero flash & zero layout stutter when Stage 3 exits) */}
      <div
        data-testid="main-site-shell"
        data-revealed={String(siteRevealed)}
        data-bg-paused={String(pauseBackgroundWork)}
        aria-hidden={!isMainStageActive || undefined}
        className={`transition-[transform,opacity] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          !isMainStageActive ? 'pointer-events-none' : ''
        } ${
          visualExitDone && siteRevealed
            ? 'opacity-100'
            : siteRevealed
              ? 'scale-100 opacity-100 will-change-[transform,opacity]'
              : 'scale-[0.97] opacity-90 will-change-[transform,opacity]'
        }`}
      >
        {/* CRITICAL: Keep <main> free of content-visibility / contain / overflow:hidden so Backstory sticky stacking never breaks */}
        <main className="overflow-x-clip pt-14">
          {/* 1. Hero Section (Eager-loaded behind curtain for zero-flash reveal) */}
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
            <BackstorySection isSiteRevealed={siteRevealed} />
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
                onClick={() => trackEvent('back_to_top_clicked', 'Back to Top Link')}
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

        {/* Bonus Canon Lore Mini Pastel Chicken Farm Comic Card (directly above Closing Sign-Off Footer) */}
        <Suspense fallback={<SectionPlaceholder id="little-coop" minHeight={360} />}>
          <ChickenFarmSection isSiteRevealed={siteRevealed} />
        </Suspense>

        <Suspense fallback={<SectionPlaceholder id="closing-signoff" minHeight={260} />}>
          <ClosingSignOffFooter isSiteRevealed={siteRevealed} />
        </Suspense>
      </div>

      <FloatingConfettiButton onPop={handleBurstConfetti} />

      {hasReachedMainStage && (
        <Suspense fallback={null}>
          <ModinoPet
            isSiteRevealed={isMainStageActive}
            isBlockedByOverlay={
              showIntro ||
              showOriginStory ||
              isPhotoLightboxOpen ||
              isCaseFileLightboxOpen ||
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

  const handleMidnightUnlock = useCallback(() => {
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
