import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { trackEvent } from '../utils/analytics';
import {
  CHIBI_TIMING,
  FOOTER_INTERSECTION_ROOT_MARGIN,
  FOOTER_INTERSECTION_THRESHOLD,
  computeFooterChibiPose,
  computeScrollAdvanceDirection,
  shouldAutoPlayFooterChibi,
  type ChibiPose,
  type ChibiStage,
  type ScrollAdvanceDirection,
} from '../utils/footerChibiChoreography';
import { haptics } from '../utils/haptics';
import { emitModinoEvent } from '../utils/modinoBus';
import { soundEngine } from '../utils/soundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Handcrafted Closing Sign-Off Footer featuring two outline-free soft-pastel
 * storybook chibi best friends (Boy `adinomide` + Girl `Anamika / Morgan`)
 * performing a smooth 60fps handshake followed by a warm platonic hug,
 * finished cleanly with "Created by adinomide".
 */
interface ClosingSignOffFooterProps {
  isSiteRevealed?: boolean;
}

export function ClosingSignOffFooter({ isSiteRevealed = true }: ClosingSignOffFooterProps = {}) {
  const uid = useId().replace(/:/g, '');
  const footerRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(footerRef, { enabled: isSiteRevealed });
  const stageRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const hasAutoPlayedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Ref-only scroll-direction & visibility state (zero React re-renders on scroll)
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<ScrollAdvanceDirection>('idle');
  const isFooterWellInViewRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Direct-DOM SVG rig refs (60fps GPU-composited transforms & opacity, zero per-frame React renders)
  const boyShadowRef = useRef<SVGEllipseElement | null>(null);
  const girlShadowRef = useRef<SVGEllipseElement | null>(null);
  const mergedShadowRef = useRef<SVGEllipseElement | null>(null);

  const boyBackLayerRef = useRef<SVGGElement | null>(null);
  const boyFarArmRef = useRef<SVGGElement | null>(null);
  const girlBackLayerRef = useRef<SVGGElement | null>(null);
  const girlBackHairRef = useRef<SVGGElement | null>(null);
  const girlFarArmRef = useRef<SVGGElement | null>(null);

  const boyBodyLayerRef = useRef<SVGGElement | null>(null);
  const girlBodyLayerRef = useRef<SVGGElement | null>(null);

  const boyHeadLayerRef = useRef<SVGGElement | null>(null);
  const boyHeadPivotRef = useRef<SVGGElement | null>(null);
  const boyOpenEyesRef = useRef<SVGGElement | null>(null);
  const boyHugEyesRef = useRef<SVGGElement | null>(null);

  const girlHeadLayerRef = useRef<SVGGElement | null>(null);
  const girlHeadPivotRef = useRef<SVGGElement | null>(null);
  const girlOpenEyesRef = useRef<SVGGElement | null>(null);
  const girlHugEyesRef = useRef<SVGGElement | null>(null);

  const girlFrontLayerRef = useRef<SVGGElement | null>(null);
  const girlFrontArmRef = useRef<SVGGElement | null>(null);
  const claspOverlapRef = useRef<SVGGElement | null>(null);
  const boyFrontLayerRef = useRef<SVGGElement | null>(null);
  const boyFrontArmRef = useRef<SVGGElement | null>(null);

  const handshakeTicksRef = useRef<SVGGElement | null>(null);
  const hugParticle1Ref = useRef<SVGGElement | null>(null);
  const hugParticle2Ref = useRef<SVGGElement | null>(null);
  const hugParticle3Ref = useRef<SVGGElement | null>(null);
  const hugParticle4Ref = useRef<SVGGElement | null>(null);

  const [isIdleBreathing, setIsIdleBreathing] = useState(false);
  const [activeStage, setActiveStage] = useState<ChibiStage>('ready');
  const lastStageRef = useRef<ChibiStage>('ready');

  const applyPoseToDom = useCallback((pose: ChibiPose) => {
    const boyPos = `translate3d(${pose.boyShiftX.toFixed(2)}px, ${pose.boyBounceY.toFixed(2)}px, 0)`;
    const girlPos = `translate3d(${pose.girlShiftX.toFixed(2)}px, ${pose.girlBounceY.toFixed(2)}px, 0)`;

    // Layer 1: Ground shadows smoothly glide inward and merge into one wider oval during the hug
    const splitShadowOpacity = Math.max(0, 1 - pose.shadowMerge01 * 1.15);
    if (boyShadowRef.current) {
      boyShadowRef.current.style.transform = `translate3d(${pose.boyShiftX.toFixed(2)}px, 0, 0)`;
      boyShadowRef.current.style.opacity = splitShadowOpacity.toFixed(3);
    }
    if (girlShadowRef.current) {
      girlShadowRef.current.style.transform = `translate3d(${pose.girlShiftX.toFixed(2)}px, 0, 0)`;
      girlShadowRef.current.style.opacity = splitShadowOpacity.toFixed(3);
    }
    if (mergedShadowRef.current) {
      mergedShadowRef.current.style.opacity = pose.shadowMerge01.toFixed(3);
      const mergeScaleX = 0.86 + 0.14 * pose.shadowMerge01;
      mergedShadowRef.current.style.transform = `scaleX(${mergeScaleX.toFixed(3)})`;
    }

    // Layer 2: Back hair & far arms
    if (boyBackLayerRef.current) boyBackLayerRef.current.style.transform = boyPos;
    if (boyFarArmRef.current) {
      boyFarArmRef.current.style.transform = `rotate(${pose.boyFarArmDeg.toFixed(2)}deg)`;
    }
    if (girlBackLayerRef.current) girlBackLayerRef.current.style.transform = girlPos;
    if (girlBackHairRef.current) {
      girlBackHairRef.current.style.transform = `rotate(${pose.girlBackHairDeg.toFixed(2)}deg)`;
    }
    if (girlFarArmRef.current) {
      girlFarArmRef.current.style.transform = `rotate(${pose.girlFarArmDeg.toFixed(2)}deg)`;
    }

    // Layer 3: Legs & torsos
    if (boyBodyLayerRef.current) boyBodyLayerRef.current.style.transform = boyPos;
    if (girlBodyLayerRef.current) girlBodyLayerRef.current.style.transform = girlPos;

    // Layer 4: Heads & crossfading facial expressions
    if (boyHeadLayerRef.current) boyHeadLayerRef.current.style.transform = boyPos;
    if (boyHeadPivotRef.current) {
      boyHeadPivotRef.current.style.transform = `rotate(${pose.boyHeadDeg.toFixed(2)}deg)`;
    }
    if (boyOpenEyesRef.current) boyOpenEyesRef.current.style.opacity = pose.openEyesOpacity.toFixed(3);
    if (boyHugEyesRef.current) boyHugEyesRef.current.style.opacity = pose.hugEyesOpacity.toFixed(3);

    if (girlHeadLayerRef.current) girlHeadLayerRef.current.style.transform = girlPos;
    if (girlHeadPivotRef.current) {
      girlHeadPivotRef.current.style.transform = `rotate(${pose.girlHeadDeg.toFixed(2)}deg)`;
    }
    if (girlOpenEyesRef.current) {
      girlOpenEyesRef.current.style.opacity = pose.openEyesOpacity.toFixed(3);
    }
    if (girlHugEyesRef.current) {
      girlHugEyesRef.current.style.opacity = pose.hugEyesOpacity.toFixed(3);
    }

    // Layer 5: Front arms & handshake clasp overlap
    if (girlFrontLayerRef.current) girlFrontLayerRef.current.style.transform = girlPos;
    if (girlFrontArmRef.current) {
      girlFrontArmRef.current.style.transform = `rotate(${pose.girlFrontArmDeg.toFixed(2)}deg)`;
    }
    if (claspOverlapRef.current) {
      claspOverlapRef.current.style.opacity = pose.claspOverlapOpacity.toFixed(3);
      claspOverlapRef.current.style.transform = `translate3d(0, ${pose.claspOverlapOffsetY.toFixed(2)}px, 0)`;
    }
    if (boyFrontLayerRef.current) boyFrontLayerRef.current.style.transform = boyPos;
    if (boyFrontArmRef.current) {
      boyFrontArmRef.current.style.transform = `rotate(${pose.boyFrontArmDeg.toFixed(2)}deg)`;
    }

    // Layer 6: Micro-particles (handshake ticks + rising pastel hug stars & dots)
    if (handshakeTicksRef.current) {
      handshakeTicksRef.current.style.opacity = pose.handshakeTicksOpacity.toFixed(3);
      handshakeTicksRef.current.style.transform = `scale(${pose.handshakeTicksScale.toFixed(3)})`;
    }

    const hp = pose.hugParticlesProgress01;
    const ho = pose.hugParticlesOpacity;
    if (hugParticle1Ref.current) {
      hugParticle1Ref.current.style.opacity = ho.toFixed(3);
      hugParticle1Ref.current.style.transform = `translate3d(${(-9 * hp).toFixed(2)}px, ${(-22 * hp).toFixed(2)}px, 0) scale(${(0.7 + 0.35 * Math.sin(hp * Math.PI)).toFixed(3)})`;
    }
    if (hugParticle2Ref.current) {
      hugParticle2Ref.current.style.opacity = (ho * 0.92).toFixed(3);
      hugParticle2Ref.current.style.transform = `translate3d(${(2 * hp).toFixed(2)}px, ${(-18 * hp).toFixed(2)}px, 0) scale(${(0.75 + 0.3 * hp).toFixed(3)})`;
    }
    if (hugParticle3Ref.current) {
      hugParticle3Ref.current.style.opacity = ho.toFixed(3);
      hugParticle3Ref.current.style.transform = `translate3d(${(9 * hp).toFixed(2)}px, ${(-22 * hp).toFixed(2)}px, 0) scale(${(0.68 + 0.38 * Math.sin(hp * Math.PI)).toFixed(3)})`;
    }
    if (hugParticle4Ref.current) {
      hugParticle4Ref.current.style.opacity = (ho * 0.88).toFixed(3);
      hugParticle4Ref.current.style.transform = `translate3d(${(7 * hp).toFixed(2)}px, ${(-18 * hp).toFixed(2)}px, 0) scale(${(0.7 + 0.28 * hp).toFixed(3)})`;
    }

    if (pose.stage !== lastStageRef.current) {
      lastStageRef.current = pose.stage;
      setActiveStage(pose.stage);
    }
  }, []);

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animStartRef.current = null;
  }, []);

  const playChoreography = useCallback(() => {
    stopAnimationLoop();

    if (reducedMotionRef.current) {
      setIsIdleBreathing(false);
      applyPoseToDom(computeFooterChibiPose(CHIBI_TIMING.totalDurationMs, true));
      return;
    }

    setIsIdleBreathing(false);
    applyPoseToDom(computeFooterChibiPose(0, false));

    const step = (now: number) => {
      if (animStartRef.current === null) {
        animStartRef.current = now;
      }
      const elapsed = now - animStartRef.current;
      const pose = computeFooterChibiPose(elapsed, false);
      applyPoseToDom(pose);

      if (elapsed >= CHIBI_TIMING.totalDurationMs) {
        rafRef.current = null;
        setIsIdleBreathing(true);
        return;
      }

      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);
  }, [applyPoseToDom, stopAnimationLoop]);

  // Initial pose setup + strict scroll-direction & viewport-threshold gate so Chicken Farm never fires the footer early
  useEffect(() => {
    if (!isSiteRevealed) return;
    reducedMotionRef.current = prefersReducedMotionNow();

    if (reducedMotionRef.current) {
      applyPoseToDom(computeFooterChibiPose(CHIBI_TIMING.totalDurationMs, true));
      return () => {
        stopAnimationLoop();
      };
    }

    // Set initial ready pose (24px apart) before scrolling into view
    applyPoseToDom(computeFooterChibiPose(0, false));

    const footerEl = footerRef.current;
    if (!footerEl || typeof IntersectionObserver === 'undefined') {
      hasAutoPlayedRef.current = true;
      playChoreography();
      return () => {
        stopAnimationLoop();
      };
    }

    lastScrollYRef.current = window.scrollY;
    scrollDirectionRef.current = 'idle';
    isFooterWellInViewRef.current = false;

    let observer: IntersectionObserver | null = null;
    let scrollListenerAttached = false;

    const detachAutoPlayWatchers = () => {
      if (scrollListenerAttached) {
        window.removeEventListener('scroll', handleScroll);
        scrollListenerAttached = false;
      }
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      observer?.disconnect();
      observer = null;
    };

    const tryTriggerAutoPlay = () => {
      if (hasAutoPlayedRef.current) {
        detachAutoPlayWatchers();
        return;
      }
      const rect = footerEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 0;
      const isFooterVisibleAtAll = rect.top < viewportHeight && rect.bottom > 0;
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
      );
      const distanceFromBottomPx = Math.max(0, scrollHeight - (window.scrollY + viewportHeight));

      if (
        shouldAutoPlayFooterChibi({
          hasAutoPlayed: hasAutoPlayedRef.current,
          isSiteRevealed,
          isFooterWellInView: isFooterWellInViewRef.current,
          isFooterVisibleAtAll,
          distanceFromBottomPx,
          scrollDirection: scrollDirectionRef.current,
        })
      ) {
        hasAutoPlayedRef.current = true;
        detachAutoPlayWatchers();
        playChoreography();
      }
    };

    const handleScroll = () => {
      if (hasAutoPlayedRef.current) {
        detachAutoPlayWatchers();
        return;
      }
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const currentY = window.scrollY;
        scrollDirectionRef.current = computeScrollAdvanceDirection(
          currentY,
          lastScrollYRef.current,
          scrollDirectionRef.current,
        );
        lastScrollYRef.current = currentY;
        tryTriggerAutoPlay();
      });
    };

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isFooterWellInViewRef.current =
            entry.isIntersecting && entry.intersectionRatio >= FOOTER_INTERSECTION_THRESHOLD;
        }
        tryTriggerAutoPlay();
      },
      {
        threshold: [0, FOOTER_INTERSECTION_THRESHOLD, 0.75],
        rootMargin: FOOTER_INTERSECTION_ROOT_MARGIN,
      },
    );

    observer.observe(footerEl);

    if (!hasAutoPlayedRef.current) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      scrollListenerAttached = true;
    }

    return () => {
      detachAutoPlayWatchers();
      stopAnimationLoop();
    };
  }, [applyPoseToDom, isSiteRevealed, playChoreography, stopAnimationLoop]);

  const handleReplayTap = useCallback(() => {
    hasAutoPlayedRef.current = true;
    try {
      haptics.footerChibiReplay();
    } catch {
      // silent fallback
    }
    try {
      soundEngine.playPastelMarimbaChime();
    } catch {
      // silent fallback
    }
    trackEvent('footer_finale_replayed', 'Footer Characters');
    emitModinoEvent('ending', { force: true });
    playChoreography();
  }, [playChoreography]);

  return (
    <footer
      ref={footerRef}
      id="closing-signoff"
      data-testid="closing-signoff-footer"
      data-animations-active={String(animationsActive)}
      className={`cv-auto-section relative z-[2] bg-transparent ${
        animationsActive ? '' : 'anim-paused'
      }`}
      style={{
        padding: '36px 20px 56px 20px',
      }}
    >
      <div
        className="mx-auto text-center"
        style={{
          maxWidth: '380px',
        }}
      >
        {/* Interactive Airy Character Stage (no heavy card box, anchored straight on warm #FFF8FB canvas) */}
        <button
          ref={stageRef}
          type="button"
          data-testid="footer-chibi-stage"
          data-stage={activeStage}
          data-idle-breathing={String(isIdleBreathing)}
          onClick={handleReplayTap}
          aria-label="Replay best friend handshake and hug animation"
          className="group mx-auto inline-flex cursor-pointer flex-col items-center rounded-3xl bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C93B6B]"
        >
          <svg
            viewBox="0 0 260 150"
            role="img"
            aria-label="Two cute soft pastel chibi best friends sharing a handshake and warm friendly hug"
            style={{
              width: 'min(86vw, 300px)',
              height: 'auto',
              overflow: 'visible',
            }}
            className="block select-none"
          >
            <defs>
              {/* Soft elliptical ground stage shadow blur */}
              <filter
                id={`chibi-shadow-${uid}`}
                x="-30%"
                y="-50%"
                width="160%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="2.6" />
              </filter>

              {/* Shared Warm Soft Peach Skin Gradients */}
              <linearGradient id={`skin-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F7D3BE" />
                <stop offset="100%" stopColor="#ECC0A8" />
              </linearGradient>
              <linearGradient id={`skin-shade-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E9BA9F" />
                <stop offset="100%" stopColor="#DFAD93" />
              </linearGradient>

              {/* Deep Espresso Plum Hair Gradient */}
              <linearGradient id={`hair-${uid}`} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#462B3D" />
                <stop offset="55%" stopColor="#382131" />
                <stop offset="100%" stopColor="#2F1B29" />
              </linearGradient>

              {/* Boy — Muted Pastel Lilac Hoodie & Soft Dusty Plum Trousers */}
              <linearGradient id={`hoodie-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E3D7F7" />
                <stop offset="100%" stopColor="#CBBCEB" />
              </linearGradient>
              <linearGradient id={`hoodie-shade-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#D7C8F1" />
                <stop offset="100%" stopColor="#BFAEE4" />
              </linearGradient>
              <linearGradient id={`trousers-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6F5775" />
                <stop offset="100%" stopColor="#5A4460" />
              </linearGradient>
              <linearGradient id={`sneaker-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFDF8" />
                <stop offset="100%" stopColor="#F2E9DE" />
              </linearGradient>

              {/* Girl — Ivory-to-Petal-Blush Festive Kurti, Rose Plum Leggings & Buttercream Flats */}
              <linearGradient id={`kurti-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF8FA" />
                <stop offset="55%" stopColor="#FDEAF2" />
                <stop offset="100%" stopColor="#FADCE9" />
              </linearGradient>
              <linearGradient id={`kurti-shade-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FBE6F0" />
                <stop offset="100%" stopColor="#F3C9DC" />
              </linearGradient>
              <linearGradient id={`leggings-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94607B" />
                <stop offset="100%" stopColor="#8C5873" />
              </linearGradient>
              <linearGradient id={`flats-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#F8E2AE" />
                <stop offset="100%" stopColor="#F5DA9D" />
              </linearGradient>
            </defs>

            {/* ============================================================
                LAYER 1: groundShadow (Two soft rose shadows merging on hug)
                ============================================================ */}
            <g data-layer="groundShadow" filter={`url(#chibi-shadow-${uid})`}>
              <ellipse
                ref={boyShadowRef}
                cx="94"
                cy="141"
                rx="23"
                ry="5"
                fill="rgba(166, 58, 98, 0.11)"
               
              />
              <ellipse
                ref={girlShadowRef}
                cx="164"
                cy="141"
                rx="21"
                ry="4.6"
                fill="rgba(166, 58, 98, 0.11)"
               
              />
              <ellipse
                ref={mergedShadowRef}
                cx="129"
                cy="141"
                rx="46"
                ry="6"
                fill="rgba(166, 58, 98, 0.12)"
                style={{ opacity: 0, transformOrigin: '129px 141px' }}
               
              />
            </g>

            {/* Shared Idle Breathing Wrapper Anchored Strictly at Feet (y = 140) */}
            <g className={isIdleBreathing ? 'animate-chibi-breathe' : undefined}>
              {/* ============================================================
                  LAYER 2: backHair & farArms (Girl backHair + both far arms)
                  ============================================================ */}
              <g data-layer="backHairAndFarArms">
                {/* Boy far-side arm (left side of torso, softly tucked behind hoodie) */}
                <g ref={boyBackLayerRef}>
                  <g
                    ref={boyFarArmRef}
                    style={{ transformOrigin: '80px 85px' }}
                   
                  >
                    <path
                      d="M80 79 C73 82, 70 95, 72 106 C72.8 110, 79.5 110, 81 105 C82.5 96, 84 86, 84 81 Z"
                      fill={`url(#hoodie-shade-${uid})`}
                    />
                    {/* Soft ribbed wrist cuff */}
                    <rect
                      x="71.6"
                      y="102.5"
                      width="9.4"
                      height="3.4"
                      rx="1.7"
                      fill="#EDE4FA"
                    />
                    {/* Rounded warm-peach mitten hand */}
                    <ellipse cx="76.4" cy="108.5" rx="4.5" ry="4.2" fill={`url(#skin-${uid})`} />
                  </g>
                </g>

                {/* Girl flowing backHair sheet + far-side arm */}
                <g ref={girlBackLayerRef}>
                  <g
                    ref={girlBackHairRef}
                    style={{ transformOrigin: '164px 52px' }}
                   
                  >
                    {/* Flowing smooth Deep Espresso Plum backHair behind shoulders */}
                    <path
                      d="M144 54 C140 70, 139 92, 143 106 C150 110, 178 110, 185 106 C189 92, 188 70, 184 54 C180 42, 148 42, 144 54 Z"
                      fill={`url(#hair-${uid})`}
                    />
                    {/* Subtle soft luster curve on lower back hair */}
                    <path
                      d="M148 96 Q164 102 180 96"
                      fill="none"
                      stroke="rgba(255, 238, 246, 0.12)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Girl far-side arm (right side of kurti, tucked neatly behind torso) */}
                  <g
                    ref={girlFarArmRef}
                    style={{ transformOrigin: '176px 90px' }}
                   
                  >
                    <path
                      d="M174 84 C180 87, 183 98, 181 108 C180 111.5, 174 111.5, 172.8 107 C171.6 99, 171 91, 171 86 Z"
                      fill={`url(#kurti-shade-${uid})`}
                    />
                    {/* Minimal champagne-gold cuff glint */}
                    <rect
                      x="172.6"
                      y="105"
                      width="8.4"
                      height="2.2"
                      rx="1.1"
                      fill="#E8C892"
                    />
                    {/* Rounded warm-peach mitten hand */}
                    <ellipse cx="176.8" cy="110.2" rx="4.0" ry="3.8" fill={`url(#skin-${uid})`} />
                  </g>
                </g>
              </g>

              {/* ============================================================
                  LAYER 3: legsAndTorsos (Legs, shoes, softly shaded torsos)
                  ============================================================ */}
              <g data-layer="legsAndTorsos">
                {/* BOY BODY (`adinomide`, 116px total height: y = 24..140) */}
                <g ref={boyBodyLayerRef}>
                  {/* Soft Dusty Plum Trousers */}
                  <rect
                    x="81"
                    y="108"
                    width="11.2"
                    height="25"
                    rx="5.4"
                    fill={`url(#trousers-${uid})`}
                  />
                  <rect
                    x="95.8"
                    y="108"
                    width="11.2"
                    height="25"
                    rx="5.4"
                    fill={`url(#trousers-${uid})`}
                  />
                  {/* Subtle inner-leg depth shadow */}
                  <rect
                    x="89.4"
                    y="112"
                    width="2.6"
                    height="19"
                    rx="1.3"
                    fill="rgba(47, 27, 41, 0.14)"
                  />

                  {/* Warm Cream Ivory Sneakers with thin Champagne Gold sole trim (#E6C690) */}
                  <g>
                    {/* Left sneaker */}
                    <path
                      d="M79.5 135.5 C79.5 131.5, 84 130.5, 89.5 130.5 C93.5 130.5, 96.2 132.8, 96.2 136.2 C96.2 138.3, 94.5 139.6, 92 139.6 L82.2 139.6 C80.4 139.6, 79.5 138, 79.5 135.5 Z"
                      fill={`url(#sneaker-${uid})`}
                    />
                    <rect x="79.8" y="137.8" width="16.2" height="2.2" rx="1.1" fill="#E6C690" />

                    {/* Right sneaker (facing slightly right) */}
                    <path
                      d="M94.8 135.5 C94.8 131.5, 99.3 130.5, 105.2 130.5 C109.5 130.5, 112.4 132.8, 112.4 136.2 C112.4 138.3, 110.6 139.6, 108 139.6 L97.6 139.6 C95.8 139.6, 94.8 138, 94.8 135.5 Z"
                      fill={`url(#sneaker-${uid})`}
                    />
                    <rect x="95.1" y="137.8" width="17.1" height="2.2" rx="1.1" fill="#E6C690" />
                  </g>

                  {/* Cozy Slightly Oversized Muted Pastel Lilac Hoodie Torso */}
                  <path
                    d="M79 77 C83 72, 105 72, 109 77 C114 82, 116 97, 114.5 109 C114 112.5, 110.5 114.5, 106 114.5 L82 114.5 C77.5 114.5, 74 112.5, 73.5 109 C72 97, 74 82, 79 77 Z"
                    fill={`url(#hoodie-${uid})`}
                  />
                  {/* Soft hoodie ribbed hem band */}
                  <rect
                    x="74.5"
                    y="109.5"
                    width="39"
                    height="5"
                    rx="2.5"
                    fill={`url(#hoodie-shade-${uid})`}
                  />
                  {/* Softly shaded hoodie hood collar fold */}
                  <path
                    d="M82 75.5 C86 81, 102 81, 106 75.5 C103 72.5, 85 72.5, 82 75.5 Z"
                    fill="#D4C5EF"
                  />
                  {/* Subtle kangaroo pocket seam */}
                  <path
                    d="M83.5 98.5 Q95 96.5 106.5 98.5 L108.2 108.2 Q95 110.2 81.8 108.2 Z"
                    fill="rgba(163, 141, 206, 0.16)"
                    stroke="rgba(116, 92, 152, 0.22)"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  {/* Tiny Warm Cream Ivory Hoodie Drawstrings (#FFFDF8) */}
                  <path
                    d="M91.8 78.6 C91.2 83.2, 91.6 87.2, 92.2 90.6"
                    fill="none"
                    stroke="#FFFDF8"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M98.8 78.6 C99.5 83.2, 99.1 87.2, 98.5 90.6"
                    fill="none"
                    stroke="#FFFDF8"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <circle cx="92.2" cy="91.1" r="1.15" fill="#FFFDF8" />
                  <circle cx="98.5" cy="91.1" r="1.15" fill="#FFFDF8" />
                </g>

                {/* GIRL BODY (`Anamika / Morgan`, 102px total height: y = 38..140) */}
                <g ref={girlBodyLayerRef}>
                  {/* Muted Rose Plum Leggings (#8C5873) */}
                  <rect
                    x="153.5"
                    y="114"
                    width="9.2"
                    height="21.5"
                    rx="4.6"
                    fill={`url(#leggings-${uid})`}
                  />
                  <rect
                    x="165.3"
                    y="114"
                    width="9.2"
                    height="21.5"
                    rx="4.6"
                    fill={`url(#leggings-${uid})`}
                  />

                  {/* Soft Buttercream Gold Flats (#F5DA9D) */}
                  <g>
                    {/* Left flat (facing slightly left) */}
                    <path
                      d="M148.5 136.4 C148.5 133.5, 152.2 132.8, 157.5 132.8 C161.2 132.8, 163.2 134.5, 163.2 136.8 C163.2 138.9, 161.2 140, 158.6 140 L151.6 140 C149.6 140, 148.5 138.6, 148.5 136.4 Z"
                      fill={`url(#flats-${uid})`}
                    />
                    <ellipse
                      cx="153.2"
                      cy="135.2"
                      rx="2.6"
                      ry="1.1"
                      fill="rgba(255, 253, 245, 0.55)"
                    />
                    {/* Right flat */}
                    <path
                      d="M161.4 136.4 C161.4 133.5, 165.1 132.8, 170.2 132.8 C173.8 132.8, 175.8 134.5, 175.8 136.8 C175.8 138.9, 173.8 140, 171.2 140 L164.4 140 C162.4 140, 161.4 138.6, 161.4 136.4 Z"
                      fill={`url(#flats-${uid})`}
                    />
                    <ellipse
                      cx="166.0"
                      cy="135.2"
                      rx="2.6"
                      ry="1.1"
                      fill="rgba(255, 253, 245, 0.55)"
                    />
                  </g>

                  {/* Soft Ivory-to-Petal-Blush Festive Kurti (#FFF8FA -> #FADCE9) */}
                  <path
                    d="M151.5 82.5 C155 79, 173 79, 176.5 82.5 C180.5 87, 184 103, 185.5 115.5 C185.8 118, 183.5 119.5, 180.2 119.5 L147.8 119.5 C144.5 119.5, 142.2 118, 142.5 115.5 C144 103, 147.5 87, 151.5 82.5 Z"
                    fill={`url(#kurti-${uid})`}
                  />
                  {/* Soft vertical pastel kurti drape shadow */}
                  <path
                    d="M153 96 C152 104, 151.5 111, 151.2 118"
                    fill="none"
                    stroke="rgba(217, 75, 125, 0.08)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M174 96 C175 104, 175.5 111, 175.8 118"
                    fill="none"
                    stroke="rgba(217, 75, 125, 0.08)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />

                  {/* Minimal Warm Rose Berry (#D94B7D) & Champagne Gold (#E8C892) Neckline Trim */}
                  <path
                    d="M156.2 81.2 Q163 89.2 169.8 81.2"
                    fill="none"
                    stroke="#D94B7D"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                  <path
                    d="M157.8 83.4 Q163 90.4 168.2 83.4"
                    fill="none"
                    stroke="#E8C892"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <circle cx="163" cy="89.4" r="1.15" fill="#E8C892" />

                  {/* Minimal Warm Rose Berry & Champagne Gold Kurti Hem Trim */}
                  <path
                    d="M143.4 114.8 Q164 116.8 184.6 114.8"
                    fill="none"
                    stroke="#E8C892"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M143.2 117.4 Q164 119.3 184.8 117.4"
                    fill="none"
                    stroke="#D94B7D"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.88"
                  />
                </g>
              </g>

              {/* ============================================================
                  LAYER 4: headsAndFaces (Neck-anchored heads + crossfading eyes)
                  ============================================================ */}
              <g data-layer="headsAndFaces">
                {/* BOY HEAD (`transform-origin` locked strictly at neck base 94px 73px) */}
                <g ref={boyHeadLayerRef}>
                  <g
                    ref={boyHeadPivotRef}
                    style={{ transformOrigin: '94px 73px' }}
                   
                  >
                    {/* Soft neck & chin shade */}
                    <rect
                      x="89.6"
                      y="68.5"
                      width="8.8"
                      height="7.5"
                      rx="4.2"
                      fill={`url(#skin-shade-${uid})`}
                    />

                    {/* Soft cute ears */}
                    <ellipse cx="72" cy="55.5" rx="4.2" ry="5.0" fill={`url(#skin-${uid})`} />
                    <ellipse cx="116" cy="55.5" rx="4.2" ry="5.0" fill={`url(#skin-${uid})`} />
                    <ellipse
                      cx="72.4"
                      cy="55.8"
                      rx="1.9"
                      ry="2.6"
                      fill="rgba(220, 148, 134, 0.25)"
                    />

                    {/* Compact Rounded Chibi Head (~40% of 116px height) */}
                    <ellipse cx="94" cy="52" rx="22.6" ry="21.4" fill={`url(#skin-${uid})`} />

                    {/* Softly Tousled Deep Espresso Plum Hair (#2F1B29 -> #462B3D) */}
                    <path
                      d="M71.5 52 C70 36, 78 24.5, 94.5 24 C109.5 23.6, 118.5 34.5, 117 49.5 C115.6 44.5, 111.5 41.2, 106.5 40.2 C102.5 43.8, 95.8 45.6, 88.8 44.5 C92.8 41.8, 95.8 39.2, 97.5 36.8 C91.2 40.4, 83.2 43.2, 76.2 44.8 C74.4 47.2, 73 49.8, 71.5 52 Z"
                      fill={`url(#hair-${uid})`}
                    />
                    {/* Swept front fringe tuft */}
                    <path
                      d="M84 31.5 C94 31, 104 34, 112.5 41.5 C104.5 41, 96.5 41.5, 89 44.2 C86.5 39.8, 84.5 35.5, 84 31.5 Z"
                      fill={`url(#hair-${uid})`}
                    />
                    {/* Single subtle curved highlight sheen along the crown */}
                    <path
                      d="M84.5 30.2 Q95.5 26.2 106.2 31.4"
                      fill="none"
                      stroke="rgba(255, 240, 248, 0.24)"
                      strokeWidth="2.3"
                      strokeLinecap="round"
                    />

                    {/* Soft Translucent Petal-Rose Cheek Blush */}
                    <ellipse
                      cx="84.5"
                      cy="60.4"
                      rx="4.4"
                      ry="2.5"
                      fill="rgba(240, 142, 174, 0.42)"
                    />
                    <ellipse
                      cx="109.8"
                      cy="60.4"
                      rx="4.4"
                      ry="2.5"
                      fill="rgba(240, 142, 174, 0.42)"
                    />

                    {/* State A: Open Warm Deep Plum Oval Eyes + 1.2px White Specular Catchlights */}
                    <g ref={boyOpenEyesRef} style={{ opacity: 1 }}>
                      <ellipse cx="90.6" cy="54.2" rx="2.5" ry="3.1" fill="#3A1233" />
                      <circle cx="89.7" cy="53.1" r="1.15" fill="#FFFFFF" />

                      <ellipse cx="104.2" cy="54.2" rx="2.5" ry="3.1" fill="#3A1233" />
                      <circle cx="103.3" cy="53.1" r="1.15" fill="#FFFFFF" />
                    </g>

                    {/* State B: Happy Curved ^ ^ Closed-Smile Eyes During Hug */}
                    <g ref={boyHugEyesRef} style={{ opacity: 0 }}>
                      <path
                        d="M87.4 55.2 Q90.6 51.2 93.8 55.2"
                        fill="none"
                        stroke="#3A1233"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M101.0 55.2 Q104.2 51.2 107.4 55.2"
                        fill="none"
                        stroke="#3A1233"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Relaxed Small Curved Best-Friend Smile */}
                    <path
                      d="M94.2 61.8 Q97.6 64.9 101.0 61.7"
                      fill="none"
                      stroke="#5C2847"
                      strokeWidth="1.65"
                      strokeLinecap="round"
                    />
                  </g>
                </g>

                {/* GIRL HEAD (`transform-origin` locked strictly at neck base 164px 80px) */}
                <g ref={girlHeadLayerRef}>
                  <g
                    ref={girlHeadPivotRef}
                    style={{ transformOrigin: '164px 80px' }}
                   
                  >
                    {/* Soft neck & chin shade */}
                    <rect
                      x="160.2"
                      y="76"
                      width="7.6"
                      height="6.5"
                      rx="3.6"
                      fill={`url(#skin-shade-${uid})`}
                    />

                    {/* Soft ears with faint Champagne Gold ear stud glints (#E8C892) */}
                    <ellipse cx="143.6" cy="63.4" rx="3.8" ry="4.5" fill={`url(#skin-${uid})`} />
                    <ellipse cx="184.4" cy="63.4" rx="3.8" ry="4.5" fill={`url(#skin-${uid})`} />
                    <circle cx="143.4" cy="66.2" r="1.65" fill="#E8C892" />
                    <circle cx="142.9" cy="65.7" r="0.55" fill="#FFFDF8" />
                    <circle cx="184.6" cy="66.2" r="1.65" fill="#E8C892" />
                    <circle cx="184.1" cy="65.7" r="0.55" fill="#FFFDF8" />

                    {/* Compact Rounded Chibi Head (~40% of 102px height) */}
                    <ellipse cx="164" cy="60.5" rx="20.6" ry="19.5" fill={`url(#skin-${uid})`} />

                    {/* Smooth Center-Parted Deep Espresso Plum Crown & Two Face-Framing Strands */}
                    {/* Left crown & face-framing strand */}
                    <path
                      d="M163.5 38.2 C151 38.5, 142.2 46.8, 142.4 61.5 C142.5 68.5, 144.2 74.5, 146.8 78.6 C147.8 74, 147.5 66.5, 148.8 58.2 C150.2 51.5, 155.5 47.2, 163.5 45.2 Z"
                      fill={`url(#hair-${uid})`}
                    />
                    {/* Right crown & face-framing strand */}
                    <path
                      d="M163.5 38.2 C176.2 38.5, 185.6 46.8, 185.6 61.5 C185.5 68.5, 183.8 74.5, 181.2 78.6 C180.2 74, 180.5 66.5, 179.2 58.2 C177.8 51.5, 171.8 47.2, 163.5 45.2 Z"
                      fill={`url(#hair-${uid})`}
                    />
                    {/* Soft subtle crown highlight sheen */}
                    <path
                      d="M153.2 43.2 Q163.5 39.8 174.2 43.4"
                      fill="none"
                      stroke="rgba(255, 240, 248, 0.22)"
                      strokeWidth="2.0"
                      strokeLinecap="round"
                    />

                    {/* Signature Delicate Warm Rose Berry Bindi (1.6px dot, #D94B7D) */}
                    <circle cx="161.2" cy="54.6" r="1.6" fill="#D94B7D" />

                    {/* Soft Translucent Petal-Rose Cheek Blush */}
                    <ellipse
                      cx="149.4"
                      cy="67.8"
                      rx="4.1"
                      ry="2.3"
                      fill="rgba(240, 142, 174, 0.42)"
                    />
                    <ellipse
                      cx="173.0"
                      cy="67.8"
                      rx="4.1"
                      ry="2.3"
                      fill="rgba(240, 142, 174, 0.42)"
                    />

                    {/* State A: Open Warm Deep Plum Oval Eyes + 1.2px White Specular Catchlights */}
                    <g ref={girlOpenEyesRef} style={{ opacity: 1 }}>
                      <ellipse cx="154.6" cy="62.2" rx="2.4" ry="2.95" fill="#3A1233" />
                      <circle cx="153.8" cy="61.2" r="1.15" fill="#FFFFFF" />

                      <ellipse cx="167.8" cy="62.2" rx="2.4" ry="2.95" fill="#3A1233" />
                      <circle cx="167.0" cy="61.2" r="1.15" fill="#FFFFFF" />
                    </g>

                    {/* State B: Happy Curved ^ ^ Closed-Smile Eyes During Hug */}
                    <g ref={girlHugEyesRef} style={{ opacity: 0 }}>
                      <path
                        d="M151.7 63.1 Q154.6 59.4 157.5 63.1"
                        fill="none"
                        stroke="#3A1233"
                        strokeWidth="1.95"
                        strokeLinecap="round"
                      />
                      <path
                        d="M164.9 63.1 Q167.8 59.4 170.7 63.1"
                        fill="none"
                        stroke="#3A1233"
                        strokeWidth="1.95"
                        strokeLinecap="round"
                      />
                    </g>

                    {/* Relaxed Small Curved Smile */}
                    <path
                      d="M158.0 69.2 Q161.2 72.1 164.4 69.1"
                      fill="none"
                      stroke="#5C2847"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              </g>

              {/* ============================================================
                  LAYER 5: frontArmsAndClasp (Shoulder-pinned arms + (130, 92) clasp)
                  ============================================================ */}
              <g data-layer="frontArmsAndClasp">
                {/* Girl Front Blush Arm (shoulder locked strictly at 154px 90px) */}
                <g ref={girlFrontLayerRef}>
                  <g transform="translate(154, 90)">
                    <g
                      ref={girlFrontArmRef}
                      style={{ transformOrigin: '0px 0px' }}
                     
                    >
                      {/* Seamless rounded shoulder cap blending into kurti */}
                      <circle cx="0" cy="0" r="6.3" fill={`url(#kurti-${uid})`} />
                      {/* Gently tapered Ivory-to-Petal-Blush kurti sleeve along -X */}
                      <path
                        d="M1 -6.2 L-17.5 -4.6 C-19 -4.4, -19 4.4, -17.5 4.6 L1 6.2 Z"
                        fill={`url(#kurti-${uid})`}
                      />
                      {/* Delicate Champagne Gold & Rose Berry cuff trim */}
                      <rect
                        x="-17.8"
                        y="-4.5"
                        width="2.3"
                        height="9.0"
                        rx="1.1"
                        fill="#E8C892"
                      />
                      <rect
                        x="-15.4"
                        y="-4.6"
                        width="1.3"
                        height="9.2"
                        rx="0.65"
                        fill="#D94B7D"
                        opacity="0.72"
                      />
                      {/* Cute rounded Warm Soft Peach mitten hand reaching (-24, 0) */}
                      <ellipse cx="-22.4" cy="0" rx="4.7" ry="4.0" fill={`url(#skin-${uid})`} />
                      <ellipse
                        cx="-21.4"
                        cy="-3.1"
                        rx="2.1"
                        ry="1.5"
                        fill={`url(#skin-${uid})`}
                      />
                    </g>
                  </g>
                </g>

                {/* Soft Handshake Clasp Overlap Accent right at (130, 92) */}
                <g
                  ref={claspOverlapRef}
                  style={{ opacity: 0 }}
                 
                >
                  <ellipse
                    cx="130"
                    cy="92"
                    rx="5.6"
                    ry="4.5"
                    fill={`url(#skin-${uid})`}
                  />
                  <path
                    d="M126.8 92.6 Q130 94.8 133.2 92.2"
                    fill="none"
                    stroke="rgba(182, 114, 96, 0.34)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </g>

                {/* Boy Front Lilac Arm (shoulder locked strictly at 104px 85px) */}
                <g ref={boyFrontLayerRef}>
                  <g transform="translate(104, 85)">
                    <g
                      ref={boyFrontArmRef}
                      style={{ transformOrigin: '0px 0px' }}
                     
                    >
                      {/* Seamless rounded shoulder cap blending into hoodie */}
                      <circle cx="0" cy="0" r="7.2" fill={`url(#hoodie-${uid})`} />
                      {/* Gently tapered Muted Pastel Lilac sleeve along +X */}
                      <path
                        d="M-1 -7.0 L18.5 -5.1 C20.2 -4.9, 20.2 4.9, 18.5 5.1 L-1 7.0 Z"
                        fill={`url(#hoodie-${uid})`}
                      />
                      {/* Soft underside sleeve shading for clean depth during hug */}
                      <path
                        d="M0 4.6 L18.2 3.6 C19.2 4.3, 19.0 5.0, 18.0 5.2 L0 6.8 Z"
                        fill="rgba(146, 120, 184, 0.20)"
                      />
                      {/* Softly shaded ribbed wrist cuff */}
                      <rect
                        x="16.8"
                        y="-5.0"
                        width="3.4"
                        height="10.0"
                        rx="1.6"
                        fill="#EFE7FB"
                      />
                      {/* Cute rounded Warm Soft Peach mitten hand reaching (+26, 0) */}
                      <ellipse cx="24.2" cy="0" rx="5.1" ry="4.3" fill={`url(#skin-${uid})`} />
                      <ellipse
                        cx="23.0"
                        cy="-3.4"
                        rx="2.3"
                        ry="1.6"
                        fill={`url(#skin-${uid})`}
                      />
                    </g>
                  </g>
                </g>
              </g>
            </g>

            {/* ============================================================
                LAYER 6: microParticles (Handshake gold ticks + hug pastel glints)
                STRICTLY PLATONIC — ZERO RED HEARTS
                ============================================================ */}
            <g data-layer="microParticles" className="pointer-events-none">
              {/* 3 Tiny Champagne-Gold (#E6B85C) Radial Motion Ticks above (130, 92) */}
              <g
                ref={handshakeTicksRef}
                data-testid="chibi-handshake-ticks"
                style={{
                  opacity: 0,
                  transformOrigin: '130px 82px',
                }}
               
              >
                <line
                  x1="130"
                  y1="77"
                  x2="130"
                  y2="71.5"
                  stroke="#E6B85C"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="124.2"
                  y1="79.2"
                  x2="120.4"
                  y2="75.2"
                  stroke="#E6B85C"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
                <line
                  x1="135.8"
                  y1="79.2"
                  x2="139.6"
                  y2="75.2"
                  stroke="#E6B85C"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                />
              </g>

              {/* 4 Tiny Rising Pastel 4-Point Star Glints & Soft Confetti Dots Framing Their Shoulders & Crowns */}
              <g
                ref={hugParticle1Ref}
                data-testid="chibi-hug-particle-1"
                style={{ opacity: 0, transformOrigin: '78px 60px' }}
               
              >
                {/* Warm Gold 4-point star glint */}
                <path
                  d="M78 54.5 Q78.5 59.5 83.5 60 Q78.5 60.5 78 65.5 Q77.5 60.5 72.5 60 Q77.5 59.5 78 54.5 Z"
                  fill="#E6B85C"
                />
              </g>

              <g
                ref={hugParticle2Ref}
                data-testid="chibi-hug-particle-2"
                style={{ opacity: 0, transformOrigin: '126px 24px' }}
               
              >
                {/* Soft Blush confetti dot */}
                <circle cx="126" cy="24" r="3.0" fill="#F2A7C6" />
              </g>

              <g
                ref={hugParticle3Ref}
                data-testid="chibi-hug-particle-3"
                style={{ opacity: 0, transformOrigin: '180px 64px' }}
               
              >
                {/* Pastel Lilac 4-point star glint */}
                <path
                  d="M180 59 Q180.5 63.5 185 64 Q180.5 64.5 180 69 Q179.5 64.5 175 64 Q179.5 63.5 180 59 Z"
                  fill="#C9B5EE"
                />
              </g>

              <g
                ref={hugParticle4Ref}
                data-testid="chibi-hug-particle-4"
                style={{ opacity: 0, transformOrigin: '164px 32px' }}
               
              >
                {/* Warm Gold soft confetti dot */}
                <circle cx="164" cy="32" r="2.4" fill="#E6B85C" />
              </g>
            </g>
          </svg>
        </button>

        {/* Quiet Micro-Hint */}
        <p
          data-testid="footer-replay-hint"
          className="select-none"
          style={{
            fontSize: '11px',
            color: '#9A6B82',
            opacity: 0.72,
            marginTop: '6px',
          }}
        >
          Tap to replay
        </p>

        {/* Centered Slim Rose-Gold Hairline Divider */}
        <div
          aria-hidden="true"
          style={{
            width: '48px',
            height: '1px',
            background: 'rgba(201, 59, 107, 0.28)',
            margin: '16px auto 14px',
          }}
        />

        {/* Editorial Creator Sign-Off Credit */}
        <p
          data-testid="footer-creator-credit"
          style={{
            fontSize: '13.5px',
            color: '#7A4A63',
          }}
        >
          Created by{' '}
          <span
            style={{
              color: '#B52C5C',
              fontWeight: 600,
            }}
          >
            adinomide
          </span>
        </p>

        {/* Quiet Final Closing Line (Nothing Below This) */}
        <p
          data-testid="footer-closing-date"
          style={{
            fontSize: '11px',
            color: '#9B7488',
            letterSpacing: '0.06em',
            marginTop: '4px',
          }}
        >
          Anamika&apos;s 17th &middot; 03 December 2026
        </p>
      </div>
    </footer>
  );
}
