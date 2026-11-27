import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  Activity,
  Battery,
  BatteryCharging,
  ChevronDown,
  ChevronUp,
  Cpu,
  Delete,
  EyeOff,
  Globe,
  Lock,
  LogOut,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
  Tablet,
  Wifi,
  X,
} from 'lucide-react';
import {
  auth,
  buildFirestoreErrorInfo,
  db,
  googleProvider,
  OperationType,
} from '../firebase';
import {
  isOwnerDeviceIgnoredFlag,
  setOwnerAnalyticsIgnored,
} from '../utils/analytics';
import {
  computeDashboardSummary,
  evaluateOwnerPin,
  formatDuration,
  formatElapsedOffset,
  formatISTDateTime,
  formatISTTime,
  isAuthorizedOwnerEmail,
  type SiteVisitRecord,
  type VisitEventRecord,
} from '../utils/analyticsCore';

interface OwnerAnalyticsDashboardProps {
  onClose: () => void;
}

const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'] as const;

const IN_APP_SOURCES = new Set(['WhatsApp', 'Instagram', 'Snapchat', 'Telegram', 'Facebook']);

function SessionTimeline({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<VisitEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setErrorMsg('Firestore is unavailable.');
      return;
    }

    const eventsPath = `site_visits/${sessionId}/events`;
    let unsub: Unsubscribe | null = null;
    try {
      const q = query(
        collection(db, 'site_visits', sessionId, 'events'),
        orderBy('eventTimeMs', 'asc'),
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const next: VisitEventRecord[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const eventTimeMs = typeof d.eventTimeMs === 'number' ? d.eventTimeMs : Date.now();
            return {
              id: docSnap.id,
              eventTimeMs,
              eventTimeIST:
                typeof d.eventTimeIST === 'string' && d.eventTimeIST
                  ? d.eventTimeIST
                  : formatISTTime(eventTimeMs),
              elapsedSeconds: typeof d.elapsedSeconds === 'number' ? d.elapsedSeconds : 0,
              eventType: typeof d.eventType === 'string' ? d.eventType : 'event',
              elementName: typeof d.elementName === 'string' ? d.elementName : 'Interaction',
              details:
                d.details && typeof d.details === 'object' && !Array.isArray(d.details)
                  ? (d.details as Record<string, unknown>)
                  : {},
            };
          });
          setEvents(next);
          setLoading(false);
          setErrorMsg(null);
        },
        (error) => {
          const info = buildFirestoreErrorInfo(error, OperationType.LIST, eventsPath);
          setErrorMsg(info.error);
          setLoading(false);
        },
      );
    } catch (error) {
      const info = buildFirestoreErrorInfo(error, OperationType.LIST, eventsPath);
      setErrorMsg(info.error);
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="border-t border-white/10 bg-[#0D0A11] px-4 py-4 text-xs text-[#C7B8CC]">
        Loading live interaction timeline...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="border-t border-white/10 bg-[#0D0A11] px-4 py-3 text-xs text-rose-300">
        Unable to load events: {errorMsg}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="border-t border-white/10 bg-[#0D0A11] px-4 py-4 text-xs text-[#9C8BA3]">
        No interactions logged in this session yet.
      </div>
    );
  }

  return (
    <div
      data-testid={`session-timeline-${sessionId}`}
      className="border-t border-white/10 bg-[#0D0A11] px-4 py-3.5 sm:px-5"
    >
      <div className="mb-2.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D7B57E]">
        <span>Live Interaction Timeline ({events.length})</span>
        <span className="font-mono text-[10px] text-[#9C8BA3]">Chronological · IST</span>
      </div>
      <ol className="space-y-2 border-l border-[#E6C690]/25 pl-3.5">
        {events.map((ev) => {
          const hasDetails = Object.keys(ev.details).length > 0;
          return (
            <li
              key={ev.id}
              className="relative rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs"
            >
              <span
                aria-hidden="true"
                className="absolute top-3 -left-[19px] h-2 w-2 rounded-full bg-[#E6C690]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#FAF3EA]">{ev.elementName}</span>
                  <span className="rounded bg-[#E6C690]/14 px-1.5 py-0.5 font-mono text-[10px] text-[#E6C690]">
                    {ev.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10.5px] text-[#A998B0]">
                  <span className="text-emerald-300">{formatElapsedOffset(ev.elapsedSeconds)}</span>
                  <span>&middot;</span>
                  <span>{ev.eventTimeIST}</span>
                </div>
              </div>
              {hasDetails && (
                <pre className="mt-1.5 overflow-x-auto rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[10.5px] leading-relaxed text-[#D8C9DE]">
                  {JSON.stringify(ev.details, null, 2)}
                </pre>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SessionCard({
  visit,
  expanded,
  onToggleExpand,
}: {
  visit: SiteVisitRecord;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const isReturning = visit.visitNumber > 1;
  const DeviceIcon =
    visit.deviceType === 'Mobile'
      ? Smartphone
      : visit.deviceType === 'Tablet'
        ? Tablet
        : Monitor;

  const isInApp = IN_APP_SOURCES.has(visit.inAppBrowser);
  const batteryText =
    visit.batteryLevel !== null
      ? `${visit.batteryLevel}%${visit.batteryCharging === true ? ' (Charging)' : visit.batteryCharging === false ? ' (Battery)' : ''}`
      : 'Unavailable';

  const networkParts: string[] = [];
  if (visit.connectionType) networkParts.push(visit.connectionType);
  if (visit.effectiveType) networkParts.push(visit.effectiveType.toUpperCase());
  const speedParts: string[] = [];
  if (visit.downlinkMbps !== null) speedParts.push(`${visit.downlinkMbps} Mbps`);
  if (visit.rttMs !== null) speedParts.push(`${visit.rttMs}ms RTT`);
  const networkText =
    networkParts.length > 0 || speedParts.length > 0
      ? `${networkParts.join(' / ') || 'Network'}${speedParts.length > 0 ? ` (${speedParts.join(' • ')})` : ''}`
      : 'Unavailable';

  const locationParts = [visit.city, visit.region, visit.country].filter(Boolean);
  const locationText =
    locationParts.length > 0 ? locationParts.join(', ') : 'Pending / Unavailable';

  return (
    <article
      data-testid={`visit-card-${visit.sessionId}`}
      className="overflow-hidden rounded-2xl border border-[#E6C690]/20 bg-[#17111B] shadow-[0_14px_34px_-20px_rgba(0,0,0,0.7)]"
    >
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={expanded}
        className="w-full cursor-pointer px-4 py-4 text-left transition-colors hover:bg-white/[0.025] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#E6C690] sm:px-5"
      >
        {/* Top Row: Visit # + Returning/New + Timestamp + Engagement Pills */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E6C690]/16 px-2.5 py-0.5 text-[11px] font-bold text-[#F0D5A0]">
                Visit #{visit.visitNumber}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                  isReturning
                    ? 'bg-sky-500/18 text-sky-300'
                    : 'bg-emerald-500/18 text-emerald-300'
                }`}
              >
                {isReturning ? 'Returning' : 'New'}
              </span>
              {isInApp ? (
                <span className="rounded-full border border-pink-400/35 bg-pink-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-pink-200">
                  Opened in {visit.inAppBrowser}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] font-medium text-[#C8B9CF]">
                  {visit.inAppBrowser}
                </span>
              )}
            </div>
            <p className="mt-1.5 font-mono text-xs text-[#E3D5E8]">
              {visit.openedAtIST || formatISTDateTime(visit.openedAtMs)} IST
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold tabular-nums">
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[#FAF3EA]">
                {formatDuration(visit.durationSeconds)}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[#E6C690]">
                {visit.maxScrollPct}% scroll
              </span>
              <span className="rounded-lg border border-emerald-400/25 bg-emerald-500/12 px-2 py-1 text-emerald-300">
                {visit.totalInteractions} events
              </span>
            </div>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#D8C9DE]">
              {expanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
          </div>
        </div>

        {/* Device & Specs Grid */}
        <div className="mt-3.5 grid grid-cols-1 gap-2 rounded-xl border border-white/8 bg-black/25 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-2">
            <DeviceIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E6C690]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold text-[#FAF3EA] truncate">{visit.deviceName}</p>
              <p className="text-[11px] text-[#A998B0] truncate">
                {visit.osName} {visit.osVersion} &middot; {visit.browserName}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Monitor className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E6C690]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-[#E8DCEB]">
                Screen {visit.screenResolution} &middot; View {visit.viewportSize}
              </p>
              <p className="text-[11px] text-[#A998B0]">
                {visit.pixelRatio}x DPR &middot; {visit.orientation} &middot; {visit.colorScheme} mode
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:col-span-2 lg:col-span-1">
            <Cpu className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#E6C690]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-[#E8DCEB]">
                {visit.ramGb !== null ? `${visit.ramGb} GB RAM` : 'RAM N/A'} &middot;{' '}
                {visit.cpuCores !== null ? `${visit.cpuCores} cores` : 'CPU N/A'}
              </p>
              <p className="truncate text-[11px] text-[#A998B0]" title={visit.gpuRenderer ?? ''}>
                GPU: {visit.gpuRenderer || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Battery & Network Row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-[#D2C3D8]">
          <span className="inline-flex items-center gap-1.5">
            {visit.batteryCharging ? (
              <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <Battery className="h-3.5 w-3.5 text-[#E6C690]" aria-hidden="true" />
            )}
            <span>{batteryText}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            <span>{networkText}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#A998B0]">
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {visit.language} &middot; {visit.timezone}
            </span>
          </span>
        </div>

        {/* Location & ISP Row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[#E6D9EA]">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-rose-300" aria-hidden="true" />
          <span>{locationText}</span>
          {visit.postal && <span className="text-[#A998B0]">({visit.postal})</span>}
          {visit.isp && (
            <>
              <span className="text-white/25">&bull;</span>
              <span className="text-[#C7B8CC]">{visit.isp}</span>
            </>
          )}
          {visit.ipAddress && (
            <span className="font-mono text-[10.5px] text-[#A998B0]">({visit.ipAddress})</span>
          )}
          {visit.approxCoords && (
            <span className="font-mono text-[10.5px] text-[#8E7D96]">[{visit.approxCoords}]</span>
          )}
        </div>
      </button>

      {expanded && <SessionTimeline sessionId={visit.sessionId} />}
    </article>
  );
}

export function OwnerAnalyticsDashboard({ onClose }: OwnerAnalyticsDashboardProps) {
  const [pinDigits, setPinDigits] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [shakeCount, setShakeCount] = useState(0);

  const [authUser, setAuthUser] = useState<User | null>(() => auth?.currentUser ?? null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [ignoreMyDevice, setIgnoreMyDevice] = useState<boolean>(() =>
    isOwnerDeviceIgnoredFlag(),
  );
  const [visits, setVisits] = useState<SiteVisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const resetPinTimerRef = useRef<number | null>(null);

  // Lock background scroll while dashboard overlay is open
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      if (resetPinTimerRef.current !== null) {
        window.clearTimeout(resetPinTimerRef.current);
      }
    };
  }, []);

  // Track Firebase Auth state
  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isVerifiedOwner = Boolean(
    authUser &&
      isAuthorizedOwnerEmail(authUser.email) &&
      authUser.emailVerified,
  );

  // Subscribe to Firestore site_visits ONLY after PIN 9876 AND verified owner auth
  useEffect(() => {
    if (!pinUnlocked || !isVerifiedOwner || !db) return;

    setLoadingVisits(true);
    setFeedError(null);

    let unsub: Unsubscribe | null = null;
    try {
      const q = query(
        collection(db, 'site_visits'),
        orderBy('openedAtMs', 'desc'),
        limit(50),
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const rows: SiteVisitRecord[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const openedAtMs = typeof d.openedAtMs === 'number' ? d.openedAtMs : Date.now();
            return {
              sessionId: typeof d.sessionId === 'string' ? d.sessionId : docSnap.id,
              visitorId: typeof d.visitorId === 'string' ? d.visitorId : 'unknown',
              visitNumber: typeof d.visitNumber === 'number' ? d.visitNumber : 1,
              openedAtMs,
              openedAtIST:
                typeof d.openedAtIST === 'string' && d.openedAtIST
                  ? d.openedAtIST
                  : formatISTDateTime(openedAtMs),
              lastActiveAtMs: typeof d.lastActiveAtMs === 'number' ? d.lastActiveAtMs : openedAtMs,
              durationSeconds: typeof d.durationSeconds === 'number' ? d.durationSeconds : 0,
              maxScrollPct: typeof d.maxScrollPct === 'number' ? d.maxScrollPct : 0,
              totalInteractions: typeof d.totalInteractions === 'number' ? d.totalInteractions : 0,
              deviceName: typeof d.deviceName === 'string' ? d.deviceName : 'Unknown Device',
              deviceType:
                d.deviceType === 'Mobile' || d.deviceType === 'Tablet' || d.deviceType === 'Desktop'
                  ? d.deviceType
                  : 'Desktop',
              osName: typeof d.osName === 'string' ? d.osName : 'Unknown OS',
              osVersion: typeof d.osVersion === 'string' ? d.osVersion : '',
              browserName: typeof d.browserName === 'string' ? d.browserName : 'Browser',
              inAppBrowser: typeof d.inAppBrowser === 'string' ? d.inAppBrowser : 'Browser',
              screenResolution:
                typeof d.screenResolution === 'string' ? d.screenResolution : '0x0',
              viewportSize: typeof d.viewportSize === 'string' ? d.viewportSize : '0x0',
              pixelRatio: typeof d.pixelRatio === 'number' ? d.pixelRatio : 1,
              colorDepth: typeof d.colorDepth === 'number' ? d.colorDepth : 24,
              cpuCores: typeof d.cpuCores === 'number' ? d.cpuCores : null,
              ramGb: typeof d.ramGb === 'number' ? d.ramGb : null,
              gpuRenderer: typeof d.gpuRenderer === 'string' ? d.gpuRenderer : null,
              touchPoints: typeof d.touchPoints === 'number' ? d.touchPoints : 0,
              orientation: d.orientation === 'landscape' ? 'landscape' : 'portrait',
              colorScheme: d.colorScheme === 'dark' ? 'dark' : 'light',
              reducedMotion: Boolean(d.reducedMotion),
              language: typeof d.language === 'string' ? d.language : 'en',
              timezone: typeof d.timezone === 'string' ? d.timezone : 'UTC',
              referrer: typeof d.referrer === 'string' ? d.referrer : 'direct',
              entryUrl: typeof d.entryUrl === 'string' ? d.entryUrl : '/',
              userAgent: typeof d.userAgent === 'string' ? d.userAgent : '',
              batteryLevel: typeof d.batteryLevel === 'number' ? d.batteryLevel : null,
              batteryCharging:
                typeof d.batteryCharging === 'boolean' ? d.batteryCharging : null,
              batteryChargingTime:
                typeof d.batteryChargingTime === 'number' ? d.batteryChargingTime : null,
              batteryDischargingTime:
                typeof d.batteryDischargingTime === 'number' ? d.batteryDischargingTime : null,
              connectionType: typeof d.connectionType === 'string' ? d.connectionType : null,
              effectiveType: typeof d.effectiveType === 'string' ? d.effectiveType : null,
              downlinkMbps: typeof d.downlinkMbps === 'number' ? d.downlinkMbps : null,
              rttMs: typeof d.rttMs === 'number' ? d.rttMs : null,
              saveData: typeof d.saveData === 'boolean' ? d.saveData : null,
              ipAddress: typeof d.ipAddress === 'string' ? d.ipAddress : null,
              city: typeof d.city === 'string' ? d.city : null,
              region: typeof d.region === 'string' ? d.region : null,
              postal: typeof d.postal === 'string' ? d.postal : null,
              country: typeof d.country === 'string' ? d.country : null,
              approxCoords: typeof d.approxCoords === 'string' ? d.approxCoords : null,
              isp: typeof d.isp === 'string' ? d.isp : null,
            };
          });
          setVisits(rows);
          setLoadingVisits(false);
          setFeedError(null);
        },
        (error) => {
          const info = buildFirestoreErrorInfo(error, OperationType.LIST, 'site_visits');
          setFeedError(info.error);
          setLoadingVisits(false);
        },
      );
    } catch (error) {
      const info = buildFirestoreErrorInfo(error, OperationType.LIST, 'site_visits');
      setFeedError(info.error);
      setLoadingVisits(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [pinUnlocked, isVerifiedOwner]);

  const submitPin = useCallback((fourDigits: string) => {
    if (evaluateOwnerPin(fourDigits)) {
      setPinError(null);
      setPinUnlocked(true);
      return;
    }
    setPinError('Incorrect owner PIN');
    setShakeCount((n) => n + 1);
    if (resetPinTimerRef.current !== null) {
      window.clearTimeout(resetPinTimerRef.current);
    }
    resetPinTimerRef.current = window.setTimeout(() => {
      setPinDigits('');
      resetPinTimerRef.current = null;
    }, 320);
  }, []);

  const handleDigitChange = useCallback(
    (raw: string) => {
      const cleaned = raw.replace(/\D/g, '').slice(0, 4);
      setPinError(null);
      setPinDigits(cleaned);
      if (cleaned.length === 4) {
        submitPin(cleaned);
      }
    },
    [submitPin],
  );

  const handlePadTap = useCallback(
    (key: (typeof PIN_KEYS)[number]) => {
      if (key === 'CLEAR') {
        setPinDigits('');
        setPinError(null);
        return;
      }
      if (key === 'BACK') {
        setPinDigits((prev) => prev.slice(0, -1));
        setPinError(null);
        return;
      }
      if (pinDigits.length >= 4) return;
      handleDigitChange(pinDigits + key);
    },
    [pinDigits, handleDigitChange],
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (!auth) {
      setAuthError('Firebase Auth is not initialized.');
      return;
    }
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-in cancelled or failed.');
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSwitchAccount = useCallback(async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setAuthError(null);
    } catch {
      // ignore
    }
  }, []);

  const handleToggleIgnoreDevice = useCallback(() => {
    setIgnoreMyDevice((prev) => {
      const next = !prev;
      setOwnerAnalyticsIgnored(next);
      return next;
    });
  }, []);

  const summary = useMemo(() => computeDashboardSummary(visits), [visits]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Owner Live Analytics Dashboard"
      data-testid="owner-analytics-dashboard"
      className="fixed inset-0 z-[20000] flex flex-col overflow-hidden bg-[#0E0A12] text-[#FAF3EA]"
    >
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E6C690]/20 bg-[#150F1A] px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E6C690]/30 bg-[#E6C690]/10 text-[#E6C690]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-semibold tracking-tight text-[#FAF3EA] sm:text-lg">
                Owner Live Insights
              </h1>
              {pinUnlocked && isVerifiedOwner && (
                <span
                  data-testid="dashboard-live-badge"
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A998B0]">
              Live Firestore visitor telemetry &amp; interaction stream
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="close-dashboard-btn"
          onClick={onClose}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[#E6C690]/30 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[#FAF3EA] transition-colors hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6C690]"
        >
          <span className="sm:hidden">Close</span>
          <span className="hidden sm:inline">Close Dashboard</span>
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {!pinUnlocked ? (
          /* Step 1: 4-Digit Owner PIN Gate (9876) */
          <div
            data-testid="dashboard-pin-gate"
            className="mx-auto mt-4 flex w-full max-w-[330px] flex-col items-center rounded-3xl border border-[#E6C690]/25 bg-[#17111B] p-6 text-center shadow-2xl sm:mt-10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#E6C690]/35 bg-[#E6C690]/10 text-[#E6C690]">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="font-display mt-3.5 text-xl font-semibold text-[#FAF3EA]">
              Owner Verification
            </h2>
            <p className="mt-1 text-xs text-[#A998B0]">
              Enter your 4 digit owner PIN to unlock live analytics.
            </p>

            {/* Hidden numeric input + 4 PIN dots */}
            <div className="relative mt-5 mb-2 w-full">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                aria-label="4-digit owner PIN"
                data-testid="dashboard-pin-input"
                value={pinDigits}
                onChange={(e) => handleDigitChange(e.target.value)}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div
                key={shakeCount}
                className={`flex items-center justify-center gap-3 ${
                  shakeCount > 0 && pinError ? 'animate-midnight-shake' : ''
                }`}
              >
                {[0, 1, 2, 3].map((slot) => {
                  const filled = Boolean(pinDigits[slot]);
                  return (
                    <div
                      key={slot}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border text-lg font-bold transition-all ${
                        pinError
                          ? 'border-rose-400/70 bg-rose-500/15 text-rose-300'
                          : filled
                            ? 'border-[#E6C690] bg-[#E6C690]/18 text-[#FAF3EA]'
                            : 'border-[#E6C690]/25 bg-white/[0.03] text-[#A998B0]'
                      }`}
                    >
                      {filled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 min-h-[18px]">
              {pinError && (
                <p
                  role="alert"
                  data-testid="dashboard-pin-error"
                  className="text-xs font-semibold text-rose-300"
                >
                  {pinError}
                </p>
              )}
            </div>

            {/* 3x4 Keypad */}
            <div className="grid w-full max-w-[240px] grid-cols-3 gap-2.5">
              {PIN_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`dashboard-pin-key-${key.toLowerCase()}`}
                  onClick={() => handlePadTap(key)}
                  aria-label={
                    key === 'BACK'
                      ? 'Backspace'
                      : key === 'CLEAR'
                        ? 'Clear PIN'
                        : `Owner PIN digit ${key}`
                  }
                  className={`flex h-13 w-full cursor-pointer items-center justify-center rounded-full border text-base font-medium transition-colors active:scale-95 ${
                    key === 'CLEAR' || key === 'BACK'
                      ? 'border-transparent bg-transparent text-xs font-semibold text-[#D7B57E] hover:bg-white/5'
                      : 'border-[#E6C690]/22 bg-white/[0.03] text-[#FAF3EA] hover:border-[#E6C690]/55 hover:bg-[#E6C690]/10'
                  }`}
                >
                  {key === 'BACK' ? (
                    <Delete className="h-4 w-4" aria-hidden="true" />
                  ) : key === 'CLEAR' ? (
                    'Clear'
                  ) : (
                    key
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : !authReady ? (
          <div className="mx-auto mt-16 max-w-md text-center text-sm text-[#C7B8CC]">
            Checking owner session...
          </div>
        ) : !isVerifiedOwner ? (
          /* Step 2: Firebase Owner Google Sign-In Gate (enforces PII-safe Firestore rules) */
          <div
            data-testid="dashboard-auth-gate"
            className="mx-auto mt-8 flex w-full max-w-md flex-col items-center rounded-3xl border border-[#E6C690]/25 bg-[#17111B] p-6 text-center shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/12 text-emerald-300">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display mt-4 text-xl font-semibold text-[#FAF3EA]">
              PIN Accepted &middot; Sign In as Owner
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[#C7B8CC]">
              Visitor IP addresses, locations, and device telemetry are protected by Firestore
              Security Rules so only your verified owner account can read them.
            </p>

            {authUser && !isVerifiedOwner && (
              <div className="mt-4 w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                Currently signed in as <strong>{authUser.email ?? 'Unknown account'}</strong>.
                Please sign in with the authorized owner account.
              </div>
            )}

            {authError && (
              <p className="mt-3 text-xs font-medium text-rose-300">{authError}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                data-testid="dashboard-google-signin-btn"
                disabled={signingIn}
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#E6C690]/60 bg-gradient-to-b from-[#E6C690] to-[#C29A5B] px-5 py-2.5 text-xs font-bold text-[#140B12] shadow-lg transition-transform hover:brightness-105 active:scale-97 disabled:opacity-60"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>

              {authUser && (
                <button
                  type="button"
                  onClick={() => void handleSwitchAccount()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-[#E8DCEB] hover:bg-white/10"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>

            {/* Allow toggling Ignore My Own Device even before signing in */}
            <div className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left">
              <div className="flex items-center gap-2.5">
                <EyeOff className="h-4 w-4 shrink-0 text-[#E6C690]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[#FAF3EA]">Ignore My Own Device</p>
                  <p className="text-[11px] text-[#9C8BA3]">
                    Stop this browser from logging test visits
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ignoreMyDevice}
                data-testid="ignore-owner-toggle"
                onClick={handleToggleIgnoreDevice}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  ignoreMyDevice ? 'bg-emerald-500' : 'bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ignoreMyDevice ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : (
          /* Step 3: Live Real-Time Owner Dashboard Feed */
          <div className="mx-auto max-w-4xl space-y-5 pb-10">
            {/* Top Summary Stats Row + Ignore My Own Device Switch */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <div className="rounded-2xl border border-[#E6C690]/20 bg-[#17111B] p-3.5 sm:p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                  Total Visits
                </p>
                <p
                  data-testid="stat-total-visits"
                  className="font-display mt-1 text-2xl font-semibold tabular-nums text-[#FAF3EA] sm:text-3xl"
                >
                  {summary.totalVisits}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E6C690]/20 bg-[#17111B] p-3.5 sm:p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                  Unique Devices
                </p>
                <p
                  data-testid="stat-unique-devices"
                  className="font-display mt-1 text-2xl font-semibold tabular-nums text-[#E6C690] sm:text-3xl"
                >
                  {summary.uniqueDevices}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E6C690]/20 bg-[#17111B] p-3.5 sm:p-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                  Interactions
                </p>
                <p
                  data-testid="stat-total-interactions"
                  className="font-display mt-1 text-2xl font-semibold tabular-nums text-emerald-300 sm:text-3xl"
                >
                  {summary.totalInteractions}
                </p>
              </div>
            </div>

            {/* Owner Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#17111B] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <EyeOff className="h-4 w-4 shrink-0 text-[#E6C690]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[#FAF3EA]">Ignore My Own Device</p>
                  <p className="text-[11px] text-[#9C8BA3]">
                    {ignoreMyDevice
                      ? 'Active · visits from this browser are excluded'
                      : 'Off · visits without ?insights=9876 will be logged'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={ignoreMyDevice}
                  data-testid="ignore-owner-toggle"
                  onClick={handleToggleIgnoreDevice}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    ignoreMyDevice ? 'bg-emerald-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      ignoreMyDevice ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => void handleSwitchAccount()}
                  title="Sign out owner session"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:bg-white/10"
                >
                  <LogOut className="h-3 w-3" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Live Feed List */}
            {feedError && (
              <div className="rounded-2xl border border-rose-400/35 bg-rose-500/12 px-4 py-3 text-xs text-rose-200">
                Firestore feed error: {feedError}
              </div>
            )}

            {loadingVisits ? (
              <div className="rounded-2xl border border-white/10 bg-[#17111B] px-5 py-10 text-center text-sm text-[#C7B8CC]">
                Connecting to live Firestore telemetry stream...
              </div>
            ) : visits.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#17111B] px-5 py-10 text-center">
                <p className="font-display text-base font-semibold text-[#FAF3EA]">
                  No visits recorded yet
                </p>
                <p className="mt-1 text-xs text-[#A998B0]">
                  New visitor sessions will stream here live the moment someone opens the link.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {visits.map((visit) => (
                  <SessionCard
                    key={visit.sessionId}
                    visit={visit}
                    expanded={expandedSessionId === visit.sessionId}
                    onToggleExpand={() =>
                      setExpandedSessionId((curr) =>
                        curr === visit.sessionId ? null : visit.sessionId,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
