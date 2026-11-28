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

function PastelChatTranscript({
  compact = false,
}: {
  compact?: boolean;
}) {
  const msgTextClass = compact
    ? 'text-[clamp(13px,1.75vw,16px)] leading-[1.48]'
    : 'text-[clamp(13.5px,1.85vw,16.5px)] leading-[1.5]';

  return (
    <div data-testid="baad-me-chat-transcript" className="text-left">
      {/* Mini Chat Header Row */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-[rgba(217,75,125,0.14)] pb-2.5 sm:mb-4 sm:pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(217,75,125,0.22)] bg-gradient-to-br from-[#F9C6DA] via-[#F29BBC] to-[#D94B7D] text-[11px] font-bold text-[#FFFDFB] shadow-[0_3px_8px_-4px_rgba(201,59,107,0.45)] sm:h-9 sm:w-9 sm:text-xs"
          >
            M
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[clamp(12.5px,1.6vw,15px)] font-bold tracking-[0.02em] text-[#3A1233]">
              MORGAN
            </p>
            <p className="truncate text-[clamp(10.5px,1.35vw,12.5px)] font-medium text-[#8A5A72]">
              i_hinata._
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-[rgba(217,75,125,0.2)] bg-[#FFEAF2] px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-[#B82E60] sm:px-3 sm:py-1 sm:text-[11px]">
          DM Receipt
        </span>
      </div>

      {/* Complete Uncropped 4-Turn Conversation */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Turn 1: Right Bubble (Sent by Me) + emoji reaction row */}
        <div className="flex flex-col items-end">
          <div
            className={`max-w-[86%] rounded-[18px] rounded-br-[6px] border border-[rgba(217,75,125,0.22)] bg-[#FFFDF9] px-3.5 py-2 font-medium text-[#3A1233] shadow-[0_5px_14px_-10px_rgba(176,62,106,0.28)] sm:max-w-[80%] sm:px-4 sm:py-2.5 ${msgTextClass}`}
          >
            Waise yk, you are wasting my time here from the last 2 hours, it&apos;s actually your
            loss
          </div>
          <span
            aria-label="Wilted flower reactions"
            className="mt-1 pr-1 text-[13px] leading-none tracking-[0.06em] sm:text-sm"
          >
            🥀🥀🥀
          </span>
        </div>

        {/* Turn 2: Left Bubble (Received from Morgan) + cute laughing bubble */}
        <div className="flex flex-col items-start gap-1">
          <div
            className={`max-w-[78%] rounded-[18px] rounded-bl-[6px] border border-[rgba(217,75,125,0.16)] bg-[#FCE7F0] px-3.5 py-1.5 font-medium text-[#3A1233] sm:px-4 sm:py-2 ${msgTextClass}`}
          >
            Why mine
          </div>
          <span
            aria-label="Laughing reaction"
            className="inline-flex items-center justify-center rounded-full border border-[rgba(217,75,125,0.14)] bg-[#FCE7F0] px-2.5 py-1 text-[13px] leading-none sm:text-sm"
          >
            😂
          </span>
        </div>

        {/* Turn 3: Right Reply Bubble (Sent by Me) with quoted reply pill */}
        <div className="flex flex-col items-end">
          <span className="mb-1 inline-flex items-center rounded-full border border-[rgba(217,75,125,0.16)] bg-[#FFF8FB] px-2.5 py-0.5 text-[10px] font-semibold text-[#8A5A72] sm:text-[11px]">
            Replied to &middot; Why mine
          </span>
          <div
            className={`max-w-[84%] rounded-[18px] rounded-br-[6px] border border-[rgba(217,75,125,0.22)] bg-[#FFFDF9] px-3.5 py-2 font-medium text-[#3A1233] shadow-[0_5px_14px_-10px_rgba(176,62,106,0.28)] sm:max-w-[78%] sm:px-4 sm:py-2.5 ${msgTextClass}`}
          >
            Baad me batata hu kabhi
          </div>
        </div>

        {/* Turn 4: Left Stacked Bubbles (Received from Morgan) */}
        <div className="flex flex-col items-start gap-1.5">
          <div
            className={`max-w-[74%] rounded-[18px] rounded-bl-[6px] border border-[rgba(217,75,125,0.16)] bg-[#FCE7F0] px-3.5 py-1.5 font-medium text-[#3A1233] sm:px-4 sm:py-2 ${msgTextClass}`}
          >
            Aree
          </div>
          <div
            className={`max-w-[86%] rounded-[18px] rounded-tl-[6px] border border-[rgba(217,75,125,0.16)] bg-[#FCE7F0] px-3.5 py-2 font-medium text-[#3A1233] sm:max-w-[80%] sm:px-4 sm:py-2.5 ${msgTextClass}`}
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
    try {
      haptics.tap();
      playUiSfx('tap');
    } catch {
      // silent
    }
    setIsZoomOpen(true);
    onLightboxChange?.(true);
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
    triggerBaadMeMysteryReveal();
    setIsRevealed(true);
  }, [isRevealed]);

  return (
    <section
      id="baad-me-reveal"
      data-testid="baad-me-reveal-section"
      aria-labelledby="baad-me-reveal-heading"
      className="relative z-[2] mx-auto w-full px-4 py-8 sm:px-6 sm:py-12"
    >
      <div
        className="relative mx-auto w-full max-w-[var(--card-max)] rounded-[var(--card-radius)] border border-[rgba(217,75,125,0.20)] bg-gradient-to-b from-[#FFFDF9] to-[#FFF5F8] px-[var(--card-pad-x)] py-[var(--card-pad-y)] text-center shadow-[0_14px_34px_-16px_rgba(176,62,106,0.16)]"
      >
          {/* Subtle decorative corner blush glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 right-5 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(247,198,217,0.34)_0%,rgba(255,245,248,0)_72%)]"
          />

          {/* Header */}
          <p className="text-[length:var(--text-eyebrow)] font-bold uppercase tracking-[0.18em] text-[#C93B6B]">
            UNANSWERED RECEIPT · FINALLY SOLVED
          </p>

          <h2
            id="baad-me-reveal-heading"
            className="mt-1.5 font-display text-[clamp(22px,3.2vw,31px)] font-bold leading-[1.2] text-[#3A1233]"
          >
            Remember This Chat?
          </h2>

          <p className="mx-auto mt-1.5 max-w-[46ch] text-[length:var(--text-sub)] leading-[1.52] text-[#7A4A63]">
            You said sab chij baad me hi hota hai. Well... baad me is finally here.
          </p>

          {/* Pastel Stationery Chat Transcript Card + View Original Screenshot Button */}
          <div className="relative mt-5 pt-2">
            {/* Delicate pastel washi tape strip at top center */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 z-[3] h-[18px] w-[76px] -translate-x-1/2 -rotate-[2deg] rounded-[4px] border border-[rgba(230,184,92,0.4)] bg-[rgba(253,234,242,0.88)] shadow-[0_2px_6px_rgba(176,62,106,0.10)]"
            />

            <div
              className="relative w-full overflow-hidden rounded-[20px] border-[1.5px] border-[rgba(217,75,125,0.20)] px-3.5 pt-4 pb-3.5 text-left sm:px-5 sm:pt-5 sm:pb-4"
              style={{
                background: 'linear-gradient(180deg, #FFF9FB 0%, #FFF3F7 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 24px -16px rgba(176, 62, 106, 0.2)',
              }}
            >
              <PastelChatTranscript compact />

              {/* Clean Footer Action: View Original Screenshot */}
              <div className="mt-4 flex justify-center border-t border-[rgba(217,75,125,0.14)] pt-3.5">
                <button
                  type="button"
                  data-testid="baad-me-screenshot-btn"
                  onClick={openZoom}
                  aria-label="View Original Screenshot"
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[rgba(217,75,125,0.30)] bg-[#FFFDFB] px-4 py-2 text-[clamp(12px,1.5vw,13.5px)] font-semibold text-[#B82E60] shadow-[0_4px_12px_-8px_rgba(176,62,106,0.35)] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#FFF5F8] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.65"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2.5" width="12" height="11" rx="2.2" />
                    <circle cx="5.7" cy="6.1" r="1.1" />
                    <path d="M13.5 10.6L10.6 7.8L7.2 11.2L5.6 9.6L2.6 12.6" />
                  </svg>
                  <span>View Original Screenshot</span>
                </button>
              </div>
            </div>
          </div>

          {/* Interactive "Open the Answer" Reveal Mechanic */}
          <div className="mt-5">
            {!isRevealed ? (
              <div
                data-testid="baad-me-sealed-panel"
                className="rounded-[18px] border-[1.2px] border-dashed border-[rgba(217,75,125,0.34)] bg-[rgba(255,250,244,0.85)] p-4 text-center sm:p-5"
              >
                <p className="text-[length:var(--text-sub)] italic text-[#7A4A63]">
                  Still wondering why it was your loss?
                </p>

                <button
                  type="button"
                  data-testid="baad-me-reveal-btn"
                  onClick={handleRevealAnswer}
                  className="mt-3.5 inline-flex min-h-[var(--btn-min-h)] w-full max-w-[340px] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-[#E25B8B] to-[#C93B6B] px-6 py-3 text-[clamp(13.5px,1.75vw,16px)] font-bold text-[#FFFDFB] shadow-[0_10px_22px_-10px_rgba(201,59,107,0.58)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
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
                className="animate-baad-me-unfold rounded-[20px] border-[1.5px] border-[rgba(230,184,92,0.55)] bg-gradient-to-b from-[#FFFDF9] via-[#FFF9F2] to-[#FFF3F7] p-5 text-center shadow-[0_12px_28px_-14px_rgba(217,75,125,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-6"
              >
                <span className="inline-flex items-center rounded-full border border-[rgba(230,184,92,0.45)] bg-[#FFF4E0] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#C93B6B] sm:text-[11px]">
                  MYSTERY SOLVED
                </span>

                <p className="mt-2.5 font-display text-[clamp(17.5px,2.4vw,22px)] font-bold leading-[1.38] text-[#3A1233]">
                  Because at that exact moment, I was literally building this entire website for you!
                </p>

                <p className="mx-auto mt-2 max-w-[48ch] text-[length:var(--text-body)] leading-[1.58] text-[#6E3F58]">
                  Every minute you kept texting me during those 2 hours, I was secretly coding pages,
                  animations, and surprises for your 17th birthday right behind that screen.
                  Technically, you delayed your own birthday gift by 2 whole hours!
                </p>

                <p className="mt-3 text-[clamp(11.5px,1.5vw,13.5px)] font-bold tracking-[0.02em] text-[#C93B6B]">
                  Case closed. No more baad me. ✨
                </p>
              </div>
            )}
          </div>
        </div>

      {/* Fullscreen Uncropped Screenshot Lightbox via Portal */}
      {isZoomOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            data-testid="baad-me-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Original Instagram DM Screenshot Lightbox"
            onClick={closeZoom}
            className="fixed inset-0 z-[9700] flex items-center justify-center bg-[rgba(58,18,51,0.72)] p-3 sm:p-5 backdrop-blur-md"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative flex max-h-[94dvh] max-w-[96vw] flex-col items-center rounded-[24px] border border-[rgba(255,235,244,0.48)] bg-[#FFFDF9] p-3 shadow-[0_24px_60px_rgba(32,9,28,0.45)]"
            >
              <div className="mb-2.5 flex w-full min-w-[240px] items-center justify-between gap-4 px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C93B6B]">
                  ORIGINAL SCREENSHOT
                </span>
                <button
                  type="button"
                  data-testid="baad-me-lightbox-close"
                  onClick={closeZoom}
                  aria-label="Close original screenshot"
                  className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full border border-[rgba(217,75,125,0.28)] bg-[#FFF3F7] px-4 py-1.5 text-xs font-bold text-[#9E2E58] transition-colors hover:bg-[#FFE6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C93B6B]"
                >
                  Close
                </button>
              </div>

              {!imgFailed ? (
                <img
                  data-testid="baad-me-lightbox-img"
                  src={BAAD_ME_CHAT_IMG_SRC}
                  alt="Original Instagram chat screenshot between us where I promised to tell you later"
                  onError={() => setImgFailed(true)}
                  className="block rounded-[16px]"
                  style={{
                    objectFit: 'contain',
                    maxHeight: '84dvh',
                    maxWidth: '90vw',
                    width: 'auto',
                    height: 'auto',
                  }}
                />
              ) : (
                <div className="w-[320px] max-w-[88vw] rounded-[18px] border border-[rgba(217,75,125,0.2)] bg-[#FFF9FB] p-4">
                  <PastelChatTranscript />
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

export default BaadMeRevealSection;
