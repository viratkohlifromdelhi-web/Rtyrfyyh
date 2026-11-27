import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SparkleStarSvg } from './DoodleSvgs';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { bgMusicPlayer } from '../utils/musicSynth';
import { playUiSfx } from '../utils/uiSoundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';
import { WheelAudioEngine } from '../utils/wheelAudio';
import {
  applyCrawlPegBend,
  applyFlapperImpulse,
  computeRiggedSpinPlan,
  evaluateWheelAngle,
  getPegCrossingIndex,
  getSliceIndexAtTop,
  SLICE_ANGLE_DEG,
  SPIN_RECOIL_DURATION_MS,
  stepFlapperSpring,
  WHEEL_SLICES,
  type FlapperSpringState,
  type RiggedSpinPlan,
  type WheelSlice,
} from '../utils/wheelPhysics';

interface EmojiBurstParticle {
  id: string;
  emoji: string;
  x: string;
  y: string;
  rot: string;
  delay: string;
}

const BULB_COUNT = 20;
const WHEEL_CX = 180;
const WHEEL_CY = 180;
const WHEEL_RADIUS = 148;
const PEG_RADIUS = 142;
const BULB_RADIUS = 161;

function polarToCartesian(cx: number, cy: number, r: number, clockDeg: number) {
  const rad = ((clockDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createSlicePath(index: number): string {
  const startDeg = index * SLICE_ANGLE_DEG;
  const endDeg = (index + 1) * SLICE_ANGLE_DEG;
  const start = polarToCartesian(WHEEL_CX, WHEEL_CY, WHEEL_RADIUS, startDeg);
  const end = polarToCartesian(WHEEL_CX, WHEEL_CY, WHEEL_RADIUS, endDeg);
  return `M ${WHEEL_CX} ${WHEEL_CY} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 0 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

function getSliceFontSize(label: string): number {
  if (label.includes('🐍')) return 11.5;
  if (label.length >= 15) return 8.9;
  if (label.length >= 13) return 9.4;
  return 10.4;
}

function buildOutcomeParticles(slice: WheelSlice, spinId: number): EmojiBurstParticle[] {
  const emojis = slice.resultEmojis ?? ['😂', '✨', '🎀'];
  const vectors = [
    { x: '-96px', y: '-54px', rot: '-20deg', delay: '0ms' },
    { x: '-58px', y: '-82px', rot: '-12deg', delay: '45ms' },
    { x: '-18px', y: '-94px', rot: '8deg', delay: '90ms' },
    { x: '26px', y: '-90px', rot: '16deg', delay: '35ms' },
    { x: '68px', y: '-76px', rot: '24deg', delay: '80ms' },
    { x: '100px', y: '-48px', rot: '-15deg', delay: '120ms' },
    { x: '-78px', y: '-22px', rot: '14deg', delay: '140ms' },
    { x: '80px', y: '-20px', rot: '-18deg', delay: '105ms' },
  ];
  return vectors.map((v, idx) => ({
    id: `${spinId}-${idx}`,
    emoji: emojis[idx % emojis.length],
    ...v,
  }));
}

export function SpinWheelSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef);
  const wheelDiscRef = useRef<SVGGElement | null>(null);
  const wheelGlowRef = useRef<HTMLDivElement | null>(null);
  const flapperRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<WheelAudioEngine | null>(null);

  const rafIdRef = useRef<number | null>(null);
  const currentAngleRef = useRef<number>(18); // Start centered nicely on a slice (offset from peg)
  const lastTrollIndexRef = useRef<number | null>(null);
  const flapperStateRef = useRef<FlapperSpringState>({ angleDeg: 0, velocityDegPerSec: 0 });
  const landedTimeoutRef = useRef<number | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [bulbMode, setBulbMode] = useState<'idle' | 'spinning' | 'landed'>('idle');
  const [bulbPhase, setBulbPhase] = useState(0);
  const [hubPressed, setHubPressed] = useState(false);
  const [spinsTried, setSpinsTried] = useState(0);
  const [landedResult, setLandedResult] = useState<{
    slice: WheelSlice;
    spinId: number;
    particles: EmojiBurstParticle[];
  } | null>(null);

  // Precompute static SVG geometry for all 10 slices, 10 pegs, and 20 chasing bulbs
  const sliceGeometries = useMemo(
    () =>
      WHEEL_SLICES.map((slice) => ({
        slice,
        path: createSlicePath(slice.index),
        midDeg: slice.index * SLICE_ANGLE_DEG + SLICE_ANGLE_DEG / 2,
        fontSize: getSliceFontSize(slice.label),
      })),
    [],
  );

  const pegCoords = useMemo(
    () =>
      Array.from({ length: WHEEL_SLICES.length }, (_, i) =>
        polarToCartesian(WHEEL_CX, WHEEL_CY, PEG_RADIUS, i * SLICE_ANGLE_DEG),
      ),
    [],
  );

  const bulbCoords = useMemo(
    () =>
      Array.from({ length: BULB_COUNT }, (_, i) =>
        polarToCartesian(WHEEL_CX, WHEEL_CY, BULB_RADIUS, i * (360 / BULB_COUNT)),
      ),
    [],
  );

  useEffect(() => {
    audioRef.current = new WheelAudioEngine();
    if (wheelDiscRef.current) {
      wheelDiscRef.current.style.transform = `rotate3d(0, 0, 1, ${currentAngleRef.current}deg)`;
    }
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      if (landedTimeoutRef.current !== null) {
        window.clearTimeout(landedTimeoutRef.current);
      }
      audioRef.current?.dispose();
      audioRef.current = null;
      bgMusicPlayer.clearWheelDuck();
    };
  }, []);

  // Animate the 20 chasing fairy/carnival bulbs across idle, spinning, and landed states (paused offscreen)
  useEffect(() => {
    if (!animationsActive && !isSpinning) return;
    const intervalMs =
      bulbMode === 'spinning' ? 75 : bulbMode === 'landed' ? 165 : 480;
    const id = window.setInterval(() => {
      setBulbPhase((prev) => (prev + 1) % BULB_COUNT);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [animationsActive, bulbMode, isSpinning]);

  const startSpin = useCallback(() => {
    if (isSpinning) return;

    // Immediate tactile feedback + unlock Web Audio cleanly on user tap & duck background music
    haptics.wheelSpinStart();
    emitModinoEvent('spin', { force: true });
    audioRef.current?.unlock();
    bgMusicPlayer.beginWheelSpin();
    trackEvent('wheel_spun', 'Spin the Wheel');

    if (landedTimeoutRef.current !== null) {
      window.clearTimeout(landedTimeoutRef.current);
      landedTimeoutRef.current = null;
    }

    // Physical center-hub depression feedback
    setHubPressed(true);
    window.setTimeout(() => setHubPressed(false), 170);

    const plan: RiggedSpinPlan = computeRiggedSpinPlan(
      currentAngleRef.current,
      lastTrollIndexRef.current,
    );

    setIsSpinning(true);
    setBulbMode('spinning');

    const totalDurationMs = plan.totalDurationMs;
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let prevAngle = plan.startAngleDeg;
    let lastPegIdx = getPegCrossingIndex(prevAngle);
    flapperStateRef.current = { angleDeg: 0, velocityDegPerSec: 0 };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const dtSec = Math.max(0.001, (now - lastFrameTime) / 1000);
      lastFrameTime = now;

      const angle = evaluateWheelAngle(plan, elapsed);
      const wheelSpeed = (angle - prevAngle) / dtSec;
      const speedNorm = Math.min(1, Math.max(0, Math.abs(wheelSpeed) / 920));

      // Detect every peg crossing under 12 o'clock in real time
      const currentPegIdx = getPegCrossingIndex(angle);
      if (currentPegIdx > lastPegIdx && elapsed < totalDurationMs - SPIN_RECOIL_DURATION_MS + 20) {
        lastPegIdx = currentPegIdx;
        flapperStateRef.current = applyFlapperImpulse(flapperStateRef.current, wheelSpeed);
        try {
          const playedUiTick = playUiSfx('wheel_tick');
          if (!playedUiTick) {
            audioRef.current?.playPegTick(speedNorm);
          }
        } catch {
          // silent
        }
        try {
          haptics.wheelPegTick();
        } catch {
          // silent
        }
      } else if (elapsed < plan.decelDurationMs) {
        // Physical peg-contact bend down to -34° during the slow suspense crawl
        flapperStateRef.current = applyCrawlPegBend(flapperStateRef.current, angle, wheelSpeed);
      }

      // Step flapper damped spring physics on every frame
      flapperStateRef.current = stepFlapperSpring(flapperStateRef.current, dtSec);

      // Apply GPU-composited transforms directly to DOM nodes for locked 60fps
      if (wheelDiscRef.current) {
        wheelDiscRef.current.style.transform = `rotate3d(0, 0, 1, ${angle.toFixed(3)}deg)`;
      }
      if (flapperRef.current) {
        flapperRef.current.style.transform = `rotate3d(0, 0, 1, ${flapperStateRef.current.angleDeg.toFixed(2)}deg)`;
      }
      if (wheelGlowRef.current) {
        const glowOpacity = speedNorm > 0.25 ? Math.min(0.85, speedNorm * 0.9) : 0;
        wheelGlowRef.current.style.opacity = glowOpacity.toFixed(2);
      }

      currentAngleRef.current = angle;
      prevAngle = angle;

      if (elapsed < totalDurationMs) {
        rafIdRef.current = window.requestAnimationFrame(tick);
        return;
      }

      // Final exact settle — lock angle and read actual slice under 12 o'clock for 100% alignment guarantee
      const settledAngle = plan.targetAngleDeg;
      currentAngleRef.current = settledAngle;
      if (wheelDiscRef.current) {
        wheelDiscRef.current.style.transform = `rotate3d(0, 0, 1, ${settledAngle.toFixed(3)}deg)`;
      }
      if (flapperRef.current) {
        flapperRef.current.style.transform = 'rotate3d(0, 0, 1, 0deg)';
      }
      if (wheelGlowRef.current) {
        wheelGlowRef.current.style.opacity = '0';
      }
      flapperStateRef.current = { angleDeg: 0, velocityDegPerSec: 0 };
      rafIdRef.current = null;

      const visualSliceIndex = getSliceIndexAtTop(settledAngle);
      const winningSlice = WHEEL_SLICES[visualSliceIndex];
      lastTrollIndexRef.current = visualSliceIndex;

      audioRef.current?.playWompBoing();
      try {
        haptics.celebrate();
      } catch {
        // silent
      }
      emitModinoEvent('spin', { force: true });
      bgMusicPlayer.endWheelSpin();
      trackEvent('wheel_landed', 'Spin the Wheel Result', {
        result: winningSlice.label,
      });

      setSpinsTried((prev) => {
        const nextCount = prev + 1;
        setLandedResult({
          slice: winningSlice,
          spinId: nextCount,
          particles: buildOutcomeParticles(winningSlice, nextCount),
        });
        return nextCount;
      });
      setIsSpinning(false);
      setBulbMode('landed');

      landedTimeoutRef.current = window.setTimeout(() => {
        setBulbMode('idle');
      }, 2600);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  }, [isSpinning]);

  const getBulbStyle = (idx: number) => {
    if (bulbMode === 'spinning') {
      const dist = (idx - bulbPhase + BULB_COUNT) % BULB_COUNT;
      const isBright = dist % 4 === 0 || dist % 4 === 1;
      return {
        fill: isBright ? '#FFFDF8' : '#F3A8C8',
        glow: isBright,
        r: isBright ? 4.3 : 3.2,
      };
    }
    if (bulbMode === 'landed') {
      const isEven = (idx + bulbPhase) % 2 === 0;
      return {
        fill: isEven ? '#FFE898' : '#FFFDF8',
        glow: isEven,
        r: isEven ? 4.4 : 3.4,
      };
    }
    // Idle slow sparkle chase
    const isLit = (idx + bulbPhase) % 3 === 0;
    return {
      fill: isLit ? '#FFE898' : '#FFF4F9',
      glow: isLit,
      r: isLit ? 3.9 : 3.1,
    };
  };

  return (
    <section
      ref={sectionRef}
      id="wheel"
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] scroll-mt-16 overflow-x-hidden bg-transparent py-14 sm:py-20 ${
        animationsActive ? '' : 'anim-paused'
      }`}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center">
          <p className="text-sm font-semibold text-[#C2377E]">
            Birthday Prize Wheel 🎡🎁
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl lg:text-5xl">
            Spin for Your Birthday Gift! 🎡✨
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-base leading-relaxed text-[#5E2E57]">
            Totally fair and definitely not rigged. Go ahead, try your luck.
          </p>
        </div>

        {/* Main Wheel Card */}
        <div className="relative mt-9 overflow-hidden rounded-[2rem] border-2 border-[#ECC9E4] bg-gradient-to-b from-[#FFFDF8] via-[#FFF6FA] to-[#F6F0FF] px-4 pt-9 pb-8 shadow-[0_24px_56px_-26px_rgba(59,21,53,0.24)] sm:px-8 sm:pt-11 sm:pb-10">
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-5 left-5 h-5 w-5 text-[#E04D92]/75"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-6 right-6 h-5 w-5 text-[#9A7CE8]/75"
            style={{ animationDelay: '0.8s' }}
          />

          {/* Responsive Wheel Assembly (max-width: 330px, zero overflow) */}
          <div
            data-testid="birthday-spin-wheel"
            className="relative mx-auto w-full max-w-[330px] pt-3 select-none"
          >
            {/* Subtle launch speed aura behind the wheel */}
            <div
              ref={wheelGlowRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 rounded-full bg-gradient-to-tr from-[#FF9ECB]/55 via-[#FFE898]/55 to-[#C7B0FF]/55 opacity-0 blur-xl transition-opacity duration-150"
            />

            {/* Spring-loaded Glossy Deep-Berry Flapper Pointer at 12 o'clock */}
            <div
              ref={flapperRef}
              data-testid="wheel-flapper"
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-1/2 z-30 h-14 w-11 -translate-x-1/2 origin-[50%_12px]"
            >
              <svg
                viewBox="0 0 44 56"
                fill="none"
                className="h-full w-full drop-shadow-[0_6px_10px_rgba(59,21,53,0.38)]"
              >
                <defs>
                  <linearGradient id="flapperBerry" x1="10" y1="6" x2="34" y2="52" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#7C276B" />
                    <stop offset="48%" stopColor="#4A1742" />
                    <stop offset="100%" stopColor="#2C0D28" />
                  </linearGradient>
                  <radialGradient id="goldPin" cx="35%" cy="32%" r="68%">
                    <stop offset="0%" stopColor="#FFFDF4" />
                    <stop offset="45%" stopColor="#FFE082" />
                    <stop offset="100%" stopColor="#B87A2B" />
                  </radialGradient>
                </defs>
                {/* Teardrop / carnival flapper body */}
                <path
                  d="M22 4C14.8 4 9.5 9.6 10.2 16.7C11 24.8 18.8 44.2 21.1 50.6C21.4 51.5 22.6 51.5 22.9 50.6C25.2 44.2 33 24.8 33.8 16.7C34.5 9.6 29.2 4 22 4Z"
                  fill="url(#flapperBerry)"
                  stroke="#FFE898"
                  strokeWidth="2.2"
                />
                {/* Gloss highlight */}
                <path
                  d="M16 14C16.6 20 19.2 30 20.8 36"
                  stroke="#FFFFFF"
                  strokeOpacity="0.32"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {/* Gold pivot pin */}
                <circle cx="22" cy="14" r="5.5" fill="url(#goldPin)" stroke="#3B1535" strokeWidth="1.2" />
                <circle cx="20.4" cy="12.4" r="1.4" fill="#FFFFFF" fillOpacity="0.85" />
              </svg>
            </div>

            {/* Wheel SVG + Interactive 3D Pastel Hub */}
            <div className="relative aspect-square w-full">
              <svg
                viewBox="0 0 360 360"
                className="h-full w-full drop-shadow-[0_18px_32px_rgba(59,21,53,0.2)]"
                role="img"
                aria-label="Rigged birthday prize wheel with 10 alternating gift and joke slices"
              >
                <defs>
                  {/* Glossy pastel rose-gold outer rim gradient */}
                  <linearGradient id="roseGoldRim" x1="20" y1="20" x2="340" y2="340" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FAD2E2" />
                    <stop offset="28%" stopColor="#E598B9" />
                    <stop offset="52%" stopColor="#FFEBF3" />
                    <stop offset="78%" stopColor="#D67EA5" />
                    <stop offset="100%" stopColor="#F7BDD5" />
                  </linearGradient>

                  {/* Shiny metallic peg gradient */}
                  <radialGradient id="metallicPeg" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="#FFE8A8" />
                    <stop offset="100%" stopColor="#B47244" />
                  </radialGradient>

                  {/* Bulb soft halo */}
                  <filter id="bulbGlow" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="2.4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Glossy Pastel Rose-Gold Outer Rim */}
                <circle
                  cx={WHEEL_CX}
                  cy={WHEEL_CY}
                  r={174}
                  fill="url(#roseGoldRim)"
                  stroke="#B85D88"
                  strokeWidth="2.5"
                />
                <circle
                  cx={WHEEL_CX}
                  cy={WHEEL_CY}
                  r={169}
                  fill="none"
                  stroke="#FFFDF8"
                  strokeOpacity="0.65"
                  strokeWidth="1.5"
                />

                {/* 20 Chasing Fairy / Carnival Bulbs */}
                <g data-testid="wheel-bulbs">
                  {bulbCoords.map((pos, idx) => {
                    const style = getBulbStyle(idx);
                    return (
                      <g key={`bulb-${idx}`}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={style.r + 1.1}
                          fill="#3B1535"
                          fillOpacity="0.22"
                        />
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={style.r}
                          fill={style.fill}
                          filter={style.glow ? 'url(#bulbGlow)' : undefined}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Inner rim bevel ring */}
                <circle
                  cx={WHEEL_CX}
                  cy={WHEEL_CY}
                  r={WHEEL_RADIUS + 3}
                  fill="#3B1535"
                  fillOpacity="0.12"
                />

                {/* Rotating 60fps Wheel Disc (Slices + Radial Text + 10 Border Pegs) */}
                <g
                  ref={wheelDiscRef}
                  data-testid="wheel-disc"
                  style={{ transformOrigin: `${WHEEL_CX}px ${WHEEL_CY}px` }}
                >
                  {sliceGeometries.map(({ slice, path, midDeg, fontSize }) => (
                    <g key={slice.index}>
                      <path
                        d={path}
                        fill={slice.fill}
                        stroke="#D9A8C9"
                        strokeWidth="1.4"
                      />
                      <g transform={`rotate(${midDeg - 90} ${WHEEL_CX} ${WHEEL_CY})`}>
                        <text
                          x={WHEEL_CX + WHEEL_RADIUS - 14}
                          y={WHEEL_CY}
                          fill={slice.textColor}
                          fontSize={fontSize}
                          fontWeight="700"
                          fontFamily="Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, sans-serif"
                          textAnchor="end"
                          dominantBaseline="central"
                        >
                          {slice.label}
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* Inner decorative ring */}
                  <circle
                    cx={WHEEL_CX}
                    cy={WHEEL_CY}
                    r={WHEEL_RADIUS}
                    fill="none"
                    stroke="#C7739E"
                    strokeWidth="2.2"
                  />

                  {/* 10 Shiny Metallic Pegs on every slice border */}
                  {pegCoords.map((pos, idx) => (
                    <g key={`peg-${idx}`} data-testid="wheel-peg">
                      <circle
                        cx={pos.x}
                        cy={pos.y + 1.2}
                        r={4.8}
                        fill="#3B1535"
                        fillOpacity="0.24"
                      />
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={4.5}
                        fill="url(#metallicPeg)"
                        stroke="#8C4A6B"
                        strokeWidth="0.9"
                      />
                    </g>
                  ))}
                </g>
              </svg>

              {/* Tactile 3D-Styled Pastel Center "SPIN" Hub Button */}
              <button
                type="button"
                onClick={startSpin}
                disabled={isSpinning}
                aria-label="Spin the birthday gift wheel"
                data-testid="wheel-hub-spin-btn"
                className={`absolute top-1/2 left-1/2 z-20 flex h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[4px] border-[#F6BFD5] bg-gradient-to-b from-[#FFFDF8] via-[#FFE4F0] to-[#F4B4D1] text-sm font-extrabold tracking-wider text-[#3B1535] shadow-[0_8px_18px_-4px_rgba(59,21,53,0.42),inset_0_3px_5px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(194,55,126,0.28)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E] ${
                  isSpinning
                    ? 'cursor-not-allowed opacity-90'
                    : 'cursor-pointer hover:brightness-105 active:scale-[0.92]'
                } ${hubPressed ? 'scale-[0.92]' : 'scale-100'}`}
              >
                <span className="drop-shadow-[0_1px_0_rgba(255,255,255,0.85)]">
                  {isSpinning ? '✨' : 'SPIN'}
                </span>
              </button>
            </div>
          </div>

          {/* Primary Bouncy Spin CTA underneath */}
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={startSpin}
              disabled={isSpinning}
              data-testid="wheel-cta-spin-btn"
              className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border-2 border-[#FFE898] bg-[#3B1535] px-8 py-3 text-sm font-semibold text-[#FFFDF8] shadow-[0_14px_28px_-10px_rgba(59,21,53,0.48)] transition-all duration-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E] sm:text-base ${
                isSpinning
                  ? 'cursor-not-allowed opacity-75'
                  : 'cursor-pointer hover:-translate-y-0.5 hover:bg-[#57214F] active:scale-95'
              }`}
            >
              <span>{isSpinning ? 'Spinning the Wheel... 🎡' : 'Spin the Wheel! 🎰'}</span>
            </button>
          </div>

          {/* Animated Result Pop-Up Card with Floating Outcome Emojis */}
          {landedResult && (
            <div
              key={landedResult.spinId}
              data-testid="wheel-result-card"
              role="status"
              aria-live="polite"
              className="animate-result-shake relative mx-auto mt-6 max-w-md rounded-3xl border-2 border-[#F1B7D8] bg-[#FFFDF8] p-5 text-center shadow-[0_18px_40px_-20px_rgba(194,55,126,0.38)] sm:p-6"
            >
              {/* Floating outcome emoji burst particles */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 z-20"
              >
                {landedResult.particles.map((p) => {
                  const style = {
                    '--wx': p.x,
                    '--wy': p.y,
                    '--wr': p.rot,
                    animationDelay: p.delay,
                  } as CSSProperties;
                  return (
                    <span
                      key={p.id}
                      style={style}
                      className="animate-wheel-emoji-burst absolute -top-3 -left-3 text-xl leading-none select-none sm:text-2xl"
                    >
                      {p.emoji}
                    </span>
                  );
                })}
              </div>

              <span className="inline-flex items-center rounded-full border border-[#F2C3DA] bg-[#FFE4F0] px-3.5 py-1 text-xs font-bold text-[#3B1535]">
                Your Prize
              </span>
              <h3
                data-testid="wheel-result-label"
                className="font-display mt-2.5 text-2xl font-bold text-[#3B1535] sm:text-3xl"
              >
                {landedResult.slice.label}
              </h3>
              <p
                data-testid="wheel-result-message"
                className="mt-2 text-sm leading-relaxed font-medium text-[#5E2E57] sm:text-base"
              >
                {landedResult.slice.resultMessage}
              </p>
            </div>
          )}

          {/* Live Spin Counter + Cheeky 3+ Spins Note */}
          <div className="mt-6 text-center">
            <p
              data-testid="wheel-spin-counter"
              className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#EAD5EB] bg-[#FFFDF8]/90 px-4 py-2 text-xs font-bold text-[#3B1535] shadow-xs sm:text-sm"
            >
              <span>Spins tried: {spinsTried}</span>
              <span aria-hidden="true" className="text-[#C2377E]">
                &bull;
              </span>
              <span>Actual gifts won: 0 💀</span>
            </p>

            {spinsTried >= 3 && (
              <p
                data-testid="wheel-cheeky-note"
                className="animate-pop-in mt-2.5 text-xs font-semibold text-[#C2377E] sm:text-sm"
              >
                Keep spinning, maybe the next one is the iPhone 👀
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
