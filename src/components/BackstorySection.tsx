import { useEffect, useRef, useState } from 'react';
import { BACKSTORY_CHAPTERS } from '../data/celebrationData';
import { SparkleStarSvg, WavyDivider } from './DoodleSvgs';

export function BackstorySection() {
  const [revealed, setRevealed] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="backstory"
      ref={sectionRef}
      className="relative z-20 scroll-mt-16"
    >
      <WavyDivider fill="#3B1535" />

      <div className="relative bg-[#3B1535] py-14 text-[#FFFDF8] sm:py-20 lg:py-24">
        <SparkleStarSvg
          aria-hidden="true"
          className="animate-twinkle pointer-events-none absolute top-10 right-8 h-7 w-7 text-[#FFE898]/75 sm:right-16"
        />
        <SparkleStarSvg
          aria-hidden="true"
          className="animate-twinkle pointer-events-none absolute bottom-12 left-8 h-6 w-6 text-[#FFE4F0]/65 sm:left-16"
          style={{ animationDelay: '1.1s' }}
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#FFE898]">
              Our Backstory Timeline
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-[#FFFDF8] sm:text-4xl lg:text-5xl">
              From Classmates to #1 HG
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#F5DCEF]/85 sm:text-base">
              How an ordinary Pioneer Academy classmate somehow ended up taking over the entire friend list.
            </p>
          </div>

          <ol className="relative mt-10 space-y-5 before:absolute before:top-4 before:bottom-4 before:left-5 before:w-0.5 before:bg-[#FFE4F0]/20 sm:before:left-6">
            {BACKSTORY_CHAPTERS.map((chapter, index) => (
              <li
                key={chapter.id}
                style={{
                  transitionDelay: revealed ? `${index * 95}ms` : '0ms',
                }}
                className={`relative pl-14 transition-all duration-500 sm:pl-16 ${
                  revealed ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
                }`}
              >
                {/* Timeline node dot */}
                <span
                  aria-hidden="true"
                  className={`absolute top-6 left-3 flex h-5 w-5 items-center justify-center rounded-full border-2 sm:left-4 ${
                    chapter.highlight
                      ? 'border-[#3B1535] bg-[#FFE898] shadow-[0_0_0_4px_rgba(255,232,152,0.28)]'
                      : 'border-[#FFE4F0] bg-[#57214F]'
                  }`}
                />

                <article
                  className={`rounded-2xl border p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6 ${
                    chapter.highlight
                      ? 'border-[#FFE898]/55 bg-[#521D4A] shadow-[0_14px_32px_-16px_rgba(0,0,0,0.45)]'
                      : 'border-[#FFFDF8]/15 bg-[#471940]/85'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-[#FFE898]">
                      {chapter.chapterLabel} &middot; {chapter.period}
                    </span>
                    <span className="text-[#EBE3FF]/80">
                      {chapter.tag}
                    </span>
                  </div>

                  <h3 className="font-display mt-2 text-xl font-semibold text-[#FFFDF8] sm:text-2xl">
                    {chapter.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-[#F8E7F4]/90 sm:text-base">
                    {chapter.description}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <WavyDivider fill="#3B1535" flip />
    </section>
  );
}
