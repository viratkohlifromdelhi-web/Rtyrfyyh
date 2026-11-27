import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Gift } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics, stopHaptics } from '../utils/haptics';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { WrappedGiftBoxSvg } from './DoodleSvgs';

interface SurpriseGiftSectionProps {
  onRevealConfetti: (originX?: number, originY?: number) => void;
}

function HeadingGiftSvg({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="8.5" width="17" height="4" rx="1.2" />
      <path d="M5 12.5v7a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7" />
      <path d="M12 8.5V21" />
      <path d="M12 8.5H8.3a2.1 2.1 0 1 1 0-4.2C10.5 4.3 12 8.5 12 8.5Z" />
      <path d="M12 8.5h3.7a2.1 2.1 0 1 0 0-4.2C13.5 4.3 12 8.5 12 8.5Z" />
    </svg>
  );
}

function WrapBackRefreshSvg({ className = 'h-[14px] w-[14px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 11a8 8 0 0 1 13.7-5.6L20 7.7" />
      <path d="M20 4v4h-4" />
      <path d="M20 13a8 8 0 0 1-13.7 5.6L4 16.3" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

export function SurpriseGiftSection({ onRevealConfetti }: SurpriseGiftSectionProps) {
  const grainId = useId().replace(/:/g, '');
  const [isOpened, setIsOpened] = useState(false);
  const hapticTimersRef = useRef<number[]>([]);

  const clearHapticTimers = () => {
    for (const id of hapticTimersRef.current) {
      window.clearTimeout(id);
    }
    hapticTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearHapticTimers();
      stopHaptics();
    };
  }, []);

  const handleOpenGift = (e: MouseEvent<HTMLButtonElement>) => {
    clearHapticTimers();
    setIsOpened(true);
    trackEvent('gift_box_unwrapped', 'Surprise Gift Box');
    soundEngine.playGiftFanfare();
    bgMusicPlayer.triggerCelebrationSwell();

    // Synced Stage 1-4 gift box unwrap haptics
    haptics.giftBoxWiggle();
    hapticTimersRef.current.push(
      window.setTimeout(() => haptics.giftBoxRibbonPeel(), 140),
      window.setTimeout(() => haptics.giftBoxLidPop(), 250),
      window.setTimeout(() => haptics.giftBoxReveal(), 380),
    );

    const rect = e.currentTarget.getBoundingClientRect();
    onRevealConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleWrapBack = () => {
    clearHapticTimers();
    stopHaptics();
    trackEvent('gift_box_rewrapped', 'Surprise Gift Box Wrap Back');
    soundEngine.playBubbleClick();
    setIsOpened(false);
  };

  return (
    <section
      id="gift"
      className="relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="gift-box-stage"
          data-opened={String(isOpened)}
          className="relative overflow-hidden rounded-[2rem] border border-[#EBD2E1] bg-gradient-to-br from-[#F7F1FF]/75 via-[#FFFDFB] to-[#FFF0F6]/85 px-6 py-10 text-center shadow-[0_24px_54px_-28px_rgba(58,18,51,0.2)] sm:px-12 sm:py-14"
        >
          <p
            data-testid="gift-section-eyebrow"
            className="text-[11px] font-semibold tracking-[0.14em] text-[#C43D6E] uppercase"
          >
            BIRTHDAY SURPRISE
          </p>

          <h2
            key={isOpened ? 'gift-heading-opened' : 'gift-heading-closed'}
            data-testid="gift-section-heading"
            className="animate-pop-in font-display mt-2 inline-flex flex-wrap items-center justify-center gap-2.5 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl"
          >
            {isOpened ? (
              <span>Your Birthday Gift</span>
            ) : (
              <>
                <span>Tap to Open Your Birthday Gift</span>
                <HeadingGiftSvg className="h-6 w-6 shrink-0 text-[#D94B7D] sm:h-7 sm:w-7" />
              </>
            )}
          </h2>

          {!isOpened ? (
            <div className="mt-7 flex flex-col items-center">
              <button
                type="button"
                data-testid="gift-unwrap-btn"
                onClick={handleOpenGift}
                aria-label="Tap to open your special birthday gift box"
                className="group relative flex flex-col items-center rounded-3xl p-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2377E]"
              >
                <div className="animate-gift-wiggle transition-transform duration-200 group-hover:scale-105">
                  <WrappedGiftBoxSvg className="h-44 w-44 sm:h-52 sm:w-52" />
                </div>
                <span className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#3A1233] px-7 py-3 text-sm font-semibold text-[#FFFDFB] shadow-[0_14px_28px_-8px_rgba(58,18,51,0.42)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:bg-[#531B49] whitespace-nowrap">
                  <Gift className="h-4 w-4 text-[#F3D9A6]" aria-hidden="true" />
                  <span>Unwrap Gift Now</span>
                </span>
              </button>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              data-testid="gift-reveal-card"
              className="animate-dramatic-reveal relative mx-auto mt-8 max-w-lg rounded-[26px] px-5 py-7 text-[#FFF6F9] sm:px-10 sm:py-10"
              style={{
                background: 'linear-gradient(155deg, #3A1233 0%, #2A0C24 100%)',
                boxShadow:
                  '0 24px 50px -18px rgba(42, 12, 36, 0.56), 0 8px 18px -8px rgba(42, 12, 36, 0.34)',
              }}
            >
              {/* Subtle Fine Cardstock Paper Grain Texture (isolated overflow-hidden so headline text never clips) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]"
              >
                <svg className="h-full w-full opacity-[0.045]">
                  <filter id={`gift-slip-grain-${grainId}`}>
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.85"
                      numOctaves="3"
                      stitchTiles="stitch"
                    />
                  </filter>
                  <rect
                    width="100%"
                    height="100%"
                    filter={`url(#gift-slip-grain-${grainId})`}
                  />
                </svg>
              </div>

              {/* Single Clean Architectural Champagne-Gold Inner Hairline Border */}
              <div
                aria-hidden="true"
                data-testid="gift-inner-hairline"
                className="pointer-events-none absolute"
                style={{
                  inset: '10px',
                  borderRadius: '16px',
                  border: '1px solid rgba(232, 200, 146, 0.28)',
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <p
                  data-testid="gift-slip-eyebrow"
                  className="text-[10.5px] font-semibold tracking-[0.18em] text-[#E6C690] uppercase"
                >
                  OFFICIAL VERDICT
                </p>

                <p className="mt-3.5 w-full text-center">
                  <span
                    data-testid="gift-reveal-word"
                    className="font-display font-bold"
                    style={{
                      display: 'inline-block',
                      paddingInline: '0.14em',
                      maxWidth: '100%',
                      fontSize: 'clamp(2rem, 10.5vw, 3rem)',
                      lineHeight: 1.15,
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      backgroundImage:
                        'linear-gradient(180deg, #FFF6DF 0%, #F4DCA4 52%, #E6C07B 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: '#F4DCA4',
                    }}
                  >
                    GAWAAR
                  </span>
                </p>

                <p className="mx-auto mt-3.5 max-w-md text-[15.5px] leading-relaxed text-[#FFF6F9]/95 sm:text-[17px]">
                  Happy birthday bachhaww, what else did you expect? 😂
                </p>

                <button
                  type="button"
                  data-testid="gift-wrap-back-btn"
                  onClick={handleWrapBack}
                  className="mt-7 inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-[#FFF6F9]/[0.07] px-5 py-2 text-xs font-semibold text-[#FFF6F9] transition-all duration-150 hover:bg-[#FFF6F9]/[0.14] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690]"
                  style={{ border: '1px solid rgba(255, 246, 249, 0.28)' }}
                >
                  <WrapBackRefreshSvg className="h-[14px] w-[14px] shrink-0 text-[#E6C690]" />
                  <span>Wrap it back</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
