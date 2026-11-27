export const MAX_CARD_TILT_DEG = 5;

export interface CardTiltTarget {
  rotateX: number;
  rotateY: number;
  sheenX: number;
  sheenY: number;
  sheenOpacity: number;
}

export interface CardTiltState {
  rotateX: number;
  rotateY: number;
  sheenX: number;
  sheenY: number;
  sheenOpacity: number;
}

export interface AmbientEmberSpec {
  id: string;
  leftPct: number;
  bottomPct: number;
  sizePx: number;
  driftX: string;
  riseY: string;
  durationSec: number;
  delaySec: number;
  color: string;
}

export interface IgniteSparkParticle {
  id: string;
  startX: string;
  dx: string;
  dy: string;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  color: string;
}

export interface DossierSpecTile {
  id: string;
  label: string;
  value: string;
  sublabel: string;
}

export const IGNITE_AURA_TOASTS = [
  'Aura +100, Height +0 cm',
  'Main character energy verified',
  'Still shorter than the lighter flame',
  'Greatest HG status locked',
] as const;

export const DOSSIER_SPECS: readonly DossierSpecTile[] = [
  {
    id: 'aura',
    label: 'Aura Level',
    value: '1000 / 10',
    sublabel: 'Lighter + shades combo',
  },
  {
    id: 'height',
    label: 'Height Growth',
    value: '0.0 cm',
    sublabel: 'Since 8th class',
  },
  {
    id: 'rank',
    label: 'Best Friend Rank',
    value: '#2',
    sublabel: 'Still behind Abhay',
  },
  {
    id: 'threat',
    label: 'Threat Level',
    value: 'Maximum',
    sublabel: 'Certified HG',
  },
] as const;

/**
 * 7 ultra-delicate warm amber-gold embers positioned strictly along the
 * lower-center and subtle outer edges so they echo the lit lighter flame
 * without ever crossing her face or sunglasses.
 */
export const AMBIENT_EMBERS: readonly AmbientEmberSpec[] = [
  {
    id: 'ember-1',
    leftPct: 48,
    bottomPct: 30,
    sizePx: 3,
    driftX: '8px',
    riseY: '-52px',
    durationSec: 3.6,
    delaySec: 0,
    color: '#FFCF70',
  },
  {
    id: 'ember-2',
    leftPct: 54,
    bottomPct: 26,
    sizePx: 2.5,
    driftX: '-7px',
    riseY: '-46px',
    durationSec: 4.1,
    delaySec: -1.4,
    color: '#F5A64B',
  },
  {
    id: 'ember-3',
    leftPct: 42,
    bottomPct: 24,
    sizePx: 2,
    driftX: '-10px',
    riseY: '-42px',
    durationSec: 3.9,
    delaySec: -2.2,
    color: '#FFE5A3',
  },
  {
    id: 'ember-4',
    leftPct: 16,
    bottomPct: 22,
    sizePx: 3,
    driftX: '6px',
    riseY: '-58px',
    durationSec: 4.8,
    delaySec: -0.9,
    color: '#E8C892',
  },
  {
    id: 'ember-5',
    leftPct: 84,
    bottomPct: 26,
    sizePx: 2.5,
    driftX: '-6px',
    riseY: '-54px',
    durationSec: 4.5,
    delaySec: -2.9,
    color: '#FFBF5E',
  },
  {
    id: 'ember-6',
    leftPct: 62,
    bottomPct: 20,
    sizePx: 3.5,
    driftX: '11px',
    riseY: '-48px',
    durationSec: 4.3,
    delaySec: -1.8,
    color: '#FFD98E',
  },
  {
    id: 'ember-7',
    leftPct: 28,
    bottomPct: 18,
    sizePx: 2,
    driftX: '5px',
    riseY: '-44px',
    durationSec: 5.0,
    delaySec: -3.4,
    color: '#F4B461',
  },
] as const;

const SPARK_COLORS = ['#FFF2C2', '#FFD170', '#F5A64B', '#E8C892', '#FF9F45'] as const;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

/**
 * Converts normalized pointer position [0..1, 0..1] inside the card rect
 * into a subtle ±5deg 3D editorial tilt and diagonal magazine specular sheen.
 */
