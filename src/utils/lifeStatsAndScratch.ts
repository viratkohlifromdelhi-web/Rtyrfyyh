export const ANAMIKA_BIRTH_ISO = '2009-12-03T00:00:00';
export const LUNAR_SYNODIC_MONTH_DAYS = 29.53;
export const SCRATCH_REVEAL_THRESHOLD = 0.5;

export interface LifeStats {
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  fullMoons: number;
}

/**
 * Computes live elapsed time on Earth since December 3, 2009 00:00:00.
 */
export function computeLifeStats(
  now: Date,
  birthDate: Date = new Date(2009, 11, 3, 0, 0, 0),
): LifeStats {
  const diffMs = Math.max(0, now.getTime() - birthDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalDays = Math.floor(totalSeconds / 86400);
  const fullMoons = Math.floor(totalDays / LUNAR_SYNODIC_MONTH_DAYS);

  return {
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
    fullMoons,
  };
}

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

export function formatStatNumber(value: number): string {
  return NUMBER_FORMATTER.format(Math.max(0, Math.floor(value)));
}

/**
 * Computes the fraction (0..1) of transparent (scratched-off) pixels
 * from an RGBA ImageData byte buffer by sampling every `pixelStride`-th pixel.
 */
export function calculateScratchCoverage(
  rgbaData: Uint8ClampedArray | number[],
  pixelStride = 16,
): number {
  const totalPixels = Math.floor(rgbaData.length / 4);
  if (totalPixels <= 0) return 0;

  const step = Math.max(1, Math.floor(pixelStride));
  let sampled = 0;
  let cleared = 0;

  for (let p = 0; p < totalPixels; p += step) {
    const alpha = rgbaData[p * 4 + 3];
    sampled += 1;
    if (alpha < 128) {
      cleared += 1;
    }
  }

  return sampled > 0 ? cleared / sampled : 0;
}

export function shouldAutoRevealScratch(
  coverageRatio: number,
  threshold = SCRATCH_REVEAL_THRESHOLD,
): boolean {
  return coverageRatio >= threshold;
}
