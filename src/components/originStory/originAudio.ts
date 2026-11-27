import { ORIGIN_AUDIO_CONFIG } from './originScript';

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext || win.webkitAudioContext || null;
}

/**
 * Self-contained, crash-proof audio controller for The Origin Story Play.
 *
 * - Attempts to load the 5-second Scene 5 MP3 (`ORIGIN_AUDIO_CONFIG.kissTrackSrc`)
 *   with graceful error handling.
 * - If the MP3 is available, ramps volume smoothly (0 -> 0.85 over 200ms,
 *   and 0.85 -> 0 over 350ms before pausing) via `requestAnimationFrame`.
 * - If the MP3 is missing (404) or blocked by autoplay policy, silently plays
 *   a dreamy 5-second warm pastel Web Audio synth pad/chime chord (gain <= 0.08)
 *   so timing and emotion stay polished with zero console errors.
 * - Provides subtle capped-gain (<= 0.10) Web Audio SFX for story milestones.
 * - Cleans up all timers, animation frames, `<audio>`, and Web Audio nodes on dispose.
 */
export class OriginStoryAudioController {
  private audioEl: HTMLAudioElement | null = null;
  private mp3Failed = false;
  private muted = false;
  private disposed = false;

  private audioCtx: AudioContext | null = null;
  private rampRafId: number | null = null;
  private activePadNodes: AudioNode[] = [];
  private activePadGain: GainNode | null = null;
  private kissPlaying = false;

  constructor() {
    this.prepareKissTrack();
  }

  private prepareKissTrack(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      this.mp3Failed = true;
      return;
    }

