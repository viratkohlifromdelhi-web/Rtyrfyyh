import { Music, Pause } from 'lucide-react';

interface TopBarProps {
  isPlaying: boolean;
  onToggleMusic: () => void;
}

export function TopBar({ isPlaying, onToggleMusic }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-[#EED5DF] bg-[#FFFDF9]/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#top"
          className="font-display text-lg font-semibold italic tracking-tight text-[#4A122C] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B7416E]"
        >
          Kiara&rsquo;s 24th
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Birthday sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B334D]"
        >
          <a
            href="#schedule"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#4A122C] hover:underline underline-offset-4"
          >
            Schedule
          </a>
          <a
            href="#tribute"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#4A122C] hover:underline underline-offset-4"
          >
            Tribute
          </a>
          <a
            href="#why-we-love"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#4A122C] hover:underline underline-offset-4"
          >
            Why We Love Her
          </a>
          <a
            href="#guestbook"
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#4A122C] hover:underline underline-offset-4"
          >
            Memory Wall
          </a>
        </nav>

        {/* Zone 3: Single primary top-bar action (Music Player Toggle) */}
        <button
          type="button"
          onClick={onToggleMusic}
          aria-pressed={isPlaying}
          aria-label={isPlaying ? 'Pause birthday melody' : 'Play birthday melody'}
          className={`inline-flex min-h-[40px] items-center gap-2.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A122C] ${
            isPlaying
              ? 'bg-[#4A122C] text-[#FFFDF9] shadow-sm'
              : 'border border-[#E5B8C8] bg-[#FFF2F6] text-[#4A122C] hover:bg-[#FCE4EC]'
          }`}
        >
          {isPlaying ? (
            <>
              <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                <span className="animate-eq-1 h-full w-0.5 rounded-full bg-[#F7C6D7]" />
                <span className="animate-eq-2 h-full w-0.5 rounded-full bg-[#FDE2B8]" />
                <span className="animate-eq-3 h-full w-0.5 rounded-full bg-[#F7C6D7]" />
              </span>
              <span>Now Playing</span>
              <Pause className="h-3.5 w-3.5 opacity-80" aria-hidden="true" />
            </>
          ) : (
            <>
              <Music className="h-3.5 w-3.5 text-[#B7416E]" aria-hidden="true" />
              <span>Play Music</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
