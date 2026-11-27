import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackEvent } from '../utils/analytics';
import { haptics } from '../utils/haptics';
import { SparkleStarSvg } from './DoodleSvgs';
import {
  CARD_IDLE_ROT_DEG,
  CARD_IDLE_SCALE,
  CARD_OPEN_ROT_DEG,
  CARD_OPEN_SCALE,
  CARD_OPEN_Y_PX,
  CARD_PEAK_ROT_DEG,
  CARD_PEAK_SCALE,
  CARD_PULL_START_SEC,
  CARD_SPRING_CONFIG,
  CARD_Z_SWAP_SEC,
  CLOSE_CLIP_END_SEC,
  CLOSE_LIFT_END_SEC,
  CLOSE_TUCK_END_SEC,
  FIRST_TEXT_DATE,
  FOLDER_IDLE_TILT_DEG,
  OPEN_COMPLETE_SEC,
  RECEIPT_IMG_SRC,
  STAMP_IMPACT_SEC,
  clamp01,
  clampPhysicsDt,
  computeDaysSinceFirstText,
  computeFolderPressScale,
  computeFrontFlapOpenFrame,
  computePaperclipOpenFrame,
  computeStampImpactFrame,
  easeInOutCubic,
  easeOutCubic,
  formatDaysSinceLabel,
  isSpringSettled,
  lerp,
  stepSpring,
  type SpringState,
} from '../utils/caseFilePhysics';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';

type FolderPhase = 'closed' | 'opening' | 'open' | 'closing';

const OUTER_CARD_SPARKLES = [
  { pos: '-top-3 -left-2.5', size: 'h-4 w-4', color: 'text-[#D94B7D]', delay: '0ms' },
  { pos: '-top-4 right-[26%]', size: 'h-3.5 w-3.5', color: 'text-[#EAB348]', delay: '70ms' },
  { pos: '-top-2.5 -right-3', size: 'h-4 w-4', color: 'text-[#B482E6]', delay: '130ms' },
  { pos: '-bottom-3 -left-2.5', size: 'h-3.5 w-3.5', color: 'text-[#EAB348]', delay: '110ms' },
  { pos: '-bottom-3 -right-2', size: 'h-4 w-4', color: 'text-[#D94B7D]', delay: '50ms' },
];

function RoseGoldPaperclipSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="roseGoldClipGrad" x1="4" y1="2" x2="32" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F6CFD7" />
          <stop offset="52%" stopColor="#D98D9F" />
          <stop offset="100%" stopColor="#B86A7D" />
        </linearGradient>
        <filter id="roseGoldClipShadow" x="-25%" y="-15%" width="150%" height="135%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#3A1233" floodOpacity="0.22" />
        </filter>
      </defs>
      <g filter="url(#roseGoldClipShadow)">
        <path
          d="M11 22V53C11 60.18 16.6 66 23.5 66C30.4 66 36 60.18 36 53V15.5C36 9.15 30.85 4 24.5 4C18.15 4 13 9.15 13 15.5V48.5C13 52.64 16.36 56 20.5 56C24.64 56 28 52.64 28 48.5V19"
          stroke="url(#roseGoldClipGrad)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(-4, 1)"
        />
        {/* Crisp specular highlight along outer wire */}
        <path
          d="M20.5 5.6C26 5.6 30.5 9.9 30.5 15.5V48"
          stroke="#FFF5F8"
          strokeOpacity="0.62"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Curved thumb-notch front pocket cardstock surface with bright 1px top highlight.
 */
function FrontPocketCardstockSvg() {
  return (
    <svg
      viewBox="0 0 370 256"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="pocketFlapGrad" x1="185" y1="0" x2="185" y2="256" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE8F0" />
          <stop offset="100%" stopColor="#F7D3E1" />
        </linearGradient>
        <linearGradient id="pocketInnerTopShade" x1="185" y1="0" x2="185" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3A1233" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#3A1233" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Main pocket shape with smooth curved thumb-notch at top center */}
      <path
        d="M 18 1 H 134 C 145 1 151 5 156 11 C 163 20 173 25 185 25 C 197 25 207 20 214 11 C 219 5 225 1 236 1 H 352 C 361.4 1 369 8.6 369 18 V 238 C 369 247.4 361.4 255 352 255 H 18 C 8.6 255 1 247.4 1 238 V 18 C 1 8.6 8.6 1 18 1 Z"
        fill="url(#pocketFlapGrad)"
        stroke="rgba(217, 75, 125, 0.24)"
        strokeWidth="1.2"
      />

      {/* Subtle inner pocket depth glaze */}
      <path
        d="M 18 2 H 134 C 145 2 151 6 156 12 C 163 21 173 26 185 26 C 197 26 207 21 214 12 C 219 6 225 2 236 2 H 352 C 361 2 368 9 368 18 V 44 H 2 V 18 C 2 9 9 2 18 2 Z"
        fill="url(#pocketInnerTopShade)"
      />

      {/* Soft 1px bright top highlight along the pocket lip & thumb notch */}
      <path
        d="M 18 2.2 H 134 C 144.8 2.2 150.6 6 155.5 12 C 162.8 21.1 173 26 185 26 C 197 26 207.2 21.1 214.5 12 C 219.4 6 225.2 2.2 236 2.2 H 352"
        stroke="rgba(255, 255, 255, 0.78)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface CaseFileSectionProps {
  onLightboxChange?: (open: boolean) => void;
}

