import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  MAX_CONFETTI_PARTICLES,
  spawnConfettiBurst,
  spawnSideCannons,
  stepConfettiParticles,
  type ConfettiParticle,
} from '../utils/celebration';
import { haptics } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

export interface ConfettiCanvasHandle {
  pop: (originX?: number, originY?: number, count?: number) => void;
  fireCannons: () => void;
}

function drawStar(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const outerAngle = (i * Math.PI) / 2;
    const innerAngle = outerAngle + Math.PI / 4;
    const ox = Math.cos(outerAngle) * radius;
    const oy = Math.sin(outerAngle) * radius;
    const ix = Math.cos(innerAngle) * (radius * 0.34);
    const iy = Math.sin(innerAngle) * (radius * 0.34);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.56;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.72);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.9, -s * 1.12, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s * 1.12, s * 1.2, -s * 0.1, 0, s * 0.72);
  ctx.closePath();
  ctx.fill();
}

export const ConfettiCanvas = forwardRef<ConfettiCanvasHandle>(function ConfettiCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const secondaryTimersRef = useRef<number[]>([]);
  const [burstCount, setBurstCount] = useState(0);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastFrameTimeRef.current = null;
  };

  const renderFrame = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      stopLoop();
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      stopLoop();
      return;
    }

    const prevTime = lastFrameTimeRef.current ?? now;
    lastFrameTimeRef.current = now;
    const dtMs = Math.min(48, Math.max(4, now - prevTime));
    const dtScale = dtMs / 16.667;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const targetW = Math.floor(width * dpr);
    const targetH = Math.floor(height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    particlesRef.current = stepConfettiParticles(particlesRef.current, height, dtScale);

    for (let i = 0; i < particlesRef.current.length; i++) {
      const p = particlesRef.current[i];
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio > 0.72 ? Math.max(0, 1 - (lifeRatio - 0.72) / 0.28) : 1;
      const tiltScale = Math.cos(p.tiltAngle);
      const scaleY = Math.abs(tiltScale) < 0.14 ? (tiltScale >= 0 ? 0.14 : -0.14) : tiltScale;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'ribbon') {
        ctx.scale(1, scaleY);
        ctx.fillRect(-p.size * 0.68, -p.size * 0.28, p.size * 1.36, p.size * 0.56);
      } else if (p.shape === 'foil') {
        ctx.scale(1, scaleY);
        const w = p.size * 1.15;
        const h = p.size * 0.62;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        // Glossy metallic glint shimmer when tilted near reflection angle
        const glint = Math.abs(tiltScale);
        if (glint > 0.68) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(glint - 0.68) * 1.75})`;
          ctx.fillRect(-w / 2, -h / 2, w * 0.45, h);
        }
      } else if (p.shape === 'circle') {
        ctx.scale(1, Math.max(0.35, Math.abs(tiltScale)));
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.44, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.scale(Math.max(0.3, Math.abs(tiltScale)), 1);
        drawStar(ctx, p.size * 0.68);
      } else {
        ctx.scale(Math.max(0.35, Math.abs(tiltScale)), 1);
        drawHeart(ctx, p.size);
      }

      ctx.restore();
    }

    if (particlesRef.current.length > 0) {
      rafRef.current = window.requestAnimationFrame(renderFrame);
    } else {
      ctx.clearRect(0, 0, width, height);
      stopLoop();
    }
  };

  const ensureRunning = () => {
    if (rafRef.current === null) {
      lastFrameTimeRef.current = null;
      rafRef.current = window.requestAnimationFrame(renderFrame);
    }
  };

  useImperativeHandle(ref, () => ({
    pop(originX?: number, originY?: number, count = 56) {
      setBurstCount((c) => c + 1);
      soundEngine.playConfettiPop('normal');
      const x = originX ?? window.innerWidth * 0.5;
      const y = originY ?? window.innerHeight * 0.52;
      const newParticles = spawnConfettiBurst({
        originX: x,
        originY: y,
        count,
      });
      particlesRef.current = [...particlesRef.current, ...newParticles].slice(
        -MAX_CONFETTI_PARTICLES,
      );
      ensureRunning();
    },

    fireCannons() {
      setBurstCount((c) => c + 1);
      soundEngine.playConfettiPop('cannon');
      haptics.confettiCannon();

      const primary = spawnSideCannons({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        countPerSide: 42,
      });
      particlesRef.current = [...particlesRef.current, ...primary].slice(
        -MAX_CONFETTI_PARTICLES,
      );
      ensureRunning();

      // Secondary celebratory mini-burst 180ms later
      const timerId = window.setTimeout(() => {
        secondaryTimersRef.current = secondaryTimersRef.current.filter((id) => id !== timerId);
        const secondary = spawnSideCannons({
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          countPerSide: 20,
        });
        particlesRef.current = [...particlesRef.current, ...secondary].slice(
          -MAX_CONFETTI_PARTICLES,
        );
        ensureRunning();
      }, 180);
      secondaryTimersRef.current.push(timerId);
    },
  }));

  useEffect(() => {
    return () => {
      stopLoop();
      secondaryTimersRef.current.forEach((id) => window.clearTimeout(id));
      secondaryTimersRef.current = [];
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      data-confetti-bursts={burstCount}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[10000] h-full w-full"
    />
  );
});
