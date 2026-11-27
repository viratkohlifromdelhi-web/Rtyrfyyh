import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KEEPSAKE_COLORS,
  KEEPSAKE_COPY,
  KEEPSAKE_FILENAME,
  KEEPSAKE_HEIGHT,
  KEEPSAKE_WIDTH,
  buildStampNotches,
  getStampBoxGeometry,
  renderKeepsakePosterToContext,
  type Keepsake2DContext,
} from './keepsakeCard';

function createMockContext() {
  const drawnTexts: string[] = [];
  let arcCount = 0;
  let strokeCount = 0;
  let fillCount = 0;

  const ctx: Keepsake2DContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '16px sans-serif',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    scale() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    arc() {
      arcCount += 1;
    },
    ellipse() {},
    rect() {},
    fill() {
      fillCount += 1;
    },
    stroke() {
      strokeCount += 1;
    },
    fillRect() {},
    strokeRect() {},
    fillText(text: string) {
      drawnTexts.push(text);
    },
    measureText(text: string) {
      return { width: text.length * 14 };
    },
  };

  return {
    ctx,
    getCombinedText: () => drawnTexts.join(''),
    getStats: () => ({ arcCount, strokeCount, fillCount, textCalls: drawnTexts.length }),
  };
}

test('keepsake poster constants match 1080x1920 9:16 story specs, palette, and zero-dash copy', () => {
  assert.equal(KEEPSAKE_WIDTH, 1080);
  assert.equal(KEEPSAKE_HEIGHT, 1920);
  assert.equal(KEEPSAKE_FILENAME, 'keepsake-morgan-17th-dec03.png');
  assert.equal(KEEPSAKE_COLORS.outerPine, '#253624');
  assert.equal(KEEPSAKE_COLORS.stampCream, '#F5EFE0');
  assert.equal(KEEPSAKE_COLORS.inkForest, '#233322');

  for (const [key, value] of Object.entries(KEEPSAKE_COPY)) {
    assert.equal(
      /[—–-]/.test(value),
      false,
      `Keepsake copy key "${key}" must not contain visible dashes: ${value}`,
    );
  }
});

test('scalloped postage-stamp geometry stays strictly within 1080x1920 bounds with balanced edges', () => {
  const geom = getStampBoxGeometry();
  assert.ok(geom.x > 0 && geom.y > 0);
  assert.ok(geom.x + geom.width < KEEPSAKE_WIDTH);
  assert.ok(geom.y + geom.height < KEEPSAKE_HEIGHT);

  const notches = buildStampNotches(geom);
  assert.equal(notches.length, geom.topBottomCount * 2 + geom.leftRightCount * 2);
  for (const n of notches) {
    assert.ok(n.cx >= geom.x && n.cx <= geom.x + geom.width);
    assert.ok(n.cy >= geom.y && n.cy <= geom.y + geom.height);
  }
});

test('renderKeepsakePosterToContext draws all poster copy, scalloped stamp border, cake, and poppers', () => {
  const mock = createMockContext();
  renderKeepsakePosterToContext(mock.ctx);

  const combined = mock.getCombinedText();
  assert.ok(combined.includes(KEEPSAKE_COPY.topLine), 'missing top header line');
  assert.ok(combined.includes(KEEPSAKE_COPY.heroLine1), 'missing hero line 1');
  assert.ok(combined.includes(KEEPSAKE_COPY.heroLine2), 'missing hero line 2');
  assert.ok(combined.includes(KEEPSAKE_COPY.month), 'missing DECEMBER');
  assert.ok(combined.includes(KEEPSAKE_COPY.weekday), 'missing THURSDAY');
  assert.ok(combined.includes(KEEPSAKE_COPY.dayNumber), 'missing 03');
  assert.ok(combined.includes(KEEPSAKE_COPY.nickname), 'missing BAUNI');
  assert.ok(combined.includes(KEEPSAKE_COPY.punchline1), 'missing punchline line 1');
  assert.ok(combined.includes(KEEPSAKE_COPY.punchline2), 'missing punchline line 2');
  assert.ok(combined.includes(KEEPSAKE_COPY.keepsakeFooter), 'missing footer keepsake stamp');

  const stats = mock.getStats();
  assert.ok(stats.arcCount > 100, 'expected scalloped perimeter arcs + illustration arcs');
  assert.ok(stats.strokeCount > 30, 'expected line-art cake, popper, and rule strokes');
  assert.ok(stats.fillCount > 20, 'expected cream stamp, flames, sparkles, and fills');
});
