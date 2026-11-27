import { useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import {
  CANDLE_SPECS,
  getBlowOutCompleteDelayMs,
  getRelightCompleteDelayMs,
  type CandleAnimPhase,
} from '../utils/candleAnimation';
import {
  blowOutCandles,
  createInitialCakeState,
  relightCandles,
} from '../utils/celebration';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

interface MakeAWishCakeProps {
  onBlowOutConfetti: (originX?: number, originY?: number) => void;
}

const BLOW_OUT_COMPLETE_MS = getBlowOutCompleteDelayMs(CANDLE_SPECS);
const RELIGHT_COMPLETE_MS = getRelightCompleteDelayMs(CANDLE_SPECS);

function CandleFlameButtonSvg({ className = 'h-4 w-4' }: { className?: string }) {
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
      <path d="M12 3.5c2.2 2.8 4.4 5.4 4.4 8.6a4.4 4.4 0 1 1-8.8 0c0-3.2 2.2-5.8 4.4-8.6Z" />
      <path d="M12 16.5v4" />
      <path d="M9.5 20.5h5" />
    </svg>
  );
}

function KeepsakeSealFlourishSvg({ className = 'h-6 w-14' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 12H21"
        stroke="#DFB889"
        strokeOpacity="0.65"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M43 12H60"
        stroke="#DFB889"
        strokeOpacity="0.65"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle
        cx="32"
        cy="12"
        r="8.5"
        fill="#FCEAF1"
        stroke="#D94B7D"
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="12"
        r="6"
        fill="none"
        stroke="#DFB889"
        strokeOpacity="0.7"
        strokeWidth="0.75"
      />
      <path
        d="M32 7.8L33.1 10.9L36.2 12L33.1 13.1L32 16.2L30.9 13.1L27.8 12L30.9 10.9L32 7.8Z"
        fill="#D94B7D"
        fillOpacity="0.82"
      />
    </svg>
  );
}

function SubtleGoldAccentStarSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5L9.55 6.45L14.5 8L9.55 9.55L8 14.5L6.45 9.55L1.5 8L6.45 6.45L8 1.5Z"
        fill="#D9A85C"
      />
    </svg>
  );
}

const SOFT_CANDLE_PALETTE = [
  { bodyStart: '#F8D4E4', bodyEnd: '#E8A8C6', stripe: '#F5E1B8' },
  { bodyStart: '#F7E7C8', bodyEnd: '#E6C68E', stripe: '#FFFFFF' },
  { bodyStart: '#E8DCF8', bodyEnd: '#CEB6EC', stripe: '#FFF4DA' },
  { bodyStart: '#F7E7C8', bodyEnd: '#E6C68E', stripe: '#FFFFFF' },
  { bodyStart: '#F8D4E4', bodyEnd: '#E8A8C6', stripe: '#F5E1B8' },
] as const;

const PEARL_SPRINKLES = [
  { cx: 122, cy: 152, r: 3.1, fill: '#E48AB2' },
  { cx: 147, cy: 155, r: 2.7, fill: '#E8C589' },
  { cx: 180, cy: 150, r: 3.0, fill: '#C7B0E6' },
  { cx: 213, cy: 155, r: 2.7, fill: '#E8C589' },
  { cx: 238, cy: 152, r: 3.1, fill: '#E48AB2' },
  { cx: 103, cy: 205, r: 3.1, fill: '#E48AB2' },
  { cx: 132, cy: 213, r: 2.8, fill: '#E8C589' },
  { cx: 148, cy: 196, r: 2.5, fill: '#C7B0E6' },
  { cx: 212, cy: 196, r: 2.5, fill: '#C7B0E6' },
  { cx: 228, cy: 213, r: 2.8, fill: '#E8C589' },
  { cx: 257, cy: 205, r: 3.1, fill: '#E48AB2' },
] as const;

