import { useState, type CSSProperties, type MouseEvent } from 'react';
import {
  CertificateRibbonSvg,
  SparkleStarSvg,
  WaxSealStampSvg,
} from './DoodleSvgs';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';

interface AdoptionCertificateSectionProps {
  onStampConfetti: (originX?: number, originY?: number) => void;
}

interface StampSparkle {
  id: string;
  sx: string;
  sy: string;
  sr: string;
  color: string;
  delay: string;
}

const STAMP_SPARKLES = [
  { sx: '-64px', sy: '-58px', sr: '-22deg', color: '#E04D92', delay: '40ms' },
  { sx: '-18px', sy: '-78px', sr: '-8deg', color: '#F4B936', delay: '60ms' },
  { sx: '46px', sy: '-66px', sr: '18deg', color: '#9A7CE8', delay: '30ms' },
  { sx: '70px', sy: '-14px', sr: '28deg', color: '#FF8FC2', delay: '70ms' },
  { sx: '-68px', sy: '14px', sr: '-16deg', color: '#A584F8', delay: '50ms' },
  { sx: '44px', sy: '56px', sr: '22deg', color: '#E04D92', delay: '80ms' },
];

export function AdoptionCertificateSection({ onStampConfetti }: AdoptionCertificateSectionProps) {
  const [stampCount, setStampCount] = useState(0);
  const [sparkles, setSparkles] = useState<StampSparkle[]>([]);

  const isStamped = stampCount > 0;

  const handleStamp = (e: MouseEvent<HTMLButtonElement>) => {
    haptics.celebrate();
    emitModinoEvent('cute', { force: true });
    const nextCount = stampCount + 1;
    setStampCount(nextCount);
    soundEngine.playWaxStamp();

    const rect = e.currentTarget.getBoundingClientRect();
    onStampConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

    const batch = STAMP_SPARKLES.map((item, idx) => ({
      id: `seal-${nextCount}-${idx}`,
      ...item,
    }));
    setSparkles(batch);
    window.setTimeout(() => {
      setSparkles((curr) => (curr === batch ? [] : curr));
    }, 950);
  };

  return (
    <section
      id="certificate"
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Framed Mini-Certificate in Warm Cream with Pastel Pink Doodle Borders */}
        <article
          data-testid="adoption-certificate"
          data-stamped={String(isStamped)}
          className="relative rounded-[2rem] border-4 border-[#F4B8D8] bg-[#FFFDF8] p-3 shadow-[0_24px_56px_-26px_rgba(59,21,53,0.22)] sm:p-4"
        >
          {/* Inner pastel pink dashed doodle border */}
          <div className="relative overflow-hidden rounded-[1.4rem] border-2 border-dashed border-[#E68BB9] bg-gradient-to-br from-[#FFFDF8] via-[#FFF8FB] to-[#FFFDF8] px-5 pt-6 pb-8 sm:px-10 sm:pt-8 sm:pb-10">
            {/* Corner inline SVG stars */}
            <SparkleStarSvg
              aria-hidden="true"
              className="animate-twinkle pointer-events-none absolute top-4 left-4 h-6 w-6 text-[#E04D92]"
            />
            <SparkleStarSvg
              aria-hidden="true"
              className="animate-twinkle pointer-events-none absolute top-4 right-4 h-6 w-6 text-[#9A7CE8]"
              style={{ animationDelay: '0.5s' }}
            />
            <SparkleStarSvg
              aria-hidden="true"
              className="animate-twinkle pointer-events-none absolute bottom-4 left-4 h-5 w-5 text-[#F4B936]"
              style={{ animationDelay: '1s' }}
            />
            <SparkleStarSvg
              aria-hidden="true"
              className="animate-twinkle pointer-events-none absolute right-4 bottom-4 h-5 w-5 text-[#E04D92]"
              style={{ animationDelay: '1.4s' }}
            />

            {/* Top Ribbon SVG */}
            <div className="flex justify-center">
              <CertificateRibbonSvg className="h-16 w-28 sm:h-20 sm:w-36" />
            </div>

            {/* Certificate Header */}
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold tracking-widest text-[#C2377E]">
                Official Paperwork
              </p>
              <h2 className="font-display mt-2 text-balance text-2xl font-bold tracking-wide text-[#3B1535] sm:text-3xl lg:text-4xl">
                ADOPTION CERTIFICATE
              </h2>
              <div
                aria-hidden="true"
                className="mx-auto mt-4 h-0.5 w-32 rounded-full bg-gradient-to-r from-transparent via-[#E68BB9] to-transparent"
              />
            </div>

            {/* Certificate Body Text */}
            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-[#4E2347] sm:text-lg sm:leading-loose">
              This confirms that{' '}
              <strong className="font-display text-xl font-bold text-[#3B1535] underline decoration-[#F4B8D8] decoration-4 underline-offset-4">
                Anamika Singh
              </strong>{' '}
              is officially my lesbian daughter{' '}
              <strong className="font-bold text-[#C2377E]">&lsquo;Morgan&rsquo;</strong> and my{' '}
              <strong className="font-bold text-[#3B1535]">greatest HG</strong>, holding the{' '}
              <strong className="font-bold text-[#3B1535]">#2 spot</strong> on my friend list right
              behind Abhay.
            </p>

            {/* Footer details + bottom-right wax seal landing zone */}
            <div className="relative mt-9 grid grid-cols-1 items-end gap-5 border-t border-[#F1D2E4] pt-6 sm:grid-cols-12">
              <div className="space-y-3 text-center sm:col-span-8 sm:text-left">
                <div>
                  <p className="text-xs font-semibold text-[#8A4D7E]">Effective Since</p>
                  <p className="text-sm font-semibold text-[#3B1535]">
                    21 July 2026, 12:29 AM (First Instagram DM)
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#8A4D7E]">17th Birthday</p>
                  <p className="text-sm font-semibold text-[#3B1535]">03 December 2026</p>
                </div>
              </div>

              {/* Bottom-right corner seal spot */}
              <div className="relative flex min-h-[120px] items-center justify-center sm:col-span-4 sm:justify-end">
                {/* Subtle dotted landing ring before stamping */}
                {!isStamped && (
                  <div
                    aria-hidden="true"
                    className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 border-dashed border-[#E6B8D6] bg-[#FFE4F0]/25 text-center text-[11px] font-semibold text-[#9E5E91]"
                  >
                    <span>Awaiting</span>
                    <span>Pink Seal</span>
                  </div>
                )}

                {/* Sparkle burst when stamped */}
                {sparkles.length > 0 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-1/2 z-30 sm:left-auto sm:right-14"
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
                          className="animate-sparkle-pop absolute -top-2.5 -left-2.5"
                        >
                          <SparkleStarSvg className="h-5 w-5" />
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Glossy Pink Wax Seal slamming down with bounce */}
                {isStamped && (
                  <div
                    key={stampCount}
                    role="status"
                    aria-live="polite"
                    data-testid="certificate-wax-seal"
                    className="animate-wax-slam relative z-20 drop-shadow-[0_12px_18px_rgba(168,31,102,0.35)]"
                  >
                    <WaxSealStampSvg className="h-32 w-32 sm:h-36 sm:w-36" />
                    <span className="sr-only">APPROVED · MORGAN · GREATEST HG</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Interactive Stamp Approved Button below the certificate */}
        <div className="mt-6 flex flex-col items-center">
          <button
            type="button"
            onClick={handleStamp}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#C2377E] px-8 py-3 text-sm font-semibold text-[#FFFDF8] shadow-[0_14px_30px_-10px_rgba(194,55,126,0.55)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#A82A6B] active:scale-[0.97] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#3B1535]"
          >
            {isStamped ? 'Stamp Approved Again 🎀' : 'Stamp Approved 🎀'}
          </button>
          {isStamped && (
            <p className="animate-pop-in mt-2.5 text-xs font-semibold text-[#7A4B73]">
              Stamped and approved: Morgan, Greatest HG 🎀
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
