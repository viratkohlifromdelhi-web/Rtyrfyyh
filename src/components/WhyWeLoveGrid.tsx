import { useState, type CSSProperties } from 'react';
import { RotateCw } from 'lucide-react';
import { CELEBRANT, WHY_WE_LOVE_CARDS, type LoveCard } from '../data/celebrationData';
import {
  ChampagneToastDoodle,
  HandDrawnHeartSvg,
  HeartsCrownDoodle,
  SparkleStarSvg,
} from './DoodleSvgs';

interface HeartBurstParticle {
  id: string;
  hx: string;
  hy: string;
  hr: string;
  color: string;
  delay: string;
}

const HEART_OFFSETS: Array<{ hx: string; hy: string; hr: string; color: string; delay: string }> = [
  { hx: '-48px', hy: '-82px', hr: '-24deg', color: '#E0578A', delay: '0ms' },
  { hx: '-18px', hy: '-104px', hr: '-10deg', color: '#F48FB1', delay: '40ms' },
  { hx: '16px', hy: '-96px', hr: '14deg', color: '#D98A9C', delay: '20ms' },
  { hx: '50px', hy: '-78px', hr: '26deg', color: '#B7416E', delay: '60ms' },
  { hx: '-36px', hy: '-58px', hr: '-18deg', color: '#F7B7C9', delay: '80ms' },
  { hx: '34px', hy: '-60px', hr: '20deg', color: '#E69F7D', delay: '50ms' },
];

function InteractiveLoveCard({ card }: { card: LoveCard }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [hearts, setHearts] = useState<HeartBurstParticle[]>([]);

  const handleToggle = () => {
    setIsFlipped((prev) => !prev);
    const stamp = Date.now();
    const batch = HEART_OFFSETS.map((o, idx) => ({
      id: `${card.id}-${stamp}-${idx}`,
      ...o,
    }));
    setHearts(batch);
    window.setTimeout(() => {
      setHearts((curr) => (curr === batch ? [] : curr));
    }, 1050);
  };

  return (
    <div className="flip-scene relative w-[80vw] max-w-[300px] shrink-0 snap-center md:w-auto md:max-w-none">
      {/* Shower of tiny heart particles on tap */}
      {hearts.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-40"
        >
          {hearts.map((h) => {
            const style = {
              '--hx': h.hx,
              '--hy': h.hy,
              '--hr': h.hr,
              animationDelay: h.delay,
              color: h.color,
            } as CSSProperties;
            return (
              <span
                key={h.id}
                style={style}
                className="animate-heart-shower absolute -top-3 -left-3"
              >
                <HandDrawnHeartSvg className="h-5 w-5" filled />
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isFlipped}
        aria-label={`${card.caption} — ${isFlipped ? 'Showing bonus memory, tap to flip back' : 'Tap to flip for a heart shower and bonus memory'}`}
        className="group block h-[370px] w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B7416E]"
      >
        <div
          className={`flip-card-inner relative h-full w-full transition-transform duration-300 group-hover:-translate-y-1 ${
            isFlipped ? 'is-flipped' : ''
          }`}
        >
          {/* Front Face */}
          <div className="flip-card-face absolute inset-0 flex flex-col rounded-3xl border border-[#F0D5DF] bg-[#FFFDF9] p-4 shadow-[0_14px_34px_-16px_rgba(74,18,44,0.16)] transition-shadow duration-200 group-hover:shadow-[0_20px_42px_-16px_rgba(183,65,110,0.28)]">
            <div
              className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl ${card.accentBg}`}
            >
              {card.kind === 'photo' && card.imageUrl && !imgError ? (
                <img
                  src={card.imageUrl}
                  alt={card.imageAlt ?? card.caption}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              ) : card.doodleType === 'champagne' ? (
                <ChampagneToastDoodle className="h-40 w-40 transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <HeartsCrownDoodle className="h-40 w-40 transition-transform duration-300 group-hover:scale-105" />
              )}
            </div>

            <div className="mt-4 flex flex-1 flex-col justify-between px-1">
              <p className="font-display text-base leading-snug font-medium text-[#4A122C]">
                {card.caption}
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#A45674]">
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                Tap for a sweet note
              </span>
            </div>
          </div>

          {/* Back Face */}
          <div className="flip-card-face flip-card-back absolute inset-0 flex flex-col justify-between rounded-3xl border border-[#E5B8C8] bg-gradient-to-br from-[#4A122C] to-[#6B1E42] p-6 text-[#FFFDF9] shadow-[0_20px_42px_-16px_rgba(74,18,44,0.36)]">
            <div className="flex items-center justify-between">
              <SparkleStarSvg className="h-6 w-6 text-[#F7C6D7]" />
              <HandDrawnHeartSvg className="h-6 w-6 text-[#F497B6]" filled />
            </div>

            <div>
              <h3 className="font-display text-2xl font-semibold italic text-[#FCE4EC]">
                {card.backTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#FDEAF0]/90">
                {card.backNote}
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E8B9BE]">
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Tap to flip back
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

export function WhyWeLoveGrid() {
  return (
    <section
      id="why-we-love"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF9] via-[#FFF3F6] to-[#FFFDF9] py-16 sm:py-22"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <p className="text-sm font-medium text-[#B7416E]">
              Four Reasons Out of a Million
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-[#4A122C] sm:text-4xl lg:text-5xl">
              Why we love {CELEBRANT.name}
            </h2>
          </div>
          <p className="text-sm text-[#7A3F58]">
            Tap any card for a heart shower &amp; secret memory
          </p>
        </div>

        {/* Horizontally scrollable snap strip on mobile, clean 4-column grid on desktop */}
        <div className="cards-scroll -mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4">
          {WHY_WE_LOVE_CARDS.map((card) => (
            <InteractiveLoveCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
