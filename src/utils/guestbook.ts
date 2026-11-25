export type NoteTone = 'blush' | 'cream' | 'champagne' | 'lavender';

export interface GuestbookWish {
  id: string;
  name: string;
  message: string;
  tone: NoteTone;
  createdAt: string;
  rotation: number;
  isUserCreated?: boolean;
}

export interface WishValidationResult {
  valid: boolean;
  nameError?: string;
  messageError?: string;
}

export const GUESTBOOK_STORAGE_KEY = 'kiara_24_memory_wall_v1';
export const MAX_NAME_LENGTH = 40;
export const MAX_MESSAGE_LENGTH = 240;

const ROTATION_CYCLE = [-2.2, 1.8, -1.4, 2.3, -1.9, 1.2];

export function validateWishInput(name: string, message: string): WishValidationResult {
  const trimmedName = name.trim();
  const trimmedMessage = message.trim();

  let nameError: string | undefined;
  let messageError: string | undefined;

  if (!trimmedName) {
    nameError = 'Please share your name so Kiara knows who wrote this.';
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    nameError = `Please keep your name under ${MAX_NAME_LENGTH} characters.`;
  }

  if (!trimmedMessage) {
    messageError = 'Write a sweet birthday wish before posting to the wall.';
  } else if (trimmedMessage.length < 3) {
    messageError = 'Your wish is a bit short — add a couple more words!';
  } else if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    messageError = `Please keep your wish under ${MAX_MESSAGE_LENGTH} characters.`;
  }

  return {
    valid: !nameError && !messageError,
    nameError,
    messageError,
  };
}

export function pickStickyRotation(index: number): number {
  const safeIndex = Math.abs(Math.floor(index)) % ROTATION_CYCLE.length;
  return ROTATION_CYCLE[safeIndex];
}

export function createWishEntry(params: {
  name: string;
  message: string;
  tone: NoteTone;
  existingCount: number;
  now?: Date;
  id?: string;
}): GuestbookWish {
  const now = params.now ?? new Date();
  return {
    id: params.id ?? `wish-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    name: params.name.trim(),
    message: params.message.trim(),
    tone: params.tone,
    createdAt: now.toISOString(),
    rotation: pickStickyRotation(params.existingCount),
    isUserCreated: true,
  };
}

export function addWishToWall(wishes: GuestbookWish[], wish: GuestbookWish): GuestbookWish[] {
  return [wish, ...wishes];
}

export function removeWishFromWall(wishes: GuestbookWish[], wishId: string): GuestbookWish[] {
  return wishes.filter((w) => w.id !== wishId);
}

const VALID_TONES: ReadonlySet<string> = new Set(['blush', 'cream', 'champagne', 'lavender']);

export function parseStoredWishes(raw: string | null, fallback: GuestbookWish[]): GuestbookWish[] {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;

    const sanitized: GuestbookWish[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (
        typeof rec.id === 'string' &&
        typeof rec.name === 'string' &&
        rec.name.trim().length > 0 &&
        typeof rec.message === 'string' &&
        rec.message.trim().length > 0
      ) {
        sanitized.push({
          id: rec.id,
          name: rec.name.trim(),
          message: rec.message.trim(),
          tone: typeof rec.tone === 'string' && VALID_TONES.has(rec.tone) ? (rec.tone as NoteTone) : 'blush',
          createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
          rotation: typeof rec.rotation === 'number' && Number.isFinite(rec.rotation) ? rec.rotation : pickStickyRotation(i),
          isUserCreated: Boolean(rec.isUserCreated),
        });
      }
    }
    return sanitized.length > 0 ? sanitized : fallback;
  } catch {
    return fallback;
  }
}

export function loadWishesFromStorage(
  fallback: GuestbookWish[],
  storage: Pick<Storage, 'getItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): GuestbookWish[] {
  if (!storage) return fallback;
  try {
    return parseStoredWishes(storage.getItem(GUESTBOOK_STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

export function saveWishesToStorage(
  wishes: GuestbookWish[],
  storage: Pick<Storage, 'setItem'> | undefined = typeof window !== 'undefined' ? window.localStorage : undefined
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GUESTBOOK_STORAGE_KEY, JSON.stringify(wishes));
    return true;
  } catch {
    return false;
  }
}
