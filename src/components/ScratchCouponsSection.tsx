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
  CoffeeChatDoodleSvg,
  CrownSparkleDoodleSvg,
  CupcakeTreatDoodleSvg,
  SparkleStarSvg,
} from './DoodleSvgs';

interface ScratchCouponsSectionProps {
  onCardRevealConfetti: (originX?: number, originY?: number) => void;
}

interface CouponSpec {
  id: 'rant' | 'treat' | 'troll';
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeClass?: string;
  cardBgClass: string;
  isTroll?: boolean;
}

const COUPONS: readonly CouponSpec[] = [
  {
    id: 'rant',
    title: '1 Unlimited Rant Session',
    subtitle: '(No Judging, Full Attention — Greatest HG Privilege)',
    badgeText: 'VALID FOREVER ✅',
    badgeClass:
      'border-[#A8DFBE] bg-gradient-to-r from-[#DCFCE7] to-[#FFE4F0] text-[#1D5B3A]',
    cardBgClass: 'from-[#FFFDF8] via-[#F7FFF9] to-[#FFE4F0]/65',
  },
  {
    id: 'treat',
    title: '1 Free Treat',
    subtitle: "Your pick, anytime. Don't waste it, Morgan.",
    badgeText: '100% REAL 🍰',
    badgeClass:
      'border-[#F0CF72] bg-gradient-to-r from-[#FFE898] to-[#FFE4F0] text-[#5C3600]',
    cardBgClass: 'from-[#FFFDF8] via-[#FFF9E6] to-[#FFE4F0]/65',
  },
  {
    id: 'troll',
    title: '1 Day Without Being Called Gawaar',
    subtitle: 'Nice try, bauni. Better luck next year 😂',
    cardBgClass: 'from-[#FFFDF8] via-[#F3ECFF] to-[#FFE4F0]/75',
    isTroll: true,
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

function paintMetallicPinkFoil(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);

  // Shimmering metallic pink / rose-gold foil gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#F48FB1');
  grad.addColorStop(0.24, '#F8BBD0');
  grad.addColorStop(0.48, '#FCE4EC');
  grad.addColorStop(0.7, '#E68BA9');
  grad.addColorStop(0.86, '#D87A98');
  grad.addColorStop(1, '#F8BBD0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Diagonal metallic shine streaks
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.42);
  const streaks = [
    { x: -w * 0.65, width: w * 0.14, alpha: 0.28 },
    { x: -w * 0.25, width: w * 0.09, alpha: 0.2 },
    { x: w * 0.08, width: w * 0.18, alpha: 0.34 },
    { x: w * 0.44, width: w * 0.1, alpha: 0.22 },
  ];
  for (const s of streaks) {
    ctx.fillStyle = `rgba(255, 253, 248, ${s.alpha})`;
    ctx.fillRect(s.x, -h * 1.4, s.width, h * 2.8);
  }
  ctx.restore();

  // Subtle dashed coupon outline inside foil
  ctx.strokeStyle = 'rgba(255, 253, 248, 0.72)';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.006));
  ctx.setLineDash([7, 6]);
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.setLineDash([]);

  // Cute doodle stars on foil corners
  const starScale = Math.max(8, Math.round(Math.min(w, h) * 0.045));
  drawMiniStar(ctx, 32, 32, starScale, 'rgba(255, 253, 248, 0.9)');
  drawMiniStar(ctx, w - 32, 34, starScale * 0.85, 'rgba(255, 232, 152, 0.95)');
  drawMiniStar(ctx, 34, h - 32, starScale * 0.8, 'rgba(255, 232, 152, 0.9)');
  drawMiniStar(ctx, w - 34, h - 32, starScale, 'rgba(255, 253, 248, 0.9)');
  drawMiniStar(ctx, w * 0.22, h * 0.25, starScale * 0.55, 'rgba(255, 253, 248, 0.75)');
  drawMiniStar(ctx, w * 0.78, h * 0.74, starScale * 0.55, 'rgba(255, 253, 248, 0.75)');

  // Centered crisp metallic foil label
  const titleSize = Math.max(18, Math.round(w * 0.068));
  ctx.fillStyle = '#3B1535';
  ctx.font = `800 ${titleSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCRATCH HERE ✨', w / 2, h / 2 - 10);

  const subSize = Math.max(12, Math.round(w * 0.038));
  ctx.fillStyle = 'rgba(59, 21, 53, 0.8)';
  ctx.font = `600 ${subSize}px "Plus Jakarta Sans", -apple-system, sans-serif`;
  ctx.fillText('Rub foil to unlock perk', w / 2, h / 2 + 18);

  ctx.restore();
}

function CouponDoodleIcon({ id }: { id: CouponSpec['id'] }) {
  switch (id) {
    case 'rant':
      return <CoffeeChatDoodleSvg className="h-16 w-16" />;
    case 'treat':
      return <CupcakeTreatDoodleSvg className="h-16 w-16" />;
    case 'troll':
      return <CrownSparkleDoodleSvg className="h-16 w-16" />;
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
  const isScratchingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastCheckAtRef = useRef(0);
  const hasRevealedRef = useRef(revealed);

  const [sparkles, setSparkles] = useState<
    Array<{ id: string; sx: string; sy: string; sr: string; color: string; delay: string }>
  >([]);
  const [animVersion, setAnimVersion] = useState(0);

  useEffect(() => {
    hasRevealedRef.current = revealed;
    if (revealed) {
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

  // Size canvas cleanly to card dimensions and paint fresh metallic foil on mount / recoat
  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    if (!canvas || !card) return;

    const initFoil = () => {
      const rect = card.getBoundingClientRect();
      const targetW = Math.max(240, Math.round(rect.width));
      const targetH = Math.max(220, Math.round(rect.height));
      canvas.width = targetW;
      canvas.height = targetH;
      paintMetallicPinkFoil(canvas);
    };

    initFoil();
  }, [recoatVersion]);

  const checkClearedProgress = useCallback(() => {
    if (hasRevealedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const clearedRatio = calculateClearedRatio(imgData, 16);
    if (shouldAutoRevealScratch(clearedRatio)) {
      hasRevealedRef.current = true;
      isScratchingRef.current = false;
      const rect = canvas.getBoundingClientRect();
      onReveal(coupon.id, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [coupon.id, onReveal]);

  const erasePoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealedRef.current) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    const brushRadius = 26;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 6;

    const prev = lastPointRef.current;
    if (prev) {
      const dist = Math.hypot(x - prev.x, y - prev.y);
      const steps = Math.max(1, Math.ceil(dist / 8));
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
    if (now - lastCheckAtRef.current > 110) {
      lastCheckAtRef.current = now;
      checkClearedProgress();
    }
  }, [checkClearedProgress]);

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
      ? coupon.isTroll
        ? 'animate-scanner-glitch'
        : 'animate-pop-in'
      : '';

  return (
    <div
      key={`${coupon.id}-${animVersion}`}
      ref={cardRef}
      data-testid={`scratch-card-${coupon.id}`}
      data-revealed={String(revealed)}
      className={`relative flex min-h-[258px] flex-col justify-between overflow-hidden rounded-3xl border-2 border-[#EAB5D5] bg-gradient-to-br ${coupon.cardBgClass} p-6 text-center shadow-[0_18px_42px_-24px_rgba(59,21,53,0.24)] ${revealAnimClass}`}
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

      {/* Subtle coupon notch cutouts */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full border-r-2 border-[#EAB5D5] bg-[#FFF8FB]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full border-l-2 border-[#EAB5D5] bg-[#FFF8FB]"
      />

      {/* Revealed coupon content under the metallic foil */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFFDF8]/90 shadow-xs">
          <CouponDoodleIcon id={coupon.id} />
        </div>

        <div>
          <h3 className="font-display text-xl font-bold leading-snug text-[#3B1535]">
            {coupon.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[#5E2E57]">
            {coupon.subtitle}
          </p>
        </div>

        {coupon.badgeText && (
          <span
            className={`mt-1 inline-flex items-center justify-center rounded-full border px-3.5 py-1 text-xs font-extrabold tracking-wide shadow-2xs ${coupon.badgeClass}`}
          >
            {coupon.badgeText}
          </span>
        )}

        {coupon.isTroll && (
          <p className="mt-1 text-[11px] font-semibold text-[#8C4D7F]">
            Expired on 02 Dec 2009
          </p>
        )}
      </div>

      {/* Card 3 Troll Overlay: bold slightly tilted dark-berry EXPIRED stamp */}
      {coupon.isTroll && (
        <div
          aria-label="EXPIRED — Expired on 02 Dec 2009"
          className="pointer-events-none absolute top-4 right-3 z-10 rotate-[12deg] rounded-xl border-2 border-[#FFE4F0]/80 bg-[#3B1535] px-3 py-1.5 text-center shadow-[0_10px_24px_-6px_rgba(59,21,53,0.55)]"
        >
          <span className="block text-xs font-black tracking-wider text-[#FFE898]">
            EXPIRED ❌
          </span>
          <span className="block text-[9px] font-medium text-[#FFE4F0]">
            02 Dec 2009
          </span>
        </div>
      )}

      {/* HTML5 Canvas Metallic Pink Foil Overlay — touch-action:none & user-select:none strictly on canvas */}
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
    rant: false,
    treat: false,
    troll: false,
  });
  const [recoatVersion, setRecoatVersion] = useState(0);

  const handleCardReveal = useCallback(
    (id: CouponSpec['id'], originX: number, originY: number) => {
      setRevealedMap((prev) => {
        if (prev[id]) return prev;
        return { ...prev, [id]: true };
      });
      onCardRevealConfetti(originX, originY);
    },
    [onCardRevealConfetti],
  );

  const handleRecoatAll = () => {
    setRevealedMap({ rant: false, treat: false, troll: false });
    setRecoatVersion((v) => v + 1);
  };

  const handleRevealAll = () => {
    setRevealedMap({ rant: true, treat: true, troll: true });
    onCardRevealConfetti(window.innerWidth * 0.5, window.innerHeight * 0.45);
  };

  const allRevealed = revealedMap.rant && revealedMap.treat && revealedMap.troll;

  return (
    <section
      id="scratch-cards"
      className="relative z-20 scroll-mt-16 bg-gradient-to-b from-[#FFFDF8] via-[#FFE4F0]/55 to-[#FFFDF8] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-[#C2377E]">
            Morgan&rsquo;s Birthday Scratch Cards 🎟️✨
          </p>
          <h2 className="font-display mt-1.5 text-balance text-3xl font-semibold tracking-tight text-[#3B1535] sm:text-4xl lg:text-5xl">
            Birthday Scratch-Off Coupons ✨
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-base text-[#5E2E57]">
            Rub the metallic pink foil with your finger to unlock your perks, bachawww!
          </p>
        </div>

        {/* 3 Scratch-Off Coupons: generously spaced stack on mobile, 3-column grid on desktop */}
        <div
          data-testid="scratch-cards-grid"
          className="mt-9 grid grid-cols-1 gap-7 md:grid-cols-3 md:gap-6"
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
