import {
  startKissAudio,
  stopKissAudio,
  unlockKissAudioContext,
} from './kissAudioSingleton';
import { soundEngine } from '../../utils/soundEngine';

/**
 * Self-contained, crash-proof audio controller for The Origin Story Play.
 *
 * - Delegates Scene 5's kissing soundtrack directly to the pre-decoded Web Audio PCM
 *   engine (`kissAudioSingleton.ts`) for < 5ms synchronous start latency, silence-trimmed
 *   alignment, hardware audio-thread gain envelopes, and click-free 55ms stop on exit.
 * - Retains all procedural Web Audio storybook SFX cues (morning pop, month flip tick,
 *   arrival bell, padlock slam, comic bonk, finale sparkle, year tick).
 */
export class OriginStoryAudioController {
  private muted = false;
  private disposed = false;

  private audioCtx: AudioContext | null = null;
  private kissPlaying = false;
  private activeSessionKey: string | null = null;

  private ensureAudioContext(): AudioContext | null {
    if (this.disposed) return null;
    try {
      const ctx = soundEngine.getAudioContext();
      if (!ctx) return null;
      this.audioCtx = ctx;
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {
          // Ignore autoplay restriction silently
        });
      }
      return ctx;
    } catch {
      return null;
    }
  }

  public setMuted(nextMuted: boolean): void {
    this.muted = Boolean(nextMuted);
    if (this.muted) {
      this.fadeOutKissCue();
      return;
    }
    unlockKissAudioContext();
  }

  public startKissCue(options?: {
    restart?: boolean;
    sessionKey?: string;
    onEnded?: () => void;
  }): void {
    if (this.disposed || this.muted) return;
    if (
      !options?.restart &&
      options?.sessionKey &&
      this.activeSessionKey === options.sessionKey &&
      this.kissPlaying
    ) {
      return;
    }
    if (this.kissPlaying && !options?.restart) return;

    const sessionKey = options?.sessionKey ?? null;
    this.activeSessionKey = sessionKey;
    this.kissPlaying = true;

    const started = startKissAudio({
      muted: this.muted,
      onEnded: () => {
        if (this.activeSessionKey === sessionKey) {
          this.kissPlaying = false;
          this.activeSessionKey = null;
        }
        if (!this.disposed) {
          options?.onEnded?.();
        }
      },
    });

    if (!started) {
      this.kissPlaying = false;
      this.activeSessionKey = null;
    }
  }

  public fadeOutKissCue(_durationMs?: number): void {
    this.kissPlaying = false;
    this.activeSessionKey = null;
    stopKissAudio(false);
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
      // Warm celebratory Cmaj7 harp/bell arpeggio (C5 -> E5 -> G5 -> B5 -> C6 -> E6)
      const chord = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5];
      chord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.055;
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.07, t + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.92);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.96);
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

  public fadeOutAllAndStop(durationMs?: number): void {
    this.fadeOutKissCue(durationMs);
  }

  public dispose(): void {
    this.disposed = true;
    this.kissPlaying = false;
    this.activeSessionKey = null;
    stopKissAudio(true);

    // Shared SFX AudioContext is owned by soundEngine; detach local reference only
    this.audioCtx = null;
  }
}
