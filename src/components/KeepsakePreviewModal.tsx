import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, RotateCcw, Sparkles, X } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { isInAppBrowser } from '../utils/inAppBrowser';
import {
  KEEPSAKE_FILENAME,
  generateKeepsakePosterPng,
  saveOrShareKeepsakePng,
  type RenderedKeepsakePoster,
} from '../utils/keepsakeCard';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';

interface KeepsakePreviewModalProps {
  onClose: () => void;
}

export function KeepsakePreviewModal({ onClose }: KeepsakePreviewModalProps) {
  const [poster, setPoster] = useState<RenderedKeepsakePoster | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'saved' | 'inapp_fallback' | 'fallback'>(
    () => (isInAppBrowser() ? 'inapp_fallback' : 'idle'),
  );
  const [attempt, setAttempt] = useState(0);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setIsGenerating(true);
    setRenderError(false);

    void generateKeepsakePosterPng()
      .then((result) => {
        if (!active) return;
        setPoster(result);
        setIsGenerating(false);
      })
      .catch(() => {
        if (!active) return;
        setRenderError(true);
        setIsGenerating(false);
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        try {
          haptics.tap();
        } catch {
          // silent
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
    };
  }, [onClose]);

  const handleClose = useCallback(() => {
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
    onClose();
  }, [onClose]);

  const handleDownload = useCallback(() => {
    if (!poster) return;

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
    emitModinoEvent('cute', { force: true, source: 'keepsake-download' });

    const inApp = isInAppBrowser();
    void saveOrShareKeepsakePng(poster, KEEPSAKE_FILENAME, inApp).then((outcome) => {
      try {
        trackEvent('keepsake_card_downloaded', 'Keepsake Poster', {
          outcome,
          filename: KEEPSAKE_FILENAME,
        });
      } catch {
        // silent
      }

      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }

      if (outcome === 'downloaded' || outcome === 'shared') {
        setDownloadState('saved');
        savedTimerRef.current = window.setTimeout(() => {
          setDownloadState(inApp ? 'inapp_fallback' : 'idle');
          savedTimerRef.current = null;
        }, 2600);
      } else if (outcome === 'inapp_fallback') {
        setDownloadState('inapp_fallback');
      } else {
        setDownloadState('fallback');
      }
    });
  }, [poster]);

  const handleRetry = useCallback(() => {
    try {
      haptics.tap();
    } catch {
      // silent
    }
    setAttempt((n) => n + 1);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keepsake-modal-title"
      data-testid="keepsake-preview-modal"
      className="fixed inset-0 z-[9600] flex items-center justify-center bg-[#2A1923]/55 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="animate-pop-in relative flex max-h-[88dvh] w-[min(92vw,540px)] flex-col overflow-hidden rounded-[28px] border border-[#EBC6D8] bg-[#FFFDF8] text-[#3A1233] shadow-[0_28px_70px_-20px_rgba(58,18,51,0.42)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Top Pastel Stationery Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#F3DCE7] bg-[#FFF8FB] px-5 pt-4 pb-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[length:var(--text-eyebrow)] font-semibold uppercase tracking-[0.2em] text-[#B83265]">
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Postage Stamp Edition</span>
            </p>
            <h3
              id="keepsake-modal-title"
              className="font-display mt-0.5 text-[clamp(20px,2.8vw,26px)] font-semibold italic tracking-tight text-[#3A1233]"
            >
              Morgan&rsquo;s Keepsake Poster
            </h3>
            <p className="mt-0.5 text-[clamp(11.5px,1.5vw,13.5px)] font-medium text-[#7A4B6C]">
              1080 &times; 1920 Story PNG &middot; 03 December 2026
            </p>
          </div>

          <button
            type="button"
            data-testid="keepsake-modal-close"
            onClick={handleClose}
            aria-label="Close keepsake poster preview"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EBC6D8] bg-[#FFFDF8] text-[#6B3B64] transition-all duration-150 hover:bg-[#FFEBF3] hover:text-[#3A1233] active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Live 9:16 Rendered Poster Preview Stage */}
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-[#FFFDF8] to-[#FFF5F9] px-5 py-4 sm:px-6 sm:py-5">
          {isGenerating ? (
            <div
              data-testid="keepsake-preview-loading"
              className="flex aspect-[9/16] h-[min(52dvh,480px)] flex-col items-center justify-center rounded-2xl border border-[#253624]/15 bg-[#F5EFE0] px-6 text-center shadow-inner"
            >
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#253624]/25 border-t-[#253624]" />
              <p className="mt-3 text-xs sm:text-sm font-semibold tracking-wide text-[#253624]/80">
                Preparing your keepsake poster...
              </p>
            </div>
          ) : renderError || !poster ? (
            <div className="flex aspect-[9/16] h-[min(52dvh,480px)] flex-col items-center justify-center rounded-2xl border border-[#EBC6D8] bg-[#FFF8FB] px-6 text-center">
              <p className="text-sm sm:text-base font-semibold text-[#3A1233]">
                Could not render the poster right now.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#E0A7C0] bg-[#FFFDF8] px-4 py-2 text-xs sm:text-sm font-semibold text-[#B83265] transition-all hover:bg-[#FFEBF3] active:scale-95 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          ) : (
            <img
              src={poster.dataUrl}
              alt="Morgan's 17th Birthday Postage Stamp Keepsake Poster"
              data-testid="keepsake-preview-img"
              className="block max-h-[min(52dvh,500px)] w-auto aspect-[9/16] rounded-[18px] border border-[#253624]/18 shadow-[0_18px_38px_-14px_rgba(37,54,36,0.42)]"
            />
          )}
        </div>

        {/* Footer CTA Bar */}
        <div className="border-t border-[#F3DCE7] bg-[#FFFDF8] px-5 pt-3.5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] text-center sm:px-6">
          <button
            type="button"
            data-testid="keepsake-download-btn"
            disabled={isGenerating || renderError || !poster}
            onClick={handleDownload}
            className="inline-flex w-full min-h-[var(--btn-min-h)] items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#D94B7D] to-[#B83265] px-6 py-3 text-[clamp(14px,1.8vw,16px)] font-semibold tracking-wide text-[#FFFDF8] shadow-[0_10px_24px_-10px_rgba(184,50,101,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all duration-150 hover:from-[#E05687] hover:to-[#C1376B] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B83265]"
          >
            {downloadState === 'saved' ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Saved &#10003;</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download PNG</span>
              </>
            )}
          </button>

          <p
            data-testid="keepsake-helper-note"
            className={`mt-2 text-[clamp(11.5px,1.45vw,13px)] leading-snug ${
              downloadState === 'fallback' || downloadState === 'inapp_fallback'
                ? 'font-semibold text-[#B83265]'
                : 'font-medium text-[#7A4B6C]'
            }`}
          >
            {downloadState === 'inapp_fallback'
              ? 'Tip: Screenshot this card or open in Chrome to save'
              : downloadState === 'fallback'
                ? 'Tip: Screenshot this card or open in Chrome to save'
                : downloadState === 'saved'
                  ? 'Saved as keepsake PNG! You can also long press the poster to save to Photos.'
                  : 'Ready for Instagram Story or Photos. Long press works on mobile too.'}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
