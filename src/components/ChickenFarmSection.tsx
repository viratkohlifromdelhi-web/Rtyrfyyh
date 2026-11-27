import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { trackEvent } from '../utils/analytics';
import {
  CHICKEN_FARM_PUNCHLINE_PARTS,
  CHICKEN_FARM_SCHEDULE,
  CHICKEN_FARM_SHELL_CRACK_AT_MS,
  getChickenFarmCaption,
  type ChickenFarmStage,
} from '../utils/chickenFarmTimeline';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function CoopRefreshIconSvg({ className = 'h-[13px] w-[13px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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

const BLOOMING_HEARTS = [
  { id: 'h1', color: '#E85D8D', hxMid: '-8px', hxEnd: '-14px', delay: '0ms', size: 1.0 },
  { id: 'h2', color: '#F49AB8', hxMid: '9px', hxEnd: '15px', delay: '120ms', size: 0.92 },
  { id: 'h3', color: '#FFC8DA', hxMid: '-2px', hxEnd: '-5px', delay: '230ms', size: 0.85 },
  { id: 'h4', color: '#D94B7D', hxMid: '4px', hxEnd: '11px', delay: '340ms', size: 1.05 },
  { id: 'h5', color: '#F5B78E', hxMid: '-10px', hxEnd: '-16px', delay: '450ms', size: 0.86 },
] as const;

const COMIC_PREGNANCY_STARS = [
  { id: 's1', x: 102, y: 120, delay: '140ms', scale: 0.9 },
  { id: 's2', x: 147, y: 124, delay: '260ms', scale: 1.05 },
  { id: 's3', x: 149, y: 146, delay: '380ms', scale: 0.8 },
] as const;

const HATCH_CONFETTI_FLECKS = [
  { id: 'c1', cx: '-28px', cy: '-24px', cr: '-85deg', delay: '0ms', color: '#E85D8D', w: 5.5, h: 3 },
  { id: 'c2', cx: '-16px', cy: '-34px', cr: '52deg', delay: '20ms', color: '#E6B85C', w: 4.5, h: 4.5 },
  { id: 'c3', cx: '-3px', cy: '-38px', cr: '-110deg', delay: '35ms', color: '#F49AB8', w: 5.5, h: 3 },
  { id: 'c4', cx: '12px', cy: '-35px', cr: '78deg', delay: '15ms', color: '#C9B5EE', w: 4.5, h: 4.5 },
  { id: 'c5', cx: '26px', cy: '-26px', cr: '120deg', delay: '40ms', color: '#E6B85C', w: 5.5, h: 3 },
  { id: 'c6', cx: '31px', cy: '-12px', cr: '-64deg', delay: '25ms', color: '#E85D8D', w: 4, h: 4 },
  { id: 'c7', cx: '-30px', cy: '-10px', cr: '95deg', delay: '45ms', color: '#FFF0B0', w: 4.5, h: 4.5 },
  { id: 'c8', cx: '18px', cy: '-18px', cr: '-95deg', delay: '50ms', color: '#F49AB8', w: 5, h: 3 },
] as const;

/**
 * Compact Bonus Canon Lore pastel storybook comic card ("The Little Coop")
 * starring Anamika, Tanya, and baby chick AYUSH. Mounted right above the
 * final Created by adinomide closing sign-off footer.
 */
interface ChickenFarmSectionProps {
  isSiteRevealed?: boolean;
}

export function ChickenFarmSection({ isSiteRevealed = true }: ChickenFarmSectionProps = {}) {
  const uid = useId().replace(/:/g, '');
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef, { enabled: isSiteRevealed });
  const timersRef = useRef<number[]>([]);
  const hasAutoPlayedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const pausedByHiddenTabRef = useRef(false);

  const [stage, setStage] = useState<ChickenFarmStage>(() =>
    prefersReducedMotionNow() ? 'finale' : 'idle',
  );
  const [shellCracked, setShellCracked] = useState(() => prefersReducedMotionNow());
  const [runId, setRunId] = useState(0);

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const startSequence = useCallback(
    (trigger: 'auto' | 'replay') => {
      clearAllTimers();
      pausedByHiddenTabRef.current = false;

      trackEvent('chicken_farm_played', 'The Little Coop', { trigger });

      if (reducedMotionRef.current) {
        setStage('finale');
        setShellCracked(true);
        return;
      }

      // Bump runId so all CSS keyframe animations reset cleanly from 0% even mid-animation
      setRunId((n) => n + 1);
      setShellCracked(false);
      setStage('approach');

      for (const step of CHICKEN_FARM_SCHEDULE) {
        if (step.stage === 'approach') continue;
        const timerId = window.setTimeout(() => {
          setStage(step.stage);
          if (step.stage === 'kiss') {
            soundEngine.playCoopKissPop();
            haptics.coopKissTick();
          } else if (step.stage === 'pregnant') {
            soundEngine.playCoopBoing();
          } else if (step.stage === 'finale') {
            setShellCracked(true);
            soundEngine.playCoopBabyChirp();
            haptics.coopHatchCelebrate();
          }
        }, step.atMs);
        timersRef.current.push(timerId);
      }

      // Crisp tiny eggshell crack tick & radial confetti burst right before Stage 6
      const crackTimer = window.setTimeout(() => {
        setShellCracked(true);
        soundEngine.playCoopShellCrack();
      }, CHICKEN_FARM_SHELL_CRACK_AT_MS);
      timersRef.current.push(crackTimer);
    },
    [clearAllTimers],
  );

  // IntersectionObserver (threshold: 0.5) strictly scoped to Chicken Farm card + visibilitychange pause safety
  useEffect(() => {
    if (!isSiteRevealed) return;
    reducedMotionRef.current = prefersReducedMotionNow();
    if (reducedMotionRef.current) {
      setStage('finale');
      setShellCracked(true);
      return () => {
        clearAllTimers();
      };
    }

    const el = sectionRef.current;
    let observer: IntersectionObserver | null = null;

    if (el && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !hasAutoPlayedRef.current) {
              hasAutoPlayedRef.current = true;
              startSequence('auto');
              observer?.disconnect();
              break;
            }
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(el);
    } else {
      hasAutoPlayedRef.current = true;
      startSequence('auto');
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timersRef.current.length > 0) {
          clearAllTimers();
          pausedByHiddenTabRef.current = true;
        }
      } else if (pausedByHiddenTabRef.current) {
        pausedByHiddenTabRef.current = false;
        setShellCracked(true);
        setStage('finale');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimers();
    };
  }, [clearAllTimers, isSiteRevealed, startSequence]);

  const handleReplay = useCallback(() => {
    hasAutoPlayedRef.current = true;
    haptics.tap();
    startSequence('replay');
  }, [startSequence]);

  const caption = getChickenFarmCaption(stage);
  const isKiss = stage === 'kiss';
  const isPregnant = stage === 'pregnant';
  const isHatch = stage === 'hatch';
  const isFinale = stage === 'finale';
  const isHappyClosedEyes = isKiss || isFinale;
  const cheekOpacity = stage === 'pause' || isKiss || isFinale ? 0.85 : 0.45;

  // Anamika outer transform per stage (CSS GPU-composited)
  const getAnamikaWrapperStyle = (): CSSProperties => {
    const base: CSSProperties = {
      transformOrigin: '132px 156px',
      transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
    };
    if (stage === 'idle') return { ...base, transform: 'translate3d(-58px, 0, 0)' };
    if (stage === 'approach') return { transformOrigin: '132px 156px' };
    if (stage === 'pause') return { ...base, transform: 'translate3d(0, 0, 0) rotate(5deg)' };
    if (stage === 'kiss') return { ...base, transform: 'translate3d(3px, 0, 0) rotate(5deg)' };
    if (stage === 'pregnant') {
      return {
        transformOrigin: '132px 156px',
        transition: 'transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: 'translate3d(-12px, 0, 0) rotate(-3deg)',
      };
    }
    if (stage === 'hatch') return { transformOrigin: '132px 156px' };
    return { ...base, transform: 'translate3d(-16px, 0, 0) rotate(4deg)' };
  };

  // Tanya outer transform per stage (CSS GPU-composited)
  const getTanyaWrapperStyle = (): CSSProperties => {
    const base: CSSProperties = {
      transformOrigin: '188px 156px',
      transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
    };
    if (stage === 'idle') return { ...base, transform: 'translate3d(58px, 0, 0)' };
    if (stage === 'approach') return { transformOrigin: '188px 156px' };
    if (stage === 'pause') return { ...base, transform: 'translate3d(0, 0, 0) rotate(-5deg)' };
    if (stage === 'kiss') return { ...base, transform: 'translate3d(-3px, 0, 0) rotate(-5deg)' };
    if (stage === 'pregnant') return { transformOrigin: '188px 156px' };
    if (stage === 'hatch') return { ...base, transform: 'translate3d(16px, 0, 0) rotate(-2deg)' };
    return { ...base, transform: 'translate3d(16px, 0, 0) rotate(-4deg)' };
  };

  const anamikaAnimClass =
    stage === 'approach'
      ? 'animate-coop-waddle-left'
      : stage === 'hatch'
        ? 'animate-coop-anamika-hop'
        : '';

  const tanyaAnimClass =
    stage === 'approach'
      ? 'animate-coop-waddle-right'
      : stage === 'pregnant'
        ? 'animate-coop-tanya-bounce'
        : '';

  return (
    <section
      ref={sectionRef}
      id="little-coop"
      data-testid="chicken-farm-section"
      data-stage={stage}
      data-run-id={runId}
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] bg-transparent px-4 ${
        animationsActive ? '' : 'anim-paused'
      }`}
    >
      <div
        data-testid="chicken-farm-card"
        className="mx-auto text-center"
        style={{
          maxWidth: '370px',
          margin: '28px auto 12px',
          padding: '20px 18px 22px',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #FFFDF8 0%, #FFF5F8 100%)',
          border: '1px solid rgba(217, 75, 125, 0.18)',
          boxShadow: '0 12px 30px -14px rgba(176, 62, 106, 0.14)',
        }}
      >
        {/* Clean Compact Editorial Header */}
        <p
          className="font-semibold uppercase"
          style={{
            fontSize: '10px',
            letterSpacing: '0.16em',
            color: '#C93B6B',
          }}
        >
          BONUS CANON LORE
        </p>

        <h2
          className="font-display mt-1 font-semibold tracking-tight text-[#3A1233]"
          style={{ fontSize: '22px', lineHeight: 1.2 }}
        >
          The Little Coop
        </h2>

        {/* Fixed-Height Single-Line Live Story Caption (Zero Vertical Layout Shift) */}
        <div
          className="mt-1.5 flex items-center justify-center overflow-hidden"
          style={{ height: '22px' }}
        >
          <p
            key={stage}
            data-testid="coop-live-caption"
            className="truncate transition-opacity duration-200"
            style={{
              fontSize: '12.5px',
              lineHeight: '22px',
              color: '#7A4A63',
            }}
          >
            {caption}
          </p>
        </div>

        {/* Interactive Lightweight Pastel Storybook SVG Stage */}
        <button
          type="button"
          data-testid="coop-stage-btn"
          onClick={handleReplay}
          aria-label="Replay The Little Coop mini story animation"
          className="mt-3 block w-full cursor-pointer rounded-[16px] bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C93B6B]"
        >
          <svg
            viewBox="0 0 320 185"
            role="img"
            aria-label="Mini pastel chicken farm comic starring Anamika, Tanya, and baby chick AYUSH"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
            className="block select-none"
          >
            <defs>
              {/* Warm Sunlit Pastel Sky */}
              <linearGradient id={`coop-sky-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF9EE" />
                <stop offset="68%" stopColor="#FFF5F3" />
                <stop offset="100%" stopColor="#FFF1F6" />
              </linearGradient>
              <radialGradient id={`coop-sun-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 224, 146, 0.58)" />
                <stop offset="48%" stopColor="rgba(255, 224, 146, 0.24)" />
                <stop offset="100%" stopColor="rgba(255, 224, 146, 0)" />
              </radialGradient>

              {/* Soft Pastel Sage Pasture Hills */}
              <linearGradient id={`coop-hill-back-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E6F4E2" />
                <stop offset="100%" stopColor="#D7ECD2" />
              </linearGradient>
              <linearGradient id={`coop-hill-front-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D4EBD0" />
                <stop offset="100%" stopColor="#C4E2BF" />
              </linearGradient>

              {/* Miniature Pastel Cream Coop & Blush Roof */}
              <linearGradient id={`coop-wall-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF8EC" />
                <stop offset="100%" stopColor="#F5E5CC" />
              </linearGradient>
              <linearGradient id={`coop-roof-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F7C6D9" />
                <stop offset="100%" stopColor="#E89AB6" />
              </linearGradient>

              {/* Anamika Buttercream-Yellow Chick */}
              <linearGradient id={`anamika-body-${uid}`} x1="25%" y1="0%" x2="75%" y2="100%">
                <stop offset="0%" stopColor="#FFEDAA" />
                <stop offset="65%" stopColor="#FAD97D" />
                <stop offset="100%" stopColor="#F5CA62" />
              </linearGradient>
              <linearGradient id={`anamika-wing-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE796" />
                <stop offset="100%" stopColor="#EEBC4E" />
              </linearGradient>

              {/* Tanya Warm Peach-Cream Chick */}
              <linearGradient id={`tanya-body-${uid}`} x1="75%" y1="0%" x2="25%" y2="100%">
                <stop offset="0%" stopColor="#FFE4CF" />
                <stop offset="65%" stopColor="#FBD0B1" />
                <stop offset="100%" stopColor="#F5BC96" />
              </linearGradient>
              <linearGradient id={`tanya-wing-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFDCC2" />
                <stop offset="100%" stopColor="#ECA880" />
              </linearGradient>

              {/* Pastel Ivory-Blush Egg & Lemon-Cream Baby Chick AYUSH */}
              <linearGradient id={`egg-shell-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stopColor="#FFFDF8" />
                <stop offset="68%" stopColor="#FDEBF2" />
                <stop offset="100%" stopColor="#FADCE9" />
              </linearGradient>
              <radialGradient id={`egg-glow-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 240, 198, 0.72)" />
                <stop offset="100%" stopColor="rgba(255, 240, 198, 0)" />
              </radialGradient>
              <linearGradient id={`ayush-body-${uid}`} x1="30%" y1="0%" x2="70%" y2="100%">
                <stop offset="0%" stopColor="#FFF8DA" />
                <stop offset="65%" stopColor="#FFEDAA" />
                <stop offset="100%" stopColor="#FFE285" />
              </linearGradient>
            </defs>

            {/* ============================================================
                BACKDROP: Sky, Sun Glow, Gently Drifting Clouds, Fence, Coop & Hills
                ============================================================ */}
            <rect x="0" y="0" width="320" height="185" fill={`url(#coop-sky-${uid})`} />

            {/* Upper-Right Soft Pastel Sun Glow */}
            <circle cx="274" cy="34" r="38" fill={`url(#coop-sun-${uid})`} />
            <circle cx="274" cy="34" r="11" fill="rgba(255, 232, 166, 0.72)" />

            {/* 2 Tiny Puffy Warm-White Drifting Clouds */}
            <g className="animate-coop-cloud-a" opacity="0.88">
              <ellipse cx="90" cy="34" rx="17" ry="7.5" fill="#FFFDF9" />
              <circle cx="82" cy="31" r="7" fill="#FFFDF9" />
              <circle cx="95" cy="29.5" r="8.2" fill="#FFFDF9" />
              <circle cx="105" cy="33" r="6" fill="#FFFDF9" />
            </g>
            <g className="animate-coop-cloud-b" opacity="0.82">
              <ellipse cx="212" cy="46" rx="14.5" ry="6.4" fill="#FFFDF9" />
              <circle cx="204" cy="43.5" r="6.2" fill="#FFFDF9" />
              <circle cx="216" cy="42.5" r="7.2" fill="#FFFDF9" />
              <circle cx="225" cy="45.5" r="5" fill="#FFFDF9" />
            </g>

            {/* Back Pastel Sage Hill */}
            <path
              d="M0 124 Q88 104, 174 118 T320 116 L320 185 L0 185 Z"
              fill={`url(#coop-hill-back-${uid})`}
            />

            {/* Delicate Cream Horizon Picket Fence */}
            <g opacity="0.92">
              <rect x="64" y="114" width="246" height="2.8" rx="1.4" fill="#FCEFD8" />
              <rect x="64" y="123" width="246" height="2.8" rx="1.4" fill="#F8E6C8" />
              {[78, 102, 126, 150, 174, 198, 222, 246, 270, 294].map((px) => (
                <path
                  key={px}
                  d={`M${px} 109 L${px + 3.2} 105.5 L${px + 6.4} 109 L${px + 6.4} 131 L${px} 131 Z`}
                  fill="#FCEFD8"
                />
              ))}
            </g>

            {/* Miniature Pastel Cream Coop on Far Left Background */}
            <g>
              {/* Soft ground shadow under coop */}
              <ellipse cx="38" cy="133" rx="26" ry="4.5" fill="rgba(130, 166, 124, 0.25)" />
              {/* Cream wooden coop body */}
              <rect
                x="16"
                y="95"
                width="44"
                height="37"
                rx="6"
                fill={`url(#coop-wall-${uid})`}
              />
              {/* Subtle vertical plank lines */}
              <line x1="25" y1="97" x2="25" y2="131" stroke="rgba(216,182,148,0.28)" strokeWidth="1" />
              <line x1="51" y1="97" x2="51" y2="131" stroke="rgba(216,182,148,0.28)" strokeWidth="1" />
              {/* Tiny arched doorway */}
              <path
                d="M31 132 L31 117 C31 112.5, 45 112.5, 45 117 L45 132 Z"
                fill="#D8B69B"
              />
              <path
                d="M33 132 L33 118.5 C33 115, 43 115, 43 118.5 L43 132 Z"
                fill="#C49E82"
              />
              {/* Tiny round attic window */}
              <circle cx="38" cy="103.5" r="4.2" fill="#FFFDF8" />
              <circle cx="38" cy="103.5" r="2.7" fill="#F7D5E2" />
              {/* Blush-Rose Pitched Roof */}
              <path
                d="M10 98 L38 74 L66 98 C67.2 99, 66.2 101, 64.5 101 L11.5 101 C9.8 101, 8.8 99, 10 98 Z"
                fill={`url(#coop-roof-${uid})`}
              />
              <circle cx="38" cy="73.5" r="2.6" fill="#FFE6A8" />
            </g>

            {/* Foreground Pastel Sage Pasture Hill */}
            <path
              d="M0 138 Q95 123, 185 132 T320 130 L320 185 L0 185 Z"
              fill={`url(#coop-hill-front-${uid})`}
            />

            {/* 4 Tiny Pale Buttercream & Blush Meadow Dots */}
            <circle cx="48" cy="166" r="2.4" fill="#FFF0B8" />
            <circle cx="88" cy="173" r="2.1" fill="#F9C8DC" />
            <circle cx="242" cy="172" r="2.3" fill="#FFF0B8" />
            <circle cx="284" cy="161" r="2.1" fill="#F9C8DC" />

            {/* ============================================================
                ANIMATED STORY CAST (Keyed by runId so Replay resets cleanly!)
                ============================================================ */}
            <g key={runId}>
              {/* ------------------------------------------------------------
                  1. ANAMIKA (Left Chick — Buttercream Yellow + Rose Berry Bow)
                  ------------------------------------------------------------ */}
              <g
                data-testid="coop-chick-anamika"
                className={anamikaAnimClass || undefined}
                style={getAnamikaWrapperStyle()}
              >
                {/* Soft pasture shadow beneath feet */}
                <ellipse cx="132" cy="157" rx="16" ry="3.6" fill="rgba(124, 158, 118, 0.28)" />

                {/* Tiny stubby orange-peach feet */}
                <g fill="#F0965E">
                  <rect x="125" y="150" width="3.2" height="6.2" rx="1.6" />
                  <ellipse cx="127.6" cy="156" rx="3.4" ry="1.6" />
                  <rect x="135" y="150" width="3.2" height="6.2" rx="1.6" />
                  <ellipse cx="137.6" cy="156" rx="3.4" ry="1.6" />
                </g>

                {/* Dedicated Anamika Belly Comedic Puff Group (anchored at lower torso — never distorts face!) */}
                <g
                  data-testid="coop-anamika-belly"
                  style={{
                    transformOrigin: '132px 141px',
                    transform: isPregnant
                      ? 'translate3d(4px, 1px, 0) scaleX(1.28) scaleY(1.18)'
                      : 'translate3d(0, 0, 0) scaleX(1) scaleY(1)',
                    opacity: isPregnant ? 1 : 0,
                    transition: isPregnant
                      ? 'transform 460ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 180ms ease'
                      : 'transform 260ms ease-out, opacity 200ms ease',
                  }}
                >
                  <ellipse cx="136" cy="141" rx="16.5" ry="14.2" fill={`url(#anamika-body-${uid})`} />
                  {/* Warm highlight sheen on round pregnant belly */}
                  <ellipse cx="141" cy="137" rx="6.2" ry="4.4" fill="rgba(255, 252, 234, 0.48)" />
                </g>

                {/* Main Fluffy Buttercream-Yellow Chick Body (~46px tall: y=110..156) */}
                <ellipse cx="132" cy="139" rx="16.5" ry="14.5" fill={`url(#anamika-body-${uid})`} />
                <circle cx="134" cy="127" r="14.5" fill={`url(#anamika-body-${uid})`} />
                {/* Fluffy crown feather tuft */}
                <path
                  d="M128 113.5 C127 109.5, 132 108.8, 134 112.5 C136 109.5, 139.5 111.5, 137.5 114.5 Z"
                  fill="#FFEDAA"
                />

                {/* Cute Small Peach Beak Pointing Right */}
                <path
                  d="M147.2 127.8 L156.2 130.6 L147.2 133.5 C146.3 131.8, 146.3 129.4, 147.2 127.8 Z"
                  fill="#F29A68"
                />

                {/* Animated Cute Oval Wing */}
                <ellipse
                  cx="125"
                  cy="140.5"
                  rx="7.2"
                  ry="4.8"
                  fill={`url(#anamika-wing-${uid})`}
                  style={{
                    transformOrigin: '125px 138px',
                    transform: isPregnant
                      ? 'rotate(18deg)'
                      : isKiss || isFinale
                        ? 'rotate(-14deg)'
                        : 'rotate(-4deg)',
                    transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {/* Delicate Tiny Warm Rose Berry Bow on Head (#D94B7D) */}
                <g transform="translate(131, 113) rotate(-10)">
                  <ellipse cx="-4.2" cy="0" rx="3.8" ry="2.5" fill="#D94B7D" />
                  <ellipse cx="4.2" cy="0" rx="3.8" ry="2.5" fill="#D94B7D" />
                  <circle cx="0" cy="0" r="1.9" fill="#F7B3CC" />
                </g>

                {/* Rosy Cheek Oval */}
                <ellipse
                  cx="142.8"
                  cy="132.8"
                  rx="3.6"
                  ry="2.1"
                  fill="#F08EAE"
                  style={{
                    opacity: cheekOpacity,
                    transition: 'opacity 320ms ease',
                  }}
                />

                {/* Eyes: Open Catchlight vs Happy ^ ^ Closed Smiles */}
                <g
                  className={stage === 'pause' ? 'animate-coop-shy-blink' : undefined}
                  style={{
                    transformOrigin: '140.5px 127.2px',
                    opacity: isHappyClosedEyes ? 0 : 1,
                    transition: 'opacity 180ms ease',
                  }}
                >
                  <circle cx="140.5" cy="127.2" r="2.5" fill="#3A1233" />
                  <circle cx="141.3" cy="126.3" r="0.95" fill="#FFFFFF" />
                </g>
                <g
                  style={{
                    opacity: isHappyClosedEyes ? 1 : 0,
                    transition: 'opacity 180ms ease',
                  }}
                >
                  <path
                    d="M137.6 127.8 Q140.5 124.2 143.4 127.8"
                    fill="none"
                    stroke="#3A1233"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </g>

                {/* Crisp Tiny Translucent Ivory Name Pill (follows Anamika cleanly) */}
                <g transform="translate(132, 169)">
                  <rect
                    x="-25"
                    y="-7.5"
                    width="50"
                    height="14.5"
                    rx="7.25"
                    fill="rgba(255, 253, 250, 0.88)"
                    stroke="rgba(217, 75, 125, 0.18)"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="2.8"
                    textAnchor="middle"
                    fill="#3A1233"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="inherit"
                  >
                    Anamika
                  </text>
                </g>
              </g>

              {/* ------------------------------------------------------------
                  2. TANYA (Right Chick — Warm Peach-Cream + Pastel Lilac Flower)
                  ------------------------------------------------------------ */}
              <g
                data-testid="coop-chick-tanya"
                className={tanyaAnimClass || undefined}
                style={getTanyaWrapperStyle()}
              >
                {/* Soft pasture shadow beneath feet */}
                <ellipse cx="188" cy="157" rx="16" ry="3.6" fill="rgba(124, 158, 118, 0.28)" />

                {/* Tiny stubby orange-peach feet */}
                <g fill="#F0965E">
                  <rect x="181.5" y="150" width="3.2" height="6.2" rx="1.6" />
                  <ellipse cx="182.2" cy="156" rx="3.4" ry="1.6" />
                  <rect x="191.5" y="150" width="3.2" height="6.2" rx="1.6" />
                  <ellipse cx="192.2" cy="156" rx="3.4" ry="1.6" />
                </g>

                {/* Main Fluffy Warm Pastel Peach-Cream Chick Body (~46px tall, facing left) */}
                <ellipse cx="188" cy="139" rx="16.5" ry="14.5" fill={`url(#tanya-body-${uid})`} />
                <circle cx="186" cy="127" r="14.5" fill={`url(#tanya-body-${uid})`} />
                {/* Fluffy crown feather tuft */}
                <path
                  d="M192 113.5 C193 109.5, 188 108.8, 186 112.5 C184 109.5, 180.5 111.5, 182.5 114.5 Z"
                  fill="#FFE4CF"
                />

                {/* Cute Small Peach Beak Pointing Left */}
                <path
                  d="M172.8 127.8 L163.8 130.6 L172.8 133.5 C173.7 131.8, 173.7 129.4, 172.8 127.8 Z"
                  fill="#F29A68"
                />

                {/* Animated Cute Oval Wing */}
                <ellipse
                  cx="195"
                  cy="140.5"
                  rx="7.2"
                  ry="4.8"
                  fill={`url(#tanya-wing-${uid})`}
                  style={{
                    transformOrigin: '195px 138px',
                    transform:
                      isPregnant || isKiss || isFinale ? 'rotate(15deg)' : 'rotate(4deg)',
                    transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />

                {/* Delicate Tiny Pastel Lilac Flower on Head (#C7B0ED) */}
                <g transform="translate(189, 113.5) rotate(8)">
                  <circle cx="0" cy="-3.2" r="2.2" fill="#C7B0ED" />
                  <circle cx="3.0" cy="-1.0" r="2.2" fill="#C7B0ED" />
                  <circle cx="1.9" cy="2.6" r="2.2" fill="#C7B0ED" />
                  <circle cx="-1.9" cy="2.6" r="2.2" fill="#C7B0ED" />
                  <circle cx="-3.0" cy="-1.0" r="2.2" fill="#C7B0ED" />
                  <circle cx="0" cy="0" r="1.7" fill="#FFF0B0" />
                </g>

                {/* Rosy Cheek Oval */}
                <ellipse
                  cx="177.2"
                  cy="132.8"
                  rx="3.6"
                  ry="2.1"
                  fill="#F08EAE"
                  style={{
                    opacity: cheekOpacity,
                    transition: 'opacity 320ms ease',
                  }}
                />

                {/* Eyes: Open Catchlight vs Happy ^ ^ Closed Smiles */}
                <g
                  className={stage === 'pause' ? 'animate-coop-shy-blink' : undefined}
                  style={{
                    transformOrigin: '179.5px 127.2px',
                    opacity: isHappyClosedEyes ? 0 : 1,
                    transition: 'opacity 180ms ease',
                  }}
                >
                  <circle cx="179.5" cy="127.2" r="2.5" fill="#3A1233" />
                  <circle cx="178.7" cy="126.3" r="0.95" fill="#FFFFFF" />
                </g>
                <g
                  style={{
                    opacity: isHappyClosedEyes ? 1 : 0,
                    transition: 'opacity 180ms ease',
                  }}
                >
                  <path
                    d="M176.6 127.8 Q179.5 124.2 182.4 127.8"
                    fill="none"
                    stroke="#3A1233"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </g>

                {/* Crisp Tiny Translucent Ivory Name Pill (follows Tanya cleanly) */}
                <g transform="translate(188, 169)">
                  <rect
                    x="-21"
                    y="-7.5"
                    width="42"
                    height="14.5"
                    rx="7.25"
                    fill="rgba(255, 253, 250, 0.88)"
                    stroke="rgba(165, 134, 212, 0.24)"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="2.8"
                    textAnchor="middle"
                    fill="#3A1233"
                    fontSize="9.5"
                    fontWeight="700"
                    fontFamily="inherit"
                  >
                    Tanya
                  </text>
                </g>
              </g>

              {/* ------------------------------------------------------------
                  3. STAGE 3: 5 STAGGERED BLOOMING PASTEL HEARTS ABOVE BEAKS
                  ------------------------------------------------------------ */}
              {isKiss && (
                <g data-testid="coop-kiss-hearts" className="pointer-events-none">
                  {BLOOMING_HEARTS.map((h) => (
                    <g
                      key={h.id}
                      transform="translate(160, 121)"
                    >
                      <g
                        className="animate-coop-heart"
                        style={
                          {
                            '--hx-mid': h.hxMid,
                            '--hx-end': h.hxEnd,
                            '--hdelay': h.delay,
                            opacity: 0,
                          } as CSSProperties
                        }
                      >
                        <path
                          d="M0 3.2 C-0.4 2.8, -5.2 -0.4, -5.2 -3.3 C-5.2 -5.3, -3.6 -6.6, -1.9 -6.6 C-0.8 -6.6, 0 -5.9, 0 -5.1 C0 -5.9, 0.8 -6.6, 1.9 -6.6 C3.6 -6.6, 5.2 -5.3, 5.2 -3.3 C5.2 -0.4, 0.4 2.8, 0 3.2 Z"
                          fill={h.color}
                          transform={`scale(${h.size})`}
                        />
                      </g>
                    </g>
                  ))}
                </g>
              )}

              {/* ------------------------------------------------------------
                  4. STAGE 4: 3 TINY TWINKLING CHAMPAGNE-GOLD COMIC STARS
                  ------------------------------------------------------------ */}
              {isPregnant && (
                <g data-testid="coop-pregnancy-stars" className="pointer-events-none">
                  {COMIC_PREGNANCY_STARS.map((s) => (
                    <g key={s.id} transform={`translate(${s.x}, ${s.y})`}>
                      <g
                        className="animate-coop-comic-star"
                        style={{ '--sdelay': s.delay, opacity: 0 } as CSSProperties}
                      >
                        <path
                          d="M0 -5.5 Q0.6 -0.6 5.5 0 Q0.6 0.6 0 5.5 Q-0.6 0.6 -5.5 0 Q-0.6 -0.6 0 -5.5 Z"
                          fill="#E6B85C"
                          transform={`scale(${s.scale})`}
                        />
                      </g>
                    </g>
                  ))}
                </g>
              )}

              {/* ------------------------------------------------------------
                  5. STAGE 5: GLOWING BLUSH-IVORY EGG + ZIG-ZAG CRACK + CONFETTI
                  ------------------------------------------------------------ */}
              {isHatch && (
                <g
                  data-testid="coop-egg-group"
                  className="animate-coop-egg-wobble"
                  style={{ transformOrigin: '160px 156px' }}
                >
                  {/* Soft warm egg glow & pasture shadow */}
                  <circle cx="160" cy="143" r="22" fill={`url(#egg-glow-${uid})`} />
                  <ellipse cx="160" cy="157" rx="13" ry="3.2" fill="rgba(124, 158, 118, 0.28)" />

                  {/* Bottom Egg Half */}
                  <path
                    d="M147.8 142.5 L151.8 145 L155.8 141.5 L160 145 L164.2 141.5 L168.2 145 L172.2 142.5 C172.5 151.5, 167 156.5, 160 156.5 C153 156.5, 147.5 151.5, 147.8 142.5 Z"
                    fill={`url(#egg-shell-${uid})`}
                  />

                  {/* Top Egg Half (lifts slightly right as shellCracked fires) */}
                  <g
                    style={{
                      transformOrigin: '160px 141px',
                      transform: shellCracked
                        ? 'translate3d(0, -3px, 0) rotate(8deg)'
                        : 'translate3d(0, 0, 0) rotate(0deg)',
                      transition: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <path
                      d="M147.8 142.5 C148 131.5, 153.2 125.5, 160 125.5 C166.8 125.5, 172 131.5, 172.2 142.5 L168.2 145 L164.2 141.5 L160 145 L155.8 141.5 L151.8 145 Z"
                      fill={`url(#egg-shell-${uid})`}
                    />
                    {/* Champagne-Gold Speckles */}
                    <circle cx="155" cy="133" r="1.4" fill="#E6C690" opacity="0.82" />
                    <circle cx="165" cy="135.5" r="1.15" fill="#E6C690" opacity="0.78" />
                    <circle cx="160.5" cy="129.5" r="1.0" fill="#F2B8CD" opacity="0.75" />
                  </g>

                  {/* Crisp Zig-Zag Crack Seam */}
                  <path
                    d="M148 142.5 L151.8 145 L155.8 141.5 L160 145 L164.2 141.5 L168.2 145 L172 142.5"
                    fill="none"
                    stroke="#C97A98"
                    strokeWidth={shellCracked ? '1.6' : '0.85'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={shellCracked ? 0.92 : 0.32}
                  />
                </g>
              )}

              {/* 8 Tiny Radial Pastel Confetti Flecks Bursting on Crack */}
              {(isHatch || isFinale) && shellCracked && (
                <g
                  data-testid="coop-hatch-confetti"
                  transform="translate(160, 140)"
                  className="pointer-events-none"
                >
                  {HATCH_CONFETTI_FLECKS.map((f) => (
                    <rect
                      key={f.id}
                      x={-f.w / 2}
                      y={-f.h / 2}
                      width={f.w}
                      height={f.h}
                      rx="1.5"
                      fill={f.color}
                      className="animate-coop-confetti"
                      style={
                        {
                          '--cx': f.cx,
                          '--cy': f.cy,
                          '--cr': f.cr,
                          '--cdelay': f.delay,
                          opacity: 0,
                        } as CSSProperties
                      }
                    />
                  ))}
                </g>
              )}

              {/* ------------------------------------------------------------
                  6. STAGE 6: ENTER BABY CHICK AYUSH (~28px tall + shell hat!)
                  ------------------------------------------------------------ */}
              {isFinale && (
                <g data-testid="coop-chick-ayush">
                  {/* Ground shadow under cracked bottom shell */}
                  <ellipse cx="160" cy="157" rx="13.5" ry="3.2" fill="rgba(124, 158, 118, 0.28)" />

                  {/* Animated AYUSH Pop + 2 Squeaky Bounces */}
                  <g
                    className="animate-coop-ayush-pop"
                    style={{ transformOrigin: '160px 154px' }}
                  >
                    {/* Tiny Stubby Flapping Wings */}
                    <ellipse
                      cx="148.5"
                      cy="141.5"
                      rx="4.4"
                      ry="2.8"
                      fill="#FFE285"
                      className="animate-coop-ayush-wing"
                      style={{ transformOrigin: '151px 141px' }}
                    />
                    <ellipse
                      cx="171.5"
                      cy="141.5"
                      rx="4.4"
                      ry="2.8"
                      fill="#FFE285"
                      className="animate-coop-ayush-wing"
                      style={{ transformOrigin: '169px 141px' }}
                    />

                    {/* Ultra-Tiny Round Pale Lemon-Cream Mini Chick Body (~28px tall) */}
                    <circle cx="160" cy="139.5" r="12.2" fill={`url(#ayush-body-${uid})`} />

                    {/* Oversized Cute Sparkly Eyes */}
                    <circle cx="155.3" cy="138.2" r="2.45" fill="#3A1233" />
                    <circle cx="154.6" cy="137.3" r="1.0" fill="#FFFFFF" />
                    <circle cx="156.1" cy="139.0" r="0.45" fill="#FFFFFF" />

                    <circle cx="164.7" cy="138.2" r="2.45" fill="#3A1233" />
                    <circle cx="164.0" cy="137.3" r="1.0" fill="#FFFFFF" />
                    <circle cx="165.5" cy="139.0" r="0.45" fill="#FFFFFF" />

                    {/* Soft Rosy Baby Cheeks */}
                    <ellipse cx="151.6" cy="141.6" rx="2.7" ry="1.6" fill="rgba(240, 142, 174, 0.56)" />
                    <ellipse cx="168.4" cy="141.6" rx="2.7" ry="1.6" fill="rgba(240, 142, 174, 0.56)" />

                    {/* Tiny Wide Happy Beak */}
                    <path d="M157.4 140.4 L162.6 140.4 L160 144.6 Z" fill="#F2945E" />
                    <path d="M158.4 141.2 L161.6 141.2 L160 143.5 Z" fill="#E85D8D" opacity="0.65" />

                    {/* Cracked Egg Top Half Perched Tilted Like a Tiny Hat */}
                    <g transform="translate(161.2, 128.5) rotate(13)">
                      <path
                        d="M-11.2 4.2 C-10.8 -5.5, -5.8 -10.5, 0 -10.5 C5.8 -10.5, 10.8 -5.5, 11.2 4.2 L7.6 1.6 L3.8 4.6 L0 1.4 L-3.8 4.6 L-7.6 1.6 Z"
                        fill={`url(#egg-shell-${uid})`}
                      />
                      <circle cx="-4.2" cy="-3.5" r="1.15" fill="#E6C690" opacity="0.85" />
                      <circle cx="4.6" cy="-2.2" r="1.0" fill="#E6C690" opacity="0.8" />
                    </g>
                  </g>

                  {/* Cracked Lower Eggshell Base Resting Snugly Around AYUSH on the Pasture */}
                  <path
                    d="M148.2 145.2 L152.2 147.8 L156 144.6 L160 147.8 L164 144.6 L167.8 147.8 L171.8 145.2 C171.8 153, 166.8 157, 160 157 C153.2 157, 148.2 153, 148.2 145.2 Z"
                    fill={`url(#egg-shell-${uid})`}
                  />

                  {/* Crisp Bold Gold-Blush Name Pill Popping Cleanly Above AYUSH's Head */}
                  <g
                    data-testid="coop-ayush-pill"
                    transform="translate(160, 103)"
                  >
                    <g className="animate-coop-ayush-label">
                      <rect
                        x="-24.5"
                        y="-8"
                        width="49"
                        height="15.5"
                        rx="7.75"
                        fill="#FFF8EC"
                        stroke="rgba(217, 75, 125, 0.34)"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3.1"
                        textAnchor="middle"
                        fill="#B52C5C"
                        fontSize="10"
                        fontWeight="800"
                        letterSpacing="0.06em"
                        fontFamily="inherit"
                      >
                        AYUSH
                      </text>
                    </g>
                  </g>
                </g>
              )}
            </g>
          </svg>
        </button>

        {/* Punchline Banner (Always Reserves Height for Zero Layout Shift, Fades In on Stage 6) */}
        <div
          data-testid="coop-punchline-banner"
          aria-hidden={!isFinale}
          className="transition-all duration-500 ease-out"
          style={{
            background: 'rgba(255, 240, 246, 0.72)',
            border: '1px solid rgba(217, 75, 125, 0.16)',
            borderRadius: '14px',
            padding: '11px 14px',
            marginTop: '14px',
            opacity: isFinale ? 1 : 0,
            transform: isFinale ? 'translate3d(0, 0, 0)' : 'translate3d(0, 6px, 0)',
          }}
        >
          <p className="text-[12.5px] leading-relaxed text-[#4F2547]">
            {CHICKEN_FARM_PUNCHLINE_PARTS.prefix}
            <strong className="font-bold text-[#B52C5C]">
              {CHICKEN_FARM_PUNCHLINE_PARTS.heroName}
            </strong>
            {CHICKEN_FARM_PUNCHLINE_PARTS.suffix}
          </p>
        </div>

        {/* Clean Compact Warm Ivory Replay Pill */}
        <button
          type="button"
          data-testid="coop-replay-btn"
          onClick={handleReplay}
          className="mt-3 inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full bg-[#FFFDF9] px-4 py-1.5 text-[12px] font-semibold text-[#B52F5E] shadow-[0_6px_14px_-10px_rgba(181,47,94,0.3)] transition-all duration-150 hover:bg-[#FFF6FA] active:translate-y-[1px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
          style={{
            border: '1px solid rgba(201, 59, 107, 0.24)',
          }}
        >
          <CoopRefreshIconSvg className="h-[13px] w-[13px] shrink-0 text-[#C93B6B]" />
          <span>Replay Coop Story</span>
        </button>
      </div>
    </section>
  );
}
