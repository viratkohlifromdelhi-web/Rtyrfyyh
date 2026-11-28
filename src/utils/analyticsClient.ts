import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  computeScrollPercent,
  formatISTDateTime,
  formatISTTime,
  IGNORE_OWNER_STORAGE_KEY,
  isInsightsQuery,
  parseUserAgentSpecs,
  sanitizeEventDetails,
  sanitizeEventType,
  sanitizeFiniteNumber,
  sanitizeInt,
  sanitizeString,
  SCROLL_MILESTONES,
  VISIT_COUNT_STORAGE_KEY,
  VISITOR_ID_STORAGE_KEY,
  type ColorSchemeKind,
  type HighEntropyUAValues,
  type OrientationKind,
} from './analyticsCore';

export interface DeferredEventInput {
  eventType: string;
  elementName: string;
  details?: Record<string, unknown>;
  eventTimeMs: number;
}

interface QueuedEvent {
  eventType: string;
  elementName: string;
  details: Record<string, unknown>;
  eventTimeMs: number;
  elapsedSeconds: number;
}

interface BatteryLike {
  level?: number;
  charging?: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

interface NetworkConnectionLike {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorExtended extends Navigator {
  userAgentData?: {
    getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyUAValues>;
  };
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryLike>;
  connection?: NetworkConnectionLike;
  mozConnection?: NetworkConnectionLike;
  webkitConnection?: NetworkConnectionLike;
}

let initialized = false;
let sessionId: string | null = null;
let sessionStartMs = 0;
let sessionDocCreated = false;
let maxScrollPct = 0;
let localInteractionCount = 0;
let pendingInteractionDelta = 0;
const firedScrollMilestones = new Set<number>();
const pendingEvents: QueuedEvent[] = [];
let heartbeatIntervalId: number | null = null;
let scrollThrottleTimerId: number | null = null;
let interactionFlushTimerId: number | null = null;

function generateSafeId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    }
  } catch {
    // fallback below
  }
  const rand = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

function isOwnerDeviceIgnoredFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(IGNORE_OWNER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function isOwnerAnalyticsIgnored(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (isInsightsQuery(window.location.search)) return true;
    return isOwnerDeviceIgnoredFlag();
  } catch {
    return false;
  }
}

function getOrCreateVisitorIdentity(): { visitorId: string; visitNumber: number } {
  let visitorId = generateSafeId('v');
  let visitNumber = 1;
  try {
    const existingVid = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
    if (existingVid && /^[a-zA-Z0-9_-]{4,128}$/.test(existingVid)) {
      visitorId = existingVid;
    } else {
      window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
    }

    const rawCount = window.localStorage.getItem(VISIT_COUNT_STORAGE_KEY);
    const parsed = rawCount ? Number.parseInt(rawCount, 10) : 0;
    visitNumber = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed + 1, 100000) : 1;
    window.localStorage.setItem(VISIT_COUNT_STORAGE_KEY, String(visitNumber));
  } catch {
    // Private browsing or blocked storage — continue with ephemeral ID
  }
  return { visitorId, visitNumber };
}

function readGpuRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return null;

    let renderer: string | null = null;
    try {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const raw = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        if (typeof raw === 'string' && raw.trim()) {
          renderer = sanitizeString(raw, 240);
        }
      }
      if (!renderer) {
        const fallback = gl.getParameter(gl.RENDERER);
        if (typeof fallback === 'string' && fallback.trim()) {
          renderer = sanitizeString(fallback, 240);
        }
      }
    } finally {
      try {
        const loseCtx = gl.getExtension('WEBGL_lose_context');
        loseCtx?.loseContext();
      } catch {
        // ignore context release errors
      }
    }
    return renderer;
  } catch {
    return null;
  }
}

function getCurrentOrientation(): OrientationKind {
  try {
    if (window.matchMedia?.('(orientation: landscape)').matches) return 'landscape';
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  } catch {
    return 'portrait';
  }
}

