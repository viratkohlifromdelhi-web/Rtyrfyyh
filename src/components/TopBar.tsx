import { Music, Pause, Volume2, VolumeX } from 'lucide-react';

interface TopBarProps {
  isPlaying: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
}

export function TopBar({
  isPlaying,
  onToggleMusic,
  sfxEnabled,
  onToggleSfx,
}: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-[#EFE0EE] bg-[#FFFDF8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-semibold italic tracking-tight text-[#3B1535] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2377E]"
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
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
          >
            Vibe Controls
          </a>
          <a
            href="#calendar"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
          >
            Dec 2026
          </a>
          <a
            href="#backstory"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
          >
            Backstory
          </a>
          <a
            href="#agreement"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
          >
            Fun Zone
          </a>
          <a
            href="#gift"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3B1535] hover:underline underline-offset-4"
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
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-150 shrink-0 cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
              sfxEnabled
                ? 'border-[#E6C5DF] bg-[#FFFDF8] text-[#C2377E] hover:bg-[#FFE4F0]'
                : 'border-[#E6C5DF] bg-[#F5EDF4] text-[#8E6A89] hover:bg-[#FFE4F0]/60'
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
            onClick={onToggleMusic}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause birthday tune' : 'Play birthday tune'}
            className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
              isPlaying
                ? 'bg-[#3B1535] text-[#FFFDF8] shadow-sm'
                : 'border border-[#E6C5DF] bg-[#FFE4F0]/75 text-[#3B1535] hover:bg-[#FFE4F0]'
            }`}
          >
            {isPlaying ? (
              <>
                <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                  <span className="animate-eq-1 h-full w-0.5 rounded-full bg-[#FFE4F0]" />
                  <span className="animate-eq-2 h-full w-0.5 rounded-full bg-[#FFE898]" />
                  <span className="animate-eq-3 h-full w-0.5 rounded-full bg-[#EBE3FF]" />
                </span>
                <span>Now Playing</span>
                <Pause className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
              </>
            ) : (
              <>
                <Music className="h-3.5 w-3.5 text-[#C2377E]" aria-hidden="true" />
                <span>Play Music</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