    try {
      const audio = new Audio(ORIGIN_AUDIO_CONFIG.kissTrackSrc);
      audio.preload = 'auto';
      audio.volume = 0;
      audio.loop = false;

      audio.addEventListener('canplaythrough', () => {
        if (!this.disposed) {
          this.mp3Failed = false;
        }
      });
      audio.addEventListener('loadeddata', () => {
        if (!this.disposed) {
          this.mp3Failed = false;
        }
      });
      audio.addEventListener('error', () => {
        this.mp3Failed = true;
      });

      this.audioEl = audio;
    } catch {
      this.mp3Failed = true;
      this.audioEl = null;
    }
  }

  private ensureAudioContext(): AudioContext | null {
    if (this.disposed) return null;
    try {
      if (!this.audioCtx) {
        const Ctor = getAudioContextCtor();
        if (!Ctor) return null;
        this.audioCtx = new Ctor();
      }
      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume().catch(() => {
          // Ignore autoplay restriction silently
        });
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  private cancelVolumeRamp(): void {
    if (this.rampRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rampRafId);
      this.rampRafId = null;
    }
  }

  private stopSynthPad(fadeOutSec = 0.15): void {
    const ctx = this.audioCtx;
    const padGain = this.activePadGain;
    const nodes = this.activePadNodes;
    this.activePadGain = null;
    this.activePadNodes = [];

    if (!ctx || !padGain) return;
    try {
      const now = ctx.currentTime;
      padGain.gain.cancelScheduledValues(now);
      padGain.gain.setValueAtTime(Math.max(0.0001, padGain.gain.value), now);
      padGain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.05, fadeOutSec));
      window.setTimeout(() => {
        for (const node of nodes) {
          try {
            if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
              (node as OscillatorNode).stop();
            }
            node.disconnect();
          } catch {
            // already stopped
          }
        }
      }, Math.ceil(fadeOutSec * 1000) + 60);
    } catch {
      // ignore teardown errors
    }
  }

  private rampElementVolume(
    targetVolume: number,
    durationMs: number,
    onDone?: () => void,
  ): void {
    this.cancelVolumeRamp();
    const el = this.audioEl;
    if (!el || typeof window === 'undefined') {
      onDone?.();
      return;
    }

    const startVol = el.volume;
    const startTs = performance.now();
    const safeDuration = Math.max(16, durationMs);

    const step = (now: number) => {
      if (this.disposed || !this.audioEl) {
        this.rampRafId = null;
        return;
      }
      const progress = Math.min(1, (now - startTs) / safeDuration);
      const eased = progress * (2 - progress);
      const nextVol = Math.max(0, Math.min(1, startVol + (targetVolume - startVol) * eased));
      try {
        this.audioEl.volume = this.muted ? 0 : nextVol;
      } catch {
        // ignore iOS read-only volume errors
      }
      if (progress < 1) {
        this.rampRafId = window.requestAnimationFrame(step);
      } else {
        this.rampRafId = null;
        onDone?.();
      }
    };

    this.rampRafId = window.requestAnimationFrame(step);
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = Boolean(nextMuted);
    if (this.audioEl) {
      try {
        this.audioEl.muted = this.muted;
        if (this.muted) {
          this.audioEl.volume = 0;
        } else if (this.kissPlaying && !this.audioEl.paused) {
          this.audioEl.volume = ORIGIN_AUDIO_CONFIG.maxVolume;
        }
      } catch {
        // silent fallback
      }
    }
    if (this.activePadGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.activePadGain.gain.cancelScheduledValues(now);
        this.activePadGain.gain.setTargetAtTime(this.muted ? 0.0001 : 0.075, now, 0.05);
      } catch {
        // silent fallback
      }
    }
  }

  public startKissCue(options?: { restart?: boolean }): void {
    if (this.disposed) return;
    if (this.kissPlaying && !options?.restart) return;

    this.cancelVolumeRamp();
    this.stopSynthPad(0.05);
    this.kissPlaying = true;
    if (this.muted) return;

    const el = this.audioEl;
    const canTryMp3 = Boolean(el && !this.mp3Failed);

    if (canTryMp3 && el) {
      try {
        el.currentTime = 0;
        el.volume = 0;
        el.muted = this.muted;
        const playPromise = el.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              if (!this.disposed && this.kissPlaying && !this.muted) {
                this.rampElementVolume(
                  ORIGIN_AUDIO_CONFIG.maxVolume,
                  ORIGIN_AUDIO_CONFIG.fadeInMs,
                );
              }
            })
            .catch(() => {
              if (!this.disposed && this.kissPlaying && !this.muted) {
                this.playDreamyKissFallbackPad();
              }
            });
        } else {
          this.rampElementVolume(
            ORIGIN_AUDIO_CONFIG.maxVolume,
            ORIGIN_AUDIO_CONFIG.fadeInMs,
          );
        }
        return;
      } catch {
        // Fall through to Web Audio dreamy synth pad
      }
    }

    this.playDreamyKissFallbackPad();
  }

  private playDreamyKissFallbackPad(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      this.stopSynthPad(0.05);
      const now = ctx.currentTime;
      const totalSec = ORIGIN_AUDIO_CONFIG.kissDurationMs / 1000;
      const fadeOutSec = ORIGIN_AUDIO_CONFIG.fadeOutMs / 1000;
      const holdUntilSec = Math.max(0.5, totalSec - fadeOutSec);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.linearRampToValueAtTime(0.075, now + 0.3);
      masterGain.gain.setValueAtTime(0.075, now + holdUntilSec);
      masterGain.gain.linearRampToValueAtTime(0.0001, now + totalSec);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1150, now);
      filter.Q.setValueAtTime(0.8, now);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Warm pastel Fmaj9 dreamy storybook pad chord across the full 5 seconds
      const freqs = [261.63, 329.63, 392.0, 493.88, 587.33];
      const created: AudioNode[] = [filter, masterGain];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((idx - 2) * 3.5, now);

        voiceGain.gain.setValueAtTime(idx < 3 ? 0.24 : 0.14, now);
        osc.connect(voiceGain);
        voiceGain.connect(filter);
        osc.start(now + idx * 0.04);
        osc.stop(now + totalSec + 0.1);
        created.push(osc, voiceGain);
      });

      // Gentle bell shimmer notes floating inside the 5-second pad
      const bellNotes = [783.99, 987.77, 1174.66, 1046.5];
      bellNotes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + 0.5 + i * 1.05;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1.0);
        created.push(osc, g);
      });

      this.activePadGain = masterGain;
      this.activePadNodes = created;
    } catch {
      // silent fallback
    }
  }

  public fadeOutKissCue(durationMs: number = ORIGIN_AUDIO_CONFIG.fadeOutMs): void {
    if (!this.kissPlaying) return;
    this.kissPlaying = false;

    this.stopSynthPad(durationMs / 1000);

    const el = this.audioEl;
    if (el && !el.paused) {
      this.rampElementVolume(0, durationMs, () => {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {
          // ignore
        }
      });
    } else {
      this.cancelVolumeRamp();
    }
  }

  public playMorningPop(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.08;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.065, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch {
      // silent
    }
  }

  public playMonthFlipTick(monthNumber: number): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 420 + monthNumber * 28;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, now + 0.045);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.052, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } catch {
      // silent
    }
  }

  public playArrivalBell(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.0, 1174.66];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.075;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.078, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.68);
      });
    } catch {
      // silent
    }
  }

  public playPadlockSlam(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Crisp comic lock-click + mini record-scratch downward blip
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(145, now + 0.13);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1350, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.085, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);

      // Metallic lock clack click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(980, now + 0.08);
      clickOsc.frequency.exponentialRampToValueAtTime(340, now + 0.14);
      clickGain.gain.setValueAtTime(0.0001, now + 0.08);
      clickGain.gain.linearRampToValueAtTime(0.08, now + 0.09);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now + 0.08);
      clickOsc.stop(now + 0.18);
    } catch {
      // silent
    }
  }

  public playComicBonk(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Playful pastel comic "ew_boing" spring bonk
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.07);
      osc.frequency.exponentialRampToValueAtTime(195, now + 0.24);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.092, now + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.27);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // silent
    }
  }

  public playFinaleSparkle(): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.055;
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.072, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } catch {
      // silent
    }
  }

  public playYearTick(age: number): void {
    if (this.disposed || this.muted) return;
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const stepOffset = Math.max(0, Math.min(17, age));
      const freq = 480 + stepOffset * 24;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, now + 0.05);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.056, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // silent
    }
  }

  public replayKissCue(): void {
    this.startKissCue({ restart: true });
  }

  public fadeOutAllAndStop(durationMs = 150): void {
    this.fadeOutKissCue(durationMs);
  }

  public dispose(): void {
    this.disposed = true;
    this.kissPlaying = false;
    this.cancelVolumeRamp();
    this.stopSynthPad(0.05);

    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      } catch {
        // ignore
      }
      this.audioEl = null;
    }

    if (this.audioCtx) {
      try {
        void this.audioCtx.close().catch(() => {
          // ignore
        });
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }
}