function getCurrentColorScheme(): ColorSchemeKind {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function getReducedMotionPreference(): boolean {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

function readNetworkDetails(): {
  connectionType: string | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean | null;
} {
  try {
    const nav = navigator as NavigatorExtended;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!conn) {
      return {
        connectionType: null,
        effectiveType: null,
        downlinkMbps: null,
        rttMs: null,
        saveData: null,
      };
    }
    return {
      connectionType: conn.type ? sanitizeString(conn.type, 60) : null,
      effectiveType: conn.effectiveType ? sanitizeString(conn.effectiveType, 40) : null,
      downlinkMbps: sanitizeFiniteNumber(conn.downlink, 0, 100000),
      rttMs: sanitizeFiniteNumber(conn.rtt, 0, 100000),
      saveData: typeof conn.saveData === 'boolean' ? conn.saveData : null,
    };
  } catch {
    return {
      connectionType: null,
      effectiveType: null,
      downlinkMbps: null,
      rttMs: null,
      saveData: null,
    };
  }
}

async function readBatteryDetails(): Promise<{
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  batteryChargingTime: number | null;
  batteryDischargingTime: number | null;
}> {
  try {
    const nav = navigator as NavigatorExtended;
    if (typeof nav.getBattery !== 'function') {
      return {
        batteryLevel: null,
        batteryCharging: null,
        batteryChargingTime: null,
        batteryDischargingTime: null,
      };
    }
    const battery = await nav.getBattery();
    const level =
      typeof battery?.level === 'number' && Number.isFinite(battery.level)
        ? sanitizeInt(Math.round(battery.level * 100), 0, 100)
        : null;
    return {
      batteryLevel: level,
      batteryCharging: typeof battery?.charging === 'boolean' ? battery.charging : null,
      batteryChargingTime: sanitizeFiniteNumber(battery?.chargingTime, 0, 10000000),
      batteryDischargingTime: sanitizeFiniteNumber(battery?.dischargingTime, 0, 10000000),
    };
  } catch {
    return {
      batteryLevel: null,
      batteryCharging: null,
      batteryChargingTime: null,
      batteryDischargingTime: null,
    };
  }
}

async function withTimeoutFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timer: number | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = window.setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  }
}

async function readHighEntropyUA(): Promise<HighEntropyUAValues | null> {
  try {
    const nav = navigator as NavigatorExtended;
    if (typeof nav.userAgentData?.getHighEntropyValues !== 'function') return null;
    const values = await nav.userAgentData.getHighEntropyValues([
      'model',
      'platform',
      'platformVersion',
      'architecture',
      'bitness',
      'fullVersionList',
    ]);
    return values ?? null;
  } catch {
    return null;
  }
}

async function fetchSilentGeoLookup(): Promise<{
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  postal: string | null;
  country: string | null;
  approxCoords: string | null;
  isp: string | null;
} | null> {
  const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<unknown> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      window.clearTimeout(timer);
    }
  };

  try {
    const primary = (await fetchWithTimeout('https://ipapi.co/json/', 3500)) as Record<
      string,
      unknown
    > | null;
    if (primary && !primary.error && (primary.ip || primary.city)) {
      const lat = typeof primary.latitude === 'number' ? primary.latitude : null;
      const lng = typeof primary.longitude === 'number' ? primary.longitude : null;
      return {
        ipAddress: primary.ip ? sanitizeString(String(primary.ip), 80) : null,
        city: primary.city ? sanitizeString(String(primary.city), 120) : null,
        region: primary.region ? sanitizeString(String(primary.region), 120) : null,
        postal: primary.postal ? sanitizeString(String(primary.postal), 40) : null,
        country: primary.country_name
          ? sanitizeString(String(primary.country_name), 120)
          : primary.country
            ? sanitizeString(String(primary.country), 120)
            : null,
        approxCoords:
          lat !== null && lng !== null
            ? sanitizeString(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, 80)
            : null,
        isp: primary.org ? sanitizeString(String(primary.org), 180) : null,
      };
    }
  } catch {
    // Fall through to secondary provider
  }

  try {
    const secondary = (await fetchWithTimeout('https://ipwho.is/', 3500)) as Record<
      string,
      unknown
    > | null;
    if (secondary && secondary.success !== false && (secondary.ip || secondary.city)) {
      const lat = typeof secondary.latitude === 'number' ? secondary.latitude : null;
      const lng = typeof secondary.longitude === 'number' ? secondary.longitude : null;
      const conn = secondary.connection as Record<string, unknown> | undefined;
      const ispRaw = conn?.isp || conn?.org || secondary.isp;
      return {
        ipAddress: secondary.ip ? sanitizeString(String(secondary.ip), 80) : null,
        city: secondary.city ? sanitizeString(String(secondary.city), 120) : null,
        region: secondary.region ? sanitizeString(String(secondary.region), 120) : null,
        postal: secondary.postal ? sanitizeString(String(secondary.postal), 40) : null,
        country: secondary.country ? sanitizeString(String(secondary.country), 120) : null,
        approxCoords:
          lat !== null && lng !== null
            ? sanitizeString(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, 80)
            : null,
        isp: ispRaw ? sanitizeString(String(ispRaw), 180) : null,
      };
    }
  } catch {
    // Silent failure — never interrupt visitor experience
  }

  return null;
}

