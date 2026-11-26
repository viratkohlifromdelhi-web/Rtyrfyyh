export interface ArenaBounds {
  width: number;
  height: number;
}

export interface ButtonSize {
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect2D {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const RUNAWAY_TAUNTS: readonly string[] = [
  'Nice try',
  'Too slow, Morgan',
  'Stop lying to yourself',
  'Just tap Yes already 😂',
];

export function getDodgeMessage(dodgeCount: number): string {
  if (dodgeCount <= 0) {
    return 'Go ahead, try tapping No.';
  }
  return RUNAWAY_TAUNTS[(dodgeCount - 1) % RUNAWAY_TAUNTS.length];
}

function rectsOverlap(a: Rect2D, b: Rect2D, gap = 10): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

/**
 * Computes a new (x, y) top-left position for the runaway button strictly
 * inside `bounds`, with padding, away from `currentPos`, and avoiding
 * `avoidRect` (e.g. the "Yes" button) whenever space permits.
 */
export function computeDodgePosition(
  bounds: ArenaBounds,
  buttonSize: ButtonSize,
  currentPos: Point2D,
  randomFn: () => number = Math.random,
  avoidRect?: Rect2D,
  padding = 12,
): Point2D {
  const maxX = Math.max(padding, bounds.width - buttonSize.width - padding);
  const maxY = Math.max(padding, bounds.height - buttonSize.height - padding);
  const minX = Math.min(padding, maxX);
  const minY = Math.min(padding, maxY);

  const rangeX = Math.max(0, maxX - minX);
  const rangeY = Math.max(0, maxY - minY);

  const minDistance = Math.min(90, Math.hypot(rangeX, rangeY) * 0.42);

  let bestCandidate: Point2D = { x: minX, y: minY };
  let bestScore = -1;

  for (let attempt = 0; attempt < 24; attempt++) {
    const rx = Math.max(0, Math.min(0.9999, randomFn()));
    const ry = Math.max(0, Math.min(0.9999, randomFn()));
    const x = Math.round(minX + rx * rangeX);
    const y = Math.round(minY + ry * rangeY);

    const candidateRect: Rect2D = {
      x,
      y,
      width: buttonSize.width,
      height: buttonSize.height,
    };

    const hitsAvoid = avoidRect ? rectsOverlap(candidateRect, avoidRect, 10) : false;
    const dist = Math.hypot(x - currentPos.x, y - currentPos.y);

    if (!hitsAvoid && dist >= minDistance) {
      return { x, y };
    }

    const score = (hitsAvoid ? 0 : 1000) + dist;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = { x, y };
    }
  }

  return bestCandidate;
}

export const SCANNER_MAX_PROGRESS = 99;
export const SCANNER_DURATION_MS = 3200;

export function getScannerStageMessage(progress: number): string {
  if (progress <= 0) {
    return 'Press and hold your thumb on the pad...';
  }
  if (progress < 34) {
    return 'Checking height...';
  }
  if (progress < 68) {
    return 'Still looking...';
  }
  return 'Are you even standing up?';
}

export function advanceScannerProgress(
  currentProgress: number,
  deltaMs: number,
  totalDurationMs = SCANNER_DURATION_MS,
): { progress: number; reachedVerdict: boolean } {
  if (deltaMs <= 0 || totalDurationMs <= 0) {
    const clamped = Math.min(SCANNER_MAX_PROGRESS, Math.max(0, currentProgress));
    return { progress: clamped, reachedVerdict: clamped >= SCANNER_MAX_PROGRESS };
  }

  const increment = (deltaMs / totalDurationMs) * SCANNER_MAX_PROGRESS;
  const next = Math.min(SCANNER_MAX_PROGRESS, Math.max(0, currentProgress + increment));
  return {
    progress: next,
    reachedVerdict: next >= SCANNER_MAX_PROGRESS,
  };
}

/**
 * Smoothly rewinds the Bauni-Meter progress bar back to 0% after an early finger lift.
 */
export function rewindScannerProgress(
  currentProgress: number,
  deltaMs: number,
  rewindDurationMs = 420,
): { progress: number; done: boolean } {
  if (currentProgress <= 0 || deltaMs <= 0 || rewindDurationMs <= 0) {
    const clamped = Math.max(0, currentProgress);
    return { progress: clamped, done: clamped <= 0 };
  }
  const decrement = (deltaMs / rewindDurationMs) * SCANNER_MAX_PROGRESS;
  const next = Math.max(0, currentProgress - decrement);
  return {
    progress: next,
    done: next <= 0,
  };
}

export const SCRATCH_REVEAL_THRESHOLD = 0.5;

/**
 * Computes the fraction [0, 1] of pixels in an RGBA ImageData buffer whose
 * alpha channel has been erased (`alpha < 128`). Uses pixel striding for fast
 * real-time scratch checks during touch/mouse dragging.
 */
export function calculateClearedRatio(
  rgbaData: Uint8ClampedArray,
  pixelStride = 16,
): number {
  const totalPixels = Math.floor(rgbaData.length / 4);
  if (totalPixels === 0) return 0;

  const step = Math.max(1, Math.floor(pixelStride));
  let sampled = 0;
  let cleared = 0;

  for (let px = 0; px < totalPixels; px += step) {
    const alpha = rgbaData[px * 4 + 3];
    sampled++;
    if (alpha < 128) {
      cleared++;
    }
  }

  return sampled === 0 ? 0 : cleared / sampled;
}

export function shouldAutoRevealScratch(clearedRatio: number): boolean {
  return clearedRatio >= SCRATCH_REVEAL_THRESHOLD;
}
