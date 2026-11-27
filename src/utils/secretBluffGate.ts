/**
 * Pure passcode evaluation & copy constants for the Secret Passcode 1507 Bluff Gate.
 * Strictly zero visible dashes (—, –, -) in all user-facing strings.
 */

export const BLUFF_PASSCODE = '1507';
export const OWNER_BYPASS_CODE = '9876';
export const BLUFF_PASSCODE_MAX_LENGTH = 6;

export const BLUFF_GATE_COPY = {
  eyebrow: 'CLASSIFIED ACCESS',
  title: 'Secret Passcode Check',
  helper: 'Enter the 4 digit passcode to check if there is anything hidden.',
  unlockLabel: 'Unlock',
  wrongCodeHint: 'Wrong code. Try again.',
  ownerCodeNote: 'Owner code stays reserved for the countdown gate.',
  revealHeadlineLead: 'Ho gya scam?',
  revealHeadlinePunch: 'No Suprises Ahead!!',
  revealHeadlineFull: 'Ho gya scam? No Suprises Ahead!!',
  revealSubtext: 'Nothing to see here before the birthday date. Totally zero surprises.',
  resetLabel: 'Lock Passcode Again',
} as const;

export type BluffPasscodeResult = 'unlock_bluff' | 'ignore_owner' | 'wrong';

/**
 * Strips non-digit characters and caps length at 6 digits so numeric keyboards
 * and pasted values stay clean.
 */
export function sanitizeBluffPasscodeInput(raw: string): string {
  return raw.replace(/\D+/g, '').slice(0, BLUFF_PASSCODE_MAX_LENGTH);
}

/**
 * Evaluates a submitted passcode for the Secret Bluff Gate:
 * - '1507' -> reveals the clown bluff card
 * - '9876' -> recognized as reserved owner code (no error shake)
 * - anything else -> wrong code (triggers shake + error haptic + hint)
 */
export function evaluateBluffPasscode(raw: string): BluffPasscodeResult {
  const digits = sanitizeBluffPasscodeInput(raw);
  if (digits === BLUFF_PASSCODE) {
    return 'unlock_bluff';
  }
  if (digits === OWNER_BYPASS_CODE) {
    return 'ignore_owner';
  }
  return 'wrong';
}