async function flushHeartbeat(): Promise<void> {
  if (!db || !sessionId || !sessionDocCreated || isOwnerAnalyticsIgnored()) return;
  const deltaToFlush = pendingInteractionDelta;
  pendingInteractionDelta = 0;
  if (interactionFlushTimerId !== null) {
    window.clearTimeout(interactionFlushTimerId);
    interactionFlushTimerId = null;
  }
  try {
    const nowMs = Math.max(Date.now(), sessionStartMs);
    const durationSeconds = sanitizeInt((nowMs - sessionStartMs) / 1000, 0, 604800, 0);
    const payload: Record<string, unknown> = {
      lastActiveAtMs: nowMs,
      durationSeconds,
      maxScrollPct: sanitizeInt(maxScrollPct, 0, 100, 0),
    };
    if (deltaToFlush > 0) {
      payload.totalInteractions = increment(deltaToFlush);
    }
    const visitRef = doc(db, 'site_visits', sessionId);
    await updateDoc(visitRef, payload);
  } catch (error) {
    pendingInteractionDelta += deltaToFlush;
    handleFirestoreError(error, OperationType.UPDATE, `site_visits/${sessionId}`, {
      silent: true,
    });
  }
}

function scheduleBatchedInteractionFlush(): void {
  if (interactionFlushTimerId !== null) return;
  interactionFlushTimerId = window.setTimeout(() => {
    interactionFlushTimerId = null;
    if (pendingInteractionDelta > 0) {
      void flushHeartbeat();
    }
  }, 4000);
}

async function writeSingleEvent(ev: QueuedEvent): Promise<void> {
  if (!db || !sessionId || !sessionDocCreated || isOwnerAnalyticsIgnored()) return;
  const eventsPath = `site_visits/${sessionId}/events`;
  try {
    await addDoc(collection(db, 'site_visits', sessionId, 'events'), {
      eventTime: serverTimestamp(),
      eventTimeMs: Math.floor(ev.eventTimeMs),
      eventTimeIST: sanitizeString(formatISTTime(ev.eventTimeMs), 40, '00:00:00'),
      elapsedSeconds: sanitizeInt(ev.elapsedSeconds, 0, 604800, 0),
      eventType: ev.eventType,
      elementName: ev.elementName,
      details: ev.details,
    });
    localInteractionCount += 1;
    pendingInteractionDelta += 1;
    scheduleBatchedInteractionFlush();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, eventsPath, { silent: true });
  }
}

async function flushPendingEvents(): Promise<void> {
  if (!sessionDocCreated || pendingEvents.length === 0) return;
  const batch = pendingEvents.splice(0, pendingEvents.length);
  for (const ev of batch) {
    await writeSingleEvent(ev);
  }
  if (pendingInteractionDelta > 0) {
    await flushHeartbeat();
  }
}

function handleScrollPassive(): void {
  if (scrollThrottleTimerId !== null) return;
  scrollThrottleTimerId = window.setTimeout(() => {
    scrollThrottleTimerId = null;
    try {
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0,
      );
      const pct = computeScrollPercent(window.scrollY, window.innerHeight, scrollHeight);
      if (pct > maxScrollPct) {
        maxScrollPct = pct;
      }
      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !firedScrollMilestones.has(milestone)) {
          firedScrollMilestones.add(milestone);
          trackAnalyticsEvent('scroll_milestone', `Scrolled ${milestone}%`, { percent: milestone });
        }
      }
    } catch {
      // ignore scroll measurement errors
    }
  }, 500);
}

