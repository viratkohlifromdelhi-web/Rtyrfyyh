import { useEffect, useRef, useState } from 'react';
import {
  createSparklePool,
  getCappedDpr,
  getSparkleParticleCount,
  stepFadeOpacity,
  stepSparkleParticle,
  type SparkleParticle,
} from '../utils/sparkleRain';

interface SparkleRainCanvasProps {
  /** Whether the user has Sparkle Rain toggled ON */
  enabled: boolean;
  /** True while Opening Curtain Intro owns the screen */
  suppressed?: boolean;
}

/**
 * Draws an ultra-thin, delicate 4-point star glint centered at (0, 0).
 */
function drawDelicateStarGlint(
  ctx: CanvasRenderingContext2D,
  r: number,
  rgb: string,
  alpha: number,
): void {
  const inner = r * 0.16;
  ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(inner * 0.5, -inner * 0.5, r, 0);
  ctx.quadraticCurveTo(inner * 0.5, inner * 0.5, 0, r);
  ctx.quadraticCurveTo(-inner * 0.5, inner * 0.5, -r, 0);
  ctx.quadraticCurveTo(-inner * 0.5, -inner * 0.5, 0, -r);
  ctx.closePath();
  ctx.fill();
}

/**
 * Whisper-soft 60fps Global Sparkle Rain <canvas> Overlay.
 *
 * - Strictly positioned at `z-[1]` so sparkles drift smoothly through the open cream
 *   background margins and pass cleanly BEHIND Anamika's photo, text, buttons, and every card (`z-[2]+`).
 * - Zero React re-renders during animation; cancels RAF and clears cleanly over 350ms when toggled OFF.
 * - Automatically pauses when `document.hidden === true`.
 */
export function SparkleRainCanvas({
  enabled,
  suppressed = false,
}: SparkleRainCanvasProps) {
  const active = enabled && !suppressed;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const targetAlphaRef = useRef<number>(active ? 1 : 0);
  const currentAlphaRef = useRef<number>(active ? 1 : 0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameMsRef = useRef<number>(0);
  const elapsedSecRef = useRef<number>(0);
  const viewportRef = useRef<{ width: number; height: number; dpr: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    dpr:
      typeof window !== 'undefined'
        ? getCappedDpr(window.devicePixelRatio, window.innerWidth)
        : 1,
  });

  const [mounted, setMounted] = useState<boolean>(active);
  const [loopRunning, setLoopRunning] = useState<boolean>(false);

  useEffect(() => {
    if (suppressed) {
      targetAlphaRef.current = 0;
      currentAlphaRef.current = 0;
      setMounted(false);
      return;
    }

    targetAlphaRef.current = enabled ? 1 : 0;
    if (enabled) {
      currentAlphaRef.current = Math.max(currentAlphaRef.current, 0.55);
      setMounted(true);
    }
  }, [enabled, suppressed]);

  useEffect(() => {
    if (!mounted) {
      setLoopRunning(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncCanvasSize = (reseedIfEmpty: boolean) => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      const dpr = getCappedDpr(window.devicePixelRatio, width);
      const prevWidth = viewportRef.current.width;

      viewportRef.current = { width, height, dpr };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const desiredCount = getSparkleParticleCount(width);
      if (
        reseedIfEmpty ||
        particlesRef.current.length === 0 ||
        particlesRef.current.length !== desiredCount
      ) {
        particlesRef.current = createSparklePool(width, height);
      } else if (prevWidth > 0 && prevWidth !== width) {
        const ratio = width / prevWidth;
        for (const p of particlesRef.current) {
          p.baseX = Math.min(Math.max(p.baseX * ratio, 0), width);
        }
      }
    };

    syncCanvasSize(particlesRef.current.length === 0);

    const stopLoop = () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setLoopRunning(false);
    };

    const tick = (nowMs: number) => {
      if (document.hidden) {
        stopLoop();
        return;
      }

      const rawDtSec = lastFrameMsRef.current > 0 ? (nowMs - lastFrameMsRef.current) / 1000 : 0.016;
      lastFrameMsRef.current = nowMs;
      const dtSec = Math.min(Math.max(rawDtSec, 0), 0.05);
      elapsedSecRef.current += dtSec;

      const nextAlpha = stepFadeOpacity(currentAlphaRef.current, targetAlphaRef.current, rawDtSec);
      currentAlphaRef.current = nextAlpha;

      const { width, height } = viewportRef.current;
      ctx.clearRect(0, 0, width, height);

      if (nextAlpha <= 0.001 && targetAlphaRef.current === 0) {
        stopLoop();
        particlesRef.current = [];
        setMounted(false);
        return;
      }

      const pool = particlesRef.current;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        stepSparkleParticle(p, dtSec, elapsedSecRef.current, width, height);

        const alpha = p.opacity * nextAlpha;
        if (alpha <= 0.008) continue;

        ctx.save();
        ctx.translate(p.x, p.y);

        if (p.kind === 'diamond') {
          ctx.rotate(p.rotation);
          drawDelicateStarGlint(ctx, p.size, p.rgb, alpha);
        } else {
          // Slender crisp pinprick stardust dot (1.5px - 2.5px)
          ctx.fillStyle = `rgba(${p.rgb}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (document.hidden || rafIdRef.current !== null) return;
      lastFrameMsRef.current = 0;
      setLoopRunning(true);
      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    const handleResize = () => {
      syncCanvasSize(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (targetAlphaRef.current > 0 || currentAlphaRef.current > 0) {
        startLoop();
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    startLoop();

    return () => {
      stopLoop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      ctx.clearRect(0, 0, viewportRef.current.width, viewportRef.current.height);
    };
  }, [mounted]);

  if (!mounted || suppressed) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      data-testid="sparkle-rain-canvas"
      data-active={String(active)}
      data-running={String(loopRunning)}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] h-[100dvh] w-[100vw] select-none"
    />
  );
}