export function CaseFileSection({ onLightboxChange }: CaseFileSectionProps = {}) {
  const [phase, setPhase] = useState<FolderPhase>('closed');
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [showStampSparkles, setShowStampSparkles] = useState(false);

  // Direct DOM refs for 100% GPU-composited 60fps transforms & opacity (zero rAF setState)
  const folderRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const flapRef = useRef<HTMLDivElement | null>(null);
  const clipRef = useRef<HTMLDivElement | null>(null);
  const stampRef = useRef<HTMLDivElement | null>(null);

  const phaseRef = useRef<FolderPhase>('closed');
  const rafIdRef = useRef<number | null>(null);
  const sparkleTimerRef = useRef<number | null>(null);
  const duckRestoreTimerRef = useRef<number | null>(null);

  // Live "Days Since First Text" counter computed from FIRST_TEXT_DATE ('2026-07-22')
  const [daysSince, setDaysSince] = useState<number>(() =>
    computeDaysSinceFirstText(FIRST_TEXT_DATE, new Date()),
  );

  useEffect(() => {
    const updateDays = () => {
      setDaysSince(computeDaysSinceFirstText(FIRST_TEXT_DATE, new Date()));
    };
    updateDays();
    const id = window.setInterval(updateDays, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const daysLabel = useMemo(() => formatDaysSinceLabel(daysSince), [daysSince]);

  const setPhaseSync = useCallback((next: FolderPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const cancelAnimationLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (sparkleTimerRef.current !== null) {
      window.clearTimeout(sparkleTimerRef.current);
      sparkleTimerRef.current = null;
    }
    if (duckRestoreTimerRef.current !== null) {
      window.clearTimeout(duckRestoreTimerRef.current);
      duckRestoreTimerRef.current = null;
    }
  }, []);

  const applyClosedPose = useCallback(() => {
    if (folderRef.current) {
      folderRef.current.style.transform = `rotate(${FOLDER_IDLE_TILT_DEG}deg) scale(1)`;
    }
    if (cardRef.current) {
      cardRef.current.style.zIndex = '10';
      cardRef.current.style.transform = `translate3d(0, 0px, 0) scale(${CARD_IDLE_SCALE}) rotate(${CARD_IDLE_ROT_DEG}deg)`;
    }
    if (flapRef.current) {
      flapRef.current.style.transform = 'perspective(1000px) rotateX(0deg)';
      flapRef.current.style.opacity = '1';
    }
    if (clipRef.current) {
      clipRef.current.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
      clipRef.current.style.opacity = '1';
    }
    if (stampRef.current) {
      stampRef.current.style.transform = 'scale(2.1) rotate(-11deg)';
      stampRef.current.style.opacity = '0';
    }
  }, []);

  const applyOpenPose = useCallback(() => {
    if (folderRef.current) {
      folderRef.current.style.transform = `rotate(${FOLDER_IDLE_TILT_DEG}deg) scale(1)`;
    }
    if (cardRef.current) {
      cardRef.current.style.zIndex = '30';
      cardRef.current.style.transform = `translate3d(0, ${CARD_OPEN_Y_PX}px, 0) scale(${CARD_OPEN_SCALE}) rotate(${CARD_OPEN_ROT_DEG}deg)`;
    }
    if (flapRef.current) {
      flapRef.current.style.transform = 'perspective(1000px) rotateX(-6deg)';
      flapRef.current.style.opacity = '0.82';
    }
    if (clipRef.current) {
      clipRef.current.style.transform = 'translate3d(16px, -24px, 0) rotate(28deg)';
      clipRef.current.style.opacity = '0';
    }
    if (stampRef.current) {
      stampRef.current.style.transform = 'scale(1) rotate(-11deg)';
      stampRef.current.style.opacity = '0.92';
    }
  }, []);

  // Initialize exact idle transforms on mount and clean up all rAF/timers on unmount
  useEffect(() => {
    applyClosedPose();
    return () => {
      cancelAnimationLoop();
      bgMusicPlayer.endCaseFileOpen();
    };
  }, [applyClosedPose, cancelAnimationLoop]);

  // Notify parent when lightbox opens/closes so background Sparkle Rain canvas pauses cleanly
  useEffect(() => {
    onLightboxChange?.(isZoomed);
  }, [isZoomed, onLightboxChange]);

  useEffect(() => {
    return () => {
      onLightboxChange?.(false);
    };
  }, [onLightboxChange]);

  // Lock body scroll and bind Escape key while full-screen tap-to-zoom lightbox is open
  useEffect(() => {
    if (!isZoomed) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsZoomed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isZoomed]);

  const handleOpenFolder = useCallback(() => {
    if (phaseRef.current !== 'closed') return;
    trackEvent('case_file_opened', 'Case File #0721 Folder');
    cancelAnimationLoop();
    setShowStampSparkles(false);
    setPhaseSync('opening');

    // Stage 1 SFX (t = 0.0s) + smooth music duck (0.45 -> 0.18 over 0.25s)
    soundEngine.playPaperclipUnclip();
    haptics.casePaperclip();
    bgMusicPlayer.beginCaseFileOpen();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      applyOpenPose();
      soundEngine.playCaseStampImpact();
      haptics.caseStamp();
      setPhaseSync('open');
      duckRestoreTimerRef.current = window.setTimeout(() => {
        duckRestoreTimerRef.current = null;
        bgMusicPlayer.endCaseFileOpen();
      }, 350);
      return;
    }

    const startTs = performance.now();
    let lastTs = startTs;
    let slideSfxPlayed = false;
    let zSwapped = false;
    let stampSfxPlayed = false;

    // Measure card height once so Phase A glides exactly -108% above its resting spot
    const cardHeightPx = cardRef.current?.offsetHeight || 306;
    const peakLiftYPx = -Math.round(cardHeightPx * 1.08);

    // Damped harmonic spring state for Stage 2 Phase B (z-swap -> spring lay-down on top)
    let springY: SpringState = { value: peakLiftYPx, velocity: 0 };
    let springScale: SpringState = { value: CARD_PEAK_SCALE, velocity: 0 };
    let springRot: SpringState = { value: CARD_PEAK_ROT_DEG, velocity: 0 };

    const tick = (now: number) => {
      const elapsedSec = (now - startTs) / 1000;
      const dtSec = clampPhysicsDt((now - lastTs) / 1000);
      lastTs = now;

      // 1. Folder press-down tactile scale (0.985 for 65ms -> 1.0)
      if (folderRef.current) {
        const folderScale = computeFolderPressScale(elapsedSec);
        folderRef.current.style.transform = `rotate(${FOLDER_IDLE_TILT_DEG}deg) scale(${folderScale.toFixed(4)})`;
      }

      // 2. Rose-gold paperclip unclip (0.0s - 0.28s)
      if (clipRef.current) {
        const clip = computePaperclipOpenFrame(elapsedSec);
        clipRef.current.style.transform = `translate3d(${clip.txPx.toFixed(2)}px, ${clip.tyPx.toFixed(2)}px, 0) rotate(${clip.rotDeg.toFixed(2)}deg)`;
        clipRef.current.style.opacity = clip.opacity.toFixed(3);
      }

      // 3. Cardstock slide SFX at t = 0.14s
      if (!slideSfxPlayed && elapsedSec >= 0.14) {
        slideSfxPlayed = true;
        soundEngine.playCardstockSlide();
      }

      // 4. Front pocket flap 3D hinge (0.06s - 0.42s -> relaxes behind card in Phase B)
      if (flapRef.current) {
        const flap = computeFrontFlapOpenFrame(elapsedSec);
        flapRef.current.style.transform = `perspective(1000px) rotateX(${flap.rotateXDeg.toFixed(2)}deg)`;
        flapRef.current.style.opacity = flap.opacity.toFixed(3);
      }

      // 5. Stage 3 Ink Stamp impact + physical card micro-recoil (0.84s - 1.12s)
      const stamp = computeStampImpactFrame(elapsedSec);
      if (!stampSfxPlayed && elapsedSec >= STAMP_IMPACT_SEC) {
        stampSfxPlayed = true;
        soundEngine.playCaseStampImpact();
        haptics.caseStamp();
        setShowStampSparkles(true);
        bgMusicPlayer.endCaseFileOpen();
        sparkleTimerRef.current = window.setTimeout(() => {
          sparkleTimerRef.current = null;
          setShowStampSparkles(false);
        }, 980);
      }

      if (stampRef.current) {
        stampRef.current.style.transform = `scale(${stamp.scale.toFixed(4)}) rotate(${stamp.rotateDeg}deg)`;
        stampRef.current.style.opacity = stamp.opacity.toFixed(3);
      }

      // 6. Stage 2 Evidence Card Two-Phase Pull-Out & Front Lay-Down
      if (cardRef.current) {
        if (elapsedSec < CARD_PULL_START_SEC) {
          cardRef.current.style.zIndex = '10';
          cardRef.current.style.transform = `translate3d(0, 0px, 0) scale(${CARD_IDLE_SCALE}) rotate(${CARD_IDLE_ROT_DEG}deg)`;
        } else if (elapsedSec < CARD_Z_SWAP_SEC) {
          // Phase A (0.16s - 0.48s): smooth upward glide out of pocket clearing lip completely
          const p = easeOutCubic(
            clamp01((elapsedSec - CARD_PULL_START_SEC) / (CARD_Z_SWAP_SEC - CARD_PULL_START_SEC)),
          );
          const yPx = lerp(0, peakLiftYPx, p);
          const sc = lerp(CARD_IDLE_SCALE, CARD_PEAK_SCALE, p);
          const rot = lerp(CARD_IDLE_ROT_DEG, CARD_PEAK_ROT_DEG, p);
          cardRef.current.style.zIndex = '10';
          cardRef.current.style.transform = `translate3d(0, ${yPx.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        } else {
          // Phase B (0.48s+): exact Z-index swap in front of front flap + damped harmonic spring lay-down
          if (!zSwapped) {
            zSwapped = true;
            cardRef.current.style.zIndex = '30';
            springY = { value: peakLiftYPx, velocity: 90 };
            springScale = { value: CARD_PEAK_SCALE, velocity: 0 };
            springRot = { value: CARD_PEAK_ROT_DEG, velocity: 0 };
          } else {
            springY = stepSpring(springY, CARD_OPEN_Y_PX, dtSec, CARD_SPRING_CONFIG);
            springScale = stepSpring(springScale, CARD_OPEN_SCALE, dtSec, CARD_SPRING_CONFIG);
            springRot = stepSpring(springRot, CARD_OPEN_ROT_DEG, dtSec, CARD_SPRING_CONFIG);
          }

          const finalY = springY.value + stamp.cardRecoilYPx;
          cardRef.current.style.transform = `translate3d(0, ${finalY.toFixed(2)}px, 0) scale(${springScale.value.toFixed(4)}) rotate(${springRot.value.toFixed(2)}deg)`;
        }
      }

      const settled =
        elapsedSec >= OPEN_COMPLETE_SEC &&
        isSpringSettled(springY, CARD_OPEN_Y_PX, 0.25, 0.45) &&
        isSpringSettled(springScale, CARD_OPEN_SCALE, 0.002, 0.01) &&
        isSpringSettled(springRot, CARD_OPEN_ROT_DEG, 0.05, 0.15);

      if (settled || elapsedSec >= 1.65) {
        rafIdRef.current = null;
        applyOpenPose();
        if (!stampSfxPlayed) {
          soundEngine.playCaseStampImpact();
          haptics.caseStamp();
          bgMusicPlayer.endCaseFileOpen();
        }
        setPhaseSync('open');
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  }, [applyOpenPose, cancelAnimationLoop, setPhaseSync]);

  const handleTuckBack = useCallback(() => {
    if (phaseRef.current !== 'open') return;
    trackEvent('case_file_tucked_back', 'Case File #0721 Tuck Back');
    cancelAnimationLoop();
    setIsZoomed(false);
    setShowStampSparkles(false);
    setPhaseSync('closing');

    haptics.tap();
    soundEngine.playCardstockSlide();

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      applyClosedPose();
      soundEngine.playPaperclipUnclip();
      setPhaseSync('closed');
      return;
    }

    const startTs = performance.now();
    const cardHeightPx = cardRef.current?.offsetHeight || 306;
    const peakLiftYPx = -Math.round(cardHeightPx * 1.04);
    let zRestored = false;
    let clipSfxPlayed = false;

    const tick = (now: number) => {
      const elapsedSec = (now - startTs) / 1000;

      // 1. Fade ink stamp out smoothly at the start of tuck-back
      if (stampRef.current) {
        const stampFade = 1 - easeOutCubic(clamp01(elapsedSec / 0.16));
        stampRef.current.style.opacity = (0.92 * stampFade).toFixed(3);
      }

      // 2. Card lifts above pocket lip -> swaps z-index behind flap -> slides cleanly inside
      if (cardRef.current) {
        if (elapsedSec < CLOSE_LIFT_END_SEC) {
          const p = easeInOutCubic(clamp01(elapsedSec / CLOSE_LIFT_END_SEC));
          const yPx = lerp(CARD_OPEN_Y_PX, peakLiftYPx, p);
          const sc = lerp(CARD_OPEN_SCALE, 1.02, p);
          const rot = lerp(CARD_OPEN_ROT_DEG, 1.6, p);
          cardRef.current.style.zIndex = '30';
          cardRef.current.style.transform = `translate3d(0, ${yPx.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        } else {
          if (!zRestored) {
            zRestored = true;
            cardRef.current.style.zIndex = '10';
          }
          const p = easeInOutCubic(
            clamp01((elapsedSec - CLOSE_LIFT_END_SEC) / (CLOSE_TUCK_END_SEC - CLOSE_LIFT_END_SEC)),
          );
          const yPx = lerp(peakLiftYPx, 0, p);
          const sc = lerp(1.02, CARD_IDLE_SCALE, p);
          const rot = lerp(1.6, CARD_IDLE_ROT_DEG, p);
          cardRef.current.style.transform = `translate3d(0, ${yPx.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
        }
      }

      // 3. Front pocket flap hinges open briefly to receive card, then closes flat
      if (flapRef.current) {
        if (elapsedSec < CLOSE_LIFT_END_SEC) {
          const p = easeOutCubic(clamp01(elapsedSec / CLOSE_LIFT_END_SEC));
          flapRef.current.style.transform = `perspective(1000px) rotateX(${lerp(-6, -20, p).toFixed(2)}deg)`;
          flapRef.current.style.opacity = lerp(0.82, 1, p).toFixed(3);
        } else {
          const p = easeOutCubic(
            clamp01((elapsedSec - CLOSE_LIFT_END_SEC) / (CLOSE_TUCK_END_SEC - CLOSE_LIFT_END_SEC)),
          );
          flapRef.current.style.transform = `perspective(1000px) rotateX(${lerp(-20, 0, p).toFixed(2)}deg)`;
          flapRef.current.style.opacity = '1';
        }
      }

      // 4. Metallic rose-gold paperclip snaps back onto the top-right edge
      if (clipRef.current) {
        if (elapsedSec < CLOSE_TUCK_END_SEC) {
          clipRef.current.style.opacity = '0';
        } else {
          if (!clipSfxPlayed) {
            clipSfxPlayed = true;
            soundEngine.playPaperclipUnclip();
          }
          const p = easeOutCubic(
            clamp01((elapsedSec - CLOSE_TUCK_END_SEC) / (CLOSE_CLIP_END_SEC - CLOSE_TUCK_END_SEC)),
          );
          clipRef.current.style.transform = `translate3d(${lerp(16, 0, p).toFixed(2)}px, ${lerp(-24, 0, p).toFixed(2)}px, 0) rotate(${lerp(28, 0, p).toFixed(2)}deg)`;
          clipRef.current.style.opacity = p.toFixed(3);
        }
      }

      if (elapsedSec >= CLOSE_CLIP_END_SEC) {
        rafIdRef.current = null;
        applyClosedPose();
        setPhaseSync('closed');
        return;
      }

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    rafIdRef.current = window.requestAnimationFrame(tick);
  }, [applyClosedPose, cancelAnimationLoop, setPhaseSync]);

  const handleOpenZoom = useCallback(() => {
    if (phaseRef.current !== 'open') return;
    haptics.tap();
    trackEvent('case_file_zoomed', 'Case File #0721 Receipt Lightbox');
    soundEngine.playBubbleClick(1.06);
    setIsZoomed(true);
  }, []);

  const handleCloseZoom = useCallback(() => {
    haptics.tap();
    soundEngine.playBubbleClick(0.92);
    setIsZoomed(false);
  }, []);

  const isAnimating = phase === 'opening' || phase === 'closing';
  const willChangeClass = isAnimating ? 'will-change-[transform,opacity]' : '';

  return (
    <section
      id="case-file"
      data-testid="case-file-section"
      data-folder-phase={phase}
      className="cv-auto-section relative z-[2] scroll-mt-16 bg-transparent py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FCE7F0] px-3.5 py-1 text-xs font-bold tracking-[0.08em] text-[#D94B7D]">
            <span>📂 ARCHIVE &bull; 21 JULY &bull; 12:29 AM</span>
          </span>

          <h2 className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight text-[#3A1233] sm:text-4xl">
            Where All This Started
          </h2>

          <p className="mt-2 text-sm font-medium text-[#7A4A63] sm:text-base">
            Yes, I messaged first at 12:29 AM, and yes, I still kept the receipt.
          </p>
        </div>

        {/* Centered Tactile Pastel Evidence Folder Stage */}
        <div className="mt-10 flex flex-col items-center sm:mt-12">
          <div
            className="relative mx-auto overflow-visible"
            style={{
              width: 'min(90vw, 370px)',
              height: '364px',
              perspective: '1000px',
            }}
          >
            {/* Unified Folder Assembly (idle tilt -1.2deg, tactile press scale, strict 2D z-index isolation) */}
            <div
              ref={folderRef}
              data-testid="case-file-folder"
              className={`relative h-full w-full ${willChangeClass}`}
              style={{
                isolation: 'isolate',
                transform: `rotate(${FOLDER_IDLE_TILT_DEG}deg) scale(1)`,
              }}
            >
              {/* 1. Back Folder Panel & Top-Left Index Tab ("CASE #0721") */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 bottom-0"
              >
                {/* Top-Left Index Tab */}
                <div
                  className="absolute top-0 left-0 flex h-[34px] w-[144px] items-center justify-center rounded-t-[14px] border border-b-0 border-[rgba(217,75,125,0.22)] px-3"
                  style={{
                    background: 'linear-gradient(160deg, #F5CBDC 0%, #ECBACD 100%)',
                  }}
                >
                  <span className="font-mono text-[11px] font-bold tracking-[0.11em] text-[#3A1233]">
                    CASE #0721
                  </span>
                </div>

                {/* Back Folder Cardstock Body */}
                <div
                  className="absolute inset-x-0 top-[28px] bottom-0 rounded-[18px] rounded-tl-none border border-[rgba(217,75,125,0.22)] shadow-[0_22px_46px_-22px_rgba(58,18,51,0.3)]"
                  style={{
                    background: 'linear-gradient(160deg, #F4C7D8 0%, #E7B1C6 100%)',
                  }}
                >
                  {/* Subtle inner pocket shadow along the cavity behind the card */}
                  <div
                    className="absolute inset-x-2 top-[72px] bottom-2 rounded-[14px]"
                    style={{
                      boxShadow: 'inset 0 10px 18px -8px rgba(58, 18, 51, 0.18)',
                    }}
                  />
                </div>
              </div>

              {/* 2. Inner Screenshot Evidence Card (Polaroid / Archival Mount) */}
              <div
                ref={cardRef}
                data-testid="case-file-card"
                className={`absolute right-[14px] left-[14px] top-[46px] ${willChangeClass}`}
                style={{
                  zIndex: 10,
                  transform: `translate3d(0, 0px, 0) scale(${CARD_IDLE_SCALE}) rotate(${CARD_IDLE_ROT_DEG}deg)`,
                }}
              >
                {/* Outer border sparkle glints on Stage 3 stamp impact */}
                {showStampSparkles && (
                  <div className="pointer-events-none absolute inset-0 z-40" aria-hidden="true">
                    {OUTER_CARD_SPARKLES.map((sp, idx) => (
                      <SparkleStarSvg
                        key={idx}
                        className={`animate-theatre-glint absolute ${sp.pos} ${sp.size} ${sp.color}`}
                        style={{ animationDelay: sp.delay }}
                      />
                    ))}
                  </div>
                )}

                <div
                  className="relative rounded-[14px] border border-[#F0D4DF] bg-white shadow-[0_18px_36px_-18px_rgba(58,18,51,0.28),0_4px_10px_-4px_rgba(58,18,51,0.08)]"
                  style={{ padding: '10px 10px 44px 10px' }}
                >
                  {/* Top-Right VERIFIED • 21 JULY Ink Stamp (impacts at Stage 3) */}
                  <div
                    ref={stampRef}
                    data-testid="case-file-stamp"
                    aria-hidden={phase !== 'open'}
                    className={`pointer-events-none absolute top-3.5 right-3.5 z-30 select-none rounded-md border-[2px] border-[#D94B7D] bg-[#FFF6F9]/92 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.1em] text-[#D94B7D] shadow-xs ${willChangeClass}`}
                    style={{
                      opacity: 0,
                      transform: 'scale(2.1) rotate(-11deg)',
                    }}
                  >
                    VERIFIED &bull; 21 JULY
                  </div>

                  {/* Interactive Tap-to-Zoom button wrapping the archival image */}
                  <button
                    type="button"
                    data-testid="case-file-zoom-btn"
                    onClick={handleOpenZoom}
                    disabled={phase !== 'open'}
                    tabIndex={phase === 'open' ? 0 : -1}
                    aria-label="Open full-screen view of 21 July 12:29 AM first-text chat receipt"
                    className={`group relative block w-full overflow-hidden rounded-[8px] border border-[rgba(58,18,51,0.08)] bg-[#FFF8FB] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
                      phase === 'open' ? 'cursor-zoom-in' : 'pointer-events-none'
                    }`}
                  >
                    {!imgFailed ? (
                      <img
                        src={RECEIPT_IMG_SRC}
                        alt="First Instagram message screenshot from 21 July 2026 at 12:29 AM"
                        width={720}
                        height={960}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() => setImgFailed(true)}
                        className="block h-[238px] w-full max-h-[360px] object-cover object-top transition-transform duration-200 group-hover:scale-[1.015]"
                      />
                    ) : (
                      /* Clean archival fallback */
                      <div
                        data-testid="case-file-fallback"
                        className="flex h-[238px] w-full flex-col items-center justify-center bg-gradient-to-b from-[#FFF7FA] to-[#FCE9F1] px-5 text-center"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#F0C6D8] bg-white text-lg shadow-xs">
                          💬
                        </div>
                        <p className="mt-3 font-mono text-[11px] font-bold tracking-[0.1em] text-[#D94B7D]">
                          EXHIBIT A &bull; 21 JULY 2026 &bull; 12:29 AM
                        </p>
                        <p className="mt-1.5 max-w-[230px] text-xs leading-relaxed font-medium text-[#6B3B64]">
                          First text chat receipt archived in{' '}
                          <span className="font-semibold text-[#3A1233]">Case #0721</span>.
                        </p>
                      </div>
                    )}
                  </button>

                  {/* White bottom archival margin caption + subtle zoom hint */}
                  <div className="absolute right-[10px] bottom-[5px] left-[10px] flex flex-col items-center text-center">
                    <p className="text-[10.5px] leading-tight font-semibold tracking-tight text-[#3A1233]">
                      21 July, 12:29 AM &middot; Exhibit A. Technically I texted first, no regrets.
                    </p>
                    <span
                      className={`mt-0.5 text-[10px] leading-none font-semibold text-[#D94B7D] transition-opacity duration-200 ${
                        phase === 'open' ? 'opacity-90' : 'opacity-0'
                      }`}
                    >
                      Tap image to zoom 🔍
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Front Pocket Flap (3D Hinge along bottom crease, z-index 20) */}
              <div
                ref={flapRef}
                data-testid="case-file-flap"
                className={`absolute inset-x-0 bottom-0 h-[256px] ${
                  phase === 'open' ? 'pointer-events-none' : ''
                } ${willChangeClass}`}
                style={{
                  zIndex: 20,
                  transformOrigin: 'bottom center',
                  transform: 'perspective(1000px) rotateX(0deg)',
                  opacity: 1,
                }}
              >
                {/* Curved thumb-notch cardstock SVG */}
                <FrontPocketCardstockSvg />

                {/* Inner pocket shadow rim along bottom/edges */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[18px]"
                  style={{
                    boxShadow: 'inset 0 8px 14px -8px rgba(58, 18, 51, 0.16)',
                  }}
                />

                {/* Front Flap Details: Dashed Label Box + Tilted OFFICIAL PROOF Stamp + Pulsing Open Pill */}
                <div className="relative z-10 flex h-full flex-col justify-between px-5 pt-9 pb-5">
                  <div className="flex items-start justify-between gap-2">
                    {/* Dashed Deep Plum archival label box */}
                    <div className="rounded-lg border border-dashed border-[rgba(58,18,51,0.25)] bg-[#FFF8FB]/60 px-2.5 py-2 text-left">
                      <p className="font-mono text-[10px] leading-tight font-bold tracking-[0.06em] text-[#3A1233]">
                        DATE: 21 JULY &bull; 12:29 AM
                      </p>
                      <p className="mt-1 font-mono text-[9.5px] leading-tight font-semibold tracking-[0.05em] text-[#6B3B64]">
                        STATUS: CLASSIFIED RECEIPT
                      </p>
                    </div>

                    {/* Tilted (-7deg) Warm Rose Berry rubber-stamp outline */}
                    <div
                      aria-hidden="true"
                      className="mt-1 shrink-0 rounded-md border-[1.8px] border-[#D94B7D] px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-[0.1em] text-[#D94B7D] opacity-85"
                      style={{ transform: 'rotate(-7deg)' }}
                    >
                      OFFICIAL PROOF
                    </div>
                  </div>

                  {/* Centered Pulsing CTA Pill (interactive trigger when closed) */}
                  <div className="flex justify-center pb-2">
                    <button
                      type="button"
                      data-testid="case-file-open-btn"
                      onClick={handleOpenFolder}
                      disabled={phase !== 'closed'}
                      aria-expanded={phase === 'open'}
                      className={`relative inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#D94B7D] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_-8px_rgba(217,75,125,0.65)] transition-[transform,opacity,background-color] duration-200 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A1233] ${
                        phase === 'closed'
                          ? 'cursor-pointer opacity-100 hover:bg-[#C63D6E] active:scale-[0.97]'
                          : 'pointer-events-none opacity-0'
                      }`}
                    >
                      {phase === 'closed' && (
                        <span
                          aria-hidden="true"
                          className="animate-theatre-sound-pulse pointer-events-none absolute inset-0 rounded-full border-2 border-[#D94B7D]"
                        />
                      )}
                      <span className="relative z-10">Tap to open receipt 📂</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Metallic Rose-Gold Paperclip (pinned near top-right edge of front flap) */}
              <div
                ref={clipRef}
                data-testid="case-file-paperclip"
                aria-hidden="true"
                className={`pointer-events-none absolute top-[88px] right-[26px] ${willChangeClass}`}
                style={{
                  zIndex: 35,
                  transform: 'translate3d(0, 0, 0) rotate(0deg)',
                  opacity: 1,
                }}
              >
                <RoseGoldPaperclipSvg className="h-[54px] w-[26px]" />
              </div>
            </div>
          </div>

          {/* Replay / Tuck Back Control + Live "Days Since" Counter Pill */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex min-h-[32px] items-center justify-center">
              <button
                type="button"
                data-testid="case-file-tuck-btn"
                onClick={handleTuckBack}
                disabled={phase !== 'open'}
                aria-hidden={phase !== 'open'}
                tabIndex={phase === 'open' ? 0 : -1}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold text-[#7A4A63] transition-opacity duration-300 hover:text-[#3A1233] hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94B7D] ${
                  phase === 'open'
                    ? 'cursor-pointer opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
              >
                Tuck back into folder &#x21A9;
              </button>
            </div>

            {/* Live Rose-Cream Day Counter Pill */}
            <div
              data-testid="case-file-days-pill"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#F0D0DF] bg-[#FFFDF9] px-4 py-1.5 text-xs font-semibold tabular-nums text-[#5C2D4F] shadow-[0_6px_18px_-12px_rgba(58,18,51,0.22)]"
            >
              <span>{daysLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Tap-to-Zoom Lightbox (portaled to document.body at z-index: 9500 above TopBar & floating button) */}
      {isZoomed &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Full-screen view of 21 July 12:29 AM first-text screenshot"
            data-testid="case-file-lightbox"
            onClick={handleCloseZoom}
            className="animate-pop-in fixed inset-0 z-[9500] flex flex-col items-center justify-center p-4 sm:p-6"
            style={{ backgroundColor: 'rgba(58, 18, 51, 0.86)' }}
          >
            {/* Top-Right Rose-Cream Close Pill */}
            <button
              type="button"
              data-testid="case-file-lightbox-close"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseZoom();
              }}
              className="fixed top-4 right-4 z-[9510] inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-[#F2C3D8] bg-[#FFF6F9] px-4 py-2 text-xs font-bold text-[#3A1233] shadow-lg transition-transform duration-150 hover:bg-[#FFE6F0] active:scale-95 cursor-pointer sm:top-6 sm:right-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF6F9]"
            >
              Close &#x2715;
            </button>

            {/* Uncropped Lightbox Media Container */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative flex flex-col items-center"
            >
              {!imgFailed ? (
                <img
                  src={RECEIPT_IMG_SRC}
                  alt="Full uncropped 21 July 12:29 AM first-text chat screenshot"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="block rounded-[14px] border border-[#FFF6F9]/20 bg-[#1B0918] shadow-2xl"
                  style={{
                    maxWidth: '94vw',
                    maxHeight: '82vh',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div className="flex w-[min(90vw,360px)] flex-col items-center rounded-[14px] border border-[#F0D4DF] bg-[#FFF6F9] px-6 py-10 text-center shadow-2xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#F0C6D8] bg-white text-2xl">
                    💬
                  </div>
                  <p className="mt-4 font-mono text-xs font-bold tracking-[0.1em] text-[#D94B7D]">
                    CASE #0721 &bull; 21 JULY 2026 &bull; 12:29 AM
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#5C2D4F]">
                    Exhibit A &middot; First text screenshot from 12:29 AM.
                  </p>
                </div>
              )}

              <p className="mt-3 text-center text-xs font-medium text-[#FCE7F0]/90">
                21 July, 12:29 AM &middot; Exhibit A. Technically I texted first, no regrets.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