function attachSessionListeners(): void {
  try {
    window.addEventListener('scroll', handleScrollPassive, { passive: true });

    document.addEventListener('visibilitychange', () => {
      try {
        if (document.visibilityState === 'hidden') {
          trackAnalyticsEvent('tab_hidden', 'Tab Hidden / Backgrounded', {
            maxScrollPct,
            totalInteractions: localInteractionCount,
          });
          void flushHeartbeat();
        } else if (document.visibilityState === 'visible') {
          trackAnalyticsEvent('tab_returned', 'Returned to Tab', {
            maxScrollPct,
          });
        }
      } catch {
        // silent
      }
    });

    window.addEventListener('pagehide', () => {
      void flushHeartbeat();
    });

    let lastOrientation: OrientationKind = getCurrentOrientation();
    const onOrientationMaybeChanged = () => {
      try {
        const next = getCurrentOrientation();
        if (next === lastOrientation) return;
        lastOrientation = next;
        trackAnalyticsEvent('orientation_changed', `Orientation -> ${next}`, { orientation: next });
        if (db && sessionId && sessionDocCreated && !isOwnerAnalyticsIgnored()) {
          void updateDoc(doc(db, 'site_visits', sessionId), {
            orientation: next,
            lastActiveAtMs: Math.max(Date.now(), sessionStartMs),
          }).catch(() => {});
        }
      } catch {
        // silent
      }
    };

    window.addEventListener('orientationchange', onOrientationMaybeChanged, { passive: true });
    window.addEventListener('resize', onOrientationMaybeChanged, { passive: true });

    heartbeatIntervalId = window.setInterval(() => {
      try {
        if (document.visibilityState === 'visible') {
          void flushHeartbeat();
        }
      } catch {
        // silent
      }
    }, 15000);
  } catch {
    // silent
  }
}

