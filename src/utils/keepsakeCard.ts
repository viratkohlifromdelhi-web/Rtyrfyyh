/**
 * Deterministic 1080 × 1920 (9:16 Instagram Story) Postage-Stamp Birthday Keepsake Poster
 * offscreen canvas renderer faithfully adapted from the vintage forest-pine & cream-ivory
 * birthday postage stamp design.
 */

export const KEEPSAKE_WIDTH = 1080;
export const KEEPSAKE_HEIGHT = 1920;
export const KEEPSAKE_FILENAME = 'keepsake-morgan-17th-dec03.png';

export const KEEPSAKE_COLORS = {
  outerPine: '#253624',
  outerPineDeep: '#1E2D1D',
  stampCream: '#F5EFE0',
  stampCreamWarm: '#EFE7D4',
  inkForest: '#233322',
  inkSoft: 'rgba(35, 51, 34, 0.72)',
  inkHairline: 'rgba(35, 51, 34, 0.30)',
  inkHairlineInner: 'rgba(35, 51, 34, 0.16)',
} as const;

export const KEEPSAKE_COPY = {
  topLine: 'HELLLLWWWW BACHHAWWW',
  heroLine1: "Morgan's",
  heroLine2: 'Birthday is here.',
  month: 'DECEMBER',
  weekday: 'THURSDAY',
  dayNumber: '03',
  nickname: 'BAUNI',
  punchline1: 'REMEBER ONE THING,',
  punchline2: 'BAUNI HI BHAGWAAN HAI !!',
  keepsakeFooter: '17TH EDITION · VAULT PASS ₹250 · CREATED BY ADINOMIDE',
} as const;

export interface StampBoxGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  scallopRadius: number;
  topBottomCount: number;
  leftRightCount: number;
}

export function getStampBoxGeometry(
  width = KEEPSAKE_WIDTH,
  height = KEEPSAKE_HEIGHT,
): StampBoxGeometry {
  const marginX = 68;
  const marginY = 76;
  return {
    x: marginX,
    y: marginY,
    width: width - marginX * 2,
    height: height - marginY * 2,
    scallopRadius: 15,
    topBottomCount: 24,
    leftRightCount: 44,
  };
}

export interface ScallopNotch {
  cx: number;
  cy: number;
  radius: number;
}

/**
 * Generates evenly distributed semicircular postage-stamp perforation notch centers
 * around all 4 edges of the stamp rectangle so corners remain crisp and symmetrical.
 */
export function buildStampNotches(geom: StampBoxGeometry): ScallopNotch[] {
  const notches: ScallopNotch[] = [];
  const { x, y, width, height, scallopRadius, topBottomCount, leftRightCount } = geom;

  const hStep = width / topBottomCount;
  for (let i = 0; i < topBottomCount; i++) {
    const cx = x + hStep * (i + 0.5);
    notches.push({ cx, cy: y, radius: scallopRadius });
    notches.push({ cx, cy: y + height, radius: scallopRadius });
  }

  const vStep = height / leftRightCount;
  for (let j = 0; j < leftRightCount; j++) {
    const cy = y + vStep * (j + 0.5);
    notches.push({ cx: x, cy, radius: scallopRadius });
    notches.push({ cx: x + width, cy, radius: scallopRadius });
  }

  return notches;
}

/**
 * Minimal subset of CanvasRenderingContext2D used by the renderer
 * (allows deterministic unit testing in Node as well as full browser rendering).
 */
export interface Keepsake2DContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  globalAlpha: number;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  scale(x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void;
  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean,
  ): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  measureText(text: string): { width: number };
}

/**
 * Draws centered text with crisp manual character tracking across all browsers
 * (avoids inconsistent CanvasRenderingContext2D.letterSpacing support on iOS/Safari).
 */
function drawTrackedTextCentered(
  ctx: Keepsake2DContext,
  text: string,
  centerX: number,
  y: number,
  trackingPx: number,
): void {
  const chars = Array.from(text);
  if (chars.length === 0) return;

  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((sum, w) => sum + w, 0) + Math.max(0, chars.length - 1) * trackingPx;

  let cursorX = centerX - totalWidth / 2;
  ctx.save();
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX, y);
    cursorX += widths[i] + trackingPx;
  }
  ctx.restore();
}

