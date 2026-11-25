import { useState, type MouseEvent } from 'react';
import { Flame, RotateCcw, Sparkles } from 'lucide-react';
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
const CANDLE_COLORS = ['#FAD4E2', '#FBE2BA', '#E8C5E5', '#F6B1C9', '#FCE4D6'];

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
      className="relative z-20 scroll-mt-16 bg-[#FFFDF9] py-14 sm:py-18"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          data-testid="cake-stage"
          data-candles-lit={String(cake.candlesLit)}
          className="relative overflow-hidden rounded-[2rem] border border-[#F0D5DF] bg-gradient-to-b from-[#FFF4F7] via-[#FFFDF9] to-[#FFF6F0] px-6 py-9 text-center shadow-[0_24px_56px_-28px_rgba(74,18,44,0.2)] sm:px-12 sm:py-11"
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-8 left-8 h-6 w-6 text-[#DF94AB]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-10 right-10 h-5 w-5 text-[#E0B184]"
            style={{ animationDelay: '0.9s' }}
          />

          <p className="text-sm font-medium text-[#B7416E]">
            Interactive Birthday Moment
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#4A122C] sm:text-4xl">
            Close your eyes &amp; make a wish
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6B334D] sm:text-base">
            {cake.candlesLit
              ? 'Tap the button below (or the cake itself) to blow out all 5 sparkling birthday candles.'
              : 'All candles blown out! Hope this wish comes true in the sweetest way.'}
          </p>

          {/* Animated Multi-Tier Birthday Cake SVG */}
          <div className="relative mx-auto mt-5 flex max-w-sm flex-col items-center">
            <button
              type="button"
              onClick={cake.candlesLit ? handleBlowOut : handleRelight}
              aria-label={
                cake.candlesLit
                  ? 'Birthday cake with lit candles — tap to blow them out'
                  : 'Birthday cake with blown out candles — tap to relight'
              }
              className="group relative cursor-pointer rounded-3xl p-2 transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B7416E]"
            >
              <svg
                viewBox="0 0 360 280"
                fill="none"
                className="h-auto w-64 sm:w-80"
              >
                {/* Cake Stand */}
                <ellipse cx="180" cy="246" rx="126" ry="16" fill="#F6D4E1" stroke="#4A122C" strokeWidth="2.5" />
                <path d="M150 250H210L200 268H160L150 250Z" fill="#E8B9BE" stroke="#4A122C" strokeWidth="2.5" strokeLinejoin="round" />

                {/* Bottom Tier */}
                <rect
                  x="76"
                  y="168"
                  width="208"
                  height="74"
                  rx="16"
                  fill="#FFFDF9"
                  stroke="#4A122C"
                  strokeWidth="2.6"
                />
                {/* Bottom Tier Berry Ribbon */}
                <rect x="78" y="216" width="204" height="14" fill="#F8C8D8" />
                {/* Bottom Tier Scalloped Frosting */}
                <path
                  d="M76 178C76 168 92 164 106 176C118 186 132 186 144 176C156 166 170 186 182 176C194 166 208 186 220 176C232 166 246 186 258 176C270 166 284 170 284 178V168C284 162 276 158 268 158H92C84 158 76 162 76 168V178Z"
                  fill="#F4A6C0"
                  stroke="#4A122C"
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
                  fill="#FFF4F7"
                  stroke="#4A122C"
                  strokeWidth="2.6"
                />
                {/* Top Tier Frosting Drip */}
                <path
                  d="M104 118C116 128 128 128 138 118C148 108 160 128 172 118C184 108 196 128 208 118C220 108 232 128 244 118C250 112 256 114 256 118V108C256 102 248 98 240 98H120C112 98 104 102 104 108V118Z"
                  fill="#FAD4E2"
                  stroke="#4A122C"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                />

                {/* Cute Sprinkles & Pearls */}
                <circle cx="122" cy="145" r="3.5" fill="#E07A9E" />
                <circle cx="152" cy="148" r="3" fill="#E2B488" />
                <circle cx="180" cy="142" r="3.5" fill="#B7416E" />
                <circle cx="210" cy="148" r="3" fill="#E2B488" />
                <circle cx="236" cy="144" r="3.5" fill="#E07A9E" />

                <circle cx="105" cy="200" r="3.5" fill="#E2B488" />
                <circle cx="145" cy="197" r="3.5" fill="#E07A9E" />
                <circle cx="180" cy="202" r="4" fill="#B7416E" />
                <circle cx="218" cy="197" r="3.5" fill="#E07A9E" />
                <circle cx="255" cy="200" r="3.5" fill="#E2B488" />

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
                      stroke="#4A122C"
                      strokeWidth="2.2"
                    />
                    {/* Candy stripe */}
                    <path
                      d={`M${cx - 5} 72 L${cx + 5} 66 M${cx - 5} 86 L${cx + 5} 80`}
                      stroke="#C8848E"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    {/* Wick */}
                    <line
                      x1={cx}
                      y1={58}
                      x2={cx}
                      y2={50}
                      stroke="#4A122C"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    {/* Lit Flame OR Rising Smoke Wisp */}
                    {cake.candlesLit ? (
                      <g
                        className="animate-flame"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      >
                        <ellipse cx={cx} cy={38} rx={11} ry={14} fill="#FCD37D" fillOpacity="0.32" />
                        <path
                          d={`M${cx} 24 C${cx + 8} 34 ${cx + 7} 46 ${cx} 49 C${cx - 7} 46 ${cx - 8} 34 ${cx} 24 Z`}
                          fill="#F5A641"
                          stroke="#B85B27"
                          strokeWidth="1.2"
                        />
                        <path
                          d={`M${cx} 32 C${cx + 3.5} 38 ${cx + 3} 44 ${cx} 46 C${cx - 3} 44 ${cx - 3.5} 38 ${cx} 32 Z`}
                          fill="#FFF3B8"
                        />
                      </g>
                    ) : (
                      <path
                        d={`M${cx} 48 C${cx - 6} 38 ${cx + 6} 30 ${cx + 2} 18`}
                        stroke="#B893A2"
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

            {/* Primary Cake Interaction Button */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {cake.candlesLit ? (
                <button
                  type="button"
                  onClick={handleBlowOut}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#4A122C] px-7 py-3 text-sm font-semibold text-[#FFFDF9] shadow-[0_12px_28px_-8px_rgba(74,18,44,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#61193A] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7416E]"
                >
                  <Sparkles className="h-4 w-4 text-[#F7C6D7]" aria-hidden="true" />
                  <span>Tap to Blow Out the Candles</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRelight}
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#D8A3B6] bg-[#FFFDF9] px-6 py-3 text-sm font-semibold text-[#4A122C] transition-colors duration-200 hover:bg-[#FFF0F5] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A122C]"
                >
                  <RotateCcw className="h-4 w-4 text-[#B7416E]" aria-hidden="true" />
                  <span>Relight Candles</span>
                </button>
              )}
            </div>
          </div>

          {/* Make a Wish! Popup Card */}
          {cake.showWishPopup && (
            <div
              role="status"
              aria-live="polite"
              className="animate-pop-in mx-auto mt-6 max-w-md rounded-2xl border border-[#E6B8C8] bg-[#4A122C] p-5 text-[#FFFDF9] shadow-[0_18px_40px_-14px_rgba(74,18,44,0.4)]"
            >
              <div className="flex items-center justify-center gap-2 text-[#F7C6D7]">
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-semibold">
                  Wish Locked In
                </span>
              </div>
              <h3 className="font-display mt-1.5 text-2xl font-semibold italic text-[#FFFDF9]">
                Make a Wish! ✨
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#F5DCE4]">
                Here&rsquo;s to 24 bringing you endless laughter, dreamy adventures, and every single
                thing your heart is wishing for right now.
              </p>
              <p className="mt-2.5 text-xs text-[#E8B9BE] tabular-nums">
                {cake.wishCount} {cake.wishCount === 1 ? 'birthday wish' : 'birthday wishes'} made so
                far
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
