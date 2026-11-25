import { Music, Pause } from 'lucide-react';

interface TopBarProps {
  isPlaying: boolean;
  onToggleMusic: () => void;
}

export function TopBar({ isPlaying, onToggleMusic }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-[#EFE0EE] bg-[#FFFDF8]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
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

        {/* Zone 3: Single primary top-bar action (Music Player Toggle) */}
        <button
          type="button"
          onClick={onToggleMusic}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Pause birthday tune' : 'Play birthday tune'}
          className={`inline-flex min-h-[40px] items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B1535] ${
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
    </header>
  );
}
