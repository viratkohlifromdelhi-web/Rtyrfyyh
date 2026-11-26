import { useEffect, useState, type MouseEvent } from 'react';
import { Cake, Crown, MessageCircle, X } from 'lucide-react';
import {
  buildDecember2026Calendar,
  computeBirthdayCountdown,
  computeFriendshipDuration,
  getRandomDateToast,
} from '../utils/birthdayMath';
import { soundEngine } from '../utils/soundEngine';

interface CalendarAndCounterSectionProps {
  onBirthdayDateTap: (originX?: number, originY?: number) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEC_2026_CELLS = buildDecember2026Calendar();
const BINDER_RINGS = [0, 1, 2, 3, 4, 5];

export function CalendarAndCounterSection({
  onBirthdayDateTap,
}: CalendarAndCounterSectionProps) {
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [dateToast, setDateToast] = useState<{ day: number; message: string; id: number } | null>(
    null,
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const duration = computeFriendshipDuration(now);
  const countdown = computeBirthdayCountdown(now);

  const handleTapDec3 = (e: MouseEvent<HTMLButtonElement>) => {
    setDateToast(null);
    setShowBirthdayPopup((prev) => !prev);
    const rect = e.currentTarget.getBoundingClientRect();
    onBirthdayDateTap(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleTapOtherDate = (day: number) => {
    soundEngine.playBubbleClick(0.95 + (day % 4) * 0.04);
    setDateToast({
      day,
      message: getRandomDateToast(day),
      id: Date.now(),
    });
  };

  return (
    <section
      id="calendar"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FBF0F6] via-[#F4ECFC] to-[#FBF0F6] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[#C2377E]">
            Important Dates
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl">
            December 2026 and Friendship Counter
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-7 lg:grid-cols-12">
          {/* Left Card: Cute Desk Calendar for December 2026 */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-[28px] border-[1.5px] border-[#E4B8D5] bg-[#FFFDF8] shadow-[0_18px_42px_-20px_rgba(59,21,53,0.22),0_4px_14px_-4px_rgba(194,55,126,0.1)] lg:col-span-7">
            {/* Desk Calendar Top Banner + Spiral Binder Rings */}
            <div className="relative bg-gradient-to-r from-[#3B1535] via-[#6B215B] to-[#A6347C] px-5 pt-5 pb-4 text-[#FFFDF8] sm:px-7">
              {/* Decorative top spiral binder rings */}
              <div
                aria-hidden="true"
                className="pointer-events-none mb-3 flex items-center justify-around px-3"
              >
                {BINDER_RINGS.map((ring) => (
                  <span key={ring} className="flex flex-col items-center">
                    <span className="h-3.5 w-2 rounded-full bg-gradient-to-b from-[#FFFDF8] via-[#FFE4F0] to-[#D497B9] shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                    <span className="-mt-1 h-2 w-2.5 rounded-full bg-[#240A20]/85 ring-1 ring-[#FFE4F0]/35" />
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-[#FFFDF8] sm:text-[26px]">
                    December 2026
                  </h3>
                  <p className="mt-0.5 text-xs text-[#FFE4F0]/90">
                    Tap <span className="font-bold text-[#FFE898]">3</span> for a birthday note (or try other dates)
                  </p>
                </div>

                <span className="inline-flex items-center rounded-full border border-[#FFE898]/55 bg-[#FFFDF8]/15 px-3 py-1 text-[11px] font-bold tracking-wide text-[#FFE898] tabular-nums backdrop-blur-xs">
                  Turning 17 &middot; 03 Dec 2026
                </span>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 px-4 pt-4 pb-5 sm:px-6 sm:pt-5">
              {/* Weekday Headers */}
              <div
                aria-hidden="true"
                className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold tracking-wide sm:gap-2 sm:text-xs"
              >
                {WEEKDAYS.map((wd, idx) => {
                  const isWeekend = idx === 0 || idx === 6;
                  return (
                    <div
                      key={wd}
                      className={`rounded-lg py-1.5 ${
                        isWeekend
                          ? 'bg-[#FFE8F3]/75 text-[#B5377B]'
                          : 'text-[#7A4B73]'
                      }`}
                    >
                      {wd}
                    </div>
                  );
                })}
              </div>

              {/* 5-Row Structured Calendar Grid (Nov 29-30, Dec 1-31, Jan 1-2) */}
              <div
                data-testid="dec-2026-calendar"
                className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2"
              >
                {DEC_2026_CELLS.map((cell) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={cell.key}
                        aria-hidden="true"
                        className={`flex h-12 items-center justify-center rounded-xl border text-xs font-medium tabular-nums select-none sm:h-[52px] sm:text-sm ${
                          cell.isWeekend
                            ? 'border-[#F3D9E7]/80 bg-[#FFF2F8]/80 text-[#C19BB8]'
                            : 'border-[#F1E3EE]/85 bg-[#FAF4F8]/85 text-[#C3A7BE]'
                        }`}
                      >
                        {cell.day}
                      </div>
                    );
                  }

                  if (cell.isBirthday) {
                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={handleTapDec3}
                        aria-expanded={showBirthdayPopup}
                        aria-label="December 3, 2026 — Anamika's 17th Birthday, tap for surprise note"
                        className="animate-calendar-glow relative flex h-12 flex-col items-center justify-center rounded-2xl border-2 border-[#3B1535] bg-gradient-to-br from-[#FF84BC] via-[#E14A92] to-[#9E286B] font-bold text-[#FFFDF8] shadow-[0_8px_18px_-6px_rgba(194,55,126,0.65)] transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-[52px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
                      >
                        {/* Tiny floating Bday! micro-tag perched cleanly on top */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-[#3B1535]/25 bg-[#FFE898] px-1.5 py-[1px] text-[9px] leading-tight font-black tracking-tight text-[#3B1535] shadow-xs whitespace-nowrap"
                        >
                          Bday!
                        </span>
                        <span className="mt-0.5 flex items-center gap-0.5 text-base leading-none font-extrabold tabular-nums">
                          <span>3</span>
                          <Crown
                            aria-hidden="true"
                            className="h-3 w-3 text-[#FFE898]"
                          />
                        </span>
                      </button>
                    );
                  }

                  const isSelectedOther = dateToast?.day === cell.day;

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      onClick={() => handleTapOtherDate(cell.day)}
                      aria-label={`December ${cell.day}, 2026`}
                      className={`flex h-12 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-all duration-150 active:scale-95 sm:h-[52px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E] ${
                        isSelectedOther
                          ? 'border-[#D969A4] bg-[#FFE4F0] text-[#3B1535] shadow-xs'
                          : cell.isWeekend
                            ? 'border-[#F3CDE1] bg-[#FFF0F7]/90 text-[#6B2B5C] hover:border-[#E49CC3] hover:bg-[#FFE4F0]'
                            : 'border-[#EFE0EC] bg-[#FFFDF8] text-[#4C2447] hover:border-[#E4B8D5] hover:bg-[#FFF5FA]'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Quick cheeky one-line toast when any non-birthday date is tapped */}
              {dateToast && (
                <div
                  key={dateToast.id}
                  role="status"
                  aria-live="polite"
                  data-testid="calendar-date-toast"
                  className="animate-pop-in mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-[#ECC3DD] bg-[#FFF1F8] px-4 py-2.5 text-xs font-semibold text-[#5E2354] shadow-2xs"
                >
                  <span>
                    <strong className="text-[#C2377E]">Dec {dateToast.day}:</strong>{' '}
                    {dateToast.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDateToast(null)}
                    aria-label="Dismiss date note"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#8C4D7F] hover:bg-[#FFE0EF] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Playful Popup Card when Dec 3 is tapped */}
              {showBirthdayPopup && (
                <div
                  role="dialog"
                  aria-label="Anamika birthday milestone card"
                  className="animate-pop-in mt-4 rounded-2xl border border-[#F2C3DA] bg-[#3B1535] p-5 text-[#FFFDF8] shadow-lg"
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
                    03 Dec 2009 — the day Anamika (aka Morgan) was born. Happy 17th, bauni!
                  </p>
                </div>
              )}
            </div>

            {/* Slim Pastel Live Countdown Footer Bar */}
            <div
              data-testid="calendar-countdown-strip"
              className="flex items-center justify-center gap-2 border-t border-[#EBC6DF] bg-gradient-to-r from-[#FFE8F3] via-[#F5EEFF] to-[#FFF4D6] px-5 py-3 text-center text-xs font-bold text-[#4A1C43] sm:text-[13px]"
            >
              <span aria-hidden="true">⏳</span>
              <span className="tabular-nums">{countdown.label}</span>
            </div>
          </div>

          {/* Right Card: Live Milestone Tracker since 22 July 2026 */}
          <div
            data-testid="friendship-counter"
            className="flex flex-col justify-between rounded-[28px] border-[1.5px] border-[#D7C1F4] bg-gradient-to-br from-[#F3ECFF] via-[#FFFDF8] to-[#FFEAF4] p-6 shadow-[0_18px_42px_-20px_rgba(59,21,53,0.22),0_4px_14px_-4px_rgba(148,104,226,0.12)] sm:p-7 lg:col-span-5"
          >
            <div>
              {/* Sleek Mini Instagram DM Badge with pulsing live pink dot */}
              <div className="inline-flex items-center gap-2 rounded-full border border-[#EBC0DC] bg-[#FFFDF8]/95 px-3 py-1.5 shadow-2xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-[#E04D92] to-[#9A7CE8] text-[#FFFDF8]">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E04D92] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E04D92]" />
                </span>
                <span className="text-xs font-bold text-[#5C2454]">
                  22 July 2026 &bull; First DM
                </span>
              </div>

              {/* Tightened 1-line Headline */}
              <h3 className="font-display mt-4 text-2xl leading-tight font-semibold text-[#3B1535] sm:text-3xl">
                Since That First IG DM
              </h3>

              <p className="mt-1.5 text-sm leading-relaxed text-[#65355F]">
                Counting since <span className="font-semibold text-[#3B1535]">22 July 2026</span>{' '}
                &mdash; the day you texted first.
              </p>

              {/* Big Days Display + Flip-Clock Style Mini Tiles */}
              <div className="mt-6 rounded-2xl border-[1.5px] border-[#E7CBE2] bg-[#FFFDF8]/95 p-5 text-center shadow-[0_10px_24px_-16px_rgba(59,21,53,0.18)]">
                <div
                  data-testid="milestone-days"
                  className="font-display text-6xl font-bold tracking-tight text-[#3B1535] tabular-nums sm:text-7xl"
                >
                  {duration.totalDays}
                </div>
                <p className="mt-1 text-sm font-semibold text-[#C2377E]">
                  {duration.totalDays === 1 ? 'Day' : 'Days'} as my greatest HG
                </p>

                {/* Flip-Clock Style Hours : Minutes : Seconds Mini-Tiles */}
                <div className="mt-5 flex items-center justify-center gap-1.5 border-t border-[#3B1535]/10 pt-4 sm:gap-2">
                  {/* Hours Tile */}
                  <div className="relative flex-1 overflow-hidden rounded-2xl border-[1.5px] border-[#E8C5DF] bg-gradient-to-b from-[#FFFDF8] via-[#FFF6FA] to-[#FFEBF4] px-2 py-2.5 shadow-[0_6px_14px_-10px_rgba(59,21,53,0.28)]">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#E8C5DF]/45"
                    />
                    <div className="relative text-xl font-extrabold text-[#3B1535] tabular-nums sm:text-2xl">
                      {String(duration.hours).padStart(2, '0')}
                    </div>
                    <div className="relative mt-0.5 text-[11px] font-semibold text-[#7A4B73]">
                      Hours
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-lg font-black text-[#C2377E]/65 select-none"
                  >
                    :
                  </span>

                  {/* Minutes Tile */}
                  <div className="relative flex-1 overflow-hidden rounded-2xl border-[1.5px] border-[#DFCAF6] bg-gradient-to-b from-[#FFFDF8] via-[#F9F5FF] to-[#F0E7FF] px-2 py-2.5 shadow-[0_6px_14px_-10px_rgba(59,21,53,0.28)]">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#DFCAF6]/55"
                    />
                    <div className="relative text-xl font-extrabold text-[#3B1535] tabular-nums sm:text-2xl">
                      {String(duration.minutes).padStart(2, '0')}
                    </div>
                    <div className="relative mt-0.5 text-[11px] font-semibold text-[#7A4B73]">
                      Minutes
                    </div>
                  </div>

                  <span
                    aria-hidden="true"
                    className="text-lg font-black text-[#C2377E]/65 select-none"
                  >
                    :
                  </span>

                  {/* Seconds Tile with pulsing live dot */}
                  <div className="relative flex-1 overflow-hidden rounded-2xl border-[1.5px] border-[#F0BBD7] bg-gradient-to-b from-[#FFFDF8] via-[#FFF2F8] to-[#FFE2F0] px-2 py-2.5 shadow-[0_6px_14px_-10px_rgba(194,55,126,0.3)]">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-[#F0BBD7]/55"
                    />
                    <div className="relative text-xl font-extrabold text-[#C2377E] tabular-nums sm:text-2xl">
                      {String(duration.seconds).padStart(2, '0')}
                    </div>
                    <div className="relative mt-0.5 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-[#8A3B6B]">
                      <span>Seconds</span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#E04D92]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Centered bottom caption with clear breathing room so floating confetti button never overlaps */}
            <p className="mt-5 px-4 pb-1 text-center text-xs font-medium text-[#65355F]">
              Still talking non-stop since that first DM.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
