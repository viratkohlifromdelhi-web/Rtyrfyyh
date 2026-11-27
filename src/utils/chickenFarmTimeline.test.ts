import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHICKEN_FARM_CAPTIONS,
  CHICKEN_FARM_PUNCHLINE_PARTS,
  CHICKEN_FARM_SCHEDULE,
  CHICKEN_FARM_SHELL_CRACK_AT_MS,
  getChickenFarmCaption,
  resolveChickenFarmStage,
} from './chickenFarmTimeline';

test('CHICKEN_FARM_SCHEDULE follows exact 6-stage comedic timings from 0ms to 5200ms', () => {
  assert.deepEqual(
    CHICKEN_FARM_SCHEDULE.map((s) => [s.stage, s.atMs]),
    [
      ['approach', 0],
      ['pause', 1100],
      ['kiss', 1800],
      ['pregnant', 2900],
      ['hatch', 4100],
      ['finale', 5200],
    ],
  );
  assert.ok(CHICKEN_FARM_SHELL_CRACK_AT_MS > 4100 && CHICKEN_FARM_SHELL_CRACK_AT_MS < 5200);
});

test('resolveChickenFarmStage maps elapsed timestamps to the exact comic stage and respects reduced motion', () => {
  assert.equal(resolveChickenFarmStage(-10), 'idle');
  assert.equal(resolveChickenFarmStage(0), 'approach');
  assert.equal(resolveChickenFarmStage(1099), 'approach');
  assert.equal(resolveChickenFarmStage(1100), 'pause');
  assert.equal(resolveChickenFarmStage(1800), 'kiss');
  assert.equal(resolveChickenFarmStage(2900), 'pregnant');
  assert.equal(resolveChickenFarmStage(4100), 'hatch');
  assert.equal(resolveChickenFarmStage(5200), 'finale');
  assert.equal(resolveChickenFarmStage(8000), 'finale');

  // Reduced motion always resolves directly to the complete smiling family finale
  assert.equal(resolveChickenFarmStage(0, true), 'finale');
  assert.equal(resolveChickenFarmStage(1800, true), 'finale');
});

test('all captions and punchline text contain strictly zero visible dashes', () => {
  const dashPattern = /[-\u2013\u2014]/;
  for (const [stage, caption] of Object.entries(CHICKEN_FARM_CAPTIONS)) {
    assert.ok(caption.length > 0, `caption for ${stage} should be non-empty`);
    assert.equal(
      dashPattern.test(caption),
      false,
      `caption "${caption}" must not contain visible dashes`,
    );
  }

  const fullPunchline = `${CHICKEN_FARM_PUNCHLINE_PARTS.prefix}${CHICKEN_FARM_PUNCHLINE_PARTS.heroName}${CHICKEN_FARM_PUNCHLINE_PARTS.suffix}`;
  assert.equal(dashPattern.test(fullPunchline), false);
  assert.equal(
    getChickenFarmCaption('finale'),
    'Official canon lore unlocked.',
  );
});
