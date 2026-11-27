import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { playUiSfx } from '../utils/uiSoundEngine';

export const BAAD_ME_CHAT_IMG_SRC =
  '/Screenshot_2026-11-28-02-05-00-977_com.instagram.android.png';

interface BaadMeRevealSectionProps {
  onLightboxChange?: (open: boolean) => void;
}

function PastelInstagramChatFallback({ enlarged = false }: { enlarged?: boolean }) {
  const padClass = enlarged ? 'p-5 sm:p-6' : 'px-3.5 pt-3.5 pb-10 sm:px-4 sm:pt-4 sm:pb-10';
  const msgTextClass = enlarged ? 'text-[14px] leading-[1.45]' : 'text-[12.5px] leading-[1.42]';

  return (
    <div
      data-testid={enlarged ? 'baad-me-fallback-chat-zoomed' : 'baad-me-fallback-chat'}
      className={`w-full rounded-[15px] border border-[#F2C6D8]/85 bg-gradient-to-b from-[#FFFDFB] to-[#FFF6FA] text-left ${padClass}`}
    >
      {/* Subtle Instagram DM header strip */}
      <div className="mb-3 flex items-center justify-between border-b border-[#F5D3E1]/80 pb-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#F4A7C3] to-[#D94B7D] text-[10px] font-bold text-[#FFFDFB]"
          >
            M
          </span>
          <div>
            <p className="text-[11px] font-bold leading-tight text-[#3A1233]">Morgan</p>
            <p className="text-[9.5px] font-medium text-[#8C5A73]">Instagram Chat</p>
          </div>
        </div>
        <span className="rounded-full bg-[#FFEAF2] px-2 py-0.5 text-[9px] font-semibold tracking-[0.06em] text-[#B83B68]">
          2:05 AM
        </span>
      </div>

      {/* Exact 4-message exchange */}
      <div className="space-y-2">
        {/* Me */}
        <div className="flex justify-end">
          <div
            className={`max-w-[88%] rounded-[16px] rounded-br-[5px] bg-gradient-to-br from-[#E25B8B] to-[#C93B6B] px-3 py-2 font-medium text-[#FFFDFB] shadow-[0_6px_14px_-8px_rgba(201,59,107,0.45)] ${msgTextClass}`}
          >
            Waise yk, you are wasting my time here from the last 2 hours, it&apos;s actually your
            loss 🥀🥀🥀
          </div>
        </div>

        {/* Morgan */}
        <div className="flex justify-start">
          <div
            className={`max-w-[78%] rounded-[16px] rounded-bl-[5px] border border-[#F2C6D8]/90 bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#3A1233] shadow-[0_4px_10px_-8px_rgba(176,62,106,0.2)] ${msgTextClass}`}
          >
            Why mine 😂
          </div>
        </div>

        {/* Me (reply) */}
        <div className="flex flex-col items-end">
          <span className="mb-0.5 pr-1 text-[9.5px] font-medium text-[#9A6A82]">
            Replied to Morgan
          </span>
          <div
            className={`max-w-[82%] rounded-[16px] rounded-br-[5px] bg-gradient-to-br from-[#E25B8B] to-[#C93B6B] px-3 py-1.5 font-medium text-[#FFFDFB] shadow-[0_6px_14px_-8px_rgba(201,59,107,0.42)] ${msgTextClass}`}
          >
            Baad me batata hu kabhi
          </div>
        </div>

        {/* Morgan stacked messages */}
        <div className="flex flex-col items-start gap-1">
          <div
            className={`max-w-[78%] rounded-[16px] rounded-bl-[5px] border border-[#F2C6D8]/90 bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#3A1233] shadow-[0_4px_10px_-8px_rgba(176,62,106,0.2)] ${msgTextClass}`}
          >
            Aree
          </div>
          <div
            className={`max-w-[88%] rounded-[16px] rounded-tl-[5px] border border-[#F2C6D8]/90 bg-[#FFFFFF] px-3 py-1.5 font-medium text-[#3A1233] shadow-[0_4px_10px_-8px_rgba(176,62,106,0.2)] ${msgTextClass}`}
          >
            Sab chij tohar baad me hi hota h 😂
          </div>
        </div>
      </div>
    </div>
  );
}

export interface BaadMeRevealEffects {
  triggerHaptic?: () => void;
  playWarmChime?: () => void;
  emitModinoBackstory?: () => void;
  recordReveal?: () => void;
}

/**
 * Executes the "Baad Me" mystery reveal sensory sequence:
 * celebratory haptic pulse -> warm chime SFX -> Modino 'backstory' reaction -> analytics event.
 * Every side-effect is isolated in its own try/catch so no environment limitation can block the reveal.
 */
