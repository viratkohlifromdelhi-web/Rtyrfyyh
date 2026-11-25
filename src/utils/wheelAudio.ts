/**
 * Pure Web Audio API synthesizer for the rigged Birthday Spin Wheel.
 * Generates soft tactile peg ticks and a comical descending womp-womp / boing on landing
 * without any external audio files.
 */
export class WheelAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer && this.ctx) {
      const length = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.28));
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  /**
   * Unlocks the browser AudioContext cleanly inside a user gesture (tap/click).
   */
  public unlock(): void {
    this.ensureContext();
  }

  /**
   * Plays a crisp, soft wooden/plastic peg tick synced to a peg passing the top flapper.
   */
  public playPegTick(speedNorm: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const clampedSpeed = Math.min(1, Math.max(0, speedNorm));

    // Short woody/plastic body ping
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    const startFreq = 860 + clampedSpeed * 420;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.026);

    const peakGain = 0.095 + clampedSpeed * 0.045;
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(peakGain, now + 0.003);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.036);

    // Subtle filtered click transient
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600 + clampedSpeed * 700, now);
      filter.Q.setValueAtTime(2.2, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.055, now);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.024);
    }
  }

  /**
   * Plays a funny descending "womp-womp / playful boing" synth when the wheel lands on a troll slice.
   */
  public playWompBoing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    const scheduleWomp = (
      offsetSec: number,
      fromHz: number,
      toHz: number,
      durationSec: number,
      wobble = false,
    ) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(fromHz, now + offsetSec);
      osc.frequency.exponentialRampToValueAtTime(toHz, now + offsetSec + durationSec);

      if (wobble) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(9.5, now + offsetSec);
        lfoGain.gain.setValueAtTime(9, now + offsetSec);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now + offsetSec);
        lfo.stop(now + offsetSec + durationSec + 0.04);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, now + offsetSec);
      filter.frequency.exponentialRampToValueAtTime(420, now + offsetSec + durationSec);

      gain.gain.setValueAtTime(0.0001, now + offsetSec);
      gain.gain.linearRampToValueAtTime(0.11, now + offsetSec + 0.03);
      gain.gain.setValueAtTime(0.095, now + offsetSec + durationSec * 0.72);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offsetSec + durationSec + 0.03);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + offsetSec);
      osc.stop(now + offsetSec + durationSec + 0.05);
    };

    // Classic playful womp-womp + cheeky mini boing tail
    scheduleWomp(0.0, 392, 349.23, 0.24, false); // G4 -> F4
    scheduleWomp(0.26, 329.63, 246.94, 0.44, true); // E4 -> B3 with comic vibrato

    // Tiny springy boing accent right after
    const boing = ctx.createOscillator();
    const boingGain = ctx.createGain();
    boing.type = 'sine';
    boing.frequency.setValueAtTime(220, now + 0.72);
    boing.frequency.exponentialRampToValueAtTime(410, now + 0.84);
    boing.frequency.exponentialRampToValueAtTime(290, now + 0.96);

    boingGain.gain.setValueAtTime(0.0001, now + 0.72);
    boingGain.gain.linearRampToValueAtTime(0.09, now + 0.74);
    boingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);

    boing.connect(boingGain);
    boingGain.connect(ctx.destination);
    boing.start(now + 0.72);
    boing.stop(now + 1.0);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.noiseBuffer = null;
    }
  }
}
