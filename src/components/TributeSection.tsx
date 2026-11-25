import { HandDrawnHeartSvg, RibbonSquiggleSvg, SparkleStarSvg } from './DoodleSvgs';

export function TributeSection() {
  return (
    <section
      id="tribute"
      className="relative z-20 scroll-mt-16 overflow-hidden bg-[#FFFDF9] py-16 sm:py-24"
    >
      {/* Drifting hand-drawn rotating/twinkling stars and hearts */}
      <SparkleStarSvg
        aria-hidden="true"
        className="animate-twinkle pointer-events-none absolute top-14 left-6 h-8 w-8 text-[#E5A9BA] sm:left-16"
      />
      <HandDrawnHeartSvg
        aria-hidden="true"
        className="animate-float-gentle pointer-events-none absolute top-28 right-6 h-10 w-10 text-[#E087A6] sm:right-20"
      />
      <HandDrawnHeartSvg
        aria-hidden="true"
        filled
        className="animate-float-reverse pointer-events-none absolute bottom-14 left-10 h-6 w-6 text-[#F4C2D3] sm:left-24"
      />
      <SparkleStarSvg
        aria-hidden="true"
        className="animate-twinkle pointer-events-none absolute right-12 bottom-20 h-6 w-6 text-[#E2B488]"
        style={{ animationDelay: '1.1s' }}
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-[#B7416E]">
          A Love Letter to the Birthday Girl
        </p>

        <h2 className="font-display mt-3 text-balance text-3xl leading-tight font-semibold tracking-tight text-[#4A122C] sm:text-5xl">
          The girl, the myth, the group chat favorite 💕
        </h2>

        <div className="mt-5 flex justify-center">
          <RibbonSquiggleSvg className="h-5 w-32 text-[#E4A8B9]" />
        </div>

        <div className="mt-8 space-y-6 text-base leading-[1.8] text-[#55263B] sm:text-lg">
          <p>
            Every friend group is lucky if they have one person who remembers your coffee order,
            hypes up every mirror selfie, and somehow turns a rainy Tuesday evening into the best
            story of the month. For all of us, that person has always been Kiara.
          </p>
          <p>
            She is the first to arrive with pastries when you need a pep talk, the undisputed
            champion of five-minute voice notes that deserve their own podcast, and the heart behind
            almost every favorite memory on our camera rolls. Whether we are dressed to the nines
            for rooftop cocktails or laughing in oversized hoodies at 2 AM, Kiara makes every single
            room feel brighter the moment she walks in.
          </p>
          <p className="font-display text-xl italic text-[#8E2A54] sm:text-2xl">
            Here is to 24 — may it give back even half the warmth, sparkle, and joy you pour into
            everyone around you.
          </p>
        </div>
      </div>
    </section>
  );
}
