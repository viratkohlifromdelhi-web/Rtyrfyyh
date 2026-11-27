import { useCallback, useEffect, useRef, useState } from 'react';
import { AdoptionCertificateSection } from './components/AdoptionCertificateSection';
import { BackstorySection } from './components/BackstorySection';
import { BauniMeterSection } from './components/BauniMeterSection';
import { BirthdaySummaryCard } from './components/BirthdaySummaryCard';
import { CalendarAndCounterSection } from './components/CalendarAndCounterSection';
import { CaseFileSection } from './components/CaseFileSection';
import { ConfettiCanvas, type ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { SparkleStarSvg } from './components/DoodleSvgs';
import { FloatingConfettiButton } from './components/FloatingConfettiButton';
import { HeroSection } from './components/HeroSection';
import { InfinityVaultSection } from './components/InfinityVaultSection';
import { InteractiveTogglesSection } from './components/InteractiveTogglesSection';
import { LifeStatsSection } from './components/LifeStatsSection';
import { MakeAWishCake } from './components/MakeAWishCake';
import { MidnightLockOverlay } from './components/MidnightLockOverlay';
import { OwnerAnalyticsDashboard } from './components/OwnerAnalyticsDashboard';
import { RunawayAgreementSection } from './components/RunawayAgreementSection';
import { ScratchCouponsSection } from './components/ScratchCouponsSection';
import { SparkleRainCanvas } from './components/SparkleRainCanvas';
import { SpinWheelSection } from './components/SpinWheelSection';
import { StarterPackGrid } from './components/StarterPackGrid';
import { SurpriseGiftSection } from './components/SurpriseGiftSection';
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
import { soundEngine } from './utils/soundEngine';
import { BG_MUSIC_AUTOPLAY_FADE_MS } from './utils/theatrePhysics';

function shouldSkipIntroFromQuery(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('autostart') === '1';
}

function BirthdayWebsiteShell() {
  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);
  const theatreOverlayRef = useRef<TheatreIntroOverlayHandle | null>(null);

  const [showIntro, setShowIntro] = useState<boolean>(() => !shouldSkipIntroFromQuery());
  const [introRunId, setIntroRunId] = useState(0);
  const [siteRevealed, setSiteRevealed] = useState<boolean>(() => shouldSkipIntroFromQuery());
  const [visualExitDone, setVisualExitDone] = useState<boolean>(() => shouldSkipIntroFromQuery());
  const [showMusicHint, setShowMusicHint] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.isEnabled());
  const [isBirthdayTruce, setIsBirthdayTruce] = useState(false);
  const [friendOverride, setFriendOverride] = useState(true);
  const [isSparkleRainOn, setIsSparkleRainOn] = useState(true);
  // Session-only one-time footer summary card state (strictly false on every page load)
  const [showOneTimeSummary, setShowOneTimeSummary] = useState(false);
  const [summaryGiftData, setSummaryGiftData] = useState<OneTimeSummaryGiftData | null>(null);

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
    };
  }, []);

  const handleToggleSfx = useCallback(() => {
    soundEngine.toggle();
  }, []);

  const handleToggleMusic = useCallback(() => {
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

  // Stage 3 Reveal at 15.35s: reveal main site underneath (scale 0.97 -> 1.0, opacity 0.9 -> 1.0 over 550ms)
  // Keep local MP3 strictly paused until intro video audio finishes fading to 0 and stops!
  const handleBeginMainReveal = useCallback(
    (_opts: { audioUnlocked: boolean; willContinueVideoAudio: boolean }) => {
      setSiteRevealed(true);
    },
    [],
  );

  // Fired at 15.60s right as window snaps shut
  const handleFireRevealConfetti = useCallback(() => {
    confettiRef.current?.fireCannons();
  }, []);

  // Fired at 15.90s once visual exit finishes (even if hidden video continues fading in audioOnly)
  const handleVisualExitDone = useCallback(() => {
    setVisualExitDone(true);
  }, []);

  // Strictly sequential handoff: fired the exact moment intro video audio finishes fading to 0 & stops
  // (21.0s natural, after 1.2s Skip Intro fade, or right after 15.9s muted snap-shut unmount)
  const handleIntroAudioFinished = useCallback((fadeMs = BG_MUSIC_AUTOPLAY_FADE_MS) => {
    void bgMusicPlayer.autoplayAfterIntro(fadeMs).then((started) => {
      if (started) {
        trackEvent('music_autoplay_started', 'Background Music Autoplay');
      }
    });
  }, []);

  const handleFinishIntroUnmount = useCallback(() => {
    setVisualExitDone(true);
    setShowIntro(false);
  }, []);

  const handleReplayIntro = useCallback(() => {
    soundEngine.playBubbleClick(1.06);
    trackEvent('intro_replayed', 'Replay Intro Button');
    // Smoothly fade local MP3 down to 0 (0.4s), pause, reset currentTime = 0 & button state
    bgMusicPlayer.resetForReplayIntro();
    window.scrollTo({ top: 0, behavior: 'instant' });
    setSiteRevealed(false);
    setVisualExitDone(false);
    setIntroRunId((n) => n + 1);
    setShowIntro(true);
  }, []);

  const handleSetBirthdayTruce = useCallback((next: boolean) => {
    setIsBirthdayTruce((prev) => {
      if (prev === next) return prev;
      soundEngine.playModeChime(next);
      haptics.modeSwitch();
      trackEvent(
        'note_mode_switched',
        next ? 'Birthday Truce Mode' : 'No Filter Mode',
        { mode: next ? 'Birthday Truce' : 'No Filter' },
      );
      // No Filter = 0.40, Birthday Truce = 0.50 (1.0s smooth GainNode transition)
      bgMusicPlayer.setVibeMode(next);
      return next;
    });
  }, []);

  const handleToggleBirthdayTruce = useCallback(() => {
    setIsBirthdayTruce((prev) => {
      const next = !prev;
      soundEngine.playModeChime(next);
      haptics.modeSwitch();
      trackEvent(
        'note_mode_switched',
        next ? 'Birthday Truce Mode' : 'No Filter Mode',
        { mode: next ? 'Birthday Truce' : 'No Filter' },
      );
      bgMusicPlayer.setVibeMode(next);
      return next;
    });
  }, []);

  const handleToggleSparkleRain = useCallback(() => {
    setIsSparkleRainOn((prev) => {
      const next = !prev;
      haptics.sparkleToggle();
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
      return next;
    });
  }, []);

  const handleToggleFriendOverride = useCallback(() => {
    const next = !friendOverride;
    setFriendOverride(next);
    haptics.rankSlide();
    soundEngine.playPaperSlideTick(next);
    if (next) {
      confettiRef.current?.pop(window.innerWidth * 0.65, window.innerHeight * 0.45, 52);
    }
  }, [friendOverride]);

  // Pause background floating sparkles & 1s ticking timers while intro visual stage owns the screen
  const pauseBackgroundWork = showIntro && !siteRevealed;

  return (
    <div className="relative z-0 min-h-screen overflow-x-hidden bg-[#FFF8FB] text-[#3A1233]">
      {showIntro && (
        <TheatreIntroOverlay
          ref={theatreOverlayRef}
          key={introRunId}
          onBeginMainReveal={handleBeginMainReveal}
          onFireRevealConfetti={handleFireRevealConfetti}
          onVisualExitDone={handleVisualExitDone}
          onIntroAudioFinished={handleIntroAudioFinished}
          onFinishUnmount={handleFinishIntroUnmount}
        />
      )}

      <SparkleRainCanvas enabled={isSparkleRainOn} suppressed={pauseBackgroundWork} />
      <ConfettiCanvas ref={confettiRef} />

      <TopBar
        isPlaying={isPlaying}
        onToggleMusic={handleToggleMusic}
        sfxEnabled={sfxEnabled}
        onToggleSfx={handleToggleSfx}
        showMusicHint={showMusicHint}
      />

      {/* Pre-rendered main birthday website quietly underneath (scale 0.97 -> 1.0, opacity 0.9 -> 1.0 over 550ms) */}
      <div
        data-testid="main-site-shell"
        data-revealed={String(siteRevealed)}
        data-bg-paused={String(pauseBackgroundWork)}
        className={`transition-[transform,opacity] duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visualExitDone && siteRevealed
            ? 'opacity-100'
            : siteRevealed
              ? 'scale-100 opacity-100 will-change-[transform,opacity]'
              : 'scale-[0.97] opacity-90 will-change-[transform,opacity]'
        }`}
      >
        <main className="overflow-x-hidden pt-14">
          {/* 1. Hero Section (Humorous Intro + The Only Photo Slot) */}
          <HeroSection
            isBirthdayTruce={isBirthdayTruce}
            onPopConfetti={handleHeroPopConfetti}
          />

          {/* 2. Interactive Toggles & Control Bar */}
          <InteractiveTogglesSection
            isBirthdayTruce={isBirthdayTruce}
            onToggleBirthdayTruce={handleToggleBirthdayTruce}
            onSetBirthdayTruce={handleSetBirthdayTruce}
            friendOverride={friendOverride}
            onToggleFriendOverride={handleToggleFriendOverride}
            sparkleRain={isSparkleRainOn}
            onToggleSparkleRain={handleToggleSparkleRain}
          />

          {/* 3. December 2026 Calendar & Live Friendship Counter */}
          <CalendarAndCounterSection
            onBirthdayDateTap={handleBurstConfetti}
            paused={pauseBackgroundWork}
          />

          {/* 4. Live "Time on Earth" Fun Stats Dashboard (Since 03 Dec 2009) */}
          <LifeStatsSection paused={pauseBackgroundWork} />

          {/* 5. Our Backstory Timeline ("From Classmates to #1 HG") */}
          <BackstorySection />

          {/* 6. Tappable Inside-Joke Cards ("The Morgan Starter Pack" — Icons/SVGs Only) */}
          <StarterPackGrid />

          {/* 7. The Runaway "No" Button Card ("Official Best-Friend Agreement") */}
          <RunawayAgreementSection onAcceptConfetti={handleCelebrationBurst} />

          {/* 8. Fake "Bauni-Meter" Height Scanner */}
          <BauniMeterSection />

          {/* 9. Official "Daughter Morgan" Adoption Certificate */}
          <AdoptionCertificateSection onStampConfetti={handleBurstConfetti} />

          {/* 10. Case File #0721 — Animated Pastel Evidence Folder (First-Text Receipt) */}
          <CaseFileSection />

          {/* 11. Finger Scratch-Off Coupons Section ("Morgan's Birthday Scratch Cards") */}
          <ScratchCouponsSection onCardRevealConfetti={handleBurstConfetti} />

          {/* 12. The Infinity Gift Vault (6 Avengers Infinity Stones + ₹250 Reveal) */}
          <InfinityVaultSection
            onRevealConfetti={handleBurstConfetti}
            onFirstClaimUnlock={handleFirstVaultClaimUnlock}
            onVaultReset={handleVaultReset}
            showFooterSummaryJump={showOneTimeSummary}
          />

          {/* 13. Rigged "Spin the Wheel for Your Birthday Gift" Section */}
          <SpinWheelSection />

          {/* 12. "Tap to Reveal" Surprise Gift Section ("GAWAAR") */}
          <SurpriseGiftSection onRevealConfetti={handleCelebrationBurst} />

          {/* 13. Interactive "Make a Wish" Cake Footer */}
          <MakeAWishCake onBlowOutConfetti={handleCelebrationBurst} />
        </main>

        <footer className="relative z-[2] border-t border-[#F2C6D8] bg-transparent py-8 pb-28 sm:pb-12">
          {/* One-Time Screenshot-Ready Birthday Summary Card (renders strictly once on first Vault unlock) */}
          {showOneTimeSummary && summaryGiftData && (
            <BirthdaySummaryCard data={summaryGiftData} />
          )}

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
        </footer>
      </div>

      <FloatingConfettiButton onPop={handleBurstConfetti} />
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
    return <OwnerAnalyticsDashboard onClose={handleCloseOwnerDashboard} />;
  }

  if (isMidnightLocked) {
    return <MidnightLockOverlay onUnlock={handleMidnightUnlock} />;
  }

  return <BirthdayWebsiteShell />;
}
