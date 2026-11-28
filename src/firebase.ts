import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import {
  parseFirestoreErrorSummary,
  type FirestoreDiagnosticStatus,
} from './utils/firestoreDiagnostics';

/**
 * Bundled production Firebase config (intentionally zero reliance on `.env` or
 * gitignored files so GitHub/Vercel deployments always connect cleanly).
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDwScfpdKJcP5YQOhatdRiqntUMqrlx31k',
  authDomain: 'gen-lang-client-0754090753.firebaseapp.com',
  projectId: 'gen-lang-client-0754090753',
  storageBucket: 'gen-lang-client-0754090753.firebasestorage.app',
  messagingSenderId: '92833088079',
  appId: '1:92833088079:web:f3aeb721437a6384aea03a',
} as const;

export const FIRESTORE_DATABASE_ID =
  'ai-studio-sparklebirth-a0b84cb4-d4cc-4884-8dcf-d62c60302c42';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationTypeValue;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let initError: unknown = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
  dbInstance = getFirestore(
    appInstance,
    'ai-studio-sparklebirth-a0b84cb4-d4cc-4884-8dcf-d62c60302c42',
  );
  authInstance = getAuth(appInstance);
} catch (error) {
  initError = error;
  appInstance = null;
  dbInstance = null;
  authInstance = null;
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const firebaseProjectId = FIREBASE_CONFIG.projectId;
export const firebaseDatabaseId = FIRESTORE_DATABASE_ID;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationTypeValue,
  path: string | null,
): FirestoreErrorInfo {
  const user = auth?.currentUser;
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid ?? null,
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
      tenantId: user?.tenantId ?? null,
      providerInfo:
        user?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationTypeValue,
  path: string | null,
  options?: { silent?: boolean },
): FirestoreErrorInfo {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  if (options?.silent) {
    return errInfo;
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Live server-roundtrip diagnostic check used exclusively inside `?insights=9876`.
 * Probes publicly readable `site_config/gift_vault` on the named database to confirm
 * live Firestore reachability and rules access, or returns the exact Firestore error code.
 */
export async function checkFirestoreConnection(): Promise<FirestoreDiagnosticStatus> {
  const checkedAtMs = Date.now();
  if (!db) {
    const parsed = parseFirestoreErrorSummary(initError ?? 'Firestore SDK failed to initialize');
    return {
      status: 'error',
      code: parsed.code ?? 'init-failed',
      label: parsed.label,
      detail: parsed.detail,
      projectId: firebaseProjectId,
      databaseId: firebaseDatabaseId,
      checkedAtMs,
    };
  }

  try {
    await getDocFromServer(doc(db, 'site_config', 'gift_vault'));
    return {
      status: 'connected',
      code: null,
      label: 'Connected',
      detail: `Connected to ${firebaseProjectId} (${firebaseDatabaseId})`,
      projectId: firebaseProjectId,
      databaseId: firebaseDatabaseId,
      checkedAtMs: Date.now(),
    };
  } catch (error) {
    const parsed = parseFirestoreErrorSummary(error);
    return {
      status: 'error',
      code: parsed.code,
      label: parsed.label,
      detail: parsed.detail,
      projectId: firebaseProjectId,
      databaseId: firebaseDatabaseId,
      checkedAtMs: Date.now(),
    };
  }
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested || !db || typeof window === 'undefined') return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'site_config', 'gift_vault'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  void testFirestoreConnection();
}
