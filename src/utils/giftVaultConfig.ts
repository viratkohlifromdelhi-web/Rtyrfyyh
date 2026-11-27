import {
  isValidVaultGiftCode,
  readLocalCustomVaultCode,
  sanitizeVaultGiftCode,
  writeLocalCustomVaultCode,
} from './infinityVault';

export interface GiftVaultConfigResult {
  code: string | null;
  isRealCode: boolean;
  source: 'firestore' | 'local' | 'default';
}

export interface GiftVaultSaveResult {
  ok: boolean;
  syncedToCloud: boolean;
  code: string | null;
}

const SITE_CONFIG_COLLECTION = 'site_config';
const GIFT_VAULT_DOC_ID = 'gift_vault';

/**
 * Non-blockingly reads the live real gift card override from Firestore `site_config/gift_vault`
 * using lazy dynamic imports so the Firebase SDK remains cleanly code-split from the initial bundle.
 * Always falls back safely to `localStorage` on network/offline errors.
 */
export async function fetchGiftVaultConfig(): Promise<GiftVaultConfigResult> {
  const cachedLocal = readLocalCustomVaultCode();

  try {
    const [{ db }, { doc, getDoc }] = await Promise.all([
      import('../firebase'),
      import('firebase/firestore'),
    ]);

    if (!db) {
      return cachedLocal
        ? { code: cachedLocal, isRealCode: true, source: 'local' }
        : { code: null, isRealCode: false, source: 'default' };
    }

    const snap = await getDoc(doc(db, SITE_CONFIG_COLLECTION, GIFT_VAULT_DOC_ID));
    if (!snap.exists()) {
      return cachedLocal
        ? { code: cachedLocal, isRealCode: true, source: 'local' }
        : { code: null, isRealCode: false, source: 'default' };
    }

    const data = snap.data() as { code?: unknown; isRealCode?: unknown } | undefined;
    const isReal = data?.isRealCode === true;
    const rawCode = typeof data?.code === 'string' ? sanitizeVaultGiftCode(data.code) : '';

    if (isReal && isValidVaultGiftCode(rawCode)) {
      writeLocalCustomVaultCode(rawCode);
      return { code: rawCode, isRealCode: true, source: 'firestore' };
    }

    // Explicitly restored to placeholder mode in Firestore -> sync local cache
    if (data?.isRealCode === false) {
      writeLocalCustomVaultCode(null);
      return { code: null, isRealCode: false, source: 'firestore' };
    }

    return cachedLocal
      ? { code: cachedLocal, isRealCode: true, source: 'local' }
      : { code: null, isRealCode: false, source: 'default' };
  } catch {
    return cachedLocal
      ? { code: cachedLocal, isRealCode: true, source: 'local' }
      : { code: null, isRealCode: false, source: 'default' };
  }
}

/**
 * Persists a validated 16-to-20 char alphanumeric real gift code to Firestore (`site_config/gift_vault`)
 * and mirrors it immediately to `localStorage` for instant zero-latency access.
 */
export async function saveRealGiftVaultCode(rawCode: string): Promise<GiftVaultSaveResult> {
  const cleanCode = sanitizeVaultGiftCode(rawCode);
  if (!isValidVaultGiftCode(cleanCode)) {
    return { ok: false, syncedToCloud: false, code: null };
  }

  writeLocalCustomVaultCode(cleanCode);

  try {
    const [{ db }, { doc, serverTimestamp, setDoc }] = await Promise.all([
      import('../firebase'),
      import('firebase/firestore'),
    ]);

    if (!db) {
      return { ok: true, syncedToCloud: false, code: cleanCode };
    }

    await setDoc(
      doc(db, SITE_CONFIG_COLLECTION, GIFT_VAULT_DOC_ID),
      {
        code: cleanCode,
        isRealCode: true,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      },
      { merge: true },
    );

    return { ok: true, syncedToCloud: true, code: cleanCode };
  } catch {
    return { ok: true, syncedToCloud: false, code: cleanCode };
  }
}

/**
 * Clears the real gift code override in both `localStorage` and Firestore (`site_config/gift_vault`),
 * restoring the default generated 12-digit placeholder code behavior.
 */
export async function restoreFakeGiftVaultCode(): Promise<GiftVaultSaveResult> {
  writeLocalCustomVaultCode(null);

  try {
    const [{ db }, { doc, serverTimestamp, setDoc }] = await Promise.all([
      import('../firebase'),
      import('firebase/firestore'),
    ]);

    if (!db) {
      return { ok: true, syncedToCloud: false, code: null };
    }

    await setDoc(
      doc(db, SITE_CONFIG_COLLECTION, GIFT_VAULT_DOC_ID),
      {
        code: '',
        isRealCode: false,
        updatedAt: serverTimestamp(),
        updatedAtMs: Date.now(),
      },
      { merge: true },
    );

    return { ok: true, syncedToCloud: true, code: null };
  } catch {
    return { ok: true, syncedToCloud: false, code: null };
  }
}