export function triggerBaadMeMysteryReveal(effects: BaadMeRevealEffects = {}): void {
  const triggerHaptic = effects.triggerHaptic ?? (() => haptics.celebrate());
  const playWarmChime = effects.playWarmChime ?? (() => playUiSfx('awww_chime'));
  const emitModinoBackstory =
    effects.emitModinoBackstory ??
    (() => emitModinoEvent('backstory', { force: true, source: 'baad-me-reveal' }));
  const recordReveal =
    effects.recordReveal ?? (() => trackEvent('baad_me_answer_revealed', 'Baad Me Reveal'));

  try {
    triggerHaptic();
  } catch {
    // silent on unsupported devices
  }
  try {
    playWarmChime();
  } catch {
    // silent if audio context is unavailable
  }
  try {
    emitModinoBackstory();
  } catch {
    // silent
  }
  try {
    recordReveal();
  } catch {
    // silent
  }
}

export function BaadMeRevealSection({ onLightboxChange }: BaadMeRevealSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const openZoom = useCallback(() => {
    setIsZoomOpen(true);
    onLightboxChange?.(true);
    try {
      haptics.tap();
      playUiSfx('tap');
    } catch {
      // silent
    }
    try {
      trackEvent('baad_me_receipt_zoomed', 'Baad Me Receipt Zoom');
    } catch {
      // silent
    }
    emitModinoEvent('backstory', { source: 'baad-me-zoom' });
  }, [onLightboxChange]);

  const closeZoom = useCallback(() => {
    setIsZoomOpen(false);
    onLightboxChange?.(false);
  }, [onLightboxChange]);

  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomOpen, closeZoom]);

  useEffect(() => {
    return () => {
      onLightboxChange?.(false);
    };
  }, [onLightboxChange]);

  const handleRevealAnswer = useCallback(() => {
    if (isRevealed) return;
    setIsRevealed(true);
    triggerBaadMeMysteryReveal();
  }, [isRevealed]);

  return (
    <section
      id="baad-me-reveal"
      data-testid="baad-me-reveal-section"
      aria-labelledby="baad-me-reveal-heading"
      className="relative z-[2] mx-auto w-full px-4 py-6 sm:px-6"
    >
      <div
        className="relative mx-auto w-full max-w-[390px] rounded-[26px] border border-[rgba(217,75,125,0.20)] bg-gradient-to-b from-[#FFFDF9] to-[#FFF5F8] px-[18px] py-[22px] text-center shadow-[0_14px_34px_-16px_rgba(176,62,106,0.16)]"
      >
        {/* Subtle decorative corner blush glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-6 right-5 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(247,198,217,0.34)_0%,rgba(255,245,248,0)_72%)]"
        />

        {/* Header */}
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C93B6B]">
          UNANSWERED RECEIPT · FINALLY SOLVED
        </p>

        <h2
          id="baad-me-reveal-heading"
          className="mt-1.5 font-display text-[22px] font-bold leading-[1.2] text-[#3A1233]"
        >
          Remember This Chat?
        </h2>

        <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-[1.48] text-[#7A4A63]">
          You said sab chij baad me hi hota hai. Well... baad me is finally here.
        </p>

        {/* Framed Chat Screenshot with Pastel Tape Accent & Tap-to-Zoom */}
        <div className="relative mt-4 pt-2">
          {/* Delicate pastel washi tape strip at top center */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 z-[3] h-[18px] w-[72px] -translate-x-1/2 -rotate-[2deg] rounded-[4px] border border-[rgba(230,184,92,0.4)] bg-[rgba(253,234,242,0.88)] shadow-[0_2px_6px_rgba(176,62,106,0.10)]"
          />

          <button
            type="button"
            data-testid="baad-me-screenshot-btn"
            onClick={openZoom}
            aria-label="Zoom in on the Baad Me chat receipt"
            className="group relative block w-full cursor-pointer overflow-hidden rounded-[18px] border-[1.5px] border-[rgba(217,75,125,0.22)] bg-[#FFF8FB] p-2.5 text-left shadow-[0_10px_24px_-16px_rgba(176,62,106,0.24)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
          >
            {!imgFailed ? (
              <div className="relative overflow-hidden rounded-[12px] bg-[#FFF2F7]">
                <img
                  src={BAAD_ME_CHAT_IMG_SRC}
                  alt="Instagram chat receipt between us where I promised to tell you later"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImgFailed(true)}
                  className="block max-h-[280px] w-full rounded-[12px] object-cover object-top"
                />
              </div>
            ) : (
              <PastelInstagramChatFallback />
            )}

            {/* Discreet bottom-right zoom pill */}
            <span className="pointer-events-none absolute right-3.5 bottom-3.5 inline-flex items-center gap-1 rounded-full border border-[rgba(217,75,125,0.22)] bg-[rgba(255,253,249,0.92)] px-2.5 py-1 text-[10px] font-semibold text-[#9E2E58] shadow-[0_4px_12px_rgba(58,18,51,0.12)] backdrop-blur-sm transition-colors group-hover:bg-[#FFFDFB]">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5L13.5 13.5" />
                <path d="M7 5.2V8.8M5.2 7H8.8" />
              </svg>
              <span>Tap to zoom</span>
            </span>
          </button>
        </div>

        {/* Interactive "Open the Answer" Reveal Mechanic */}
        <div className="mt-4">
          {!isRevealed ? (
            <div
              data-testid="baad-me-sealed-panel"
              className="rounded-[18px] border-[1.2px] border-dashed border-[rgba(217,75,125,0.34)] bg-[rgba(255,250,244,0.85)] p-4 text-center"
            >
              <p className="text-[12.5px] italic text-[#7A4A63]">
                Still wondering why it was your loss?
              </p>

              <button
                type="button"
                data-testid="baad-me-reveal-btn"
                onClick={handleRevealAnswer}
                className="mt-3 inline-flex w-full max-w-[290px] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-[#E25B8B] to-[#C93B6B] px-5 py-[11px] text-[13.5px] font-bold text-[#FFFDFB] shadow-[0_10px_22px_-10px_rgba(201,59,107,0.58)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
              >
                <span>Tap to Open the &ldquo;Baad Me&rdquo; Answer</span>
              </button>
            </div>
          ) : (
            <div
              data-testid="baad-me-revealed-card"
              role="region"
              aria-live="polite"
              aria-label="The Baad Me Mystery Answer"
              className="animate-baad-me-unfold rounded-[20px] border-[1.5px] border-[rgba(230,184,92,0.55)] bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F2] to-[#FFF3F7] p-4 text-center shadow-[0_12px_28px_-14px_rgba(217,75,125,0.24),inset_0_1px_0_rgba(255,255,255,0.9)]"
            >
              <span className="inline-flex items-center rounded-full border border-[rgba(230,184,92,0.45)] bg-[#FFF4E0] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C93B6B]">
                MYSTERY SOLVED
              </span>

              <p className="mt-2.5 font-display text-[17.5px] font-bold leading-[1.4] text-[#3A1233]">
                Because at that exact moment, I was literally building this entire website for you!
              </p>

              <p className="mt-2 text-[13.5px] leading-[1.55] text-[#6E3F58]">
                Every minute you kept texting me during those 2 hours, I was secretly coding pages,
                animations, and surprises for your 17th birthday right behind that screen.
                Technically, you delayed your own birthday gift by 2 whole hours!
              </p>

              <p className="mt-3 text-[11.5px] font-bold tracking-[0.02em] text-[#C93B6B]">
                Case closed. No more baad me. ✨
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Tap-to-Zoom Lightbox via Portal */}
      {isZoomOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="baad-me-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Baad Me Chat Receipt Lightbox"
            onClick={closeZoom}
            className="fixed inset-0 z-[9700] flex items-center justify-center bg-[rgba(58,18,51,0.72)] p-4 backdrop-blur-md"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-[440px] rounded-[24px] border border-[rgba(255,235,244,0.45)] bg-[#FFFDF9] p-3.5 shadow-[0_24px_60px_rgba(32,9,28,0.45)]"
            >
              <div className="mb-2.5 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C93B6B]">
                  CHAT RECEIPT EXHIBIT
                </span>
                <button
                  type="button"
                  data-testid="baad-me-lightbox-close"
                  onClick={closeZoom}
                  aria-label="Close chat receipt zoom"
                  className="cursor-pointer rounded-full border border-[rgba(217,75,125,0.28)] bg-[#FFF3F7] px-3 py-1 text-[11.5px] font-bold text-[#9E2E58] transition-colors hover:bg-[#FFE6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                >
                  Close
                </button>
              </div>

              {!imgFailed ? (
                <div className="max-h-[76vh] overflow-y-auto rounded-[16px] bg-[#FFF5F9]">
                  <img
                    src={BAAD_ME_CHAT_IMG_SRC}
                    alt="Instagram chat receipt between us where I promised to tell you later"
                    onError={() => setImgFailed(true)}
                    className="block h-auto w-full rounded-[16px] object-contain"
                  />
                </div>
              ) : (
                <PastelInstagramChatFallback enlarged />
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

export default BaadMeRevealSection;
