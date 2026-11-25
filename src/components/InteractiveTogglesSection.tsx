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

export function InteractiveTogglesSection({
  isWholesomeMode,
  onToggleWholesome,
  friendOverride,
  onToggleFriendOverride,
  sparkleRain,
  onToggleSparkleRain,
}: InteractiveTogglesSectionProps) {
  const activeCopy = isWholesomeMode ? MODE_MESSAGES.wholesome : MODE_MESSAGES.roast;
  const orderedFriends = getOrderedFriendList(FRIEND_LEADERBOARD_BASE, friendOverride);

  // Map each friend to its visual slot index so CSS transform smoothly slides Anamika to #1
  const ROW_HEIGHT = 56;
  const ROW_GAP = 10;
  const indexById = new Map<string, number>();
  orderedFriends.forEach((f, idx) => indexById.set(f.id, idx));

  const listTotalHeight =
    FRIEND_LEADERBOARD_BASE.length * ROW_HEIGHT +
    (FRIEND_LEADERBOARD_BASE.length - 1) * ROW_GAP;

  return (
    <section
      id="toggles"
      className="relative z-20 scroll-mt-16 bg-[#FFFDF8] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-sm font-semibold text-[#C2377E]">
            Interactive Control Panel
          </p>
          <h2 className="font-display text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl">
            Flip a switch &amp; watch the vibe shift
          </h2>
        </div>

        {/* 3 Sleek Toggle Switches Bar */}
        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Toggle 1: Roast Mode vs Wholesome Mode */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ECD6EA] bg-[#FFE4F0]/45 p-4 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3B1535]">
                {isWholesomeMode ? (
                  <HeartHandshake className="h-4 w-4 shrink-0 text-[#C2377E]" aria-hidden="true" />
                ) : (
                  <Flame className="h-4 w-4 shrink-0 text-[#C2377E]" aria-hidden="true" />
                )}
                <span className="truncate">
                  {isWholesomeMode ? 'Wholesome Mode 🫶' : 'Roast Mode 🔥'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B3B64]">
                Switch between teasing &amp; real HG respect
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isWholesomeMode}
              aria-label="Toggle Roast Mode or Wholesome Mode"
              onClick={onToggleWholesome}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
                isWholesomeMode
                  ? 'border-[#C2377E] bg-[#C2377E]'
                  : 'border-[#3B1535] bg-[#3B1535]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full bg-[#FFFDF8] shadow-sm transition-transform duration-200 ${
                  isWholesomeMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Friend List Override */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#DDD0F7] bg-[#EBE3FF]/55 p-4 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3B1535]">
                <Trophy className="h-4 w-4 shrink-0 text-[#6F43C2]" aria-hidden="true" />
                <span className="truncate">Friend List Override 🏆</span>
              </div>
              <p className="mt-0.5 text-xs text-[#5E3A7A]">
                {friendOverride ? 'Anamika holds Rank #1!' : 'Send Morgan straight to #1'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={friendOverride}
              aria-label="Toggle Friend List Override"
              onClick={onToggleFriendOverride}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
                friendOverride
                  ? 'border-[#6F43C2] bg-[#6F43C2]'
                  : 'border-[#B9A4DE] bg-[#FFFDF8]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  friendOverride
                    ? 'translate-x-7 bg-[#FFE898]'
                    : 'translate-x-1 bg-[#3B1535]'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Sparkle Rain */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#EFE0A8] bg-[#FFE898]/40 p-4 transition-colors">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[#3B1535]">
                <Sparkles className="h-4 w-4 shrink-0 text-[#A57600]" aria-hidden="true" />
                <span className="truncate">Sparkle Rain ✨</span>
              </div>
              <p className="mt-0.5 text-xs text-[#6B5016]">
                {sparkleRain ? 'Floating stars & confetti ON' : 'Ambient sparkles paused'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sparkleRain}
              aria-label="Toggle Sparkle Rain"
              onClick={onToggleSparkleRain}
              className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
                sparkleRain
                  ? 'border-[#3B1535] bg-[#3B1535]'
                  : 'border-[#D9C483] bg-[#FFFDF8]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
                  sparkleRain
                    ? 'translate-x-7 bg-[#FFE898]'
                    : 'translate-x-1 bg-[#9E8036]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Reactive Panels: Featured Mode Card + Animated Friend List Leaderboard */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Roast vs Wholesome Dynamic Message Card */}
          <div
            data-testid="mode-message-card"
            data-mode={isWholesomeMode ? 'wholesome' : 'roast'}
            className={`flex flex-col justify-between rounded-3xl border p-6 transition-colors duration-300 sm:p-8 lg:col-span-6 ${
              isWholesomeMode
                ? 'border-[#D7C4FA] bg-gradient-to-br from-[#EBE3FF]/85 via-[#FFFDF8] to-[#FFE4F0]/65'
                : 'border-[#F3C2DA] bg-gradient-to-br from-[#FFE4F0]/90 via-[#FFFDF8] to-[#FFE898]/45'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#C2377E]">
                  {activeCopy.badge}
                </span>
                <button
                  type="button"
                  onClick={onToggleWholesome}
                  className="text-xs font-semibold text-[#3B1535] underline decoration-[#C2377E]/50 underline-offset-4 transition-colors hover:text-[#C2377E] cursor-pointer"
                >
                  {isWholesomeMode ? 'Switch back to Roast 🔥' : 'Switch to Wholesome 🫶'}
                </button>
              </div>

              <h3
                key={isWholesomeMode ? 'wholesome-title' : 'roast-title'}
                className="font-display animate-pop-in mt-3 text-2xl font-semibold text-[#3B1535] sm:text-3xl"
              >
                {activeCopy.title}
              </h3>

              <p
                key={isWholesomeMode ? 'wholesome-body' : 'roast-body'}
                className="animate-pop-in mt-4 text-sm leading-relaxed text-[#52244B] sm:text-base"
              >
                {activeCopy.body}
              </p>
            </div>

            <div className="mt-6 border-t border-[#3B1535]/10 pt-4 text-xs font-medium text-[#7A3F6E]">
              {isWholesomeMode
                ? 'Certified best-friend energy · Zero fake stuff, all loyalty.'
                : 'Disclaimer: Zero height jokes were harmed in the making of this card.'}
            </div>
          </div>

          {/* Right: Live Mini Friend List Leaderboard */}
          <div
            data-testid="friend-leaderboard"
            data-override={String(friendOverride)}
            className="rounded-3xl border border-[#E5D7EF] bg-[#FFFDF8] p-6 shadow-[0_16px_36px_-22px_rgba(59,21,53,0.18)] sm:p-7 lg:col-span-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#3B1535] sm:text-2xl">
                  Official Friend List Rankings
                </h3>
                <p className="mt-0.5 text-xs text-[#6B3B64]">
                  {friendOverride
                    ? 'Override active: Morgan cleared every guy friend for Rank #1.'
                    : 'Flip “Friend List Override” to watch Anamika take the crown.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onToggleFriendOverride}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[#3B1535] px-4 py-1.5 text-xs font-semibold text-[#FFFDF8] transition-colors hover:bg-[#57214F] whitespace-nowrap cursor-pointer"
              >
                <Crown className="h-3.5 w-3.5 text-[#FFE898]" aria-hidden="true" />
                <span>{friendOverride ? 'Reset Order' : 'Crown Morgan #1'}</span>
              </button>
            </div>

            {/* Smoothly animated vertical position container */}
            <div
              className="relative mt-5"
              style={{ height: `${listTotalHeight}px` }}
            >
              {FRIEND_LEADERBOARD_BASE.map((entry) => {
                const rankIndex = indexById.get(entry.id) ?? 0;
                const rankNum = rankIndex + 1;
                const topPx = rankIndex * (ROW_HEIGHT + ROW_GAP);
                const isCrownedTop = Boolean(entry.isAnamika && friendOverride);

                return (
                  <div
                    key={entry.id}
                    data-rank={rankNum}
                    style={{
                      height: `${ROW_HEIGHT}px`,
                      transform: `translate3d(0, ${topPx}px, 0)`,
                    }}
                    className={`absolute inset-x-0 top-0 flex items-center justify-between rounded-2xl border px-4 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isCrownedTop
                        ? 'z-20 border-[#E6C75A] bg-gradient-to-r from-[#FFE898]/85 via-[#FFE4F0]/90 to-[#EBE3FF]/85 shadow-[0_10px_24px_-10px_rgba(194,55,126,0.45)]'
                        : entry.isAnamika
                          ? 'z-10 border-[#F0BDD6] bg-[#FFE4F0]/45'
                          : 'border-[#EFE2F0] bg-[#FFFDF8]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold tabular-nums ${
                          isCrownedTop
                            ? 'bg-[#3B1535] text-[#FFE898]'
                            : 'bg-[#F4EAF7] text-[#5E3A7A]'
                        }`}
                      >
                        #{rankNum}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#3B1535]">
                          {entry.name}
                        </p>
                        <p className="truncate text-xs text-[#6B3B64]">
                          {isCrownedTop ? 'Top of the Friend List · Undisputed HG' : entry.tag}
                        </p>
                      </div>
                    </div>

                    {isCrownedTop && (
                      <span
                        aria-label="Rank 1 Crown"
                        className="animate-crown-hop inline-flex items-center gap-1 rounded-full bg-[#3B1535] px-2.5 py-1 text-xs font-bold text-[#FFE898] shrink-0"
                      >
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>#1 HG</span>
                      </span>
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
