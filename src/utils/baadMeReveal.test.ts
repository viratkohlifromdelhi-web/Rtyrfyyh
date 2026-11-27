import assert from 'node:assert/strict';
import test from 'node:test';
import { triggerBaadMeMysteryReveal } from '../components/BaadMeRevealSection';
import {
  MODINO_EVENT_NAME,
  resetModinoBusCooldown,
  type ModinoEventDetail,
} from './modinoBus';

test('triggerBaadMeMysteryReveal fires haptic pulse, warm chime, Modino backstory event, and analytics in order', () => {
  const calls: string[] = [];

  triggerBaadMeMysteryReveal({
    triggerHaptic: () => calls.push('haptic'),
    playWarmChime: () => calls.push('warm_chime'),
    emitModinoBackstory: () => calls.push('modino:backstory'),
    recordReveal: () => calls.push('analytics'),
  });

  assert.deepEqual(calls, ['haptic', 'warm_chime', 'modino:backstory', 'analytics']);
});

test('triggerBaadMeMysteryReveal isolates failures so Modino backstory and chime still fire if haptics throw', () => {
  const calls: string[] = [];

  triggerBaadMeMysteryReveal({
    triggerHaptic: () => {
      throw new Error('vibration unsupported');
    },
    playWarmChime: () => calls.push('warm_chime'),
    emitModinoBackstory: () => calls.push('modino:backstory'),
    recordReveal: () => calls.push('analytics'),
  });

  assert.deepEqual(calls, ['warm_chime', 'modino:backstory', 'analytics']);
});

test('triggerBaadMeMysteryReveal default handler dispatches forced Modino backstory event', () => {
  resetModinoBusCooldown();
  const dispatched: ModinoEventDetail[] = [];

  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;

  class MockCustomEvent<T> {
    type: string;
    detail: T;
    constructor(type: string, init?: { detail: T }) {
      this.type = type;
      this.detail = init?.detail as T;
    }
  }

  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    writable: true,
    value: MockCustomEvent,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      dispatchEvent(evt: { type: string; detail: ModinoEventDetail }) {
        if (evt.type === MODINO_EVENT_NAME) {
          dispatched.push(evt.detail);
        }
        return true;
      },
    },
  });

  try {
    triggerBaadMeMysteryReveal({
      triggerHaptic: () => {},
      playWarmChime: () => {},
      recordReveal: () => {},
    });
  } finally {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: originalWindow,
    });
    Object.defineProperty(globalThis, 'CustomEvent', {
      configurable: true,
      writable: true,
      value: originalCustomEvent,
    });
    resetModinoBusCooldown();
  }

  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].category, 'backstory');
  assert.equal(dispatched[0].force, true);
  assert.equal(dispatched[0].source, 'baad-me-reveal');
});
