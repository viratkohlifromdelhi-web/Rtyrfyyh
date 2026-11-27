import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Delete, X } from 'lucide-react';
import {
  BYPASS_FADE_OUT_MS,
  BYPASS_TOAST_HOLD_MS,
  MIDNIGHT_CELEBRATION_HOLD_MS,
  MIDNIGHT_FADE_OUT_MS,
  UNLOCK_TIME_MS,
  computeCountdownParts,
  evaluateMidnightBypassCode,
  writeMidnightBypass,
  type MidnightCountdownParts,
} from '../utils/midnightLock';
import { trackEvent } from '../utils/analytics';
import { soundEngine } from '../utils/soundEngine';

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

export function MidnightLockOverlay({
  onUnlock,
  targetTimeMs = UNLOCK_TIME_MS,
}: MidnightLockOverlayProps) {
  const [countdown, setCountdown] = useState<MidnightCountdownParts>(() =>
    computeCountdownParts(Date.now(), targetTimeMs),
  );
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [exitMode, setExitMode] = useState<'none' | 'midnight' | 'bypass'>('none');
  const [bypassToastVisible, setBypassToastVisible] = useState(false);

  // Discreet bottom-right key bypass modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  const unlockTriggeredRef = useRef(false);
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

  // Lock body & document scroll strictly while this overlay is mounted
  useEffect(() => {
    trackEvent('midnight_lock_viewed', 'Midnight Countdown Lock');
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      clearTimers();
    };
  }, [clearTimers]);

  // Trigger live midnight celebration when countdown hits 00:00:00:00
  const triggerMidnightCelebration = useCallback(() => {
    if (unlockTriggeredRef.current) return;
    unlockTriggeredRef.current = true;
    trackEvent('midnight_auto_unlocked', 'Midnight Countdown Auto Unlock');
    setModalOpen(false);
    setIsCelebrating(true);
    soundEngine.playVaultUnlock();

    scheduleTimer(() => {
      setExitMode('midnight');
      scheduleTimer(() => {
        onUnlock();
      }, MIDNIGHT_FADE_OUT_MS);
    }, MIDNIGHT_CELEBRATION_HOLD_MS);
  }, [onUnlock, scheduleTimer]);

  // Clean 1000ms countdown interval with full cleanup on unmount
  useEffect(() => {
    const syncTick = () => {
      const next = computeCountdownParts(Date.now(), targetTimeMs);
      setCountdown(next);
      if (next.isUnlocked) {
        triggerMidnightCelebration();
      }
    };

    syncTick();
    const intervalId = window.setInterval(syncTick, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [targetTimeMs, triggerMidnightCelebration]);

  // Trigger secret 9876 bypass unlock
  const triggerSecretBypass = useCallback(() => {
    if (unlockTriggeredRef.current) return;
    unlockTriggeredRef.current = true;
    writeMidnightBypass();
    soundEngine.playVaultUnlock();

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

  const submitBypassCode = useCallback(
    (fourDigits: string) => {
      const result = evaluateMidnightBypassCode(fourDigits);
      trackEvent('midnight_bypass_attempt', 'Midnight Bypass Keypad', {
        codeEntered: fourDigits,
        success: result === 'bypass',
      });
      if (result === 'bypass') {
        triggerSecretBypass();
        return;
      }

      soundEngine.playVaultWrongCode();
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
      className={`fixed inset-0 z-[10000] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#FFF6F9] px-4 transition-[opacity,transform] ease-out ${fadeDurationClass} ${
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

      {/* Centered Mobile-Safe Glass Card */}
      <div className="relative z-10 w-[min(90vw,400px)] rounded-[28px] border border-[#ECC0D2] bg-white/78 px-6 py-7 text-center shadow-[0_24px_60px_-24px_rgba(143,49,95,0.28)] backdrop-blur-md sm:px-7 sm:py-8">
        {/* Top Animated Rose-Gold Padlock Icon (swaps to 🎂 at 00:00:00:00) */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F3C4B8] bg-gradient-to-br from-[#FFF1EB] via-[#FFE2EC] to-[#F7C6D5] shadow-[0_10px_24px_-10px_rgba(217,75,125,0.45)]">
          <span
            data-testid="midnight-lock-icon"
            className={`text-3xl leading-none select-none transition-transform duration-300 ${
              isCelebrating ? 'scale-110' : 'animate-midnight-lock-sway'
            }`}
            role="img"
            aria-label={isCelebrating ? 'Birthday cake' : 'Padlock'}
          >
            {isCelebrating ? '🎂' : '🔒'}
          </span>
        </div>

        {/* Blush Pill */}
        <div className="mb-3.5 inline-flex items-center justify-center rounded-full border border-[#F6C8DA] bg-[#FCE7F0] px-3.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#D94B7D]">
          {isCelebrating ? "🎉 IT'S MIDNIGHT • 3 DEC" : '🎀 LOCKED UNTIL 12:00 AM • 3 DEC'}
        </div>

        {/* Heading & Casual Subtitle */}
        {isCelebrating ? (
          <div data-testid="midnight-celebration-msg">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#3A1233] sm:text-[28px]">
              It&apos;s 3rd December! Unlocking...
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#7A4A63]">
              Happy 17th birthday, Morgan! Getting your surprise ready...
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#3A1233]">
              Not yet, Morgan 👀
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-[#7A4A63]">
              Nice try, bauni. Come back at midnight on 3rd December to open your surprise.
            </p>
          </>
        )}

        {/* Live 4-Unit Countdown Grid (Days, Hours, Mins, Secs) with tabular-nums */}
        <div
          data-testid="midnight-countdown-grid"
          className="mt-6 grid grid-cols-4 gap-2.5"
          aria-live="off"
        >
          {units.map((unit) => {
            const pulseSeconds = unit.isSeconds && countdown.isFinalFiveSeconds && !isCelebrating;
            return (
              <div
                key={unit.key}
                data-testid={`midnight-tile-${unit.key}`}
                className={`flex flex-col items-center justify-center rounded-2xl border px-1.5 py-3 transition-colors duration-300 ${
                  pulseSeconds
                    ? 'border-[#D94B7D] bg-gradient-to-b from-[#FFE6F0] to-[#FFD4E5] animate-midnight-sec-pulse'
                    : 'border-[#EFC3B7]/85 bg-gradient-to-b from-[#FFF9FB] to-[#FCEAF1] shadow-[0_6px_16px_-10px_rgba(143,49,95,0.28)]'
                }`}
              >
                <span
                  data-testid={`midnight-val-${unit.key}`}
                  className={`font-display text-2xl font-bold leading-none tabular-nums sm:text-[28px] ${
                    pulseSeconds ? 'text-[#D94B7D]' : 'text-[#3A1233]'
                  }`}
                >
                  {unit.value}
                </span>
                <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8E5673]">
                  {unit.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tiny Unobtrusive Secret Bypass Key Icon in Bottom-Right Corner (opacity: 0.35) */}
      <button
        type="button"
        data-testid="midnight-bypass-key-btn"
        aria-label="Unlock with secret key"
        onClick={() => {
          soundEngine.playBubbleClick(1.0);
          setDigits('');
          setErrorMsg(null);
          setModalOpen(true);
        }}
        className="fixed right-4 bottom-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/50 text-base opacity-35 transition-opacity duration-200 hover:opacity-80 focus:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D94B7D] cursor-pointer"
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
            className="relative w-full max-w-[304px] rounded-[26px] border border-[#ECC0D2] bg-[#FFF8FB] p-5 text-center text-[#3A1233] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-testid="midnight-bypass-modal-close"
              aria-label="Close keypad"
              onClick={() => setModalOpen(false)}
              className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#FCE7F0] text-[#7A4A63] transition-colors hover:bg-[#F8D4E4] hover:text-[#3A1233] cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[#F5C2D7] bg-[#FCE7F0] text-lg">
              <span aria-hidden="true">🔑</span>
            </div>
            <h2 className="font-display text-lg font-bold text-[#3A1233]">Secret Passcode</h2>
            <p className="mt-0.5 mb-3.5 text-xs text-[#7A4A63]">Enter 4 digit code</p>

            {/* 4 Digit Boxes + Keyboard / Mobile Numeric Input */}
            <div className="relative mb-2">
              <input
                type="text"
                inputMode="numeric"
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
                className={`flex items-center justify-center gap-2.5 ${
                  shakeCount > 0 && errorMsg ? 'animate-midnight-shake' : ''
                }`}
              >
                {[0, 1, 2, 3].map((slot) => {
                  const filled = Boolean(digits[slot]);
                  return (
                    <div
                      key={slot}
                      data-testid={`midnight-digit-${slot}`}
                      className={`flex h-11 w-10 items-center justify-center rounded-xl border text-lg font-extrabold transition-all duration-150 ${
                        errorMsg
                          ? 'border-[#D94B7D] bg-[#FFE6F0] text-[#D94B7D]'
                          : filled
                            ? 'border-[#D94B7D] bg-[#FCE7F0] text-[#3A1233]'
                            : 'border-[#E8C0D0] bg-white text-[#7A4A63]'
                      }`}
                    >
                      {filled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-2.5 min-h-[18px]">
              {errorMsg && (
                <p
                  role="alert"
                  data-testid="midnight-bypass-error"
                  className="text-xs font-bold text-[#D94B7D]"
                >
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Tactile Mobile 3×4 Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {KEYPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`midnight-key-${key.toLowerCase()}`}
                  onClick={() => handleKeyTap(key)}
                  className={`flex h-10 items-center justify-center rounded-xl border text-sm font-bold transition-all active:scale-92 cursor-pointer ${
                    key === 'CLEAR' || key === 'BACK'
                      ? 'border-[#F2CADB] bg-[#FCE7F0]/75 text-[11px] font-semibold text-[#7A4A63] hover:bg-[#FAD6E6]'
                      : 'border-[#F0C8D9] bg-white text-[#3A1233] hover:border-[#D94B7D]/60 hover:bg-[#FFF0F6]'
                  }`}
                  aria-label={
                    key === 'BACK'
                      ? 'Backspace'
                      : key === 'CLEAR'
                        ? 'Clear code'
                        : `Digit ${key}`
                  }
                >
                  {key === 'BACK' ? (
                    <Delete className="h-4 w-4" aria-hidden="true" />
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
    </div>
  );
}