export function initAnalyticsClient(
  opts?: { isMidnightLocked?: boolean },
  initialQueuedEvents: DeferredEventInput[] = [],
): void {
  if (typeof window === 'undefined' || initialized) return;
  if (isOwnerAnalyticsIgnored()) return;
  if (!db) return;

  initialized = true;
  sessionStartMs = Date.now();
  sessionId = generateSafeId('sess');
  maxScrollPct = 0;
  localInteractionCount = 0;

  for (const raw of initialQueuedEvents) {
    if (pendingEvents.length >= 40) break;
    const elapsedSeconds = Math.max(0, Math.round((raw.eventTimeMs - sessionStartMs) / 1000));
    pendingEvents.push({
      eventType: sanitizeEventType(raw.eventType),
      elementName: sanitizeString(raw.elementName, 160, 'Interaction'),
      details: sanitizeEventDetails(raw.details),
      eventTimeMs: raw.eventTimeMs,
      elapsedSeconds,
    });
  }

  attachSessionListeners();

  // Fully asynchronous non-blocking initialization
  void (async () => {
    try {
      const { visitorId, visitNumber } = getOrCreateVisitorIdentity();
      const [highEntropy, battery] = await Promise.all([
        withTimeoutFallback(readHighEntropyUA(), 1500, null),
        withTimeoutFallback(readBatteryDetails(), 1500, {
          batteryLevel: null,
          batteryCharging: null,
          batteryChargingTime: null,
          batteryDischargingTime: null,
        }),
      ]);

      const ua = navigator.userAgent || '';
      const referrer = document.referrer || 'direct';
      const parsed = parseUserAgentSpecs(ua, referrer, highEntropy);
      const network = readNetworkDetails();
      const navExt = navigator as NavigatorExtended;

      const screenResolution = sanitizeString(
        `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
        40,
        '0x0',
      );
      const viewportSize = sanitizeString(
        `${window.innerWidth ?? 0}x${window.innerHeight ?? 0}`,
        40,
        '0x0',
      );
      const pixelRatio = sanitizeFiniteNumber(window.devicePixelRatio || 1, 0.25, 16) ?? 1;
      const colorDepth = sanitizeInt(window.screen?.colorDepth ?? 24, 0, 64, 24);
      const cpuCores =
        typeof navigator.hardwareConcurrency === 'number'
          ? sanitizeInt(navigator.hardwareConcurrency, 0, 256)
          : null;
      const ramGb = sanitizeFiniteNumber(navExt.deviceMemory, 0, 1024);
      const gpuRenderer = readGpuRenderer();
      const touchPoints = sanitizeInt(navigator.maxTouchPoints ?? 0, 0, 64, 0);
      const orientation = getCurrentOrientation();
      const colorScheme = getCurrentColorScheme();
      const reducedMotion = getReducedMotionPreference();
      const language = sanitizeString(navigator.language || 'en', 40, 'en');
      let timezone = 'UTC';
      try {
        timezone = sanitizeString(
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          80,
          'UTC',
        );
      } catch {
        timezone = 'UTC';
      }
      const entryUrl = sanitizeString(
        `${window.location.pathname || '/'}${window.location.search || ''}`,
        512,
        '/',
      );

      if (!db || !sessionId || isOwnerAnalyticsIgnored()) return;

      const initialDoc = {
        sessionId,
        visitorId,
        visitNumber,
        openedAt: serverTimestamp(),
        openedAtMs: Math.floor(sessionStartMs),
        openedAtIST: sanitizeString(formatISTDateTime(sessionStartMs), 80, 'Unknown'),
        lastActiveAtMs: Math.floor(sessionStartMs),
        durationSeconds: 0,
        maxScrollPct: 0,
        totalInteractions: 0,
        deviceName: parsed.deviceName,
        deviceType: parsed.deviceType,
        osName: parsed.osName,
        osVersion: parsed.osVersion,
        browserName: parsed.browserName,
        inAppBrowser: parsed.inAppBrowser,
        screenResolution,
        viewportSize,
        pixelRatio,
        colorDepth,
        cpuCores,
        ramGb,
        gpuRenderer,
        touchPoints,
        orientation,
        colorScheme,
        reducedMotion,
        language,
        timezone,
        referrer: sanitizeString(referrer, 512, 'direct'),
        entryUrl,
        userAgent: sanitizeString(ua, 600, 'unknown'),
        batteryLevel: battery.batteryLevel,
        batteryCharging: battery.batteryCharging,
        batteryChargingTime: battery.batteryChargingTime,
        batteryDischargingTime: battery.batteryDischargingTime,
        connectionType: network.connectionType,
        effectiveType: network.effectiveType,
        downlinkMbps: network.downlinkMbps,
        rttMs: network.rttMs,
        saveData: network.saveData,
        ipAddress: null,
        city: null,
        region: null,
        postal: null,
        country: null,
        approxCoords: null,
        isp: null,
      };

      await setDoc(doc(db, 'site_visits', sessionId), initialDoc);
      sessionDocCreated = true;

      // Queue page_opened right at the front of the event stream
      pendingEvents.unshift({
        eventType: 'page_opened',
        elementName: 'Birthday Website Opened',
        details: sanitizeEventDetails({
          visitNumber,
          isMidnightLocked: Boolean(opts?.isMidnightLocked),
          inAppBrowser: parsed.inAppBrowser,
        }),
        eventTimeMs: sessionStartMs,
        elapsedSeconds: 0,
      });

      void flushPendingEvents();

      // Silent background approximate IP/Location enrichment (3.5s AbortController timeout)
      const geo = await fetchSilentGeoLookup();
      if (geo && db && sessionId && !isOwnerAnalyticsIgnored()) {
        await updateDoc(doc(db, 'site_visits', sessionId), {
          ipAddress: geo.ipAddress,
          city: geo.city,
          region: geo.region,
          postal: geo.postal,
          country: geo.country,
          approxCoords: geo.approxCoords,
          isp: geo.isp,
          lastActiveAtMs: Math.max(Date.now(), sessionStartMs),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `site_visits/${sessionId ?? 'unknown'}`, {
        silent: true,
      });
    }
  })();
}

export function trackAnalyticsEvent(
  eventType: string,
  elementName: string,
  details?: Record<string, unknown>,
  eventTimeMs?: number,
): void {
  if (typeof window === 'undefined') return;
  if (isOwnerAnalyticsIgnored()) return;
  if (!db) return;

  try {
    const nowMs = eventTimeMs ?? Date.now();
    const elapsedSeconds =
      sessionStartMs > 0 ? Math.max(0, Math.round((nowMs - sessionStartMs) / 1000)) : 0;
    const ev: QueuedEvent = {
      eventType: sanitizeEventType(eventType),
      elementName: sanitizeString(elementName, 160, 'Interaction'),
      details: sanitizeEventDetails(details),
      eventTimeMs: nowMs,
      elapsedSeconds,
    };

    if (!sessionDocCreated) {
      if (pendingEvents.length < 40) {
        pendingEvents.push(ev);
      }
      return;
    }

    void writeSingleEvent(ev);
  } catch {
    // Strictly non-blocking — never throw
  }
}

export function stopAnalyticsClientHeartbeatForTesting(): void {
  if (heartbeatIntervalId !== null) {
    window.clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }
  if (interactionFlushTimerId !== null) {
    window.clearTimeout(interactionFlushTimerId);
    interactionFlushTimerId = null;
  }
}
