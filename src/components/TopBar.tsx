import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Music, Pause, Volume2, VolumeX } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import {
  HEADER_EASTER_EGG_MESSAGE,
  HEADER_EASTER_EGG_TOAST_FADE_MS,
  HEADER_EASTER_EGG_TOAST_VISIBLE_MS,
  advanceHeaderTapStreak,
} from '../utils/headerEasterEgg';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';

interface TopBarProps {
  isPlaying: boolean;
  onToggleMusic: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  showMusicHint?: boolean;
  onHeaderEasterEgg?: (originX: number, originY: number) => void;
}

export function TopBar({
  isPlaying,
  onToggleMusic,
  sfxEnabled,
  onToggleSfx,
  showMusicHint = false,
  onHeaderEasterEgg,
}: TopBarProps) {
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);

  const clearToastTimers = useCallback(() => {
    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (fadeTimerRef.current !== null) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearToastTimers, [clearToastTimers]);

  const handleBrandTap = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const result = advanceHeaderTapStreak(
        {
          count: tapCountRef.current,
          lastTapMs: lastTapTimeRef.current,
        },
        Date.now(),
      );

      tapCountRef.current = result.nextCount;
      lastTapTimeRef.current = result.nextLastTapMs;

      if (!result.unlocked) {
        try {
          haptics.tap();
        } catch {
          // silent
        }
        return;
      }

      try {
        haptics.celebrate();
      } catch {
        // silent
      }
      try {
        soundEngine.playPastelMarimbaChime();
      } catch {
        // silent
      }
      try {
        trackEvent('header_easter_egg_unlocked', 'Sticky Header');
      } catch {
        // silent
      }

      const rect = event.currentTarget.getBoundingClientRect();
      onHeaderEasterEgg?.(rect.left + rect.width / 2, rect.bottom + 8);

      clearToastTimers();
      setToastFading(false);
      setToastVisible(true);

      dismissTimerRef.current = window.setTimeout(() => {
        setToastFading(true);
        dismissTimerRef.current = null;
        fadeTimerRef.current = window.setTimeout(() => {
          setToastVisible(false);
          setToastFading(false);
          fadeTimerRef.current = null;
        }, HEADER_EASTER_EGG_TOAST_FADE_MS);
      }, HEADER_EASTER_EGG_TOAST_VISIBLE_MS);
    },
    [clearToastTimers, onHeaderEasterEgg],
  );

  return (
    <>
      <header
        className="fixed top-0 right-0 left-0 z-40 border-b border-[#EFE0EE] bg-[#FFFDF8]/95 backdrop-blur-md"
        style={{ height: 'clamp(56px, 7vw, 70px)' }}
      >
        <div className="mx-auto flex h-full w-full max-w-[var(--header-max)] lg:max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand wordmark */}
          <button
            type="button"
            data-testid="header-brand-btn"
            onClick={handleBrandTap}
            className="font-display border-0 bg-transparent p-0 text-left font-semibold italic tracking-tight text-[#3A1233] whitespace-nowrap shrink-0 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D]"
            style={{ fontSize: 'clamp(18px, 2.5vw, 25px)' }}
          >
            Anamika&rsquo;s 17th
          </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Birthday sections"
          className="hidden lg:flex items-center gap-6 xl:gap-7 text-sm font-medium text-[#6B3B64]"
        >
          <a
            href="#toggles"
            onClick={() => emitModinoEvent('friends_and_banter', { source: 'nav-toggles' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Vibe Controls
          </a>
          <a
            href="#calendar"
            onClick={() => emitModinoEvent('cute', { source: 'nav-calendar' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Dec 2026
          </a>
          <a
            href="#backstory"
            onClick={() => emitModinoEvent('backstory', { source: 'nav-backstory' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Backstory
          </a>
          <a
            href="#agreement"
            onClick={() => emitModinoEvent('interaction_hype', { source: 'nav-fun-zone' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Fun Zone
          </a>
          <a
            href="#gift"
            onClick={() => emitModinoEvent('interaction_hype', { source: 'nav-gift' })}
            className="whitespace-nowrap shrink-0 transition-colors hover:text-[#3A1233] hover:underline underline-offset-4"
          >
            Surprise Gift
          </a>
        </nav>

        {/* Zone 3: Compact SFX Toggle + Music Player Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="sfx-toggle-btn"
            onClick={onToggleSfx}
            aria-pressed={sfxEnabled}
            aria-label={sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'}
            title={sfxEnabled ? 'Sound effects: On' : 'Sound effects: Muted'}
            className={`inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border transition-all duration-150 shrink-0 cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
              sfxEnabled
                ? 'border-[#E6C5DF] bg-[#FFFDF8] text-[#D94B7D] hover:bg-[#FFE6F0]'
                : 'border-[#E6C5DF] bg-[#F5EDF4] text-[#8E6A89] hover:bg-[#FFE6F0]/60'
            }`}
          >
            {sfxEnabled ? (
              <Volume2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            ) : (
              <VolumeX className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            data-testid="music-toggle-btn"
            onClick={onToggleMusic}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? 'Pause birthday tune' : 'Play birthday tune'}
            className={`relative inline-flex min-h-[40px] sm:min-h-[44px] items-center gap-2 rounded-full px-3.5 py-1.5 text-xs sm:text-[13.5px] font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer sm:px-4.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
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

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          data-testid="header-easter-egg-toast"
          className={`pointer-events-none fixed left-1/2 z-[60] w-max max-w-[92vw] -translate-x-1/2 rounded-full border border-[#E7A8C2] bg-[#FFFDF8]/98 px-4 py-2 text-center text-[11.5px] font-semibold tracking-tight text-[#3A1233] shadow-[0_14px_30px_-10px_rgba(184,50,101,0.34)] backdrop-blur-md transition-opacity duration-[240ms] ease-out sm:text-[14px] ${
            toastFading ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ top: 'calc(clamp(56px, 7vw, 70px) + 10px)' }}
        >
          {HEADER_EASTER_EGG_MESSAGE}
        </div>
      )}
    </>
  );
}
