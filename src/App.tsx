import { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientOverlay } from './components/AmbientOverlay';
import { ConfettiCanvas, type ConfettiCanvasHandle } from './components/ConfettiCanvas';
import { HandDrawnHeartSvg, SparkleStarSvg } from './components/DoodleSvgs';
import { FloatingConfettiButton } from './components/FloatingConfettiButton';
import { GuestbookSection } from './components/GuestbookSection';
import { HeroSection } from './components/HeroSection';
import { MakeAWishCake } from './components/MakeAWishCake';
import { TimelineSection } from './components/TimelineSection';
import { TopBar } from './components/TopBar';
import { TributeSection } from './components/TributeSection';
import { WhyWeLoveGrid } from './components/WhyWeLoveGrid';
import { CELEBRANT } from './data/celebrationData';
import { BirthdayMusicPlayer } from './utils/musicSynth';

export default function App() {
  const confettiRef = useRef<ConfettiCanvasHandle | null>(null);
  const musicPlayerRef = useRef<BirthdayMusicPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#FFFDF9] text-[#3B1325]">
      <AmbientOverlay />
      <ConfettiCanvas ref={confettiRef} />

      <TopBar isPlaying={isPlaying} onToggleMusic={handleToggleMusic} />

      <main>
        <HeroSection onCelebrate={handleCelebrationBurst} />
        <TimelineSection />
        <TributeSection />
        <WhyWeLoveGrid />
        <MakeAWishCake onBlowOutConfetti={handleCelebrationBurst} />
        <GuestbookSection onWishPosted={handleBurstConfetti} />
      </main>

      <footer className="relative z-20 border-t border-[#EED5DF] bg-[#FFFDF9] py-10 pb-24 sm:pb-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-2 text-sm text-[#6B334D]">
            <SparkleStarSvg className="h-4 w-4 text-[#D98A9C]" />
            <span className="font-display italic text-[#4A122C]">
              Celebrating {CELEBRANT.name}&rsquo;s {CELEBRANT.age}th Birthday
            </span>
            <HandDrawnHeartSvg className="h-4 w-4 text-[#E07A9E]" filled />
          </div>

          <a
            href="#top"
            className="text-xs font-semibold text-[#8E2A54] transition-colors hover:text-[#4A122C] hover:underline underline-offset-4"
          >
            Back to top
          </a>
        </div>
      </footer>

      <FloatingConfettiButton onPop={handleBurstConfetti} />
    </div>
  );
}
