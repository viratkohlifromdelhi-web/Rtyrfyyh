/**
 * Pure domain constants, state transitions, 60fps orbital deceleration math,
 * Thanos-snap dust particle engine, and localStorage persistence helpers for
 * "The Infinity Gift Vault" section.
 */

export const VAULT_STORAGE_KEY = 'morgan_infinity_vault_v1';
export const SUMMARY_CONSUMED_KEY = 'morgan_summary_consumed_v1';
export const VAULT_CUSTOM_CODE_STORAGE_KEY = 'infinity_vault_custom_code_v1';
export const VAULT_UNLOCK_CODE = '1845';
export const VAULT_RESET_CODE = '9876';
export const VAULT_OWNER_EDIT_CODE = '1507';
export const VAULT_CUSTOM_CODE_MIN_LEN = 16;
export const VAULT_CUSTOM_CODE_MAX_LEN = 20;
export const RIGGED_GIFT_VALUE = 250;
export const RIGGED_GIFT_DISPLAY = '₹250';
export const CLAIMED_DATE_LABEL = '3 Dec';

export const PRIZE_POOL_TIERS = ['₹50', '₹100', '₹150', '₹250', '₹500', '₹1,000'] as const;

export const ORBIT_BASE_SPEED_RAD = 1.5; // rad/s smooth orbital rotation
export const ORBIT_STOP_DURATION_SEC = 1.4; // cubic ease-out deceleration duration
export const MAX_VAULT_DT_SEC = 0.05;

export type InfinityStoneId = 'space' | 'mind' | 'reality' | 'power' | 'time' | 'soul';

export interface InfinityStoneSpec {
  id: InfinityStoneId;
  name: string;
  core: string;
  bodyStart: string;
  bodyEnd: string;
  darkEdge: string;
  aura: string;
  glow: string;
  sparkColor: string;
  dustPalette: readonly [string, string, string, string];
}

export const INFINITY_STONES: readonly InfinityStoneSpec[] = [
  {
    id: 'space',
    name: 'Space Stone',
    core: '#F0FAFF',
    bodyStart: '#2A9BFF',
    bodyEnd: '#08349C',
    darkEdge: '#03154A',
    aura: '#38A7FF',
    glow: 'rgba(56, 167, 255, 0.72)',
    sparkColor: '#BCE7FF',
    dustPalette: ['#F0FAFF', '#64BEFF', '#2A9BFF', '#08349C'],
  },
  {
    id: 'mind',
    name: 'Mind Stone',
    core: '#FFFFF0',
    bodyStart: '#FFD538',
    bodyEnd: '#C97B00',
    darkEdge: '#5E3300',
    aura: '#FFCC33',
    glow: 'rgba(255, 204, 51, 0.72)',
    sparkColor: '#FFF3B0',
    dustPalette: ['#FFFFF0', '#FFE26A', '#FFD538', '#C97B00'],
  },
  {
    id: 'reality',
    name: 'Reality Stone',
    core: '#FFF0F2',
    bodyStart: '#F21B38',
    bodyEnd: '#8C0018',
    darkEdge: '#3D000A',
    aura: '#FF2947',
    glow: 'rgba(255, 41, 71, 0.72)',
    sparkColor: '#FF94A3',
    dustPalette: ['#FFF0F2', '#FF5970', '#F21B38', '#8C0018'],
  },
  {
    id: 'power',
    name: 'Power Stone',
    core: '#FAF0FF',
    bodyStart: '#B238FF',
    bodyEnd: '#5B00B5',
    darkEdge: '#250052',
    aura: '#BD4DFF',
    glow: 'rgba(189, 77, 255, 0.72)',
    sparkColor: '#E2B3FF',
    dustPalette: ['#FAF0FF', '#CE78FF', '#B238FF', '#5B00B5'],
  },
  {
    id: 'time',
    name: 'Time Stone',
    core: '#EEFFF6',
    bodyStart: '#0CE67E',
    bodyEnd: '#00753A',
    darkEdge: '#00331A',
    aura: '#19F08A',
    glow: 'rgba(25, 240, 138, 0.72)',
    sparkColor: '#96FFCC',
    dustPalette: ['#EEFFF6', '#59F5AA', '#0CE67E', '#00753A'],
  },
  {
    id: 'soul',
    name: 'Soul Stone',
    core: '#FFF6E8',
    bodyStart: '#FF8811',
    bodyEnd: '#BA4000',
    darkEdge: '#521800',
    aura: '#FF9124',
    glow: 'rgba(255, 145, 36, 0.72)',
    sparkColor: '#FFCA8A',
    dustPalette: ['#FFF6E8', '#FFB057', '#FF8811', '#BA4000'],
  },
] as const;

