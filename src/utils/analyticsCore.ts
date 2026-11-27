export const OWNER_INSIGHTS_PIN = '9876';
export const OWNER_EMAIL = 'viratkohlifromdelhi@gmail.com';
export const VISITOR_ID_STORAGE_KEY = 'morgan_vid_v1';
export const VISIT_COUNT_STORAGE_KEY = 'morgan_vcount_v1';
export const IGNORE_OWNER_STORAGE_KEY = 'ignore_owner_analytics';
export const SCROLL_MILESTONES = [25, 50, 75, 100] as const;

export type DeviceCategory = 'Mobile' | 'Tablet' | 'Desktop';
export type OrientationKind = 'portrait' | 'landscape';
export type ColorSchemeKind = 'dark' | 'light';

export interface HighEntropyUAValues {
  model?: string;
  platform?: string;
  platformVersion?: string;
  architecture?: string;
  bitness?: string;
  fullVersionList?: Array<{ brand: string; version: string }>;
}

export interface ParsedDeviceSpecs {
  deviceName: string;
  deviceType: DeviceCategory;
  osName: string;
  osVersion: string;
  browserName: string;
  inAppBrowser: string;
}

export interface SiteVisitRecord {
  sessionId: string;
  visitorId: string;
  visitNumber: number;
  openedAtMs: number;
  openedAtIST: string;
  lastActiveAtMs: number;
  durationSeconds: number;
  maxScrollPct: number;
  totalInteractions: number;
  deviceName: string;
  deviceType: DeviceCategory;
  osName: string;
  osVersion: string;
  browserName: string;
  inAppBrowser: string;
  screenResolution: string;
  viewportSize: string;
  pixelRatio: number;
  colorDepth: number;
  cpuCores: number | null;
  ramGb: number | null;
  gpuRenderer: string | null;
  touchPoints: number;
  orientation: OrientationKind;
  colorScheme: ColorSchemeKind;
  reducedMotion: boolean;
  language: string;
  timezone: string;
  referrer: string;
  entryUrl: string;
  userAgent: string;
  batteryLevel: number | null;
  batteryCharging: boolean | null;
  batteryChargingTime: number | null;
  batteryDischargingTime: number | null;
  connectionType: string | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean | null;
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  postal: string | null;
  country: string | null;
  approxCoords: string | null;
  isp: string | null;
}

export interface VisitEventRecord {
  id: string;
  eventTimeMs: number;
  eventTimeIST: string;
  elapsedSeconds: number;
  eventType: string;
  elementName: string;
  details: Record<string, unknown>;
}

export function isInsightsQuery(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    return params.get('insights') === OWNER_INSIGHTS_PIN;
  } catch {
    return false;
  }
}

export function evaluateOwnerPin(pin: string): boolean {
  return pin.trim() === OWNER_INSIGHTS_PIN;
}

export function sanitizeString(val: unknown, maxLen: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
}

export function sanitizeFiniteNumber(
  val: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val)) return null;
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

export function sanitizeInt(val: unknown, min: number, max: number, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  const rounded = Math.round(val);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

export function sanitizeEventType(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return cleaned.length >= 2 ? cleaned : 'custom_event';
}

export function sanitizeEventDetails(
  details?: Record<string, unknown>,
): Record<string, unknown> {
  if (!details || typeof details !== 'object') return {};
  const result: Record<string, unknown> = {};
  const entries = Object.entries(details).slice(0, 20);
  for (const [rawKey, val] of entries) {
    const key = rawKey.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 48);
    if (!key) continue;
    if (val === null) {
      result[key] = null;
    } else if (typeof val === 'boolean') {
      result[key] = val;
    } else if (typeof val === 'number') {
      if (Number.isFinite(val)) {
        result[key] = val;
      }
    } else if (typeof val === 'string') {
      result[key] = val.slice(0, 240);
    } else if (Array.isArray(val)) {
      result[key] = val
        .slice(0, 10)
        .map((item) =>
          typeof item === 'string'
            ? item.slice(0, 80)
            : typeof item === 'number' && Number.isFinite(item)
              ? item
              : typeof item === 'boolean'
                ? item
                : String(item).slice(0, 80),
        );
    }
  }
  return result;
}

