import { useState, type MouseEvent } from 'react';
import { Gift, RotateCcw } from 'lucide-react';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { SparkleStarSvg, WrappedGiftBoxSvg } from './DoodleSvgs';

interface SurpriseGiftSectionProps {
  onRevealConfetti: (originX?: number, originY?: number) => void;
}

export function SurpriseGiftSection({ onRevealConfetti }: SurpriseGiftSectionProps) {
  const [isOpened, setIsOpened] = useState(false);

  const handleOpenGift = (e: MouseEvent<HTMLButtonElement>) => {
    setIsOpened(true);
    soundEngine.playGiftFanfare();
    bgMusicPlayer.triggerCelebrationSwell();
    const rect = e.currentTarget.getBoundingClientRect();
    onRevealConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleWrapBack = () => {
    soundEngine.playBubbleClick();
    setIsOpened(false);
  };

  return (
    <section
      id="gift"
      className="relative z-20 scroll-mt-16 bg-[#FFF6F9] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="gift-box-stage"
          data-opened={String(isOpened)}
          className="relative overflow-hidden rounded-[2rem] border border-[#E6D4F3] bg-gradient-to-br from-[#F1E9FF]/80 via-[#FFFDFB] to-[#FFE6F0]/85 px-6 py-10 text-center shadow-[0_24px_54px_-28px_rgba(58,18,51,0.22)] sm:px-12 sm:py-14"
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-7 left-7 h-7 w-7 text-[#D94B7D]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute right-8 bottom-8 h-6 w-6 text-[#B78BD8]"
            style={{ animationDelay: '0.8s' }}
          />

          <p className="text-sm font-semibold text-[#D94B7D]">
            Birthday Delivery
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            Tap to Open Your Birthday Gift 🎁
          </h2>

          {!isOpened ? (
            <div className="mt-7 flex flex-col items-center">
              <button
                type="button"
                onClick={handleOpenGift}
                aria-label="Tap to open your special birthday gift box"
                className="group relative flex flex-col items-center rounded-3xl p-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2377E]"
              >
                <div className="animate-gift-wiggle transition-transform duration-200 group-hover:scale-105">
                  <WrappedGiftBoxSvg className="h-44 w-44 sm:h-52 sm:w-52" />
                </div>
                <span className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#3B1535] px-7 py-3 text-sm font-semibold text-[#FFFDF8] shadow-[0_14px_28px_-8px_rgba(59,21,53,0.45)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[#57214F] whitespace-nowrap">
                  <Gift className="h-4 w-4 text-[#FFE898]" aria-hidden="true" />
                  <span>Unwrap Gift Now</span>
                </span>
              </button>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              className="animate-dramatic-reveal mx-auto mt-8 max-w-lg rounded-3xl border-2 border-[#3B1535] bg-[#3B1535] px-6 py-9 text-[#FFFDF8] shadow-[0_24px_48px_-14px_rgba(59,21,53,0.5)] sm:px-10"
            >
              <div className="flex items-center justify-center gap-3 text-[#FFE898]">
                <SparkleStarSvg className="animate-twinkle h-5 w-5" />
                <span className="text-xs font-bold tracking-wide text-[#FFE4F0]">
                  Special Delivery
                </span>
                <SparkleStarSvg
                  className="animate-twinkle h-5 w-5"
                  style={{ animationDelay: '0.6s' }}
                />
              </div>

              <p
                data-testid="gift-reveal-word"
                className="font-display mt-3 text-5xl font-bold tracking-wider text-[#FFE898] sm:text-7xl"
              >
                GAWAAR
              </p>

              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#FFE4F0] sm:text-lg">
                Happy birthday bachhaww, what else did you expect? 😂
              </p>

              <button
                type="button"
                onClick={handleWrapBack}
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#FFE4F0]/40 bg-[#FFFDF8]/10 px-5 py-2.5 text-xs font-semibold text-[#FFFDF8] transition-colors hover:bg-[#FFFDF8]/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE898]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#FFE898]" aria-hidden="true" />
                <span>Wrap it back</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
