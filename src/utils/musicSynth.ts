/**
 * Dreamy rose-gold celesta / music-box synthesizer built on Web Audio API.
 * Plays a warm, cheerful birthday waltz melody with zero external audio files.
 */

interface MelodyNote {
  freq: number;
  beats: number;
  harmony?: number;
}

// Gentle music-box birthday motif in F major (warm, bright, non-fatiguing)
const BIRTHDAY_WALTZ: MelodyNote[] = [
  { freq: 392.0, beats: 0.75, harmony: 261.63 }, // G4
  { freq: 392.0, beats: 0.25 },                  // G4
  { freq: 440.0, beats: 1.0, harmony: 293.66 },  // A4
  { freq: 392.0, beats: 1.0, harmony: 261.63 },  // G4
  { freq: 523.25, beats: 1.0, harmony: 329.63 }, // C5
  { freq: 493.88, beats: 2.0, harmony: 392.0 },  // B4

  { freq: 392.0, beats: 0.75, harmony: 246.94 }, // G4
  { freq: 392.0, beats: 0.25 },                  // G4
  { freq: 440.0, beats: 1.0, harmony: 293.66 },  // A4
  { freq: 392.0, beats: 1.0, harmony: 246.94 },  // G4
  { freq: 587.33, beats: 1.0, harmony: 349.23 }, // D5
  { freq: 523.25, beats: 2.0, harmony: 329.63 }, // C5

  { freq: 392.0, beats: 0.75, harmony: 261.63 }, // G4
  { freq: 392.0, beats: 0.25 },                  // G4
  { freq: 783.99, beats: 1.0, harmony: 392.0 },  // G5
  { freq: 659.25, beats: 1.0, harmony: 329.63 }, // E5
  { freq: 523.25, beats: 1.0, harmony: 261.63 }, // C5
  { freq: 493.88, beats: 1.0, harmony: 293.66 }, // B4
  { freq: 440.0, beats: 1.5, harmony: 261.63 },  // A4

  { freq: 698.46, beats: 0.75, harmony: 349.23 }, // F5
  { freq: 698.46, beats: 0.25 },                  // F5
  { freq: 659.25, beats: 1.0, harmony: 329.63 },  // E5
  { freq: 523.25, beats: 1.0, harmony: 261.63 },  // C5
  { freq: 587.33, beats: 1.0, harmony: 293.66 },  // D5
  { freq: 523.25, beats: 2.5, harmony: 329.63 },  // C5
];

export class BirthdayMusicPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: number | null = null;
  private noteIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  private playChime(ctx: AudioContext, freq: number, durationSec: number, gainPeak: number): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const shimmerOsc = ctx.createOscillator();
    const gain = ctx.createGain();
    const shimmerGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Subtle octave bell overtone
    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(gainPeak * 0.16, now + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec * 0.65);

    osc.connect(gain);
    shimmerOsc.connect(shimmerGain);
    gain.connect(ctx.destination);
    shimmerGain.connect(ctx.destination);

    osc.start(now);
    shimmerOsc.start(now);
    osc.stop(now + durationSec + 0.05);
    shimmerOsc.stop(now + durationSec + 0.05);
  }

  private scheduleNext(): void {
    if (!this.isPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const note = BIRTHDAY_WALTZ[this.noteIndex % BIRTHDAY_WALTZ.length];
    this.noteIndex = (this.noteIndex + 1) % BIRTHDAY_WALTZ.length;

    const beatMs = 460;
    const durSec = Math.max(0.45, (note.beats * beatMs) / 1000 + 0.35);

    this.playChime(ctx, note.freq, durSec, 0.075);
    if (note.harmony) {
      this.playChime(ctx, note.harmony, durSec * 1.1, 0.032);
    }

    this.timerId = window.setTimeout(() => {
      this.scheduleNext();
    }, note.beats * beatMs);
  }

  public start(): boolean {
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (this.isPlaying) return true;
    this.isPlaying = true;
    this.scheduleNext();
    return true;
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public dispose(): void {
    this.stop();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
