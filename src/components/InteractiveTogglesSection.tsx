import { Crown, Flame, HeartHandshake, Sparkles, Trophy } from 'lucide-react';
import { FRIEND_LEADERBOARD_BASE, MODE_MESSAGES } from '../data/celebrationData';
import { getOrderedFriendList } from '../utils/birthdayMath';

interface InteractiveTogglesSectionProps {
  isWholesomeMode: boolean;
  onToggleWholesome: () => void;
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
  isWholesomeMode,
  onToggleWholesome,
  friendOverride,
  onToggleFriendOverride,
  sparkleRain,
  onToggleSparkleRain,
}: InteractiveTogglesSectionProps) {
  const isRoastActive = !isWholesomeMode;
  const activeCopy = isWholesomeMode ? MODE_MESSAGES.wholesome : MODE_MESSAGES.roast;
  const orderedFriends = getOrderedFriendList(FRIEND_LEADERBOARD_BASE, friendOverride);

  // Map each friend to its visual slot index so CSS transform smoothly slides Morgan between #5 and #2
  const ROW_HEIGHT = 70;
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
      className="relative z-20 scroll-mt-16 bg-[#FFF6F9] py-14 sm:py-20"
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
          {/* Toggle 1: Roast Mode (ON = right) vs Wholesome Mode (OFF = left) */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border-[1.5px] border-[#F0C2D5] bg-[#FFE6F0]/70 p-4 shadow-[0_10px_24px_-18px_rgba(58,18,51,0.2)] transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3A1233]">
                {isRoastActive ? (
                  <Flame className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                ) : (
                  <HeartHandshake className="h-4 w-4 shrink-0 text-[#D94B7D]" aria-hidden="true" />
                )}
                <span className="truncate">
                  {isRoastActive ? 'Roast Mode 🔥' : 'Wholesome Mode 🫶'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B3B64]">
                Switch between teasing and real talk
              </p>
            </div>
            <button
              type="button"
              role="switch"
              data-testid="roast-mode-switch"
              aria-checked={isRoastActive}
              aria-label="Toggle Roast Mode or Wholesome Mode"
              onClick={onToggleWholesome}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                isRoastActive
                  ? 'border-[#D94B7D] bg-[#D94B7D]'
                  : 'border-[#E6B2C8] bg-[#FFFDFB]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  isRoastActive
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
              <p className="mt-0.5 text-xs text-[#6D501A]">
                {sparkleRain ? 'Floating stars are on' : 'Floating stars are off'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
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
          {/* Left: Roast vs Wholesome Dynamic Message Card */}
          <div
            data-testid="mode-message-card"
            data-mode={isWholesomeMode ? 'wholesome' : 'roast'}
            className={`flex flex-col justify-between rounded-[26px] border-[1.5px] p-6 shadow-[0_16px_38px_-22px_rgba(58,18,51,0.2)] transition-colors duration-300 sm:p-8 lg:col-span-5 ${
              isWholesomeMode
                ? 'border-[#D8C5F2] bg-gradient-to-br from-[#F1E9FF] via-[#FFFDFB] to-[#FFE6F0]/75'
                : 'border-[#F1BDD3] bg-gradient-to-br from-[#FFE6F0] via-[#FFFDFB] to-[#FFF3C4]/65'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-full border border-[#F0C2D5] bg-[#FFFDFB]/85 px-3 py-1 text-xs font-bold text-[#D94B7D]">
                  {activeCopy.badge}
                </span>
                <button
                  type="button"
                  onClick={onToggleWholesome}
                  className="text-xs font-semibold text-[#3A1233] underline decoration-[#D94B7D]/55 underline-offset-4 transition-colors hover:text-[#D94B7D] cursor-pointer"
                >
                  {isWholesomeMode ? 'Switch back to Roast 🔥' : 'Switch to Wholesome 🫶'}
                </button>
              </div>

              <h3
                key={isWholesomeMode ? 'wholesome-title' : 'roast-title'}
                className="font-display animate-pop-in mt-4 text-2xl font-semibold text-[#3A1233] sm:text-3xl"
              >
                {activeCopy.title}
              </h3>

              <p
                key={isWholesomeMode ? 'wholesome-body' : 'roast-body'}
                className="animate-pop-in mt-3.5 text-sm leading-relaxed text-[#52244B] sm:text-base"
              >
                {activeCopy.body}
              </p>
            </div>

            <div className="mt-6 border-t border-[#3A1233]/10 pt-4 text-xs font-medium text-[#7A3F6E]">
              {isWholesomeMode
                ? 'Glad you actually texted first.'
                : 'Just stating facts, nothing personal.'}
            </div>
          </div>

          {/* Right: Sleek Modern Friend List Leaderboard */}
          <div
            data-testid="friend-leaderboard"
            data-override={String(friendOverride)}
            className="rounded-[26px] border-[1.5px] border-[#E8C5D8] bg-[#FFFDFB] px-3.5 py-5 shadow-[0_18px_42px_-22px_rgba(58,18,51,0.22),0_4px_14px_-4px_rgba(217,75,125,0.08)] sm:p-7 lg:col-span-7"
          >
            {/* Header + 2-Option Segmented Pill Switch */}
            <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#3A1233] sm:text-2xl">
                  Friend List Rankings
                </h3>
                <p className="mt-0.5 text-xs text-[#6B3B64]">
                  {friendOverride
                    ? 'Morgan jumped straight to #2 right behind Abhay.'
                    : 'Before 22 July — flip to After 22 July to see the jump.'}
                </p>
              </div>

              {/* Clean 2-Option Segmented Pill Switch with Smooth Sliding Highlight */}
              <div
                role="tablist"
                aria-label="Friend list timeline view"
                data-testid="friend-segmented-switch"
                className="relative grid w-full grid-cols-2 rounded-full border border-[#F0C2D5] bg-[#FFE6F0]/75 p-1 sm:w-auto sm:min-w-[238px]"
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
                  aria-selected={!friendOverride}
                  onClick={() => setFriendOverrideState(false)}
                  className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                    !friendOverride ? 'text-[#FFFDFB]' : 'text-[#6B2B56] hover:text-[#3A1233]'
                  }`}
                >
                  Before 22 July
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={friendOverride}
                  onClick={() => setFriendOverrideState(true)}
                  className={`relative z-10 rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                    friendOverride ? 'text-[#FFFDFB]' : 'text-[#6B2B56] hover:text-[#3A1233]'
                  }`}
                >
                  After 22 July
                </button>
              </div>
            </div>

            {/* Smoothly Animated Leaderboard Rows */}
            <div
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
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      transform: `translate3d(0, ${topPx}px, 0)`,
                    }}
                    className={`absolute inset-x-0 top-0 flex items-center justify-between gap-2 rounded-2xl border px-2.5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:gap-3 sm:px-4 ${
                      isMorganHighlighted
                        ? 'z-20 border-[1.5px] border-[#D94B7D]/70 bg-gradient-to-r from-[#FFE6F0] via-[#FFF1F6] to-[#F1E9FF]/80 shadow-[0_10px_26px_-12px_rgba(217,75,125,0.45),inset_0_1px_0_rgba(255,255,255,0.85)]'
                        : isRankOne
                          ? 'z-10 border-[#EED38A] bg-gradient-to-r from-[#FFF9E3]/70 via-[#FFFDFB] to-[#FFFDFB] shadow-[0_6px_16px_-12px_rgba(179,124,0,0.35)]'
                          : entry.isAnamika
                            ? 'z-10 border-[#F0C2D5] bg-[#FFE6F0]/40'
                            : 'border-[#EFE1EC] bg-[#FFFDFB]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      {/* Rank Pill */}
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold tabular-nums sm:h-7 sm:w-7 ${
                          isMorganHighlighted
                            ? 'bg-[#D94B7D] text-[#FFFDFB] shadow-2xs'
                            : isRankOne
                              ? 'border border-[#E5BF5B] bg-[#FFF3C4] text-[#7A5200]'
                              : 'bg-[#F5EBF3] text-[#6B3B64]'
                        }`}
                      >
                        #{rankNum}
                      </span>

                      {/* Clean Circular Initial Avatar */}
                      <span
                        aria-hidden="true"
                        className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold shadow-2xs sm:h-9 sm:w-9 sm:text-sm ${
                          AVATAR_STYLES[entry.id] ?? 'bg-[#FFE6F0] text-[#3A1233] border-[#F2B5CC]'
                        }`}
                      >
                        {initial}
                        {isRankOne && (
                          <Crown className="absolute -top-2 -right-1 h-3.5 w-3.5 rotate-12 text-[#C88E00] drop-shadow-2xs" />
                        )}
                      </span>

                      {/* Name + Clean Subtitle (Full visibility on 390px mobile) */}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#3A1233]">
                          {entry.name}
                        </p>
                        <p className="truncate text-[11px] font-medium text-[#6B3B64] sm:text-xs">
                          {entry.tag}
                        </p>
                      </div>
                    </div>

                    {/* Exclusive Right-Side Stacked Badges for Morgan */}
                    {entry.isAnamika && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          aria-label="Greatest HG badge"
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs ${
                            isMorganHighlighted
                              ? 'bg-[#3A1233] text-[#FFF3C4] shadow-xs'
                              : 'border border-[#F0B9CE] bg-[#FFE6F0] text-[#D94B7D]'
                          }`}
                        >
                          <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          <span>Greatest HG</span>
                        </span>
                        {isMorganHighlighted && (
                          <span
                            data-testid="morgan-rank-up"
                            className="inline-flex shrink-0 items-center rounded-full border border-[#A6DFC0] bg-[#E8F8EF] px-2 py-[1px] text-[10px] font-extrabold leading-tight text-[#1E6A44]"
                          >
                            ▲ +3
                          </span>
                        )}
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
