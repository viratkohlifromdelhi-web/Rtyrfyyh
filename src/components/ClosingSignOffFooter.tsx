import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
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
import { playUiSfx } from '../utils/uiSoundEngine';
import { useInViewAnimation } from '../utils/useInViewAnimation';

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const REPLAY_SPARKLE_BURST = [
  { id: 'sp1', left: '19%', top: '18%', dx: '-14px', dy: '-26px', delay: '40ms', color: '#EBB95E', size: 11, shape: 'star' as const },
  { id: 'sp2', left: '36%', top: '8%', dx: '-6px', dy: '-30px', delay: '110ms', color: '#F182AC', size: 10, shape: 'star' as const },
  { id: 'sp3', left: '52%', top: '5%', dx: '3px', dy: '-28px', delay: '70ms', color: '#BEA8F0', size: 12, shape: 'star' as const },
  { id: 'sp4', left: '68%', top: '10%', dx: '9px', dy: '-29px', delay: '150ms', color: '#E6B85C', size: 10, shape: 'star' as const },
  { id: 'sp5', left: '82%', top: '21%', dx: '15px', dy: '-24px', delay: '95ms', color: '#F48FB4', size: 9, shape: 'dot' as const },
  { id: 'sp6', left: '28%', top: '26%', dx: '-11px', dy: '-20px', delay: '185ms', color: '#CBB8F4', size: 7, shape: 'dot' as const },
] as const;

/**
 * Handcrafted Closing Sign-Off Footer featuring slender, refined pastel
 * storybook best friends (tall lean Boy `adinomide` + petite 5'2" Girl
 * `Anamika`) sharing a lively 60fps GPU-composited friendly wave, warm
 * chuckle-nod, happy eye-blink, and sparkle celebration.
 */
interface ClosingSignOffFooterProps {
  isSiteRevealed?: boolean;
}

