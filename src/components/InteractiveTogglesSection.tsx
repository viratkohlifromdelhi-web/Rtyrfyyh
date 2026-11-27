import { Flame, HeartHandshake, Sparkles, Trophy } from 'lucide-react';
import { FRIEND_LEADERBOARD_BASE } from '../data/celebrationData';
import { getOrderedFriendList } from '../utils/birthdayMath';
import { BirthdayNoteDeck } from './BirthdayNoteDeck';

function MiniInstagramIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function UpArrowMicroSvg({ className = 'h-[10px] w-[10px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 12.5V3.5" />
      <path d="M4.25 7.25L8 3.5L11.75 7.25" />
    </svg>
  );
}

interface InteractiveTogglesSectionProps {
  isBirthdayTruce: boolean;
  onToggleBirthdayTruce: () => void;
  onSetBirthdayTruce: (next: boolean) => void;
  friendOverride: boolean;
  onToggleFriendOverride: () => void;
  sparkleRain: boolean;
  onToggleSparkleRain: () => void;
}

const AVATAR_STYLES: Record<string, string> = {
  'friend-abhay': 'bg-[#FFF3C4] text-[#7A5200] border-[#E8C563]',
  'anamika-morgan': 'bg-[#D94B7D] text-[#FFFDFB] border-[#B93364]',
  'friend-ankit': 'bg-[#F1E9FF] text-[#562B66] border-[#D8C5F4]',
  'friend-ayush': 'bg-[#FFE6F0] text-[#7D2953] border-[#F2B5CC]',
  'friend-harsh': 'bg-[#F6ECF2] text-[#4E2347] border-[#DFC4D6]',
};