export interface VaultClaimRecord {
  claimed: boolean;
  code: string;
  stoneName: string;
  stoneId: InfinityStoneId;
  claimedOn: string;
}

export interface OneTimeSummaryGiftData {
  value: string;
  code: string;
  stoneId: InfinityStoneId;
  stoneName: string;
  stoneColor: string;
  stoneGlow: string;
}

export type PasscodeResolution = 'unlock' | 'alreadyClaimed' | 'reset' | 'ownerEdit' | 'wrong';

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  initialSize: number;
  alpha: number;
  lifeSec: number;
  maxLifeSec: number;
  color: string;
  phase: number;
  curlFreq: number;
  curlAmp: number;
  delaySec: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function clampVaultDt(dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return 0.001;
  return Math.min(Math.max(dtMs / 1000, 0.001), MAX_VAULT_DT_SEC);
}

/**
 * Evaluates a 4-digit passcode against the vault rules:
 * - '9876' ALWAYS resets the vault (even if already claimed).
 * - '1507' ALWAYS opens the discreet Owner Gift Code Editor.
 * - '1845' unlocks if unclaimed, or routes to 'alreadyClaimed' if already claimed.
 * - Any other code returns 'wrong'.
 */
export function evaluateVaultPasscode(
  rawCode: string,
  existingClaim: VaultClaimRecord | null,
): PasscodeResolution {
  const normalized = rawCode.trim();
  if (normalized === VAULT_RESET_CODE) {
    return 'reset';
  }
  if (normalized === VAULT_OWNER_EDIT_CODE) {
    return 'ownerEdit';
  }
  if (normalized === VAULT_UNLOCK_CODE) {
    return existingClaim?.claimed ? 'alreadyClaimed' : 'unlock';
  }
  return 'wrong';
}

/**
 * Normalizes owner-entered real gift card codes: uppercase + whitespace stripped.
 */
export function sanitizeVaultGiftCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, '');
}

/**
 * Strict validator for real gift card codes: 16 to 20 uppercase alphanumeric characters (A-Z, 0-9).
 */
export function isValidVaultGiftCode(raw: string): boolean {
  const clean = sanitizeVaultGiftCode(raw);
  return /^[A-Z0-9]{16,20}$/.test(clean);
}

/**
 * Formats a real 16-20 char alphanumeric code into clean 4-character space-separated groups
 * (e.g. "ABCD EFGH IJKL MNOP") with ZERO dashes.
 * For legacy 12-digit placeholder codes, preserves clean middle-dot grouping with zero dashes.
 */
export function formatVaultGiftCodeDisplay(raw: string): string {
  const clean = sanitizeVaultGiftCode(raw);
  if (/^[A-Z0-9]{16,20}$/.test(clean)) {
    const groups: string[] = [];
    for (let i = 0; i < clean.length; i += 4) {
      groups.push(clean.slice(i, i + 4));
    }
    return groups.join(' ');
  }
  return raw.replace(/\s*[-–—]\s*/g, ' · ').trim();
}

/**
 * Returns the exact raw string copied to the clipboard:
 * - For real 16-20 char alphanumeric codes: exact raw uppercase alphanumeric string (zero spaces/dashes).
 * - For 12-digit placeholder codes: clean formatted code.
 */
export function getRawCopyableVaultCode(raw: string): string {
  const clean = sanitizeVaultGiftCode(raw);
  if (/^[A-Z0-9]{16,20}$/.test(clean)) {
    return clean;
  }
  return raw.replace(/\s*[-–—]\s*/g, ' · ').trim();
}