export function ClosingSignOffFooter({ isSiteRevealed = true }: ClosingSignOffFooterProps = {}) {
  const uid = useId().replace(/:/g, '');
  const boyPrefix = `footerBoy_${uid}`;
  const girlPrefix = `footerGirl_${uid}`;

  const footerRef = useRef<HTMLElement | null>(null);
  const animationsActive = useInViewAnimation(footerRef, { enabled: isSiteRevealed });
  const stageRef = useRef<HTMLButtonElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const animStartRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const hasAutoPlayedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  // Ref-only scroll-direction & visibility state (zero React re-renders on scroll)
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<ScrollAdvanceDirection>('idle');
  const isFooterWellInViewRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Direct-DOM SVG rig refs (60fps GPU-composited transforms & opacity, zero per-frame React renders)
  const sharedShadowRef = useRef<SVGGElement | null>(null);

  const boyRootRef = useRef<SVGGElement | null>(null);
  const boyHeadPivotRef = useRef<SVGGElement | null>(null);
  const boyOpenEyesRef = useRef<SVGGElement | null>(null);
  const boyHappyEyesRef = useRef<SVGGElement | null>(null);
  const boyWaveArmRef = useRef<SVGGElement | null>(null);

  const girlRootRef = useRef<SVGGElement | null>(null);
  const girlBackHairRef = useRef<SVGGElement | null>(null);
  const girlHeadPivotRef = useRef<SVGGElement | null>(null);
  const girlOpenEyesRef = useRef<SVGGElement | null>(null);
  const girlHappyEyesRef = useRef<SVGGElement | null>(null);
  const girlWaveArmRef = useRef<SVGGElement | null>(null);
  const girlInnerArmRef = useRef<SVGGElement | null>(null);

  const girlHandSparkleRef = useRef<SVGGElement | null>(null);
  const ambientSparkle1Ref = useRef<SVGGElement | null>(null);
  const ambientSparkle2Ref = useRef<SVGGElement | null>(null);
  const ambientSparkle3Ref = useRef<SVGGElement | null>(null);

  const [replayCount, setReplayCount] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isIdleBreathing, setIsIdleBreathing] = useState(false);
  const [activeStage, setActiveStage] = useState<ChibiStage>('ready');
  const lastStageRef = useRef<ChibiStage>('ready');

  const applyPoseToDom = useCallback((pose: ChibiPose) => {
    if (sharedShadowRef.current) {
      sharedShadowRef.current.style.transform = `scaleX(${pose.shadowScaleX.toFixed(3)})`;
      sharedShadowRef.current.style.opacity = pose.shadowOpacity.toFixed(3);
    }

    if (boyRootRef.current) {
      boyRootRef.current.style.transform = `translate3d(${pose.boyShiftX.toFixed(2)}px, ${pose.boyBounceY.toFixed(2)}px, 0)`;
    }
    if (boyHeadPivotRef.current) {
      boyHeadPivotRef.current.style.transform = `rotate(${pose.boyHeadDeg.toFixed(2)}deg)`;
    }
    if (boyOpenEyesRef.current) {
      boyOpenEyesRef.current.style.opacity = pose.boyOpenEyesOpacity.toFixed(3);
    }
    if (boyHappyEyesRef.current) {
      boyHappyEyesRef.current.style.opacity = pose.boyHappyEyesOpacity.toFixed(3);
    }
    if (boyWaveArmRef.current) {
      boyWaveArmRef.current.style.transform = `rotate(${pose.boyWaveArmDeg.toFixed(2)}deg)`;
    }

    if (girlRootRef.current) {
      girlRootRef.current.style.transform = `translate3d(${pose.girlShiftX.toFixed(2)}px, ${pose.girlBounceY.toFixed(2)}px, 0)`;
    }
    if (girlBackHairRef.current) {
      girlBackHairRef.current.style.transform = `rotate(${pose.girlBackHairDeg.toFixed(2)}deg)`;
    }
    if (girlHeadPivotRef.current) {
      girlHeadPivotRef.current.style.transform = `rotate(${pose.girlHeadDeg.toFixed(2)}deg)`;
    }
    if (girlOpenEyesRef.current) {
      girlOpenEyesRef.current.style.opacity = pose.girlOpenEyesOpacity.toFixed(3);
    }
    if (girlHappyEyesRef.current) {
      girlHappyEyesRef.current.style.opacity = pose.girlHappyEyesOpacity.toFixed(3);
    }
    if (girlWaveArmRef.current) {
      girlWaveArmRef.current.style.transform = `rotate(${pose.girlWaveArmDeg.toFixed(2)}deg)`;
    }
    if (girlInnerArmRef.current) {
      girlInnerArmRef.current.style.transform = `rotate(${pose.girlInnerArmDeg.toFixed(2)}deg)`;
    }

    if (girlHandSparkleRef.current) {
      girlHandSparkleRef.current.style.opacity = pose.girlHandSparkleOpacity.toFixed(3);
      girlHandSparkleRef.current.style.transform = `scale(${pose.girlHandSparkleScale.toFixed(3)})`;
    }

    const ap = pose.ambientSparklesProgress01;
    const ao = pose.ambientSparklesOpacity;
    if (ambientSparkle1Ref.current) {
      ambientSparkle1Ref.current.style.opacity = ao.toFixed(3);
      ambientSparkle1Ref.current.style.transform = `translate3d(${(-4 * ap).toFixed(2)}px, ${(-14 * ap).toFixed(2)}px, 0) scale(${(0.72 + 0.34 * Math.sin(ap * Math.PI)).toFixed(3)})`;
    }
    if (ambientSparkle2Ref.current) {
      ambientSparkle2Ref.current.style.opacity = (ao * 0.92).toFixed(3);
      ambientSparkle2Ref.current.style.transform = `translate3d(${(2 * ap).toFixed(2)}px, ${(-16 * ap).toFixed(2)}px, 0) scale(${(0.75 + 0.28 * ap).toFixed(3)})`;
    }
    if (ambientSparkle3Ref.current) {
      ambientSparkle3Ref.current.style.opacity = (ao * 0.96).toFixed(3);
      ambientSparkle3Ref.current.style.transform = `translate3d(${(5 * ap).toFixed(2)}px, ${(-13 * ap).toFixed(2)}px, 0) scale(${(0.7 + 0.35 * Math.sin(ap * Math.PI)).toFixed(3)})`;
    }

    if (pose.stage !== lastStageRef.current) {
      lastStageRef.current = pose.stage;
      setActiveStage(pose.stage);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, delayMs);
    timersRef.current.push(id);
    return id;
  }, []);

  const stopAnimationLoop = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animStartRef.current = null;
    clearAllTimers();
  }, [clearAllTimers]);

  const playChoreography = useCallback(
    (isManualReplay = false) => {
      stopAnimationLoop();
      const reduced = prefersReducedMotionNow();
      reducedMotionRef.current = reduced;

      if (reduced) {
        setIsIdleBreathing(false);
        applyPoseToDom(computeFooterChibiPose(CHIBI_TIMING.totalDurationMs, true));
        if (isManualReplay) {
          setIsReplaying(true);
          scheduleTimer(() => {
            setIsReplaying(false);
          }, 680);
        } else {
          setIsReplaying(false);
        }
        return;
      }

      setIsIdleBreathing(false);
      setIsReplaying(true);
      lastStageRef.current = 'ready';
      setActiveStage('ready');
      applyPoseToDom(computeFooterChibiPose(0, false));

      const finishRun = () => {
        stopAnimationLoop();
        applyPoseToDom(computeFooterChibiPose(CHIBI_TIMING.totalDurationMs, false));
        setIsIdleBreathing(true);
        setIsReplaying(false);
      };

      const step = (now: number) => {
        if (animStartRef.current === null) {
          animStartRef.current = now;
        }
        const elapsed = now - animStartRef.current;
        const pose = computeFooterChibiPose(elapsed, false);
        applyPoseToDom(pose);

        if (elapsed >= CHIBI_TIMING.totalDurationMs) {
          finishRun();
          return;
        }

        rafRef.current = window.requestAnimationFrame(step);
      };

      rafRef.current = window.requestAnimationFrame(step);
      // Backup completion guard in case RAF is throttled
      scheduleTimer(finishRun, CHIBI_TIMING.totalDurationMs + 140);
    },
    [applyPoseToDom, scheduleTimer, stopAnimationLoop],
  );

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

    // Set initial ready pose before scrolling into view
    applyPoseToDom(computeFooterChibiPose(0, false));

    const footerEl = footerRef.current;
    if (!footerEl || typeof IntersectionObserver === 'undefined') {
      hasAutoPlayedRef.current = true;
      setHasEntered(true);
      playChoreography(false);
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
        setHasEntered(true);
        playChoreography(false);
        try {
          emitModinoEvent('ending', { force: true, source: 'footer-auto-enter' });
        } catch {
          // silent fallback
        }
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

  // Every user tap increments `replayCount`, remounting the `key={replayCount}` stage wrapper
  // with fresh SVG refs & reset CSS keyframes, then cleanly launches Frame 0 choreography.
  useEffect(() => {
    if (replayCount === 0) return;
    playChoreography(true);
    return () => {
      stopAnimationLoop();
    };
  }, [playChoreography, replayCount, stopAnimationLoop]);

  const handleReplay = useCallback(() => {
    try {
      haptics.footerChibiReplay();
    } catch {
      // silent fallback
    }
    hasAutoPlayedRef.current = true;
    stopAnimationLoop();
    setHasEntered(true);
    setIsIdleBreathing(false);
    setIsReplaying(true);
    setReplayCount((prev) => prev + 1);
    try {
      playUiSfx('awww_chime');
    } catch {
      // silent fallback
    }
    try {
      trackEvent('footer_finale_replayed', 'Footer Characters');
    } catch {
      // silent fallback
    }
    try {
      emitModinoEvent('ending', { force: true });
    } catch {
      // silent fallback
    }
  }, [stopAnimationLoop]);

  const showReplayStageMotion = hasEntered || replayCount > 0;

  return (
    <footer
      ref={footerRef}
      id="closing-signoff"
      data-testid="closing-signoff-footer"
      data-animations-active={String(animationsActive || isReplaying)}
      className={`relative z-[5] bg-transparent px-5 pt-8 pb-40 sm:pb-24 ${
        animationsActive || isReplaying ? '' : 'anim-paused'
      }`}
    >
      <div
        className="mx-auto text-center"
        style={{
          maxWidth: 'min(92vw, 540px)',
        }}
      >
        {/* Single High-Priority Interactive Hit Target wrapping BOTH Boy & Girl Stage AND "Tap to replay" */}
        <button
          ref={stageRef}
          type="button"
          data-testid="footer-chibi-stage"
          data-stage={activeStage}
          data-replay-count={replayCount}
          data-replaying={String(isReplaying)}
          data-idle-breathing={String(isIdleBreathing)}
          onClick={handleReplay}
          aria-label="Tap to replay best friend wave animation"
          style={{
            position: 'relative',
            zIndex: 5,
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
          className="group relative z-[5] mx-auto inline-flex cursor-pointer flex-col items-center rounded-3xl bg-transparent px-3 py-1.5 select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C93B6B]"
        >
          {/* Remounted Animated Boy & Girl Stage Wrapper (key={replayCount} guarantees Frame 0 reset on every tap) */}
          <span
            key={replayCount}
            data-testid="footer-chibi-animated-stage"
            data-replay-instance={replayCount}
            className={`relative block overflow-visible ${
              showReplayStageMotion ? 'footer-stage-replay-hop' : ''
            }`}
          >
            {/* 6 Soft Pastel Floating Sparkles / Stars Burst Above Best Friends */}
            {showReplayStageMotion && (
              <span
                aria-hidden="true"
                data-testid="footer-replay-sparkles"
                className="pointer-events-none absolute inset-0 z-[2] overflow-visible"
              >
                {REPLAY_SPARKLE_BURST.map((sp) => (
                  <span
                    key={sp.id}
                    className="footer-replay-sparkle absolute inline-flex items-center justify-center"
                    style={
                      {
                        left: sp.left,
                        top: sp.top,
                        '--fsp-dx': sp.dx,
                        '--fsp-dy': sp.dy,
                        '--fsp-delay': sp.delay,
                      } as CSSProperties
                    }
                  >
                    {sp.shape === 'star' ? (
                      <svg
                        width={sp.size}
                        height={sp.size}
                        viewBox="0 0 14 14"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M7 0.6 L8.4 5.2 L13.4 7 L8.4 8.8 L7 13.4 L5.6 8.8 L0.6 7 L5.6 5.2 Z"
                          fill={sp.color}
                        />
                      </svg>
                    ) : (
                      <span
                        className="block rounded-full"
                        style={{
                          width: `${sp.size}px`,
                          height: `${sp.size}px`,
                          backgroundColor: sp.color,
                        }}
                      />
                    )}
                  </span>
                ))}
              </span>
            )}

            <svg
              viewBox="0 0 260 198"
              role="img"
              aria-label="Two pastel storybook best friends smiling and waving together"
              style={{
                width: 'clamp(224px, 38vw, 340px)',
                height: 'auto',
                overflow: 'visible',
              }}
              className="relative z-[1] block select-none"
            >
            <defs>
              {/* Shared soft pastel ground shadow filter */}
              <filter
                id={`${girlPrefix}_shadowBlur`}
                x="-30%"
                y="-60%"
                width="160%"
                height="220%"
              >
                <feGaussianBlur stdDeviation="2.4" />
              </filter>

              {/* Boy Gradients (uniquely prefixed footerBoy_...) */}
              <linearGradient id={`${boyPrefix}_skin`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFE6D6" />
                <stop offset="68%" stopColor="#F6CFB6" />
                <stop offset="100%" stopColor="#E9B89B" />
              </linearGradient>
              <linearGradient id={`${boyPrefix}_hair`} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#3B2637" />
                <stop offset="50%" stopColor="#2C1D2A" />
                <stop offset="100%" stopColor="#1B101A" />
              </linearGradient>
              <linearGradient id={`${boyPrefix}_hoodie`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E0D8FA" />
                <stop offset="48%" stopColor="#D6CCF7" />
                <stop offset="100%" stopColor="#B8A9EC" />
              </linearGradient>
              <linearGradient id={`${boyPrefix}_hoodieShade`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#CABEF2" />
                <stop offset="100%" stopColor="#AE9DE5" />
              </linearGradient>
              <linearGradient id={`${boyPrefix}_jeans`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4F405C" />
                <stop offset="55%" stopColor="#443650" />
                <stop offset="100%" stopColor="#372B42" />
              </linearGradient>
              <linearGradient id={`${boyPrefix}_sneaker`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFDF9" />
                <stop offset="100%" stopColor="#EFE8F7" />
              </linearGradient>
              <radialGradient id={`${boyPrefix}_blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF94AE" stopOpacity="0.58" />
                <stop offset="58%" stopColor="#FF94AE" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#FF94AE" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${boyPrefix}_iris`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#250D20" />
                <stop offset="60%" stopColor="#3E1836" />
                <stop offset="100%" stopColor="#5F2B54" />
              </linearGradient>

              {/* Girl Gradients (uniquely prefixed footerGirl_...) */}
              <linearGradient id={`${girlPrefix}_skin`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFE8DA" />
                <stop offset="68%" stopColor="#F8D2BA" />
                <stop offset="100%" stopColor="#ECBA9E" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_armSkin`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FDE1CE" />
                <stop offset="58%" stopColor="#F4CBB2" />
                <stop offset="100%" stopColor="#EEBDA1" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_hair`} x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#3E2538" />
                <stop offset="48%" stopColor="#2A1926" />
                <stop offset="100%" stopColor="#1B0F19" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_hairDeep`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2E1B2A" />
                <stop offset="100%" stopColor="#1B0F19" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_kurti`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFDF9" />
                <stop offset="46%" stopColor="#FDE8F1" />
                <stop offset="100%" stopColor="#F5C0D7" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_dupatta`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAD2E4" />
                <stop offset="55%" stopColor="#F1ACC9" />
                <stop offset="100%" stopColor="#E68EB4" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_churidar`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B8829D" />
                <stop offset="58%" stopColor="#A26C87" />
                <stop offset="100%" stopColor="#8C5873" />
              </linearGradient>
              <linearGradient id={`${girlPrefix}_jooti`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#EA6A9A" />
                <stop offset="60%" stopColor="#CF3F74" />
                <stop offset="100%" stopColor="#A52957" />
              </linearGradient>
              <radialGradient id={`${girlPrefix}_blush`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FF8CAE" stopOpacity="0.72" />
                <stop offset="55%" stopColor="#FF8CAE" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FF8CAE" stopOpacity="0" />
              </radialGradient>
              <linearGradient id={`${girlPrefix}_iris`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#260C20" />
                <stop offset="58%" stopColor="#43183A" />
                <stop offset="100%" stopColor="#6D2E5E" />
              </linearGradient>
            </defs>

            {/* ============================================================
                LAYER 1: Unified Soft Pastel Floor Shadow (grounded at y = 186)
                ============================================================ */}
            <g
              ref={sharedShadowRef}
              data-layer="groundShadow"
              style={{ transformOrigin: '129px 186.8px' }}
            >
              <ellipse
                cx="129"
                cy="186.8"
                rx="68"
                ry="5.8"
                fill="rgba(176, 62, 108, 0.13)"
                filter={`url(#${girlPrefix}_shadowBlur)`}
              />
              <ellipse cx="92" cy="186.5" rx="22" ry="3.2" fill="rgba(128, 56, 94, 0.14)" />
              <ellipse cx="166" cy="186.5" rx="19" ry="3.0" fill="rgba(166, 58, 98, 0.15)" />
            </g>

            {/* Shared Calm Idle Breathing Wrapper Anchored Strictly at Feet (y = 186) */}
            <g className={isIdleBreathing ? 'animate-chibi-breathe' : undefined}>
              {/* ============================================================
                  CHARACTER 1 (LEFT): TALL, SLENDER BEST-FRIEND BOY (y = 20..186)
                  ============================================================ */}
              <g ref={boyRootRef} data-character="footerBoy">
                {/* Outer Left Arm — Cool Casual Friendly Wave (pivots smoothly at sloped shoulder (79, 75)) */}
                <g
                  ref={boyWaveArmRef}
                  style={{ transformOrigin: '79px 75px' }}
                >
                  {/* Smoothly joined tapered pastel lavender hoodie sleeve curving into a relaxed wave */}
                  <path
                    d="M 80.2 76.6
                       C 73.2 78.2 66.2 78.6 62.2 75.2
                       C 58.8 72.3 57.2 67.6 56.8 63.0
                       L 62.0 62.4
                       C 62.6 66.0 63.9 69.2 66.0 70.6
                       C 69.2 72.6 74.0 71.8 79.4 70.8 Z"
                    fill={`url(#${boyPrefix}_hoodie)`}
                    stroke="#A695DF"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                  {/* Soft underside sleeve shade */}
                  <path
                    d="M 79.2 76.2 C 72.6 77.8 66.0 78.0 62.4 74.8"
                    fill="none"
                    stroke="rgba(126, 106, 186, 0.24)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* Neat ribbed pastel ivory-lilac wrist cuff */}
                  <path
                    d="M 56.5 63.8 L 62.4 63.0 L 62.1 60.6 L 56.2 61.4 Z"
                    fill="#F2ECFD"
                    stroke="#BEB0EA"
                    strokeWidth="0.6"
                  />
                  {/* Slender warm-peach friendly waving hand */}
                  <path
                    d="M 56.4 61.4
                       C 54.6 59.2 54.2 55.8 55.8 54.7
                       C 57.0 53.8 58.4 54.7 59.1 56.3
                       C 59.7 54.9 61.0 54.8 61.7 56.0
                       C 62.5 57.4 62.1 59.9 60.9 61.3 Z"
                    fill={`url(#${boyPrefix}_skin)`}
                    stroke="#D69A7D"
                    strokeWidth="0.75"
                    strokeLinejoin="round"
                  />
                </g>

                {/* Slim Tapered Charcoal-Plum Jeans / Joggers & Pastel Ivory-and-Lilac Sneakers */}
                <g>
                  {/* Left tapered jogger leg */}
                  <path
                    d="M 80.6 121.0
                       L 90.2 121.0
                       C 90.0 139.0 89.4 157.5 88.6 174.5
                       Q 85.8 176.2 82.8 174.5
                       C 81.8 157.5 81.0 139.0 80.6 121.0 Z"
                    fill={`url(#${boyPrefix}_jeans)`}
                    stroke="#2E2238"
                    strokeWidth="0.55"
                  />
                  {/* Right tapered jogger leg */}
                  <path
                    d="M 93.8 121.0
                       L 103.4 121.0
                       C 103.0 139.0 102.2 157.5 101.2 174.5
                       Q 98.2 176.2 95.4 174.5
                       C 94.6 157.5 94.0 139.0 93.8 121.0 Z"
                    fill={`url(#${boyPrefix}_jeans)`}
                    stroke="#2E2238"
                    strokeWidth="0.55"
                  />
                  {/* Subtle inner-leg depth & neat jogger ankle cuffs */}
                  <path
                    d="M 88.8 125 C 88.6 142 88.1 158 87.5 173"
                    fill="none"
                    stroke="rgba(255, 240, 255, 0.10)"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 95.2 125 C 95.4 142 95.9 158 96.5 173"
                    fill="none"
                    stroke="rgba(255, 240, 255, 0.10)"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                  />
                  <rect x="82.4" y="172.8" width="6.5" height="3.2" rx="1.5" fill="#32263D" />
                  <rect x="95.1" y="172.8" width="6.5" height="3.2" rx="1.5" fill="#32263D" />
                  {/* Tiny peek of warm-ivory ankle sock */}
                  <rect x="83.4" y="175.6" width="4.6" height="2.8" rx="1.1" fill="#F8F3FC" />
                  <rect x="96.0" y="175.6" width="4.6" height="2.8" rx="1.1" fill="#F8F3FC" />

                  {/* Crisp Petite Left Pastel Ivory-and-Lilac Sneaker (grounded at y = 186.0) */}
                  <path
                    d="M 77.6 182.2
                       C 77.6 179.0 80.8 177.5 85.2 177.5
                       C 88.4 177.5 90.4 179.2 90.4 182.4
                       C 90.4 184.8 88.6 186.0 86.2 186.0
                       L 80.2 186.0
                       C 78.4 186.0 77.6 184.6 77.6 182.2 Z"
                    fill={`url(#${boyPrefix}_sneaker)`}
                    stroke="#C5B8E6"
                    strokeWidth="0.65"
                  />
                  <path
                    d="M 85.4 178.4 C 87.6 178.6 89.4 180.0 89.6 182.6 L 85.6 182.6 Z"
                    fill="#C6B8F0"
                    opacity="0.85"
                  />
                  <path d="M 80.6 180.6 L 83.4 180.6" stroke="#B6A5E8" strokeWidth="1.05" strokeLinecap="round" />
                  <rect x="77.8" y="184.0" width="12.4" height="2.0" rx="1.0" fill="#E3D7F7" />

                  {/* Crisp Petite Right Pastel Ivory-and-Lilac Sneaker (grounded at y = 186.0) */}
                  <path
                    d="M 93.6 182.4
                       C 93.6 179.2 95.6 177.5 98.8 177.5
                       C 103.2 177.5 106.4 179.0 106.4 182.2
                       C 106.4 184.6 105.6 186.0 103.8 186.0
                       L 97.8 186.0
                       C 95.4 186.0 93.6 184.8 93.6 182.4 Z"
                    fill={`url(#${boyPrefix}_sneaker)`}
                    stroke="#C5B8E6"
                    strokeWidth="0.65"
                  />
                  <path
                    d="M 98.6 178.4 C 96.4 178.6 94.6 180.0 94.4 182.6 L 98.4 182.6 Z"
                    fill="#C6B8F0"
                    opacity="0.85"
                  />
                  <path d="M 100.6 180.6 L 103.4 180.6" stroke="#B6A5E8" strokeWidth="1.05" strokeLinecap="round" />
                  <rect x="93.8" y="184.0" width="12.4" height="2.0" rx="1.0" fill="#E3D7F7" />
                </g>

                {/* Tailored Slender Pastel Lavender-Periwinkle Hoodie (Zero Boxy Rectangle!) */}
                <g>
                  {/* Slim fitted hoodie torso with naturally sloped rounded shoulders */}
                  <path
                    d="M 84.8 68.8
                       C 80.6 69.3 77.8 71.2 77.0 74.6
                       C 76.0 81.4 76.2 98.0 78.4 118.4
                       C 78.8 121.2 80.6 122.4 83.2 122.4
                       L 100.8 122.4
                       C 103.4 122.4 105.2 121.2 105.6 118.4
                       C 107.8 98.0 108.0 81.4 107.0 74.6
                       C 106.2 71.2 103.4 69.3 99.2 68.8 Z"
                    fill={`url(#${boyPrefix}_hoodie)`}
                    stroke="#AC9CE3"
                    strokeWidth="0.7"
                  />
                  {/* Soft vertical side drape shading for lean tailored silhouette */}
                  <path
                    d="M 82.0 78 C 81.4 92 81.6 105 82.4 117"
                    fill="none"
                    stroke="rgba(130, 110, 190, 0.16)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 102.0 78 C 102.6 92 102.4 105 101.6 117"
                    fill="none"
                    stroke="rgba(130, 110, 190, 0.16)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* Snug waist ribbing */}
                  <path
                    d="M 78.8 118.0 Q 92 119.4 105.2 118.0 L 104.8 121.8 Q 92 123.2 79.2 121.8 Z"
                    fill={`url(#${boyPrefix}_hoodieShade)`}
                  />
                  {/* Neat draped hoodie collar fold */}
                  <path
                    d="M 82.2 70.0 C 85.4 76.0 98.6 76.0 101.8 70.0 C 98.6 67.6 85.4 67.6 82.2 70.0 Z"
                    fill="#C4B6F0"
                    stroke="#AC9CE3"
                    strokeWidth="0.6"
                  />
                  {/* Subtle tailored kangaroo pocket seam */}
                  <path
                    d="M 83.8 104.6 Q 92 103.4 100.2 104.6 L 101.8 115.6 Q 92 117.0 82.2 115.6 Z"
                    fill="rgba(148, 128, 206, 0.15)"
                    stroke="rgba(122, 102, 178, 0.30)"
                    strokeWidth="0.85"
                    strokeLinejoin="round"
                  />
                  {/* Slender tapered warm-ivory hoodie drawstrings */}
                  <path
                    d="M 89.2 73.2 C 88.6 79.0 89.0 84.4 89.5 89.2"
                    fill="none"
                    stroke="#FFFDF8"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 94.8 73.2 C 95.4 79.0 95.0 84.4 94.5 89.2"
                    fill="none"
                    stroke="#FFFDF8"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                  />
                  <rect x="88.8" y="88.6" width="1.4" height="2.4" rx="0.6" fill="#E6C690" />
                  <rect x="93.8" y="88.6" width="1.4" height="2.4" rx="0.6" fill="#E6C690" />

                  {/* Inner Right Arm — Casually Bent & Tucked Into Hoodie Pocket (smooth shoulder join) */}
                  <path
                    d="M 105.6 73.2
                       C 110.2 80.8 112.0 90.6 110.4 99.6
                       C 109.4 105.2 106.0 109.4 101.4 111.6
                       L 99.8 106.8
                       C 103.0 105.0 104.8 101.8 105.4 97.8
                       C 106.2 91.8 105.0 83.4 102.6 76.8 Z"
                    fill={`url(#${boyPrefix}_hoodie)`}
                    stroke="#A695DF"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                  {/* Soft inner sleeve cuff resting casually at pocket entry */}
                  <path
                    d="M 100.8 106.2 L 102.4 111.4 L 100.2 112.0 L 98.8 106.8 Z"
                    fill="#F2ECFD"
                    stroke="#BEB0EA"
                    strokeWidth="0.55"
                  />
                </g>

                {/* Boy Slender Neck & Soft-Jawed Expressive Head (pivot anchored at neck base 92, 69) */}
                <g
                  ref={boyHeadPivotRef}
                  style={{ transformOrigin: '92px 69px' }}
                >
                  {/* Clean slender neck with soft chin shadow */}
                  <path
                    d="M 88.4 59.5 L 95.6 59.5 L 96.0 70.4 Q 92 72.4 88.0 70.4 Z"
                    fill={`url(#${boyPrefix}_skin)`}
                  />
                  <path
                    d="M 88.4 61.6 Q 92 65.2 95.6 61.6 L 95.6 59.5 L 88.4 59.5 Z"
                    fill="rgba(190, 120, 105, 0.28)"
                  />

                  {/* Delicate ears */}
                  <ellipse cx="76.4" cy="44.8" rx="2.5" ry="3.6" fill={`url(#${boyPrefix}_skin)`} stroke="#E0AA8F" strokeWidth="0.55" />
                  <ellipse cx="107.6" cy="44.8" rx="2.5" ry="3.6" fill={`url(#${boyPrefix}_skin)`} stroke="#E0AA8F" strokeWidth="0.55" />

                  {/* Slim soft-jawed oval face */}
                  <path
                    d="M 76.6 41.2
                       C 76.6 28.0 82.8 22.4 92.0 22.4
                       C 101.2 22.4 107.4 28.0 107.4 41.2
                       C 107.4 52.6 101.8 61.0 92.0 62.2
                       C 82.2 61.0 76.6 52.6 76.6 41.2 Z"
                    fill={`url(#${boyPrefix}_skin)`}
                  />

                  {/* Softly Textured Slightly Tousled Espresso-Plum Hair (y top = 20.0) */}
                  <path
                    d="M 75.4 43.2
                       C 73.6 31.0 79.8 20.2 92.2 20.0
                       C 104.2 19.8 110.4 29.8 108.6 42.8
                       C 107.4 37.8 105.0 34.4 101.6 32.8
                       C 98.4 36.2 92.6 38.0 86.0 37.4
                       C 89.2 34.6 91.6 32.2 93.2 29.8
                       C 88.0 33.4 82.4 36.0 77.6 37.6
                       C 76.6 39.6 76.0 41.4 75.4 43.2 Z"
                    fill={`url(#${boyPrefix}_hair)`}
                  />
                  {/* Light side-swept tousled bangs + tapered sideburns */}
                  <path
                    d="M 85.2 26.8 C 93.0 26.0 101.0 29.2 106.2 35.4 C 100.6 34.8 94.8 35.4 88.6 38.2 C 86.8 34.6 85.6 30.6 85.2 26.8 Z"
                    fill={`url(#${boyPrefix}_hair)`}
                  />
                  <path
                    d="M 76.0 37.8 C 75.6 41.2 76.2 44.6 77.6 46.8 C 77.6 43.6 77.8 40.4 78.4 37.4 Z"
                    fill={`url(#${boyPrefix}_hair)`}
                  />
                  <path
                    d="M 108.0 37.8 C 108.4 41.2 107.8 44.6 106.4 46.8 C 106.4 43.6 106.2 40.4 105.6 37.4 Z"
                    fill={`url(#${boyPrefix}_hair)`}
                  />
                  {/* Subtle translucent hair-shine highlight arc (opacity 0.16) */}
                  <path
                    d="M 83.2 26.8 Q 92.0 23.0 100.8 27.0"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    opacity="0.16"
                  />

                  {/* Cute light relaxed eyebrows */}
                  <g fill="none" stroke="#3A1D30" strokeWidth="1.2" strokeLinecap="round">
                    <path d="M 81.8 38.8 Q 85.2 37.2 88.4 38.6" />
                    <path d="M 95.6 38.6 Q 98.8 37.2 102.2 38.8" />
                  </g>

                  {/* State A: Bright Glossy Friendly Eyes (with gentle idle blink) */}
                  <g ref={boyOpenEyesRef} style={{ opacity: 1 }}>
                    <g
                      className={isIdleBreathing ? 'animate-footer-eye-blink' : undefined}
                      style={{
                        transformOrigin: '92px 44.2px',
                        ['--footer-blink-dur' as string]: '4.6s',
                        ['--footer-blink-delay' as string]: '1.2s',
                      }}
                    >
                      {[85.2, 98.8].map((cx) => (
                        <g key={cx}>
                          <ellipse cx={cx} cy="44.2" rx="2.95" ry="3.45" fill="#FFF9F7" />
                          <ellipse cx={cx} cy="44.2" rx="2.7" ry="3.25" fill={`url(#${boyPrefix}_iris)`} />
                          <path
                            d={`M ${cx - 3.0} 42.6 Q ${cx} 40.1 ${cx + 3.0} 42.6`}
                            fill="none"
                            stroke="#260D20"
                            strokeWidth="1.35"
                            strokeLinecap="round"
                          />
                          <circle cx={cx - 0.9} cy="42.9" r="1.15" fill="#FFFFFF" />
                          <circle cx={cx + 0.95} cy="45.6" r="0.52" fill="#FFFFFF" opacity="0.88" />
                        </g>
                      ))}
                    </g>
                  </g>

                  {/* State B: Warm Chuckle-Nod Happy Eyes */}
                  <g ref={boyHappyEyesRef} style={{ opacity: 0 }}>
                    <path
                      d="M 82.0 44.8 Q 85.2 40.6 88.4 44.8"
                      fill="none"
                      stroke="#3A1233"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 95.6 44.8 Q 98.8 40.6 102.0 44.8"
                      fill="none"
                      stroke="#3A1233"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Subtle tiny nose shadow */}
                  <ellipse cx="92" cy="48.2" rx="0.9" ry="0.52" fill="rgba(182, 114, 96, 0.30)" />

                  {/* Subtle feathered warm cheek blush */}
                  <ellipse cx="81.6" cy="49.8" rx="4.4" ry="2.5" fill={`url(#${boyPrefix}_blush)`} opacity="0.72" />
                  <ellipse cx="102.4" cy="49.8" rx="4.4" ry="2.5" fill={`url(#${boyPrefix}_blush)`} opacity="0.72" />

                  {/* Warm cheerful best-friend grin */}
                  <path
                    d="M 87.6 53.0 Q 92.2 57.2 96.8 52.8"
                    fill="none"
                    stroke="#6B2F4D"
                    strokeWidth="1.55"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 96.4 52.5 Q 97.4 52.0 97.6 51.4"
                    fill="none"
                    stroke="#6B2F4D"
                    strokeWidth="1.05"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                </g>
              </g>

              {/* ============================================================
                  CHARACTER 2 (RIGHT): PETITE 5'2" ANAMIKA (y = 46..186)
                  Matching AnamikaTeen's slender, ultra-cute pastel storybook art
                  ============================================================ */}
              <g ref={girlRootRef} data-character="footerGirl">
                {/* Slender Flowing Layered Espresso-Plum Back Hair (slim waist stays clearly visible!) */}
                <g
                  ref={girlBackHairRef}
                  style={{ transformOrigin: '166px 65px' }}
                >
                  {/* Soft inner depth layer tucked cleanly behind upper back */}
                  <path
                    d="M 153.2 66 C 151.4 85 152.2 103 154.2 119 Q 166 123 177.8 119 C 179.8 103 180.6 85 178.8 66 Z"
                    fill={`url(#${girlPrefix}_hairDeep)`}
                  />
                  {/* Left layered tapered back lock curving lightly outward only near tips */}
                  <path
                    d="M 152.0 64.5
                       C 149.2 82.5 150.8 103 152.0 119
                       C 152.6 126.5 150.2 133 147.6 137.4
                       C 151.8 135.8 155.4 131.6 156.8 124.8
                       C 158.0 117 157.8 100 157.6 86 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                  />
                  {/* Right layered tapered back lock curving lightly outward only near tips */}
                  <path
                    d="M 180.0 64.5
                       C 182.8 82.5 181.2 103 180.0 119
                       C 179.4 126.5 181.8 133 184.4 137.4
                       C 180.2 135.8 176.6 131.6 175.2 124.8
                       C 174.0 117 174.2 100 174.4 86 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                  />
                  {/* Secondary wispy lower hair tips + soft silk highlight */}
                  <path
                    d="M 153.8 120 C 154.4 127.5 153.0 134 150.8 139.2 C 154.2 137 157.2 132 158.4 125.5 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                    opacity="0.92"
                  />
                  <path
                    d="M 178.2 120 C 177.6 127.5 179.0 134 181.2 139.2 C 177.8 137 174.8 132 173.6 125.5 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                    opacity="0.92"
                  />
                </g>

                {/* Slender Tapered Pastel Rose-Plum Churidar & Petite Almond Rose-Berry Jootis */}
                <g>
                  {/* Left tapered pastel rose-plum churidar leg */}
                  <path
                    d="M 157.2 147.2
                       L 164.0 147.2
                       C 163.8 158.0 163.4 168.4 162.8 177.0
                       Q 161.0 178.2 159.0 177.0
                       C 158.4 168.4 157.6 158.0 157.2 147.2 Z"
                    fill={`url(#${girlPrefix}_churidar)`}
                    stroke="#7D4C66"
                    strokeWidth="0.55"
                  />
                  {/* Right tapered pastel rose-plum churidar leg */}
                  <path
                    d="M 168.0 147.2
                       L 174.8 147.2
                       C 174.4 158.0 173.6 168.4 173.0 177.0
                       Q 171.0 178.2 169.2 177.0
                       C 168.6 168.4 168.2 158.0 168.0 147.2 Z"
                    fill={`url(#${girlPrefix}_churidar)`}
                    stroke="#7D4C66"
                    strokeWidth="0.55"
                  />
                  {/* Subtle pastel highlight + churidar ankle gathers */}
                  <path d="M 159.2 174.4 Q 160.9 175.4 162.7 174.4" fill="none" stroke="#C999B2" strokeWidth="0.75" strokeLinecap="round" opacity="0.65" />
                  <path d="M 169.3 174.4 Q 171.1 175.4 172.8 174.4" fill="none" stroke="#C999B2" strokeWidth="0.75" strokeLinecap="round" opacity="0.65" />

                  {/* Delicate warm peach ankles peeking into petite almond jootis */}
                  <path d="M 159.4 176.8 L 162.6 176.8 L 162.4 180.8 L 159.6 180.8 Z" fill={`url(#${girlPrefix}_armSkin)`} />
                  <path d="M 169.4 176.8 L 172.6 176.8 L 172.4 180.8 L 169.6 180.8 Z" fill={`url(#${girlPrefix}_armSkin)`} />

                  {/* Petite almond-shaped left rose-berry jooti (grounded strictly at y = 186.0) */}
                  <path
                    d="M 154.0 183.4
                       C 154.0 180.8 156.6 179.4 159.6 179.6
                       C 162.2 179.8 164.0 181.2 164.0 183.4
                       C 164.0 185.3 162.0 186.0 158.8 186.0
                       C 155.6 186.0 154.0 185.0 154.0 183.4 Z"
                    fill={`url(#${girlPrefix}_jooti)`}
                    stroke="#96234E"
                    strokeWidth="0.6"
                  />
                  {/* Petite almond-shaped right rose-berry jooti (grounded strictly at y = 186.0) */}
                  <path
                    d="M 168.0 183.4
                       C 168.0 181.2 169.8 179.8 172.4 179.6
                       C 175.4 179.4 178.0 180.8 178.0 183.4
                       C 178.0 185.0 176.4 186.0 173.2 186.0
                       C 170.0 186.0 168.0 185.3 168.0 183.4 Z"
                    fill={`url(#${girlPrefix}_jooti)`}
                    stroke="#96234E"
                    strokeWidth="0.6"
                  />
                  {/* Satin highlight + tiny champagne-gold jooti motif */}
                  <path d="M 155.8 182.4 Q 158.6 180.8 161.6 181.8" fill="none" stroke="#FFD9E9" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
                  <path d="M 170.4 181.8 Q 173.4 180.8 176.2 182.4" fill="none" stroke="#FFD9E9" strokeWidth="0.9" strokeLinecap="round" opacity="0.75" />
                  <path d="M 158.0 182.9 L 159.1 182.1 L 160.2 182.9 L 159.1 183.7 Z" fill="#F7D994" />
                  <path d="M 171.8 182.9 L 172.9 182.1 L 174.0 182.9 L 172.9 183.7 Z" fill="#F7D994" />
                </g>

                {/* Inner Left Arm — Graceful Relaxed Pose by Side/Waist */}
                <g
                  ref={girlInnerArmRef}
                  style={{ transformOrigin: '156px 93px' }}
                >
                  <path
                    d="M 156.2 92.4
                       C 152.0 98.8 150.2 108.4 150.8 119.6
                       L 153.6 119.4
                       C 153.2 109.4 154.6 101.0 157.8 95.4 Z"
                    fill={`url(#${girlPrefix}_armSkin)`}
                    stroke="#D69A7D"
                    strokeWidth="0.72"
                    strokeLinejoin="round"
                  />
                  {/* Delicate gold wrist bangle */}
                  <path d="M 150.8 117.2 L 153.6 117.0" stroke="#E6B85C" strokeWidth="1.1" strokeLinecap="round" />
                  {/* Cute dainty relaxed hand */}
                  <path
                    d="M 150.8 119.5 C 150.2 121.4 150.7 123.5 152.0 123.7 C 153.4 123.8 154.2 122.4 153.8 119.6 Z"
                    fill={`url(#${girlPrefix}_armSkin)`}
                    stroke="#D69A7D"
                    strokeWidth="0.7"
                  />
                </g>

                {/* Outer Right Arm — Joyful Petite Friendly Wave (pivots smoothly at shoulder (176, 94)) */}
                <g
                  ref={girlWaveArmRef}
                  style={{ transformOrigin: '176px 94px' }}
                >
                  <path
                    d="M 175.6 93.4
                       C 181.2 96.4 185.6 94.6 188.2 88.2
                       C 189.4 85.2 190.4 82.0 191.0 79.4
                       L 188.0 78.8
                       C 187.2 81.2 186.4 83.8 185.4 86.2
                       C 183.6 90.2 180.6 91.2 175.0 89.6 Z"
                    fill={`url(#${girlPrefix}_armSkin)`}
                    stroke="#D69A7D"
                    strokeWidth="0.75"
                    strokeLinejoin="round"
                  />
                  {/* Delicate fitted right pastel flutter sleeve following her waving arm */}
                  <path
                    d="M 175.6 90.0 C 179.8 91.0 182.6 92.2 183.2 94.8 L 177.6 96.0 L 174.8 93.0 Z"
                    fill="#FFF7FA"
                    stroke="#E9AAC6"
                    strokeWidth="0.72"
                  />
                  {/* Delicate gold wrist bangle */}
                  <path d="M 187.6 81.4 L 190.8 82.0" stroke="#E6B85C" strokeWidth="1.15" strokeLinecap="round" />
                  {/* Cute dainty open waving hand (palm + delicate thumb) */}
                  <path
                    d="M 187.6 79.2
                       C 187.0 77.2 187.4 74.6 188.6 74.2
                       C 189.6 73.9 190.4 74.8 190.8 76.0
                       C 191.4 74.8 192.4 74.6 193.0 75.6
                       C 193.5 76.8 192.8 78.8 191.4 79.8
                       C 190.2 80.4 188.4 80.2 187.6 79.2 Z"
                    fill={`url(#${girlPrefix}_armSkin)`}
                    stroke="#D69A7D"
                    strokeWidth="0.72"
                    strokeLinejoin="round"
                  />
                </g>

                {/* Tailored Slender-Waisted Pastel Rose-Ivory Anarkali Kurti + Sheer Dupatta */}
                <g>
                  {/* Fitted delicate left kurti sleeve */}
                  <path
                    d="M 156.4 90.4 C 152.8 92.6 150.8 97.2 151.4 102.2 L 156.0 101.0 C 156.4 97.0 157.0 93.8 157.6 91.2 Z"
                    fill="#FFF7FA"
                    stroke="#E9AAC6"
                    strokeWidth="0.7"
                  />

                  {/* Slim-waisted Anarkali kurti (narrow shoulders -> inward waist taper -> soft pleated A-line skirt) */}
                  <path
                    d="M 155.8 90.8
                       Q 166 89.0 176.2 90.8
                       C 175.6 98.8 174.2 106.8 173.4 113.4
                       C 176.4 126.4 179.8 139.2 182.2 151.2
                       Q 166 155.4 149.8 151.2
                       C 152.2 139.2 155.6 126.4 158.6 113.4
                       C 157.8 106.8 156.4 98.8 155.8 90.8 Z"
                    fill={`url(#${girlPrefix}_kurti)`}
                    stroke="#E8ABC6"
                    strokeWidth="0.7"
                  />

                  {/* Subtle vertical soft-pleat shading folds on A-line skirt */}
                  <path d="M 162.2 115.4 C 161.2 127.8 159.6 139.6 157.8 151.0" fill="none" stroke="rgba(220, 138, 174, 0.24)" strokeWidth="1.1" strokeLinecap="round" />
                  <path d="M 166.0 115.8 L 166.0 152.2" fill="none" stroke="rgba(220, 138, 174, 0.20)" strokeWidth="1.0" strokeLinecap="round" />
                  <path d="M 169.8 115.4 C 170.8 127.8 172.4 139.6 174.2 151.0" fill="none" stroke="rgba(220, 138, 174, 0.24)" strokeWidth="1.1" strokeLinecap="round" />

                  {/* Delicate scalloped neckline & champagne-gold embroidery trim */}
                  <path d="M 160.8 90.8 Q 163.4 95.4 166 96.8 Q 168.6 95.4 171.2 90.8" fill="none" stroke="#E6B85C" strokeWidth="1.45" strokeLinecap="round" />
                  <circle cx="166" cy="97.1" r="1.15" fill="#D94B7D" />
                  <circle cx="163.2" cy="94.8" r="0.75" fill="#F3C969" />
                  <circle cx="168.8" cy="94.8" r="0.75" fill="#F3C969" />

                  {/* Subtle gold waist piping */}
                  <path d="M 158.7 113.4 Q 166 115.6 173.3 113.4" fill="none" stroke="#E8BD68" strokeWidth="1.05" strokeLinecap="round" opacity="0.82" />

                  {/* Champagne-gold gota hem trim */}
                  <path d="M 150.8 148.8 Q 166 153.0 181.2 148.8" fill="none" stroke="#E6B85C" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M 151.8 146.4 Q 166 150.2 180.2 146.4" fill="none" stroke="#F6D893" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1.8 2.6" opacity="0.9" />

                  {/* Light semi-sheer blush-rose chiffon dupatta (opacity 0.78) neatly pleated over left shoulder */}
                  <g opacity="0.78">
                    <path
                      d="M 155.6 90.8
                         L 160.2 90.8
                         C 159.2 104.2 157.4 118.8 154.6 133.8
                         C 153.4 139.4 151.6 144.2 149.6 147.6
                         L 146.0 145.4
                         C 148.6 138.8 150.8 128.4 152.8 116.6
                         C 154.2 107.4 155.2 98.4 155.6 90.8 Z"
                      fill={`url(#${girlPrefix}_dupatta)`}
                    />
                    {/* Slim diagonal drape hugging bodice */}
                    <path
                      d="M 159.6 92.0 C 161.6 100.4 165.4 108.0 172.4 112.6 L 171.2 114.2 C 164.0 109.6 159.8 102.4 157.8 93.4 Z"
                      fill={`url(#${girlPrefix}_dupatta)`}
                      opacity="0.65"
                    />
                    <path d="M 155.6 91.6 C 154.2 109.8 151.2 128.8 146.5 145.4" fill="none" stroke="#F7D994" strokeWidth="0.95" strokeLinecap="round" />
                  </g>
                </g>

                {/* Girl Dainty Neck & Expressive Face matching AnamikaTeen (pivot anchored at neck base 166, 90) */}
                <g
                  ref={girlHeadPivotRef}
                  style={{ transformOrigin: '166px 90px' }}
                >
                  {/* Dainty slender neck + soft chin shadow */}
                  <path
                    d="M 163.2 82.0 L 168.8 82.0 L 169.2 91.4 Q 166 93.2 162.8 91.4 Z"
                    fill={`url(#${girlPrefix}_skin)`}
                  />
                  <path
                    d="M 163.1 84.0 Q 166 87.2 168.9 84.0 L 168.9 82.0 L 163.1 82.0 Z"
                    fill="rgba(190, 120, 105, 0.28)"
                  />

                  {/* Delicate ears */}
                  <ellipse cx="151.4" cy="68.8" rx="2.0" ry="3.0" fill={`url(#${girlPrefix}_skin)`} stroke="#E0AA8F" strokeWidth="0.52" />
                  <ellipse cx="180.6" cy="68.8" rx="2.0" ry="3.0" fill={`url(#${girlPrefix}_skin)`} stroke="#E0AA8F" strokeWidth="0.52" />

                  {/* Slim soft heart/oval face with gentle tapered chin */}
                  <path
                    d="M 151.6 64.0
                       C 151.6 52.0 157.2 47.6 166.0 47.6
                       C 174.8 47.6 180.4 52.0 180.4 64.0
                       C 180.4 74.2 175.4 82.6 166.0 83.8
                       C 156.6 82.6 151.6 74.2 151.6 64.0 Z"
                    fill={`url(#${girlPrefix}_skin)`}
                  />

                  {/* Soft parted espresso-silk crown hair & curtain bangs (top at y = 46.0) */}
                  <path
                    d="M 149.2 66.8
                       C 148.6 51.6 155.0 46.0 166.0 46.0
                       C 177.0 46.0 183.4 51.6 182.8 66.8
                       C 180.6 58.6 175.4 54.4 166.4 53.4
                       Q 166.0 55.0 165.6 53.4
                       C 156.6 54.4 151.4 58.6 149.2 66.8 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                  />
                  {/* Wispy cheek-slimming face-framing side strands */}
                  <path
                    d="M 150.8 62.4 C 149.4 73.2 150.6 83.8 153.2 90.2 C 153.0 82.6 152.2 74.2 153.4 64.4 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                  />
                  <path
                    d="M 181.2 62.4 C 182.6 73.2 181.4 83.8 178.8 90.2 C 179.0 82.6 179.8 74.2 178.6 64.4 Z"
                    fill={`url(#${girlPrefix}_hair)`}
                  />
                  {/* Sweeping wispy curtain bangs */}
                  <path d="M 158.8 54.4 Q 154.2 58.0 152.4 63.6 Q 155.4 59.8 160.2 55.4 Z" fill={`url(#${girlPrefix}_hair)`} />
                  <path d="M 173.2 54.4 Q 177.8 58.0 179.6 63.6 Q 176.6 59.8 171.8 55.4 Z" fill={`url(#${girlPrefix}_hair)`} />

                  {/* Tiny golden jhumka / pearl-drop earrings peeking beneath her side strands */}
                  <g>
                    <circle cx="151.2" cy="72.4" r="0.9" fill="#F3C969" />
                    <path d="M 149.7 75.2 Q 151.2 72.9 152.7 75.2 Z" fill="#F6CF72" stroke="#C88B2E" strokeWidth="0.42" />
                    <circle cx="151.2" cy="76.4" r="1.05" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.42" />

                    <circle cx="180.8" cy="72.4" r="0.9" fill="#F3C969" />
                    <path d="M 179.3 75.2 Q 180.8 72.9 182.3 75.2 Z" fill="#F6CF72" stroke="#C88B2E" strokeWidth="0.42" />
                    <circle cx="180.8" cy="76.4" r="1.05" fill="#FFFDF9" stroke="#E6B85C" strokeWidth="0.42" />
                  </g>

                  {/* Delicate translucent curved silk crown shine arcs (opacity 0.19) */}
                  <path d="M 155.2 53.4 Q 159.8 50.2 164.0 52.4" fill="none" stroke="#FFFFFF" strokeWidth="1.45" strokeLinecap="round" opacity="0.20" />
                  <path d="M 168.0 52.4 Q 172.2 50.2 176.8 53.4" fill="none" stroke="#FFFFFF" strokeWidth="1.45" strokeLinecap="round" opacity="0.20" />

                  {/* Petite sparkling rose-maroon bindi */}
                  <circle cx="166" cy="59.4" r="1.75" fill="#C9376B" />
                  <circle cx="165.5" cy="58.9" r="0.52" fill="#FFF7FB" opacity="0.92" />

                  {/* Dainty thin curved eyebrows */}
                  <g fill="none" stroke="#3A1A2F" strokeWidth="1.05" strokeLinecap="round">
                    <path d="M 156.2 62.2 Q 159.3 60.4 162.4 62.0" />
                    <path d="M 169.6 62.0 Q 172.7 60.4 175.8 62.2" />
                  </g>

                  {/* State A: Sparkling Glossy Eyes (deep plum iris + starlight catchlights + dainty lash flicks + idle blink) */}
                  <g ref={girlOpenEyesRef} style={{ opacity: 1 }}>
                    <g
                      className={isIdleBreathing ? 'animate-footer-eye-blink' : undefined}
                      style={{
                        transformOrigin: '166px 67.6px',
                        ['--footer-blink-dur' as string]: '4.1s',
                        ['--footer-blink-delay' as string]: '0.3s',
                      }}
                    >
                      {[159.4, 172.6].map((cx, idx) => (
                        <g key={cx}>
                          <ellipse cx={cx} cy="67.6" rx="2.9" ry="3.4" fill="#FFF9F7" />
                          <ellipse cx={cx} cy="67.6" rx="2.65" ry="3.2" fill={`url(#${girlPrefix}_iris)`} />
                          <path
                            d={`M ${cx - 1.65} 69.2 Q ${cx} 70.3 ${cx + 1.65} 69.2`}
                            fill="none"
                            stroke="#C46AA0"
                            strokeWidth="1.0"
                            strokeLinecap="round"
                            opacity="0.58"
                          />
                          <path
                            d={`M ${cx - 2.9} 66.1 Q ${cx} 63.6 ${cx + 2.9} 66.1`}
                            fill="none"
                            stroke="#2B0E24"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                          <path
                            d={
                              idx === 0
                                ? `M ${cx - 2.8} 65.9 L ${cx - 4.0} 64.7`
                                : `M ${cx + 2.8} 65.9 L ${cx + 4.0} 64.7`
                            }
                            fill="none"
                            stroke="#2B0E24"
                            strokeWidth="1.0"
                            strokeLinecap="round"
                          />
                          <circle cx={cx - 0.85} cy="66.3" r="1.15" fill="#FFFFFF" />
                          <circle cx={cx + 0.95} cy="68.9" r="0.5" fill="#FFFFFF" opacity="0.9" />
                        </g>
                      ))}
                    </g>
                  </g>

                  {/* State B: Joyful Happy Eye-Blink Crescent Smile Eyes */}
                  <g ref={girlHappyEyesRef} style={{ opacity: 0 }}>
                    <path d="M 156.2 68.4 Q 159.4 64.2 162.6 68.4" fill="none" stroke="#3A1233" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 169.4 68.4 Q 172.6 64.2 175.8 68.4" fill="none" stroke="#3A1233" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M 156.3 68.0 L 154.9 66.8" fill="none" stroke="#3A1233" strokeWidth="1.0" strokeLinecap="round" />
                    <path d="M 175.7 68.0 L 177.1 66.8" fill="none" stroke="#3A1233" strokeWidth="1.0" strokeLinecap="round" />
                  </g>

                  {/* Tiny subtle nose dot */}
                  <ellipse cx="166" cy="71.2" rx="0.8" ry="0.48" fill="rgba(182, 114, 96, 0.34)" />

                  {/* Soft feathered radial rose blush (#FF8CAE -> transparent) */}
                  <ellipse cx="155.4" cy="72.4" rx="4.2" ry="2.5" fill={`url(#${girlPrefix}_blush)`} opacity="0.78" />
                  <ellipse cx="176.6" cy="72.4" rx="4.2" ry="2.5" fill={`url(#${girlPrefix}_blush)`} opacity="0.78" />

                  {/* Sweet warm beaming smile */}
                  <g>
                    <path
                      d="M 161.8 75.4 Q 166.0 80.6 170.2 75.4 Q 166.0 76.4 161.8 75.4 Z"
                      fill="#A93C66"
                    />
                    <ellipse cx="166" cy="77.9" rx="2.0" ry="1.05" fill="#F79BBF" />
                    <path
                      d="M 161.6 75.3 Q 166.0 76.5 170.4 75.3"
                      fill="none"
                      stroke="#8D2C52"
                      strokeWidth="0.95"
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              </g>
            </g>

            {/* ============================================================
                LAYER 3: Platonic Pastel Sparkle Accents (Zero Red Hearts!)
                ============================================================ */}
            <g data-layer="microParticles" className="pointer-events-none">
              {/* Tiny champagne-gold & rose sparkle popping near Girl's waving hand */}
              <g
                ref={girlHandSparkleRef}
                data-testid="footer-girl-wave-sparkle"
                style={{ opacity: 0, transformOrigin: '198px 72px' }}
              >
                <path
                  d="M 198 66.2 L 199.1 70.1 L 203.0 71.2 L 199.1 72.3 L 198 76.2 L 196.9 72.3 L 193.0 71.2 L 196.9 70.1 Z"
                  fill="#F3C46B"
                />
                <circle cx="194.2" cy="66.2" r="1.3" fill="#E86A98" />
                <circle cx="202.2" cy="76.4" r="1.0" fill="#C9B5EE" />
              </g>

              {/* 3 Subtle Floating Platonic Pastel Stars & Sparkle Flecks Above Them */}
              <g
                ref={ambientSparkle1Ref}
                data-testid="footer-ambient-sparkle-1"
                style={{ opacity: 0, transformOrigin: '126px 26px' }}
              >
                <path
                  d="M 126 21.0 L 126.9 24.4 L 130.3 25.3 L 126.9 26.2 L 126 29.6 L 125.1 26.2 L 121.7 25.3 L 125.1 24.4 Z"
                  fill="#E6B85C"
                />
              </g>

              <g
                ref={ambientSparkle2Ref}
                data-testid="footer-ambient-sparkle-2"
                style={{ opacity: 0, transformOrigin: '139px 38px' }}
              >
                <path
                  d="M 139 34.2 L 139.7 36.8 L 142.3 37.5 L 139.7 38.2 L 139 40.8 L 138.3 38.2 L 135.7 37.5 L 138.3 36.8 Z"
                  fill="#C4B4EE"
                />
              </g>

              <g
                ref={ambientSparkle3Ref}
                data-testid="footer-ambient-sparkle-3"
                style={{ opacity: 0, transformOrigin: '52px 48px' }}
              >
                <circle cx="52" cy="48" r="2.0" fill="#F2A7C6" />
                <circle cx="47.5" cy="52.5" r="1.2" fill="#E6B85C" />
              </g>
            </g>
            </svg>
          </span>

          {/* Tactile "Tap to replay" Cue Pill (inside the same high-priority semantic button) */}
          <span
            data-testid="footer-replay-hint"
            className="mt-2.5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#EBC5D6]/85 bg-[#FFFDFB]/92 px-4 py-2 text-[clamp(12px,1.6vw,14.5px)] font-medium text-[#8B5973] shadow-[0_3px_10px_-6px_rgba(181,44,92,0.28)] transition-all duration-150 select-none group-hover:border-[#DC8CAE] group-hover:bg-[#FFF5F9] group-hover:text-[#7A3558] group-active:scale-[0.96]"
          >
            <span
              key={replayCount}
              aria-hidden="true"
              className={`inline-flex items-center justify-center ${
                replayCount > 0 ? 'footer-replay-icon-spin' : ''
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M13.2 8.2A5.2 5.2 0 1 1 11.7 4.4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <path
                  d="M11.8 1.9V4.8H8.9"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Tap to replay</span>
          </span>
        </button>

        {/* Centered Slim Rose-Gold Hairline Divider */}
        <div
          aria-hidden="true"
          style={{
            width: 'clamp(48px, 8vw, 72px)',
            height: '1px',
            background: 'rgba(201, 59, 107, 0.28)',
            margin: '18px auto 15px',
          }}
        />

        {/* Editorial Creator Sign-Off Credit */}
        <p
          data-testid="footer-creator-credit"
          style={{
            fontSize: 'clamp(14.5px, 1.9vw, 19.5px)',
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
            fontSize: 'clamp(12px, 1.6vw, 15.5px)',
            color: '#9B7488',
            letterSpacing: '0.06em',
            marginTop: '5px',
          }}
        >
          Anamika&apos;s 17th &middot; 03 December 2026
        </p>
      </div>
    </footer>
  );
}