/**
 * Draws a crisp 4-point vintage editorial sparkle star in deep forest ink.
 */
function drawFourPointStar(
  ctx: Keepsake2DContext,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  filled = true,
): void {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Traces the scalloped postage-stamp cream paper silhouette by building a continuous
 * clockwise contour with smooth inward-biting semicircular stamp perforations along every edge.
 */
function traceScallopedStampPath(ctx: Keepsake2DContext, geom: StampBoxGeometry): void {
  const { x, y, width, height, scallopRadius, topBottomCount, leftRightCount } = geom;
  const r = scallopRadius;
  const hStep = width / topBottomCount;
  const vStep = height / leftRightCount;

  ctx.beginPath();
  ctx.moveTo(x + hStep * 0.5 - r, y);

  // Top edge (left -> right): inward semicircular bites curving downward (+Y)
  for (let i = 0; i < topBottomCount; i++) {
    const cx = x + hStep * (i + 0.5);
    ctx.lineTo(cx - r, y);
    ctx.arc(cx, y, r, Math.PI, 0, true);
  }
  // Smooth top-right stamp corner (no stray sharp horn)
  ctx.quadraticCurveTo(x + width - 3, y + 3, x + width, y + vStep * 0.5 - r);

  // Right edge (top -> bottom): inward semicircular bites curving leftward (-X)
  for (let j = 0; j < leftRightCount; j++) {
    const cy = y + vStep * (j + 0.5);
    ctx.lineTo(x + width, cy - r);
    ctx.arc(x + width, cy, r, -Math.PI / 2, Math.PI / 2, true);
  }
  // Smooth bottom-right stamp corner
  ctx.quadraticCurveTo(x + width - 3, y + height - 3, x + width - (hStep * 0.5 - r), y + height);

  // Bottom edge (right -> left): inward semicircular bites curving upward (-Y)
  for (let i = topBottomCount - 1; i >= 0; i--) {
    const cx = x + hStep * (i + 0.5);
    ctx.lineTo(cx + r, y + height);
    ctx.arc(cx, y + height, r, 0, Math.PI, true);
  }
  // Smooth bottom-left stamp corner
  ctx.quadraticCurveTo(x + 3, y + height - 3, x, y + height - (vStep * 0.5 - r));

  // Left edge (bottom -> top): inward semicircular bites curving rightward (+X)
  for (let j = leftRightCount - 1; j >= 0; j--) {
    const cy = y + vStep * (j + 0.5);
    ctx.lineTo(x, cy + r);
    ctx.arc(x, cy, r, Math.PI / 2, -Math.PI / 2, true);
  }
  // Smooth top-left stamp corner
  ctx.quadraticCurveTo(x + 3, y + 3, x + hStep * 0.5 - r, y);
  ctx.closePath();
}

/**
 * Draws subtle deterministic vintage letterpress paper grain dots on the canvas.
 */
function drawSubtlePaperGrain(
  ctx: Keepsake2DContext,
  x: number,
  y: number,
  w: number,
  h: number,
  dotCount: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  let seed = 171203;
  for (let i = 0; i < dotCount; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const rx = (seed & 0xffff) / 0xffff;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const ry = (seed & 0xffff) / 0xffff;
    const px = x + rx * w;
    const py = y + ry * h;
    const size = (i % 3 === 0 ? 2.2 : 1.3);
    ctx.fillRect(px, py, size, size);
  }
  ctx.restore();
}

/**
 * Draws the centerpiece forest-ink line-art tiered birthday cake with scalloped drips,
 * decorative frosting dots, pedestal stand, and 5 lit striped candles with twinkling flames.
 */
function drawLineArtBirthdayCake(ctx: Keepsake2DContext, centerX: number, baseY: number): void {
  ctx.save();
  ctx.strokeStyle = KEEPSAKE_COLORS.inkForest;
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // --- 1. Vintage Cake Pedestal & Scalloped Platter ---
  const plateY = baseY - 46;
  ctx.lineWidth = 4.2;

  // Pedestal foot base
  ctx.beginPath();
  ctx.ellipse(centerX, baseY, 76, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.fill();
  ctx.stroke();

  // Pedestal stem
  ctx.beginPath();
  ctx.moveTo(centerX - 30, plateY + 14);
  ctx.quadraticCurveTo(centerX - 18, baseY - 22, centerX - 52, baseY - 4);
  ctx.moveTo(centerX + 30, plateY + 14);
  ctx.quadraticCurveTo(centerX + 18, baseY - 22, centerX + 52, baseY - 4);
  ctx.stroke();

  // Platter dish oval
  ctx.beginPath();
  ctx.ellipse(centerX, plateY, 174, 24, 0, 0, Math.PI * 2);
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.fill();
  ctx.stroke();

  // Subtle decorative inner platter rim
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(centerX, plateY, 156, 17, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  ctx.stroke();

  // --- 2. Lower Cake Tier ---
  const lowerW = 264;
  const lowerH = 114;
  const lowerTopY = plateY - lowerH - 4;
  const lowerLeft = centerX - lowerW / 2;
  const lowerRight = centerX + lowerW / 2;

  ctx.lineWidth = 4.4;
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.beginPath();
  ctx.moveTo(lowerLeft, lowerTopY);
  ctx.lineTo(lowerLeft, plateY - 6);
  ctx.quadraticCurveTo(centerX, plateY + 14, lowerRight, plateY - 6);
  ctx.lineTo(lowerRight, lowerTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower tier top oval rim
  ctx.beginPath();
  ctx.ellipse(centerX, lowerTopY, lowerW / 2, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lower tier scalloped buttercream frosting drips
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  const lowerDrips = 7;
  const lowerDripStep = lowerW / lowerDrips;
  ctx.moveTo(lowerLeft, lowerTopY + 8);
  for (let i = 0; i < lowerDrips; i++) {
    const sx = lowerLeft + i * lowerDripStep;
    const ex = sx + lowerDripStep;
    const midX = (sx + ex) / 2;
    const depth = i % 2 === 0 ? 38 : 26;
    ctx.quadraticCurveTo(midX, lowerTopY + depth + 16, ex, lowerTopY + 12);
  }
  ctx.stroke();

  // Delicate garland dots & swags along lower tier middle
  ctx.lineWidth = 2.4;
  const swagCount = 4;
  const swagStep = lowerW / swagCount;
  for (let i = 0; i < swagCount; i++) {
    const sx = lowerLeft + i * swagStep;
    const ex = sx + swagStep;
    ctx.beginPath();
    ctx.moveTo(sx + 4, plateY - 40);
    ctx.quadraticCurveTo((sx + ex) / 2, plateY - 14, ex - 4, plateY - 40);
    ctx.stroke();

    ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
    ctx.beginPath();
    ctx.arc((sx + ex) / 2, plateY - 34, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 3. Upper Cake Tier ---
  const upperW = 186;
  const upperH = 96;
  const upperBottomY = lowerTopY - 2;
  const upperTopY = upperBottomY - upperH;
  const upperLeft = centerX - upperW / 2;
  const upperRight = centerX + upperW / 2;

  ctx.lineWidth = 4.4;
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.beginPath();
  ctx.moveTo(upperLeft, upperTopY);
  ctx.lineTo(upperLeft, upperBottomY);
  ctx.quadraticCurveTo(centerX, upperBottomY + 14, upperRight, upperBottomY);
  ctx.lineTo(upperRight, upperTopY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper tier top oval rim
  ctx.beginPath();
  ctx.ellipse(centerX, upperTopY, upperW / 2, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Upper tier wavy frosting drips
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  const upperDrips = 5;
  const upperDripStep = upperW / upperDrips;
  ctx.moveTo(upperLeft, upperTopY + 6);
  for (let i = 0; i < upperDrips; i++) {
    const sx = upperLeft + i * upperDripStep;
    const ex = sx + upperDripStep;
    const midX = (sx + ex) / 2;
    const depth = i % 2 === 1 ? 34 : 24;
    ctx.quadraticCurveTo(midX, upperTopY + depth + 14, ex, upperTopY + 9);
  }
  ctx.stroke();

  // Tiny piped pearl border at junction of upper & lower tier
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  for (let i = 0; i <= 8; i++) {
    const px = upperLeft + 6 + ((upperW - 12) * i) / 8;
    const curveDrop = Math.sin((i / 8) * Math.PI) * 6;
    ctx.beginPath();
    ctx.arc(px, upperBottomY + curveDrop + 1, 3.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- 4. Five Lit Striped Birthday Candles ---
  const candleSpecs = [
    { dx: -64, h: 66, tilt: -0.04 },
    { dx: -32, h: 78, tilt: -0.02 },
    { dx: 0, h: 88, tilt: 0 },
    { dx: 32, h: 78, tilt: 0.02 },
    { dx: 64, h: 66, tilt: 0.04 },
  ];

  candleSpecs.forEach((c) => {
    ctx.save();
    const cx = centerX + c.dx;
    const cy = upperTopY - 2;
    ctx.translate(cx, cy);
    ctx.rotate(c.tilt);

    // Candle body
    ctx.lineWidth = 3.4;
    ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
    ctx.strokeStyle = KEEPSAKE_COLORS.inkForest;
    ctx.beginPath();
    ctx.rect(-7.5, -c.h, 15, c.h);
    ctx.fill();
    ctx.stroke();

    // Diagonal vintage candle stripes
    ctx.lineWidth = 2.1;
    for (let sy = -c.h + 14; sy < -8; sy += 16) {
      ctx.beginPath();
      ctx.moveTo(-7, sy);
      ctx.lineTo(7, sy - 7);
      ctx.stroke();
    }

    // Wick
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(0, -c.h);
    ctx.lineTo(0, -c.h - 10);
    ctx.stroke();

    // Teardrop candle flame (filled outer + cream inner core for vintage engraving depth)
    const flameBaseY = -c.h - 11;
    ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
    ctx.beginPath();
    ctx.moveTo(0, flameBaseY - 30);
    ctx.bezierCurveTo(12, flameBaseY - 14, 11, flameBaseY - 1, 0, flameBaseY);
    ctx.bezierCurveTo(-11, flameBaseY - 1, -12, flameBaseY - 14, 0, flameBaseY - 30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
    ctx.beginPath();
    ctx.moveTo(0, flameBaseY - 16);
    ctx.bezierCurveTo(4.8, flameBaseY - 8, 4.4, flameBaseY - 2, 0, flameBaseY - 2);
    ctx.bezierCurveTo(-4.4, flameBaseY - 2, -4.8, flameBaseY - 8, 0, flameBaseY - 16);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  });

  // --- 5. Delicate Radiating Candle Crown Sparkles ---
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  drawFourPointStar(ctx, centerX, upperTopY - 156, 17, 5, true);
  drawFourPointStar(ctx, centerX - 110, upperTopY - 122, 13, 4, true);
  drawFourPointStar(ctx, centerX + 110, upperTopY - 122, 13, 4, true);
  drawFourPointStar(ctx, centerX - 154, upperTopY - 32, 10, 3.2, true);
  drawFourPointStar(ctx, centerX + 154, upperTopY - 32, 10, 3.2, true);

  ctx.restore();
}

/**
 * Draws one vintage forest-ink line-art party popper cone shooting curved confetti
 * ribbons, dots, and 4-point sparkles toward the center cake.
 * `side === 'left'` points up-right; `side === 'right'` mirrors symmetrically up-left.
 */
function drawPartyPopper(
  ctx: Keepsake2DContext,
  originX: number,
  originY: number,
  side: 'left' | 'right',
): void {
  const dir = side === 'left' ? 1 : -1;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.scale(dir, 1);

  ctx.strokeStyle = KEEPSAKE_COLORS.inkForest;
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Angled striped party popper cone
  ctx.save();
  ctx.rotate(-0.68); // tilted cleanly up-right toward the cake

  // Cone silhouette
  ctx.lineWidth = 4;
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.beginPath();
  ctx.moveTo(0, 74); // pointed tip
  ctx.lineTo(-36, -34);
  ctx.lineTo(36, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Diagonal party stripes across cone body
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -4);
  ctx.lineTo(29, -20);
  ctx.moveTo(-18, 22);
  ctx.lineTo(20, 10);
  ctx.moveTo(-9, 46);
  ctx.lineTo(11, 39);
  ctx.stroke();

  // Elliptical open mouth rim of the popper
  ctx.lineWidth = 4;
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  ctx.beginPath();
  ctx.ellipse(0, -34, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dark inner mouth depth ellipse
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.beginPath();
  ctx.ellipse(0, -34, 24, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // --- Curved Confetti Ribbons Bursting Outward & Upward ---
  ctx.lineWidth = 3.4;
  // High curly streamer ribbon
  ctx.beginPath();
  ctx.moveTo(22, -46);
  ctx.bezierCurveTo(36, -112, 86, -124, 72, -166);
  ctx.bezierCurveTo(60, -196, 108, -214, 134, -184);
  ctx.stroke();

  // Mid sweeping arc streamer
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(42, -32);
  ctx.bezierCurveTo(88, -76, 122, -62, 146, -104);
  ctx.bezierCurveTo(160, -128, 134, -142, 162, -152);
  ctx.stroke();

  // Lower playful squiggle streamer
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(48, -12);
  ctx.quadraticCurveTo(96, -24, 114, -52);
  ctx.quadraticCurveTo(126, -72, 154, -58);
  ctx.stroke();

  // Celebratory confetti flecks, rings, and 4-point star sparkles
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  drawFourPointStar(ctx, 52, -138, 12, 3.8, true);
  drawFourPointStar(ctx, 138, -142, 9.5, 3.2, true);
  drawFourPointStar(ctx, 118, -28, 8.5, 2.8, true);

  // Small confetti dots & tiny open rings
  const dots = [
    { x: 16, y: -112, r: 4.5, solid: true },
    { x: 96, y: -162, r: 5, solid: false },
    { x: 112, y: -96, r: 4, solid: true },
    { x: 76, y: -64, r: 4.8, solid: false },
    { x: 164, y: -112, r: 3.8, solid: true },
    { x: 34, y: -182, r: 3.5, solid: true },
  ];
  dots.forEach((d) => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    if (d.solid) {
      ctx.fill();
    } else {
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
  });

  // Little rotated diamond confetti shards
  const shards = [
    { x: 84, y: -118, angle: 0.45 },
    { x: 144, y: -74, angle: -0.5 },
    { x: 24, y: -146, angle: 0.8 },
  ];
  shards.forEach((s) => {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    ctx.fillRect(-6, -3, 12, 6);
    ctx.restore();
  });

  ctx.restore();
}

/**
 * Renders the complete 1080 × 1920 postage-stamp keepsake poster onto any 2D canvas context.
 */
export function renderKeepsakePosterToContext(
  ctx: Keepsake2DContext,
  width = KEEPSAKE_WIDTH,
  height = KEEPSAKE_HEIGHT,
): void {
  const centerX = width / 2;
  const geom = getStampBoxGeometry(width, height);

  // 1. Deep Forest-Pine Outer Frame (#253624)
  ctx.save();
  ctx.fillStyle = KEEPSAKE_COLORS.outerPine;
  ctx.fillRect(0, 0, width, height);
  drawSubtlePaperGrain(ctx, 0, 0, width, height, 420, '#F5EFE0', 0.032);
  ctx.restore();

  // 2. Scalloped Warm Cream-Ivory Postage Stamp Card (#F5EFE0) with subtle lift shadow
  ctx.save();
  ctx.shadowColor = 'rgba(10, 18, 10, 0.36)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = KEEPSAKE_COLORS.stampCream;
  traceScallopedStampPath(ctx, geom);
  ctx.fill();
  ctx.restore();

  // Soft warm paper speck texture inside the cream stamp
  drawSubtlePaperGrain(
    ctx,
    geom.x + 24,
    geom.y + 24,
    geom.width - 48,
    geom.height - 48,
    520,
    KEEPSAKE_COLORS.inkForest,
    0.026,
  );

  // 3. Subtle Double Hairline Inner Rule + Corner Tiny Stars
  const outerInset = 46;
  const innerInset = 58;
  ctx.save();
  ctx.strokeStyle = KEEPSAKE_COLORS.inkHairline;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    geom.x + outerInset,
    geom.y + outerInset,
    geom.width - outerInset * 2,
    geom.height - outerInset * 2,
  );

  ctx.strokeStyle = KEEPSAKE_COLORS.inkHairlineInner;
  ctx.lineWidth = 1.25;
  ctx.strokeRect(
    geom.x + innerInset,
    geom.y + innerInset,
    geom.width - innerInset * 2,
    geom.height - innerInset * 2,
  );

  // Tiny understated 4-point corner stars nestled inside the inner frame corners
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.globalAlpha = 0.45;
  const starOffset = innerInset + 22;
  drawFourPointStar(ctx, geom.x + starOffset, geom.y + starOffset, 7, 2.2, true);
  drawFourPointStar(ctx, geom.x + geom.width - starOffset, geom.y + starOffset, 7, 2.2, true);
  drawFourPointStar(ctx, geom.x + starOffset, geom.y + geom.height - starOffset, 7, 2.2, true);
  drawFourPointStar(
    ctx,
    geom.x + geom.width - starOffset,
    geom.y + geom.height - starOffset,
    7,
    2.2,
    true,
  );
  ctx.restore();

  // 4. Top Header Line: HELLLLWWWW BACHHAWWW
  ctx.save();
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.font = '600 32px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'middle';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.topLine, centerX, 248, 10);
  ctx.restore();

  // 5. Center Line-Art Birthday Cake & Flanking Confetti Poppers
  drawPartyPopper(ctx, 212, 704, 'left');
  drawPartyPopper(ctx, width - 212, 704, 'right');
  drawLineArtBirthdayCake(ctx, centerX, 836);

  // 6. Hero Script Title: "Morgan's" / "Birthday is here."
  ctx.save();
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'italic 600 124px "Fraunces", "Georgia", "Times New Roman", serif';
  ctx.fillText(KEEPSAKE_COPY.heroLine1, centerX, 976);

  ctx.font = 'italic 500 94px "Fraunces", "Georgia", "Times New Roman", serif';
  ctx.fillText(KEEPSAKE_COPY.heroLine2, centerX, 1088);
  ctx.restore();

  // Delicate center star ornament separating title & date block
  ctx.save();
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.globalAlpha = 0.7;
  drawFourPointStar(ctx, centerX, 1172, 9.5, 3, true);
  ctx.restore();

  // 7. Horizontal Rule Date Block: DECEMBER / THURSDAY | 03 | BAUNI
  const ruleLeft = 178;
  const ruleRight = width - 178;

  ctx.save();
  ctx.strokeStyle = KEEPSAKE_COLORS.inkForest;
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.textBaseline = 'middle';

  // Top horizontal divider rule
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(ruleLeft, 1208);
  ctx.lineTo(ruleRight, 1208);
  ctx.stroke();

  // Centered DECEMBER label (letter-spacing ~0.24em)
  ctx.font = '600 34px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.month, centerX, 1252, 8.5);

  // Upper middle-row rule
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(ruleLeft, 1296);
  ctx.lineTo(ruleRight, 1296);
  ctx.stroke();

  // Middle Row: THURSDAY | 03 | BAUNI
  const rowCenterY = 1372;
  ctx.font = '600 30px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.weekday, 300, rowCenterY, 6);
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.nickname, width - 300, rowCenterY, 6);

  // Vertical accent rules flanking 03
  ctx.save();
  ctx.strokeStyle = KEEPSAKE_COLORS.inkHairline;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(432, 1320);
  ctx.lineTo(432, 1424);
  ctx.moveTo(width - 432, 1320);
  ctx.lineTo(width - 432, 1424);
  ctx.stroke();
  ctx.restore();

  // Bold large 03 centerpiece
  ctx.textAlign = 'center';
  ctx.font = '700 112px "Fraunces", "Georgia", "Times New Roman", serif';
  ctx.fillText(KEEPSAKE_COPY.dayNumber, centerX, rowCenterY + 3);

  // Lower middle-row rule
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(ruleLeft, 1448);
  ctx.lineTo(ruleRight, 1448);
  ctx.stroke();
  ctx.restore();

  // 8. Bottom Punchline: REMEBER ONE THING, / BAUNI HI BHAGWAAN HAI !!
  ctx.save();
  ctx.fillStyle = KEEPSAKE_COLORS.inkForest;
  ctx.textBaseline = 'middle';

  ctx.font = '700 33px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.punchline1, centerX, 1538, 5.5);

  ctx.font = '700 42px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.punchline2, centerX, 1604, 4.2);
  ctx.restore();

  // 9. Tasteful Keepsake Edition Stamp Inside Lower Cream Margin
  ctx.save();
  ctx.strokeStyle = KEEPSAKE_COLORS.inkHairline;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(316, 1672);
  ctx.lineTo(width - 316, 1672);
  ctx.stroke();

  ctx.fillStyle = KEEPSAKE_COLORS.inkSoft;
  ctx.textBaseline = 'middle';
  ctx.font = '600 20px "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif';
  drawTrackedTextCentered(ctx, KEEPSAKE_COPY.keepsakeFooter, centerX, 1718, 3);
  ctx.restore();
}

export interface RenderedKeepsakePoster {
  dataUrl: string;
  blob: Blob | null;
  width: number;
  height: number;
}

/**
 * Waits briefly for document web fonts (Fraunces + Plus Jakarta Sans) with a hard timeout
 * so the canvas renderer never stalls if fonts are slow or offline.
 */
async function waitForFontsBriefly(timeoutMs = 450): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document) || !document.fonts?.ready) {
    return;
  }
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, timeoutMs);
      }),
    ]);
  } catch {
    // graceful fallback to system serif/sans
  }
}

/**
 * Renders the 1080 × 1920 postage-stamp keepsake poster onto an offscreen canvas
 * and returns both a PNG data URL (for instant modal preview) and a Blob (for download).
 */
export async function generateKeepsakePosterPng(): Promise<RenderedKeepsakePoster> {
  await waitForFontsBriefly();

  const canvas = document.createElement('canvas');
  canvas.width = KEEPSAKE_WIDTH;
  canvas.height = KEEPSAKE_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context for keepsake poster.');
  }

  renderKeepsakePosterToContext(ctx as unknown as Keepsake2DContext, KEEPSAKE_WIDTH, KEEPSAKE_HEIGHT);

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((result) => resolve(result), 'image/png');
    } catch {
      resolve(null);
    }
  });

  return {
    dataUrl,
    blob,
    width: KEEPSAKE_WIDTH,
    height: KEEPSAKE_HEIGHT,
  };
}

/**
 * Triggers a clean PNG download for the rendered keepsake poster.
 * Returns `'downloaded'` when the anchor download fires cleanly, or `'fallback'`
 * if the environment restricts direct blob downloads.
 */
export function triggerKeepsakePngDownload(
  rendered: Pick<RenderedKeepsakePoster, 'dataUrl' | 'blob'>,
  filename = KEEPSAKE_FILENAME,
): 'downloaded' | 'fallback' {
  if (typeof document === 'undefined') return 'fallback';

  let objectUrl: string | null = null;
  try {
    const href = rendered.blob ? (objectUrl = URL.createObjectURL(rendered.blob)) : rendered.dataUrl;
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (objectUrl) {
      const urlToRevoke = objectUrl;
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(urlToRevoke);
        } catch {
          // silent
        }
      }, 4000);
    }
    return 'downloaded';
  } catch {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // silent
      }
    }
    return 'fallback';
  }
}
