import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  computeDodgePosition,
  getDodgeMessage,
  type Point2D,
  type Rect2D,
} from '../utils/interactiveFun';
import { SparkleStarSvg } from './DoodleSvgs';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

interface RunawayAgreementSectionProps {
  onAcceptConfetti: (originX?: number, originY?: number) => void;
}

export function RunawayAgreementSection({ onAcceptConfetti }: RunawayAgreementSectionProps) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const yesBtnRef = useRef<HTMLButtonElement | null>(null);
  const noBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastDodgeTimeRef = useRef(0);

  const [noPos, setNoPos] = useState<Point2D>({ x: 112, y: 108 });
  const [hasMeasured, setHasMeasured] = useState(false);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const centerNoButton = useCallback(() => {
    const arena = arenaRef.current;
    const noBtn = noBtnRef.current;
    if (!arena || !noBtn) return;
    const btnW = noBtn.offsetWidth || 104;
    const btnH = noBtn.offsetHeight || 48;
    const centeredX = Math.max(12, Math.round((arena.clientWidth - btnW) / 2));
    const restingY = Math.min(
      Math.max(12, arena.clientHeight - btnH - 28),
      108,
    );
    setNoPos({ x: centeredX, y: restingY });
    setHasMeasured(true);
  }, []);

  // Measure and center the resting position synchronously before paint
  useLayoutEffect(() => {
    if (!accepted && dodgeCount === 0) {
      centerNoButton();
    }
  }, [accepted, dodgeCount, centerNoButton]);

  // Keep runaway button strictly centered (before dodge) or clamped (after dodge) on resize
  useEffect(() => {
    if (accepted) return;
    const handleResize = () => {
      if (dodgeCount === 0) {
        centerNoButton();
        return;
      }
      const arena = arenaRef.current;
      const noBtn = noBtnRef.current;
      if (!arena || !noBtn) return;
      const maxX = Math.max(12, arena.clientWidth - (noBtn.offsetWidth || 104) - 12);
      const maxY = Math.max(12, arena.clientHeight - (noBtn.offsetHeight || 48) - 12);
      setNoPos((prev) => ({
        x: Math.min(Math.max(12, prev.x), maxX),
        y: Math.min(Math.max(12, prev.y), maxY),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [accepted, dodgeCount, centerNoButton]);

  const triggerDodge = useCallback(() => {
    const now = performance.now();
    if (now - lastDodgeTimeRef.current < 85) return;
    lastDodgeTimeRef.current = now;

    const arena = arenaRef.current;
    const noBtn = noBtnRef.current;
    if (!arena || !noBtn) return;

    const bounds = {
      width: arena.clientWidth,
      height: arena.clientHeight,
    };
    const buttonSize = {
      width: noBtn.offsetWidth || 104,
      height: noBtn.offsetHeight || 48,
    };

    const arenaRect = arena.getBoundingClientRect();
    let avoidRect: Rect2D | undefined;
    if (yesBtnRef.current) {
      const yr = yesBtnRef.current.getBoundingClientRect();
      avoidRect = {
        x: yr.left - arenaRect.left,
        y: yr.top - arenaRect.top,
        width: yr.width,
        height: yr.height,
      };
    }

    const nextPos = computeDodgePosition(
      bounds,
      buttonSize,
      noPos,
      Math.random,
      avoidRect,
      12,
    );

    setNoPos(nextPos);
    setHasMeasured(true);
    setDodgeCount((c) => {
      const nextCount = c + 1;
      trackEvent('runaway_no_dodged', 'Runaway No Button', { dodgeCount: nextCount });
      return nextCount;
    });
    soundEngine.playDodgeZip();
    haptics.dodgeTap();
  }, [noPos]);

  const handleAccept = (e: MouseEvent<HTMLButtonElement>) => {
    setAccepted(true);
    trackEvent('yes_button_clicked', 'Best-Friend Agreement Yes Button');
    const rect = e.currentTarget.getBoundingClientRect();
    onAcceptConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleReset = () => {
    soundEngine.playBubbleClick();
    setAccepted(false);
    setDodgeCount(0);
  };

  return (
    <section
      id="agreement"
      className="relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="runaway-agreement-card"
          data-accepted={String(accepted)}
          className="relative overflow-hidden rounded-[2rem] border-2 border-[#F1C5DF] bg-[#FFFDF8] p-6 text-center shadow-[0_22px_50px_-26px_rgba(59,21,53,0.22)] sm:p-10"
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-5 left-5 h-6 w-6 text-[#E04D92]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute right-6 top-6 h-5 w-5 text-[#9A7CE8]"
            style={{ animationDelay: '0.7s' }}
          />

          <p className="text-sm font-semibold text-[#C2377E]">
            Quick Question
          </p>
          <h2 className="font-display mt-1.5 text-balance text-2xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl">
            Best Friend Agreement 📜
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#572B50] sm:text-lg">
            Be honest, do you accept that you&rsquo;re a bauni and a Gawaar?
          </p>

          {!accepted ? (
            <div className="mt-7">
              {/* Bounded dodge playground — strictly contained, no text selection or horizontal scroll */}
              <div
                ref={arenaRef}
                data-testid="runaway-arena"
                style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                className="relative mx-auto h-56 w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-dashed border-[#E8B8D7] bg-gradient-to-br from-[#FFE4F0]/45 via-[#FFFDF8] to-[#EBE3FF]/45 select-none touch-manipulation sm:h-52"
              >
                {/* Stationary "Yes" anchor positioned cleanly in upper center */}
                <div className="flex justify-center pt-7 sm:pt-8">
                  <button
                    ref={yesBtnRef}
                    type="button"
                    onClick={handleAccept}
                    className="relative z-10 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#3B1535] px-7 py-3 text-sm font-semibold text-[#FFFDF8] shadow-[0_14px_28px_-10px_rgba(59,21,53,0.45)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#57214F] active:scale-[0.97] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E]"
                  >
                    Yes, I accept 👑
                  </button>
                </div>

                {/* Runaway "No" button — always top-0 left-0 + translate3d so first dodge never clips */}
                <button
                  ref={noBtnRef}
                  type="button"
                  data-testid="runaway-no-btn"
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') {
                      triggerDodge();
                    }
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    triggerDodge();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    triggerDodge();
                  }}
                  style={{
                    transform: `translate3d(${noPos.x}px, ${noPos.y}px, 0)`,
                    opacity: hasMeasured ? 1 : 0,
                  }}
                  className={`absolute top-0 left-0 z-20 inline-flex min-h-[48px] min-w-[104px] items-center justify-center rounded-full border-2 border-[#3B1535]/20 bg-[#FFE4F0] px-6 py-2.5 text-sm font-semibold text-[#3B1535] shadow-sm select-none cursor-pointer whitespace-nowrap hover:bg-[#FFD6E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] ${
                    dodgeCount > 0
                      ? 'transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]'
                      : ''
                  }`}
                >
                  No 😤
                </button>
              </div>

              {/* Cheeky status line cycling on every dodge */}
              <p
                key={dodgeCount}
                data-testid="runaway-status"
                aria-live="polite"
                className={`mt-4 min-h-[1.5rem] text-sm font-semibold ${
                  dodgeCount > 0 ? 'animate-pop-in text-[#C2377E]' : 'text-[#7A4B73]'
                }`}
              >
                {getDodgeMessage(dodgeCount)}
              </p>
            </div>
          ) : (
            <div
              role="status"
              aria-live="polite"
              data-testid="runaway-accepted-banner"
              className="animate-dramatic-reveal mx-auto mt-7 max-w-xl rounded-3xl border-2 border-[#E6B3D4] bg-gradient-to-br from-[#FFE4F0]/80 via-[#FFFDF8] to-[#FFE898]/45 px-6 py-8 shadow-sm sm:px-8"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3B1535] text-[#FFE898] shadow-sm">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>

              <h3 className="font-display mt-4 text-balance text-2xl font-semibold text-[#3B1535] sm:text-3xl">
                Finally accepted the truth ✅
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-[#572B50]">
                {dodgeCount > 0
                  ? `Only took you ${dodgeCount} ${dodgeCount === 1 ? 'try' : 'tries'} to stop dodging 😂.`
                  : "Didn't even try to deny it. Respect, Morgan 👑."}
              </p>

              <button
                type="button"
                onClick={handleReset}
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#3B1535]/20 bg-[#FFFDF8] px-5 py-2 text-xs font-semibold text-[#3B1535] transition-colors hover:bg-[#FFE4F0] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#C2377E]" aria-hidden="true" />
                <span>Try chasing No again</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
