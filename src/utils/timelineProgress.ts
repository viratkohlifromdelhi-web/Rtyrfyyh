/**
 * Pure scroll-linked math for the Backstory section:
 * - Sticky stacking postcard depth scale (1 -> 0.965 as the next postcard approaches)
 * - Legacy rail progress helper kept for backward compatibility
 */

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/**
 * Computes normalized [0, 1] fill progress for a vertical section span.
 */
export function computeTimelineRailProgress(
  railTop: number,
  railHeight: number,
  viewportHeight: number,
): number {
  const safeHeight = Math.max(railHeight, 1);
  const safeViewport = Math.max(viewportHeight, 1);
  const startTop = safeViewport * 0.78;
  const endTop = safeViewport * 0.68 - safeHeight;
  const span = startTop - endTop;
  if (span <= 0) return 1;
  return clamp01((startTop - railTop) / span);
}

/**
 * Computes subtle tactile scale [minScale, 1] for a sticky notebook postcard
 * as the next postcard glides upward to stack over it.
 *
 * - Returns 1 while `nextTop` is at or below `currentStickyTop + approachSpanPx`.
 * - Smoothly eases down to `minScale` (0.965) once `nextTop` reaches `nextStickyTop`.
 */
export function computeStickyCardScale(params: {
  nextTop: number;
  currentStickyTop: number;
  nextStickyTop: number;
  approachSpanPx?: number;
  minScale?: number;
}): number {
  const {
    nextTop,
    currentStickyTop,
    nextStickyTop,
    approachSpanPx = 280,
    minScale = 0.965,
  } = params;

  if (
    !Number.isFinite(nextTop) ||
    !Number.isFinite(currentStickyTop) ||
    !Number.isFinite(nextStickyTop)
  ) {
    return 1;
  }

  const startY = currentStickyTop + Math.max(approachSpanPx, 40);
  const endY = nextStickyTop;
  const travel = startY - endY;
  if (travel <= 0) return 1;

  const progress = clamp01((startY - nextTop) / travel);
  return 1 - progress * (1 - minScale);
}
