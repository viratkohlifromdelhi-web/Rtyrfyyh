import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { Gift } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics, stopHaptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
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
      window.setTimeout(() => {
        haptics.giftBoxReveal();
        emitModinoEvent('gift_ew', { force: true });
      }, 380),
    );

    const rect = e.currentTarget.getBoundingClientRect();
    onRevealConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleWrapBack = () => {
    clearHapticTimers();
    stopHaptics();
    haptics.tap();
    emitModinoEvent('interaction_hype');
    trackEvent('gift_box_rewrapped', 'Surprise Gift Box Wrap Back');
    soundEngine.playBubbleClick();
    setIsOpened(false);
  };

  return (
    <section
      id="gift"
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="gift-box-stage"
          data-opened={String(isOpened)}
          className="relative overflow-hidden rounded-[2rem] border border-[#EBD2E1] bg-[#FFFBFD] px-6 py-10 text-center shadow-[0_24px_54px_-28px_rgba(154,48,88,0.18)] sm:px-12 sm:py-14"
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
                className="group relative flex cursor-pointer flex-col items-center rounded-3xl p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2377E]"
              >
                <div className="animate-gift-wiggle transition-transform duration-200 group-hover:scale-105">
                  <WrappedGiftBoxSvg className="h-[clamp(180px,32vw,252px)] w-[clamp(180px,32vw,252px)]" />
                </div>
                <span className="btn-rose-berry mt-4 inline-flex min-h-[var(--btn-min-h)] items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold whitespace-nowrap sm:text-base">
                  <Gift className="h-4 w-4 text-[#FFF4DC]" aria-hidden="true" />
                  <span>Unwrap Gift Now</span>
                </span>
              </button>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              data-testid="gift-reveal-card"
              className="animate-dramatic-reveal relative mx-auto mt-8 max-w-xl rounded-[22px] px-7 py-8 text-[#3A1233] sm:px-10 sm:py-10"
              style={{
                background: 'linear-gradient(155deg, #FFFBF3 0%, #FFF0F6 100%)',
                border: '1.5px solid rgba(201, 59, 107, 0.28)',
                boxShadow:
                  '0 20px 44px -20px rgba(176, 56, 98, 0.22), 0 6px 16px -8px rgba(176, 56, 98, 0.12)',
              }}
            >
              {/* Subtle Fine Cardstock Paper Grain Texture (isolated overflow-hidden so headline text never clips) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[21px]"
              >
                <svg className="h-full w-full opacity-[0.032]">
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

              {/* Left & Right Crisp Vintage Ticket Semicircular Punch Cutouts */}
              <span
                aria-hidden="true"
                data-testid="gift-ticket-notch-left"
                className="pointer-events-none absolute top-1/2 -left-[2px] z-20 h-[26px] w-[14px] -translate-y-1/2 overflow-hidden"
              >
                <span
                  className="absolute top-1/2 -left-[11px] h-[24px] w-[24px] -translate-y-1/2 rounded-full bg-[#FFFBFD]"
                  style={{
                    border: '1.5px solid rgba(201, 59, 107, 0.34)',
                    boxShadow: 'inset -2px 0 5px -3px rgba(176, 56, 98, 0.18)',
                  }}
                />
              </span>
              <span
                aria-hidden="true"
                data-testid="gift-ticket-notch-right"
                className="pointer-events-none absolute top-1/2 -right-[2px] z-20 h-[26px] w-[14px] -translate-y-1/2 overflow-hidden"
              >
                <span
                  className="absolute top-1/2 -right-[11px] h-[24px] w-[24px] -translate-y-1/2 rounded-full bg-[#FFFBFD]"
                  style={{
                    border: '1.5px solid rgba(201, 59, 107, 0.34)',
                    boxShadow: 'inset 2px 0 5px -3px rgba(176, 56, 98, 0.18)',
                  }}
                />
              </span>

              {/* Single Clean Inset Dashed Vintage Ticket Frame */}
              <div
                aria-hidden="true"
                data-testid="gift-inner-hairline"
                className="pointer-events-none absolute"
                style={{
                  inset: '10px',
                  borderRadius: '14px',
                  border: '1px dashed rgba(201, 59, 107, 0.28)',
                }}
              />

              <div className="relative z-10 flex flex-col items-center">
                <p
                  data-testid="gift-slip-eyebrow"
                  className="text-[10.5px] font-semibold tracking-[0.16em] text-[#C93B6B] uppercase tabular-nums"
                >
                  OFFICIAL VERDICT &middot; 03 DEC 2026
                </p>

                <p className="mt-3 w-full text-center">
                  <span
                    data-testid="gift-reveal-word"
                    className="font-display font-bold"
                    style={{
                      display: 'inline-block',
                      paddingInline: '0.14em',
                      maxWidth: '100%',
                      fontSize: 'clamp(2rem, 10.5vw, 3rem)',
                      lineHeight: 1.14,
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                      backgroundImage:
                        'linear-gradient(180deg, #B82B5B 0%, #D94B7D 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: '#C83A6C',
                    }}
                  >
                    GAWAAR
                  </span>
                </p>

                <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-[#4B2243] sm:text-[15.5px]">
                  Happy birthday bachhaww, what else did you expect? 😂
                </p>

                <button
                  type="button"
                  data-testid="gift-wrap-back-btn"
                  onClick={handleWrapBack}
                  className="mt-6 inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-full bg-[#FFFFFF] px-5 py-2 text-xs font-semibold text-[#B52F5E] shadow-[0_6px_16px_-10px_rgba(181,47,94,0.28)] transition-all duration-150 hover:bg-[#FFF7FA] active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                  style={{ border: '1px solid rgba(201, 59, 107, 0.28)' }}
                >
                  <WrapBackRefreshSvg className="h-[14px] w-[14px] shrink-0 text-[#C93B6B]" />
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
