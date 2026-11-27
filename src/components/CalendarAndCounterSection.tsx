import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { MessageCircle, X } from 'lucide-react';
import {
  buildDecember2026Calendar,
  computeBirthdayCountdown,
  computeFriendshipDuration,
  getRandomDateToast,
} from '../utils/birthdayMath';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';
import { playUiSfx } from '../utils/uiSoundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

function CalendarArrowSvg({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 8H13.5" />
      <path d="M9.5 4.25L13.5 8L9.5 11.75" />
    </svg>
  );
}

interface CalendarAndCounterSectionProps {
  onBirthdayDateTap: (originX?: number, originY?: number) => void;
  paused?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEC_2026_CELLS = buildDecember2026Calendar();
const BINDER_RINGS = [0, 1, 2, 3, 4, 5];

export function CalendarAndCounterSection({
  onBirthdayDateTap,
  paused = false,
}: CalendarAndCounterSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(sectionRef, { enabled: !paused });
  const [showBirthdayPopup, setShowBirthdayPopup] = useState(false);
  const [dateToast, setDateToast] = useState<{ day: number; message: string; id: number } | null>(
    null,
  );
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (paused || !animationsActive) return;
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, animationsActive]);

  const duration = computeFriendshipDuration(now);
  const countdown = computeBirthdayCountdown(now);

  const handleTapDec3 = (e: MouseEvent<HTMLButtonElement>) => {
    haptics.medium();
    playUiSfx('surprise_bling');
    emitModinoEvent('cute', { force: true });
    setDateToast(null);
    setShowBirthdayPopup((prev) => !prev);
    trackEvent('calendar_date_tapped', 'December 3 Birthday Date', {
      day: 3,
      isBirthday: true,
    });
    const rect = e.currentTarget.getBoundingClientRect();
    onBirthdayDateTap(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const handleTapOtherDate = (day: number) => {
    haptics.tap();
    soundEngine.playBubbleClick(0.95 + (day % 4) * 0.04);
    emitModinoEvent('interaction_hype');
    trackEvent('calendar_date_tapped', `December ${day} Calendar Date`, {
      day,
      isBirthday: false,
    });
    setDateToast({
      day,
      message: getRandomDateToast(day),
      id: Date.now(),
    });
  };

  return (
    <section
      ref={sectionRef}
      id="calendar"
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20 ${
        animationsActive ? '' : 'anim-paused'
      }`}
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
          {/* Left Card: Editorial Printed Pastel Desk Calendar for December 2026 */}
          <div
            data-testid="dec-2026-calendar-card"
            className="relative flex flex-col justify-between overflow-hidden rounded-[26px] border border-[#E9C9DA] bg-[#FFFDFB] shadow-[0_18px_42px_-22px_rgba(58,18,51,0.18),0_4px_14px_-4px_rgba(217,75,125,0.08)] lg:col-span-7"
          >
            {/* Refined Soft Blush-Cream Desk Calendar Header + Hairline Divider */}
            <div
              data-testid="calendar-editorial-header"
              className="relative bg-[#FFF4F8] px-5 pt-4 pb-4 sm:px-7 sm:pt-5 sm:pb-5"
              style={{ borderBottom: '1px solid rgba(58, 18, 51, 0.1)' }}
            >
              {/* Subtle metallic rose-ivory desk calendar binder rings */}
              <div
                aria-hidden="true"
                className="pointer-events-none mb-3 flex items-center justify-around px-3"
              >
                {BINDER_RINGS.map((ring) => (
                  <span key={ring} className="flex flex-col items-center">
                    <span className="h-3 w-1.5 rounded-full bg-gradient-to-b from-[#DFC3A1] via-[#F2DFC6] to-[#C49E72] shadow-[0_1px_2px_rgba(58,18,51,0.18)]" />
                    <span className="-mt-1 h-1.5 w-2 rounded-full bg-[#3A1233]/18 ring-1 ring-[#FFFFFF]/80" />
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-tight text-[#3A1233] sm:text-[26px]">
                    December 2026
                  </h3>
                  <p className="mt-0.5 text-xs text-[#7A4A63]">
                    Tap <span className="font-bold text-[#D94B7D]">3</span> for the main note, or explore other dates
                  </p>
                </div>

                <span
                  data-testid="calendar-turning-badge"
                  className="inline-flex items-center rounded-full border border-[#E5CCA0]/80 bg-[#FDF6E7] px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-[#7D5524] tabular-nums whitespace-nowrap"
                >
                  Turning 17 &middot; 03 Dec 2026
                </span>
              </div>
            </div>

            {/* Calendar Body */}
            <div className="flex-1 px-4 pt-4 pb-5 sm:px-6 sm:pt-5">
              {/* Clean Editorial Weekday Headers (No Loud Pink Boxes) */}
              <div
                aria-hidden="true"
                className="grid grid-cols-7 gap-[6px] text-center text-[11px] font-semibold tracking-[0.06em] uppercase sm:gap-2"
              >
                {WEEKDAYS.map((wd, idx) => {
                  const isWeekend = idx === 0 || idx === 6;
                  return (
                    <div
                      key={wd}
                      className={`py-1 ${isWeekend ? 'text-[#D94B7D]' : 'text-[#7A4A63]'}`}
                    >
                      {wd}
                    </div>
                  );
                })}
              </div>

              {/* 5-Row Structured Calendar Grid (Nov 29-30, Dec 1-31, Jan 1-2) */}
              <div
                data-testid="dec-2026-calendar"
                className="mt-2.5 grid grid-cols-7 gap-[6px] sm:gap-2"
              >
                {DEC_2026_CELLS.map((cell) => {
                  if (!cell.isCurrentMonth) {
                    return (
                      <div
                        key={cell.key}
                        aria-hidden="true"
                        className="flex h-11 items-center justify-center rounded-xl border border-[#3A1233]/[0.05] bg-[#FAF4F7]/65 text-xs font-medium text-[#C5A9BC] tabular-nums select-none sm:h-[50px] sm:text-sm"
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
                        data-testid="calendar-day-3"
                        onClick={handleTapDec3}
                        aria-expanded={showBirthdayPopup}
                        aria-label="December 3, 2026, Anamika's 17th Birthday, tap for surprise note"
                        className="animate-calendar-glow relative flex h-11 flex-col items-center justify-center rounded-[14px] bg-[#D94B7D] font-bold text-[#FFFFFF] shadow-[0_8px_18px_-6px_rgba(217,75,125,0.52)] ring-[3px] ring-[#D94B7D]/20 transition-transform duration-200 hover:scale-[1.04] hover:bg-[#C83E6F] active:scale-95 sm:h-[50px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233]"
                      >
                        <span className="text-[15px] leading-none font-bold tabular-nums sm:text-base">
                          3
                        </span>
                        <span
                          aria-hidden="true"
                          className="mt-1 h-[4.5px] w-[4.5px] rounded-full bg-[#FFE299]"
                        />
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
                      className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-all duration-150 active:scale-95 sm:h-[50px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
                        isSelectedOther
                          ? 'border-[#D94B7D]/45 bg-[#FFEBF3] text-[#3A1233] shadow-2xs'
                          : cell.isWeekend
                            ? 'border-[#3A1233]/[0.08] bg-[#FFF8FB] text-[#A23B67] hover:border-[#D94B7D]/30 hover:bg-[#FFF0F6]'
                            : 'border-[#3A1233]/[0.08] bg-[#FFFFFF] text-[#4C2447] hover:border-[#D94B7D]/25 hover:bg-[#FFF7FA]'
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
                  className="animate-pop-in mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-[#ECC3DD] bg-[#FFF4F8] px-4 py-2.5 text-xs font-semibold text-[#5E2354] shadow-2xs"
                >
                  <span>
                    <strong className="text-[#D94B7D]">Dec {dateToast.day}:</strong>{' '}
                    {dateToast.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDateToast(null)}
                    aria-label="Dismiss date note"
                    className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8C4D7F] hover:bg-[#FFE0EF] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Warm Ivory & Blush Editorial Tear-Off Note Slip when Dec 3 is tapped */}
              {showBirthdayPopup && (
                <div
                  role="dialog"
                  aria-label="Anamika birthday milestone card"
                  data-testid="calendar-birthday-note"
                  className="animate-pop-in relative mt-4 overflow-hidden rounded-2xl bg-[#FFF9FB] py-4 pr-4 pl-5 text-left shadow-[0_12px_28px_-14px_rgba(58,18,51,0.16),0_2px_6px_-2px_rgba(217,75,125,0.08)] sm:py-5 sm:pr-5 sm:pl-6"
                  style={{ border: '1px solid rgba(217, 75, 125, 0.25)' }}
                >
                  {/* Sleek 3px Warm Rose Berry left accent bar */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3 bottom-3 left-[6px] w-[3px] rounded-full bg-[#D94B7D]"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div
                      data-testid="calendar-note-date-range"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.02em] text-[#8C5873] tabular-nums"
                    >
                      <span>03 Dec 2009</span>
                      <CalendarArrowSvg className="h-3 w-3 shrink-0 text-[#D94B7D]" />
                      <span>03 Dec 2026</span>
                    </div>
                    <button
                      type="button"
                      data-testid="calendar-note-close"
                      onClick={() => setShowBirthdayPopup(false)}
                      aria-label="Close birthday date note"
                      className="-mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8C5873] transition-colors hover:bg-[#FCE8F0] hover:text-[#3A1233] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <p className="font-display mt-2 text-[17px] leading-snug font-medium text-[#3A1233] sm:text-[19px]">
                    03 Dec 2009, the day Anamika (aka Morgan) was born. Happy 17th, bauni!
                  </p>
                </div>
              )}
            </div>

            {/* Slim Pastel Live Countdown Footer Bar */}
            <div
              data-testid="calendar-countdown-strip"
              className="flex items-center justify-center gap-2 border-t border-[#EED3E2] bg-[#FFF4F8]/75 px-5 py-3 text-center text-xs font-semibold text-[#4A1C43] sm:text-[13px]"
            >
              <span className="tabular-nums">{countdown.label}</span>
            </div>
          </div>

          {/* Right Card: Live Milestone Tracker since 21 July 2026, 12:29 AM */}
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
                  21 July 2026 &bull; 12:29 AM
                </span>
              </div>

              {/* Tightened 1-line Headline */}
              <h3 className="font-display mt-4 text-2xl leading-tight font-semibold text-[#3B1535] sm:text-3xl">
                Since That First IG DM
              </h3>

              <p className="mt-1.5 text-sm leading-relaxed text-[#65355F]">
                Counting since{' '}
                <span className="font-semibold text-[#3B1535]">21 July 2026, 12:29 AM</span>, the
                night I texted first.
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
              Still talking nonstop since that first DM.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
