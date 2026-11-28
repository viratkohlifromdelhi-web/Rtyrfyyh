/**
 * Lightweight, zero-dependency detection helpers for mobile in-app browsers
 * (Instagram, Facebook FBAN/FBAV, WhatsApp, LINE, and embedded Android/iOS WebViews).
 */

export type DetectedInAppBrowser =
  | 'Instagram'
  | 'Facebook'
  | 'WhatsApp'
  | 'LINE'
  | 'WebView'
  | null;

function readUserAgent(explicitUa?: string): string {
  if (typeof explicitUa === 'string') return explicitUa;
  if (typeof navigator === 'undefined' || typeof navigator.userAgent !== 'string') {
    return '';
  }
  return navigator.userAgent;
}

/**
 * Returns the detected embedded in-app browser name, or `null` for standard standalone browsers.
 */
export function detectInAppBrowserName(explicitUa?: string): DetectedInAppBrowser {
  const ua = readUserAgent(explicitUa);
  if (!ua) return null;

  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'Facebook';
  if (/\bLine\//i.test(ua)) return 'LINE';

  // Android embedded WebView marker (`; wv)` or `Version/X.Y Chrome/...`)
  if (/;\s*wv\)/i.test(ua)) return 'WebView';

  // iOS WKWebView: AppleWebKit on iPhone/iPad/iPod WITHOUT standard Safari/CriOS/FxiOS/EdgiOS tokens
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const hasWebKit = /AppleWebKit/i.test(ua);
  const isStandardIOSBrowser = /Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  if (isIOS && hasWebKit && !isStandardIOSBrowser) {
    return 'WebView';
  }

  return null;
}

/**
 * Returns true when running inside Instagram, Facebook, WhatsApp, LINE, or an embedded WebView
 * where microphone permissions, direct blob downloads, or fullscreen video playback are restricted.
 */
export function isInAppBrowser(explicitUa?: string): boolean {
  return detectInAppBrowserName(explicitUa) !== null;
}

/**
 * Returns true if the current browser runtime exposes Web Audio + getUserMedia mic APIs.
 */
export function supportsMicrophoneBlow(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const hasMedia = Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function',
  );
  const hasAudioCtx = Boolean(
    window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext,
  );
  return hasMedia && hasAudioCtx;
}
