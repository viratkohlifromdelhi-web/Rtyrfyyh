import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Eye, RotateCcw } from 'lucide-react';
import {
  calculateClearedRatio,
  shouldAutoRevealScratch,
} from '../utils/interactiveFun';
import {
  CrownSparkleDoodleSvg,
  LolComicStickerSvg,
  PartyTreatDoodleSvg,
  SparkleStarSvg,
} from './DoodleSvgs';
import { bgMusicPlayer } from '../utils/musicSynth';
import { soundEngine } from '../utils/soundEngine';

interface ScratchCouponsSectionProps {
  onCardRevealConfetti: (originX?: number, originY?: number) => void;
}

interface CouponSpec {
  id: 'nothing' | 'party' | 'troll';
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeClass?: string;
  iconBgClass: string;
  cardBgClass: string;
  innerBgClass: string;
  isTroll?: boolean;
  playExpiredSound?: boolean;
}

const COUPONS: readonly CouponSpec[] = [
  {
    id: 'nothing',
    title: 'LOL! You Get Nothing 😂',
    subtitle: 'Seriously, nothing. Happy Birthday Morgan.',
    badgeText: 'PRIZE: ZERO',
    badgeClass:
      'border-[#E9A5C1] bg-gradient-to-r from-[#FFE6F0] to-[#FAD3E4] text-[#6B1D4A]',
    iconBgClass: 'bg-[#FFFDFB] border-[#F2B5CC]',
    cardBgClass: 'from-[#FFEBF3] via-[#FFE6F0] to-[#FADCE9]',
    innerBgClass: 'bg-[#FFE6F0]/70 border-[#E59EBC]',
    playExpiredSound: true,
  },
  {
    id: 'party',
    title: 'YOU Give Me a Party 🍕',
    subtitle: "Not the other way around. Your birthday = your treat, I'm not paying.",
    badgeText: 'PAY UP, BAUNI 💸',
    badgeClass:
      'border-[#E7C25F] bg-gradient-to-r from-[#FFF3C4] to-[#FFE6F0] text-[#5C3400]',
    iconBgClass: 'bg-[#FFFDFB] border-[#EED17D]',
    cardBgClass: 'from-[#FFF9E2] via-[#FFF3C4]/85 to-[#FFEEC0]',
    innerBgClass: 'bg-[#FFF3C4]/55 border-[#E2C26F]',
  },
  {
    id: 'troll',
    title: '1 Day Without Being Called Gawaar',
    subtitle: 'Nice try, bauni. Maybe next year 😂',
    iconBgClass: 'bg-[#FFFDFB] border-[#D3BDF2]',
    cardBgClass: 'from-[#F6F0FF] via-[#F1E9FF] to-[#E8DBFF]',
    innerBgClass: 'bg-[#F1E9FF]/70 border-[#CBB3EE]',
    isTroll: true,
    playExpiredSound: true,
  },
];

const SPARKLE_BURST_OFFSETS = [
  { sx: '-52px', sy: '-68px', sr: '-24deg', color: '#E04D92', delay: '0ms' },
  { sx: '-12px', sy: '-86px', sr: '-10deg', color: '#F4B936', delay: '35ms' },
  { sx: '32px', sy: '-76px', sr: '18deg', color: '#9A7CE8', delay: '25ms' },
  { sx: '56px', sy: '-42px', sr: '26deg', color: '#FF8FC2', delay: '50ms' },
  { sx: '-44px', sy: '-32px', sr: '-18deg', color: '#A584F8', delay: '60ms' },
];

function drawMiniStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const outerA = (i * Math.PI) / 2;
    const innerA = outerA + Math.PI / 4;
    const ox = cx + Math.cos(outerA) * size;
    const oy = cy + Math.sin(outerA) * size;
    const ix = cx + Math.cos(innerA) * (size * 0.32);
    const iy = cy + Math.sin(innerA) * (size * 0.32);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function paintMetallicPinkFoil(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  dpr: number,
) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || cssW === 0 || cssH === 0) return;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);

  // Shimmering metallic rose-gold pink foil gradient
  const grad = ctx.createLinearGradient(0, 0, cssW, cssH);
  grad.addColorStop(0, '#F085AC');
  grad.addColorStop(0.22, '#F9C0D5');
  grad.addColorStop(0.46, '#FDE7F0');
  grad.addColorStop(0.68, '#E480A3');
  grad.addColorStop(0.86, '#D67195');
  grad.addColorStop(1, '#F8BDD3');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cssW, cssH);

  // Diagonal glossy metallic shimmer streaks
  ctx.save();
  ctx.translate(cssW / 2, cssH / 2);
  ctx.rotate(-0.44);
  const streaks = [
    { x: -cssW * 0.68, width: cssW * 0.13, alpha: 0.28 },
    { x: -cssW * 0.28, width: cssW * 0.08, alpha: 0.2 },
    { x: cssW * 0.06, width: cssW * 0.17, alpha: 0.36 },
    { x: cssW * 0.44, width: cssW * 0.09, alpha: 0.24 },
  ];
  for (const s of streaks) {
    ctx.fillStyle = `rgba(255, 253, 248, ${s.alpha})`;
    ctx.fillRect(s.x, -cssH * 1.4, s.width, cssH * 2.8);
  }
  ctx.restore();

  // Delicate inner ticket frame on the foil
  ctx.strokeStyle = 'rgba(255, 253, 248, 0.78)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.strokeRect(11, 11, cssW - 22, cssH - 22);
  ctx.setLineDash([]);

  // Subtle corner sparkle stars
  const starScale = Math.max(7, Math.round(Math.min(cssW, cssH) * 0.04));
  drawMiniStar(ctx, 28, 28, starScale, 'rgba(255, 253, 248, 0.92)');
  drawMiniStar(ctx, cssW - 28, 28, starScale * 0.85, 'rgba(255, 232, 152, 0.96)');
  drawMiniStar(ctx, 28, cssH - 28, starScale * 0.82, 'rgba(255, 232, 152, 0.92)');
  drawMiniStar(ctx, cssW - 28, cssH - 28, starScale, 'rgba(255, 253, 248, 0.92)');

  // Crisp centered foil headline
  const titleSize = Math.min(20, Math.max(16, Math.round(cssW * 0.062)));
  ctx.fillStyle = '#3B1535';
  ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCRATCH HERE ✨', cssW / 2, cssH / 2 - 10);

  const subSize = Math.min(13, Math.max(11, Math.round(cssW * 0.036)));
  ctx.fillStyle = 'rgba(59, 21, 53, 0.78)';
  ctx.font = `600 ${subSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.fillText('Rub with your finger', cssW / 2, cssH / 2 + 15);

  ctx.restore();
}

function CouponDoodleIcon({ id }: { id: CouponSpec['id'] }) {
  switch (id) {
    case 'nothing':
      return <LolComicStickerSvg className="h-14 w-16" />;
    case 'party':
      return <PartyTreatDoodleSvg className="h-14 w-14" />;
    case 'troll':
      return <CrownSparkleDoodleSvg className="h-14 w-14" />;
  }
}

interface ScratchCouponCardProps {
  coupon: CouponSpec;
  revealed: boolean;
  recoatVersion: number;
  onReveal: (id: CouponSpec['id'], originX: number, originY: number) => void;
}

function ScratchCouponCard({
  coupon,
  revealed,
  recoatVersion,
  onReveal,
}: ScratchCouponCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const isScratchingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastCheckAtRef = useRef(0);
  const hasRevealedRef = useRef(revealed);

  const [scratchPercent, setScratchPercent] = useState(0);
  const [sparkles, setSparkles] = useState<
    Array<{ id: string; sx: string; sy: string; sr: string; color: string; delay: string }>
  >([]);
  const [animVersion, setAnimVersion] = useState(0);

  useEffect(() => {
    hasRevealedRef.current = revealed;
    if (revealed) {
      setScratchPercent(0);
      setAnimVersion((v) => v + 1);
      const stamp = Date.now();
      const batch = SPARKLE_BURST_OFFSETS.map((o, idx) => ({
        id: `${coupon.id}-${stamp}-${idx}`,
        ...o,
      }));
      setSparkles(batch);
      const timer = window.setTimeout(() => {
        setSparkles((curr) => (curr === batch ? [] : curr));
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [revealed, coupon.id]);

  // Size DPR-scaled canvas cleanly to card dimensions and paint fresh metallic foil
  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const initFoil = () => {
      const rect = card.getBoundingClientRect();
      const cssW = Math.max(240, Math.round(rect.width));
      const cssH = Math.max(216, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      paintMetallicPinkFoil(canvas, cssW, cssH, dpr);
      setScratchPercent(0);
    };

    initFoil();
  }, [recoatVersion]);

  const checkClearedProgress = useCallback(() => {
    if (hasRevealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const stride = Math.max(16, Math.round(16 * dprRef.current));
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const clearedRatio = calculateClearedRatio(imgData, stride);
    setScratchPercent(Math.min(99, Math.round(clearedRatio * 100)));

    if (shouldAutoRevealScratch(clearedRatio)) {
      hasRevealedRef.current = true;
      isScratchingRef.current = false;
      setScratchPercent(0);
      const rect = canvas.getBoundingClientRect();
      onReveal(coupon.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [coupon.id, onReveal]);

  const erasePoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || hasRevealedRef.current) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = dprRef.current;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const brushRadius = 26;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 5;

      const prev = lastPointRef.current;
      if (prev) {
        const dist = Math.hypot(x - prev.x, y - prev.y);
        const steps = Math.max(1, Math.ceil(dist / 7));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const ix = prev.x + (x - prev.x) * t;
          const iy = prev.y + (y - prev.y) * t;
          ctx.beginPath();
          ctx.arc(ix, iy, brushRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      lastPointRef.current = { x, y };

      const now = performance.now();
      if (now - lastCheckAtRef.current > 100) {
        lastCheckAtRef.current = now;
        checkClearedProgress();
      }
    },
    [checkClearedProgress],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (hasRevealedRef.current) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic pointer events may not carry a capturable pointerId
    }
    isScratchingRef.current = true;
    lastPointRef.current = null;
    erasePoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isScratchingRef.current || hasRevealedRef.current) return;
    e.preventDefault();
    erasePoint(e.clientX, e.clientY);
  };

  const handlePointerEnd = () => {
    if (!isScratchingRef.current) return;
    isScratchingRef.current = false;
    lastPointRef.current = null;
    checkClearedProgress();
  };

  const revealAnimClass =
    revealed && animVersion > 0
      ? coupon.isTroll || coupon.playExpiredSound
        ? 'animate-scanner-glitch'
        : 'animate-pop-in'
      : '';

  return (
    <div
      key={`${coupon.id}-${animVersion}`}
      ref={cardRef}
      data-testid={`scratch-card-${coupon.id}`}
      data-revealed={String(revealed)}
      className={`relative flex h-full min-h-[224px] flex-col overflow-hidden rounded-[20px] border-2 border-[#E9B4D4] bg-gradient-to-br ${coupon.cardBgClass} p-3 shadow-[0_14px_34px_-16px_rgba(59,21,53,0.22),0_4px_12px_-4px_rgba(194,55,126,0.12)] ${revealAnimClass}`}
    >
      {/* Sparkle burst on auto-reveal */}
      {sparkles.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 z-40"
        >
          {sparkles.map((s) => {
            const style = {
              '--sx': s.sx,
              '--sy': s.sy,
              '--sr': s.sr,
              animationDelay: s.delay,
              color: s.color,
            } as CSSProperties;
            return (
              <span
                key={s.id}
                style={style}
                className="animate-sparkle-pop absolute -top-2.5 -left-2.5"
              >
                <SparkleStarSvg className="h-5 w-5" />
              </span>
            );
          })}
        </div>
      )}

      {/* Subtle semicircular side ticket notches */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-3 z-30 h-6 w-6 -translate-y-1/2 rounded-full border-r-2 border-[#E9B4D4] bg-[#FFF8FB]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-3 z-30 h-6 w-6 -translate-y-1/2 rounded-full border-l-2 border-[#E9B4D4] bg-[#FFF8FB]"
      />

      {/* Inner dashed voucher frame with richer soft pastel tint and balanced spacing */}
      <div
        className={`relative z-10 flex flex-1 flex-col items-center justify-between gap-3.5 rounded-[14px] border border-dashed px-4 py-4 text-center ${coupon.innerBgClass}`}
      >
        <div
          className={`flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl border shadow-2xs ${coupon.iconBgClass}`}
        >
          <CouponDoodleIcon id={coupon.id} />
        </div>

        <div className="flex flex-col items-center">
          <h3 className="font-display text-lg font-bold leading-snug text-[#3B1535] sm:text-xl">
            {coupon.title}
          </h3>
          <p className="mt-1 max-w-[26ch] text-xs leading-relaxed text-[#5E2E57] sm:text-sm">
            {coupon.subtitle}
          </p>
        </div>

        {/* Dedicated bottom badge / stamp slot — zero overlap at any width */}
        <div className="mt-0.5 flex min-h-[34px] items-center justify-center">
          {coupon.badgeText && (
            <span
              className={`inline-flex items-center justify-center rounded-full border px-3.5 py-1 text-[11px] font-extrabold tracking-wider shadow-2xs ${coupon.badgeClass}`}
            >
              {coupon.badgeText}
            </span>
          )}

          {coupon.isTroll && (
            <div
              aria-label="EXPIRED — 02 Dec 2009"
              className="inline-flex -rotate-[3deg] items-center gap-2 rounded-lg border-2 border-[#FFE4F0]/85 bg-[#3B1535] px-3 py-1 text-center shadow-[0_6px_14px_-4px_rgba(59,21,53,0.45)]"
            >
              <span className="text-[11px] font-black tracking-wider text-[#FFE898]">
                EXPIRED ❌
              </span>
              <span className="border-l border-[#FFE4F0]/35 pl-2 text-[10px] font-semibold text-[#FFE4F0]">
                02 Dec 2009
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Live subtle scratch progress pill while rubbing */}
      {!revealed && scratchPercent > 0 && (
        <span
          aria-live="polite"
          data-testid={`scratch-progress-${coupon.id}`}
          className="pointer-events-none absolute top-3 right-3 z-30 rounded-full border border-[#FFFDF8]/70 bg-[#3B1535]/85 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-[#FFE898] shadow-xs"
        >
          {scratchPercent}% scratched
        </span>
      )}

      {/* DPR-Scaled HTML5 Canvas Metallic Pink Foil Overlay — touch-action:none strictly on canvas */}
      <canvas
        ref={canvasRef}
        data-testid={`scratch-canvas-${coupon.id}`}
        aria-label={`Scratch off metallic pink foil for ${coupon.title}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        className={`absolute inset-0 z-20 h-full w-full cursor-crosshair transition-opacity duration-500 ${
          revealed ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}

export function ScratchCouponsSection({
  onCardRevealConfetti,
}: ScratchCouponsSectionProps) {
  const [revealedMap, setRevealedMap] = useState<Record<CouponSpec['id'], boolean>>({
    nothing: false,
    party: false,
    troll: false,
  });
  const [recoatVersion, setRecoatVersion] = useState(0);

  const handleCardReveal = useCallback(
    (id: CouponSpec['id'], originX: number, originY: number) => {
      setRevealedMap((prev) => {
        if (prev[id]) return prev;
        return { ...prev, [id]: true };
      });
      if (id === 'troll' || id === 'nothing') {
        soundEngine.playScratchExpired();
      } else {
        soundEngine.playScratchSparkle();
      }
      bgMusicPlayer.triggerScratchReveal();
      onCardRevealConfetti(originX, originY);
    },
    [onCardRevealConfetti],
  );

  const handleRecoatAll = () => {
    soundEngine.playBubbleClick();
    setRevealedMap({ nothing: false, party: false, troll: false });
    setRecoatVersion((v) => v + 1);
  };

  const handleRevealAll = () => {
    soundEngine.playScratchSparkle();
    bgMusicPlayer.triggerScratchReveal();
    setRevealedMap({ nothing: true, party: true, troll: true });
    onCardRevealConfetti(window.innerWidth * 0.5, window.innerHeight * 0.45);
  };

  const allRevealed = revealedMap.nothing && revealedMap.party && revealedMap.troll;

  return (
    <section
      id="scratch-cards"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF8] via-[#FFE4F0]/55 to-[#FFFDF8] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#C2377E]">
            Birthday Scratch Cards 🎟️✨
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl lg:text-5xl">
            Scratch-Off Cards ✨
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-base text-[#5E2E57]">
            Rub the pink foil with your finger to see what you got.
          </p>
        </div>

        {/* 3 Scratch-Off Ticket Cards */}
        <div
          data-testid="scratch-cards-grid"
          className="mt-9 grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch"
        >
          {COUPONS.map((coupon) => (
            <ScratchCouponCard
              key={coupon.id}
              coupon={coupon}
              revealed={revealedMap[coupon.id]}
              recoatVersion={recoatVersion}
              onReveal={handleCardReveal}
            />
          ))}
        </div>

        {/* Re-coat reset button + accessible Tap to reveal all fallback */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleRecoatAll}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-[#E6B5D5] bg-[#FFFDF8] px-6 py-2.5 text-sm font-semibold text-[#3B1535] shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#FFE4F0] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
          >
            <RotateCcw className="h-4 w-4 text-[#C2377E]" aria-hidden="true" />
            <span>Re-coat Cards 🎀</span>
          </button>

          {!allRevealed && (
            <button
              type="button"
              onClick={handleRevealAll}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#7A4B73] underline decoration-[#E04D92]/50 underline-offset-4 transition-colors hover:text-[#3B1535] cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2377E]"
            >
              <Eye className="h-3.5 w-3.5 text-[#C2377E]" aria-hidden="true" />
              <span>Tap to reveal all</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
