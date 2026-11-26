/**
 * Shared Web Audio API Sound Effects Engine for Anamika's 17th Birthday site.
 * 100% synthesized in code — zero external audio files.
 * Cleanly initializes/resumes AudioContext on user gesture and supports a global SFX mute toggle.
 */
class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;
  private listeners = new Set<(enabled: boolean) => void>();

  // Continuous scanner hold audio nodes
  private scannerOsc1: OscillatorNode | null = null;
  private scannerOsc2: OscillatorNode | null = null;
  private scannerFilter: BiquadFilterNode | null = null;
  private scannerGain: GainNode | null = null;
  private scannerPingTimer: number | null = null;
  private scannerProgress01 = 0;

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    if (this.enabled === next) return;
    this.enabled = next;
    if (!next) {
      this.stopScannerHold();
    }
    this.listeners.forEach((cb) => cb(this.enabled));
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    if (this.enabled) {
      this.playBubbleClick();
    }
    return this.enabled;
  }

  public subscribe(cb: (enabled: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
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
      const length = Math.floor(this.ctx.sampleRate * 0.65);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  /**
   * Soft, crisp bubble/pop click for toggles, buttons, and tappable cards.
   */
  public playBubbleClick(pitchMultiplier = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(690 * pitchMultiplier, now + 0.055);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.095, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Realistic layered party popper: snappy low-end pop + crisp filtered noise burst + shimmering chimes.
   */
  public playConfettiPop(intensity: 'normal' | 'cannon' = 'normal'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const boost = intensity === 'cannon' ? 1.15 : 0.92;

    // 1. Snappy low-end pop thump
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(175, now);
    popOsc.frequency.exponentialRampToValueAtTime(46, now + 0.085);

    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.24 * boost, now + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.12);

    // 2. Crisp filtered white-noise popper crackle
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2400, now);
      hp.frequency.exponentialRampToValueAtTime(1100, now + 0.16);
      hp.Q.setValueAtTime(0.85, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(0.16 * boost, now + 0.006);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

      noise.connect(hp);
      hp.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.21);
    }

    // 3. Shimmering high-pitched pastel sparkle chimes
    const chimes = intensity === 'cannon'
      ? [1046.5, 1318.5, 1567.98, 2093.0, 2637.0]
      : [1174.66, 1567.98, 2093.0];

    chimes.forEach((freq, idx) => {
      const start = now + 0.03 + idx * 0.042;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.048 * boost, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  /**
   * Fast comical upward cartoon zip/whoosh for the Runaway "No" button dodge.
   */
  public playDodgeZip(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.13);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.12);
      filter.Q.setValueAtTime(2.0, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(0.045, now + 0.02);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.15);
    }
  }

  /**
   * Satisfying heavy low-end THUMP + quick sparkle chime when the Adoption Certificate wax seal slams down.
   */
  public playWaxStamp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Heavy low-end stamp thump
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(142, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.16);

    thumpGain.gain.setValueAtTime(0.0001, now);
    thumpGain.gain.linearRampToValueAtTime(0.32, now + 0.008);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.24);

    // Subtle matte paper slap
    if (this.noiseBuffer) {
      const slap = ctx.createBufferSource();
      slap.buffer = this.noiseBuffer;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(950, now);
      const sGain = ctx.createGain();
      sGain.gain.setValueAtTime(0.14, now);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      slap.connect(lp);
      lp.connect(sGain);
      sGain.connect(ctx.destination);
      slap.start(now);
      slap.stop(now + 0.08);
    }

    // Quick crisp sparkle chime after impact
    [987.77, 1318.51, 1975.53].forEach((freq, idx) => {
      const start = now + 0.075 + idx * 0.045;
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(freq, start);
      cGain.gain.setValueAtTime(0.0001, start);
      cGain.gain.linearRampToValueAtTime(0.06, start + 0.01);
      cGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);
      chime.connect(cGain);
      cGain.connect(ctx.destination);
      chime.start(start);
      chime.stop(start + 0.28);
    });
  }

  /**
   * Shimmering upward harp/glitter sweep for normal Birthday Scratch-Off Coupon unlocks.
   */
  public playScratchSparkle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.38);
    });
  }

  /**
   * Tiny comedic sad trombone / boing for the EXPIRED Gawaar scratch coupon.
   */
  public playScratchExpired(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const steps = [
      { offset: 0, from: 370, to: 349.23, dur: 0.18 },
      { offset: 0.19, from: 329.63, to: 261.63, dur: 0.34 },
    ];

    steps.forEach((s) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(s.from, now + s.offset);
      osc.frequency.exponentialRampToValueAtTime(s.to, now + s.offset + s.dur);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(860, now + s.offset);

      gain.gain.setValueAtTime(0.0001, now + s.offset);
      gain.gain.linearRampToValueAtTime(0.085, now + s.offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + s.offset + s.dur + 0.03);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + s.offset);
      osc.stop(now + s.offset + s.dur + 0.05);
    });

    // Cheeky little spring boing
    const boing = ctx.createOscillator();
    const bGain = ctx.createGain();
    boing.type = 'sine';
    boing.frequency.setValueAtTime(210, now + 0.54);
    boing.frequency.exponentialRampToValueAtTime(390, now + 0.65);
    boing.frequency.exponentialRampToValueAtTime(275, now + 0.74);

    bGain.gain.setValueAtTime(0.0001, now + 0.54);
    bGain.gain.linearRampToValueAtTime(0.08, now + 0.56);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.76);

    boing.connect(bGain);
    bGain.connect(ctx.destination);
    boing.start(now + 0.54);
    boing.stop(now + 0.78);
  }

  /**
   * Dramatic pop + playful comedic fanfare burst when revealing the "GAWAAR" gift box.
   */
  public playGiftFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Playful fanfare notes (C5 -> E5 -> G5 -> C6 with comic wobble)
    const fanfare = [
      { t: 0.02, f: 523.25, d: 0.13 },
      { t: 0.14, f: 659.25, d: 0.13 },
      { t: 0.26, f: 783.99, d: 0.14 },
      { t: 0.4, f: 1046.5, d: 0.42 },
    ];

    fanfare.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === fanfare.length - 1 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      if (idx === fanfare.length - 1) {
        // Subtle playful pitch lift at the climax
        osc.frequency.exponentialRampToValueAtTime(n.f * 1.03, now + n.t + 0.12);
        osc.frequency.exponentialRampToValueAtTime(n.f * 0.99, now + n.t + n.d);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now + n.t);

      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.linearRampToValueAtTime(0.09, now + n.t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.04);
    });
  }

  /**
   * Soft airy whoosh + cheerful celebratory arpeggio chime for blowing out the birthday candles.
   */
  public playCakeBlowout(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Soft airy breath whoosh
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.42);
      filter.Q.setValueAtTime(1.4, now);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now);
      nGain.gain.linearRampToValueAtTime(0.14, now + 0.07);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.46);
    }

    // 2. Cheerful celebratory arpeggio chime right after the puff
    const arpeggio = [523.25, 659.25, 783.99, 880.0, 1046.5, 1318.51];
    arpeggio.forEach((freq, idx) => {
      const start = now + 0.2 + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.075, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /**
   * Starts the smooth rising sci-fi hum + soft rhythmic radar pings while holding the Bauni-Meter scanner.
   */
  public startScannerHold(): void {
    this.stopScannerHold();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this.scannerProgress01 = 0;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(165, now);
    osc2.frequency.setValueAtTime(330, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(480, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.068, now + 0.1);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    this.scannerOsc1 = osc1;
    this.scannerOsc2 = osc2;
    this.scannerFilter = filter;
    this.scannerGain = gain;

    const playRadarPing = () => {
      if (!this.ctx || !this.enabled || !this.scannerOsc1) return;
      const t = this.ctx.currentTime;
      const ping = this.ctx.createOscillator();
      const pGain = this.ctx.createGain();
      ping.type = 'sine';
      const baseHz = 760 + this.scannerProgress01 * 560;
      ping.frequency.setValueAtTime(baseHz, t);
      ping.frequency.exponentialRampToValueAtTime(baseHz * 1.12, t + 0.08);

      pGain.gain.setValueAtTime(0.0001, t);
      pGain.gain.linearRampToValueAtTime(0.045, t + 0.01);
      pGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);

      ping.connect(pGain);
      pGain.connect(this.ctx.destination);
      ping.start(t);
      ping.stop(t + 0.14);
    };

    playRadarPing();
    this.scannerPingTimer = window.setInterval(playRadarPing, 430);
  }

  /**
   * Smoothly climbs the scanner hum pitch & filter brightness from 0% to 99%.
   */
  public updateScannerHold(progress01: number): void {
    const clamped = Math.min(1, Math.max(0, progress01));
    this.scannerProgress01 = clamped;
    if (!this.ctx || !this.scannerOsc1 || !this.scannerOsc2 || !this.scannerFilter) return;

    const now = this.ctx.currentTime;
    const baseHz = 165 + clamped * 335; // 165Hz -> 500Hz
    this.scannerOsc1.frequency.setTargetAtTime(baseHz, now, 0.04);
    this.scannerOsc2.frequency.setTargetAtTime(baseHz * 1.5, now, 0.04);
    this.scannerFilter.frequency.setTargetAtTime(480 + clamped * 1100, now, 0.04);
  }

  /**
   * Immediately fades out the scanner hold hum cleanly on release or completion.
   */
  public stopScannerHold(): void {
    if (this.scannerPingTimer !== null) {
      window.clearInterval(this.scannerPingTimer);
      this.scannerPingTimer = null;
    }

    const ctx = this.ctx;
    const gain = this.scannerGain;
    const osc1 = this.scannerOsc1;
    const osc2 = this.scannerOsc2;

    this.scannerOsc1 = null;
    this.scannerOsc2 = null;
    this.scannerFilter = null;
    this.scannerGain = null;

    if (ctx && gain && osc1 && osc2) {
      const now = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        osc1.stop(now + 0.055);
        osc2.stop(now + 0.055);
      } catch {
        // Ignore already-stopped oscillator
      }
    }
  }

  /**
   * Short playful descending "uh-oh" bloop when the user lifts their finger early on the scanner.
   */
  public playScannerAbort(): void {
    this.stopScannerHold();
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [
      { offset: 0, from: 460, to: 370, dur: 0.095 },
      { offset: 0.1, from: 340, to: 215, dur: 0.16 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.from, now + n.offset);
      osc.frequency.exponentialRampToValueAtTime(n.to, now + n.offset + n.dur);

      gain.gain.setValueAtTime(0.0001, now + n.offset);
      gain.gain.linearRampToValueAtTime(0.11, now + n.offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.offset + n.dur + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + n.offset);
      osc.stop(now + n.offset + n.dur + 0.03);
    });
  }

  /**
   * Crisp comical glitch + cartoon boing/wah-wah when the Bauni-Meter hits 99%.
   */
  public playScannerComplete(): void {
    this.stopScannerHold();
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Crisp digital glitch pips
    [1180, 740, 1480].forEach((freq, idx) => {
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);
    });

    // 2. Cartoon spring boing + wah-wah
    const boing = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const bGain = ctx.createGain();
    boing.type = 'triangle';
    boing.frequency.setValueAtTime(240, now + 0.15);
    boing.frequency.exponentialRampToValueAtTime(620, now + 0.27);
    boing.frequency.exponentialRampToValueAtTime(290, now + 0.44);
    boing.frequency.exponentialRampToValueAtTime(420, now + 0.56);
    boing.frequency.exponentialRampToValueAtTime(210, now + 0.78);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now + 0.15);
    filter.frequency.exponentialRampToValueAtTime(560, now + 0.78);

    bGain.gain.setValueAtTime(0.0001, now + 0.15);
    bGain.gain.linearRampToValueAtTime(0.14, now + 0.18);
    bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    boing.connect(filter);
    filter.connect(bGain);
    bGain.connect(ctx.destination);
    boing.start(now + 0.15);
    boing.stop(now + 0.82);
  }
}

export const soundEngine = new SoundEffectsEngine();
