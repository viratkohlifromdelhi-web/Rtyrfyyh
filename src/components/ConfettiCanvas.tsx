import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  spawnConfettiBurst,
  stepConfettiParticles,
  type ConfettiParticle,
} from '../utils/celebration';

export interface ConfettiCanvasHandle {
  pop: (originX?: number, originY?: number, count?: number) => void;
}

function drawStar(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const outerAngle = (i * Math.PI) / 2;
    const innerAngle = outerAngle + Math.PI / 4;
    const ox = Math.cos(outerAngle) * radius;
    const oy = Math.sin(outerAngle) * radius;
    const ix = Math.cos(innerAngle) * (radius * 0.35);
    const iy = Math.sin(innerAngle) * (radius * 0.35);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.55;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.7);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.9, -s * 1.1, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s * 1.1, s * 1.2, -s * 0.1, 0, s * 0.7);
  ctx.closePath();
  ctx.fill();
}

export const ConfettiCanvas = forwardRef<ConfettiCanvasHandle>(function ConfettiCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafRef = useRef<number | null>(null);
  const [burstCount, setBurstCount] = useState(0);

  const stopLoop = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const renderFrame = () => {
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

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    particlesRef.current = stepConfettiParticles(particlesRef.current, height);

    for (const p of particlesRef.current) {
      const alpha = Math.max(0, 1 - Math.pow(p.life / p.maxLife, 2));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size * 0.6, -p.size * 0.32, p.size * 1.2, p.size * 0.64);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, p.size * 0.65);
      } else {
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

  useImperativeHandle(ref, () => ({
    pop(originX?: number, originY?: number, count = 64) {
      setBurstCount((c) => c + 1);
      const x = originX ?? window.innerWidth * 0.5;
      const y = originY ?? window.innerHeight * 0.55;
      const newParticles = spawnConfettiBurst({
        originX: x,
        originY: y,
        count,
      });
      particlesRef.current = [...particlesRef.current, ...newParticles].slice(-110);
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(renderFrame);
      }
    },
  }));

  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="confetti-canvas"
      data-confetti-bursts={burstCount}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
});
