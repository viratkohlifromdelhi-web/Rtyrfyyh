import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Delete, X } from 'lucide-react';
import {
  BYPASS_FADE_OUT_MS,
  BYPASS_TOAST_HOLD_MS,
  MIDNIGHT_AUTO_BANNER_HEADLINE,
  MIDNIGHT_AUTO_CTA_LABEL,
  MIDNIGHT_CELEBRATION_HOLD_MS,
  MIDNIGHT_FADE_OUT_MS,
  MIDNIGHT_POLL_INTERVAL_MS,
  UNLOCK_TIME_MS,
  computeCountdownParts,
  evaluateMidnightBypassCode,
  writeMidnightBypass,
  type ActiveBluffCode,
  type MidnightCountdownParts,
} from '../utils/midnightLock';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { unlockKissAudioContext } from './originStory/kissAudioSingleton';
import { CountdownBluffView } from './CountdownBluffView';

interface MidnightLockOverlayProps {
  onUnlock: () => void;
  targetTimeMs?: number;
}

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'] as const;

const PASTEL_SPARKLES = [
  { top: '10%', left: '12%', size: 16, color: '#D94B7D', delay: '0s', cls: 'animate-twinkle' },
  { top: '16%', right: '14%', size: 14, color: '#E8A3BE', delay: '0.7s', cls: 'animate-float-gentle' },
  { top: '28%', left: '8%', size: 11, color: '#C6A3FF', delay: '1.2s', cls: 'animate-float-reverse' },
  { top: '24%', right: '9%', size: 18, color: '#F3C969', delay: '0.4s', cls: 'animate-twinkle' },
  { bottom: '22%', left: '11%', size: 15, color: '#F59BB9', delay: '1.5s', cls: 'animate-float-gentle' },
  { bottom: '15%', right: '16%', size: 13, color: '#C6A3FF', delay: '0.9s', cls: 'animate-twinkle' },
  { bottom: '30%', right: '7%', size: 11, color: '#D94B7D', delay: '1.9s', cls: 'animate-float-reverse' },
  { top: '64%', left: '6%', size: 12, color: '#F3C969', delay: '0.3s', cls: 'animate-twinkle' },
] as const;

const MIDNIGHT_CONFETTI_PIECES = [
  { left: '8%', dx: '24px', rot: '220deg', delay: '0ms', dur: '1450ms', color: '#D94B7D', w: 9, h: 14 },
  { left: '15%', dx: '-18px', rot: '-260deg', delay: '40ms', dur: '1550ms', color: '#E6B85C', w: 8, h: 8 },
  { left: '22%', dx: '32px', rot: '310deg', delay: '80ms', dur: '1600ms', color: '#C6A3FF', w: 10, h: 13 },
  { left: '30%', dx: '-24px', rot: '-190deg', delay: '20ms', dur: '1500ms', color: '#F59BB9', w: 8, h: 12 },
  { left: '38%', dx: '20px', rot: '280deg', delay: '100ms', dur: '1650ms', color: '#F3C969', w: 9, h: 9 },
  { left: '46%', dx: '-16px', rot: '-240deg', delay: '50ms', dur: '1480ms', color: '#D94B7D', w: 10, h: 14 },
  { left: '54%', dx: '28px', rot: '250deg', delay: '10ms', dur: '1520ms', color: '#E889AE', w: 8, h: 12 },
  { left: '62%', dx: '-28px', rot: '-300deg', delay: '90ms', dur: '1620ms', color: '#C6A3FF', w: 9, h: 9 },
  { left: '70%', dx: '22px', rot: '210deg', delay: '30ms', dur: '1540ms', color: '#E6B85C', w: 9, h: 13 },
  { left: '78%', dx: '-20px', rot: '-270deg', delay: '70ms', dur: '1580ms', color: '#F59BB9', w: 8, h: 8 },
  { left: '85%', dx: '18px', rot: '240deg', delay: '110ms', dur: '1640ms', color: '#D94B7D', w: 10, h: 13 },
  { left: '92%', dx: '-26px', rot: '-220deg', delay: '60ms', dur: '1500ms', color: '#F3C969', w: 8, h: 12 },
  { left: '19%', dx: '14px', rot: '180deg', delay: '140ms', dur: '1700ms', color: '#F7C7DC', w: 7, h: 11 },
  { left: '50%', dx: '-12px', rot: '-210deg', delay: '120ms', dur: '1680ms', color: '#E6B85C', w: 9, h: 9 },
  { left: '74%', dx: '16px', rot: '290deg', delay: '150ms', dur: '1720ms', color: '#C6A3FF', w: 8, h: 12 },
  { left: '34%', dx: '-14px', rot: '-230deg', delay: '130ms', dur: '1660ms', color: '#E889AE', w: 9, h: 9 },
] as const;

