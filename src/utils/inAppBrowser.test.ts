import assert from 'node:assert/strict';
import test from 'node:test';
import { detectInAppBrowserName, isInAppBrowser } from './inAppBrowser.ts';

test('detects Instagram, Facebook, WhatsApp, LINE, and WebView user agents', () => {
  assert.equal(
    detectInAppBrowserName(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 Instagram 338.0.0.34.90',
    ),
    'Instagram',
  );
  assert.equal(
    isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0]'),
    true,
  );
  assert.equal(
    detectInAppBrowserName('Mozilla/5.0 (Linux; Android 13) WhatsApp/2.24.16.76'),
    'WhatsApp',
  );
  assert.equal(
    detectInAppBrowserName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Line/14.5.0'),
    'LINE',
  );
  assert.equal(
    detectInAppBrowserName(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.0.0 Mobile Safari/537.36',
    ),
    'WebView',
  );
  assert.equal(
    detectInAppBrowserName(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    ),
    'WebView',
  );
});

test('returns false for standard Chrome and Safari mobile/desktop user agents', () => {
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.133 Mobile Safari/537.36',
    ),
    false,
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    ),
    false,
  );
  assert.equal(
    isInAppBrowser(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    ),
    false,
  );
});
