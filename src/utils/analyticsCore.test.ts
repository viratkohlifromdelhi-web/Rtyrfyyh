import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDashboardSummary,
  computeScrollPercent,
  detectInAppBrowser,
  evaluateOwnerPin,
  formatDuration,
  formatElapsedOffset,
  formatISTDateTime,
  formatISTTime,
  isAuthorizedOwnerEmail,
  isInsightsQuery,
  parseUserAgentSpecs,
  sanitizeEventDetails,
  sanitizeEventType,
  sanitizeFiniteNumber,
  type SiteVisitRecord,
} from './analyticsCore';

test('isInsightsQuery and evaluateOwnerPin gate dashboard strictly to ?insights=9876 and PIN 9876', () => {
  assert.equal(isInsightsQuery('?insights=9876'), true);
  assert.equal(isInsightsQuery('?autostart=1&insights=9876'), true);
  assert.equal(isInsightsQuery('?insights=1845'), false);
  assert.equal(isInsightsQuery(''), false);

  assert.equal(evaluateOwnerPin('9876'), true);
  assert.equal(evaluateOwnerPin(' 9876 '), true);
  assert.equal(evaluateOwnerPin('1845'), false);
  assert.equal(evaluateOwnerPin(''), false);

  assert.equal(isAuthorizedOwnerEmail('sksandhya585@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('SKSANDHYA585@GMAIL.COM'), true);
  assert.equal(isAuthorizedOwnerEmail('viratkohlifromdelhi@gmail.com'), true);
  assert.equal(isAuthorizedOwnerEmail('random@example.com'), false);
  assert.equal(isAuthorizedOwnerEmail(null), false);
});

test('detectInAppBrowser identifies WhatsApp, Instagram, Snapchat, Telegram, Facebook, and standard browsers', () => {
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 WhatsApp/2.24', ''),
    'WhatsApp',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) Instagram 320.0.0', ''),
    'Instagram',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/126.0', 'https://l.instagram.com/'),
    'Instagram',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (iPhone) Snapchat/12.80', ''),
    'Snapchat',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (Linux; Android 14) Chrome/126.0', 'https://t.me/share'),
    'Telegram',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]', ''),
    'Facebook',
  );
  assert.equal(
    detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5) Version/17.5 Mobile Safari/604.1', ''),
    'Safari',
  );
});

test('parseUserAgentSpecs prioritizes high-entropy Android model and parses iOS fallback cleanly', () => {
  const androidSpecs = parseUserAgentSpecs(
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36',
    '',
    { model: 'SM-S918B', platform: 'Android', platformVersion: '14.0.0' },
  );
  assert.equal(androidSpecs.deviceName, 'SM-S918B');
  assert.equal(androidSpecs.deviceType, 'Mobile');
  assert.equal(androidSpecs.osName, 'Android');
  assert.equal(androidSpecs.osVersion, '14.0.0');
  assert.equal(androidSpecs.browserName, 'Chrome 128');

  const iosSpecs = parseUserAgentSpecs(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
    '',
    null,
  );
  assert.equal(iosSpecs.deviceName, 'Apple iPhone');
  assert.equal(iosSpecs.deviceType, 'Mobile');
  assert.equal(iosSpecs.osName, 'iOS');
  assert.equal(iosSpecs.osVersion, '17.6.1');
  assert.equal(iosSpecs.inAppBrowser, 'Safari');
});

test('duration, elapsed offset, IST timestamps, and scroll percentage format accurately', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(45), '45s');
  assert.equal(formatDuration(222), '3m 42s');
  assert.equal(formatDuration(3665), '1h 01m 05s');

  assert.equal(formatElapsedOffset(0), '+00:00');
  assert.equal(formatElapsedOffset(125), '+02:05');

  const sampleMs = Date.UTC(2026, 11, 2, 18, 30, 0); // 03 Dec 2026 12:00:00 AM IST
  const istFull = formatISTDateTime(sampleMs);
  assert.ok(istFull.includes('03') && istFull.includes('2026'));
  assert.ok(formatISTTime(sampleMs).includes('12:00:00'));

  assert.equal(computeScrollPercent(0, 800, 4800), 0);
  assert.equal(computeScrollPercent(1000, 800, 4800), 25);
  assert.equal(computeScrollPercent(4000, 800, 4800), 100);
  assert.equal(computeScrollPercent(9999, 800, 4800), 100);
});

test('sanitizers enforce Firestore security-rule boundaries and strip Infinity/NaN', () => {
  assert.equal(sanitizeFiniteNumber(Infinity, 0, 10000), null);
  assert.equal(sanitizeFiniteNumber(Number.NaN, 0, 10000), null);
  assert.equal(sanitizeFiniteNumber(45, 0, 10000), 45);

  assert.equal(sanitizeEventType('Vault Stone Picked!!'), 'vault_stone_picked');
  assert.equal(sanitizeEventType('x'), 'custom_event');

  const safeDetails = sanitizeEventDetails({
    stoneName: 'Reality Stone',
    rewardValue: '₹250',
    badNum: Infinity,
    okNum: 99,
    flag: true,
    longStr: 'a'.repeat(500),
  });
  assert.equal(safeDetails.stoneName, 'Reality Stone');
  assert.equal('badNum' in safeDetails, false);
  assert.equal(safeDetails.okNum, 99);
  assert.equal(safeDetails.flag, true);
  assert.equal((safeDetails.longStr as string).length, 240);
});

test('computeDashboardSummary aggregates total visits, unique devices, and total interactions', () => {
  const mk = (visitorId: string, totalInteractions: number): SiteVisitRecord =>
    ({
      visitorId,
      totalInteractions,
    }) as SiteVisitRecord;

  const summary = computeDashboardSummary([mk('v1', 8), mk('v1', 4), mk('v2', 11)]);
  assert.deepEqual(summary, {
    totalVisits: 3,
    uniqueDevices: 2,
    totalInteractions: 23,
  });
});
