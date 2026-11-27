/**
 * Pure background music configuration, URL encoding, and smart interactive ducking
 * gain-resolution logic for Anamika's 17th Birthday website.
 */

export const BG_MUSIC_FILENAME = 'Milky - Just The Way You Are (Official Audio).mp3';
export const BG_MUSIC_RAW_PATH = `/${BG_MUSIC_FILENAME}`;

function getViteBaseUrl(): string {
  const env =
    typeof import.meta !== 'undefined'
      ? (import.meta as { env?: { BASE_URL?: string } }).env
      : undefined;
  return env?.BASE_URL || '/';
}

/**
 * Safely resolves the local public/ MP3 URL using Vite's BASE_URL and encodeURIComponent
 * so spaces and parentheses never 404 on root or subpath deployments.
 */
export function buildBgMusicSrc(baseUrl: string = getViteBaseUrl()): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}${encodeURIComponent(BG_MUSIC_FILENAME)}`;
}

export const BG_MUSIC_SRC = buildBgMusicSrc();

// Soft, ear-friendly background loudness (reduced by 50% from previous 0.40-0.50 mix)
export const DEFAULT_BG_MUSIC_GAIN = 0.225;
export const ROAST_MODE_BG_MUSIC_GAIN = 0.2;
export const WHOLESOME_MODE_BG_MUSIC_GAIN = 0.25;

// Fade & handoff durations (ms)
export const MANUAL_PLAY_FADE_MS = 1200;
export const MANUAL_PAUSE_FADE_MS = 450;
export const AUTOPLAY_HANDOFF_FADE_MS = 1500;
export const UNLOCK_FADE_MS = 1200;
export const REPLAY_FADE_OUT_MS = 400;
export const MODE_TRANSITION_MS = 1000;
export const VISIBILITY_RESUME_FADE_MS = 800;

// Smart interactive ducking parameters (proportionally scaled to 0.225 base volume)
export const WHEEL_DUCK_GAIN = 0.06;
export const WHEEL_DUCK_DOWN_MS = 300;
export const WHEEL_RESTORE_DELAY_MS = 1500;
export const WHEEL_RESTORE_MS = 1200;

export const SCANNER_DUCK_GAIN = 0.05;
export const SCANNER_DUCK_DOWN_MS = 250;
export const SCANNER_VERDICT_HOLD_MS = 1000;
export const SCANNER_RESTORE_MS = 800;

export const CELEBRATION_DIP_GAIN = 0.075;
export const CELEBRATION_DIP_RAMP_MS = 120;
export const CELEBRATION_DIP_HOLD_MS = 600;
export const CELEBRATION_SWELL_GAIN = 0.275;
export const CELEBRATION_SWELL_RAMP_MS = 350;
export const CELEBRATION_SWELL_HOLD_MS = 3000;
export const CELEBRATION_SETTLE_MS = 900;

export const SCRATCH_DUCK_GAIN = 0.11;
export const SCRATCH_DUCK_RAMP_MS = 180;
export const SCRATCH_DUCK_HOLD_MS = 1200;
export const SCRATCH_RESTORE_MS = 800;

export const CASE_FILE_DUCK_GAIN = 0.09;
export const CASE_FILE_DUCK_DOWN_MS = 250;
export const CASE_FILE_RESTORE_MS = 900;

export const VAULT_DUCK_GAIN = 0.07;
export const VAULT_DUCK_DOWN_MS = 350;
export const VAULT_RESTORE_DELAY_MS = 1500;
export const VAULT_RESTORE_MS = 1000;

export type MusicVibeMode = 'default' | 'roast' | 'wholesome';
export type DuckChannel = 'wheel' | 'scanner' | 'celebration' | 'scratch' | 'caseFile' | 'vault';
export type ActiveDuckMap = Partial<Record<DuckChannel, number>>;

export function clampGain(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Returns the active base gain for the current Vibe Mode (reduced 50% for gentle listening):
 * - Default (initial load): 0.225
 * - Roast Mode: 0.20
 * - Wholesome Mode: 0.25
 */
export function getBaseGainForMode(mode: MusicVibeMode): number {
  if (mode === 'roast') return ROAST_MODE_BG_MUSIC_GAIN;
  if (mode === 'wholesome') return WHOLESOME_MODE_BG_MUSIC_GAIN;
  return DEFAULT_BG_MUSIC_GAIN;
}

/**
 * Resolves the effective target gain from the active Vibe Mode base gain and any
 * active interactive ducking/swell channels.
 * - Any active dip (< baseGain) always takes priority over a swell (> baseGain) so SFX cut through.
 * - If multiple dips overlap, the quietest dip wins.
 * - If only a celebration swell (0.275) is active, it swells smoothly to 0.275.
 */
export function resolveEffectiveMusicGain(
  mode: MusicVibeMode,
  activeDucks: ActiveDuckMap,
): number {
  const base = getBaseGainForMode(mode);
  const values = Object.values(activeDucks).filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  );

  if (values.length === 0) {
    return base;
  }

  let lowestDip: number | null = null;
  let highestSwell: number | null = null;

  for (const raw of values) {
    const g = clampGain(raw);
    if (g < base) {
      lowestDip = lowestDip === null ? g : Math.min(lowestDip, g);
    } else if (g > base) {
      highestSwell = highestSwell === null ? g : Math.max(highestSwell, g);
    }
  }

  if (lowestDip !== null) return lowestDip;
  if (highestSwell !== null) return highestSwell;
  return base;
}

/**
 * Determines whether a passive first-tap autoplay unlock listener should trigger playback.
 * Never overrides a manual pause (`userPaused === true`) or restarts already-playing audio.
 */
export function shouldTriggerAutoplayUnlock(params: {
  awaitingUnlock: boolean;
  userPaused: boolean;
  isPlaying: boolean;
}): boolean {
  return params.awaitingUnlock && !params.userPaused && !params.isPlaying;
}
