import { useState, type MouseEvent } from 'react';
import { CELEBRANT } from '../data/celebrationData';
import { splitHeadlineWords } from '../utils/celebration';
import {
  BalloonClusterDoodle,
  HandDrawnHeartSvg,
  MiniCakeDoodle,
  RibbonSquiggleSvg,
  SparkleStarSvg,
} from './DoodleSvgs';

interface HeroSectionProps {
  onCelebrate: (originX?: number, originY?: number) => void;
}

export function HeroSection({ onCelebrate }: HeroSectionProps) {
  const [imgError, setImgError] = useState(false);

  const lineOneWords = splitHeadlineWords('Happy Birthday,');
  const lineTwoWords = splitHeadlineWords(`${CELEBRANT.name} is ${CELEBRANT.age}!`);

  const handleJoinClick = (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onCelebrate(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return (
    <section
      id="top"
      className="relative scroll-mt-16 overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FFF6F8] to-[#FFFDF9] pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24"
    >
      {/* Subtle decorative radial blush washes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#FCE0EB]/55 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-28 -right-24 h-96 w-96 rounded-full bg-[#FBE7D8]/55 blur-3xl"
      />

      <div className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Animated Decorative Top Doodle Strip */}
        <div
          aria-hidden="true"
          className="mb-6 flex items-center justify-center gap-5 sm:gap-9 lg:justify-start"
        >
          <BalloonClusterDoodle className="animate-float-gentle h-16 w-14 sm:h-20 sm:w-16" />
          <SparkleStarSvg className="animate-twinkle h-5 w-5 text-[#D98A9C]" />
          <MiniCakeDoodle className="animate-float-reverse h-14 w-14 sm:h-16 sm:w-16" />
          <SparkleStarSvg
            className="animate-twinkle h-4 w-4 text-[#DFAD7C]"
            style={{ animationDelay: '0.8s' }}
          />
          <HandDrawnHeartSvg className="animate-float-gentle h-7 w-7 text-[#E07A9E]" />
        </div>

        {/* Two-column balanced hero on desktop, stacked mobile-first */}
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Whimsical Typography & Primary CTA */}
          <div className="text-center lg:col-span-7 lg:text-left">
            <p className="mb-3 text-sm font-medium tracking-wide text-[#9A4E6C]">
              Saturday, November 28 &middot; The Rose Conservatory &middot; 6:00 PM
            </p>

            <h1
              aria-label={`Happy Birthday, ${CELEBRANT.name} is ${CELEBRANT.age}!`}
              className="font-display text-balance text-5xl leading-[1.06] font-semibold tracking-tight text-[#4A122C] sm:text-6xl lg:text-[4.25rem]"
            >
              <span className="block">
                {lineOneWords.map((w, wi) => (
                  <span key={`l1-${wi}`} className="mr-[0.26em] inline-block">
                    {w.letters.map((char, ci) => (
                      <span key={`l1-${wi}-${ci}`} className="bouncy-letter">
                        {char}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
              <span className="mt-1 block italic text-[#B7416E]">
                {lineTwoWords.map((w, wi) => (
                  <span key={`l2-${wi}`} className="mr-[0.24em] inline-block">
                    {w.letters.map((char, ci) => (
                      <span key={`l2-${wi}-${ci}`} className="bouncy-letter">
                        {char}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </h1>

            <div className="mt-4 flex justify-center lg:justify-start">
              <RibbonSquiggleSvg className="h-5 w-28 text-[#E2A5B7]" />
            </div>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#5C2B41] sm:text-lg lg:mx-0">
              {CELEBRANT.subtitle}
            </p>

            {/* Primary CTA & subtle schedule anchor */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <button
                type="button"
                onClick={handleJoinClick}
                className="group relative inline-flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-[#4A122C] px-7 py-3.5 text-sm font-semibold text-[#FFFDF9] shadow-[0_12px_28px_-8px_rgba(74,18,44,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#61193A] hover:shadow-[0_16px_34px_-8px_rgba(183,65,110,0.5)] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#B7416E]"
              >
                <span>Join the Celebration 🎉</span>
              </button>

              <a
                href="#schedule"
                className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#E5BDCB] bg-[#FFFDF9] px-6 py-3 text-sm font-semibold text-[#4A122C] transition-colors duration-200 hover:bg-[#FFF0F5] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A122C]"
              >
                See the Night&rsquo;s Plan
              </a>
            </div>
          </div>

          {/* Right Column: Tilted Polaroid Photo Frame with Animated Sparkle Doodles */}
          <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            {/* Twinkling starburst overlays */}
            <SparkleStarSvg
              className="animate-twinkle pointer-events-none absolute -top-5 -left-3 z-30 h-9 w-9 text-[#D98A9C]"
            />
            <SparkleStarSvg
              className="animate-twinkle pointer-events-none absolute -right-3 -bottom-4 z-30 h-8 w-8 text-[#DFAD7C]"
              style={{ animationDelay: '1.1s' }}
            />
            <HandDrawnHeartSvg
              className="animate-float-gentle pointer-events-none absolute -top-4 right-8 z-30 h-8 w-8 text-[#E07A9E]"
              filled
            />

            {/* Soft decorative masking tape at top of Polaroid */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-3 left-1/2 z-30 h-7 w-28 -translate-x-1/2 -rotate-2 rounded-xs bg-[#F7D6E2]/80 shadow-xs backdrop-blur-xs"
            />

            <figure className="relative -rotate-2 rounded-3xl border border-[#F0D5DF] bg-[#FFFDF9] p-3.5 pb-7 shadow-[0_24px_50px_-20px_rgba(74,18,44,0.22)] transition-transform duration-300 hover:rotate-0 sm:p-4 sm:pb-8">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#FCE9F0]">
                {!imgError ? (
                  <img
                    src={CELEBRANT.heroPhoto}
                    alt="Kiara and her best friends smiling and hugging at a golden-hour rooftop birthday celebration"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#FCE4EC] to-[#FBE7D8] p-6 text-center text-[#4A122C]">
                    <BalloonClusterDoodle className="h-24 w-20" />
                    <p className="font-display mt-3 text-lg font-medium">
                      Kiara&rsquo;s 24th Rooftop Party
                    </p>
                  </div>
                )}
              </div>

              <figcaption className="mt-4 flex items-center justify-between px-1">
                <span className="font-display text-base italic text-[#4A122C] sm:text-lg">
                  {CELEBRANT.heroCaption}
                </span>
                <span className="text-xs font-medium text-[#9A5A72] tabular-nums">
                  11 · 28 · 26
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
