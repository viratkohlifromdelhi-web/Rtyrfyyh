import { IGNORE_OWNER_STORAGE_KEY, isInsightsQuery } from './analyticsCore';

interface DeferredEventRecord {
  eventType: string;
  elementName: string;
  details?: Record<string, unknown>;
  eventTimeMs: number;
}

type AnalyticsClientModule = typeof import('./analyticsClient');

let bootScheduled = false;
let clientModule: AnalyticsClientModule | null = null;
let clientLoadPromise: Promise<AnalyticsClientModule | null> | null = null;
const preBootQueue: DeferredEventRecord[] = [];

export function isOwnerDeviceIgnoredFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(IGNORE_OWNER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isOwnerAnalyticsIgnored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (isInsightsQuery(window.location.search)) return true;
    return isOwnerDeviceIgnoredFlag();
  } catch {
    return false;
  }
}

export function setOwnerAnalyticsIgnored(ignored: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (ignored) {
      window.localStorage.setItem(IGNORE_OWNER_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(IGNORE_OWNER_STORAGE_KEY);
    }
  } catch {
    // storage disabled — ignore safely
  }
}

function loadAnalyticsClient(): Promise<AnalyticsClientModule | null> {
  if (clientModule) return Promise.resolve(clientModule);
  if (clientLoadPromise) return clientLoadPromise;

  clientLoadPromise = import('./analyticsClient')
    .then((mod) => {
      clientModule = mod;
      return mod;
    })
    .catch(() => null);

  return clientLoadPromise;
}

function scheduleDeferredBoot(task: () => void): void {
  if (typeof window === 'undefined') return;
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  // Always wait at least 800ms after mount so initial paint and intro video startup
  // never compete with the Firebase SDK download or WebGL GPU probe.
  window.setTimeout(() => {
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(task, { timeout: 2000 });
    } else {
      task();
    }
  }, 800);
}

/**
 * Defers Firebase SDK loading & Firestore session initialization until after
 * first paint / idle breathing room so the intro video & hero paint instantaneously.
 */
export function initAnalytics(opts?: { isMidnightLocked?: boolean }): void {
  if (typeof window === 'undefined' || bootScheduled) return;
  if (isOwnerAnalyticsIgnored()) return;

  bootScheduled = true;

  scheduleDeferredBoot(() => {
    if (isOwnerAnalyticsIgnored()) return;
    void loadAnalyticsClient().then((mod) => {
      if (!mod) return;
      const queued = preBootQueue.splice(0, preBootQueue.length);
      mod.initAnalyticsClient(opts, queued);
    });
  });
}

/**
 * Zero-Firebase event tracker facade. Buffers any early interactions in memory
 * until the deferred Firebase analytics chunk finishes booting.
 */
export function trackEvent(
  eventType: string,
  elementName: string,
  details?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  if (isOwnerAnalyticsIgnored()) return;

  if (clientModule) {
    clientModule.trackAnalyticsEvent(eventType, elementName, details);
    return;
  }

  if (preBootQueue.length < 40) {
    preBootQueue.push({
      eventType,
      elementName,
      details,
      eventTimeMs: Date.now(),
    });
  }
}

export function stopAnalyticsHeartbeatForTesting(): void {
  clientModule?.stopAnalyticsClientHeartbeatForTesting();
}
