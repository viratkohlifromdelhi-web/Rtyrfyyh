/**
 * Hero Photo Panel 3-Second Side Confetti Cannons (Strictly Once per Session).
 *
 * Fires dual left & right pastel cannons at 180ms intervals for 3000ms inside
 * a dedicated fixed pointer-events-none canvas at z-index 45, respecting
 * prefers-reduced-motion and cleaning up cleanly on unmount.
 */

export const HERO_PHOTO_CANNONS_KEY = 'hero_photo_cannons_fired_v1';
export const HERO_CANNON_DURATION_MS = 3000;
export const HERO_CANNON_INTERVAL_MS = 180;
export const HERO_CANNON_PALETTE = [
  '#D94B7D',
  '#F8C8DC',
  '#FCE8B2',
  '#DDD0F4',
  '#E6B85C',
] as const;

export interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CannonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  shape: 'ribbon' | 'foil' | 'circle' | 'star' | 'heart';
  lifeSec: number;
  maxLifeSec: number;
  gravity: number;
  drag: number;
}

/**
 * Strictly-once session guard backed by both an in-memory ref and sessionStorage.
 * Returns `true` ONLY on the very first interaction; every subsequent call returns `false`.
 */
export function tryConsumeHeroPhotoCannons(
  firedRef: { current: boolean },
  storage?: SessionStorageLike | null,
): boolean {
  if (firedRef.current) return false;

  const store =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined'
        ? window.sessionStorage
        : null;

  try {
    if (store?.getItem(HERO_PHOTO_CANNONS_KEY) === 'true') {
      firedRef.current = true;
      return false;
    }
    firedRef.current = true;
    store?.setItem(HERO_PHOTO_CANNONS_KEY, 'true');
    return true;
  } catch {
    firedRef.current = true;
    return true;
  }
}

const SHAPES: readonly CannonParticle['shape'][] = ['ribbon', 'foil', 'circle', 'star', 'heart'];

/**
 * Spawns one paired left/right cannon volley matching the exact pastel palette and launch cones:
 * - Left cannon: x = 0, y = 0.65 * H, angle 58°–65° (upward-right), spread 52°
 * - Right cannon: x = W, y = 0.65 * H, angle 115°–122° (upward-left), spread 52°
 */
export function spawnHeroCannonVolley(params: {
  viewportWidth: number;
  viewportHeight: number;
  countPerSide: number;
  reducedMotion?: boolean;
  rng?: () => number;
}): CannonParticle[] {
  const rng = params.rng ?? Math.random;
  const out: CannonParticle[] = [];
  const originY = params.viewportHeight * 0.65;
  const speedScale = params.reducedMotion ? 0.58 : 1;
  const baseSpeed = Math.min(920, Math.max(540, params.viewportWidth * 1.15)) * speedScale;

  const spawnSide = (side: 'left' | 'right') => {
    const originX = side === 'left' ? 0 : params.viewportWidth;
    // Standard mathematical angle above +x axis:
    // Left aims 58°–65° (up & right); Right aims 115°–122° (up & left)
    const centerDeg = side === 'left' ? 58 + rng() * 7 : 115 + rng() * 7;
    const spreadDeg = 52;

    for (let i = 0; i < params.countPerSide; i++) {
      const deg = centerDeg + (rng() - 0.5) * spreadDeg;
      const rad = (deg * Math.PI) / 180;
      const speed = baseSpeed * (0.58 + rng() * 0.62);
      const color = HERO_CANNON_PALETTE[Math.floor(rng() * HERO_CANNON_PALETTE.length)];
      const shape = SHAPES[Math.floor(rng() * SHAPES.length)];

      out.push({
        x: originX,
        y: originY + (rng() - 0.5) * 26,
        vx: Math.cos(rad) * speed,
        vy: -Math.sin(rad) * speed,
        size: 6.5 + rng() * 6.5,
        color,
        rotation: rng() * Math.PI * 2,
        rotationSpeed: (rng() - 0.5) * 9.5,
        tiltAngle: rng() * Math.PI * 2,
        tiltSpeed: 4 + rng() * 7,
        shape,
        lifeSec: 0,
        maxLifeSec: params.reducedMotion ? 1.15 + rng() * 0.45 : 1.75 + rng() * 1.05,
        gravity: params.reducedMotion ? 460 : 760 + rng() * 180,
        drag: 0.984,
      });
    }
  };

  spawnSide('left');
  spawnSide('right');
  return out;
}

