import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
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
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { SparkleStarSvg } from './DoodleSvgs';

interface MakeAWishCakeProps {
  onBlowOutConfetti: (originX?: number, originY?: number) => void;
}

const BLOW_OUT_COMPLETE_MS = getBlowOutCompleteDelayMs(CANDLE_SPECS);
const RELIGHT_COMPLETE_MS = getRelightCompleteDelayMs(CANDLE_SPECS);

export function MakeAWishCake({ onBlowOutConfetti }: MakeAWishCakeProps) {
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
    bgMusicPlayer.triggerCelebrationSwell();
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
      id="make-a-wish"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFF6F9] to-[#FFE6F0]/60 py-14 sm:py-18"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="cake-stage"
          data-candles-lit={String(cake.candlesLit)}
          data-candle-phase={animPhase}
          className="relative overflow-hidden rounded-[2rem] border-[1.5px] border-[#EBC0D6] bg-[#FFFDFB] px-6 py-9 text-center shadow-[0_24px_56px_-28px_rgba(58,18,51,0.22)] sm:px-12 sm:py-11"
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-7 left-7 h-6 w-6 text-[#D94B7D]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-9 right-9 h-5 w-5 text-[#A584E8]"
            style={{ animationDelay: '0.9s' }}
          />

          <p className="text-sm font-semibold text-[#D94B7D]">
            Make a Wish
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            Make a 17th birthday wish, Morgan!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B3B64] sm:text-base">
            {cake.candlesLit
              ? 'Tap the cake or button to blow out the candles (maybe wish for a couple extra inches of height 👀).'
              : 'Candles out! Hope 17 is your best year yet.'}
          </p>

          {/* Elevated Animated 2-Tier 17th Birthday Cake SVG with Animatic Burning Candles */}
          <div className="relative mx-auto mt-5 flex max-w-sm flex-col items-center">
            <button
              type="button"
              onClick={cake.candlesLit ? handleBlowOut : handleRelight}
              aria-label={
                cake.candlesLit
                  ? '17th birthday cake with lit candles — tap to blow them out'
                  : '17th birthday cake with blown out candles — tap to relight'
              }
              className="group relative cursor-pointer rounded-3xl p-2 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D]"
            >
              <svg
                viewBox="0 0 360 290"
                fill="none"
                className="h-auto w-68 sm:w-84"
              >
                <defs>
                  {/* Warm golden-orange outer flame aura */}
                  <radialGradient id="flameAuraGrad" cx="50%" cy="55%" r="50%">
                    <stop offset="0%" stopColor="#FFE27A" stopOpacity="0.9" />
                    <stop offset="45%" stopColor="#FF9E3D" stopOpacity="0.44" />
                    <stop offset="100%" stopColor="#FF7A1F" stopOpacity="0" />
                  </radialGradient>

                  {/* Rich amber-orange outer flame teardrop */}
                  <linearGradient id="flameOuterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFF099" />
                    <stop offset="36%" stopColor="#FFA73B" />
                    <stop offset="84%" stopColor="#F06424" />
                    <stop offset="100%" stopColor="#C93F2B" />
                  </linearGradient>

                  {/* Bright cream-white inner flame core */}
                  <linearGradient id="flameCoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="65%" stopColor="#FFF7CC" />
                    <stop offset="100%" stopColor="#FFD266" />
                  </linearGradient>

                  {/* Glowing orange ember halo on freshly extinguished wicks */}
                  <radialGradient id="emberHaloGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF7A2F" stopOpacity="0.88" />
                    <stop offset="55%" stopColor="#FF4F1F" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#FF4F1F" stopOpacity="0" />
                  </radialGradient>

                  {/* Flickering warm candlelight cast across the top frosting */}
                  <radialGradient id="frostingCandleWash" cx="50%" cy="20%" r="60%">
                    <stop offset="0%" stopColor="#FFD978" stopOpacity="0.72" />
                    <stop offset="55%" stopColor="#FFB866" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#FF9E44" stopOpacity="0" />
                  </radialGradient>

                  {/* Soft plate drop shadow */}
                  <radialGradient id="plateShadowGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#3A1233" stopOpacity="0.22" />
                    <stop offset="70%" stopColor="#3A1233" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#3A1233" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Soft Ground Drop Shadow Under Plate */}
                <ellipse cx="180" cy="274" rx="134" ry="12" fill="url(#plateShadowGrad)" />

                {/* Cake Stand */}
                <ellipse cx="180" cy="252" rx="128" ry="16" fill="#F1E9FF" stroke="#3A1233" strokeWidth="2.6" />
                <ellipse cx="180" cy="249" rx="108" ry="8" fill="#FFFDFB" fillOpacity="0.55" />
                <path
                  d="M148 256H212L201 274H159L148 256Z"
                  fill="#FFF3C4"
                  stroke="#3A1233"
                  strokeWidth="2.6"
                  strokeLinejoin="round"
                />

                {/* Bottom Tier */}
                <rect
                  x="76"
                  y="174"
                  width="208"
                  height="74"
                  rx="16"
                  fill="#FFFDFB"
                  stroke="#3A1233"
                  strokeWidth="2.6"
                />
                {/* Bottom Tier Soft Vertical Sheen */}
                <rect x="86" y="184" width="16" height="54" rx="8" fill="#FFE6F0" fillOpacity="0.45" />
                {/* Bottom Tier Lilac Ribbon */}
                <rect x="78" y="222" width="204" height="14" fill="#F1E9FF" />
                {/* Bottom Tier Scalloped Frosting */}
                <path
                  d="M76 184C76 174 92 170 106 182C118 192 132 192 144 182C156 172 170 192 182 182C194 172 208 192 220 182C232 172 246 192 258 182C270 172 284 176 284 184V174C284 168 276 164 268 164H92C84 164 76 168 76 174V184Z"
                  fill="#FFB8D6"
                  stroke="#3A1233"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                {/* Glossy highlight stroke on bottom frosting */}
                <path
                  d="M92 171H242"
                  stroke="#FFFDFB"
                  strokeOpacity="0.65"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />

                {/* Top Tier */}
                <rect
                  x="104"
                  y="114"
                  width="152"
                  height="60"
                  rx="14"
                  fill="#FFE6F0"
                  stroke="#3A1233"
                  strokeWidth="2.6"
                />
                {/* Top Tier Soft Gloss Highlight */}
                <rect x="114" y="124" width="12" height="42" rx="6" fill="#FFFDFB" fillOpacity="0.5" />

                {/* Top Tier Butter-Cream Frosting Drip */}
                <path
                  d="M104 124C116 134 128 134 138 124C148 114 160 134 172 124C184 114 196 134 208 124C220 114 232 134 244 124C250 118 256 120 256 124V114C256 108 248 104 240 104H120C112 104 104 108 104 114V124Z"
                  fill="#FFF3C4"
                  stroke="#3A1233"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />
                {/* Glossy frosting sheen */}
                <path
                  d="M119 111H226"
                  stroke="#FFFFFF"
                  strokeOpacity="0.72"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />

                {/* Warm flickering candlelight glow cast onto top frosting (syncs with blow-out & relight) */}
                {frostingGlowClass && (
                  <ellipse
                    key={`frosting-glow-${animPhase}-${seqId}`}
                    cx="180"
                    cy="112"
                    rx="86"
                    ry="22"
                    fill="url(#frostingCandleWash)"
                    className={`${frostingGlowClass} pointer-events-none`}
                  />
                )}

                {/* 17 Badge on Bottom Tier */}
                <circle cx="180" cy="205" r="18" fill="#3A1233" stroke="#FFF3C4" strokeWidth="2.4" />
                <text
                  x="180"
                  y="211"
                  textAnchor="middle"
                  fill="#FFF3C4"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="Fraunces, Georgia, serif"
                >
                  17
                </text>

                {/* Cute Sprinkles */}
                <circle cx="122" cy="151" r="3.4" fill="#D94B7D" />
                <circle cx="152" cy="154" r="3" fill="#9A7CE8" />
                <circle cx="180" cy="148" r="3.4" fill="#3A1233" />
                <circle cx="210" cy="154" r="3" fill="#9A7CE8" />
                <circle cx="236" cy="150" r="3.4" fill="#D94B7D" />

                <circle cx="105" cy="206" r="3.4" fill="#D94B7D" />
                <circle cx="138" cy="203" r="3.4" fill="#9A7CE8" />
                <circle cx="222" cy="203" r="3.4" fill="#9A7CE8" />
                <circle cx="255" cy="206" r="3.4" fill="#D94B7D" />

                {/* 5 Animatic Birthday Candles */}
                {CANDLE_SPECS.map((candle) => {
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
                      {/* Candle Body */}
                      <rect
                        x={candle.cx - 6}
                        y={64}
                        width={12}
                        height={42}
                        rx={4}
                        fill={candle.color}
                        stroke="#3A1233"
                        strokeWidth="2.2"
                      />
                      {/* Glossy candle highlight */}
                      <rect
                        x={candle.cx - 3.5}
                        y={68}
                        width={2.2}
                        height={34}
                        rx={1.1}
                        fill="#FFFFFF"
                        fillOpacity="0.55"
                      />
                      {/* Diagonal festive stripes */}
                      <path
                        d={`M${candle.cx - 5} 78 L${candle.cx + 5} 72 M${candle.cx - 5} 92 L${candle.cx + 5} 86`}
                        stroke={candle.stripe}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Candle Wick */}
                      <line
                        x1={candle.cx}
                        y1={64}
                        x2={candle.cx}
                        y2={55}
                        stroke="#3A1233"
                        strokeWidth="2.1"
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
                            r={19}
                            fill="url(#flameAuraGrad)"
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-aura'}
                            style={auraStyle}
                          />

                          {/* Layer 2: Organic Swaying Amber-Orange Outer Teardrop */}
                          <path
                            d={`M${candle.cx} 22 C${candle.cx + 8.5} 34 ${candle.cx + 7.5} 50 ${candle.cx} 54.5 C${candle.cx - 7.5} 50 ${candle.cx - 8.5} 34 ${candle.cx} 22 Z`}
                            fill="url(#flameOuterGrad)"
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-flame'}
                            style={flameStyle}
                          />

                          {/* Subtle hot blue-lilac wick base glint */}
                          <ellipse
                            cx={candle.cx}
                            cy={52.5}
                            rx={2.3}
                            ry={1.5}
                            fill="#A584E8"
                            fillOpacity="0.45"
                          />

                          {/* Layer 3: Bright Cream-White Inner Core Flame */}
                          <path
                            d={`M${candle.cx} 33 C${candle.cx + 4} 40 ${candle.cx + 3.5} 49 ${candle.cx} 52.5 C${candle.cx - 3.5} 49 ${candle.cx - 4} 40 ${candle.cx} 33 Z`}
                            fill="url(#flameCoreGrad)"
                            className={animPhase === 'blowing' ? undefined : 'animate-candle-core'}
                            style={coreStyle}
                          />
                        </g>
                      )}

                      {/* RELIGHT SPARKLE POP: crisp left-to-right 100ms-staggered ignition sparkle on each wick */}
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
                            d={`M${candle.cx} 41 L${candle.cx + 2.1} 47.9 L${candle.cx + 9} 50 L${candle.cx + 2.1} 52.1 L${candle.cx} 59 L${candle.cx - 2.1} 52.1 L${candle.cx - 9} 50 L${candle.cx - 2.1} 47.9 Z`}
                            fill="#FFF3C4"
                            stroke="#D94B7D"
                            strokeWidth="0.95"
                          />
                          <circle cx={candle.cx - 7} cy={43} r="1.4" fill="#FFD266" />
                          <circle cx={candle.cx + 7.5} cy={44} r="1.2" fill="#D94B7D" />
                        </g>
                      )}

                      {/* BLOWN OUT: Glowing Orange Ember (1.2s fade) + Dual Curling Translucent Smoke Wisps (1.8s) */}
                      {animPhase === 'out' && (
                        <g key={`out-${candle.id}-${seqId}`} data-candle-smoke={candle.id}>
                          {/* Soft glowing orange ember halo + hot core dot */}
                          <g
                            className="animate-wick-ember"
                            style={{ transformOrigin: `${candle.cx}px 55px` }}
                          >
                            <circle cx={candle.cx} cy={55} r={6.5} fill="url(#emberHaloGrad)" />
                            <circle cx={candle.cx} cy={55} r={2.6} fill="#FF6B2B" />
                            <circle cx={candle.cx} cy={55} r={1.25} fill="#FFE898" />
                          </g>

                          {/* Primary curling translucent gray-lilac smoke wisp */}
                          <path
                            d={`M${candle.cx} 53 C${candle.cx - 7} 43 ${candle.cx + 7} 33 ${candle.cx - 2} 22 C${candle.cx - 6} 16 ${candle.cx + 4} 10 ${candle.cx + 2} 4`}
                            stroke="#B9AAB7"
                            strokeOpacity="0.68"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            fill="none"
                            className="animate-smoke-curl"
                            style={{
                              transformOrigin: `${candle.cx}px 53px`,
                              animationDelay: `${candle.smokeDelayMs}ms`,
                            }}
                          />
                          {/* Secondary softer white counter-curling smoke wisp */}
                          <path
                            d={`M${candle.cx + 1} 52 C${candle.cx + 6.5} 42 ${candle.cx - 5.5} 34 ${candle.cx + 3} 23`}
                            stroke="#E8DCE6"
                            strokeOpacity="0.76"
                            strokeWidth="1.9"
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
                  onClick={handleBlowOut}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#3A1233] px-7 py-3 text-sm font-semibold text-[#FFFDFB] shadow-[0_12px_28px_-8px_rgba(58,18,51,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#5A1E4E] active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                >
                  <Sparkles className="h-4 w-4 text-[#FFF3C4]" aria-hidden="true" />
                  <span>Blow Out Candles 🎂</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRelight}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border-[1.5px] border-[#DFC4EC] bg-[#FFFDFB] px-6 py-3 text-sm font-semibold text-[#3A1233] transition-colors duration-200 hover:bg-[#F1E9FF]/70 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233]"
                >
                  <RotateCcw className="h-4 w-4 text-[#D94B7D]" aria-hidden="true" />
                  <span>Relight Candles</span>
                </button>
              )}
            </div>
          </div>

          {/* Closing Best-Friend Birthday Wish Card */}
          {cake.showWishPopup && (
            <div
              role="status"
              aria-live="polite"
              className="animate-pop-in mx-auto mt-6 max-w-lg rounded-2xl border border-[#FFF3C4]/50 bg-[#3A1233] p-6 text-[#FFFDFB] shadow-[0_18px_40px_-14px_rgba(58,18,51,0.45)]"
            >
              <p className="text-xs font-bold text-[#FFF3C4]">
                Happy 17th Birthday, Anamika Singh!
              </p>
              <h3 className="font-display mt-1.5 text-2xl font-semibold italic text-[#FFE6F0]">
                Happy 17th, bachhaww 👑
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#F8E7F4]">
                No matter how much I tease you as Morgan, bauni, or Gawaar, you&rsquo;re genuinely my
                greatest HG. Hope 17 brings you tons of laughs and good days &mdash; really glad you
                texted first on 22 July.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