export function formatISTDateTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

export function formatISTTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(11, 19);
  }
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

export function formatElapsedOffset(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeScrollPercent(
  scrollY: number,
  innerHeight: number,
  scrollHeight: number,
): number {
  if (!Number.isFinite(scrollHeight) || scrollHeight <= 0) return 0;
  const maxScrollable = scrollHeight - innerHeight;
  if (maxScrollable <= 0) return 100;
  const pct = Math.round((Math.max(0, scrollY) / maxScrollable) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function detectInAppBrowser(ua: string, referrer: string): string {
  const ref = (referrer || '').toLowerCase();
  if (/WhatsApp/i.test(ua) || ref.includes('whatsapp.com')) return 'WhatsApp';
  if (/Instagram/i.test(ua) || ref.includes('instagram.com') || ref.includes('l.instagram.com')) {
    return 'Instagram';
  }
  if (/Snapchat/i.test(ua) || ref.includes('snapchat.com')) return 'Snapchat';
  if (/Telegram/i.test(ua) || ref.includes('t.me') || ref.includes('telegram.org')) {
    return 'Telegram';
  }
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua) || ref.includes('facebook.com')) {
    return 'Facebook';
  }
  if (/EdgA|EdgiOS|Edg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/CriOS|Chrome\//i.test(ua)) return 'Chrome';
  if (/FxiOS|Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua)) return 'Safari';
  return 'Browser';
}

export function parseUserAgentSpecs(
  ua: string,
  referrer: string,
  highEntropy?: HighEntropyUAValues | null,
): ParsedDeviceSpecs {
  const safeUa = ua || '';
  const inAppBrowser = detectInAppBrowser(safeUa, referrer);

  // OS detection
  let osName = highEntropy?.platform?.trim() || 'Unknown OS';
  let osVersion = highEntropy?.platformVersion?.trim() || '';

  if (/iPhone|iPad|iPod/i.test(safeUa)) {
    osName = /iPad/i.test(safeUa) ? 'iPadOS' : 'iOS';
    const m = safeUa.match(/OS (\d+[_\d]*)/i);
    if (m?.[1]) osVersion = m[1].replace(/_/g, '.');
  } else if (/Android/i.test(safeUa)) {
    osName = 'Android';
    const m = safeUa.match(/Android\s+([0-9.]+)/i);
    if (!osVersion && m?.[1]) osVersion = m[1];
  } else if (/Windows NT/i.test(safeUa)) {
    osName = 'Windows';
    if (!osVersion) {
      const m = safeUa.match(/Windows NT\s+([0-9.]+)/i);
      osVersion = m?.[1] === '10.0' ? '10/11' : m?.[1] || '';
    }
  } else if (/Mac OS X/i.test(safeUa)) {
    osName = 'macOS';
    if (!osVersion) {
      const m = safeUa.match(/Mac OS X\s+([0-9_]+)/i);
      if (m?.[1]) osVersion = m[1].replace(/_/g, '.');
    }
  } else if (/Linux/i.test(safeUa)) {
    osName = 'Linux';
  }

  // Browser detection
  let browserName = 'Unknown Browser';
  if (/Instagram/i.test(safeUa)) browserName = 'Instagram In-App';
  else if (/WhatsApp/i.test(safeUa)) browserName = 'WhatsApp In-App';
  else if (/Snapchat/i.test(safeUa)) browserName = 'Snapchat In-App';
  else if (/Telegram/i.test(safeUa)) browserName = 'Telegram In-App';
  else if (/FBAN|FBAV|FB_IAB/i.test(safeUa)) browserName = 'Facebook In-App';
  else if (/SamsungBrowser\/([0-9.]+)/i.test(safeUa)) {
    browserName = `Samsung Internet ${safeUa.match(/SamsungBrowser\/([0-9.]+)/i)?.[1] ?? ''}`.trim();
  } else if (/Edg(?:A|iOS)?\/([0-9.]+)/i.test(safeUa)) {
    browserName = `Edge ${safeUa.match(/Edg(?:A|iOS)?\/([0-9.]+)/i)?.[1]?.split('.')[0] ?? ''}`.trim();
  } else if (/OPR\/([0-9.]+)/i.test(safeUa)) {
    browserName = `Opera ${safeUa.match(/OPR\/([0-9.]+)/i)?.[1]?.split('.')[0] ?? ''}`.trim();
  } else if (/CriOS\/([0-9.]+)/i.test(safeUa)) {
    browserName = `Chrome iOS ${safeUa.match(/CriOS\/([0-9.]+)/i)?.[1]?.split('.')[0] ?? ''}`.trim();
  } else if (/Chrome\/([0-9.]+)/i.test(safeUa)) {
    browserName = `Chrome ${safeUa.match(/Chrome\/([0-9.]+)/i)?.[1]?.split('.')[0] ?? ''}`.trim();
  } else if (/FxiOS\/([0-9.]+)|Firefox\/([0-9.]+)/i.test(safeUa)) {
    const m = safeUa.match(/(?:FxiOS|Firefox)\/([0-9.]+)/i);
    browserName = `Firefox ${m?.[1]?.split('.')[0] ?? ''}`.trim();
  } else if (/Version\/([0-9.]+).*Safari/i.test(safeUa)) {
    browserName = `Safari ${safeUa.match(/Version\/([0-9.]+)/i)?.[1] ?? ''}`.trim();
  } else if (/Safari/i.test(safeUa)) {
    browserName = 'Safari';
  }

  // Device type detection
  let deviceType: DeviceCategory = 'Desktop';
  if (/iPad|Tablet|PlayBook|Silk|(?:Android(?!.*Mobile))/i.test(safeUa)) {
    deviceType = 'Tablet';
  } else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(safeUa)) {
    deviceType = 'Mobile';
  }

  // Device name (prefer high-entropy Android model first)
  let deviceName = highEntropy?.model?.trim() || '';
  if (!deviceName) {
    if (/iPhone/i.test(safeUa)) {
      deviceName = 'Apple iPhone';
    } else if (/iPad/i.test(safeUa)) {
      deviceName = 'Apple iPad';
    } else if (/Android/i.test(safeUa)) {
      const m = safeUa.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|\))/i);
      const parsedModel = m?.[1]?.trim();
      if (parsedModel && parsedModel !== 'K' && !/^wv$/i.test(parsedModel)) {
        deviceName = parsedModel;
      } else {
        deviceName = deviceType === 'Tablet' ? 'Android Tablet' : 'Android Phone';
      }
    } else if (/Macintosh/i.test(safeUa)) {
      deviceName = 'Apple Mac';
    } else if (/Windows/i.test(safeUa)) {
      deviceName = 'Windows PC';
    } else if (/Linux/i.test(safeUa)) {
      deviceName = 'Linux Desktop';
    } else {
      deviceName = `${osName} ${deviceType}`;
    }
  }

  return {
    deviceName: sanitizeString(deviceName, 160, 'Unknown Device'),
    deviceType,
    osName: sanitizeString(osName, 80, 'Unknown OS'),
    osVersion: sanitizeString(osVersion, 80, ''),
    browserName: sanitizeString(browserName, 80, 'Browser'),
    inAppBrowser: sanitizeString(inAppBrowser, 80, 'Browser'),
  };
}

export interface DashboardSummaryStats {
  totalVisits: number;
  uniqueDevices: number;
  totalInteractions: number;
}

export function computeDashboardSummary(visits: SiteVisitRecord[]): DashboardSummaryStats {
  const uniqueIds = new Set<string>();
  let totalInteractions = 0;
  for (const v of visits) {
    if (v.visitorId) uniqueIds.add(v.visitorId);
    totalInteractions += Number.isFinite(v.totalInteractions) ? v.totalInteractions : 0;
  }
  return {
    totalVisits: visits.length,
    uniqueDevices: uniqueIds.size,
    totalInteractions,
  };
}
