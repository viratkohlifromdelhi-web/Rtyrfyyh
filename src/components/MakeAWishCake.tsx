import { useState, type MouseEvent } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import {
  blowOutCandles,
  createInitialCakeState,
  relightCandles,
} from '../utils/celebration';
import { SparkleStarSvg } from './DoodleSvgs';

interface MakeAWishCakeProps {
  onBlowOutConfetti: (originX?: number, originY?: number) => void;
}

const CANDLE_POSITIONS = [110, 145, 180, 215, 250];
const CANDLE_COLORS = ['#FFE4F0', '#FFE898', '#EBE3FF', '#FFB8D9', '#FFE898'];

export function MakeAWishCake({ onBlowOutConfetti }: MakeAWishCakeProps) {
  const [cake, setCake] = useState(createInitialCakeState);

  const handleBlowOut = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCake((prev) => blowOutCandles(prev));
    onBlowOutConfetti(rect.left + rect.width / 2, rect.top);
  };

  const handleRelight = () => {
    setCake((prev) => relightCandles(prev));
  };

  return (
    <section
      id="make-a-wish"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF8] to-[#FFE4F0]/55 py-14 sm:py-18"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="cake-stage"
          data-candles-lit={String(cake.candlesLit)}
          className="relative overflow-hidden rounded-[2rem] border border-[#ECD6EA] bg-[#FFFDF8] px-6 py-9 text-center shadow-[0_24px_56px_-28px_rgba(59,21,53,0.2)] sm:px-12 sm:py-11"
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-7 left-7 h-6 w-6 text-[#E04D92]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-9 right-9 h-5 w-5 text-[#9A7CE8]"
            style={{ animationDelay: '0.9s' }}
          />

          <p className="text-sm font-semibold text-[#C2377E]">
            Sweet 17 Finale
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl">
            Make a 17th birthday wish, Morgan!
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B3B64] sm:text-base">
            {cake.candlesLit
              ? 'Tap the cake or button below to blow out the candles (wish for a couple extra inches of height maybe? 👀).'
              : 'Candles out! Wishing you the absolute loudest, happiest 17th year ever.'}
          </p>

          {/* Animated Multi-Tier 17th Birthday Cake SVG */}
          <div className="relative mx-auto mt-5 flex max-w-sm flex-col items-center">
            <button
              type="button"
              onClick={cake.candlesLit ? handleBlowOut : handleRelight}
              aria-label={
                cake.candlesLit
                  ? '17th birthday cake with lit candles — tap to blow them out'
                  : '17th birthday cake with blown out candles — tap to relight'
              }
              className="group relative cursor-pointer rounded-3xl p-2 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2377E]"
            >
              <svg
                viewBox="0 0 360 280"
                fill="none"
                className="h-auto w-64 sm:w-80"
              >
                {/* Cake Stand */}
                <ellipse cx="180" cy="246" rx="126" ry="16" fill="#EBE3FF" stroke="#3B1535" strokeWidth="2.6" />
                <path d="M150 250H210L200 268H160L150 250Z" fill="#FFE898" stroke="#3B1535" strokeWidth="2.6" strokeLinejoin="round" />

                {/* Bottom Tier */}
                <rect
                  x="76"
                  y="168"
                  width="208"
                  height="74"
                  rx="16"
                  fill="#FFFDF8"
                  stroke="#3B1535"
                  strokeWidth="2.6"
                />
                {/* Bottom Tier Lavender Ribbon */}
                <rect x="78" y="216" width="204" height="14" fill="#EBE3FF" />
                {/* Bottom Tier Scalloped Frosting */}
                <path
                  d="M76 178C76 168 92 164 106 176C118 186 132 186 144 176C156 166 170 186 182 176C194 166 208 186 220 176C232 166 246 186 258 176C270 166 284 170 284 178V168C284 162 276 158 268 158H92C84 158 76 162 76 168V178Z"
                  fill="#FFB5D8"
                  stroke="#3B1535"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />

                {/* Top Tier */}
                <rect
                  x="104"
                  y="108"
                  width="152"
                  height="60"
                  rx="14"
                  fill="#FFE4F0"
                  stroke="#3B1535"
                  strokeWidth="2.6"
                />
                {/* Top Tier Frosting Drip */}
                <path
                  d="M104 118C116 128 128 128 138 118C148 108 160 128 172 118C184 108 196 128 208 118C220 108 232 128 244 118C250 112 256 114 256 118V108C256 102 248 98 240 98H120C112 98 104 102 104 108V118Z"
                  fill="#FFE898"
                  stroke="#3B1535"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />

                {/* 17 Badge on Bottom Tier */}
                <circle cx="180" cy="199" r="18" fill="#3B1535" stroke="#FFE898" strokeWidth="2.4" />
                <text
                  x="180"
                  y="205"
                  textAnchor="middle"
                  fill="#FFE898"
                  fontSize="16"
                  fontWeight="700"
                  fontFamily="Fraunces, Georgia, serif"
                >
                  17
                </text>

                {/* Cute Sprinkles */}
                <circle cx="122" cy="145" r="3.5" fill="#C2377E" />
                <circle cx="152" cy="148" r="3" fill="#9A7CE8" />
                <circle cx="180" cy="142" r="3.5" fill="#3B1535" />
                <circle cx="210" cy="148" r="3" fill="#9A7CE8" />
                <circle cx="236" cy="144" r="3.5" fill="#C2377E" />

                <circle cx="105" cy="200" r="3.5" fill="#E04D92" />
                <circle cx="138" cy="197" r="3.5" fill="#9A7CE8" />
                <circle cx="222" cy="197" r="3.5" fill="#9A7CE8" />
                <circle cx="255" cy="200" r="3.5" fill="#E04D92" />

                {/* 5 Birthday Candles */}
                {CANDLE_POSITIONS.map((cx, i) => (
                  <g key={cx}>
                    <rect
                      x={cx - 6}
                      y={58}
                      width={12}
                      height={42}
                      rx={4}
                      fill={CANDLE_COLORS[i]}
                      stroke="#3B1535"
                      strokeWidth="2.2"
                    />
                    <path
                      d={`M${cx - 5} 72 L${cx + 5} 66 M${cx - 5} 86 L${cx + 5} 80`}
                      stroke="#C2377E"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1={cx}
                      y1={58}
                      x2={cx}
                      y2={50}
                      stroke="#3B1535"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {cake.candlesLit ? (
                      <g
                        className="animate-flame"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      >
                        <ellipse cx={cx} cy={38} rx={11} ry={14} fill="#FFE898" fillOpacity="0.45" />
                        <path
                          d={`M${cx} 24 C${cx + 8} 34 ${cx + 7} 46 ${cx} 49 C${cx - 7} 46 ${cx - 8} 34 ${cx} 24 Z`}
                          fill="#F5A641"
                          stroke="#B85B27"
                          strokeWidth="1.2"
                        />
                        <path
                          d={`M${cx} 32 C${cx + 3.5} 38 ${cx + 3} 44 ${cx} 46 C${cx - 3} 44 ${cx - 3.5} 38 ${cx} 32 Z`}
                          fill="#FFF5C2"
                        />
                      </g>
                    ) : (
                      <path
                        d={`M${cx} 48 C${cx - 6} 38 ${cx + 6} 30 ${cx + 2} 18`}
                        stroke="#A27B9B"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        className="animate-smoke"
                        style={{ animationDelay: `${i * 75}ms` }}
                      />
                    )}
                  </g>
                ))}
              </svg>
            </button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {cake.candlesLit ? (
                <button
                  type="button"
                  onClick={handleBlowOut}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#3B1535] px-7 py-3 text-sm font-semibold text-[#FFFDF8] shadow-[0_12px_28px_-8px_rgba(59,21,53,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#57214F] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
                >
                  <Sparkles className="h-4 w-4 text-[#FFE898]" aria-hidden="true" />
                  <span>Blow Out Candles 🎂</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRelight}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#DEC4E8] bg-[#FFFDF8] px-6 py-3 text-sm font-semibold text-[#3B1535] transition-colors duration-200 hover:bg-[#EBE3FF]/50 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535]"
                >
                  <RotateCcw className="h-4 w-4 text-[#C2377E]" aria-hidden="true" />
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
              className="animate-pop-in mx-auto mt-6 max-w-lg rounded-2xl border border-[#FFE898]/50 bg-[#3B1535] p-6 text-[#FFFDF8] shadow-[0_18px_40px_-14px_rgba(59,21,53,0.45)]"
            >
              <p className="text-xs font-bold text-[#FFE898]">
                Happy 17th Birthday, Anamika Singh!
              </p>
              <h3 className="font-display mt-1.5 text-2xl font-semibold italic text-[#FFE4F0]">
                Stay iconic, bachawww 👑
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#F8E7F4]">
                No matter how much I roast you as Morgan, bauni, or Gawaar, you&rsquo;re genuinely the
                greatest HG I could ever ask for. Here&rsquo;s to year 17 bringing you crazy laughs,
                big wins, and zero dull moments — glad you texted first on 22 July!
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
