import { useEffect, useState, type MouseEvent } from 'react';
import { Cake, CalendarDays, Clock, Crown, X } from 'lucide-react';
import {
  buildDecember2026Calendar,
  computeFriendshipDuration,
} from '../utils/birthdayMath';

interface CalendarAndCounterSectionProps {
  onBirthdayDateTap: (originX?: number, originY?: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEC_2026_CELLS = buildDecember2026Calendar();

export function CalendarAndCounterSection({
  onBirthdayDateTap,
}: CalendarAndCounterSectionProps) {
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [duration, setDuration] = useState(() => computeFriendshipDuration(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setDuration(computeFriendshipDuration(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleTapDec3 = (e: MouseEvent<HTMLButtonElement>) => {
    setShowBirthdayPopup((prev) => !prev);
    const rect = e.currentTarget.getBoundingClientRect();
    onBirthdayDateTap(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  return (
    <section
      id="calendar"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF8] via-[#FAF4FF] to-[#FFFDF8] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[#C2377E]">
            Important Dates in Morgan Lore
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl">
            December 2026 &amp; the HG Milestone Clock
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-7 lg:grid-cols-12">
          {/* Left Card: December 2026 Calendar */}
          <div className="relative flex flex-col justify-between rounded-3xl border border-[#ECD6EA] bg-[#FFFDF8] p-6 shadow-[0_18px_40px_-24px_rgba(59,21,53,0.2)] sm:p-7 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE4F0] text-[#C2377E]">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#3B1535]">
                      December 2026
                    </h3>
                    <p className="text-xs text-[#6B3B64]">
                      Tap the glowing <span className="font-semibold text-[#C2377E]">3</span> for a birthday pop-up
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#8C3B71] tabular-nums">
                  Turning 17 &middot; 03 Dec 2026
                </span>
              </div>

              {/* Weekday Headers */}
              <div
                aria-hidden="true"
                className="mt-6 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-[#8C5B85]"
              >
                {WEEKDAYS.map((wd) => (
                  <div key={wd} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Calendar Dates Grid (Dec 1 starts on Tuesday) */}
              <div
                data-testid="dec-2026-calendar"
                className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2"
              >
                {DEC_2026_CELLS.map((cell) => {
                  if (cell.day === null) {
                    return <div key={cell.key} className="h-11 sm:h-12" aria-hidden="true" />;
                  }

                  if (cell.isBirthday) {
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={handleTapDec3}
                        aria-expanded={showBirthdayPopup}
                        aria-label="December 3, 2026 — Anamika's 17th Birthday, tap for surprise note"
                        className="animate-calendar-glow relative flex h-11 flex-col items-center justify-center rounded-2xl border-2 border-[#3B1535] bg-gradient-to-br from-[#FFE898] via-[#FFE4F0] to-[#EBE3FF] font-bold text-[#3B1535] transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-12 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
                      >
                        <Crown
                          aria-hidden="true"
                          className="h-3 w-3 text-[#C2377E]"
                        />
                        <span className="text-sm leading-none tabular-nums">3</span>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={cell.key}
                      className="flex h-11 items-center justify-center rounded-xl text-sm font-medium text-[#5A3155] tabular-nums sm:h-12"
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Playful Popup Card when Dec 3 is tapped */}
            {showBirthdayPopup && (
              <div
                role="dialog"
                aria-label="Anamika birthday milestone card"
                className="animate-pop-in mt-5 rounded-2xl border border-[#F2C3DA] bg-[#3B1535] p-5 text-[#FFFDF8] shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#FFE898]">
                    <Cake className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-bold">03 Dec 2009 → 03 Dec 2026</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBirthdayPopup(false)}
                    aria-label="Close birthday date note"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#FFE4F0] transition-colors hover:bg-[#FFFDF8]/15 cursor-pointer"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="font-display mt-2 text-lg leading-snug text-[#FFFDF8] sm:text-xl">
                  03 Dec 2009 — The day Anamika (aka Morgan) spawned into the world. Happy 17th, bauni!
                </p>
              </div>
            )}
          </div>

          {/* Right Card: Live Milestone Counter since 22 July 2026 */}
          <div
            data-testid="friendship-counter"
            className="flex flex-col justify-between rounded-3xl border border-[#DDD0F7] bg-gradient-to-br from-[#EBE3FF]/80 via-[#FFFDF8] to-[#FFE4F0]/80 p-6 shadow-[0_18px_40px_-24px_rgba(59,21,53,0.2)] sm:p-8 lg:col-span-5"
          >
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B1535] text-[#FFE898]">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-bold text-[#6F43C2]">
                  Live Milestone Tracker
                </span>
              </div>

              <h3 className="font-display mt-4 text-2xl leading-snug font-semibold text-[#3B1535] sm:text-3xl">
                Days since she messaged first on Instagram &amp; became my greatest HG.
              </h3>

              <p className="mt-2 text-sm text-[#6B3B64]">
                Counting live since <span className="font-semibold text-[#3B1535]">22 July 2026</span> — the exact plot-twist day everything leveled up.
              </p>

              {/* Big Days Display */}
              <div className="mt-7 rounded-2xl border border-[#E5D4EC] bg-[#FFFDF8]/90 p-5 text-center">
                <div
                  data-testid="milestone-days"
                  className="font-display text-6xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-7xl"
                >
                  {duration.totalDays}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#C2377E]">
                  {duration.totalDays === 1 ? 'Day' : 'Days'} of Unmatched HG Chaos
                </p>

                {/* Live Ticking Hours / Minutes / Seconds */}
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#3B1535]/10 pt-4">
                  <div>
                    <div className="text-xl font-bold text-[#3B1535] tabular-nums sm:text-2xl">
                      {String(duration.hours).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-[#6B3B64]">Hours</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[#3B1535] tabular-nums sm:text-2xl">
                      {String(duration.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-[#6B3B64]">Minutes</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-[#C2377E] tabular-nums sm:text-2xl">
                      {String(duration.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-[#6B3B64]">Seconds</div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-xs font-medium text-[#6B3B64]">
              And still not a single dull chat since that very first DM.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