export function stepHeroCannonParticles(
  particles: CannonParticle[],
  viewportHeight: number,
  dtSec: number,
): CannonParticle[] {
  const dt = Math.min(0.05, Math.max(0.001, dtSec));
  const dragFactor = Math.pow(0.984, dt * 60);
  const next: CannonParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.lifeSec += dt;
    if (p.lifeSec >= p.maxLifeSec) continue;

    p.vx *= dragFactor;
    p.vy = p.vy * dragFactor + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.rotationSpeed * dt;
    p.tiltAngle += p.tiltSpeed * dt;

    if (p.y > viewportHeight + 60) continue;
    next.push(p);
  }

  return next;
}

function drawStar(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const outer = (i * Math.PI) / 2;
    const inner = outer + Math.PI / 4;
    const ox = Math.cos(outer) * radius;
    const oy = Math.sin(outer) * radius;
    const ix = Math.cos(inner) * (radius * 0.36);
    const iy = Math.sin(inner) * (radius * 0.36);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, size: number) {
  const s = size * 0.52;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.72);
  ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.9, -s * 1.12, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s * 1.12, s * 1.2, -s * 0.1, 0, s * 0.72);
  ctx.closePath();
  ctx.fill();
}

/**
 * Mounts a lightweight fixed `<canvas>` at z-index 45 (`pointer-events: none`),
 * fires dual side confetti cannons every 180ms for exactly 3000ms (or a single
 * gentle pop when `prefers-reduced-motion: reduce`), and automatically tears down
 * the canvas when all particles settle. Returns an unmount cleanup callback.
 */
export function launchHeroSideConfettiCannons(options?: {
  reducedMotion?: boolean;
  onComplete?: () => void;
}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const reducedMotion =
    options?.reducedMotion ??
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('data-testid', 'hero-side-cannons-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '45';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  let rafId: number | null = null;
  let disposed = false;
  let particles: CannonParticle[] = [];

  const startTs = performance.now();
  let lastFrameTs = startTs;
  let lastBurstTs = -Infinity;

  const fireVolley = (now: number) => {
    lastBurstTs = now;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const countPerSide = reducedMotion ? 10 : 12;
    const volley = spawnHeroCannonVolley({
      viewportWidth: vw,
      viewportHeight: vh,
      countPerSide,
      reducedMotion,
    });
    particles = [...particles, ...volley].slice(-260);
  };

  // Immediate first volley on frame 0
  fireVolley(startTs);

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    canvas.remove();
    options?.onComplete?.();
  };

  const render = (now: number) => {
    if (disposed) return;

    const elapsedMs = now - startTs;
    const dtSec = Math.min(0.05, Math.max(0.001, (now - lastFrameTs) / 1000));
    lastFrameTs = now;

    if (!reducedMotion && elapsedMs < HERO_CANNON_DURATION_MS) {
      if (now - lastBurstTs >= HERO_CANNON_INTERVAL_MS) {
        fireVolley(now);
      }
    }

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

    particles = stepHeroCannonParticles(particles, height, dtSec);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const lifeRatio = p.lifeSec / p.maxLifeSec;
      const alpha = lifeRatio > 0.72 ? Math.max(0, 1 - (lifeRatio - 0.72) / 0.28) : 1;
      const tiltCos = Math.cos(p.tiltAngle);
      const scaleY = Math.abs(tiltCos) < 0.16 ? (tiltCos >= 0 ? 0.16 : -0.16) : tiltCos;

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
        ctx.fillRect(-p.size * 0.56, -p.size * 0.32, p.size * 1.12, p.size * 0.64);
        if (Math.abs(tiltCos) > 0.68) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(Math.abs(tiltCos) - 0.68) * 1.7})`;
          ctx.fillRect(-p.size * 0.56, -p.size * 0.32, p.size * 0.5, p.size * 0.64);
        }
      } else if (p.shape === 'circle') {
        ctx.scale(1, Math.max(0.35, Math.abs(tiltCos)));
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.scale(Math.max(0.3, Math.abs(tiltCos)), 1);
        drawStar(ctx, p.size * 0.66);
      } else {
        ctx.scale(Math.max(0.35, Math.abs(tiltCos)), 1);
        drawHeart(ctx, p.size);
      }

      ctx.restore();
    }

    const stillSpawning = !reducedMotion && elapsedMs < HERO_CANNON_DURATION_MS;
    if (stillSpawning || particles.length > 0) {
      rafId = window.requestAnimationFrame(render);
    } else {
      cleanup();
    }
  };

  rafId = window.requestAnimationFrame(render);
  return cleanup;
}
