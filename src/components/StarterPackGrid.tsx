import { useState, type CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import { MORGAN_STARTER_PACK, type StarterPackCard } from '../data/celebrationData';
import {
  RainbowShadesDoodle,
  RibbonCrownDoodle,
  RulerSparkleDoodle,
  SparkleStarSvg,
  TrophyDoodle,
} from './DoodleSvgs';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

interface SparkleBurstItem {
  id: string;
  sx: string;
  sy: string;
  sr: string;
  color: string;
  delay: string;
}

const SPARKLE_OFFSETS = [
  { sx: '-50px', sy: '-78px', sr: '-25deg', color: '#E04D92', delay: '0ms' },
  { sx: '-16px', sy: '-98px', sr: '-10deg', color: '#FFE27A', delay: '35ms' },
  { sx: '20px', sy: '-92px', sr: '14deg', color: '#A584F8', delay: '20ms' },
  { sx: '52px', sy: '-72px', sr: '26deg', color: '#FF8FC2', delay: '50ms' },
  { sx: '-34px', sy: '-52px', sr: '-18deg', color: '#9A7CE8', delay: '65ms' },
  { sx: '36px', sy: '-56px', sr: '20deg', color: '#F4B936', delay: '45ms' },
];

function StarterPackIcon({ icon }: { icon: StarterPackCard['icon'] }) {
  switch (icon) {
    case 'ribbonCrown':
      return <RibbonCrownDoodle className="h-32 w-32 transition-transform duration-300 group-hover:scale-105" />;
    case 'rulerSparkle':
      return <RulerSparkleDoodle className="h-32 w-32 transition-transform duration-300 group-hover:scale-105" />;
    case 'rainbowShades':
      return <RainbowShadesDoodle className="h-32 w-32 transition-transform duration-300 group-hover:scale-105" />;
    case 'trophy':
      return <TrophyDoodle className="h-32 w-32 transition-transform duration-300 group-hover:scale-105" />;
  }
}

function InteractiveStarterCard({ card }: { card: StarterPackCard }) {
  const [showBonus, setShowBonus] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [sparkles, setSparkles] = useState<SparkleBurstItem[]>([]);

  const handleTap = () => {
    haptics.tap();
    soundEngine.playBubbleClick(showBonus ? 0.94 : 1.12);
    setShowBonus((prev) => !prev);
    setBouncing(true);
    window.setTimeout(() => setBouncing(false), 260);

    const stamp = Date.now();
    const batch = SPARKLE_OFFSETS.map((o, idx) => ({
      id: `${card.id}-${stamp}-${idx}`,
      ...o,
    }));
    setSparkles(batch);
    window.setTimeout(() => {
      setSparkles((curr) => (curr === batch ? [] : curr));
    }, 900);
  };

  return (
    <div className="relative w-[80vw] max-w-[296px] shrink-0 snap-center md:w-auto md:max-w-none">
      {/* Animated sparkle burst on tap */}
      {sparkles.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-40"
        >
          {sparkles.map((s) => {
            const style = {
              '--sx': s.sx,
              '--sy': s.sy,
              '--sr': s.sr,
              animationDelay: s.delay,
              color: s.color,
            } as CSSProperties;
            return (
              <span
                key={s.id}
                style={style}
                className="animate-sparkle-pop absolute -top-3 -left-3"
              >
                <SparkleStarSvg className="h-5 w-5" />
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={handleTap}
        aria-pressed={showBonus}
        className={`group flex h-full w-full flex-col justify-between rounded-3xl border border-[#ECD6EA] bg-[#FFFDF8] p-4 text-left shadow-[0_14px_34px_-18px_rgba(59,21,53,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_42px_-16px_rgba(194,55,126,0.28)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E] ${
          bouncing ? 'scale-[0.96]' : 'scale-100'
        }`}
      >
        <div>
          {/* Pure inline SVG illustration slot — NO photos */}
          <div
            className={`flex aspect-[4/3] w-full items-center justify-center rounded-2xl ${card.bgClass}`}
          >
            <StarterPackIcon icon={card.icon} />
          </div>

          <h3 className="font-display mt-4 text-xl font-semibold text-[#3B1535]">
            {card.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#572B50]">
            {card.description}
          </p>
        </div>

        <div className="mt-4 border-t border-[#3B1535]/10 pt-3">
          {showBonus ? (
            <p className={`animate-pop-in text-xs font-semibold leading-relaxed ${card.accentClass}`}>
              {card.bonusQuip}
            </p>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8C4D7F]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Tap for a little extra
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

export function StarterPackGrid() {
  return (
    <section
      id="starter-pack"
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <p className="text-sm font-semibold text-[#C2377E]">
              Inside Jokes
            </p>
            <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl lg:text-5xl">
              The Morgan Starter Pack
            </h2>
          </div>
          <p className="text-sm text-[#6B3B64]">
            Tap any card for a little extra
          </p>
        </div>

        <div
          data-testid="starter-pack-grid"
          className="cards-scroll -mx-4 mt-9 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
        >
          {MORGAN_STARTER_PACK.map((card) => (
            <InteractiveStarterCard key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
