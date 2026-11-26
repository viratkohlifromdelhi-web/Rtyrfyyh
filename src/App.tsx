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
import { soundEngine } from './utils/soundEngine';

export default function App() {
  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);
  const musicPlayerRef = useRef<BirthdayMusicPlayer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => soundEngine.isEnabled());
  const [isWholesomeMode, setIsWholesomeMode] = useState(false);
  const [friendOverride, setFriendOverride] = useState(true);
  const [sparkleRain, setSparkleRain] = useState(true);

  useEffect(() => {
    musicPlayerRef.current = new BirthdayMusicPlayer();
    const unsubscribe = soundEngine.subscribe(setSfxEnabled);
    return () => {
      unsubscribe();
      musicPlayerRef.current?.dispose();
      musicPlayerRef.current = null;
    };
  }, []);

  const handleToggleSfx = useCallback(() => {
    soundEngine.toggle();
  }, []);

  const handleToggleMusic = useCallback(() => {
    const player = musicPlayerRef.current;
    if (!player) return;
    soundEngine.playBubbleClick(isPlaying ? 0.92 : 1.08);
    if (isPlaying) {
      player.stop();
      setIsPlaying(false);
    } else {
      const started = player.start();
      setIsPlaying(started);
    }
  }, [isPlaying]);

  const handleBurstConfetti = useCallback((originX?: number, originY?: number) => {
    confettiRef.current?.pop(originX, originY, 56);
  }, []);

  const handleCelebrationBurst = useCallback(() => {
    confettiRef.current?.fireCannons();
  }, []);

  const handleToggleWholesome = useCallback(() => {
    soundEngine.playBubbleClick(1.06);
    setIsWholesomeMode((prev) => !prev);
  }, []);

  const handleToggleSparkleRain = useCallback(() => {
    soundEngine.playBubbleClick(0.96);
    setSparkleRain((prev) => !prev);
  }, []);

  const handleToggleFriendOverride = useCallback(() => {
    const next = !friendOverride;
    setFriendOverride(next);
    if (next) {
      confettiRef.current?.pop(window.innerWidth * 0.65, window.innerHeight * 0.45, 52);
    } else {
      soundEngine.playBubbleClick(0.9);
    }
  }, [friendOverride]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FFF6F9] text-[#3A1233]">
      <AmbientOverlay enabled={sparkleRain} />
      <ConfettiCanvas ref={confettiRef} />

      <TopBar
        isPlaying={isPlaying}
        onToggleMusic={handleToggleMusic}
        sfxEnabled={sfxEnabled}
        onToggleSfx={handleToggleSfx}
      />

      <main className="overflow-x-hidden pt-14">
        {/* 1. Hero Section (Humorous Intro + The Only Photo Slot) */}
        <HeroSection
          isWholesomeMode={isWholesomeMode}
          onPopConfetti={handleCelebrationBurst}
        />

        {/* 2. Interactive Toggles & Control Bar */}
        <InteractiveTogglesSection
          isWholesomeMode={isWholesomeMode}
          onToggleWholesome={handleToggleWholesome}
          friendOverride={friendOverride}
          onToggleFriendOverride={handleToggleFriendOverride}
          sparkleRain={sparkleRain}
          onToggleSparkleRain={handleToggleSparkleRain}
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

      <footer className="relative z-20 border-t border-[#F2C6D8] bg-[#FFF6F9] py-8 pb-28 sm:pb-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center justify-center gap-2 text-sm text-[#6B3B64] sm:justify-start">
            <SparkleStarSvg className="h-4 w-4 shrink-0 text-[#D94B7D]" />
            <span className="font-display italic text-[#3A1233]">
              Made for {ANAMIKA.fullName} (aka {ANAMIKA.nickname}) &middot; Turning {ANAMIKA.age} on{' '}
              {ANAMIKA.birthdayLabel}
            </span>
          </div>

          <a
            href="#top"
            className="text-xs font-semibold text-[#D94B7D] transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Back to top
          </a>
        </div>
      </footer>

      <FloatingConfettiButton onPop={handleBurstConfetti} />
    </div>
  );
}
