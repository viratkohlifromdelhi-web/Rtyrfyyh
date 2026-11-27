import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import {
  formatCardCounter,
  getModeLabel,
  getNextCardIndex,
  getNotesForMode,
  getVisibleStackIndices,
  shouldCommitSwipe,
  type NoteDeckMode,
} from '../utils/noteDeck';
import { soundEngine } from '../utils/soundEngine';

interface BirthdayNoteDeckProps {
  isBirthdayTruce: boolean;
  onSelectMode: (nextIsTruce: boolean) => void;
}

const FLICK_DURATION_MS = 320;

function RightArrowSvg({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M3.25 8H12.75M12.75 8L8.75 4M12.75 8L8.75 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BirthdayNoteDeck({
  isBirthdayTruce,
  onSelectMode,
}: BirthdayNoteDeckProps) {
  const mode: NoteDeckMode = isBirthdayTruce ? 'birthdayTruce' : 'noFilter';
  const notes = getNotesForMode(mode);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitingDir, setExitingDir] = useState<'left' | 'right' | null>(null);
  const [prevMode, setPrevMode] = useState<NoteDeckMode>(mode);

  // Reset stack cleanly back to card 1 whenever mode switches (from either pill or Quick Switch)
  if (mode !== prevMode) {
    setPrevMode(mode);
    setCurrentIndex(0);
    setExitingDir(null);
  }

  // Direct DOM refs for 60fps pointer swipe without triggering React re-renders during drag
  const topCardRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const isHorizontalDragRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentDxRef = useRef(0);
  const flickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flickTimerRef.current !== null) {
        window.clearTimeout(flickTimerRef.current);
      }
    };
  }, []);

  const commitCardAdvance = useCallback(
    (direction: 'left' | 'right', source: 'swipe' | 'button') => {
      if (exitingDir !== null) return;

      const nextIndex = getNextCardIndex(currentIndex, notes.length);
      soundEngine.playPaperFlick();
      haptics.noteCardFlick();
      emitModinoEvent('friends_and_banter');
      trackEvent('note_card_cycled', `${getModeLabel(mode)} Note Deck`, {
        mode: getModeLabel(mode),
        fromIndex: currentIndex + 1,
        toIndex: nextIndex + 1,
        source,
      });

      setExitingDir(direction);

      const cardEl = topCardRef.current;
      if (cardEl) {
        cardEl.style.transition = `transform ${FLICK_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${FLICK_DURATION_MS}ms ease-out`;
        const sign = direction === 'left' ? -1 : 1;
        cardEl.style.transform = `translate3d(${sign * 112}%, -12px, 0) rotate(${sign * 12}deg)`;
        cardEl.style.opacity = '0';
      }

      if (flickTimerRef.current !== null) {
        window.clearTimeout(flickTimerRef.current);
      }
      flickTimerRef.current = window.setTimeout(() => {
        flickTimerRef.current = null;
        setCurrentIndex(nextIndex);
        setExitingDir(null);
      }, FLICK_DURATION_MS);
    },
    [currentIndex, exitingDir, mode, notes.length],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (exitingDir !== null) return;
      isPointerDownRef.current = true;
      isHorizontalDragRef.current = false;
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      startTimeRef.current = performance.now();
      currentDxRef.current = 0;

      const cardEl = topCardRef.current;
      if (cardEl) {
        cardEl.style.transition = 'none';
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore capture failures on synthetic/unsupported pointers
      }
    },
    [exitingDir],
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!isHorizontalDragRef.current) {
      if (Math.abs(dx) > 6 && Math.abs(dx) >= Math.abs(dy)) {
        isHorizontalDragRef.current = true;
      } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        isPointerDownRef.current = false;
        return;
      } else {
        return;
      }
    }

    currentDxRef.current = dx;
    const cardEl = topCardRef.current;
    if (cardEl) {
      const rot = Math.max(-14, Math.min(14, dx * 0.048));
      const liftY = -Math.min(10, Math.abs(dx) * 0.04);
      const fade = Math.max(0.76, 1 - Math.abs(dx) / 420);
      cardEl.style.transform = `translate3d(${dx.toFixed(1)}px, ${liftY.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`;
      cardEl.style.opacity = fade.toFixed(3);
    }
  }, []);

  const handlePointerFinish = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isPointerDownRef.current) return;
      isPointerDownRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore release errors
      }

      const dx = currentDxRef.current;
      const elapsedMs = Math.max(16, performance.now() - startTimeRef.current);
      const velocity = dx / elapsedMs;
      const committedDir = isHorizontalDragRef.current ? shouldCommitSwipe(dx, velocity) : null;

      currentDxRef.current = 0;
      isHorizontalDragRef.current = false;

      if (committedDir) {
        commitCardAdvance(committedDir, 'swipe');
        return;
      }

      const cardEl = topCardRef.current;
      if (cardEl) {
        cardEl.style.transition =
          'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease';
        cardEl.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        cardEl.style.opacity = '1';
      }
    },
    [commitCardAdvance],
  );

  const visibleIndices = getVisibleStackIndices(currentIndex, notes.length);

  return (
    <div
      data-testid="mode-message-card"
      data-mode={mode}
      data-card-index={currentIndex}
      className={`flex flex-col justify-between rounded-[26px] border-[1.5px] p-5 shadow-[0_16px_38px_-22px_rgba(58,18,51,0.2)] transition-colors duration-400 sm:p-7 lg:col-span-5 ${
        isBirthdayTruce
          ? 'border-[#E6C7A3] bg-[#FFFBF2]'
          : 'border-[#F0C2D5] bg-[#FFF8FA]'
      }`}
    >
      {/* Top Sliding Segmented Pill Switch + Stacked Stationery Deck */}
      <div className="flex flex-1 flex-col">
        <div
          role="tablist"
          aria-label="Birthday note deck mode"
          data-testid="note-mode-segmented-switch"
          className={`relative grid w-full grid-cols-2 rounded-full border p-1 transition-colors duration-300 ${
            isBirthdayTruce
              ? 'border-[#E6C7A3] bg-[#FBF1DF]/85'
              : 'border-[#F0C2D5] bg-[#FFE6F0]/75'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-[#3A1233] shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isBirthdayTruce ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          <button
            type="button"
            role="tab"
            data-testid="note-mode-tab-no-filter"
            aria-selected={!isBirthdayTruce}
            onClick={() => onSelectMode(false)}
            className={`relative z-10 cursor-pointer rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
              !isBirthdayTruce ? 'text-[#FFFDFB]' : 'text-[#6B2B56] hover:text-[#3A1233]'
            }`}
          >
            No Filter
          </button>
          <button
            type="button"
            role="tab"
            data-testid="note-mode-tab-birthday-truce"
            aria-selected={isBirthdayTruce}
            onClick={() => onSelectMode(true)}
            className={`relative z-10 cursor-pointer rounded-full px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
              isBirthdayTruce ? 'text-[#FFFDFB]' : 'text-[#7A5438] hover:text-[#3A1233]'
            }`}
          >
            Birthday Truce
          </button>
        </div>

        {/* Interactive 4-Card Physical Stationery Stack (295px height + 28px clearance below) */}
        <div
          data-testid="note-deck-stage"
          className="relative my-auto mt-5 mb-[28px] h-[295px] sm:h-[304px]"
        >
          {/* Render back-to-front so top card (depth 0) sits cleanly on top */}
          {[...visibleIndices].reverse().map((noteIdx, reversePos) => {
            const depth = visibleIndices.length - 1 - reversePos;
            const item = notes[noteIdx];
            const isTop = depth === 0;
            const isPromoting = exitingDir !== null && depth === 1;

            // Clearly visible layered peeking stack below the active card
            let stackTransform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
            let stackOpacity = 1;
            let stackZ = 'z-30';

            if (depth === 1) {
              stackTransform = isPromoting
                ? 'translate3d(0, 0, 0) scale(1) rotate(0deg)'
                : 'translate3d(0, 9px, 0) scale(0.96) rotate(-1.8deg)';
              stackOpacity = isPromoting ? 1 : 0.96;
              stackZ = 'z-20';
            } else if (depth === 2) {
              stackTransform = isPromoting
                ? 'translate3d(0, 9px, 0) scale(0.96) rotate(-1.8deg)'
                : 'translate3d(0, 17px, 0) scale(0.92) rotate(2deg)';
              stackOpacity = isPromoting ? 0.96 : 0.84;
              stackZ = 'z-10';
            }

            return (
              <div
                key={`${mode}-${item.id}`}
                ref={isTop ? topCardRef : undefined}
                data-testid={isTop ? 'note-deck-active-card' : `note-deck-stack-card-${depth}`}
                onPointerDown={isTop ? handlePointerDown : undefined}
                onPointerMove={isTop ? handlePointerMove : undefined}
                onPointerUp={isTop ? handlePointerFinish : undefined}
                onPointerCancel={isTop ? handlePointerFinish : undefined}
                style={{
                  transform: stackTransform,
                  opacity: stackOpacity,
                  touchAction: isTop ? 'pan-y' : 'auto',
                  transition:
                    'transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease, border-color 300ms ease, background-color 300ms ease',
                }}
                className={`absolute inset-0 box-border flex h-full flex-col justify-between overflow-hidden rounded-[22px] border px-[20px] pt-[20px] pb-[16px] select-none will-change-[transform,opacity] ${stackZ} ${
                  isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                } ${
                  isBirthdayTruce
                    ? 'border-[#E2C29E] bg-[#FFFDF8] shadow-[0_12px_26px_-16px_rgba(122,74,40,0.22),0_3px_10px_-4px_rgba(58,18,51,0.1)]'
                    : 'border-[rgba(58,18,51,0.12)] bg-[#FFFFFF] shadow-[0_12px_26px_-16px_rgba(58,18,51,0.2),0_3px_10px_-4px_rgba(217,75,125,0.1)]'
                }`}
              >
                {/* Locked Single-Row Card Header (Zero Wrapping, Crisp Inline 13px SVG Arrow) */}
                <div
                  data-testid={isTop ? 'note-deck-card-header' : undefined}
                  className="flex flex-nowrap items-center justify-between gap-2 border-b border-[#3A1233]/8 pb-2.5"
                >
                  <span
                    data-testid={isTop ? 'note-deck-counter' : undefined}
                    className={`shrink-0 whitespace-nowrap font-mono text-[10.5px] font-semibold tracking-[0.08em] uppercase tabular-nums ${
                      isBirthdayTruce ? 'text-[#9A633C]' : 'text-[#C44274]'
                    }`}
                  >
                    {formatCardCounter(mode, noteIdx, notes.length)}
                  </span>

                  <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10.5px] font-semibold tracking-[0.04em] text-[#8A617F]">
                    <span>Swipe</span>
                    <RightArrowSvg size={13} />
                  </span>
                </div>

                {/* Centered Serif Note Body (17.5px / 1.52 line-height — Zero Overflow) */}
                <p
                  data-testid={isTop ? 'note-deck-active-text' : undefined}
                  className="font-display my-auto py-2 text-[17.5px] leading-[1.52] font-medium text-[#3A1233]"
                >
                  {item.text}
                </p>

                {/* Quiet Stationery Footer Strictly Inside Card Border */}
                <div
                  data-testid={isTop ? 'note-deck-card-footer' : undefined}
                  className="flex flex-nowrap items-center justify-between gap-2 border-t border-[#3A1233]/8 pt-2.5 text-[11px] font-medium text-[#8B6280]"
                >
                  <span className="truncate">
                    {isBirthdayTruce ? '24 hour birthday truce' : 'Unfiltered best friend notes'}
                  </span>
                  <span className="shrink-0 whitespace-nowrap font-mono text-[10px] opacity-75">
                    03 DEC 2026
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls: 4 Dot Indicators + Tactile Next Note Pill With 14px SVG Arrow */}
      <div className="flex items-center justify-between gap-3 border-t border-[#3A1233]/10 pt-4">
        <div
          role="group"
          aria-label="Card deck progress"
          data-testid="note-deck-dots"
          className="flex items-center gap-1.5"
        >
          {notes.map((n, idx) => {
            const isActive = idx === currentIndex;
            return (
              <span
                key={n.id}
                aria-hidden="true"
                data-active={String(isActive)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive
                    ? isBirthdayTruce
                      ? 'w-5 bg-[#9A633C]'
                      : 'w-5 bg-[#D94B7D]'
                    : 'w-2 bg-[#3A1233]/20'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          data-testid="next-note-btn"
          onClick={() => commitCardAdvance('right', 'button')}
          disabled={exitingDir !== null}
          className={`inline-flex cursor-pointer items-center gap-[6px] rounded-full border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
            isBirthdayTruce
              ? 'border-[#DFBA92] bg-[#FFFDF8] text-[#3A1233] shadow-2xs hover:border-[#C59361] hover:bg-[#FFF6E5]'
              : 'border-[#EBB8CE] bg-[#FFFFFF] text-[#3A1233] shadow-2xs hover:border-[#D94B7D] hover:bg-[#FFF1F6]'
          }`}
        >
          <span>Next Note</span>
          <RightArrowSvg size={14} />
        </button>
      </div>
    </div>
  );
}
