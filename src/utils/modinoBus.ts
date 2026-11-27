/**
 * Lightweight, zero-dependency typed CustomEvent bus connecting every section of
 * Anamika's 17th birthday site to the Modino companion pet without prop-drilling.
 */

export type ModinoReactionCategory =
  | 'greeting'
  | 'cute'
  | 'gift_ew'
  | 'backstory'
  | 'interaction_hype'
  | 'spin'
  | 'friends_and_banter'
  | 'last_playback'
  | 'ending'
  | 'direct_tap';

export interface ModinoEventDetail {
  category: ModinoReactionCategory;
  force?: boolean;
  source?: string;
}

export const MODINO_EVENT_NAME = 'modino:react';
export const MODINO_SPAM_COOLDOWN_MS = 650;

let lastEmitTimestamp = -Infinity;

/**
 * Resets the internal spam cooldown timestamp (used by unit tests).
 */
export function resetModinoBusCooldown(): void {
  lastEmitTimestamp = -Infinity;
}

/**
 * Emits a reaction event for Modino.
 * Applies a 650ms spam-cooldown guard for passive/rapid triggers unless `options.force === true`.
 */
export function emitModinoEvent(
  category: ModinoReactionCategory,
  options?: { force?: boolean; source?: string; nowMs?: number },
): boolean {
  const force = Boolean(options?.force);
  const now =
    typeof options?.nowMs === 'number'
      ? options.nowMs
      : typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();

  if (now < lastEmitTimestamp) {
    lastEmitTimestamp = -Infinity;
  }

  if (!force && now - lastEmitTimestamp < MODINO_SPAM_COOLDOWN_MS) {
    return false;
  }

  lastEmitTimestamp = now;

  if (typeof window === 'undefined' || typeof CustomEvent === 'undefined') {
    return true;
  }

  try {
    const detail: ModinoEventDetail = {
      category,
      force,
      source: options?.source,
    };
    window.dispatchEvent(new CustomEvent<ModinoEventDetail>(MODINO_EVENT_NAME, { detail }));
    return true;
  } catch {
    return false;
  }
}
