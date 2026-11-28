import assert from 'node:assert/strict';
import test from 'node:test';
import { isAuthorizedOwnerEmail } from './analyticsCore';
import { parseFirestoreErrorSummary } from './firestoreDiagnostics';
import { FIREBASE_CONFIG, FIRESTORE_DATABASE_ID } from '../firebase';

test('FIREBASE_CONFIG and FIRESTORE_DATABASE_ID match exact live deployment settings', () => {
  assert.equal(FIREBASE_CONFIG.apiKey, 'AIzaSyDwScfpdKJcP5YQOhatdRiqntUMqrlx31k');
  assert.equal(FIREBASE_CONFIG.authDomain, 'gen-lang-client-0754090753.firebaseapp.com');
  assert.equal(FIREBASE_CONFIG.projectId, 'gen-lang-client-0754090753');
  assert.equal(FIREBASE_CONFIG.storageBucket, 'gen-lang-client-0754090753.firebasestorage.app');
  assert.equal(FIREBASE_CONFIG.messagingSenderId, '92833088079');
  assert.equal(FIREBASE_CONFIG.appId, '1:92833088079:web:f3aeb721437a6384aea03a');
  assert.equal(
    FIRESTORE_DATABASE_ID,
    'ai-studio-sparklebirth-a0b84cb4-d4cc-4884-8dcf-d62c60302c42',
  );
});

test('parseFirestoreErrorSummary extracts exact Firestore error codes', () => {
  const perm = parseFirestoreErrorSummary({
    code: 'permission-denied',
    message: 'Missing or insufficient permissions.',
  });
  assert.equal(perm.code, 'permission-denied');
  assert.equal(perm.label, 'permission-denied');

  const prefixed = parseFirestoreErrorSummary({
    code: 'firestore/not-found',
    message: 'Database does not exist.',
  });
  assert.equal(prefixed.code, 'not-found');
  assert.equal(prefixed.label, 'not-found');

  const rawString = parseFirestoreErrorSummary('FirebaseError: Missing or insufficient permissions.');
  assert.equal(rawString.code, 'permission-denied');
  assert.equal(rawString.label, 'permission-denied');

  const offline = parseFirestoreErrorSummary(
    new Error('Failed to get document because the client is offline.'),
  );
  assert.equal(offline.code, 'unavailable');
  assert.equal(offline.label, 'offline / unavailable');
});

test('isAuthorizedOwnerEmail includes all configured owner accounts', () => {
  assert.equal(isAuthorizedOwnerEmail('sksandhya585@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('viratkohlifromdelhi@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('viratkohlifrommumbai@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('random@example.com'), false);
});
