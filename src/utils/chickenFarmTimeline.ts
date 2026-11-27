/**
 * Pure stage choreography definitions and timing schedule for "The Little Coop"
 * Bonus Canon Lore mini pastel chicken farm comic card.
 *
 * Strictly zero visible dashes in any user-facing caption text.
 */

export type ChickenFarmStage =
  | 'idle'
  | 'approach'
  | 'pause'
  | 'kiss'
  | 'pregnant'
  | 'hatch'
  | 'finale';

export interface ChickenFarmStageStep {
  stage: Exclude<ChickenFarmStage, 'idle'>;
  atMs: number;
}

export const CHICKEN_FARM_SCHEDULE: readonly ChickenFarmStageStep[] = [
  { stage: 'approach', atMs: 0 },
  { stage: 'pause', atMs: 1100 },
  { stage: 'kiss', atMs: 1800 },
  { stage: 'pregnant', atMs: 2900 },
  { stage: 'hatch', atMs: 4100 },
  { stage: 'finale', atMs: 5200 },
] as const;

export const CHICKEN_FARM_SHELL_CRACK_AT_MS = 4820;
export const CHICKEN_FARM_TOTAL_MS = 6200;

export const CHICKEN_FARM_CAPTIONS: Record<ChickenFarmStage, string> = {
  idle: 'Just two chicks living in the coop...',
  approach: 'Just two chicks living in the coop...',
  pause: 'Wait for it...',
  kiss: 'Okay, definitely more than roommates.',
  pregnant: 'Plot twist. That escalated fast.',
  hatch: 'Incoming special delivery...',
  finale: 'Official canon lore unlocked.',
};

export const CHICKEN_FARM_PUNCHLINE_PARTS = {
  prefix: 'And that is how ',
  heroName: 'AYUSH',
  suffix: ' entered the family tree. Happy 17th, Morgan.',
} as const;

/**
 * Resolves the active comic stage for any elapsed time `elapsedMs` (useful for tests & resume).
 */
export function resolveChickenFarmStage(
  elapsedMs: number,
  reducedMotion = false,
): ChickenFarmStage {
  if (reducedMotion) return 'finale';
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 'idle';

  let current: ChickenFarmStage = 'approach';
  for (const step of CHICKEN_FARM_SCHEDULE) {
    if (elapsedMs >= step.atMs) {
      current = step.stage;
    }
  }
  return current;
}

/**
 * Returns the exact single-line caption for a given stage.
 */
export function getChickenFarmCaption(stage: ChickenFarmStage): string {
  return CHICKEN_FARM_CAPTIONS[stage];
}
