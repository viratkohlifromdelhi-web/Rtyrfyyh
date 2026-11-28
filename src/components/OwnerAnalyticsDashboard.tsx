import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
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
  Eye,
  EyeOff,
  Globe,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquareHeart,
  Monitor,
  Radio,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  Trash2,
  Vibrate,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  auth,
  buildFirestoreErrorInfo,
  checkFirestoreConnection,
  db,
  firebaseDatabaseId,
  firebaseProjectId,
  googleProvider,
  OperationType,
} from '../firebase';
import {
  parseFirestoreErrorSummary,
  type FirestoreDiagnosticStatus,
} from '../utils/firestoreDiagnostics';
import {
  isOwnerDeviceIgnoredFlag,
  setOwnerAnalyticsIgnored,
} from '../utils/analytics';
import {
  DEVELOPER_REVIEW_COLLECTION,
  computeDeveloperReviewSummary,
  formatReviewISTTimestamp,
  stripVisibleDashes,
  type DeveloperReviewDashboardRecord,
} from '../utils/developerReviewCore';
import {
  DEFAULT_TIME_CAPSULE_CATEGORY,
  TIME_CAPSULE_COLLECTION,
  formatCapsuleISTTimestamp,
  isValidTimeCapsuleCategory,
  type SealedTimeCapsuleRecord,
} from '../utils/timeCapsuleCore';
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
import {
  LIVE_BROADCAST_MAX_CHARS,
  LIVE_BROADCAST_MOODS,
  LIVE_BROADCAST_PRESETS,
  clearActiveLiveBroadcast,
  computeLiveBroadcastRemainingSec,
  sanitizeLiveBroadcastMessage,
  sendLiveBroadcast,
  subscribeToLiveBroadcast,
  type LiveBroadcastMood,
  type LiveBroadcastRecord,
} from '../utils/liveBroadcastService';

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
  deleting,
  onToggleExpand,
  onDeleteSession,
}: {
  visit: SiteVisitRecord;
  expanded: boolean;
  deleting: boolean;
  onToggleExpand: () => void;
  onDeleteSession: (sessionId: string) => void;
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

      {expanded && (
        <>
          <div className="flex items-center justify-end border-t border-white/8 bg-[#120D16] px-4 py-2 sm:px-5">
            <button
              type="button"
              disabled={deleting}
              onClick={() => onDeleteSession(visit.sessionId)}
              className="inline-flex min-h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{deleting ? 'Deleting...' : 'Delete Session & Events'}</span>
            </button>
          </div>
          <SessionTimeline sessionId={visit.sessionId} />
        </>
      )}
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
  const [unauthorizedHost, setUnauthorizedHost] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [ignoreMyDevice, setIgnoreMyDevice] = useState<boolean>(() =>
    isOwnerDeviceIgnoredFlag(),
  );
  const [visits, setVisits] = useState<SiteVisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<DeveloperReviewDashboardRecord[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [confirmDeleteReviewId, setConfirmDeleteReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [capsules, setCapsules] = useState<SealedTimeCapsuleRecord[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(false);
  const [capsulesError, setCapsulesError] = useState<string | null>(null);
  const [revealedCapsuleIds, setRevealedCapsuleIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteCapsuleId, setConfirmDeleteCapsuleId] = useState<string | null>(null);
  const [deletingCapsuleId, setDeletingCapsuleId] = useState<string | null>(null);
  const [confirmCleanAction, setConfirmCleanAction] = useState<
    'tapli' | 'reviews' | 'visits' | 'capsules' | null
  >(null);
  const [runningCleanAction, setRunningCleanAction] = useState<
    'tapli' | 'reviews' | 'visits' | 'capsules' | null
  >(null);
  const [cleanSlateToast, setCleanSlateToast] = useState<string | null>(null);
  const cleanToastTimerRef = useRef<number | null>(null);

  // Remote Modino Live Broadcast Studio state (verified owner only)
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastMood, setBroadcastMood] = useState<LiveBroadcastMood>('cheer');
  const [broadcastConfetti, setBroadcastConfetti] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [clearingBroadcast, setClearingBroadcast] = useState(false);
  const [broadcastToast, setBroadcastToast] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<LiveBroadcastRecord | null>(null);
  const [lastBeamedBroadcast, setLastBeamedBroadcast] = useState<LiveBroadcastRecord | null>(null);
  const [broadcastNowMs, setBroadcastNowMs] = useState(() => Date.now());
  const broadcastToastTimerRef = useRef<number | null>(null);
  const broadcastTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [dbDiagnostic, setDbDiagnostic] = useState<FirestoreDiagnosticStatus>(() => ({
    status: 'checking',
    code: null,
    label: 'Checking...',
    detail: `Probing ${firebaseProjectId} (${firebaseDatabaseId})`,
    projectId: firebaseProjectId,
    databaseId: firebaseDatabaseId,
    checkedAtMs: Date.now(),
  }));

  const [hapticTestResult, setHapticTestResult] = useState<
    'idle' | 'accepted' | 'blocked' | 'unsupported'
  >('idle');

  const hapticDiagnostics = useMemo(() => {
    const vibrateSupported =
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    let inIframe = false;
    try {
      inIframe = typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      inIframe = true;
    }
    return { vibrateSupported, inIframe };
  }, []);

  const handleTestHapticBuzz = useCallback(() => {
    try {
      if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
        setHapticTestResult('unsupported');
        return;
      }
      const accepted = Boolean(navigator.vibrate([35, 50, 50]));
      setHapticTestResult(accepted ? 'accepted' : 'blocked');
    } catch {
      setHapticTestResult('blocked');
    }
  }, []);

  const resetPinTimerRef = useRef<number | null>(null);
  const copiedDomainTimerRef = useRef<number | null>(null);

  const runDbDiagnostic = useCallback(async () => {
    setDbDiagnostic((prev) => ({
      ...prev,
      status: 'checking',
      label: 'Checking...',
    }));
    const result = await checkFirestoreConnection();
    setDbDiagnostic(result);
  }, []);

  useEffect(() => {
    void runDbDiagnostic();
  }, [runDbDiagnostic]);

  // Lock background scroll & bind Escape key while dashboard overlay is open
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
      if (resetPinTimerRef.current !== null) {
        window.clearTimeout(resetPinTimerRef.current);
      }
      if (copiedDomainTimerRef.current !== null) {
        window.clearTimeout(copiedDomainTimerRef.current);
      }
      if (cleanToastTimerRef.current !== null) {
        window.clearTimeout(cleanToastTimerRef.current);
      }
      if (broadcastToastTimerRef.current !== null) {
        window.clearTimeout(broadcastToastTimerRef.current);
      }
    };
  }, [onClose]);

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

  const showBroadcastToast = useCallback((text: string) => {
    setBroadcastToast(text);
    if (broadcastToastTimerRef.current !== null) {
      window.clearTimeout(broadcastToastTimerRef.current);
    }
    broadcastToastTimerRef.current = window.setTimeout(() => {
      broadcastToastTimerRef.current = null;
      setBroadcastToast(null);
    }, 3400);
  }, []);

  // Subscribe to /site_config/live_broadcast while verified owner studio is open
  useEffect(() => {
    if (!pinUnlocked || !isVerifiedOwner || !db) return;

    const unsubscribe = subscribeToLiveBroadcast(
      (record) => {
        setActiveBroadcast(record);
        if (record) {
          setLastBeamedBroadcast((prev) =>
            prev && prev.sentAtMs > record.sentAtMs ? prev : record,
          );
        }
      },
      () => {
        // Silent fallback on transient network hiccups
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isVerifiedOwner, pinUnlocked]);

  // 1s ticker for live broadcast 90s TTL countdown display
  useEffect(() => {
    if (!pinUnlocked || !isVerifiedOwner) return;
    const activeTarget = activeBroadcast ?? lastBeamedBroadcast;
    if (!activeTarget) return;
    if (computeLiveBroadcastRemainingSec(activeTarget.expiresAtMs, Date.now()) <= 0) {
      return;
    }

    setBroadcastNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      const now = Date.now();
      setBroadcastNowMs(now);
      if (computeLiveBroadcastRemainingSec(activeTarget.expiresAtMs, now) <= 0) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeBroadcast, isVerifiedOwner, lastBeamedBroadcast, pinUnlocked]);

  const activeBroadcastRemainingSec = useMemo(() => {
    const target = activeBroadcast ?? lastBeamedBroadcast;
    if (!target) return 0;
    return computeLiveBroadcastRemainingSec(target.expiresAtMs, broadcastNowMs);
  }, [activeBroadcast, broadcastNowMs, lastBeamedBroadcast]);

  const sanitizedBroadcastPreview = useMemo(
    () => sanitizeLiveBroadcastMessage(broadcastMessage),
    [broadcastMessage],
  );

  const handleBeamLiveBroadcast = useCallback(async () => {
    if (sendingBroadcast || !sanitizedBroadcastPreview) return;
    setSendingBroadcast(true);
    setBroadcastError(null);
    try {
      const sent = await sendLiveBroadcast({
        message: sanitizedBroadcastPreview,
        mood: broadcastMood,
        confetti: broadcastConfetti,
      });
      setActiveBroadcast(sent);
      setLastBeamedBroadcast(sent);
      setBroadcastNowMs(Date.now());
      setBroadcastMessage('');
      showBroadcastToast('Beamed to Modino! ✨');
    } catch (err) {
      const summary = parseFirestoreErrorSummary(err);
      setBroadcastError(
        summary.detail || summary.label || 'Could not beam live broadcast. Check connection and try again.',
      );
    } finally {
      setSendingBroadcast(false);
    }
  }, [
    broadcastConfetti,
    broadcastMood,
    sanitizedBroadcastPreview,
    sendingBroadcast,
    showBroadcastToast,
  ]);

  const handleClearLiveBroadcast = useCallback(async () => {
    if (clearingBroadcast) return;
    setClearingBroadcast(true);
    setBroadcastError(null);
    try {
      await clearActiveLiveBroadcast();
      setActiveBroadcast(null);
      setLastBeamedBroadcast(null);
      showBroadcastToast('Active live broadcast cleared.');
    } catch (err) {
      const summary = parseFirestoreErrorSummary(err);
      setBroadcastError(summary.detail || summary.label || 'Could not clear active live broadcast.');
    } finally {
      setClearingBroadcast(false);
    }
  }, [clearingBroadcast, showBroadcastToast]);

  const handleSelectBroadcastPreset = useCallback((preset: string) => {
    setBroadcastMessage(preset);
    setBroadcastError(null);
    window.requestAnimationFrame(() => {
      broadcastTextareaRef.current?.focus();
    });
  }, []);

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

  // Subscribe to Firestore developer_reviews ONLY after PIN 9876 AND verified owner auth
  useEffect(() => {
    if (!pinUnlocked || !isVerifiedOwner || !db) return;

    setLoadingReviews(true);
    setReviewsError(null);

    let unsub: Unsubscribe | null = null;
    try {
      const q = query(
        collection(db, DEVELOPER_REVIEW_COLLECTION),
        orderBy('submittedAtMs', 'desc'),
        limit(50),
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const rows: DeveloperReviewDashboardRecord[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const submittedAtMs =
              typeof d.submittedAtMs === 'number' ? d.submittedAtMs : Date.now();
            const rating = typeof d.rating === 'number' ? d.rating : 5;
            const deviceType =
              d.deviceType === 'Mobile' || d.deviceType === 'Tablet' || d.deviceType === 'Desktop'
                ? d.deviceType
                : 'Mobile';
            const bestThings = Array.isArray(d.bestThings)
              ? d.bestThings.filter((item): item is string => typeof item === 'string')
              : [];
            return {
              reviewId: typeof d.reviewId === 'string' ? d.reviewId : docSnap.id,
              rating,
              isBonusRating: Boolean(d.isBonusRating) || rating === 10,
              bestThings,
              message: typeof d.message === 'string' ? d.message : '',
              noteNumber: typeof d.noteNumber === 'number' ? d.noteNumber : 1,
              submittedAtMs,
              submittedAtIST:
                typeof d.submittedAtIST === 'string' && d.submittedAtIST.trim()
                  ? stripVisibleDashes(d.submittedAtIST)
                  : formatReviewISTTimestamp(submittedAtMs),
              sessionId: typeof d.sessionId === 'string' ? d.sessionId : 'direct_session',
              deviceType,
              sessionTaplis: typeof d.sessionTaplis === 'number' ? d.sessionTaplis : 0,
            };
          });
          setReviews(rows);
          setLoadingReviews(false);
          setReviewsError(null);
        },
        (error) => {
          const info = buildFirestoreErrorInfo(
            error,
            OperationType.LIST,
            DEVELOPER_REVIEW_COLLECTION,
          );
          setReviewsError(info.error);
          setLoadingReviews(false);
        },
      );
    } catch (error) {
      const info = buildFirestoreErrorInfo(
        error,
        OperationType.LIST,
        DEVELOPER_REVIEW_COLLECTION,
      );
      setReviewsError(info.error);
      setLoadingReviews(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [pinUnlocked, isVerifiedOwner]);

  // Subscribe to Firestore time_capsules ONLY after PIN 9876 AND verified owner auth
  useEffect(() => {
    if (!pinUnlocked || !isVerifiedOwner || !db) return;

    setLoadingCapsules(true);
    setCapsulesError(null);

    let unsub: Unsubscribe | null = null;
    try {
      const q = query(
        collection(db, TIME_CAPSULE_COLLECTION),
        orderBy('sealedAtMs', 'desc'),
        limit(100),
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const rows: SealedTimeCapsuleRecord[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            const sealedAtMs = typeof d.sealedAtMs === 'number' ? d.sealedAtMs : Date.now();
            const deviceType =
              d.deviceType === 'Mobile' || d.deviceType === 'Tablet' || d.deviceType === 'Desktop'
                ? d.deviceType
                : 'Mobile';
            return {
              capsuleId: typeof d.capsuleId === 'string' ? d.capsuleId : docSnap.id,
              category: isValidTimeCapsuleCategory(d.category)
                ? d.category
                : DEFAULT_TIME_CAPSULE_CATEGORY,
              letter: typeof d.letter === 'string' ? d.letter : '',
              capsuleNumber: typeof d.capsuleNumber === 'number' ? d.capsuleNumber : 1,
              unlockDate: '03 Dec 2027',
              sealedAtMs,
              sealedAtIST:
                typeof d.sealedAtIST === 'string' && d.sealedAtIST.trim()
                  ? stripVisibleDashes(d.sealedAtIST)
                  : formatCapsuleISTTimestamp(sealedAtMs),
              sessionId: typeof d.sessionId === 'string' ? d.sessionId : 'direct_session',
              deviceType,
            };
          });
          setCapsules(rows);
          setLoadingCapsules(false);
          setCapsulesError(null);
        },
        (error) => {
          const info = buildFirestoreErrorInfo(
            error,
            OperationType.LIST,
            TIME_CAPSULE_COLLECTION,
          );
          setCapsulesError(info.error);
          setLoadingCapsules(false);
        },
      );
    } catch (error) {
      const info = buildFirestoreErrorInfo(error, OperationType.LIST, TIME_CAPSULE_COLLECTION);
      setCapsulesError(info.error);
      setLoadingCapsules(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, [pinUnlocked, isVerifiedOwner]);

  const reviewSummary = useMemo(() => computeDeveloperReviewSummary(reviews), [reviews]);

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
    setUnauthorizedHost(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sign-in cancelled or failed.';
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code ?? '')
          : '';
      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setUnauthorizedHost(host || 'current domain');
      }
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleCopyUnauthorizedHost = useCallback(() => {
    if (!unauthorizedHost || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(unauthorizedHost).then(() => {
      setCopiedDomain(true);
      if (copiedDomainTimerRef.current !== null) {
        window.clearTimeout(copiedDomainTimerRef.current);
      }
      copiedDomainTimerRef.current = window.setTimeout(() => {
        setCopiedDomain(false);
        copiedDomainTimerRef.current = null;
      }, 2000);
    });
  }, [unauthorizedHost]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!db || deletingSessionId) return;
    setDeletingSessionId(sessionId);
    setFeedError(null);
    try {
      const eventsSnap = await getDocs(collection(db, 'site_visits', sessionId, 'events'));
      if (!eventsSnap.empty) {
        const docs = eventsSnap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db);
          for (const d of docs.slice(i, i + 400)) {
            batch.delete(d.ref);
          }
          await batch.commit();
        }
      }
      await deleteDoc(doc(db, 'site_visits', sessionId));
      setExpandedSessionId((curr) => (curr === sessionId ? null : curr));
    } catch (error) {
      const info = buildFirestoreErrorInfo(error, OperationType.DELETE, `site_visits/${sessionId}`);
      setFeedError(info.error);
    } finally {
      setDeletingSessionId(null);
    }
  }, [deletingSessionId]);

  const handleDeleteReview = useCallback(
    async (reviewId: string) => {
      if (!db || deletingReviewId) return;
      setDeletingReviewId(reviewId);
      setReviewsError(null);
      try {
        await deleteDoc(doc(db, DEVELOPER_REVIEW_COLLECTION, reviewId));
        setConfirmDeleteReviewId((curr) => (curr === reviewId ? null : curr));
      } catch (error) {
        const info = buildFirestoreErrorInfo(
          error,
          OperationType.DELETE,
          `${DEVELOPER_REVIEW_COLLECTION}/${reviewId}`,
        );
        setReviewsError(info.error);
      } finally {
        setDeletingReviewId(null);
      }
    },
    [deletingReviewId],
  );

  const showCleanToast = useCallback((message: string) => {
    setCleanSlateToast(message);
    if (cleanToastTimerRef.current !== null) {
      window.clearTimeout(cleanToastTimerRef.current);
    }
    cleanToastTimerRef.current = window.setTimeout(() => {
      setCleanSlateToast(null);
      cleanToastTimerRef.current = null;
    }, 3200);
  }, []);

  const handleDeleteCapsule = useCallback(
    async (capsuleId: string) => {
      if (!db || deletingCapsuleId) return;
      setDeletingCapsuleId(capsuleId);
      setCapsulesError(null);
      try {
        await deleteDoc(doc(db, TIME_CAPSULE_COLLECTION, capsuleId));
        setConfirmDeleteCapsuleId((curr) => (curr === capsuleId ? null : curr));
      } catch (error) {
        const info = buildFirestoreErrorInfo(
          error,
          OperationType.DELETE,
          `${TIME_CAPSULE_COLLECTION}/${capsuleId}`,
        );
        setCapsulesError(info.error);
      } finally {
        setDeletingCapsuleId(null);
      }
    },
    [deletingCapsuleId],
  );

  const handleRunCleanSlateAction = useCallback(
    async (action: 'tapli' | 'reviews' | 'visits' | 'capsules') => {
      if (!db || runningCleanAction) return;
      setRunningCleanAction(action);
      try {
        if (action === 'tapli') {
          await setDoc(doc(db, 'site_config', 'tapli_counter'), {
            totalTaplis: 0,
            updatedAt: serverTimestamp(),
            updatedAtMs: Date.now(),
          });
          showCleanToast('Tapli counter reset to 0');
        } else if (action === 'reviews') {
          const snap = await getDocs(collection(db, DEVELOPER_REVIEW_COLLECTION));
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const batch = writeBatch(db);
            for (const d of docs.slice(i, i + 400)) {
              batch.delete(d.ref);
            }
            await batch.commit();
          }
          showCleanToast(`Deleted ${docs.length} test ${docs.length === 1 ? 'review' : 'reviews'}`);
        } else if (action === 'capsules') {
          const snap = await getDocs(collection(db, TIME_CAPSULE_COLLECTION));
          const docs = snap.docs;
          for (let i = 0; i < docs.length; i += 400) {
            const batch = writeBatch(db);
            for (const d of docs.slice(i, i + 400)) {
              batch.delete(d.ref);
            }
            await batch.commit();
          }
          showCleanToast(
            `Deleted ${docs.length} test ${docs.length === 1 ? 'capsule' : 'capsules'}`,
          );
        } else if (action === 'visits') {
          const visitsSnap = await getDocs(collection(db, 'site_visits'));
          for (const visitDoc of visitsSnap.docs) {
            const eventsSnap = await getDocs(
              collection(db, 'site_visits', visitDoc.id, 'events'),
            );
            const eventDocs = eventsSnap.docs;
            for (let i = 0; i < eventDocs.length; i += 400) {
              const batch = writeBatch(db);
              for (const evDoc of eventDocs.slice(i, i + 400)) {
                batch.delete(evDoc.ref);
              }
              await batch.commit();
            }
            await deleteDoc(visitDoc.ref);
          }
          setExpandedSessionId(null);
          showCleanToast(
            `Deleted ${visitsSnap.docs.length} test ${visitsSnap.docs.length === 1 ? 'visit' : 'visits'}`,
          );
        }
        setConfirmCleanAction(null);
      } catch (error) {
        const path =
          action === 'tapli'
            ? 'site_config/tapli_counter'
            : action === 'reviews'
              ? DEVELOPER_REVIEW_COLLECTION
              : action === 'capsules'
                ? TIME_CAPSULE_COLLECTION
                : 'site_visits';
        const info = buildFirestoreErrorInfo(
          error,
          action === 'tapli' ? OperationType.WRITE : OperationType.DELETE,
          path,
        );
        setFeedError(info.error);
      } finally {
        setRunningCleanAction(null);
      }
    },
    [runningCleanAction, showCleanToast],
  );

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

  const diagnosticBadge = useMemo(() => {
    if (feedError) {
      const parsed = parseFirestoreErrorSummary(feedError);
      return {
        status: 'error' as const,
        label: parsed.label,
        detail: `${parsed.detail} · Project: ${firebaseProjectId} · DB: ${firebaseDatabaseId}`,
      };
    }
    return {
      status: dbDiagnostic.status,
      label: dbDiagnostic.label,
      detail: `${dbDiagnostic.detail} · Project: ${dbDiagnostic.projectId} · DB: ${dbDiagnostic.databaseId}`,
    };
  }, [dbDiagnostic, feedError]);

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
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#E6C690]/30 bg-[#E6C690]/10 text-[#E6C690]">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
              <button
                type="button"
                data-testid="firestore-diagnostic-badge"
                data-status={diagnosticBadge.status}
                onClick={() => void runDbDiagnostic()}
                title={`${diagnosticBadge.detail} (click to re-test)`}
                className={`inline-flex max-w-[230px] cursor-pointer items-center gap-1.5 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide transition-colors ${
                  diagnosticBadge.status === 'connected'
                    ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20'
                    : diagnosticBadge.status === 'checking'
                      ? 'border-[#E6C690]/30 bg-[#E6C690]/10 text-[#E6C690] hover:bg-[#E6C690]/18'
                      : 'border-rose-400/45 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    diagnosticBadge.status === 'connected'
                      ? 'bg-emerald-400'
                      : diagnosticBadge.status === 'checking'
                        ? 'bg-[#E6C690] animate-pulse'
                        : 'bg-rose-400'
                  }`}
                />
                <span className="truncate">
                  {diagnosticBadge.status === 'connected'
                    ? 'Connected'
                    : diagnosticBadge.label}
                </span>
              </button>
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
      <div
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        style={{ paddingBottom: 'calc(24px + var(--safe-bottom))' }}
      >
        {!pinUnlocked ? (
          /* Step 1: 4-Digit Owner PIN Gate (9876) */
          <div
            data-testid="dashboard-pin-gate"
            className="mx-auto mt-4 flex w-full max-w-[min(92vw,440px)] flex-col items-center rounded-3xl border border-[#E6C690]/25 bg-[#17111B] p-6 sm:p-8 text-center shadow-2xl sm:mt-10"
          >
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[#E6C690]/35 bg-[#E6C690]/10 text-[#E6C690]">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <h2 className="font-display mt-3.5 text-xl sm:text-2xl font-semibold text-[#FAF3EA]">
              Owner Verification
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-[#A998B0]">
              Enter your 4 digit owner PIN to unlock live analytics.
            </p>

            {/* Hidden numeric input + 4 PIN dots */}
            <div className="relative mt-5 mb-2 w-full">
              <input
                type="text"
                inputMode="none"
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
            <div className="grid w-full max-w-[280px] grid-cols-3 gap-2.5 sm:gap-3">
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
                  className={`flex h-13 sm:h-14 w-full cursor-pointer items-center justify-center rounded-full border text-base sm:text-lg font-medium transition-colors active:scale-95 ${
                    key === 'CLEAR' || key === 'BACK'
                      ? 'border-transparent bg-transparent text-xs sm:text-sm font-semibold text-[#D7B57E] hover:bg-white/5'
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
            className="mx-auto mt-8 flex w-full max-w-lg flex-col items-center rounded-3xl border border-[#E6C690]/25 bg-[#17111B] p-6 sm:p-8 text-center shadow-2xl"
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
              <div className="mt-3 w-full space-y-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-left text-xs text-rose-200">
                <p className="font-medium">{authError}</p>
                {unauthorizedHost && (
                  <div className="space-y-2 border-t border-rose-300/20 pt-2 text-[11px] leading-relaxed text-[#E6D9EA]">
                    <p>
                      Domain <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[#E6C690]">{unauthorizedHost}</code>{' '}
                      is not yet in Authorized Domains for project{' '}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[#E6C690]">{firebaseProjectId}</code>.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyUnauthorizedHost}
                        className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#FAF3EA] hover:bg-white/15"
                      >
                        {copiedDomain ? 'Copied Domain' : 'Copy Domain'}
                      </button>
                      <a
                        href={`https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-[#E6C690]/40 bg-[#E6C690]/15 px-3 py-1 text-[11px] font-semibold text-[#F0D5A0] hover:bg-[#E6C690]/25"
                      >
                        Open Authorized Domains &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </div>
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
          <div className="mx-auto max-w-[1040px] space-y-5 pb-10">
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

            {/* Modino Live Broadcast Studio (Verified Owner Only) */}
            <section
              data-testid="owner-live-broadcast-studio"
              className="space-y-3.5 rounded-2xl border border-[#E6C690]/35 bg-gradient-to-br from-[#1C1322] via-[#18111D] to-[#211321] p-4 shadow-[0_14px_34px_-16px_rgba(217,75,125,0.28)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6C690]/45 bg-[#D94B7D]/20 text-[#F8BBD0]">
                    <Radio className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-[#FAF3EA] sm:text-base">
                      Modino Live Broadcast Studio ✨
                    </h2>
                    <p className="text-[11px] text-[#B9A7C0]">
                      Type a live note and beam it straight to Modino on her screen
                    </p>
                  </div>
                </div>

                <span
                  data-testid="live-broadcast-status-pill"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold tabular-nums ${
                    activeBroadcastRemainingSec > 0
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                      : 'border-white/15 bg-white/5 text-[#B9A7C0]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeBroadcastRemainingSec > 0
                        ? 'animate-pulse bg-emerald-300'
                        : 'bg-[#9C8BA3]'
                    }`}
                  />
                  {activeBroadcastRemainingSec > 0
                    ? `Live Window · ${activeBroadcastRemainingSec}s left`
                    : 'Standby'}
                </span>
              </div>

              {/* Message Composer */}
              <div className="space-y-1.5">
                <textarea
                  ref={broadcastTextareaRef}
                  data-testid="live-broadcast-textarea"
                  rows={3}
                  maxLength={LIVE_BROADCAST_MAX_CHARS}
                  value={broadcastMessage}
                  onChange={(e) => {
                    setBroadcastMessage(e.target.value);
                    if (broadcastError) setBroadcastError(null);
                  }}
                  placeholder="Type a live message for Modino to say on her screen right now..."
                  className="w-full resize-none rounded-xl border border-[#E6C690]/25 bg-[#120C16]/90 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#FAF3EA] placeholder:text-[#8E7C96] focus:border-[#E6C690]/70 focus:outline-none"
                />
                <div className="flex items-center justify-between text-[11px] text-[#9C8BA3]">
                  <span>Auto wakes Modino even if sleeping or tucked</span>
                  <span
                    data-testid="live-broadcast-char-count"
                    className={`tabular-nums font-medium ${
                      broadcastMessage.length >= LIVE_BROADCAST_MAX_CHARS - 20
                        ? 'text-amber-300'
                        : 'text-[#B9A7C0]'
                    }`}
                  >
                    {broadcastMessage.length} / {LIVE_BROADCAST_MAX_CHARS}
                  </span>
                </div>
              </div>

              {/* Mood Selector Row + Mini Confetti Switch */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div
                  role="radiogroup"
                  aria-label="Broadcast mood"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  {LIVE_BROADCAST_MOODS.map((option) => {
                    const selected = broadcastMood === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-testid={`live-mood-${option.id}`}
                        onClick={() => setBroadcastMood(option.id)}
                        className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all active:scale-96 ${
                          selected
                            ? 'border-[#F4A6C1] bg-[#FDE4EE] text-[#4A1432] shadow-[0_4px_14px_-4px_rgba(244,166,193,0.55)]'
                            : 'border-white/12 bg-white/6 text-[#DACCE0] hover:border-[#E6C690]/40 hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11.5px] font-medium text-[#EFE3F4]">
                  <span>Pop Mini Confetti 🎊</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={broadcastConfetti}
                    data-testid="live-broadcast-confetti-toggle"
                    onClick={() => setBroadcastConfetti((prev) => !prev)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      broadcastConfetti ? 'bg-[#D94B7D]' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        broadcastConfetti ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* 5 Quick 1-Tap Presets */}
              <div className="space-y-1.5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#A998B0]">
                  Quick 1 Tap Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LIVE_BROADCAST_PRESETS.map((preset, idx) => (
                    <button
                      key={preset}
                      type="button"
                      data-testid={`live-preset-${idx + 1}`}
                      onClick={() => handleSelectBroadcastPreset(preset)}
                      className="cursor-pointer rounded-xl border border-[#E6C690]/20 bg-white/5 px-2.5 py-1.5 text-left text-[11px] leading-snug text-[#E5D9EA] transition-colors hover:border-[#E6C690]/50 hover:bg-[#E6C690]/12 active:scale-98"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Beam + Secondary Clear Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <button
                  type="button"
                  data-testid="beam-live-broadcast-btn"
                  disabled={sendingBroadcast || !sanitizedBroadcastPreview}
                  onClick={() => void handleBeamLiveBroadcast()}
                  className="inline-flex min-h-[42px] flex-1 sm:flex-none cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#D94B7D] via-[#C83D71] to-[#B53166] px-5 py-2 text-[12.5px] font-bold text-[#FFF9FB] shadow-[0_10px_22px_-8px_rgba(217,75,125,0.65)] transition-all hover:brightness-110 active:scale-97 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{sendingBroadcast ? 'Beaming Live...' : 'Beam to Modino Live ⚡'}</span>
                </button>

                <button
                  type="button"
                  data-testid="clear-live-broadcast-btn"
                  disabled={clearingBroadcast || (!activeBroadcast && !lastBeamedBroadcast)}
                  onClick={() => void handleClearLiveBroadcast()}
                  className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-white/18 bg-white/5 px-4 py-2 text-[12px] font-semibold text-[#D6C7DC] transition-colors hover:border-rose-300/45 hover:bg-rose-500/12 hover:text-rose-100 active:scale-97 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{clearingBroadcast ? 'Clearing...' : 'Clear Active'}</span>
                </button>
              </div>

              {/* Feedback Toast or Error */}
              {broadcastToast && (
                <div
                  data-testid="live-broadcast-toast"
                  role="status"
                  className="rounded-xl border border-emerald-400/35 bg-emerald-500/12 px-3 py-2 text-[11.5px] font-semibold text-emerald-200"
                >
                  {broadcastToast}
                </div>
              )}

              {broadcastError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-[11.5px] font-medium text-rose-200"
                >
                  {broadcastError}
                </div>
              )}

              {/* Last Beamed Preview Card */}
              {(activeBroadcast ?? lastBeamedBroadcast) && (
                <div
                  data-testid="live-broadcast-last-preview"
                  className="rounded-xl border border-[#E6C690]/25 bg-[#120C16]/75 px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10.5px] font-semibold text-[#E6C690]">
                    <span>Last Beamed · {(activeBroadcast ?? lastBeamedBroadcast)?.mood.toUpperCase()}</span>
                    <span className="tabular-nums text-[#B9A7C0]">
                      {activeBroadcastRemainingSec > 0
                        ? `Active for ${activeBroadcastRemainingSec}s`
                        : 'Window expired'}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-snug text-[#FAF3EA]">
                    {(activeBroadcast ?? lastBeamedBroadcast)?.message}
                  </p>
                </div>
              )}
            </section>

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

            {/* Private Owner Haptics Diagnostic Row (strictly inside ?insights=9876 verified view) */}
            <div
              data-testid="owner-haptics-diagnostic"
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#17111B] px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                <Vibrate className="mt-0.5 h-4 w-4 shrink-0 text-[#E6C690]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-semibold text-[#FAF3EA]">Test Haptics</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#C7B8CC]">
                    <span>
                      Vibrate API:{' '}
                      <strong
                        data-testid="haptic-api-status"
                        className={
                          hapticDiagnostics.vibrateSupported ? 'text-emerald-300' : 'text-rose-300'
                        }
                      >
                        {hapticDiagnostics.vibrateSupported ? 'Supported' : 'Not Supported'}
                      </strong>
                    </span>
                    <span aria-hidden="true" className="text-white/25">
                      &middot;
                    </span>
                    <span>
                      Context:{' '}
                      <strong
                        data-testid="haptic-context-status"
                        className={
                          hapticDiagnostics.inIframe ? 'text-amber-300' : 'text-emerald-300'
                        }
                      >
                        {hapticDiagnostics.inIframe ? 'Blocked in Iframe' : 'Top Window'}
                      </strong>
                    </span>
                    {hapticTestResult !== 'idle' && (
                      <>
                        <span aria-hidden="true" className="text-white/25">
                          &middot;
                        </span>
                        <span>
                          Result:{' '}
                          <strong
                            data-testid="haptic-test-result"
                            className={
                              hapticTestResult === 'accepted'
                                ? 'text-emerald-300'
                                : hapticTestResult === 'unsupported'
                                  ? 'text-rose-300'
                                  : 'text-amber-300'
                            }
                          >
                            {hapticTestResult === 'accepted'
                              ? 'Accepted'
                              : hapticTestResult === 'unsupported'
                                ? 'Not Supported'
                                : 'Blocked by browser'}
                          </strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                data-testid="test-haptic-buzz-btn"
                onClick={handleTestHapticBuzz}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E6C690]/45 bg-[#E6C690]/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-[#F6DFB0] transition-colors hover:bg-[#E6C690]/25 active:scale-97"
              >
                <Vibrate className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Test Haptic Buzz</span>
              </button>
            </div>

            {/* Pre Launch Clean Slate Utility Card (Strictly Verified Owner Only) */}
            <section
              data-testid="owner-clean-slate-card"
              className="space-y-3 rounded-2xl border border-[#E6C690]/25 bg-[#17111B] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6C690]/35 bg-[#E6C690]/12 text-[#E6C690]">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-semibold text-[#FAF3EA] sm:text-base">
                      Pre Launch Clean Slate
                    </h2>
                    <p className="text-[11px] text-[#A998B0]">
                      Wipe test activity cleanly before midnight on 03 Dec 2026
                    </p>
                  </div>
                </div>
                {cleanSlateToast && (
                  <span
                    role="status"
                    data-testid="clean-slate-toast"
                    className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-200"
                  >
                    {cleanSlateToast}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    {
                      id: 'tapli',
                      label: 'Reset Global Tapli Counter to 0',
                      confirmLabel: 'Confirm Reset?',
                      busyLabel: 'Resetting...',
                    },
                    {
                      id: 'reviews',
                      label: 'Delete All Test Reviews',
                      confirmLabel: 'Confirm Reset?',
                      busyLabel: 'Deleting...',
                    },
                    {
                      id: 'visits',
                      label: 'Delete All Test Visits',
                      confirmLabel: 'Confirm Reset?',
                      busyLabel: 'Deleting...',
                    },
                    {
                      id: 'capsules',
                      label: 'Delete All Test Capsules',
                      confirmLabel: 'Confirm Reset?',
                      busyLabel: 'Deleting...',
                    },
                  ] as const
                ).map((item) => {
                  const isConfirming = confirmCleanAction === item.id;
                  const isBusy = runningCleanAction === item.id;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                    >
                      <span className="text-xs font-semibold text-[#FAF3EA]">{item.label}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isConfirming ? (
                          <>
                            <button
                              type="button"
                              data-testid={`clean-slate-confirm-${item.id}`}
                              disabled={Boolean(runningCleanAction)}
                              onClick={() => void handleRunCleanSlateAction(item.id)}
                              className="cursor-pointer rounded-full border border-rose-400/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                            >
                              {isBusy ? item.busyLabel : item.confirmLabel}
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(runningCleanAction)}
                              onClick={() => setConfirmCleanAction(null)}
                              className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:bg-white/10"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            data-testid={`clean-slate-trigger-${item.id}`}
                            disabled={Boolean(runningCleanAction)}
                            onClick={() => setConfirmCleanAction(item.id)}
                            className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-[#E6D9EA] transition-colors hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-50"
                          >
                            {item.id === 'tapli' ? 'Reset' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Ratings & Notes Panel (live stream from /developer_reviews) */}
            <section
              data-testid="dashboard-developer-reviews-panel"
              className="space-y-3.5 rounded-2xl border border-[#E6C690]/25 bg-[#17111B] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E6C690]/35 bg-[#E6C690]/12 text-[#E6C690]">
                    <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#FAF3EA]">
                      Ratings &amp; Notes
                    </h2>
                    <p className="text-[11px] text-[#A998B0]">
                      Live birthday reviews and postcard notes sent to adinomide
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-[#E6C690]/28 bg-[#E6C690]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F0D5A0]">
                  {reviewSummary.totalNotes} {reviewSummary.totalNotes === 1 ? 'Note' : 'Notes'}
                </span>
              </div>

              {/* Summary Strip: Total Notes · Average Rating · Top Favorite Feature */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                    Total Notes
                  </p>
                  <p
                    data-testid="reviews-stat-total"
                    className="font-display mt-1 text-xl font-semibold tabular-nums text-[#FAF3EA]"
                  >
                    {reviewSummary.totalNotes}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                    Average Rating
                  </p>
                  <p
                    data-testid="reviews-stat-avg"
                    className="font-display mt-1 text-xl font-semibold tabular-nums text-[#F4C86A]"
                  >
                    {reviewSummary.averageRatingLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A998B0]">
                    Top Favorite Feature
                  </p>
                  <p
                    data-testid="reviews-stat-top-fav"
                    className="mt-1 truncate text-sm font-semibold text-[#F5A8C7]"
                  >
                    {reviewSummary.topFavorite}
                  </p>
                </div>
              </div>

              {reviewsError && (
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/12 px-3.5 py-2.5 text-xs text-rose-200">
                  Reviews stream error: {reviewsError}
                </div>
              )}

              {loadingReviews ? (
                <p className="py-5 text-center text-xs text-[#C7B8CC]">
                  Loading live ratings &amp; notes...
                </p>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-[#FAF3EA]">No notes received yet</p>
                  <p className="mt-1 text-xs text-[#A998B0]">
                    Submitted ratings and postcard notes will stream here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => {
                    const isConfirming = confirmDeleteReviewId === rev.reviewId;
                    const isDeleting = deletingReviewId === rev.reviewId;
                    return (
                      <article
                        key={rev.reviewId}
                        data-testid={`dashboard-review-card-${rev.reviewId}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                rev.isBonusRating
                                  ? 'border-[#F4C86A]/60 bg-[#F4C86A]/18 text-[#FCE19D]'
                                  : 'border-[#E6C690]/35 bg-[#E6C690]/12 text-[#F0D5A0]'
                              }`}
                            >
                              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                              <span>
                                {rev.rating} / 5 ★{rev.isBonusRating ? ' · Bonus' : ''}
                              </span>
                            </span>
                            <span className="text-xs font-semibold text-[#FAF3EA]">
                              Note #{rev.noteNumber}
                            </span>
                            <span className="text-[11px] text-[#A998B0]">
                              {rev.submittedAtIST}
                            </span>
                          </div>

                          {/* Two-step inline delete confirmation (no window.confirm) */}
                          <div className="flex items-center gap-1.5">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => void handleDeleteReview(rev.reviewId)}
                                  className="cursor-pointer rounded-full border border-rose-400/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteReviewId(null)}
                                  className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:bg-white/10"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteReviewId(rev.reviewId)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Metadata line: Device Type · Tapli Count */}
                        <p className="mt-2 text-[11px] text-[#A998B0]">
                          Device: <span className="text-[#E6D9EA]">{rev.deviceType}</span> &middot;{' '}
                          Taplis: <span className="tabular-nums text-[#E6D9EA]">{rev.sessionTaplis}</span>
                        </p>

                        {/* Favorite Chips */}
                        {rev.bestThings.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {rev.bestThings.map((fav) => (
                              <span
                                key={fav}
                                className="rounded-full border border-pink-300/25 bg-pink-400/12 px-2.5 py-0.5 text-[11px] font-medium text-pink-200"
                              >
                                {fav}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Full Written Message */}
                        <div className="mt-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-[#FAF3EA]">
                          {rev.message ? (
                            <p className="whitespace-pre-wrap break-words">{rev.message}</p>
                          ) : (
                            <p className="italic text-[#9C8BA3]">No written message included</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 18th Birthday Time Capsules Panel (live stream from /time_capsules) */}
            <section
              data-testid="dashboard-time-capsules-panel"
              className="space-y-3.5 rounded-2xl border border-[#E6C690]/25 bg-[#17111B] p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E6C690]/35 bg-[#E6C690]/12 text-[#E6C690]">
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold text-[#FAF3EA]">
                      18th Birthday Time Capsules
                    </h2>
                    <p className="text-[11px] text-[#A998B0]">
                      Wax sealed letters scheduled for 03 Dec 2027 · blurred by default for privacy
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E6C690]/28 bg-[#E6C690]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#F0D5A0]">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {capsules.length} {capsules.length === 1 ? 'Capsule' : 'Capsules'}
                  </span>
                </span>
              </div>

              {capsulesError && (
                <div className="rounded-xl border border-rose-400/35 bg-rose-500/12 px-3.5 py-2.5 text-xs text-rose-200">
                  Time capsules stream error: {capsulesError}
                </div>
              )}

              {loadingCapsules ? (
                <p className="py-5 text-center text-xs text-[#C7B8CC]">
                  Loading sealed 2027 capsules...
                </p>
              ) : capsules.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-[#FAF3EA]">No time capsules sealed yet</p>
                  <p className="mt-1 text-xs text-[#A998B0]">
                    Wax sealed letters for 03 Dec 2027 will stream here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {capsules.map((cap) => {
                    const isRevealed = Boolean(revealedCapsuleIds[cap.capsuleId]);
                    const isConfirming = confirmDeleteCapsuleId === cap.capsuleId;
                    const isDeleting = deletingCapsuleId === cap.capsuleId;
                    return (
                      <article
                        key={cap.capsuleId}
                        data-testid={`dashboard-capsule-card-${cap.capsuleId}`}
                        className="rounded-xl border border-white/10 bg-black/25 p-3.5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-pink-300/30 bg-pink-400/15 px-2.5 py-0.5 text-[11px] font-bold text-pink-200">
                              {cap.category}
                            </span>
                            <span className="text-xs font-semibold text-[#FAF3EA]">
                              Capsule #{cap.capsuleNumber}
                            </span>
                            <span className="text-[11px] text-[#A998B0]">{cap.sealedAtIST}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              data-testid={`dashboard-capsule-reveal-${cap.capsuleId}`}
                              onClick={() =>
                                setRevealedCapsuleIds((prev) => ({
                                  ...prev,
                                  [cap.capsuleId]: !prev[cap.capsuleId],
                                }))
                              }
                              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#E6C690]/35 bg-[#E6C690]/12 px-2.5 py-1 text-[11px] font-semibold text-[#F6DFB0] hover:bg-[#E6C690]/22"
                            >
                              {isRevealed ? (
                                <>
                                  <EyeOff className="h-3 w-3" aria-hidden="true" />
                                  <span>Hide Letter</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" aria-hidden="true" />
                                  <span>Reveal Letter</span>
                                </>
                              )}
                            </button>

                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => void handleDeleteCapsule(cap.capsuleId)}
                                  className="cursor-pointer rounded-full border border-rose-400/50 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50"
                                >
                                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteCapsuleId(null)}
                                  className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:bg-white/10"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCapsuleId(cap.capsuleId)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-[#C7B8CC] hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200"
                              >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="mt-2 text-[11px] text-[#A998B0]">
                          Device: <span className="text-[#E6D9EA]">{cap.deviceType}</span> &middot;{' '}
                          Unlocks: <span className="text-[#F0D5A0]">{cap.unlockDate}</span>
                        </p>

                        <div className="mt-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs leading-relaxed text-[#FAF3EA]">
                          <p
                            className={`whitespace-pre-wrap break-words transition-[filter] duration-200 ${
                              isRevealed ? 'blur-0' : 'blur-[5px] select-none'
                            }`}
                          >
                            {cap.letter}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

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
                    deleting={deletingSessionId === visit.sessionId}
                    onToggleExpand={() =>
                      setExpandedSessionId((curr) =>
                        curr === visit.sessionId ? null : visit.sessionId,
                      )
                    }
                    onDeleteSession={(id) => void handleDeleteSession(id)}
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
