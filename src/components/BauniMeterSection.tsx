import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import {
  advanceScannerProgress,
  getScannerStageMessage,
  rewindScannerProgress,
  SCANNER_DURATION_MS,
  SCANNER_MAX_PROGRESS,
} from '../utils/interactiveFun';
import { trackEvent } from '../utils/analytics';
import { getScannerHapticStep, haptics, stopHaptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { FingerprintSparkleSvg, SparkleStarSvg } from './DoodleSvgs';

type ScannerPhase = 'idle' | 'scanning' | 'aborted' | 'verdict';

export function BauniMeterSection() {
  const [phase, setPhase] = useState<ScannerPhase>('idle');
  const [glitchKey, setGlitchKey] = useState(0);
  const [abortCount, setAbortCount] = useState(0);

  const modeRef = useRef<'none' | 'holding' | 'rewinding'>('none');
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const hapticTimerRef = useRef<number | null>(null);
  const lastStageMsgRef = useRef<string>(getScannerStageMessage(0));

  // Direct DOM refs for 60fps GPU-composited progress updates (zero React re-renders per frame)
  const progressBarFillRef = useRef<HTMLDivElement | null>(null);
  const progressValueRef = useRef<HTMLSpanElement | null>(null);
  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const stageMessageRef = useRef<HTMLParagraphElement | null>(null);

  const syncProgressDom = useCallback((rawProgress: number, overrideMessage?: string) => {
    const pct = Math.min(SCANNER_MAX_PROGRESS, Math.max(0, Math.floor(rawProgress)));
    const ratio = Math.min(1, Math.max(0, rawProgress / SCANNER_MAX_PROGRESS));
    if (progressBarFillRef.current) {
      progressBarFillRef.current.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
    if (progressValueRef.current) {
      progressValueRef.current.textContent = `${pct}%`;
    }
    if (progressTrackRef.current) {
      progressTrackRef.current.setAttribute('aria-valuenow', String(pct));
    }
    if (stageMessageRef.current) {
      const nextMsg = overrideMessage ?? getScannerStageMessage(pct);
      if (nextMsg !== lastStageMsgRef.current) {
        lastStageMsgRef.current = nextMsg;
        stageMessageRef.current.textContent = nextMsg;
      }
    }
  }, []);

  const clearHapticTimer = useCallback(() => {
    if (hapticTimerRef.current !== null) {
      window.clearTimeout(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
  }, []);

  const stopScannerHaptics = useCallback(() => {
    clearHapticTimer();
    stopHaptics();
  }, [clearHapticTimer]);

  const startScannerHapticPulse = useCallback(() => {
    clearHapticTimer();
    const firePulse = () => {
      if (modeRef.current !== 'holding') {
        hapticTimerRef.current = null;
        return;
      }
      const step = getScannerHapticStep(progressRef.current);
      haptics.scannerPulse(progressRef.current);
      hapticTimerRef.current = window.setTimeout(firePulse, step.intervalMs);
    };
    firePulse();
  }, [clearHapticTimer]);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameRef.current = null;
  }, []);

  const runLoop = useCallback(() => {
    if (rafRef.current !== null) return;

    const tick = (now: number) => {
      const mode = modeRef.current;
      if (mode === 'none') {
        stopLoop();
        return;
      }

      const prevTime = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const deltaMs = Math.min(64, Math.max(0, now - prevTime));

      if (mode === 'holding') {
        const result = advanceScannerProgress(progressRef.current, deltaMs, SCANNER_DURATION_MS);
        progressRef.current = result.progress;
        syncProgressDom(result.progress);
        soundEngine.updateScannerHold(result.progress / SCANNER_MAX_PROGRESS);

        if (result.reachedVerdict) {
          modeRef.current = 'none';
          clearHapticTimer();
          stopLoop();
          progressRef.current = SCANNER_MAX_PROGRESS;
          syncProgressDom(SCANNER_MAX_PROGRESS);
          setPhase('verdict');
          setGlitchKey((k) => k + 1);
          soundEngine.playScannerComplete();
          bgMusicPlayer.endScannerVerdict();
          haptics.scannerVerdict();
          emitModinoEvent('friends_and_banter', { force: true });
          trackEvent('bauni_scan_completed', 'Bauni-Meter Scanner', { result: '99%' });
          return;
        }
      } else if (mode === 'rewinding') {
        const rewound = rewindScannerProgress(progressRef.current, deltaMs, 420);
        progressRef.current = rewound.progress;
        syncProgressDom(rewound.progress, "Don't lift your finger early, hold till 99%!");

        if (rewound.done) {
          modeRef.current = 'none';
          progressRef.current = 0;
          syncProgressDom(0, "Don't lift your finger early, hold till 99%!");
          stopLoop();
          return;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [clearHapticTimer, stopLoop, syncProgressDom]);

  const cancelEarlyHold = useCallback(() => {
    if (modeRef.current !== 'holding') return;
    if (progressRef.current >= SCANNER_MAX_PROGRESS) return;

    // Immediately abort scan, silence haptics, play descending "uh-oh" bloop, restore background music, and rewind to 0%
    trackEvent('bauni_scan_released_early', 'Bauni-Meter Scanner', {
      pct: Math.floor(progressRef.current),
    });
    stopScannerHaptics();
    soundEngine.playScannerAbort();
    bgMusicPlayer.endScannerAbort();
    emitModinoEvent('friends_and_banter', { source: 'bauni-scan-abort' });
    setPhase('aborted');
    setAbortCount((c) => c + 1);
    syncProgressDom(progressRef.current, "Don't lift your finger early, hold till 99%!");

    if (progressRef.current > 0) {
      modeRef.current = 'rewinding';
      lastFrameRef.current = null;
      runLoop();
    } else {
      modeRef.current = 'none';
      stopLoop();
    }
  }, [runLoop, stopLoop, stopScannerHaptics, syncProgressDom]);

  // Safety net: catch release outside the pad or window blur while holding
  useEffect(() => {
    const onGlobalRelease = () => {
      cancelEarlyHold();
    };
    window.addEventListener('pointerup', onGlobalRelease);
    window.addEventListener('pointercancel', onGlobalRelease);
    window.addEventListener('blur', onGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', onGlobalRelease);
      window.removeEventListener('pointercancel', onGlobalRelease);
      window.removeEventListener('blur', onGlobalRelease);
    };
  }, [cancelEarlyHold]);

  useEffect(() => {
    return () => {
      modeRef.current = 'none';
      stopScannerHaptics();
      stopLoop();
      soundEngine.stopScannerHold();
      bgMusicPlayer.endScannerAbort();
    };
  }, [stopLoop, stopScannerHaptics]);

  const beginHoldScan = useCallback(() => {
    if (phase === 'verdict' || modeRef.current === 'holding') return;

    // Start fresh continuous press-and-hold scan from 0% (or clean reset if rewinding)
    progressRef.current = 0;
    syncProgressDom(0);
    modeRef.current = 'holding';
    lastFrameRef.current = null;
    setPhase('scanning');

    soundEngine.startScannerHold();
    bgMusicPlayer.beginScannerHold();
    startScannerHapticPulse();
    emitModinoEvent('friends_and_banter', { source: 'bauni-scan-start' });
    trackEvent('bauni_scan_started', 'Bauni-Meter Scanner');

    runLoop();
  }, [phase, runLoop, startScannerHapticPulse, syncProgressDom]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (phase === 'verdict') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    beginHoldScan();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      beginHoldScan();
    }
  };

  const handleKeyUp = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      cancelEarlyHold();
    }
  };

  const handleReset = () => {
    stopScannerHaptics();
    haptics.tap();
    soundEngine.playBubbleClick();
    soundEngine.stopScannerHold();
    bgMusicPlayer.endScannerAbort();
    emitModinoEvent('friends_and_banter', { force: true, source: 'bauni-scan-reset' });
    modeRef.current = 'none';
    stopLoop();
    progressRef.current = 0;
    setPhase('idle');
    syncProgressDom(0);
  };

  const isScanning = phase === 'scanning';
  const isAborted = phase === 'aborted';
  const isVerdict = phase === 'verdict';

  const initialStatusMessage = isAborted
    ? "Don't lift your finger early, hold till 99%!"
    : getScannerStageMessage(0);

  return (
    <section
      id="bauni-meter"
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-14 sm:py-20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-[#C2377E]">
            Height Check
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl lg:text-5xl">
            Bauni Meter Scanner 📏✨
          </h2>
          <p className="mt-2.5 text-base text-[#6A385F]">
            Press and hold until 99% to check your height.
          </p>
        </div>

        <div
          data-testid="bauni-scanner-card"
          data-phase={phase}
          className="mt-9 grid grid-cols-1 items-center gap-8 rounded-[2rem] border-[1.5px] border-[#EAC6DA] bg-gradient-to-br from-[#FFFDF9] via-[#FFF4F8] to-[#F3ECFF] p-6 shadow-[0_22px_52px_-24px_rgba(58,18,51,0.18),0_4px_16px_-6px_rgba(217,75,125,0.12)] sm:p-10 md:grid-cols-12"
        >
          {/* Left column: Strict press-and-hold glowing pastel circular thumb-scanner pad */}
          <div className="flex flex-col items-center md:col-span-5">
            <div className="relative flex items-center justify-center">
              {/* Glowing pulsing ripple rings while actively held */}
              {isScanning && (
                <>
                  <span
                    aria-hidden="true"
                    className="animate-scanner-ring pointer-events-none absolute -inset-3 rounded-full border-2 border-[#D94B7D]/70"
                  />
                  <span
                    aria-hidden="true"
                    style={{ animationDelay: '0.55s' }}
                    className="animate-scanner-ring pointer-events-none absolute -inset-5 rounded-full border-2 border-[#E6B85C]/80"
                  />
                </>
              )}

              <button
                type="button"
                data-testid="bauni-scanner-pad"
                aria-label="Hold thumb or press Space to measure height"
                disabled={isVerdict}
                onPointerDown={handlePointerDown}
                onPointerUp={cancelEarlyHold}
                onPointerLeave={cancelEarlyHold}
                onPointerCancel={cancelEarlyHold}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onBlur={cancelEarlyHold}
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                }}
                className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-[3px] select-none touch-none transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D] ${
                  isVerdict
                    ? 'border-[#E6B85C] bg-gradient-to-br from-[#FFE8F2] via-[#FFFDF9] to-[#EFE6FF] text-[#C2377E] shadow-[0_14px_30px_-14px_rgba(217,75,125,0.3)] cursor-default'
                    : isScanning
                      ? 'scale-[0.96] border-[#D94B7D] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#C2377E] shadow-[0_0_38px_rgba(217,75,125,0.42)] cursor-pointer'
                      : isAborted
                        ? 'border-[#E04D82] bg-gradient-to-br from-[#FFE6F0] via-[#FFFDF8] to-[#F3ECFF] text-[#3A1233] shadow-[0_0_24px_rgba(224,77,130,0.3)] hover:scale-[1.03] cursor-pointer'
                        : 'border-[#E9B9D1] bg-gradient-to-br from-[#FFFDF9] via-[#FFF2F7] to-[#F1E8FF] text-[#3A1233] shadow-[0_14px_30px_-14px_rgba(58,18,51,0.2)] hover:scale-[1.03] hover:border-[#D94B7D]/70 cursor-pointer'
                }`}
              >
                {/* Animated glowing pink laser bar moving up and down while held */}
                {isScanning && (
                  <span
                    aria-hidden="true"
                    className="animate-scanner-laser pointer-events-none absolute inset-x-3 top-1/2 z-20 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#E04D92] to-transparent shadow-[0_0_16px_4px_rgba(224,77,146,0.65)]"
                  />
                )}

                <FingerprintSparkleSvg
                  className={`pointer-events-none relative z-10 h-24 w-24 transition-transform duration-200 ${
                    isScanning ? 'scale-105 text-[#C2377E]' : 'text-[#5A244E]'
                  }`}
                />
              </button>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-[#75446B]">
              {isVerdict
                ? 'Done (sorry not sorry)'
                : isScanning
                  ? "Keep holding, don't let go..."
                  : 'Hold thumb down for 3 seconds'}
            </p>

            {/* Cheeky rose-berry warning prompt on early release */}
            {isAborted && (
              <div
                key={abortCount}
                role="alert"
                data-testid="bauni-abort-warning"
                className="animate-pop-in mt-3 inline-flex max-w-xs items-center gap-2 rounded-2xl border border-[#E592B4] bg-[#FFE8F1] px-3.5 py-2 text-center text-xs font-bold leading-snug text-[#8F1F52] shadow-xs"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#C93B6B]" aria-hidden="true" />
                <span>Hold your finger till the end, don&rsquo;t cheat 👀</span>
              </div>
            )}
          </div>

          {/* Right column: Live progress readout + 99% verdict box */}
          <div className="md:col-span-7">
            <div className="rounded-2xl border border-[#ECD0E1] bg-[#FFFDFB]/95 p-5 shadow-[0_10px_26px_-18px_rgba(58,18,51,0.16)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#C2377E]">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Scan Progress
                </span>
                <span
                  ref={progressValueRef}
                  data-testid="bauni-progress-value"
                  className="font-mono text-lg font-bold tabular-nums text-[#3A1233]"
                >
                  {isVerdict ? '99%' : '0%'}
                </span>
              </div>

              {/* GPU-composited pastel progress bar (scaleX transform — zero layout reflow) */}
              <div
                ref={progressTrackRef}
                role="progressbar"
                aria-label="Bauni-Meter height scan progress"
                aria-valuenow={isVerdict ? 99 : 0}
                aria-valuemin={0}
                aria-valuemax={99}
                className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-[#F5E3EE]"
              >
                <div
                  ref={progressBarFillRef}
                  style={{
                    transform: isVerdict ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left center',
                    willChange: isScanning ? 'transform' : 'auto',
                  }}
                  className={`h-full w-full rounded-full ${
                    isAborted
                      ? 'bg-gradient-to-r from-[#E04D82] to-[#F38FB6]'
                      : 'bg-gradient-to-r from-[#D94B7D] via-[#F09BBF] to-[#B794F4]'
                  }`}
                />
              </div>

              {!isVerdict ? (
                <p
                  ref={stageMessageRef}
                  data-testid="bauni-stage-message"
                  aria-live="polite"
                  className={`mt-4 min-h-[1.5rem] text-sm font-medium ${
                    isAborted ? 'text-[#B52B62]' : 'text-[#6A385F]'
                  }`}
                >
                  {initialStatusMessage}
                </p>
              ) : (
                <div
                  key={glitchKey}
                  role="status"
                  aria-live="polite"
                  data-testid="bauni-verdict"
                  className="animate-scanner-glitch mt-5 rounded-2xl border-[1.5px] border-[#E6C58D] bg-gradient-to-br from-[#FFF4F8] via-[#FFFDF9] to-[#F2EBFF] p-5 text-[#3A1233] shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#C2377E]">
                    <SparkleStarSvg className="h-4 w-4 shrink-0 text-[#D94B7D]" />
                    <span>SCAN ERROR AT 99%</span>
                  </div>

                  <p className="font-display mt-2 text-lg font-semibold leading-snug text-[#3A1233] sm:text-xl">
                    Error: Too short to measure. Confirmed bauni and bachhaww 🎀
                  </p>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#3A1233] px-5 py-2 text-xs font-semibold text-[#FFFDF8] transition-colors hover:bg-[#57214F] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-[#FFE898]" aria-hidden="true" />
                    <span>Scan Again</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

