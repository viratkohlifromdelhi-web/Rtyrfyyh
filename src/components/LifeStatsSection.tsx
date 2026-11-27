import { useEffect, useRef, useState } from 'react';
import { Clock, Sparkles, Timer } from 'lucide-react';
import {
  ANAMIKA_BIRTH_ISO,
  computeLifeStats,
  formatCommaNumber,
} from '../utils/birthdayMath';
import {
  HourglassDoodleSvg,
  MoonPhaseDoodleSvg,
  SparkleStarSvg,
} from './DoodleSvgs';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

const BIRTH_DATE = new Date(ANAMIKA_BIRTH_ISO);

interface LifeStatsSectionProps {
  paused?: boolean;
}

export function LifeStatsSection({ paused = false }: LifeStatsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef, { enabled: !paused });
  const [stats, setStats] = useState(() => computeLifeStats(new Date(), BIRTH_DATE));
  const [activeTile, setActiveTile] = useState<string | null>(null);
  const bounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused || !animationsActive) return;
    setStats(computeLifeStats(new Date(), BIRTH_DATE));
    const id = window.setInterval(() => {
      setStats(computeLifeStats(new Date(), BIRTH_DATE));
    }, 1000);
    return () => window.clearInterval(id);
  }, [animationsActive, paused]);

  useEffect(() => {
    return () => {
      if (bounceTimerRef.current !== null) {
        window.clearTimeout(bounceTimerRef.current);
        bounceTimerRef.current = null;
      }
    };
  }, []);

  const handleTileBounce = (id: string) => {
    haptics.tap();
    soundEngine.playBubbleClick(1.05);
    setActiveTile(id);
    if (bounceTimerRef.current !== null) {
      window.clearTimeout(bounceTimerRef.current);
    }
    bounceTimerRef.current = window.setTimeout(() => {
      setActiveTile((curr) => (curr === id ? null : curr));
      bounceTimerRef.current = null;
    }, 240);
  };

  return (
    <section
      ref={sectionRef}
      id="life-stats"
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20 ${
        animationsActive ? '' : 'anim-paused'
      }`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#C2377E]">
            Time on Earth
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl lg:text-5xl">
            Anamika&rsquo;s Life Stats ⏳🎀
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-base leading-relaxed tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#5E2E57]">
            Counting every second since 03 Dec 2009.
          </p>
        </div>

        {/* Featured Full-Width Stat Card: Total Days Alive */}
        <button
          type="button"
          onClick={() => handleTileBounce('days')}
          data-testid="life-stats-days-card"
          className={`group relative mt-8 block w-full overflow-hidden rounded-[2rem] border-2 border-[#F1C1DF] bg-gradient-to-br from-[#FFFDF8] via-[#FFE4F0]/65 to-[#EBE3FF]/65 p-6 text-center shadow-[0_22px_50px_-26px_rgba(59,21,53,0.22)] transition-transform duration-200 hover:-translate-y-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#C2377E] sm:p-9 ${
            activeTile === 'days' ? 'scale-[0.98]' : 'scale-100'
          }`}
        >
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute top-5 left-5 h-6 w-6 text-[#E04D92]"
          />
          <SparkleStarSvg
            aria-hidden="true"
            className="animate-twinkle pointer-events-none absolute right-6 bottom-5 h-5 w-5 text-[#9A7CE8]"
            style={{ animationDelay: '0.75s' }}
          />

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-6">
            <HourglassDoodleSvg className="h-14 w-14 shrink-0 transition-transform duration-300 group-hover:rotate-6 sm:h-16 sm:w-16" />
            <div className="text-center sm:text-left">
              <div
                data-testid="life-total-days"
                className="font-display text-5xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-6xl lg:text-7xl"
              >
                {formatCommaNumber(stats.totalDays)}
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed font-medium tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#C2377E] sm:text-base">
                Days since 03 Dec 2009
              </p>
            </div>
          </div>
        </button>

        {/* 2x2 Live Stat Grid underneath */}
        <div
          data-testid="life-stats-grid"
          className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
        >
          {/* 1. Total Hours Alive */}
          <button
            type="button"
            onClick={() => handleTileBounce('hours')}
            className={`group flex flex-col justify-between rounded-3xl border border-[#ECD6EA] bg-[#FFFDF8] p-5 text-left shadow-[0_14px_34px_-20px_rgba(59,21,53,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_-16px_rgba(194,55,126,0.25)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] sm:p-6 ${
              activeTile === 'hours' ? 'scale-[0.97]' : 'scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#8C4D7F]">
                Total Hours Alive
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE4F0] text-[#C2377E] transition-transform duration-200 group-hover:scale-110">
                <Clock className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </div>
            <div
              data-testid="life-total-hours"
              className="font-display mt-3 text-3xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-4xl"
            >
              {formatCommaNumber(stats.totalHours)}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#5E2E57]">
              Hours spent being annoying
            </p>
          </button>

          {/* 2. Total Minutes Alive */}
          <button
            type="button"
            onClick={() => handleTileBounce('minutes')}
            className={`group flex flex-col justify-between rounded-3xl border border-[#E2D4F8] bg-[#FFFDF8] p-5 text-left shadow-[0_14px_34px_-20px_rgba(59,21,53,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_-16px_rgba(124,77,204,0.22)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] sm:p-6 ${
              activeTile === 'minutes' ? 'scale-[0.97]' : 'scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#7A428A]">
                Total Minutes Alive
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F1E9FF] text-[#7A428A] transition-transform duration-200 group-hover:scale-110">
                <Timer className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </div>
            <div
              data-testid="life-total-minutes"
              className="font-display mt-3 text-3xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-4xl"
            >
              {formatCommaNumber(stats.totalMinutes)}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#5E2E57]">
              Minutes of being a bauni
            </p>
          </button>

          {/* 3. Live Seconds Alive (luminous pastel rose-blush card with live pulse dot) */}
          <button
            type="button"
            onClick={() => handleTileBounce('seconds')}
            className={`group flex flex-col justify-between rounded-3xl border border-[#F1B7D4] bg-gradient-to-br from-[#FFFDF9] via-[#FFF0F6] to-[#F7EEFF] p-5 text-left text-[#3A1233] shadow-[0_14px_34px_-20px_rgba(194,55,126,0.22)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_-16px_rgba(194,55,126,0.28)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] sm:p-6 ${
              activeTile === 'seconds' ? 'scale-[0.97]' : 'scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#C2377E]">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F472B6] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#D94B7D]" />
                </span>
                Live Seconds Alive
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE4F0] text-[#C2377E] transition-transform duration-200 group-hover:scale-110">
                <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
            </div>
            <div
              data-testid="life-total-seconds"
              className="font-display mt-3 text-3xl font-bold tracking-tight text-[#3A1233] tabular-nums sm:text-4xl"
            >
              {formatCommaNumber(stats.totalSeconds)}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#5E2E57]">
              Seconds and still my greatest HG
            </p>
          </button>

          {/* 4. Full Moons Witnessed */}
          <button
            type="button"
            onClick={() => handleTileBounce('moons')}
            className={`group flex flex-col justify-between rounded-3xl border border-[#F3DC9A] bg-gradient-to-br from-[#FFFDF8] via-[#FFFBF0] to-[#EBE3FF]/45 p-5 text-left shadow-[0_14px_34px_-20px_rgba(59,21,53,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_38px_-16px_rgba(244,185,54,0.28)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] sm:p-6 ${
              activeTile === 'moons' ? 'scale-[0.97]' : 'scale-100'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#9A6800]">
                Full Moons Witnessed
              </span>
              <MoonPhaseDoodleSvg className="h-10 w-10 transition-transform duration-300 group-hover:rotate-12" />
            </div>
            <div
              data-testid="life-full-moons"
              className="font-display mt-2 text-3xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-4xl"
            >
              {formatCommaNumber(stats.fullMoons)}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed tracking-normal [letter-spacing:0px] [word-spacing:normal] text-[#5E2E57]">
              Full moons seen
            </p>
          </button>
        </div>

        {/* Casual Mini-Stat Strip */}
        <div
          data-testid="life-mini-strip"
          className="mt-6 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F1C1DF] bg-[#FFE4F0] px-4 py-2 text-xs font-bold text-[#3B1535] shadow-xs sm:text-sm">
            🎂 Turning: 17
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD0F7] bg-[#EBE3FF] px-4 py-2 text-xs font-bold text-[#3B1535] shadow-xs sm:text-sm">
            📏 Height Growth: Still 0%
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D37D] bg-[#FFE898] px-4 py-2 text-xs font-bold text-[#3B1535] shadow-xs sm:text-sm">
            🏆 Friend List Rank: #2 (Behind Abhay)
          </span>
        </div>
      </div>
    </section>
  );
}