export function readLocalCustomVaultCode(storage?: StorageLike | null): string | null {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return null;
  try {
    const raw = store.getItem(VAULT_CUSTOM_CODE_STORAGE_KEY);
    if (!raw) return null;
    const clean = sanitizeVaultGiftCode(raw);
    return isValidVaultGiftCode(clean) ? clean : null;
  } catch {
    return null;
  }
}

export function writeLocalCustomVaultCode(
  code: string | null,
  storage?: StorageLike | null,
): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;
  try {
    if (!code) {
      store.removeItem(VAULT_CUSTOM_CODE_STORAGE_KEY);
      return;
    }
    const clean = sanitizeVaultGiftCode(code);
    if (isValidVaultGiftCode(clean)) {
      store.setItem(VAULT_CUSTOM_CODE_STORAGE_KEY, clean);
    } else {
      store.removeItem(VAULT_CUSTOM_CODE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / private mode restrictions
  }
}

/**
 * Strict rigged outcome: regardless of which of the 6 Infinity Stones is picked,
 * the revealed gift card value is ALWAYS ₹250.
 */
export function resolveVaultRewardValue(_stoneId: InfinityStoneId): number {
  return RIGGED_GIFT_VALUE;
}

export function getStoneById(stoneId: InfinityStoneId): InfinityStoneSpec {
  return INFINITY_STONES.find((s) => s.id === stoneId) ?? INFINITY_STONES[0];
}

/**
 * Generates a realistic 12-digit gift card code formatted in 3 groups of 4 digits
 * (e.g. "4829 · 7104 · 9362").
 */
export function generateGiftCardCode(rng: () => number = Math.random): string {
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let chunk = '';
    for (let d = 0; d < 4; d++) {
      // Avoid leading 0 on first digit for cleaner realistic look
      const min = g === 0 && d === 0 ? 1 : 0;
      const span = 10 - min;
      const digit = min + Math.floor(Math.max(0, Math.min(0.999999, rng())) * span);
      chunk += String(digit);
    }
    groups.push(chunk);
  }
  return groups.join(' · ');
}

/**
 * Cubic ease-out angular deceleration curve from ORBIT_BASE_SPEED_RAD -> 0 over 1.4s.
 */
export function computeStoppingAngularVelocity(
  elapsedSec: number,
  startSpeedRad = ORBIT_BASE_SPEED_RAD,
  durationSec = ORBIT_STOP_DURATION_SEC,
): number {
  if (durationSec <= 0) return 0;
  const u = Math.max(0, Math.min(1, elapsedSec / durationSec));
  return startSpeedRad * Math.pow(1 - u, 3);
}

/**
 * Computes (x, y) pixel offset from ring center for stone `index` (0..5)
 * at orbital angle `baseAngleRad`.
 */
export function computeStoneOrbitPosition(
  index: number,
  baseAngleRad: number,
  radiusPx: number,
): { x: number; y: number } {
  const angle = baseAngleRad + (index * Math.PI * 2) / INFINITY_STONES.length - Math.PI / 2;
  return {
    x: Math.cos(angle) * radiusPx,
    y: Math.sin(angle) * radiusPx,
  };
}

/**
 * Spawns shimmering Thanos-snap dust/ash particles directly at a stone's canvas coordinates.
 */
export function spawnStoneDustParticles(params: {
  cx: number;
  cy: number;
  spreadPx: number;
  count: number;
  palette: readonly string[];
  intensity?: 'unselected' | 'chosen';
  rng?: () => number;
}): DustParticle[] {
  const rng = params.rng ?? Math.random;
  const isChosen = params.intensity === 'chosen';
  const out: DustParticle[] = [];

  for (let i = 0; i < params.count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = Math.sqrt(rng()) * params.spreadPx;
    const x = params.cx + Math.cos(angle) * dist;
    const y = params.cy + Math.sin(angle) * dist;

    // Organic Thanos-snap drift: mostly upward & rightward with varied grain speeds
    const driftSpeed = isChosen ? 38 + rng() * 95 : 26 + rng() * 68;
    const vx = (isChosen ? 18 : 24) + rng() * (isChosen ? 62 : 52) + Math.cos(angle) * (isChosen ? 28 : 10);
    const vy = -driftSpeed + (rng() - 0.5) * 20;

    const initialSize = isChosen ? 1.5 + rng() * 3.1 : 1.2 + rng() * 2.5;
    const maxLifeSec = isChosen ? 0.75 + rng() * 0.65 : 0.65 + rng() * 0.6;
    const delaySec = isChosen ? rng() * 0.14 : rng() * 0.24;
    const colorIdx = Math.floor(rng() * params.palette.length);

    out.push({
      x,
      y,
      vx,
      vy,
      size: initialSize,
      initialSize,
      alpha: 1,
      lifeSec: 0,
      maxLifeSec,
      color: params.palette[colorIdx] ?? '#FFE6F0',
      phase: rng() * Math.PI * 2,
      curlFreq: 2.5 + rng() * 4.0,
      curlAmp: 12 + rng() * 24,
      delaySec,
    });
  }

  return out;
}