export function MakeAWishCake({ onBlowOutConfetti }: MakeAWishCakeProps) {
  const svgPrefix = useId().replace(/:/g, '');
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef);
  const [cake, setCake] = useState(createInitialCakeState);
  const [animPhase, setAnimPhase] = useState<CandleAnimPhase>('lit');
  const [seqId, setSeqId] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleBlowOut = (e: MouseEvent<HTMLButtonElement>) => {
    if (animPhase === 'blowing' || !cake.candlesLit) return;
    clearPendingTimer();

    const rect = e.currentTarget.getBoundingClientRect();
    soundEngine.playCakeBlowout();
    haptics.cakeBlowout();
    bgMusicPlayer.triggerCelebrationSwell();
    trackEvent('cake_candles_blown', 'Make a Wish Cake');
    setSeqId((s) => s + 1);
    setAnimPhase('blowing');
    onBlowOutConfetti(rect.left + rect.width / 2, rect.top);

    // Flames lean right in a ~0.25s left-to-right wind gust, then vanish into glowing embers + curling smoke
    timerRef.current = window.setTimeout(() => {
      setCake((prev) => blowOutCandles(prev));
      setAnimPhase('out');
      timerRef.current = null;
    }, BLOW_OUT_COMPLETE_MS);
  };

  const handleRelight = () => {
    if (animPhase === 'relighting') return;
    clearPendingTimer();
    haptics.tap();
    soundEngine.playBubbleClick(1.12);
    setCake((prev) => relightCandles(prev));
    setSeqId((s) => s + 1);
    setAnimPhase('relighting');

    // Transition seamlessly into continuous organic flame dance after left-to-right 100ms-staggered ignition completes
    timerRef.current = window.setTimeout(() => {
      setAnimPhase('lit');
      timerRef.current = null;
    }, RELIGHT_COMPLETE_MS);
  };

  const frostingGlowClass =
    animPhase === 'lit'
      ? 'animate-frosting-glow'
      : animPhase === 'blowing'
        ? 'animate-frosting-blowout'
        : animPhase === 'relighting'
          ? 'animate-frosting-ignite'
          : null;

  return (
    <section
      ref={sectionRef}
      id="make-a-wish"
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-18 ${
        animationsActive ? '' : 'anim-paused'
      }`}
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="cake-stage"
          data-candles-lit={String(cake.candlesLit)}
          data-candle-phase={animPhase}
          className="relative overflow-hidden rounded-[2rem] border border-[#EED0DF] bg-[#FFFDFB] px-6 py-10 text-center shadow-[0_24px_56px_-28px_rgba(58,18,51,0.18)] sm:px-12 sm:py-12"
        >
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#C43D6E] uppercase">
            Make a Wish
          </p>
          <h2 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            Make a 17th birthday wish, Morgan!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B3B64] sm:text-base">
            {cake.candlesLit
              ? 'Tap the cake or button to blow out the candles (maybe wish for a couple extra inches of height 👀).'
              : 'Candles out! Hope 17 is your best year yet.'}
          </p>

          {/* Soft Illustrated 2-Tier Bakery Cake SVG (Zero Thick Black Outlines) */}
          <div className="relative mx-auto mt-5 flex max-w-sm flex-col items-center">
            <button
              type="button"
              data-testid="cake-svg-button"
              onClick={cake.candlesLit ? handleBlowOut : handleRelight}
              aria-label={
                cake.candlesLit
                  ? '17th birthday cake with lit candles, tap to blow them out'
                  : '17th birthday cake with blown out candles, tap to relight'
              }
              className="group relative cursor-pointer rounded-3xl p-2 transition-transform duration-200 hover:scale-[1.015] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D]"
            >
              <svg
                viewBox="0 0 360 294"
                fill="none"
                data-testid="bakery-cake-svg"
                className="h-auto w-72 sm:w-84"
              >
                <defs>
                  {/* Soft warm ground shadow under ceramic pedestal */}
                  <radialGradient id={`${svgPrefix}-groundShadow`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#5A284C" stopOpacity="0.2" />
                    <stop offset="62%" stopColor="#5A284C" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#5A284C" stopOpacity="0" />
                  </radialGradient>

                  {/* Ceramic pedestal plate surface */}
                  <linearGradient id={`${svgPrefix}-standPlate`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F3E5EC" />
                    <stop offset="30%" stopColor="#FFFDFB" />
                    <stop offset="72%" stopColor="#FAF1F5" />
                    <stop offset="100%" stopColor="#EAD6E0" />
                  </linearGradient>

                  {/* Ceramic pedestal stem & curved foot */}
                  <linearGradient id={`${svgPrefix}-standFoot`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E6D2DC" />
                    <stop offset="38%" stopColor="#FFFBF8" />
                    <stop offset="72%" stopColor="#F5E7EE" />
                    <stop offset="100%" stopColor="#DEC6D2" />
                  </linearGradient>

                  {/* Bottom vanilla-cream tier shading */}
                  <linearGradient id={`${svgPrefix}-bottomTier`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F8E4EC" />
                    <stop offset="22%" stopColor="#FFFBF7" />
                    <stop offset="66%" stopColor="#FFF7F2" />
                    <stop offset="100%" stopColor="#F3DCE6" />
                  </linearGradient>

                  {/* Glossy berry-pink drip gradient */}
                  <linearGradient id={`${svgPrefix}-berryDrip`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F8B4D0" />
                    <stop offset="55%" stopColor="#EE8BB6" />
                    <stop offset="100%" stopColor="#DE6F9F" />
                  </linearGradient>

                  {/* Top soft pastel strawberry tier shading */}
                  <linearGradient id={`${svgPrefix}-topTier`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F4C3D8" />
                    <stop offset="24%" stopColor="#FDEAF2" />
                    <stop offset="68%" stopColor="#FCE0EC" />
                    <stop offset="100%" stopColor="#EFAEC9" />
                  </linearGradient>

                  {/* Glossy warm buttercream top frosting drip */}
                  <linearGradient id={`${svgPrefix}-butterDrip`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFDF4" />
                    <stop offset="55%" stopColor="#FCEEC9" />
                    <stop offset="100%" stopColor="#F3D99E" />
                  </linearGradient>

                  {/* Refined gold medallion ring */}
                  <linearGradient id={`${svgPrefix}-goldRim`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F4DC9E" />
                    <stop offset="50%" stopColor="#D7A75A" />
                    <stop offset="100%" stopColor="#F1D596" />
                  </linearGradient>

                  {/* Warm golden-orange outer flame aura */}
                  <radialGradient id={`${svgPrefix}-flameAura`} cx="50%" cy="55%" r="50%">
                    <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.88" />
                    <stop offset="48%" stopColor="#FF9E3D" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FF7A1F" stopOpacity="0" />
                  </radialGradient>

                  {/* Rich amber-orange outer flame teardrop */}
                  <linearGradient id={`${svgPrefix}-flameOuter`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFF2A8" />
                    <stop offset="38%" stopColor="#FFA940" />
                    <stop offset="85%" stopColor="#F0682A" />
                    <stop offset="100%" stopColor="#C94632" />
                  </linearGradient>

                  {/* Bright cream-white inner flame core */}
                  <linearGradient id={`${svgPrefix}-flameCore`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="68%" stopColor="#FFF7CC" />
                    <stop offset="100%" stopColor="#FFD266" />
                  </linearGradient>

                  {/* Glowing orange ember halo on freshly extinguished wicks */}
                  <radialGradient id={`${svgPrefix}-emberHalo`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF7A2F" stopOpacity="0.85" />
                    <stop offset="55%" stopColor="#FF4F1F" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#FF4F1F" stopOpacity="0" />
                  </radialGradient>

                  {/* Flickering warm candlelight cast across the top frosting */}
                  <radialGradient id={`${svgPrefix}-frostingWash`} cx="50%" cy="22%" r="60%">
                    <stop offset="0%" stopColor="#FFD978" stopOpacity="0.65" />
                    <stop offset="55%" stopColor="#FFB866" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#FF9E44" stopOpacity="0" />
                  </radialGradient>

                  {/* Soft pastel candle body gradients */}
                  {SOFT_CANDLE_PALETTE.map((pal, idx) => (
                    <linearGradient
                      key={idx}
                      id={`${svgPrefix}-candle-${idx}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor={pal.bodyEnd} />
                      <stop offset="35%" stopColor={pal.bodyStart} />
                      <stop offset="100%" stopColor={pal.bodyEnd} />
                    </linearGradient>
                  ))}
                </defs>

                {/* Ground Shadow Under Ceramic Stand */}
                <ellipse
                  cx="180"
                  cy="279"
                  rx="118"
                  ry="10"
                  fill={`url(#${svgPrefix}-groundShadow)`}
                />

                {/* Ceramic Pedestal Foot & Curved Stem */}
                <path
                  d="M161 251H199C198 263 206 270 220 274C223 275 222 279 218 279H142C138 279 137 275 140 274C154 270 162 263 161 251Z"
                  fill={`url(#${svgPrefix}-standFoot)`}
                />
                {/* Soft shadow directly beneath plate lip */}
                <ellipse cx="180" cy="255" rx="52" ry="5" fill="#9E6E89" fillOpacity="0.2" />

                {/* Ceramic Pedestal Plate Rim */}
                <ellipse
                  cx="180"
                  cy="249"
                  rx="132"
                  ry="14"
                  fill="#E4CED9"
                />
                <ellipse
                  cx="180"
                  cy="246.5"
                  rx="130"
                  ry="12.5"
                  fill={`url(#${svgPrefix}-standPlate)`}
                />
                {/* Subtle ivory plate rim specular sheen */}
                <ellipse
                  cx="180"
                  cy="246"
                  rx="112"
                  ry="7.5"
                  fill="#FFFFFF"
                  fillOpacity="0.6"
                />

                {/* Soft contact shadow beneath Bottom Tier */}
                <ellipse cx="180" cy="245" rx="105" ry="7.5" fill="#A66D8A" fillOpacity="0.18" />

                {/* Bottom Tier (Plush Vanilla-Cream Sponge) */}
                <rect
                  x="76"
                  y="170"
                  width="208"
                  height="76"
                  rx="16"
                  fill={`url(#${svgPrefix}-bottomTier)`}
                />
                {/* Soft delicate satin ribbon trim around bottom edge */}
                <rect
                  x="76"
                  y="224"
                  width="208"
                  height="11"
                  fill="#F3D8E6"
                  fillOpacity="0.72"
                />
                <line
                  x1="78"
                  y1="224"
                  x2="282"
                  y2="224"
                  stroke="#E5B7CE"
                  strokeOpacity="0.55"
                  strokeWidth="1"
                />
                {/* Vertical soft studio light highlight on left curve */}
                <rect
                  x="88"
                  y="186"
                  width="14"
                  height="52"
                  rx="7"
                  fill="#FFFFFF"
                  fillOpacity="0.52"
                />

                {/* Bottom Tier Glossy Scalloped Berry-Pink Frosting Drip */}
                <path
                  d="M76 184C84 195 96 195 104 184C112 174 123 197 134 185C144 174 156 196 168 184C178 174 190 197 202 185C212 174 224 196 236 184C246 174 258 195 268 185C274 179 280 181 284 185V174C284 167 277 162 269 162H91C83 162 76 167 76 174V184Z"
                  fill={`url(#${svgPrefix}-berryDrip)`}
                />
                {/* Glossy specular curved glints along berry frosting rim */}
                <path
                  d="M93 169H236"
                  stroke="#FFFFFF"
                  strokeOpacity="0.55"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <circle cx="94" cy="186" r="2.2" fill="#FFFFFF" fillOpacity="0.5" />
                <circle cx="132" cy="187" r="2" fill="#FFFFFF" fillOpacity="0.45" />
                <circle cx="201" cy="187" r="2" fill="#FFFFFF" fillOpacity="0.45" />

                {/* Soft Cast Shadow of Top Tier onto Bottom Tier */}
                <ellipse cx="180" cy="166" rx="79" ry="7" fill="#B55B86" fillOpacity="0.2" />

                {/* Top Tier (Soft Pastel Strawberry Sponge) */}
                <rect
                  x="104"
                  y="110"
                  width="152"
                  height="58"
                  rx="14"
                  fill={`url(#${svgPrefix}-topTier)`}
                />
                {/* Soft left curve light highlight */}
                <rect
                  x="114"
                  y="124"
                  width="11"
                  height="38"
                  rx="5.5"
                  fill="#FFFFFF"
                  fillOpacity="0.48"
                />

                {/* Top Tier Smooth Buttercream Frosting Drip */}
                <path
                  d="M104 124C112 135 124 135 133 124C142 114 153 136 164 124C174 114 186 136 197 124C207 114 218 135 229 124C238 115 248 130 256 123V114C256 107 249 102 241 102H119C111 102 104 107 104 114V124Z"
                  fill={`url(#${svgPrefix}-butterDrip)`}
                />
                {/* Soft white glossy highlight on buttercream rim */}
                <path
                  d="M120 109H224"
                  stroke="#FFFFFF"
                  strokeOpacity="0.78"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
                <circle cx="122" cy="126" r="1.9" fill="#FFFFFF" fillOpacity="0.65" />
                <circle cx="196" cy="126" r="1.8" fill="#FFFFFF" fillOpacity="0.6" />

                {/* Warm flickering candlelight glow cast onto top frosting (syncs with blow-out & relight) */}
                {frostingGlowClass && (
                  <ellipse
                    key={`frosting-glow-${animPhase}-${seqId}`}
                    cx="180"
                    cy="110"
                    rx="84"
                    ry="20"
                    fill={`url(#${svgPrefix}-frostingWash)`}
                    className={`${frostingGlowClass} pointer-events-none`}
                  />
                )}

                {/* Refined Gold-Rimmed "17" Fondant Medallion on Bottom Tier */}
                <g>
                  <circle cx="180" cy="209" r="19.5" fill="#B57A96" fillOpacity="0.16" />
                  <circle
                    cx="180"
                    cy="207"
                    r="18.5"
                    fill="#FFFDF9"
                    stroke={`url(#${svgPrefix}-goldRim)`}
                    strokeWidth="2.2"
                  />
                  <circle
                    cx="180"
                    cy="207"
                    r="15"
                    fill="none"
                    stroke="#E8C892"
                    strokeOpacity="0.55"
                    strokeWidth="0.9"
                  />
                  <text
                    x="180"
                    y="212.5"
                    textAnchor="middle"
                    fill="#3A1233"
                    fontSize="15.5"
                    fontWeight="700"
                    fontFamily="Fraunces, Georgia, serif"
                  >
                    17
                  </text>
                </g>

                {/* Delicate Pastel Pearl Sprinkles with Tiny Specular Glints */}
                {PEARL_SPRINKLES.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.cx} cy={p.cy + 0.8} r={p.r} fill="#7B4362" fillOpacity="0.12" />
                    <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.fill} />
                    <circle
                      cx={p.cx - p.r * 0.32}
                      cy={p.cy - p.r * 0.32}
                      r={p.r * 0.34}
                      fill="#FFFFFF"
                      fillOpacity="0.78"
                    />
                  </g>
                ))}

                {/* 5 Slender Striped Pastel-and-Gold Tapered Candles (Zero Thick Black Strokes) */}
                {CANDLE_SPECS.map((candle, idx) => {
                  const palette = SOFT_CANDLE_PALETTE[idx % SOFT_CANDLE_PALETTE.length];
                  const wickOrigin = `${candle.cx}px 54.5px`;
                  const flameStyle = {
                    '--flame-dur': candle.flameDur,
                    '--flame-delay': candle.flameDelay,
                    transformOrigin: wickOrigin,
                  } as CSSProperties;

                  const coreStyle = {
                    '--flame-dur': candle.flameDur,
                    '--flame-delay': candle.flameDelay,
                    transformOrigin: `${candle.cx}px 53px`,
                  } as CSSProperties;

                  const auraStyle = {
                    '--flame-dur': candle.flameDur,
                    '--flame-delay': candle.flameDelay,
                    transformOrigin: `${candle.cx}px 41px`,
                  } as CSSProperties;

                  const phaseGroupStyle: CSSProperties = {
                    transformOrigin: wickOrigin,
                    ...(animPhase === 'blowing'
                      ? { animationDelay: `${candle.gustDelayMs}ms` }
                      : animPhase === 'relighting'
                        ? { animationDelay: `${candle.relightDelayMs}ms` }
                        : {}),
                  };

                  return (
                    <g key={candle.id} data-candle-id={candle.id}>
                      {/* Soft candle base wax collar resting on frosting */}
                      <ellipse
                        cx={candle.cx}
                        cy={104.5}
                        rx={6}
                        ry={2.2}
                        fill="#D4A6BB"
                        fillOpacity="0.32"
                      />

                      {/* Slender tapered candle silhouette */}
                      <path
                        d={`M${candle.cx - 4.2} 65.5 C${candle.cx - 4.2} 63.8 ${candle.cx + 4.2} 63.8 ${candle.cx + 4.2} 65.5 L${candle.cx + 4.8} 104 C${candle.cx + 4.8} 105.6 ${candle.cx - 4.8} 105.6 ${candle.cx - 4.8} 104 Z`}
                        fill={`url(#${svgPrefix}-candle-${idx % SOFT_CANDLE_PALETTE.length})`}
                      />

                      {/* Soft diagonal pastel-gold stripes */}
                      <path
                        d={`M${candle.cx - 4.1} 76 L${candle.cx + 4.2} 71.5 M${candle.cx - 4.3} 87 L${candle.cx + 4.4} 82.5 M${candle.cx - 4.5} 98 L${candle.cx + 4.6} 93.5`}
                        stroke={palette.stripe}
                        strokeOpacity="0.85"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      {/* Subtle vertical ceramic-wax sheen */}
                      <line
                        x1={candle.cx - 1.8}
                        y1={68}
                        x2={candle.cx - 2.1}
                        y2={101}
                        stroke="#FFFFFF"
                        strokeOpacity="0.58"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />

                      {/* Delicate Warm Wick */}
                      <line
                        x1={candle.cx}
                        y1={64.5}
                        x2={candle.cx}
                        y2={55.5}
                        stroke="#6B3F56"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      {/* LIT / BLOWING / RELIGHTING: 3-Layer Expressive Flame Pivoted at Wick Tip */}
                      {animPhase !== 'out' && (
                        <g
                          key={`flame-${candle.id}-${seqId}-${animPhase === 'blowing' ? 'blow' : 'live'}`}
                          data-candle-flame={candle.id}
                          className={
                            animPhase === 'blowing'
                              ? 'animate-candle-gust'
                              : animPhase === 'relighting'
                                ? 'animate-candle-ignite'
                                : undefined
                          }
                          style={phaseGroupStyle}
                        >
                          {/* Layer 1: Warm Golden-Orange Pulsing Radial Outer Aura */}
                          <circle
                            cx={candle.cx}
                            cy={41}
                            r={18.5}
                            fill={`url(#${svgPrefix}-flameAura)`}
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-aura'}
                            style={auraStyle}
                          />

                          {/* Layer 2: Organic Swaying Amber-Orange Outer Teardrop */}
                          <path
                            d={`M${candle.cx} 23 C${candle.cx + 8} 34.5 ${candle.cx + 7} 50 ${candle.cx} 54.5 C${candle.cx - 7} 50 ${candle.cx - 8} 34.5 ${candle.cx} 23 Z`}
                            fill={`url(#${svgPrefix}-flameOuter)`}
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-flame'}
                            style={flameStyle}
                          />

                          {/* Subtle hot blue-lilac wick base glint */}
                          <ellipse
                            cx={candle.cx}
                            cy={52.5}
                            rx={2.1}
                            ry={1.4}
                            fill="#B89CEB"
                            fillOpacity="0.42"
                          />

                          {/* Layer 3: Bright Cream-White Inner Core Flame */}
                          <path
                            d={`M${candle.cx} 34 C${candle.cx + 3.8} 40.5 ${candle.cx + 3.2} 49 ${candle.cx} 52.5 C${candle.cx - 3.2} 49 ${candle.cx - 3.8} 40.5 ${candle.cx} 34 Z`}
                            fill={`url(#${svgPrefix}-flameCore)`}
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-core'}
                            style={coreStyle}
                          />
                        </g>
                      )}

                      {/* RELIGHT SPARKLE POP */}
                      {animPhase === 'relighting' && (
                        <g
                          key={`spark-${candle.id}-${seqId}`}
                          className="animate-wick-sparkle"
                          style={{
                            transformOrigin: `${candle.cx}px 50px`,
                            animationDelay: `${candle.relightDelayMs}ms`,
                          }}
                        >
                          <path
                            d={`M${candle.cx} 42 L${candle.cx + 1.8} 48.2 L${candle.cx + 8} 50 L${candle.cx + 1.8} 51.8 L${candle.cx} 58 L${candle.cx - 1.8} 51.8 L${candle.cx - 8} 50 L${candle.cx - 1.8} 48.2 Z`}
                            fill="#FFF3C4"
                            stroke="#D9A85C"
                            strokeWidth="0.7"
                          />
                        </g>
                      )}

                      {/* BLOWN OUT: Glowing Orange Ember + Dual Curling Grey-Blush Smoke Wisps */}
                      {animPhase === 'out' && (
                        <g key={`out-${candle.id}-${seqId}`} data-candle-smoke={candle.id}>
                          <g
                            className="animate-wick-ember"
                            style={{ transformOrigin: `${candle.cx}px 55px` }}
                          >
                            <circle
                              cx={candle.cx}
                              cy={55}
                              r={6.2}
                              fill={`url(#${svgPrefix}-emberHalo)`}
                            />
                            <circle cx={candle.cx} cy={55} r={2.3} fill="#FF6B2B" />
                            <circle cx={candle.cx} cy={55} r={1.15} fill="#FFE898" />
                          </g>

                          {/* Primary curling grey-blush smoke wisp */}
                          <path
                            d={`M${candle.cx} 53 C${candle.cx - 7} 43 ${candle.cx + 7} 33 ${candle.cx - 2} 22 C${candle.cx - 6} 16 ${candle.cx + 4} 10 ${candle.cx + 2} 4`}
                            stroke="#C2AEB8"
                            strokeOpacity="0.68"
                            strokeWidth="2.3"
                            strokeLinecap="round"
                            fill="none"
                            className="animate-smoke-curl"
                            style={{
                              transformOrigin: `${candle.cx}px 53px`,
                              animationDelay: `${candle.smokeDelayMs}ms`,
                            }}
                          />
                          {/* Secondary softer blush-white counter-curling smoke wisp */}
                          <path
                            d={`M${candle.cx + 1} 52 C${candle.cx + 6.5} 42 ${candle.cx - 5.5} 34 ${candle.cx + 3} 23`}
                            stroke="#E8D8E0"
                            strokeOpacity="0.76"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            fill="none"
                            className="animate-smoke-curl-alt"
                            style={{
                              transformOrigin: `${candle.cx + 1}px 52px`,
                              animationDelay: `${candle.smokeDelayMs + 120}ms`,
                            }}
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {cake.candlesLit ? (
                <button
                  type="button"
                  data-testid="cake-blow-btn"
                  onClick={handleBlowOut}
                  className="btn-rose-berry inline-flex min-h-[46px] shrink-0 cursor-pointer items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                >
                  <CandleFlameButtonSvg className="h-4 w-4 text-[#FFF4DC]" />
                  <span>Blow Out Candles</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="cake-relight-btn"
                  onClick={handleRelight}
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full bg-[#FFF7FA] px-6 py-2.5 text-sm font-semibold whitespace-nowrap text-[#3A1233] transition-all duration-150 hover:bg-[#FCECF3] active:translate-y-[1px] active:shadow-none shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233]"
                  style={{
                    border: '1px solid rgba(58, 18, 51, 0.16)',
                    boxShadow:
                      '0 2px 0 rgba(58, 18, 51, 0.08), 0 8px 18px -10px rgba(58, 18, 51, 0.18)',
                  }}
                >
                  <CandleFlameButtonSvg className="h-4 w-4 text-[#D94B7D]" />
                  <span>Relight Candles</span>
                </button>
              )}
            </div>
          </div>

          {/* Warm Cream-Ivory Keepsake Birthday Wish Card (Post-Blowout) */}
          {cake.showWishPopup && (
            <div
              role="status"
              aria-live="polite"
              data-testid="cake-wish-card"
              className="animate-pop-in relative mx-auto mt-7 max-w-lg overflow-hidden rounded-[24px] px-7 py-8 text-center sm:px-10 sm:py-9"
              style={{
                background: 'linear-gradient(180deg, #FFFDF9 0%, #FFF5F8 100%)',
                border: '1px solid rgba(217, 75, 125, 0.22)',
                boxShadow:
                  '0 18px 42px -18px rgba(58, 18, 51, 0.16), 0 4px 12px -4px rgba(217, 75, 125, 0.08)',
              }}
            >
              {/* Inner Champagne-Gold Hairline Keepsake Frame */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[9px] rounded-[16px]"
                style={{ border: '1px solid rgba(232, 200, 146, 0.45)' }}
              />

              <div className="relative z-10 flex flex-col items-center">
                {/* Delicate Rose-Gold Wax-Seal Flourish */}
                <KeepsakeSealFlourishSvg className="h-6 w-16" />

                <p
                  data-testid="cake-wish-eyebrow"
                  className="mt-3 text-[10.5px] font-semibold tracking-[0.14em] text-[#C43D6E] uppercase tabular-nums"
                >
                  FOR ANAMIKA SINGH &middot; 03 DEC 2026
                </p>

                <h3
                  data-testid="cake-wish-heading"
                  className="font-display mt-2 text-center text-[22px] leading-snug font-semibold tracking-tight text-[#3A1233] sm:text-[28px]"
                >
                  Happy 17th,{' '}
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span>Bachhaww</span>
                    <SubtleGoldAccentStarSvg className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  </span>
                </h3>

                {/* Clean Thin Centered Rose-Gold Divider (48px) */}
                <div
                  aria-hidden="true"
                  className="my-4 h-px w-12 bg-gradient-to-r from-transparent via-[#DFB28C] to-transparent"
                />

                <p
                  data-testid="cake-wish-body"
                  className="max-w-md text-[15px] leading-[1.65] text-[#4B2243]"
                >
                  No matter how much I tease you as Morgan, bauni, or Gawaar, you&rsquo;re genuinely
                  my greatest HG. Hope 17 brings you tons of laughs and good days.{' '}
                  <span className="whitespace-nowrap">Heheehehehe 🐍🐍</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
