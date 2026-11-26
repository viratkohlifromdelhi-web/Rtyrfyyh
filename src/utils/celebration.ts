export type ConfettiShape = 'ribbon' | 'foil' | 'circle' | 'star' | 'heart';

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  tiltAngle: number;
  tiltSpeed: number;
  swayPhase: number;
  swayFreq: number;
  swayAmp: number;
  drag: number;
  gravity: number;
  life: number;
  maxLife: number;
  shape: ConfettiShape;
}

export const MAX_CONFETTI_PARTICLES = 180;

export const CONFETTI_PALETTE = [
  '#FF85B3', // pastel pink
  '#C4A1FF', // lavender
  '#F4A9B8', // rose gold
  '#FFE066', // butter yellow
  '#FFFFFF', // crisp white
  '#5A1846', // deep berry
];

const SHAPES: ConfettiShape[] = ['ribbon', 'ribbon', 'foil', 'foil', 'circle', 'star', 'heart'];

export function spawnConfettiBurst(params: {
  originX: number;
  originY: number;
  count?: number;
  angleRad?: number;
  spreadRad?: number;
  minSpeed?: number;
  maxSpeed?: number;
  random?: () => number;
}): ConfettiParticle[] {
  const count = params.count ?? 56;
  const centerAngle = params.angleRad ?? -Math.PI / 2;
  const spreadRad = params.spreadRad ?? Math.PI * 1.45;
  const minSpeed = params.minSpeed ?? 6.5;
  const maxSpeed = params.maxSpeed ?? 16.5;
  const rand = params.random ?? Math.random;
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = centerAngle + (rand() - 0.5) * spreadRad;
    const speed = minSpeed + rand() * (maxSpeed - minSpeed);
    const maxLife = 130 + Math.floor(rand() * 75);
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];

    particles.push({
      x: params.originX + (rand() - 0.5) * 16,
      y: params.originY + (rand() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (params.angleRad === undefined ? 3.2 : 0),
      size: shape === 'foil' || shape === 'ribbon' ? 9.5 + rand() * 6 : 8 + rand() * 5.5,
      color: CONFETTI_PALETTE[Math.floor(rand() * CONFETTI_PALETTE.length)],
      rotation: rand() * Math.PI * 2,
      vr: (rand() - 0.5) * 0.22,
      tiltAngle: rand() * Math.PI * 2,
      tiltSpeed: 0.1 + rand() * 0.18,
      swayPhase: rand() * Math.PI * 2,
      swayFreq: 0.055 + rand() * 0.055,
      swayAmp: 0.35 + rand() * 0.7,
      drag: 0.96 + rand() * 0.025, // realistic air drag 0.96–0.985
      gravity: 0.18 + rand() * 0.09,
      life: 0,
      maxLife,
      shape,
    });
  }

  return particles;
}

/**
 * Spawns twin angled side party cannons from bottom-left and bottom-right corners arching across the viewport.
 */
export function spawnSideCannons(params: {
  viewportWidth: number;
  viewportHeight: number;
  countPerSide?: number;
  random?: () => number;
}): ConfettiParticle[] {
  const countPerSide = params.countPerSide ?? 42;
  const rand = params.random ?? Math.random;
  const launchY = params.viewportHeight * 0.94;
  const isNarrow = params.viewportWidth < 640;
  const minSpeed = isNarrow ? 20 : 24;
  const maxSpeed = isNarrow ? 34 : 40;
  const leftAngle = isNarrow ? -Math.PI * 0.39 : -Math.PI * 0.33;
  const rightAngle = isNarrow ? -Math.PI * 0.61 : -Math.PI * 0.67;

  const leftCannon = spawnConfettiBurst({
    originX: 8,
    originY: launchY,
    count: countPerSide,
    angleRad: leftAngle,
    spreadRad: 0.48,
    minSpeed,
    maxSpeed,
    random: rand,
  });

  const rightCannon = spawnConfettiBurst({
    originX: Math.max(16, params.viewportWidth - 8),
    originY: launchY,
    count: countPerSide,
    angleRad: rightAngle,
    spreadRad: 0.48,
    minSpeed,
    maxSpeed,
    random: rand,
  });

  return [...leftCannon, ...rightCannon];
}

export function stepConfettiParticles(
  particles: ConfettiParticle[],
  viewportHeight: number,
  dtScale = 1,
): ConfettiParticle[] {
  const step = Math.min(2, Math.max(0.25, dtScale));
  const next: ConfettiParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const life = p.life + step;
    const dragPow = Math.pow(p.drag, step);
    const vx = p.vx * dragPow;
    const vy = p.vy * dragPow + p.gravity * step;

    const swayPhase = p.swayPhase + p.swayFreq * step;
    const flutterX = Math.sin(swayPhase) * p.swayAmp * step;
    const x = p.x + vx * step + flutterX;
    const y = p.y + vy * step;
    const rotation = p.rotation + p.vr * step;
    const tiltAngle = p.tiltAngle + p.tiltSpeed * step;

    if (life < p.maxLife && y < viewportHeight + 70) {
      next.push({
        ...p,
        x,
        y,
        vx,
        vy,
        rotation,
        tiltAngle,
        swayPhase,
        life,
      });
    }
  }
  return next;
}

export function toggleActiveSlot(currentId: string | null, clickedId: string): string | null {
  return currentId === clickedId ? null : clickedId;
}

export interface CakeState {
  candlesLit: boolean;
  wishCount: number;
  showWishPopup: boolean;
}

export function createInitialCakeState(): CakeState {
  return {
    candlesLit: true,
    wishCount: 0,
    showWishPopup: false,
  };
}

export function blowOutCandles(state: CakeState): CakeState {
  if (!state.candlesLit) {
    return { ...state, showWishPopup: true };
  }
  return {
    candlesLit: false,
    wishCount: state.wishCount + 1,
    showWishPopup: true,
  };
}

export function relightCandles(state: CakeState): CakeState {
  return {
    ...state,
    candlesLit: true,
    showWishPopup: false,
  };
}

export interface HeadlineWord {
  word: string;
  letters: string[];
}

export function splitHeadlineWords(text: string): HeadlineWord[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({
      word,
      letters: Array.from(word),
    }));
}