/**
 * Advances all active dust particles by `dtSec` and prunes faded particles (`alpha <= 0`).
 * Returns the remaining active particle list (empty when canvas loop should stop).
 */
export function stepDustParticles(particles: DustParticle[], dtSec: number): DustParticle[] {
  const next: DustParticle[] = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.delaySec > 0) {
      p.delaySec = Math.max(0, p.delaySec - dtSec);
      next.push(p);
      continue;
    }

    p.lifeSec += dtSec;
    if (p.lifeSec >= p.maxLifeSec) {
      continue;
    }

    const u = p.lifeSec / p.maxLifeSec;
    const windCurlX = Math.sin(p.lifeSec * p.curlFreq + p.phase) * p.curlAmp;
    const windCurlY = Math.cos(p.lifeSec * (p.curlFreq * 0.8) + p.phase) * (p.curlAmp * 0.35);

    p.x += (p.vx + windCurlX) * dtSec;
    p.y += (p.vy + windCurlY) * dtSec;
    // Gentle upward acceleration as ash turns weightless
    p.vy -= 18 * dtSec;
    p.vx += 14 * dtSec;

    p.alpha = Math.max(0, Math.pow(1 - u, 1.35));
    p.size = Math.max(0.25, p.initialSize * (1 - u * 0.72));

    if (p.alpha > 0.01) {
      next.push(p);
    }
  }
  return next;
}

export function readVaultClaim(storage?: StorageLike | null): VaultClaimRecord | null {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return null;
  try {
    const raw = store.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VaultClaimRecord>;
    if (
      parsed &&
      parsed.claimed === true &&
      typeof parsed.code === 'string' &&
      parsed.code.length >= 12 &&
      typeof parsed.stoneName === 'string'
    ) {
      const validStoneId = INFINITY_STONES.some((s) => s.id === parsed.stoneId)
        ? (parsed.stoneId as InfinityStoneId)
        : (INFINITY_STONES.find((s) => s.name === parsed.stoneName)?.id ?? 'reality');
      return {
        claimed: true,
        code: parsed.code,
        stoneName: parsed.stoneName,
        stoneId: validStoneId,
        claimedOn: typeof parsed.claimedOn === 'string' && parsed.claimedOn ? parsed.claimedOn : CLAIMED_DATE_LABEL,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeVaultClaim(record: VaultClaimRecord, storage?: StorageLike | null): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;
  try {
    store.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota / private mode restrictions
  }
}

export function clearVaultClaim(storage?: StorageLike | null): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;
  try {
    store.removeItem(VAULT_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions
  }
}

export function isSummaryConsumed(storage?: StorageLike | null): boolean {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return false;
  try {
    return store.getItem(SUMMARY_CONSUMED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Atomically marks the one-time footer summary card as consumed on the very first unlock.
 * Returns true ONLY if it was previously unconsumed (first time), false otherwise.
 */
export function consumeOneTimeSummary(storage?: StorageLike | null): boolean {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return true;
  try {
    if (store.getItem(SUMMARY_CONSUMED_KEY) === 'true') {
      return false;
    }
    store.setItem(SUMMARY_CONSUMED_KEY, 'true');
    return true;
  } catch {
    return true;
  }
}

export function clearSummaryConsumed(storage?: StorageLike | null): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return;
  try {
    store.removeItem(SUMMARY_CONSUMED_KEY);
  } catch {
    // Ignore storage restrictions
  }
}
