/**
 * Pure state & gesture math for the "No Filter" / "Birthday Truce" Stacked Note Deck.
 */

export type NoteDeckMode = 'noFilter' | 'birthdayTruce';

export interface NoteCardItem {
  id: string;
  text: string;
}

export const NO_FILTER_NOTES: readonly NoteCardItem[] = [
  {
    id: 'nf-1',
    text: 'Happy 17th, Morgan. Still a bauni, still a gawaar, still my lesbian daughter, and still zero height growth since 8th class.',
  },
  {
    id: 'nf-2',
    text: "Acts like the main character 24/7, talks like she's 6 feet tall, still loses a fight with the top kitchen shelf.",
  },
  {
    id: 'nf-3',
    text: "You jumped straight to #2 on the friend list after 21 July. Still behind Abhay though, don't let it get to your head.",
  },
  {
    id: 'nf-4',
    text: "Just stating documented facts. Honestly impressive how you haven't changed a single bit.",
  },
];

export const BIRTHDAY_TRUCE_NOTES: readonly NoteCardItem[] = [
  {
    id: 'bt-1',
    text: "Okay, 24 hour truce because it's your birthday. Happy 17th, Anamika. Genuinely glad I sent that 12:29 AM message on 21 July.",
  },
  {
    id: 'bt-2',
    text: "Jokes aside, you're easily one of the realest and funniest people I talk to. Never a dull conversation with you.",
  },
  {
    id: 'bt-3',
    text: 'Hope 17 brings you good days, zero overthinking, way too much good food, and maybe 1 cm of height (being generous today).',
  },
  {
    id: 'bt-4',
    text: 'Stay the exact same chaotic HG you are. Enjoy your birthday. Truce expires at midnight.',
  },
];

export function getNotesForMode(mode: NoteDeckMode): readonly NoteCardItem[] {
  return mode === 'birthdayTruce' ? BIRTHDAY_TRUCE_NOTES : NO_FILTER_NOTES;
}

export function getModeLabel(mode: NoteDeckMode): 'No Filter' | 'Birthday Truce' {
  return mode === 'birthdayTruce' ? 'Birthday Truce' : 'No Filter';
}

export function getNextCardIndex(currentIndex: number, total: number): number {
  if (total <= 0) return 0;
  return (currentIndex + 1) % total;
}

/**
 * Returns the indices of the visible stack from top (depth 0) to back (depth 2).
 */
export function getVisibleStackIndices(topIndex: number, total: number): number[] {
  if (total <= 0) return [];
  const count = Math.min(3, total);
  const result: number[] = [];
  for (let d = 0; d < count; d++) {
    result.push((topIndex + d) % total);
  }
  return result;
}

export function formatCardCounter(
  mode: NoteDeckMode,
  index: number,
  total: number,
): string {
  const prefix = mode === 'birthdayTruce' ? 'BIRTHDAY TRUCE' : 'NO FILTER';
  const current = String(index + 1).padStart(2, '0');
  const totalStr = String(total).padStart(2, '0');
  return `${prefix} · ${current}/${totalStr}`;
}

export const SWIPE_COMMIT_DISTANCE_PX = 68;
export const SWIPE_FLICK_VELOCITY_PX_MS = 0.45;
export const SWIPE_FLICK_MIN_DISTANCE_PX = 28;

export function shouldCommitSwipe(
  deltaX: number,
  velocityPxPerMs = 0,
): 'left' | 'right' | null {
  const absDist = Math.abs(deltaX);
  const absVel = Math.abs(velocityPxPerMs);
  if (
    absDist >= SWIPE_COMMIT_DISTANCE_PX ||
    (absVel >= SWIPE_FLICK_VELOCITY_PX_MS && absDist >= SWIPE_FLICK_MIN_DISTANCE_PX)
  ) {
    return deltaX < 0 ? 'left' : 'right';
  }
  return null;
}