export function InteractiveTogglesSection({
  isBirthdayTruce,
  onToggleBirthdayTruce,
  onSetBirthdayTruce,
  friendOverride,
  onToggleFriendOverride,
  sparkleRain,
  onToggleSparkleRain,
}: InteractiveTogglesSectionProps) {
  const isNoFilterActive = !isBirthdayTruce;
  const orderedFriends = getOrderedFriendList(FRIEND_LEADERBOARD_BASE, friendOverride);

  // Map each friend to its visual slot index so GPU translate3d smoothly slides Morgan between #5 and #2
  const ROW_HEIGHT = 66;
  const ROW_GAP = 10;
  const indexById = new Map<string, number>();
  orderedFriends.forEach((f, idx) => indexById.set(f.id, idx));

  const listTotalHeight =
    FRIEND_LEADERBOARD_BASE.length * ROW_HEIGHT +
    (FRIEND_LEADERBOARD_BASE.length - 1) * ROW_GAP;

  const setFriendOverrideState = (desired: boolean) => {
    if (desired !== friendOverride) {
      onToggleFriendOverride();
    }
  };

  return (
    <section
      id="toggles"
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-sm font-semibold text-[#D94B7D]">
            Quick Switches
          </p>
          <h2 className="font-display text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            Try flipping these
          </h2>
        </div>

        {/* 3 Cohesive Toggle Switches (Deep Plum / Warm Rose Berry / Soft Blush) */}
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Toggle 1: No Filter (default ON) vs Birthday Truce */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border-[1.5px] border-[#F0C2D5] bg-[#FFE6F0]/70 p-4 shadow-[0_10px_24px_-18px_rgba(58,18,51,0.2)] transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3A1233]">
                {isNoFilterActive ? (
                  <Flame className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                ) : (
                  <HeartHandshake className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                )}
                <span className="truncate">
                  {isNoFilterActive ? 'No Filter' : 'Birthday Truce'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B3B64]">
                Switch between teasing and birthday truce
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="note-mode-switch"
              aria-checked={isNoFilterActive}
              aria-label="Toggle between No Filter and Birthday Truce"
              onClick={onToggleBirthdayTruce}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                isNoFilterActive
                  ? 'border-[#D94B7D] bg-[#D94B7D]'
                  : 'border-[#E6B2C8] bg-[#FFFDFB]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  isNoFilterActive
                    ? 'translate-x-7 bg-[#FFFDFB]'
                    : 'translate-x-1 bg-[#3A1233]'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Friend List Override (No electric indigo — cohesive Deep Plum & Rose Berry) */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border-[1.5px] border-[#DFCDF4] bg-[#F1E9FF]/80 p-4 shadow-[0_10px_24px_-18px_rgba(58,18,51,0.2)] transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3A1233]">
                <Trophy className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                <span className="truncate">Friend List Override 🏆</span>
              </div>
              <p className="mt-0.5 text-xs text-[#63386B]">
                {friendOverride
                  ? 'Morgan is at #2 right behind Abhay'
                  : 'Move Morgan up to #2 behind Abhay'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="friend-override-switch"
              aria-checked={friendOverride}
              aria-label="Toggle Friend List Override"
              onClick={onToggleFriendOverride}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                friendOverride
                  ? 'border-[#3A1233] bg-[#3A1233]'
                  : 'border-[#D7BCE5] bg-[#FFFDFB]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  friendOverride
                    ? 'translate-x-7 bg-[#FFE6F0]'
                    : 'translate-x-1 bg-[#D94B7D]'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Sparkle Rain */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border-[1.5px] border-[#ECD594] bg-[#FFF3C4]/75 p-4 shadow-[0_10px_24px_-18px_rgba(58,18,51,0.2)] transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3A1233]">
                <Sparkles className="h-4 w-4 shrink-0 text-[#B37C00]" aria-hidden="true" />
                <span className="truncate">Sparkle Rain ✨</span>
              </div>
              <p
                data-testid="sparkle-rain-subtitle"
                className="mt-0.5 text-xs text-[#6D501A]"
              >
                {sparkleRain ? 'Floating stars are on' : 'Floating stars are off'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="sparkle-rain-switch"
              aria-checked={sparkleRain}
              aria-label="Toggle Sparkle Rain"
              onClick={onToggleSparkleRain}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                sparkleRain
                  ? 'border-[#3A1233] bg-[#3A1233]'
                  : 'border-[#DEC37B] bg-[#FFFDFB]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  sparkleRain
                    ? 'translate-x-7 bg-[#FFF3C4]'
                    : 'translate-x-1 bg-[#D94B7D]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Reactive Panels: Featured Mode Card + Sleek Modern Friend List Leaderboard */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Tactile 4-Card Stacked Note Deck (No Filter vs Birthday Truce) */}
          <BirthdayNoteDeck
            isBirthdayTruce={isBirthdayTruce}
            onSelectMode={onSetBirthdayTruce}
          />

          {/* Right: Clean Editorial Friend List Rankings */}
          <div
            data-testid="friend-leaderboard"
            data-override={String(friendOverride)}
            className="flex flex-col justify-between rounded-[26px] border-[1.5px] border-[#E8C5D8] bg-[#FFFDFB] px-4 py-5 shadow-[0_18px_42px_-22px_rgba(58,18,51,0.22),0_4px_14px_-4px_rgba(217,75,125,0.08)] sm:p-7 lg:col-span-7"
          >
            {/* Header + Matching Sliding Segmented Switch */}
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#3A1233] sm:text-2xl">
                  Friend List Rankings
                </h3>
                <p className="mt-0.5 text-xs text-[#6B3B64]">
                  {friendOverride
                    ? 'Morgan jumped straight to #2 right behind Abhay.'
                    : 'Before 21 July. Switch to After 21 July to see the jump.'}
                </p>
              </div>

              {/* Tactile Sliding Segmented Pill Switch matching No Filter / Birthday Truce */}
              <div
                role="tablist"
                aria-label="Friend list timeline view"
                data-testid="friend-segmented-switch"
                className="relative grid w-full grid-cols-2 rounded-full border border-[#F0C2D5] bg-[#FFE6F0]/75 p-1 sm:w-auto sm:min-w-[244px]"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#3A1233] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    friendOverride ? 'translate-x-full' : 'translate-x-0'
                  }`}
                />
                <button
                  type="button"
                  role="tab"
                  data-testid="friend-tab-before"
                  aria-selected={!friendOverride}
                  onClick={() => setFriendOverrideState(false)}
                  className={`relative z-10 cursor-pointer rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                    !friendOverride ? 'text-[#FFFDFB]' : 'text-[#6B2B56] hover:text-[#3A1233]'
                  }`}
                >
                  Before 21 July
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="friend-tab-after"
                  aria-selected={friendOverride}
                  onClick={() => setFriendOverrideState(true)}
                  className={`relative z-10 cursor-pointer rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                    friendOverride ? 'text-[#FFFDFB]' : 'text-[#6B2B56] hover:text-[#3A1233]'
                  }`}
                >
                  After 21 July
                </button>
              </div>
            </div>

            {/* Smoothly Animated GPU-Composited Ranking Rows (Zero Descriptions, Static Handles) */}
            <div
              data-testid="friend-rankings-list"
              className="relative mt-5"
              style={{ height: `${listTotalHeight}px` }}
            >
              {FRIEND_LEADERBOARD_BASE.map((entry) => {
                const rankIndex = indexById.get(entry.id) ?? 0;
                const rankNum = rankIndex + 1;
                const topPx = rankIndex * (ROW_HEIGHT + ROW_GAP);
                const isMorganHighlighted = Boolean(entry.isAnamika && friendOverride);
                const isRankOne = rankNum === 1;
                const initial = entry.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={entry.id}
                    data-rank={rankNum}
                    data-friend-name={entry.name}
                    data-testid={`friend-row-${entry.id}`}
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      transform: `translate3d(0, ${topPx}px, 0)`,
                      transition:
                        'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), background-color 320ms ease, border-color 320ms ease, box-shadow 320ms ease',
                      ...(isMorganHighlighted
                        ? {
                            backgroundColor: '#FFF2F7',
                            borderColor: 'rgba(217, 75, 125, 0.28)',
                          }
                        : undefined),
                    }}
                    className={`absolute inset-x-0 top-0 flex items-center justify-between gap-3 rounded-2xl border pr-3.5 sm:pr-4 ${
                      isMorganHighlighted
                        ? 'z-20 pl-4 shadow-[0_10px_24px_-16px_rgba(217,75,125,0.34)] sm:pl-5'
                        : isRankOne
                          ? 'z-10 border-[#EFE3C2] bg-[#FFFBF0] pl-3.5 sm:pl-4'
                          : 'z-10 border-[#F0E3EC] bg-[#FFFFFF] pl-3.5 sm:pl-4'
                    }`}
                  >
                    {/* Sleek 3px Warm Rose Berry Inset Left Accent Bar for Morgan's #2 Row */}
                    {isMorganHighlighted && (
                      <span
                        aria-hidden="true"
                        data-testid="morgan-left-accent-bar"
                        className="pointer-events-none absolute top-[10px] bottom-[10px] left-[5px] w-[3px] rounded-full bg-[#D94B7D]"
                      />
                    )}

                    <div className="flex min-w-0 items-center gap-3">
                      {/* Crisp Tabular Rank Numeral (No Clunky Box, Muted Gold #1) */}
                      <span
                        data-testid={`friend-rank-num-${entry.id}`}
                        className={`w-6 shrink-0 text-center text-[13px] font-bold tracking-tight tabular-nums ${
                          isRankOne
                            ? 'text-[#A67C2E]'
                            : isMorganHighlighted
                              ? 'text-[#C4376B]'
                              : 'text-[#8C5873]'
                        }`}
                      >
                        #{rankNum}
                      </span>

                      {/* Clean 36x36px Cohesive Tonal Initial Avatar (No Overlapping Crown) */}
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                          AVATAR_STYLES[entry.id] ?? 'bg-[#FFE6F0] text-[#3A1233] border-[#F2B5CC]'
                        }`}
                      >
                        {initial}
                      </span>

                      {/* Name + Clean Non-Clickable Plain-Text Instagram Handle Underneath */}
                      <div className="min-w-0">
                        <p className="text-[14.5px] leading-tight font-bold text-[#3A1233]">
                          {entry.name}
                        </p>
                        {entry.instagramHandle && (
                          <span
                            data-testid={`friend-ig-${entry.id}`}
                            className="mt-0.5 inline-flex items-center gap-1 text-[12.5px] leading-snug font-medium text-[#8C5873]"
                          >
                            <MiniInstagramIcon className="h-3 w-3 shrink-0 opacity-70" />
                            <span>{entry.instagramHandle}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Refined Editorial Stationery Tag for Morgan's #2 Highlight (Zero Generative Pills) */}
                    {isMorganHighlighted && (
                      <div
                        data-testid="morgan-editorial-tag"
                        className="flex shrink-0 flex-col items-end gap-1"
                      >
                        <span
                          className="inline-block rounded-[6px] bg-[#FFFFFF] px-[9px] py-[3px] text-[10px] leading-none font-semibold tracking-[0.08em] text-[#B53263] uppercase whitespace-nowrap"
                          style={{ border: '1px solid rgba(217, 75, 125, 0.35)' }}
                        >
                          GREATEST HG
                        </span>
                        <span
                          data-testid="morgan-rank-up"
                          className="inline-flex items-center gap-1 text-[11px] leading-none font-semibold whitespace-nowrap text-[#D94B7D]"
                        >
                          <UpArrowMicroSvg className="h-[10px] w-[10px] shrink-0" />
                          <span>Up 3 spots</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
