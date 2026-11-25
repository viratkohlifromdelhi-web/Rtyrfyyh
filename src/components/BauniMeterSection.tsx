import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import {
  advanceScannerProgress,
  getScannerStageMessage,
  SCANNER_MAX_PROGRESS,
} from '../utils/interactiveFun';
import { FingerprintSparkleSvg, SparkleStarSvg, WavyDivider } from './DoodleSvgs';

type ScannerPhase = 'idle' | 'scanning' | 'paused' | 'verdict';

export function BauniMeterSection() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<ScannerPhase>('idle');
  const [glitchKey, setGlitchKey] = useState(0);

  const isHoldingRef = useRef(false);
  const isAutoRef = useRef(false);
  const pressStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);

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
      if (!isHoldingRef.current && !isAutoRef.current) {
        stopLoop();
        return;
      }

      const prevTime = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const deltaMs = Math.min(64, Math.max(0, now - prevTime));

      const result = advanceScannerProgress(progressRef.current, deltaMs, 2100);
      progressRef.current = result.progress;
      setProgress(Math.floor(result.progress));

      if (result.reachedVerdict) {
        isHoldingRef.current = false;
        isAutoRef.current = false;
        stopLoop();
        setProgress(SCANNER_MAX_PROGRESS);
        setPhase('verdict');
        setGlitchKey((k) => k + 1);
        return;
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [stopLoop]);

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (phase === 'verdict') return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events in automated browsers may not have an active pointerId
    }
    pressStartRef.current = performance.now();
    isHoldingRef.current = true;
    setPhase('scanning');
    runLoop();
  };

  const handlePointerUpOrCancel = () => {
    if (!isHoldingRef.current) return;
    const heldMs = performance.now() - pressStartRef.current;
    isHoldingRef.current = false;

    if (progressRef.current >= SCANNER_MAX_PROGRESS) return;

    // Quick tap (< 420ms) seamlessly auto-runs the scan as a mobile/desktop fallback
    if (heldMs < 420) {
      isAutoRef.current = true;
      setPhase('scanning');
      runLoop();
    } else if (!isAutoRef.current) {
      stopLoop();
      setPhase('paused');
    }
  };

  const handleKeyboardActivate = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (phase === 'verdict') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      isAutoRef.current = true;
      setPhase('scanning');
      runLoop();
    }
  };

  const handleReset = () => {
    isHoldingRef.current = false;
    isAutoRef.current = false;
    stopLoop();
    progressRef.current = 0;
    setProgress(0);
    setPhase('idle');
  };

  const isScanning = phase === 'scanning';
  const isVerdict = phase === 'verdict';

  const statusMessage =
    phase === 'paused'
      ? 'Keep holding—or tap once to auto-scan!'
      : getScannerStageMessage(progress);

  return (
    <section id="bauni-meter" className="relative z-20 scroll-mt-16">
      <WavyDivider fill="#3B1535" />

      <div className="bg-[#3B1535] py-12 text-[#FFFDF8] sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-[#FFE898]">
              Scientifically Unverified Height Lab
            </p>
            <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#FFFDF8] sm:text-4xl lg:text-5xl">
              Official Bauni-Meter Scanner 📏✨
            </h2>
            <p className="mt-2.5 text-base text-[#FFE4F0]">
              Press and hold to verify official height.
            </p>
          </div>

          <div
            data-testid="bauni-scanner-card"
            data-phase={phase}
            className="mt-9 grid grid-cols-1 items-center gap-8 rounded-[2rem] border border-[#FFE4F0]/20 bg-[#4E1E47] p-6 shadow-[0_24px_56px_-22px_rgba(0,0,0,0.45)] sm:p-10 md:grid-cols-12"
          >
            {/* Left column: Glowing pastel circular thumb-scanner pad */}
            <div className="flex flex-col items-center md:col-span-5">
              <div className="relative flex items-center justify-center">
                {/* Soft outer pastel pulse ring while scanning */}
                {isScanning && (
                  <span
                    aria-hidden="true"
                    className="animate-scanner-ring pointer-events-none absolute -inset-3 rounded-full border-2 border-[#FF8FC2]"
                  />
                )}

                <button
                  type="button"
                  data-testid="bauni-scanner-pad"
                  aria-label="Hold thumb here to measure height"
                  disabled={isVerdict}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUpOrCancel}
                  onPointerCancel={handlePointerUpOrCancel}
                  onKeyDown={handleKeyboardActivate}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none',
                  }}
                  className={`relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-4 select-none touch-none transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFE898] ${
                    isVerdict
                      ? 'border-[#FFE898] bg-gradient-to-br from-[#FFE4F0] to-[#EBE3FF] text-[#C2377E] cursor-default'
                      : isScanning
                        ? 'scale-[0.97] border-[#FF8FC2] bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#C2377E] shadow-[0_0_38px_rgba(255,143,194,0.65)] cursor-pointer'
                        : 'border-[#FFE4F0]/75 bg-gradient-to-br from-[#FFE4F0] via-[#FFFDF8] to-[#EBE3FF] text-[#3B1535] shadow-[0_0_28px_rgba(255,228,240,0.3)] hover:scale-[1.03] cursor-pointer'
                  }`}
                >
                  {/* Animated glowing pink laser bar moving up and down */}
                  {isScanning && (
                    <span
                      aria-hidden="true"
                      className="animate-scanner-laser pointer-events-none absolute inset-x-3 top-1/2 z-20 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-[#FF3D9A] to-transparent shadow-[0_0_16px_4px_rgba(255,61,154,0.85)]"
                    />
                  )}

                  <FingerprintSparkleSvg
                    className={`relative z-10 h-24 w-24 transition-transform duration-200 ${
                      isScanning ? 'scale-105 text-[#C2377E]' : 'text-[#3B1535]'
                    }`}
                  />
                </button>
              </div>

              <p className="mt-4 text-center text-xs font-medium text-[#FFE4F0]/90">
                {isVerdict
                  ? 'Scan complete (results are tragic)'
                  : isScanning
                    ? 'Scanning in progress...'
                    : 'Hold thumb here — or tap once to auto-scan'}
              </p>
            </div>

            {/* Right column: Live progress readout + 99% verdict box */}
            <div className="md:col-span-7">
              <div className="rounded-2xl border border-[#FFE4F0]/18 bg-[#3B1535]/75 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#FFE898]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Height Calibration Progress
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
                    className="h-full rounded-full bg-gradient-to-r from-[#FF8FC2] via-[#FFE898] to-[#D4B8FF] transition-[width] duration-75"
                  />
                </div>

                {!isVerdict ? (
                  <p
                    data-testid="bauni-stage-message"
                    aria-live="polite"
                    className="mt-4 min-h-[1.5rem] text-sm font-medium text-[#FFE4F0]"
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
                      <span>SCANNER OVERLOAD AT 99%</span>
                    </div>

                    <p className="font-display mt-2 text-lg font-semibold leading-snug text-[#3B1535] sm:text-xl">
                      ERROR 404: Too fun-sized to detect! Result: Certified Bauni &amp; Bachawww 🎀
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