export function MidnightLockOverlay({
  onUnlock,
  targetTimeMs = UNLOCK_TIME_MS,
}: MidnightLockOverlayProps) {
  const [countdown, setCountdown] = useState<MidnightCountdownParts>(() =>
    computeCountdownParts(Date.now(), targetTimeMs),
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [needsTapToEnterStage2, setNeedsTapToEnterStage2] = useState(false);
  const [exitMode, setExitMode] = useState<'none' | 'midnight' | 'bypass'>('none');
  const [bypassToastVisible, setBypassToastVisible] = useState(false);

  // Discreet bottom-right key bypass modal & fullscreen bluff state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeBluff, setActiveBluff] = useState<ActiveBluffCode | null>(null);
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  const hasAutoUnlockedRef = useRef(false);
  const userHasGesturedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number): number => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  // Lock body & document scroll strictly while this overlay is mounted, and note any prior gesture
  useEffect(() => {
    trackEvent('midnight_lock_viewed', 'Midnight Countdown Lock');
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    const markGesture = () => {
      userHasGesturedRef.current = true;
    };
    window.addEventListener('pointerdown', markGesture, { passive: true });
    window.addEventListener('keydown', markGesture, { passive: true });

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      window.removeEventListener('pointerdown', markGesture);
      window.removeEventListener('keydown', markGesture);
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen]);

  // Autoplay-safe tap handoff when browser stayed idle through 11:59 PM -> 12:00 AM IST
  const handleOpenMidnightSurpriseTap = useCallback(() => {
    try {
      haptics.celebrate();
    } catch {
      // silent
    }
    try {
      unlockKissAudioContext();
      bgMusicPlayer.warmUp();
      soundEngine.playVaultUnlock();
    } catch {
      // silent
    }
    setExitMode('midnight');
    scheduleTimer(() => {
      onUnlock();
    }, MIDNIGHT_FADE_OUT_MS);
  }, [onUnlock, scheduleTimer]);

  // Trigger live midnight celebration when countdown crosses 00:00:00:00 (single-fire guard)
  const triggerMidnightCelebration = useCallback(() => {
    if (hasAutoUnlockedRef.current) return;
    hasAutoUnlockedRef.current = true;
    try {
      haptics.celebrate();
    } catch {
      // silent
    }
    try {
      trackEvent('midnight_auto_unlocked', 'Midnight Countdown Auto Unlock');
    } catch {
      // silent
    }
    setActiveBluff(null);
    setModalOpen(false);
    setIsCelebrating(true);
    try {
      soundEngine.playVaultUnlock();
    } catch {
      // silent
    }

    scheduleTimer(() => {
      const browserActivation = (
        navigator as Navigator & { userActivation?: { hasBeenActive?: boolean; isActive?: boolean } }
      ).userActivation;
      const canAutoplayUnmuted =
        Boolean(browserActivation?.isActive) ||
        (browserActivation === undefined && userHasGesturedRef.current);

      if (canAutoplayUnmuted) {
        try {
          unlockKissAudioContext();
          bgMusicPlayer.warmUp();
        } catch {
          // silent
        }
        setExitMode('midnight');
        scheduleTimer(() => {
          onUnlock();
        }, MIDNIGHT_FADE_OUT_MS);
      } else {
        // Show single zero-passcode luminous CTA so one tap starts Stage 2 with crisp unmuted audio
        setNeedsTapToEnterStage2(true);
      }
    }, MIDNIGHT_CELEBRATION_HOLD_MS);
  }, [onUnlock, scheduleTimer]);

  // High-precision 250ms countdown polling + immediate visibilitychange & window focus resume check
  useEffect(() => {
    const syncTick = () => {
      const next = computeCountdownParts(Date.now(), targetTimeMs);
      setCountdown(next);
      if (next.isUnlocked) {
        triggerMidnightCelebration();
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncTick();
      }
    };

    syncTick();
    const intervalId = window.setInterval(syncTick, MIDNIGHT_POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', syncTick);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', syncTick);
    };
  }, [targetTimeMs, triggerMidnightCelebration]);

  // Trigger secret 9876 bypass unlock
  const triggerSecretBypass = useCallback(() => {
    if (hasAutoUnlockedRef.current) return;
    hasAutoUnlockedRef.current = true;
    haptics.success();
    unlockKissAudioContext();
    bgMusicPlayer.warmUp();
    writeMidnightBypass();
    soundEngine.playVaultUnlock();

    setActiveBluff(null);
    setModalOpen(false);
    setDigits('');
    setErrorMsg(null);
    setBypassToastVisible(true);

    scheduleTimer(() => {
      setExitMode('bypass');
      scheduleTimer(() => {
        onUnlock();
      }, BYPASS_FADE_OUT_MS);
    }, BYPASS_TOAST_HOLD_MS);
  }, [onUnlock, scheduleTimer]);

  const handleCloseBluff = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    try {
      soundEngine.playBubbleClick(0.95);
    } catch {
      // silent
    }
    setActiveBluff(null);
    setDigits('');
    setErrorMsg(null);
  }, []);

  const submitBypassCode = useCallback(
    (fourDigits: string) => {
      const result = evaluateMidnightBypassCode(fourDigits);

      if (result === 'bypass') {
        try {
          trackEvent('midnight_bypass_attempt', 'Midnight Bypass Keypad', {
            codeEntered: fourDigits,
            success: true,
          });
        } catch {
          // silent
        }
        triggerSecretBypass();
        return;
      }

      if (result === 'bluff_1507') {
        try {
          haptics.celebrate();
        } catch {
          // silent
        }
        try {
          soundEngine.playBluffClownTrombone();
        } catch {
          // silent
        }
        try {
          trackEvent('bluff_passcode_1507_unlocked', 'Midnight Lock Bluff');
        } catch {
          // silent
        }
        setModalOpen(false);
        setDigits('');
        setErrorMsg(null);
        setActiveBluff('1507');
        return;
      }

      if (result === 'bluff_0312') {
        try {
          haptics.bluffMiddleFinger();
        } catch {
          // silent
        }
        try {
          soundEngine.playBluffBuzzerBoing();
        } catch {
          // silent
        }
        try {
          trackEvent('bluff_passcode_0312_unlocked', 'Midnight Lock Bluff');
        } catch {
          // silent
        }
        setModalOpen(false);
        setDigits('');
        setErrorMsg(null);
        setActiveBluff('0312');
        return;
      }

      try {
        haptics.error();
      } catch {
        // silent
      }
      try {
        soundEngine.playVaultWrongCode();
      } catch {
        // silent
      }
      try {
        trackEvent('midnight_bypass_attempt', 'Midnight Bypass Keypad', {
          codeEntered: fourDigits,
          success: false,
        });
      } catch {
        // silent
      }
      setErrorMsg('Wait for midnight 👀');
      setShakeCount((c) => c + 1);
      scheduleTimer(() => {
        setDigits('');
      }, 320);
    },
    [scheduleTimer, triggerSecretBypass],
  );

  const handleDigitInput = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/\D/g, '').slice(0, 4);
      setErrorMsg(null);
      setDigits(cleaned);
      if (cleaned.length === 4) {
        submitBypassCode(cleaned);
      }
    },
    [submitBypassCode],
  );

  const handleKeyTap = useCallback(
    (key: (typeof KEYPAD_KEYS)[number]) => {
      haptics.tap();
      soundEngine.playVaultKeypadTap();
      if (key === 'CLEAR') {
        setDigits('');
        setErrorMsg(null);
        return;
      }
      if (key === 'BACK') {
        setDigits((prev) => prev.slice(0, -1));
        setErrorMsg(null);
        return;
      }
      if (digits.length >= 4) return;
      handleDigitInput(digits + key);
    },
    [digits, handleDigitInput],
  );

  const handleInputKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key >= '0' && e.key <= '9') || e.key === 'Backspace') {
      soundEngine.playVaultKeypadTap();
    }
  }, []);

  const isFadingOut = exitMode !== 'none';
  const fadeDurationClass = exitMode === 'midnight' ? 'duration-[450ms]' : 'duration-[400ms]';

  const units = [
    { key: 'days', label: 'Days', value: countdown.daysStr, isSeconds: false },
    { key: 'hours', label: 'Hours', value: countdown.hoursStr, isSeconds: false },
    { key: 'mins', label: 'Mins', value: countdown.minsStr, isSeconds: false },
    { key: 'secs', label: 'Secs', value: countdown.secsStr, isSeconds: true },
  ] as const;

  return (
    <div
      data-testid="midnight-lock-overlay"
      data-celebrating={String(isCelebrating)}
      data-final-five={String(countdown.isFinalFiveSeconds)}
      className={`fixed inset-0 z-[10000] flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-[#FFF6F9] px-4 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] transition-[opacity,transform] ease-out ${fadeDurationClass} ${
        isFadingOut
          ? exitMode === 'midnight'
            ? 'scale-[1.03] opacity-0 pointer-events-none'
            : 'opacity-0 pointer-events-none'
          : 'scale-100 opacity-100'
      }`}
    >
      {/* Subtle Rose-Cream atmospheric radial warmth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22% 18%, rgba(255, 224, 238, 0.72), transparent 46%), radial-gradient(circle at 80% 82%, rgba(241, 233, 255, 0.75), transparent 48%), radial-gradient(circle at 50% 50%, rgba(255, 243, 196, 0.25), transparent 60%)',
        }}
      />

      {/* Subtle drifting pastel sparkles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {PASTEL_SPARKLES.map((s, idx) => (
          <svg
            key={idx}
            width={s.size}
            height={s.size}
            viewBox="0 0 24 24"
            fill="none"
            className={`absolute opacity-60 ${s.cls}`}
            style={{
              top: 'top' in s ? s.top : undefined,
              bottom: 'bottom' in s ? s.bottom : undefined,
              left: 'left' in s ? s.left : undefined,
              right: 'right' in s ? s.right : undefined,
              animationDelay: s.delay,
            }}
          >
            <path
              d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
              fill={s.color}
            />
          </svg>
        ))}
      </div>

      {/* Celebratory Pastel Confetti Burst on True Midnight Auto-Unlock */}
      {isCelebrating && (
        <div
          aria-hidden="true"
          data-testid="midnight-confetti-burst"
          className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
        >
          {MIDNIGHT_CONFETTI_PIECES.map((piece, idx) => (
            <span
              key={idx}
              className="animate-midnight-confetti absolute top-0 rounded-sm will-change-transform"
              style={
                {
                  left: piece.left,
                  width: `${piece.w}px`,
                  height: `${piece.h}px`,
                  backgroundColor: piece.color,
                  '--mc-dx': piece.dx,
                  '--mc-rot': piece.rot,
                  '--mc-delay': piece.delay,
                  '--mc-dur': piece.dur,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Bypass Toast Notification */}
      {bypassToastVisible && (
        <div
          role="status"
          data-testid="midnight-bypass-toast"
          className="pointer-events-none fixed top-6 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#F5B8D0] bg-[#3A1233] px-4 py-2 text-xs font-bold tracking-wide text-[#FFF6F9] shadow-lg animate-pop-in"
        >
          Bypass unlocked ✨
        </div>
      )}

      {/* Centered All-Device Glass Card */}
      <div
        className="stage-short-landscape-card relative z-10 w-[min(92vw,400px)] sm:w-[min(88vw,580px)] rounded-[var(--card-radius)] border border-[#ECC0D2] bg-white/78 text-center shadow-[0_24px_60px_-24px_rgba(143,49,95,0.28)] backdrop-blur-md"
        style={{
          padding: 'var(--card-pad-y) var(--card-pad-x)',
        }}
      >
        {/* Top Animated Rose-Gold Padlock Icon (swaps to 🎂 at 00:00:00:00) */}
        <div
          className="mx-auto mb-3.5 sm:mb-4 flex items-center justify-center rounded-2xl border border-[#F3C4B8] bg-gradient-to-br from-[#FFF1EB] via-[#FFE2EC] to-[#F7C6D5] shadow-[0_10px_24px_-10px_rgba(217,75,125,0.45)]"
          style={{
            width: 'clamp(56px, 8vw, 84px)',
            height: 'clamp(56px, 8vw, 84px)',
          }}
        >
          <span
            data-testid="midnight-lock-icon"
            className={`leading-none select-none transition-transform duration-300 ${
              isCelebrating ? 'scale-110' : 'animate-midnight-lock-sway'
            }`}
            style={{ fontSize: 'clamp(28px, 4.2vw, 42px)' }}
            role="img"
            aria-label={isCelebrating ? 'Birthday cake' : 'Padlock'}
          >
            {isCelebrating ? '🎂' : '🔒'}
          </span>
        </div>

        {/* Blush Pill */}
        <div
          className="mb-3 inline-flex items-center justify-center rounded-full border border-[#F6C8DA] bg-[#FCE7F0] px-4 py-1.5 font-extrabold uppercase tracking-[0.14em] text-[#D94B7D]"
          style={{ fontSize: 'var(--text-eyebrow)' }}
        >
          {isCelebrating ? "🎉 IT'S MIDNIGHT · 03 DEC 2026" : '🎀 LOCKED UNTIL 12:00 AM · 3 DEC'}
        </div>

        {/* Heading & Casual Subtitle */}
        {isCelebrating ? (
          <div data-testid="midnight-celebration-msg" className="space-y-3">
            <div className="rounded-2xl border border-[#F3C58D]/70 bg-gradient-to-b from-[#FFFBF2] to-[#FFF0F6] px-4 py-3.5 shadow-[0_10px_24px_-14px_rgba(217,75,125,0.38)]">
              <h1
                className="font-display font-bold leading-snug tracking-tight text-[#3A1233]"
                style={{ fontSize: 'clamp(19px, 2.8vw, 28px)' }}
              >
                {MIDNIGHT_AUTO_BANNER_HEADLINE}
              </h1>
            </div>
            {needsTapToEnterStage2 ? (
              <div className="pt-1">
                <button
                  type="button"
                  data-testid="midnight-enter-surprise-btn"
                  onClick={handleOpenMidnightSurpriseTap}
                  className="btn-rose-berry inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-bold tracking-wide text-[#FFFDF9] shadow-[0_14px_30px_-10px_rgba(217,75,125,0.58)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                  style={{ minHeight: 'var(--btn-min-h)', fontSize: 'var(--text-body)' }}
                >
                  <span>{MIDNIGHT_AUTO_CTA_LABEL}</span>
                </button>
                <p className="mt-2 text-[#7A4A63]" style={{ fontSize: 'var(--text-sub)' }}>
                  Tap once to open with full sound and curtains.
                </p>
              </div>
            ) : (
              <p className="leading-relaxed text-[#7A4A63]" style={{ fontSize: 'var(--text-body)' }}>
                Happy 17th birthday, Morgan! Getting your surprise ready...
              </p>
            )}
          </div>
        ) : (
          <>
            <h1
              className="font-display font-bold tracking-tight text-[#3A1233]"
              style={{ fontSize: 'clamp(28px, 4.4vw, 44px)', lineHeight: 1.12 }}
            >
              Not yet, Morgan 👀
            </h1>
            <p
              className="mx-auto mt-2.5 max-w-[32ch] sm:max-w-[40ch] leading-relaxed text-[#7A4A63]"
              style={{ fontSize: 'var(--text-body)' }}
            >
              Nice try, bauni. Come back at midnight on 3rd December to open your surprise.
            </p>
          </>
        )}

        {/* Live 4-Unit Countdown Grid (Days, Hours, Mins, Secs) with tabular-nums */}
        <div
          data-testid="midnight-countdown-grid"
          className="mt-5 sm:mt-6 grid grid-cols-4 gap-2 sm:gap-3.5"
          aria-live="off"
        >
          {units.map((unit) => {
            const pulseSeconds = unit.isSeconds && countdown.isFinalFiveSeconds && !isCelebrating;
            return (
              <div
                key={unit.key}
                data-testid={`midnight-tile-${unit.key}`}
                className={`flex flex-col items-center justify-center rounded-2xl border px-1.5 py-3 sm:py-4 transition-colors duration-300 ${
                  pulseSeconds
                    ? 'border-[#D94B7D] bg-gradient-to-b from-[#FFE6F0] to-[#FFD4E5] animate-midnight-sec-pulse'
                    : 'border-[#EFC3B7]/85 bg-gradient-to-b from-[#FFF9FB] to-[#FCEAF1] shadow-[0_6px_16px_-10px_rgba(143,49,95,0.28)]'
                }`}
              >
                <span
                  data-testid={`midnight-val-${unit.key}`}
                  className={`font-display font-bold leading-none tabular-nums ${
                    pulseSeconds ? 'text-[#D94B7D]' : 'text-[#3A1233]'
                  }`}
                  style={{ fontSize: 'clamp(26px, 4.5vw, 46px)' }}
                >
                  {unit.value}
                </span>
                <span
                  className="mt-1.5 font-bold uppercase tracking-[0.12em] text-[#8E5673]"
                  style={{ fontSize: 'clamp(10px, 1.3vw, 13px)' }}
                >
                  {unit.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discreet Secret Bypass Key Icon in Bottom-Right Corner (opacity: 0.35) */}
      <button
        type="button"
        data-testid="midnight-bypass-key-btn"
        aria-label="Unlock with secret key"
        onClick={() => {
          haptics.tap();
          soundEngine.playBubbleClick(1.0);
          setDigits('');
          setErrorMsg(null);
          setModalOpen(true);
        }}
        className="fixed right-4 sm:right-6 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] z-20 flex items-center justify-center rounded-full bg-white/50 opacity-35 transition-opacity duration-200 hover:opacity-80 focus:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D94B7D] cursor-pointer"
        style={{
          width: 'clamp(48px, 6vw, 60px)',
          height: 'clamp(48px, 6vw, 60px)',
          fontSize: 'clamp(18px, 2.2vw, 24px)',
        }}
      >
        <span aria-hidden="true">🔑</span>
      </button>

      {/* Minimal 4-Digit Secret Bypass Keypad Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Secret unlock keypad"
          data-testid="midnight-bypass-modal"
          className="fixed inset-0 z-[10010] flex items-center justify-center bg-[#3A1233]/45 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-h-[88dvh] w-[min(90vw,460px)] overflow-y-auto rounded-[28px] border border-[#ECC0D2] bg-[#FFF8FB] p-5 sm:p-7 text-center text-[#3A1233] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-testid="midnight-bypass-modal-close"
              aria-label="Close keypad"
              onClick={() => setModalOpen(false)}
              className="absolute top-3.5 right-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE7F0] text-[#7A4A63] transition-colors hover:bg-[#F8D4E4] hover:text-[#3A1233] cursor-pointer"
            >
              <X className="h-4.5 w-4.5" aria-hidden="true" />
            </button>

            <div className="mx-auto mb-2.5 flex h-12 w-12 items-center justify-center rounded-full border border-[#F5C2D7] bg-[#FCE7F0] text-xl">
              <span aria-hidden="true">🔑</span>
            </div>
            <h2
              className="font-display font-bold text-[#3A1233]"
              style={{ fontSize: 'clamp(20px, 2.8vw, 26px)' }}
            >
              Secret Passcode
            </h2>
            <p className="mt-1 mb-4 text-[#7A4A63]" style={{ fontSize: 'var(--text-sub)' }}>
              Enter 4 digit code
            </p>

            {/* 4 Digit Boxes + Keyboard / Mobile Numeric Input */}
            <div className="relative mb-2.5">
              <input
                type="text"
                inputMode="none"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                aria-label="4-digit bypass passcode"
                data-testid="midnight-bypass-input"
                value={digits}
                onKeyDown={handleInputKeyDown}
                onChange={(e) => handleDigitInput(e.target.value)}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div
                key={shakeCount}
                className={`flex items-center justify-center gap-3 ${
                  shakeCount > 0 && errorMsg ? 'animate-midnight-shake' : ''
                }`}
              >
                {[0, 1, 2, 3].map((slot) => {
                  const filled = Boolean(digits[slot]);
                  return (
                    <div
                      key={slot}
                      data-testid={`midnight-digit-${slot}`}
                      className={`flex items-center justify-center rounded-xl border text-xl font-extrabold transition-all duration-150 ${
                        errorMsg
                          ? 'border-[#D94B7D] bg-[#FFE6F0] text-[#D94B7D]'
                          : filled
                            ? 'border-[#D94B7D] bg-[#FCE7F0] text-[#3A1233]'
                            : 'border-[#E8C0D0] bg-white text-[#7A4A63]'
                      }`}
                      style={{
                        width: 'clamp(46px, 7vw, 60px)',
                        height: 'clamp(50px, 7.5vw, 64px)',
                      }}
                    >
                      {filled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 min-h-[20px]">
              {errorMsg && (
                <p
                  role="alert"
                  data-testid="midnight-bypass-error"
                  className="font-bold text-[#D94B7D]"
                  style={{ fontSize: 'var(--text-sub)' }}
                >
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Tactile Mobile 3×4 Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`midnight-key-${key.toLowerCase()}`}
                  onClick={() => handleKeyTap(key)}
                  className={`flex items-center justify-center rounded-xl border font-bold transition-all active:scale-92 cursor-pointer ${
                    key === 'CLEAR' || key === 'BACK'
                      ? 'border-[#F2CADB] bg-[#FCE7F0]/75 font-semibold text-[#7A4A63] hover:bg-[#FAD6E6]'
                      : 'border-[#F0C8D9] bg-white text-[#3A1233] hover:border-[#D94B7D]/60 hover:bg-[#FFF0F6]'
                  }`}
                  style={{
                    height: 'clamp(48px, 6.2vw, 62px)',
                    fontSize:
                      key === 'CLEAR' || key === 'BACK'
                        ? 'clamp(12px, 1.5vw, 15px)'
                        : 'clamp(16px, 2.2vw, 22px)',
                  }}
                  aria-label={
                    key === 'BACK'
                      ? 'Backspace'
                      : key === 'CLEAR'
                        ? 'Clear code'
                        : `Digit ${key}`
                  }
                >
                  {key === 'BACK' ? (
                    <Delete className="h-5 w-5" aria-hidden="true" />
                  ) : key === 'CLEAR' ? (
                    'Clear'
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Fullscreen Countdown Bluff Overlay for Passcodes 1507 and 0312 */}
      {activeBluff && (
        <CountdownBluffView
          variant={activeBluff}
          onBackToCountdown={handleCloseBluff}
        />
      )}
    </div>
  );
}
