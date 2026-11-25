import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { EVENT_DETAILS, TIMELINE_SLOTS } from '../data/celebrationData';
import { toggleActiveSlot } from '../utils/celebration';
import { SparkleStarSvg, WavyDivider } from './DoodleSvgs';

export function TimelineSection() {
  const [activeSlotId, setActiveSlotId] = useState<string | null>('slot-830');
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
      id="schedule"
      ref={sectionRef}
      className="relative z-20 scroll-mt-16"
    >
      <WavyDivider fill="#4A122C" />

      <div className="relative bg-[#4A122C] py-14 text-[#FFFDF9] sm:py-20 lg:py-24">
        {/* Soft rose-gold ambient sparkles inside dark berry canvas */}
        <SparkleStarSvg
          aria-hidden="true"
          className="animate-twinkle pointer-events-none absolute top-10 right-8 h-7 w-7 text-[#E8B9BE]/65 sm:right-16"
        />
        <SparkleStarSvg
          aria-hidden="true"
          className="animate-twinkle pointer-events-none absolute bottom-12 left-8 h-6 w-6 text-[#F5D2B4]/55 sm:left-16"
          style={{ animationDelay: '1.2s' }}
        />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Top Block: What's happening when */}
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-[#E8B9BE]">
              The Party Essentials
            </p>
            <h2 className="font-display mt-2 text-balance text-3xl font-semibold tracking-tight text-[#FFFDF9] sm:text-4xl lg:text-5xl">
              What&rsquo;s happening when
            </h2>
          </div>

          {/* 4-Column Event Details Strip (clean unboxed editorial cells with hairline borders) */}
          <dl className="mt-8 grid grid-cols-1 gap-6 border-y border-[#FFFDF9]/15 py-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {EVENT_DETAILS.map((detail) => (
              <div key={detail.label} className="space-y-1">
                <dt className="text-xs font-semibold text-[#E8B9BE]">
                  {detail.label}
                </dt>
                <dd className="font-display text-xl font-medium text-[#FFFDF9] tabular-nums">
                  {detail.value}
                </dd>
                {detail.note && (
                  <p className="text-xs text-[#F5DCE4]/75">{detail.note}</p>
                )}
              </div>
            ))}
          </dl>

          {/* Bottom Block: The Good Times Guide */}
          <div className="mt-14 sm:mt-16">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-display text-2xl font-semibold italic tracking-tight text-[#FFFDF9] sm:text-3xl">
                  The Good Times Guide
                </h3>
                <p className="mt-1 text-sm text-[#F5DCE4]/80">
                  Tap any moment to light it up and peek at the insider details.
                </p>
              </div>
              <p className="text-xs font-medium text-[#E8B9BE] tabular-nums">
                {TIMELINE_SLOTS.length} moments &middot; 6:00 PM to Midnight
              </p>
            </div>

            <ol className="mt-8 space-y-3.5">
              {TIMELINE_SLOTS.map((slot, index) => {
                const isActive = activeSlotId === slot.id;
                return (
                  <li
                    key={slot.id}
                    style={{
                      transitionDelay: revealed ? `${index * 70}ms` : '0ms',
                    }}
                    className={`transition-all duration-500 ${
                      revealed
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-4 opacity-0'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSlotId((curr) => toggleActiveSlot(curr, slot.id))}
                      aria-expanded={isActive}
                      className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 sm:p-5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F7C6D7] ${
                        isActive
                          ? 'rose-gold-glow border-[#E8B9BE] bg-[#5E1A39]'
                          : 'border-[#FFFDF9]/14 bg-[#3D0D24]/75 hover:border-[#E8B9BE]/50 hover:bg-[#561634]'
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div className="flex items-start gap-4 sm:items-center sm:gap-6">
                          {/* Time Highlight Block */}
                          <span
                            className={`inline-flex min-w-[92px] items-center justify-center rounded-xl px-3 py-2 text-xs font-bold tracking-wide tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                              isActive
                                ? 'bg-[#F7C6D7] text-[#4A122C]'
                                : slot.highlight
                                  ? 'bg-[#E8B9BE]/20 text-[#FCE4EC]'
                                  : 'bg-[#FFFDF9]/10 text-[#F5DCE4]'
                            }`}
                          >
                            {slot.time}
                          </span>

                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="font-display text-lg font-medium text-[#FFFDF9] sm:text-xl">
                                {slot.title}
                              </span>
                              {slot.highlight && (
                                <SparkleStarSvg className="h-4 w-4 shrink-0 text-[#F7C6D7]" />
                              )}
                            </div>
                            <p className="mt-0.5 text-sm leading-relaxed text-[#F5DCE4]/82">
                              {slot.subtitle}
                            </p>
                          </div>
                        </div>

                        <ChevronDown
                          aria-hidden="true"
                          className={`h-5 w-5 shrink-0 self-end text-[#E8B9BE] transition-transform duration-200 sm:self-center ${
                            isActive ? 'rotate-180 text-[#FFFDF9]' : 'opacity-70 group-hover:opacity-100'
                          }`}
                        />
                      </div>

                      {isActive && (
                        <div className="animate-pop-in mt-4 border-t border-[#E8B9BE]/25 pt-3.5 text-sm leading-relaxed text-[#FDEAF0] sm:pl-[116px]">
                          <span className="font-semibold text-[#F7C6D7]">Insider note: </span>
                          {slot.insiderNote}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>

      <WavyDivider fill="#4A122C" flip />
    </section>
  );
}
