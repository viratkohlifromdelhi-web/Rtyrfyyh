import { useCallback, useEffect, useRef, useState } from 'react';
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
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';
import { FingerprintSparkleSvg, SparkleStarSvg, WavyDivider } from './DoodleSvgs';

type ScannerPhase = 'idle' | 'scanning' | 'aborted' | 'verdict';

export function BauniMeterSection() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<ScannerPhase>('idle');
  const [glitchKey, setGlitchKey] = useState(0);
  const [abortCount, setAbortCount] = useState(0);

  const modeRef = useRef<'none' | 'holding' | 'rewinding'>('none');
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const hapticTimerRef = useRef<number | null>(null);

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
        setProgress(Math.floor(result.progress));
        soundEngine.updateScannerHold(result.progress / SCANNER_MAX_PROGRESS);

        if (result.reachedVerdict) {
          modeRef.current = 'none';
          clearHapticTimer();
          stopLoop();
          setProgress(SCANNER_MAX_PROGRESS);
          setPhase('verdict');
          setGlitchKey((k) => k + 1);
          soundEngine.playScannerComplete();
          bgMusicPlayer.endScannerVerdict();
          haptics.scannerVerdict();
          trackEvent('bauni_scan_completed', 'Bauni-Meter Scanner', { result: '99%' });
          return;
        }
      } else if (mode === 'rewinding') {
        const rewound = rewindScannerProgress(progressRef.current, deltaMs, 420);
        progressRef.current = rewound.progress;
        setProgress(Math.floor(rewound.progress));

        if (rewound.done) {
          modeRef.current = 'none';
          progressRef.current = 0;
          setProgress(0);
          stopLoop();
          return;
        }
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [clearHapticTimer, stopLoop]);

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
    setPhase('aborted');
    setAbortCount((c) => c + 1);

    if (progressRef.current > 0) {
      modeRef.current = 'rewinding';
      lastFrameRef.current = null;
      runLoop();
    } else {
      modeRef.current = 'none';
      stopLoop();
    }
  }, [runLoop, stopLoop, stopScannerHaptics]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase === 'verdict') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();

    // Start fresh continuous press-and-hold scan from 0% (or clean reset if rewinding)
    progressRef.current = 0;
    setProgress(0);
    modeRef.current = 'holding';
    lastFrameRef.current = null;
    setPhase('scanning');

    soundEngine.startScannerHold();
    bgMusicPlayer.beginScannerHold();
    startScannerHapticPulse();
    trackEvent('bauni_scan_started', 'Bauni-Meter Scanner');

    runLoop();
  };

  const handleReset = () => {
    stopScannerHaptics();
    haptics.tap();
    soundEngine.playBubbleClick();
    soundEngine.stopScannerHold();
    bgMusicPlayer.endScannerAbort();
    modeRef.current = 'none';
    stopLoop();
    progressRef.current = 0;
    setProgress(0);
    setPhase('idle');
  };

  const isScanning = phase === 'scanning';
  const isAborted = phase === 'aborted';
  const isVerdict = phase === 'verdict';

  const statusMessage = isAborted
    ? "Don't lift your finger early, hold till 99%!"
    : getScannerStageMessage(progress);

  return (
    <section id="bauni-meter" className="cv-auto-section relative z-[2] scroll-mt-16">
      <WavyDivider fill="#3B1535" />

      <div className="bg-[#3B1535] py-12 text-[#FFFDF8] sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-[#FFE898]">
              Height Check
            </p>
            <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#FFFDF8] sm:text-4xl lg:text-5xl">
              Bauni Meter Scanner 📏✨
            </h2>
            <p className="mt-2.5 text-base text-[#FFE4F0]">
              Press and hold until 99% to check your height.
            </p>
          </div>

          <div
            data-testid="bauni-scanner-card"
            data-phase={phase}
            className="mt-9 grid grid-cols-1 items-center gap-8 rounded-[2rem] border border-[#FFE4F0]/20 bg-[#4E1E47] p-6 shadow-[0_24px_56px_-22px_rgba(0,0,0,0.45)] sm:p-10 md:grid-cols-12"
          >
            {/* Left column: Strict press-and-hold glowing pastel circular thumb-scanner pad */}
            <div className="flex flex-col items-center md:col-span-5">
              <div className="relative flex items-center justify-center">
                {/* Glowing pulsing ripple rings while actively held */}
                {isScanning && (
                  <>
                    <span
                      aria-hidden="true"
                      className="animate-scanner-ring pointer-events-none absolute -inset-3 rounded-full border-2 border-[#FF8FC2]"
                    />
                    <span
                      aria-hidden="true"
                      style={{ animationDelay: '0.55s' }}
                      className="animate-scanner-ring pointer-events-none absolute -inset-5 rounded-full border-2 border-[#FFE898]/80"
                    />
                  </>
                )}

                <button
                  type="button"
                  data-testid="bauni-scanner-pad"
                  aria-label="Hold thumb here to measure height"
                  disabled={isVerdict}
                  onPointerDown={handlePointerDown}
                  onPointerUp={cancelEarlyHold}
                  onPointerLeave={cancelEarlyHold}
                  onPointerCancel={cancelEarlyHold}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                  className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 select-none touch-none transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFE898] ${
                    isVerdict
                      ? 'border-[#FFE898] bg-gradient-to-br from-[#FFE4F0] to-[#EBE3FF] text-[#C2377E] cursor-default'
                      : isScanning
                        ? 'scale-[0.96] border-[#FF8FC2] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#C2377E] shadow-[0_0_44px_rgba(255,143,194,0.8)] cursor-pointer'
                        : isAborted
                          ? 'border-[#FF6B9D] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#3B1535] shadow-[0_0_24px_rgba(255,107,157,0.45)] hover:scale-[1.03] cursor-pointer'
                          : 'border-[#FFE4F0]/75 bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#3B1535] shadow-[0_0_28px_rgba(255,228,240,0.3)] hover:scale-[1.03] cursor-pointer'
                  }`}
                >
                  {/* Animated glowing pink laser bar moving up and down while held */}
                  {isScanning && (
                    <span
                      aria-hidden="true"
                      className="animate-scanner-laser pointer-events-none absolute inset-x-3 top-1/2 z-20 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#FF3D9A] to-transparent shadow-[0_0_16px_4px_rgba(255,61,154,0.85)]"
                    />
                  )}

                  <FingerprintSparkleSvg
                    className={`pointer-events-none relative z-10 h-24 w-24 transition-transform duration-200 ${
                      isScanning ? 'scale-105 text-[#C2377E]' : 'text-[#3B1535]'
                    }`}
                  />
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-medium text-[#FFE4F0]/90">
                {isVerdict
                  ? 'Done (sorry not sorry)'
                  : isScanning
                    ? "Keep holding, don't let go..."
                    : 'Hold thumb down for 3 seconds'}
              </p>

              {/* Cheeky red/berry warning prompt on early release */}
              {isAborted && (
                <div
                  key={abortCount}
                  role="alert"
                  data-testid="bauni-abort-warning"
                  className="animate-pop-in mt-3 inline-flex max-w-xs items-center gap-2 rounded-2xl border border-[#FF7AA8]/70 bg-[#88164D]/90 px-3.5 py-2 text-center text-xs font-bold leading-snug text-[#FFE8F2] shadow-md"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFE898]" aria-hidden="true" />
                  <span>Hold your finger till the end, don&rsquo;t cheat 👀</span>
                </div>
              )}
            </div>

            {/* Right column: Live progress readout + 99% verdict box */}
            <div className="md:col-span-7">
              <div className="rounded-2xl border border-[#FFE4F0]/18 bg-[#3B1535]/75 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#FFE898]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Scan Progress
                  </span>
                  <span
                    data-testid="bauni-progress-value"
                    className="font-mono text-lg font-bold tabular-nums text-[#FFFDF8]"
                  >
                    {progress}%
                  </span>
                </div>

                {/* Glowing pastel progress bar */}
                <div
                  role="progressbar"
                  aria-label="Bauni-Meter height scan progress"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={99}
                  className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-[#FFFDF8]/12"
                >
                  <div
                    style={{ width: `${Math.min(100, (progress / SCANNER_MAX_PROGRESS) * 100)}%` }}
                    className={`h-full rounded-full transition-[width] duration-75 ${
                      isAborted
                        ? 'bg-gradient-to-r from-[#FF5E8A] to-[#FF8FC2]'
                        : 'bg-gradient-to-r from-[#FF8FC2] via-[#FFE898] to-[#D4B8FF]'
                    }`}
                  />
                </div>

                {!isVerdict ? (
                  <p
                    data-testid="bauni-stage-message"
                    aria-live="polite"
                    className={`mt-4 min-h-[1.5rem] text-sm font-medium ${
                      isAborted ? 'text-[#FF9BC1]' : 'text-[#FFE4F0]'
                    }`}
                  >
                    {statusMessage}
                  </p>
                ) : (
                  <div
                    key={glitchKey}
                    role="status"
                    aria-live="polite"
                    data-testid="bauni-verdict"
                    className="animate-scanner-glitch mt-5 rounded-2xl border-2 border-[#FFE898] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] p-5 text-[#3B1535] shadow-md"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#C2377E]">
                      <SparkleStarSvg className="h-4 w-4 shrink-0 text-[#E04D92]" />
                      <span>SCAN ERROR AT 99%</span>
                    </div>

                    <p className="font-display mt-2 text-lg font-semibold leading-snug text-[#3B1535] sm:text-xl">
                      Error: Too short to measure. Confirmed bauni and bachhaww 🎀
                    </p>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#3B1535] px-5 py-2 text-xs font-semibold text-[#FFFDF8] transition-colors hover:bg-[#57214F] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
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
      </div>

      <WavyDivider fill="#3B1535" flip />
    </section>
  );
}