export function computeCardTilt(
  normX: number,
  normY: number,
  maxTiltDeg = MAX_CARD_TILT_DEG,
): CardTiltTarget {
  const x = clamp01(normX);
  const y = clamp01(normY);
  const centeredX = (x - 0.5) * 2; // -1..1
  const centeredY = (y - 0.5) * 2; // -1..1

  const rotateY = Number((centeredX * maxTiltDeg).toFixed(3));
  const rotateX = Number((-centeredY * maxTiltDeg).toFixed(3));
  const sheenX = Number(((x - 0.5) * 70).toFixed(2));
  const sheenY = Number(((y - 0.5) * 50).toFixed(2));
  const dist = Math.min(1, Math.hypot(centeredX, centeredY));
  const sheenOpacity = Number((0.18 + dist * 0.2).toFixed(3));

  return {
    rotateX,
    rotateY,
    sheenX,
    sheenY,
    sheenOpacity,
  };
}

export function createRestTiltState(): CardTiltState {
  return {
    rotateX: 0,
    rotateY: 0,
    sheenX: 0,
    sheenY: 0,
    sheenOpacity: 0,
  };
}

/**
 * Exponentially damped 60fps interpolation so pointer tilt feels velvety
 * and springs cleanly back to flat (0deg) on release.
 */
export function stepTiltState(
  current: CardTiltState,
  target: CardTiltTarget,
  dtSec: number,
  responsiveness = 11,
): { next: CardTiltState; settled: boolean } {
  const safeDt = Math.min(0.05, Math.max(0.001, Number.isFinite(dtSec) ? dtSec : 0.016));
  const alpha = 1 - Math.exp(-responsiveness * safeDt);

  const next: CardTiltState = {
    rotateX: current.rotateX + (target.rotateX - current.rotateX) * alpha,
    rotateY: current.rotateY + (target.rotateY - current.rotateY) * alpha,
    sheenX: current.sheenX + (target.sheenX - current.sheenX) * alpha,
    sheenY: current.sheenY + (target.sheenY - current.sheenY) * alpha,
    sheenOpacity: current.sheenOpacity + (target.sheenOpacity - current.sheenOpacity) * alpha,
  };

  const settled =
    Math.abs(next.rotateX - target.rotateX) < 0.025 &&
    Math.abs(next.rotateY - target.rotateY) < 0.025 &&
    Math.abs(next.sheenOpacity - target.sheenOpacity) < 0.005;

  if (settled) {
    return { next: { ...target }, settled: true };
  }
  return { next, settled: false };
}

export function getNextAuraToastIndex(currentIndex: number): number {
  if (currentIndex < 0 || !Number.isFinite(currentIndex)) return 0;
  return (currentIndex + 1) % IGNITE_AURA_TOASTS.length;
}

/**
 * Spawns 14 crisp golden-amber sparks rising off the card when "Ignite Aura" is tapped.
 */
export function createIgniteSparks(burstId: number, count = 14): IgniteSparkParticle[] {
  const particles: IgniteSparkParticle[] = [];
  for (let i = 0; i < count; i++) {
    const spread = (i / Math.max(1, count - 1)) - 0.5; // -0.5..0.5
    const jitter = Math.sin((burstId + 1) * 19.3 + i * 7.7);
    const startXNum = 50 + spread * 46 + jitter * 6;
    const dxNum = spread * 124 + jitter * 26;
    const dyNum = -(86 + ((i * 29 + burstId * 17) % 88));
    const sizePx = i % 3 === 0 ? 4.5 : i % 2 === 0 ? 3.5 : 2.8;
    const delayMs = (i % 5) * 32;
    const durationMs = 740 + ((i * 73) % 340);

    particles.push({
      id: `spark-${burstId}-${i}`,
      startX: `${Math.max(12, Math.min(88, startXNum)).toFixed(1)}%`,
      dx: `${dxNum.toFixed(1)}px`,
      dy: `${dyNum.toFixed(1)}px`,
      sizePx,
      delayMs,
      durationMs,
      color: SPARK_COLORS[(i + burstId) % SPARK_COLORS.length],
    });
  }
  return particles;
}
