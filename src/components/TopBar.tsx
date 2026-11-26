import { Music, Pause, Volume2, VolumeX } from 'lucide-react';

interface TopBarProps {
  isPlaying: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  showMusicHint?: boolean;
}

export function TopBar({
  isPlaying,
  onToggleMusic,
  sfxEnabled,
  onToggleSfx,
  showMusicHint = false,
}: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-[#EFE0EE] bg-[#FFFDF8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-semibold italic tracking-tight text-[#3A1233] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D]"
        >
          Anamika&rsquo;s 17th
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Birthday sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B3B64]"
        >
          <a
            href="#toggles"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Vibe Controls
          </a>
          <a
            href="#calendar"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Dec 2026
          </a>
          <a
            href="#backstory"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Backstory
          </a>
          <a
            href="#agreement"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Fun Zone
          </a>
          <a
            href="#gift"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Surprise Gift
          </a>
        </nav>

        {/* Zone 3: Compact SFX Toggle + Music Player Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="sfx-toggle-btn"
            onClick={onToggleSfx}
            aria-pressed={sfxEnabled}
            aria-label={sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            title={sfxEnabled ? 'Sound effects: On' : 'Sound effects: Muted'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150 shrink-0 cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
              sfxEnabled
                ? 'border-[#E6C5DF] bg-[#FFFDF8] text-[#D94B7D] hover:bg-[#FFE6F0]'
                : 'border-[#E6C5DF] bg-[#F5EDF4] text-[#8E6A89] hover:bg-[#FFE6F0]/60'
            }`}
          >
            {sfxEnabled ? (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid="music-toggle-btn"
            onClick={onToggleMusic}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause birthday tune' : 'Play birthday tune'}
            className={`relative inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
              isPlaying
                ? 'bg-[#3A1233] text-[#FFFDF8] shadow-sm'
                : showMusicHint
                  ? 'border border-[#E7A8C2] bg-[#FFE6F0] text-[#3A1233] shadow-[0_6px_16px_-8px_rgba(217,75,125,0.45)] hover:bg-[#FFD9EA]'
                  : 'border border-[#E6C5DF] bg-[#FFE6F0]/75 text-[#3A1233] hover:bg-[#FFE6F0]'
            }`}
          >
            {!isPlaying && showMusicHint && (
              <span
                aria-hidden="true"
                className="animate-theatre-sound-pulse pointer-events-none absolute inset-0 rounded-full border-2 border-[#D94B7D] will-change-[transform,opacity]"
              />
            )}
            {isPlaying ? (
              <>
                <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                  <span className="animate-eq-1 h-full w-0.5 rounded-full bg-[#FFE6F0]" />
                  <span className="animate-eq-2 h-full w-0.5 rounded-full bg-[#FFF3C4]" />
                  <span className="animate-eq-3 h-full w-0.5 rounded-full bg-[#F1E9FF]" />
                </span>
                <span>Now Playing</span>
                <Pause className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
              </>
            ) : showMusicHint ? (
              <span className="relative z-10">Tap for music 🎵</span>
            ) : (
              <>
                <Music className="h-3.5 w-3.5 text-[#D94B7D]" aria-hidden="true" />
                <span>Play Music</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
