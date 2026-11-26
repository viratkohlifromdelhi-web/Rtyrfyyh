export type CandleAnimPhase = 'lit' | 'blowing' | 'out' | 'relighting';

export interface CandleSpec {
  id: number;
  cx: number;
  color: string;
  stripe: string;
  flameDurSec: number;
  flameDur: string;
  flameDelay: string;
  gustDelayMs: number;
  relightDelayMs: number;
  smokeDelayMs: number;
}

export const CANDLE_TIMING = {
  /** Wind-gust lean & extinguish duration (~0.25s) */
  gustDurationMs: 250,
  /** Left-to-right wind sweep stagger per candle */
  gustWaveStepMs: 12,
  /** Glowing orange wick ember fade duration (1.2s) */
  emberDurationMs: 1200,
  /** Curling translucent smoke wisp rise duration (1.8s) */
  smokeDurationMs: 1800,
  /** Left-to-right relight ignition stagger (100ms per candle) */
  relightStaggerMs: 100,
  /** Individual flame pop-in duration on relight */
  igniteDurationMs: 340,
  /** Wick sparkle pop duration on relight */
  sparkleDurationMs: 520,
} as const;

export const CANDLE_SPECS: readonly CandleSpec[] = [
  {
    id: 1,
    cx: 110,
    color: '#FFE6F0',
    stripe: '#D94B7D',
    flameDurSec: 0.7,
    flameDur: '0.70s',
    flameDelay: '0s',
    gustDelayMs: 0,
    relightDelayMs: 0,
    smokeDelayMs: 0,
  },
  {
    id: 2,
    cx: 145,
    color: '#FFF3C4',
    stripe: '#C78A19',
    flameDurSec: 0.85,
    flameDur: '0.85s',
    flameDelay: '-0.22s',
    gustDelayMs: CANDLE_TIMING.gustWaveStepMs * 1,
    relightDelayMs: CANDLE_TIMING.relightStaggerMs * 1,
    smokeDelayMs: 55,
  },
  {
    id: 3,
    cx: 180,
    color: '#F1E9FF',
    stripe: '#7A4BB8',
    flameDurSec: 0.95,
    flameDur: '0.95s',
    flameDelay: '-0.48s',
    gustDelayMs: CANDLE_TIMING.gustWaveStepMs * 2,
    relightDelayMs: CANDLE_TIMING.relightStaggerMs * 2,
    smokeDelayMs: 110,
  },
  {
    id: 4,
    cx: 215,
    color: '#FFC8DF',
    stripe: '#D94B7D',
    flameDurSec: 0.78,
    flameDur: '0.78s',
    flameDelay: '-0.14s',
    gustDelayMs: CANDLE_TIMING.gustWaveStepMs * 3,
    relightDelayMs: CANDLE_TIMING.relightStaggerMs * 3,
    smokeDelayMs: 75,
  },
  {
    id: 5,
    cx: 250,
    color: '#FFF3C4',
    stripe: '#C78A19',
    flameDurSec: 0.9,
    flameDur: '0.90s',
    flameDelay: '-0.36s',
    gustDelayMs: CANDLE_TIMING.gustWaveStepMs * 4,
    relightDelayMs: CANDLE_TIMING.relightStaggerMs * 4,
    smokeDelayMs: 130,
  },
];

/**
 * Total ms until all 5 flames finish their wind-gust lean and extinguish,
 * so the 'blowing' -> 'out' transition never truncates a flame mid-gust.
 */
export function getBlowOutCompleteDelayMs(
  specs: readonly CandleSpec[] = CANDLE_SPECS,
): number {
  const maxGustDelay = specs.reduce((acc, c) => Math.max(acc, c.gustDelayMs), 0);
  return maxGustDelay + CANDLE_TIMING.gustDurationMs + 10;
}

/**
 * Total ms until all 5 flames finish their staggered left-to-right ignite + sparkle
 * pop before settling into continuous 'lit' idle dancing.
 */
export function getRelightCompleteDelayMs(
  specs: readonly CandleSpec[] = CANDLE_SPECS,
): number {
  const maxRelightDelay = specs.reduce(
    (acc, c) => Math.max(acc, c.relightDelayMs),
    0,
  );
  return (
    maxRelightDelay +
    Math.max(CANDLE_TIMING.igniteDurationMs, CANDLE_TIMING.sparkleDurationMs)
  );
}
