import { useCallback, useEffect, useRef, useState } from 'react';
import { AdoptionCertificateSection } from './components/AdoptionCertificateSection';
import { AmbientOverlay } from './components/AmbientOverlay';
import { BackstorySection } from './components/BackstorySection';
import { BauniMeterSection } from './components/BauniMeterSection';
import { CalendarAndCounterSection } from './components/CalendarAndCounterSection';
import { ConfettiCanvas, type ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { SparkleStarSvg } from './components/DoodleSvgs';
import { FloatingConfettiButton } from './components/FloatingConfettiButton';
import { HeroSection } from './components/HeroSection';
import { InteractiveTogglesSection } from './components/InteractiveTogglesSection';
import { LifeStatsSection } from './components/LifeStatsSection';
import { MakeAWishCake } from './components/MakeAWishCake';
import { RunawayAgreementSection } from './components/RunawayAgreementSection';
import { ScratchCouponsSection } from './components/ScratchCouponsSection';
import { SpinWheelSection } from './components/SpinWheelSection';
import { StarterPackGrid } from './components/StarterPackGrid';
import { SurpriseGiftSection } from './components/SurpriseGiftSection';
import { TopBar } from './components/TopBar';
import { ANAMIKA } from './data/celebrationData';
import { BirthdayMusicPlayer } from './utils/musicSynth';

export default function App() {
  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);
  const musicPlayerRef = useRef<BirthdayMusicPlayer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isWholesomeMode, setIsWholesomeMode] = useState(false);
  const [friendOverride, setFriendOverride] = useState(false);
  const [sparkleRain, setSparkleRain] = useState(true);

  useEffect(() => {
    musicPlayerRef.current = new BirthdayMusicPlayer();
    return () => {
      musicPlayerRef.current?.dispose();
      musicPlayerRef.current = null;
    };
  }, []);

  const handleToggleMusic = useCallback(() => {
    const player = musicPlayerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else {
      const started = player.start();
      setIsPlaying(started);
    }
  }, [isPlaying]);

  const handleBurstConfetti = useCallback((originX?: number, originY?: number) => {
    confettiRef.current?.pop(originX, originY, 64);
  }, []);

  const handleCelebrationBurst = useCallback((originX?: number, originY?: number) => {
    confettiRef.current?.pop(originX, originY, 68);
    window.setTimeout(() => {
      confettiRef.current?.pop(window.innerWidth * 0.28, window.innerHeight * 0.35, 28);
      confettiRef.current?.pop(window.innerWidth * 0.72, window.innerHeight * 0.35, 28);
    }, 120);
  }, []);

  const handleToggleFriendOverride = useCallback(() => {
    const next = !friendOverride;
    setFriendOverride(next);
    if (next) {
      confettiRef.current?.pop(window.innerWidth * 0.65, window.innerHeight * 0.45, 50);
    }
  }, [friendOverride]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FFFDF8] text-[#3B1535]">
      <AmbientOverlay enabled={sparkleRain} />
      <ConfettiCanvas ref={confettiRef} />

      <TopBar isPlaying={isPlaying} onToggleMusic={handleToggleMusic} />

      <main className="overflow-x-hidden pt-14">
        {/* 1. Hero Section (Humorous Intro + The Only Photo Slot) */}
        <HeroSection
          isWholesomeMode={isWholesomeMode}
          onPopConfetti={handleCelebrationBurst}
        />

        {/* 2. Interactive Toggles & Control Bar */}
        <InteractiveTogglesSection
          isWholesomeMode={isWholesomeMode}
          onToggleWholesome={() => setIsWholesomeMode((prev) => !prev)}
          friendOverride={friendOverride}
          onToggleFriendOverride={handleToggleFriendOverride}
          sparkleRain={sparkleRain}
          onToggleSparkleRain={() => setSparkleRain((prev) => !prev)}
        />

        {/* 3. December 2026 Calendar & Live Friendship Counter */}
        <CalendarAndCounterSection onBirthdayDateTap={handleBurstConfetti} />

        {/* 4. Live "Time on Earth" Fun Stats Dashboard (Since 03 Dec 2009) */}
        <LifeStatsSection />

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

        {/* 10. Finger Scratch-Off Coupons Section ("Morgan's Birthday Scratch Cards") */}
        <ScratchCouponsSection onCardRevealConfetti={handleBurstConfetti} />

        {/* 11. Rigged "Spin the Wheel for Your Birthday Gift" Section */}
        <SpinWheelSection />

        {/* 12. "Tap to Reveal" Surprise Gift Section ("GAWAAR") */}
        <SurpriseGiftSection onRevealConfetti={handleCelebrationBurst} />

        {/* 12. Interactive "Make a Wish" Cake Footer */}
        <MakeAWishCake onBlowOutConfetti={handleCelebrationBurst} />
      </main>

      <footer className="relative z-20 border-t border-[#ECD6EA] bg-[#FFFDF8] py-8 pb-24 sm:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#6B3B64]">
            <SparkleStarSvg className="h-4 w-4 text-[#E04D92]" />
            <span className="font-display italic text-[#3B1535]">
              Made for {ANAMIKA.fullName} (aka {ANAMIKA.nickname}) &middot; Turning {ANAMIKA.age} on{' '}
              {ANAMIKA.birthdayLabel}
            </span>
          </div>

          <a
            href="#top"
            className="text-xs font-semibold text-[#C2377E] transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
          >
            Back to top
          </a>
        </div>
      </footer>

      <FloatingConfettiButton onPop={handleBurstConfetti} />
    </div>
  );
}
