export interface FirestoreDiagnosticStatus {
  status: 'checking' | 'connected' | 'error';
  code: string | null;
  label: string;
  detail: string;
  projectId: string;
  databaseId: string;
  checkedAtMs: number;
}

const KNOWN_FIRESTORE_CODES = [
  'permission-denied',
  'not-found',
  'unavailable',
  'unauthenticated',
  'failed-precondition',
  'resource-exhausted',
  'deadline-exceeded',
  'invalid-argument',
  'cancelled',
  'internal',
  'aborted',
] as const;

/**
 * Extracts a concise Firestore error code (e.g. `permission-denied`, `not-found`, `unavailable`)
 * and human-readable detail from any thrown SDK error object or raw string.
 */
export function parseFirestoreErrorSummary(error: unknown): {
  code: string | null;
  label: string;
  detail: string;
} {
  let rawCode = '';
  let rawMessage = '';

  if (typeof error === 'object' && error !== null) {
    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === 'string') {
      rawCode = maybeCode.trim();
    }
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === 'string') {
      rawMessage = maybeMessage.trim();
    }
  } else if (typeof error === 'string') {
    rawMessage = error.trim();
  } else if (error != null) {
    rawMessage = String(error).trim();
  }

  // Normalize codes like "firestore/permission-denied" -> "permission-denied"
  const normalizedCode = rawCode.includes('/')
    ? rawCode.slice(rawCode.lastIndexOf('/') + 1).toLowerCase()
    : rawCode.toLowerCase();

  if (normalizedCode) {
    return {
      code: normalizedCode,
      label: normalizedCode,
      detail: rawMessage || normalizedCode,
    };
  }

  const lowerMsg = rawMessage.toLowerCase();

  // Detect known Firestore error codes inside error strings
  for (const known of KNOWN_FIRESTORE_CODES) {
    if (lowerMsg.includes(known)) {
      return {
        code: known,
        label: known,
        detail: rawMessage,
      };
    }
  }

  if (lowerMsg.includes('missing or insufficient permissions')) {
    return {
      code: 'permission-denied',
      label: 'permission-denied',
      detail: rawMessage,
    };
  }

  if (lowerMsg.includes('database') && lowerMsg.includes('does not exist')) {
    return {
      code: 'not-found',
      label: 'not-found',
      detail: rawMessage,
    };
  }

  if (lowerMsg.includes('client is offline') || lowerMsg.includes('failed to get document because')) {
    return {
      code: 'unavailable',
      label: 'offline / unavailable',
      detail: rawMessage,
    };
  }

  const cleaned = rawMessage
    .replace(/^FirebaseError:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const shortLabel = cleaned
    ? cleaned.length > 44
      ? `${cleaned.slice(0, 41)}...`
      : cleaned
    : 'unknown-error';

  return {
    code: null,
    label: shortLabel,
    detail: cleaned || 'Unknown Firestore error',
  };
}
