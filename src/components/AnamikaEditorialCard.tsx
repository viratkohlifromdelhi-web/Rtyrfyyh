import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../utils/analytics';
import {
  computeCardTilt,
  createRestTiltState,
  stepTiltState,
  type CardTiltState,
  type CardTiltTarget,
} from '../utils/editorialCard';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

const ANAMIKA_PHOTO_SRC = `${import.meta.env.BASE_URL}${encodeURIComponent('IMG_20261126_131911_725.jpg')}`;
const PHOTO_MAX_TILT_DEG = 4;
const PHOTO_REST_ROTATE_Z_DEG = -1.2;

function ZoomExpandIconSvg({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.2 4.2" />
      <path d="M11 8.5v5" />
      <path d="M8.5 11h5" />
    </svg>
  );
}

function FlipPhotoIconSvg({ className = 'h-[13px] w-[13px]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 7v5h-5" />
      <path d="M19.4 12A7.5 7.5 0 0 0 6.3 7.6" />
      <path d="M4 17v-5h5" />
      <path d="M4.6 12a7.5 7.5 0 0 0 13.1 4.4" />
    </svg>
  );
}

function PhotoCornerMountSvg({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotationClass =
    position === 'tl'
      ? '-top-[1px] -left-[1px] rotate-0'
      : position === 'tr'
        ? '-top-[1px] -right-[1px] rotate-90'
        : position === 'br'
          ? '-right-[1px] -bottom-[1px] rotate-180'
          : '-bottom-[1px] -left-[1px] -rotate-90';

  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 h-[12px] w-[12px] ${rotationClass}`}
    >
      <path
        d="M0.5 0.5H11.2L0.5 11.2V0.5Z"
        fill="#FAF2F5"
        fillOpacity="0.92"
        stroke="#C992A6"
        strokeOpacity="0.72"
        strokeWidth="0.85"
        strokeLinejoin="round"
      />
      <path
        d="M1.2 1.2H8.4L1.2 8.4V1.2Z"
        fill="#EED9E2"
        fillOpacity="0.45"
      />
    </svg>
  );
}

interface AnamikaEditorialCardProps {
  onLightboxChange?: (open: boolean) => void;
}

export function AnamikaEditorialCard({ onLightboxChange }: AnamikaEditorialCardProps = {}) {
  const paperGrainId = useId().replace(/:/g, '');
  const [isFlipped, setIsFlipped] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const tiltWrapperRef = useRef<HTMLDivElement | null>(null);
  const glossSheenRef = useRef<HTMLDivElement | null>(null);
  const isFlippedRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef<number>(0);
  const currentTiltRef = useRef<CardTiltState>(createRestTiltState());
  const targetTiltRef = useRef<CardTiltTarget>(createRestTiltState());
  const currentRollZRef = useRef<number>(PHOTO_REST_ROTATE_Z_DEG);
  const targetRollZRef = useRef<number>(PHOTO_REST_ROTATE_Z_DEG);

  useEffect(() => {
    isFlippedRef.current = isFlipped;
    targetRollZRef.current = isFlipped ? 0 : PHOTO_REST_ROTATE_Z_DEG;
    if (isFlipped) {
      targetTiltRef.current = createRestTiltState();
    }
    startTiltLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped]);

  const applyTiltDom = useCallback((state: CardTiltState, rollZ: number) => {
    const wrapper = tiltWrapperRef.current;
    if (wrapper) {
      wrapper.style.transform = `rotateZ(${rollZ.toFixed(3)}deg) rotateX(${state.rotateX.toFixed(3)}deg) rotateY(${state.rotateY.toFixed(3)}deg)`;
    }
    const sheen = glossSheenRef.current;
    if (sheen) {
      sheen.style.opacity = state.sheenOpacity.toFixed(3);
      sheen.style.transform = `translate3d(${state.sheenX.toFixed(2)}%, ${state.sheenY.toFixed(2)}%, 0) rotate(-24deg)`;
    }
  }, []);

  const stopTiltLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (tiltWrapperRef.current) tiltWrapperRef.current.style.willChange = 'auto';
    if (glossSheenRef.current) glossSheenRef.current.style.willChange = 'auto';
  }, []);

  const startTiltLoop = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (rafIdRef.current !== null) return;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      const rest = createRestTiltState();
      currentTiltRef.current = rest;
      currentRollZRef.current = targetRollZRef.current;
      applyTiltDom(rest, targetRollZRef.current);
      return;
    }

    if (tiltWrapperRef.current) tiltWrapperRef.current.style.willChange = 'transform';
    if (glossSheenRef.current) glossSheenRef.current.style.willChange = 'transform, opacity';
    lastFrameTsRef.current = performance.now();

    const tick = (now: number) => {
      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastFrameTsRef.current) / 1000));
      lastFrameTsRef.current = now;

      const { next, settled } = stepTiltState(
        currentTiltRef.current,
        targetTiltRef.current,
        dtSec,
        12,
      );
      currentTiltRef.current = next;

      const rollAlpha = 1 - Math.exp(-10 * dtSec);
      const nextRoll =
        currentRollZRef.current + (targetRollZRef.current - currentRollZRef.current) * rollAlpha;
      const rollSettled = Math.abs(nextRoll - targetRollZRef.current) < 0.02;
      currentRollZRef.current = rollSettled ? targetRollZRef.current : nextRoll;

      applyTiltDom(currentTiltRef.current, currentRollZRef.current);

      if (settled && rollSettled) {
        rafIdRef.current = null;
        if (tiltWrapperRef.current) tiltWrapperRef.current.style.willChange = 'auto';
        if (glossSheenRef.current) glossSheenRef.current.style.willChange = 'auto';
        return;
      }
      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  }, [applyTiltDom]);

  useEffect(() => {
    applyTiltDom(currentTiltRef.current, PHOTO_REST_ROTATE_Z_DEG);
    return () => {
      stopTiltLoop();
    };
  }, [applyTiltDom, stopTiltLoop]);

  const updateTiltFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (isFlippedRef.current) return;
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;
      targetTiltRef.current = computeCardTilt(normX, normY, PHOTO_MAX_TILT_DEG);
      targetRollZRef.current = -0.35;
      startTiltLoop();
    },
    [startTiltLoop],
  );

  const resetTiltToRest = useCallback(() => {
    targetTiltRef.current = createRestTiltState();
    targetRollZRef.current = isFlippedRef.current ? 0 : PHOTO_REST_ROTATE_Z_DEG;
    startTiltLoop();
  }, [startTiltLoop]);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      updateTiltFromClientPoint(e.clientX, e.clientY);
    },
    [updateTiltFromClientPoint],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      updateTiltFromClientPoint(e.clientX, e.clientY);
    },
    [updateTiltFromClientPoint],
  );

  // Notify parent when lightbox opens/closes (so Sparkle Rain pauses cleanly behind modal)
  useEffect(() => {
    onLightboxChange?.(lightboxOpen);
    return () => {
      if (lightboxOpen) {
        onLightboxChange?.(false);
      }
    };
  }, [lightboxOpen, onLightboxChange]);

  // Lock body scroll and bind Escape key while full-screen lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [lightboxOpen]);

  const handleFlipToggle = useCallback(() => {
    const next = !isFlipped;
    haptics.cardFlip();
    soundEngine.playEditorialCardFlip();
    trackEvent('photo_card_flipped', 'Anamika Printed Photo Card', {
      side: next ? 'back' : 'front',
    });
    setIsFlipped(next);
  }, [isFlipped]);

  const handleCardKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFlipToggle();
      }
    },
    [handleFlipToggle],
  );

  const handleOpenZoom = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    haptics.tap();
    soundEngine.playBubbleClick(1.06);
    trackEvent('photo_card_zoomed', 'Anamika Photo Lightbox');
    setLightboxOpen(true);
  }, []);

  const handleCloseZoom = useCallback(() => {
    haptics.tap();
    soundEngine.playBubbleClick(0.92);
    setLightboxOpen(false);
  }, []);

  return (
    <div
      data-testid="single-photo-slot"
      className="relative z-10 mx-auto flex flex-col items-center py-3 sm:py-4"
    >
      {/* Warm Ambient Blush-Gold Halo Directly Behind the Scrapbook Stack */}
      <div
        aria-hidden="true"
        data-testid="photo-ambient-halo"
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at 50% 48%, rgba(235, 152, 184, 0.25) 0%, rgba(246, 214, 168, 0.17) 44%, rgba(255, 246, 249, 0) 74%)',
        }}
      />

      {/* 3D Perspective Stage — Layered Physical Scrapbook Polaroid Print */}
      <div
        ref={stageRef}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={
          isFlipped
            ? 'Handwritten note on back of Anamika photograph, tap to flip back to photo'
            : 'Printed photograph of Anamika aka Morgan, tap to flip photo for handwritten note'
        }
        data-testid="anamika-photo-frame"
        data-flipped={String(isFlipped)}
        onClick={handleFlipToggle}
        onKeyDown={handleCardKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={resetTiltToRest}
        onPointerLeave={resetTiltToRest}
        onPointerCancel={resetTiltToRest}
        className="group relative cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D94B7D]"
        style={{
          width: 'min(86vw, 370px)',
          maxWidth: '100%',
          touchAction: 'pan-y',
        }}
      >
        {/* Layered Second Cream-Blush Archival Backing Card Strictly Behind the 3D Flip Stage */}
        <div
          aria-hidden="true"
          data-testid="photo-archival-backing-card"
          className="pointer-events-none absolute inset-0 z-0 rounded-[14px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            backgroundColor: '#FCEEF4',
            border: '1px solid rgba(217, 75, 125, 0.16)',
            transform: isFlipped
              ? 'rotate(1.6deg) translate3d(4px, 4px, 0)'
              : 'rotate(2.6deg) translate3d(6px, 5px, 0)',
            boxShadow:
              '0 18px 36px -18px rgba(58, 18, 51, 0.2), 0 4px 10px -4px rgba(58, 18, 51, 0.09)',
          }}
        >
          {/* Subtle inner archival paper margin lines */}
          <div className="absolute inset-2.5 rounded-[9px] border border-[#D94B7D]/[0.07]" />
        </div>

        {/* Dedicated 3D Perspective Stage Isolated Above Backing Card */}
        <div
          className="relative z-10 w-full"
          style={{
            perspective: '1350px',
            WebkitPerspective: '1350px',
          }}
        >
          {/* Direct-DOM rAF Tilt & Resting Angle (-1.2deg -> ±4deg on touch/drag -> springs back) */}
          <div
            ref={tiltWrapperRef}
            data-testid="anamika-tilt-wrapper"
            className="relative w-full"
            style={{
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              transform: `rotateZ(${PHOTO_REST_ROTATE_Z_DEG}deg)`,
            }}
          >
            {/* Inner 3D Flipper (0.68s weighted physical print flip) */}
            <div
              data-testid="anamika-card-flipper"
              className="relative w-full"
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                transition: 'transform 0.68s cubic-bezier(0.22, 1, 0.36, 1)',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
            {/* ==============================================================
                FRONT FACE — Handcrafted Scrapbook Polaroid Physical Print
               ============================================================== */}
            <div
              data-testid="anamika-card-front"
              aria-hidden={isFlipped}
              className="relative w-full rounded-[14px] border border-[#EFE1E8] bg-[#FFFFFF] px-[11px] pt-[23px] pb-[15px] sm:px-[13px] sm:pt-[25px] sm:pb-[16px]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg) translateZ(1px)',
                pointerEvents: isFlipped ? 'none' : 'auto',
                boxShadow:
                  '0 22px 46px -20px rgba(58, 18, 51, 0.28), 0 8px 18px -8px rgba(58, 18, 51, 0.14), 0 1px 3px rgba(58, 18, 51, 0.08)',
              }}
            >
              {/* Translucent Blush Washi Tape with Torn/Serrated Side Edges (Top Center) */}
              <div
                aria-hidden="true"
                data-testid="photo-front-washi-tape"
                className="pointer-events-none absolute -top-[10px] left-1/2 z-30"
                style={{
                  width: '86px',
                  height: '22px',
                  transform: 'translateX(-50%) rotate(-3deg)',
                  background:
                    'linear-gradient(100deg, rgba(235, 152, 184, 0.44) 0%, rgba(242, 174, 200, 0.36) 52%, rgba(235, 152, 184, 0.44) 100%)',
                  clipPath:
                    'polygon(3% 0%, 97% 0%, 100% 14%, 97.5% 28%, 100% 44%, 97% 60%, 100% 76%, 97.5% 90%, 99% 100%, 2% 100%, 0% 86%, 2.5% 70%, 0% 54%, 2.5% 38%, 0% 22%, 2.5% 10%)',
                  boxShadow:
                    '0 2px 5px rgba(58, 18, 51, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.48)',
                }}
              />

              {/* Faint Archival Date Stamp in Top-Left White Border Margin */}
              <span
                aria-hidden="true"
                data-testid="photo-archival-date-stamp"
                className="pointer-events-none absolute top-[6px] left-[13px] z-20 font-mono text-[9.5px] leading-none font-medium tracking-[0.09em] text-[#6B3B55] uppercase opacity-45 tabular-nums select-none sm:left-[15px]"
                style={{ transform: 'rotate(-4deg)' }}
              >
                03 DEC 26
              </span>

              {/* Unobstructed 3:4 Portrait Photo Frame with Outer Vintage Corner Mounts */}
              <div
                className="relative w-full overflow-hidden rounded-[6px] bg-[#FAF3F6]"
                style={{ aspectRatio: '3 / 4', isolation: 'isolate' }}
              >
                {!photoFailed ? (
                  <img
                    src={ANAMIKA_PHOTO_SRC}
                    alt="Anamika Singh aka Morgan, sunglasses and lit lighter portrait"
                    width={900}
                    height={1200}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    onError={() => setPhotoFailed(true)}
                    className="block h-full w-full object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#FFF6F9] p-6 text-center">
                    <span className="font-display text-2xl font-semibold italic text-[#3A1233]">
                      Anamika (aka Morgan)
                    </span>
                    <span className="mt-1 text-xs font-medium text-[#7A4A6E]">
                      03 December 2026 &middot; Turning 17
                    </span>
                  </div>
                )}

                {/* Silky Diagonal Glossy Photo-Paper Specular Sheen (rAF Direct DOM Mutation) */}
                <div
                  ref={glossSheenRef}
                  aria-hidden="true"
                  data-testid="photo-gloss-sheen"
                  className="pointer-events-none absolute -inset-1/2 z-10"
                  style={{
                    opacity: 0,
                    background:
                      'linear-gradient(115deg, rgba(255,255,255,0) 34%, rgba(255,250,252,0.32) 48%, rgba(255,236,214,0.18) 54%, rgba(255,255,255,0) 68%)',
                  }}
                />

                {/* Minimalist 12px Vintage Photo Corner Mounts Strictly on Outer Inset Corners */}
                <PhotoCornerMountSvg position="tl" />
                <PhotoCornerMountSvg position="tr" />
                <PhotoCornerMountSvg position="bl" />
                <PhotoCornerMountSvg position="br" />

                {/* Sleek Frosted Translucent Top-Right Zoom Control (32x32px, Clean Deep Plum SVG) */}
                {!photoFailed && (
                  <button
                    type="button"
                    data-testid="anamika-photo-zoom-btn"
                    onClick={handleOpenZoom}
                    onPointerDown={(e) => e.stopPropagation()}
                    aria-label="Open full screen uncropped photograph of Anamika"
                    className="absolute top-2.5 right-2.5 z-20 flex h-8 w-8 cursor-zoom-in items-center justify-center rounded-full border border-[#3A1233]/15 text-[#3A1233] shadow-[0_4px_12px_-4px_rgba(58,18,51,0.22)] transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D]"
                    style={{
                      backgroundColor: 'rgba(255, 246, 249, 0.72)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                    }}
                  >
                    <ZoomExpandIconSvg className="h-[15px] w-[15px]" />
                  </button>
                )}
              </div>

              {/* Refined Airy White Polaroid Bottom Margin */}
              <div className="mt-3.5 flex items-end justify-between gap-2 px-1 text-left">
                <div className="min-w-0">
                  <h2
                    data-testid="anamika-photo-title"
                    className="font-display text-[17.5px] leading-tight font-semibold italic text-[#3A1233] sm:text-[19px]"
                  >
                    Anamika (aka Morgan)
                  </h2>
                  <p
                    data-testid="anamika-photo-caption"
                    className="mt-0.5 text-[11.5px] leading-snug text-[#7A4A63] sm:text-[12.5px]"
                  >
                    Still zero height growth since 8th class.
                  </p>
                </div>

                <span
                  data-testid="anamika-flip-pill"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] leading-none font-semibold whitespace-nowrap text-[#3A1233] transition-colors duration-200 group-hover:bg-[#F9DCE9]"
                  style={{
                    backgroundColor: '#FCEBF2',
                    border: '1px solid rgba(217, 75, 125, 0.25)',
                  }}
                >
                  <span>Flip photo</span>
                  <FlipPhotoIconSvg className="h-[13px] w-[13px] shrink-0 text-[#B53263]" />
                </span>
              </div>
            </div>

            {/* ==============================================================
                BACK FACE — Authentic Matte Printed Photo-Paper & Handwritten Note
               ============================================================== */}
            <div
              data-testid="anamika-card-back"
              aria-hidden={!isFlipped}
              className="absolute inset-0 overflow-hidden rounded-[14px] border border-[#E9DCE3] bg-[#FCF7F9] text-left text-[#3A1233]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(1px)',
                pointerEvents: isFlipped ? 'auto' : 'none',
                boxShadow:
                  '0 22px 46px -20px rgba(58, 18, 51, 0.28), 0 8px 18px -8px rgba(58, 18, 51, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
              }}
            >
              {/* Subtle Archival Matte Photo-Paper Grain Texture */}
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045]"
              >
                <filter id={`photo-paper-grain-${paperGrainId}`}>
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.82"
                    numOctaves="3"
                    stitchTiles="stitch"
                  />
                </filter>
                <rect
                  width="100%"
                  height="100%"
                  filter={`url(#photo-paper-grain-${paperGrainId})`}
                />
              </svg>

              {/* Tiny Tilted Piece of Translucent Blush Washi Tape at Top Center */}
              <div
                aria-hidden="true"
                data-testid="photo-back-washi-tape"
                className="pointer-events-none absolute top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 -rotate-2 rounded-[2px] border-x border-dashed border-[#E6B8CC]/70 bg-[#F7D4E3]/65 shadow-[0_1px_2px_rgba(58,18,51,0.06)]"
              />

              {/* Authentic Photo-Paper Content Layout */}
              <div className="relative z-20 flex h-full flex-col justify-between px-6 pt-11 pb-5 sm:px-7 sm:pt-12 sm:pb-6">
                {/* Top-Right Faint Vintage Photo-Lab Stamp */}
                <div className="flex justify-end">
                  <span
                    data-testid="photo-lab-stamp"
                    className="font-mono text-[10px] font-medium tracking-[0.1em] text-[#9B7A8A] uppercase opacity-65 tabular-nums"
                  >
                    PRINT 17 &middot; 03 DEC 2026 &middot; ANAMIKA
                  </span>
                </div>

                {/* Centered Genuine Handwritten-Style Best-Friend Note */}
                <div
                  data-testid="photo-back-note"
                  className="my-auto flex flex-col justify-center py-4"
                >
                  <p className="font-display text-[15.5px] leading-[1.68] italic text-[#3A1233] sm:text-[16.5px]">
                    Kept this picture here because you actually look intimidating with the
                    sunglasses and lighter, until anyone remembers how tall you actually are.
                  </p>
                  <p className="font-display mt-4 text-[15.5px] leading-[1.68] italic text-[#3A1233] sm:text-[16.5px]">
                    Seriously though, happy 17th Morgan. Easily one of my favorite people since that
                    12:29 AM text on 21 July. Stay the exact same chaotic HG.
                  </p>
                  <p className="font-display mt-5 text-right text-[15px] font-semibold italic text-[#7B3463] sm:text-[16px]">
                    still your #1 bully
                  </p>
                </div>

                {/* Minimal Quiet Flip-Back Row */}
                <div className="flex items-center justify-center border-t border-[#3A1233]/10 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.02em] text-[#8E657A]">
                    <span>Tap anywhere to flip back</span>
                    <FlipPhotoIconSvg className="h-3 w-3 shrink-0" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Full-Screen Clean Uncropped Lightbox (Portaled to document.body at z-9990) */}
      {lightboxOpen &&
        !photoFailed &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Full screen photograph of Anamika"
            data-testid="anamika-photo-lightbox"
            onClick={handleCloseZoom}
            className="animate-pop-in fixed inset-0 z-[9990] flex flex-col items-center justify-center p-4 backdrop-blur-xs sm:p-6"
            style={{ backgroundColor: 'rgba(18, 7, 15, 0.92)' }}
          >
            {/* Clean Top-Right Close Pill */}
            <button
              type="button"
              data-testid="anamika-lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseZoom();
              }}
              className="fixed top-4 right-4 z-[9995] inline-flex min-h-[42px] cursor-pointer items-center gap-1.5 rounded-full border border-[#FFF6F9]/30 bg-[#1D0B17]/90 px-4 py-2 text-xs font-semibold text-[#FFF8F2] shadow-lg transition-colors hover:border-[#FFF6F9]/60 hover:bg-[#2B1122] active:scale-95 sm:top-6 sm:right-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF6F9]"
            >
              <span>Close &#x2715;</span>
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center"
            >
              <img
                src={ANAMIKA_PHOTO_SRC}
                alt="Anamika Singh aka Morgan"
                decoding="async"
                referrerPolicy="no-referrer"
                className="block rounded-[12px] border-4 border-[#FFFFFF] shadow-2xl"
                style={{
                  maxWidth: '92vw',
                  maxHeight: '84vh',
                  objectFit: 'contain',
                }}
              />
              <p className="mt-3 text-center text-xs font-medium text-[#F6DCE6]/90">
                Anamika (aka Morgan) &middot; Still zero height growth since 8th class.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
