export type ConfettiShape = 'rect' | 'circle' | 'star' | 'heart';

export interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  life: number;
  maxLife: number;
  shape: ConfettiShape;
}

export const CONFETTI_PALETTE = [
  '#F48FB1', // pastel blush rose
  '#E8B4B8', // rose gold
  '#D98A9C', // dusty pink
  '#4A122C', // deep berry
  '#F7D794', // champagne gold
  '#FDE2E9', // pale petal
  '#C96480', // warm raspberry
];

const SHAPES: ConfettiShape[] = ['rect', 'circle', 'star', 'heart'];

export function spawnConfettiBurst(params: {
  originX: number;
  originY: number;
  count?: number;
  spreadRad?: number;
  random?: () => number;
}): ConfettiParticle[] {
  const count = params.count ?? 68;
  const spreadRad = params.spreadRad ?? Math.PI * 1.4;
  const rand = params.random ?? Math.random;
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (rand() - 0.5) * spreadRad;
    const speed = 5 + rand() * 11;
    const maxLife = 75 + Math.floor(rand() * 55);
    particles.push({
      x: params.originX,
      y: params.originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.5,
      size: 6 + rand() * 7,
      color: CONFETTI_PALETTE[Math.floor(rand() * CONFETTI_PALETTE.length)],
      rotation: rand() * Math.PI * 2,
      vr: (rand() - 0.5) * 0.24,
      life: 0,
      maxLife,
      shape: SHAPES[Math.floor(rand() * SHAPES.length)],
    });
  }

  return particles;
}

export function stepConfettiParticles(
  particles: ConfettiParticle[],
  viewportHeight: number,
  gravity = 0.26,
  drag = 0.985
): ConfettiParticle[] {
  const next: ConfettiParticle[] = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const life = p.life + 1;
    const vx = p.vx * drag;
    const vy = p.vy * drag + gravity;
    const x = p.x + vx;
    const y = p.y + vy;
    const rotation = p.rotation + p.vr;

    if (life < p.maxLife && y < viewportHeight + 60) {
      next.push({
        ...p,
        x,
        y,
        vx,
        vy,
        rotation,
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
