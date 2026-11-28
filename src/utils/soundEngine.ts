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

  public getAudioContext(): AudioContext | null {
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

  public async resumeSharedContext(): Promise<AudioContext | null> {
    const ctx = this.getAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // Ignore browser resume rejection outside a user gesture
      }
    }
    return ctx;
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    const ctx = this.getAudioContext();
    if (!ctx) return null;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.65);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return ctx;
  }

  public unlock(): void {
    void this.resumeSharedContext();
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

  /**
   * Soft silky fabric rustle + delicate fairy shimmer as the mini-theatre ribbon bow unties and curtains open.
   */
  public playCurtainRustle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(1650, now + 0.38);
      filter.frequency.exponentialRampToValueAtTime(820, now + 0.92);
      filter.Q.setValueAtTime(1.1, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.032, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.98);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 1.02);
    }

    // Gentle ribbon untie sparkle chime
    [1318.51, 1760.0].forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(0.035, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  /**
   * Crisp metallic rod "unhook clink" + soft descending cloth whoosh for the mini-curtain finale drop.
   */
  public playRodUnhookDrop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Crisp metallic bracket unhook clink
    const clinks = [
      { t: 0, f: 1680, peak: 0.08, dur: 0.11 },
      { t: 0.018, f: 2490, peak: 0.06, dur: 0.14 },
      { t: 0.055, f: 1320, peak: 0.045, dur: 0.1 },
    ];
    clinks.forEach((c) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now + c.t);
      osc.frequency.exponentialRampToValueAtTime(c.f * 0.94, now + c.t + c.dur);

      gain.gain.setValueAtTime(0.0001, now + c.t);
      gain.gain.linearRampToValueAtTime(c.peak, now + c.t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + c.t + c.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + c.t);
      osc.stop(now + c.t + c.dur + 0.02);
    });

    // 2. Soft falling cloth whoosh
    if (this.noiseBuffer) {
      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, now + 0.12);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.72);
      filter.Q.setValueAtTime(1.05, now + 0.12);

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.0001, now + 0.12);
      nGain.gain.linearRampToValueAtTime(0.11, now + 0.22);
      nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.76);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now + 0.12);
      noise.stop(now + 0.8);
    }
  }

  /**
   * Soft, crisp window-shut pop + gentle pastel UI chime for Stage 2 of the mini-theatre exit.
   */
  public playWindowShutChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Tactile soft shut pop (quick pitch drop)
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(520, now);
    pop.frequency.exponentialRampToValueAtTime(195, now + 0.085);

    popGain.gain.setValueAtTime(0.0001, now);
    popGain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

    pop.connect(popGain);
    popGain.connect(ctx.destination);
    pop.start(now);
    pop.stop(now + 0.11);

    // 2. Soft airy sparkle chime right as the window snaps closed
    [783.99, 1046.5].forEach((freq, idx) => {
      const start = now + 0.045 + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.042, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  /**
   * Case File #0721 — Paperclip Metallic Unclip (t = 0.0s):
   * Crisp high metallic "ting-click" using triangle @ 2450Hz + sine @ 3900Hz decaying 0.16 -> 0.001 over 55ms.
   */
  public playPaperclipUnclip(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(2450, now);
      g1.gain.setValueAtTime(0.16, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.065);

      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(3900, now);
      g2.gain.setValueAtTime(0.14, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.065);
    } catch {
      // Ignore Web Audio errors when autoplay is restricted
    }
  }

  /**
   * Case File #0721 — Cardstock Slide & Folder Rustle (t = 0.14s):
   * 460ms filtered noise buffer through bandpass (Q: 1.7, 620Hz -> 1550Hz -> 880Hz), peak gain 0.24.
   */
  public playCardstockSlide(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const durationSec = 0.46;
      const sampleLen = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, sampleLen, ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      // Warm pink-tinted cardstock friction noise
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < sampleLen; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        channel[i] = (b0 + b1 + b2 + white * 0.35) * 0.28;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(1.7, now);
      filter.frequency.setValueAtTime(620, now);
      filter.frequency.exponentialRampToValueAtTime(1550, now + 0.24);
      filter.frequency.exponentialRampToValueAtTime(880, now + durationSec);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.085);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.31);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + durationSec + 0.02);
    } catch {
      // Ignore Web Audio errors when autoplay is restricted
    }
  }

  /**
   * Case File #0721 — Rubber Stamp Soft Thud + Mini Chime (t = 0.84s):
   * Soft stamp thud (sine 155Hz -> 48Hz over 95ms, gain 0.26) + 25ms lowpass noise tap (400Hz, gain 0.12)
   * + E5 (659Hz) & B5 (987Hz) soft sine chime decaying over 320ms (gain 0.11).
   */
  public playCaseStampImpact(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Soft tactile rubber stamp thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(155, now);
      thud.frequency.exponentialRampToValueAtTime(48, now + 0.095);

      thudGain.gain.setValueAtTime(0.0001, now);
      thudGain.gain.linearRampToValueAtTime(0.26, now + 0.008);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.115);

      // 2. 25ms lowpass noise tap (400Hz, gain 0.12)
      if (this.noiseBuffer) {
        const tap = ctx.createBufferSource();
        tap.buffer = this.noiseBuffer;

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(400, now);

        const tapGain = ctx.createGain();
        tapGain.gain.setValueAtTime(0.12, now);
        tapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        tap.connect(lp);
        lp.connect(tapGain);
        tapGain.connect(ctx.destination);
        tap.start(now);
        tap.stop(now + 0.032);
      }

      // 3. Delicate celebratory glint: E5 (659Hz) + B5 (987Hz) soft sine chime over 320ms
      [659, 987].forEach((freq, idx) => {
        const start = now + 0.02 + idx * 0.035;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.11, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.34);
      });
    } catch {
      // Ignore Web Audio errors when autoplay is restricted
    }
  }

  /**
   * Infinity Gift Vault — Keypad tap: crisp 880Hz sine, 30ms.
   */
  public playVaultKeypadTap(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.036);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — Wrong passcode: 180Hz -> 140Hz double sawtooth buzz, 160ms.
   */
  public playVaultWrongCode(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [
        { offset: 0, freq: 180, dur: 0.072 },
        { offset: 0.082, freq: 140, dur: 0.078 },
      ].forEach((b) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(b.freq, now + b.offset);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(620, now + b.offset);

        gain.gain.setValueAtTime(0.0001, now + b.offset);
        gain.gain.linearRampToValueAtTime(0.11, now + b.offset + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + b.offset + b.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + b.offset);
        osc.stop(now + b.offset + b.dur + 0.015);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — Vault unlock: C5 -> E5 -> G5 -> B5 cosmic arpeggio, 420ms.
   */
  public playVaultUnlock(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.068;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2, start);

        const overGain = ctx.createGain();
        overGain.gain.setValueAtTime(0.28, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.1, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

        osc.connect(gain);
        overtone.connect(overGain);
        overGain.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        overtone.start(start);
        osc.stop(start + 0.24);
        overtone.stop(start + 0.24);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — Orbital ring deceleration: lowpass sweeping down-hum, 1.3s.
   */
  public playVaultRingDecel(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const dur = 1.3;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(240, now);
      osc1.frequency.exponentialRampToValueAtTime(78, now + dur);
      osc2.frequency.setValueAtTime(360, now);
      osc2.frequency.exponentialRampToValueAtTime(116, now + dur);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(3.2, now);
      filter.frequency.setValueAtTime(1350, now);
      filter.frequency.exponentialRampToValueAtTime(210, now + dur);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.045, now + dur * 0.72);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + dur + 0.04);
      osc2.stop(now + dur + 0.04);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — Thanos-snap dust disintegration:
   * 20ms bandpass snap + 1.1s airy granular wind-rustle bandpass (1800Hz -> 450Hz).
   */
  public playVaultDustSnap(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Crisp 20ms bandpass snap transient
      if (this.noiseBuffer) {
        const snap = ctx.createBufferSource();
        snap.buffer = this.noiseBuffer;

        const snapBp = ctx.createBiquadFilter();
        snapBp.type = 'bandpass';
        snapBp.frequency.setValueAtTime(2600, now);
        snapBp.Q.setValueAtTime(2.2, now);

        const snapGain = ctx.createGain();
        snapGain.gain.setValueAtTime(0.24, now);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

        snap.connect(snapBp);
        snapBp.connect(snapGain);
        snapGain.connect(ctx.destination);
        snap.start(now);
        snap.stop(now + 0.028);
      }

      // 2. 1.1s airy granular wind-rustle bandpass sweeping 1800Hz -> 450Hz
      const dur = 1.1;
      const sampleLen = Math.floor(ctx.sampleRate * dur);
      const grainBuf = ctx.createBuffer(1, sampleLen, ctx.sampleRate);
      const data = grainBuf.getChannelData(0);
      for (let i = 0; i < sampleLen; i++) {
        // Subtle granular sparkle amplitude modulation
        const env = 0.65 + 0.35 * Math.sin(i * 0.0045) * Math.cos(i * 0.013);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const wind = ctx.createBufferSource();
      wind.buffer = grainBuf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(1.5, now + 0.02);
      bp.frequency.setValueAtTime(1800, now + 0.02);
      bp.frequency.exponentialRampToValueAtTime(450, now + 0.02 + dur);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now + 0.015);
      windGain.gain.linearRampToValueAtTime(0.16, now + 0.14);
      windGain.gain.exponentialRampToValueAtTime(0.075, now + 0.65);
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02 + dur);

      wind.connect(bp);
      bp.connect(windGain);
      windGain.connect(ctx.destination);
      wind.start(now + 0.015);
      wind.stop(now + dur + 0.05);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — ₹250 reward reveal chime: E5 + G#5 + B5 + E6 shimmer, 650ms.
   */
  public playVaultRewardChime(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const chord = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6
      chord.forEach((freq, idx) => {
        const start = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const shimmer = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(freq * 1.5, start);

        const sGain = ctx.createGain();
        sGain.gain.setValueAtTime(0.22, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.095, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.56);

        osc.connect(gain);
        shimmer.connect(sGain);
        sGain.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        shimmer.start(start);
        osc.stop(start + 0.6);
        shimmer.stop(start + 0.6);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Infinity Gift Vault — Reverse-time emerald shimmer for secret reset code (`9876`).
   */
  public playVaultTimeReset(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [1975.53, 1479.98, 1174.66, 987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const start = now + idx * 0.055;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 0.94, start);
        osc.frequency.exponentialRampToValueAtTime(freq, start + 0.09);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.085, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Anamika Editorial Collector Card — Crisp glossy-cardboard 3D flip swoosh
   * (180ms bandpass-filtered noise sweeping 700Hz -> 1700Hz, gain 0.15).
   */
  public playEditorialCardFlip(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.noiseBuffer) return;
      const now = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(700, now);
      bp.frequency.exponentialRampToValueAtTime(1700, now + 0.18);
      bp.Q.setValueAtTime(1.6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.032);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.185);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.195);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Anamika Editorial Collector Card — Lighter-flick metallic flint click (triangle 3200Hz, 25ms)
   * + brief warm ignition whoosh (120ms filtered noise 500Hz -> 1200Hz, gain 0.16).
   */
  public playLighterSpark(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 1. Metallic flint click
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(3200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(2100, now + 0.025);

      clickGain.gain.setValueAtTime(0.0001, now);
      clickGain.gain.linearRampToValueAtTime(0.14, now + 0.003);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.026);

      clickOsc.connect(clickGain);
      clickGain.connect(ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.03);

      // 2. Warm ignition whoosh right after flint click
      if (this.noiseBuffer) {
        const start = now + 0.02;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(500, start);
        bp.frequency.exponentialRampToValueAtTime(1200, start + 0.12);
        bp.Q.setValueAtTime(1.1, start);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, start);
        nGain.gain.linearRampToValueAtTime(0.16, start + 0.024);
        nGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.125);

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(start);
        noise.stop(start + 0.135);
      }
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Stacked Note Deck — Crisp 110ms soft bandpass paper-flick swoosh (gain 0.14).
   */
  public playPaperFlick(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.noiseBuffer) return;
      const now = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(950, now);
      bp.frequency.exponentialRampToValueAtTime(1850, now + 0.11);
      bp.Q.setValueAtTime(1.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.115);

      noise.connect(bp);
      bp.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.125);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Soft tactile toggle chime when switching between No Filter and Birthday Truce.
   */
  public playModeChime(isTruce: boolean): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const freqs = isTruce ? [523.25, 659.25] : [587.33, 493.88];

      freqs.forEach((freq, idx) => {
        const start = now + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.065, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Subtle paper-slide Web Audio tick when Friend List Rankings animate between Before/After 21 July.
   */
  public playPaperSlideTick(rising = true): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Soft paper brush swoosh
      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(rising ? 880 : 1450, now);
        bp.frequency.exponentialRampToValueAtTime(rising ? 1650 : 820, now + 0.095);
        bp.Q.setValueAtTime(1.6, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, now);
        nGain.gain.linearRampToValueAtTime(0.09, now + 0.014);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.11);
      }

      // Delicate tactile settling tick
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(rising ? 520 : 440, now + 0.025);
      tickOsc.frequency.exponentialRampToValueAtTime(rising ? 660 : 380, now + 0.07);

      tickGain.gain.setValueAtTime(0.0001, now + 0.025);
      tickGain.gain.linearRampToValueAtTime(0.042, now + 0.032);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      tickOsc.start(now + 0.025);
      tickOsc.stop(now + 0.09);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Soft pastel notebook divider tab paper-turn tick (gain 0.13).
   */
  public playNotebookTabTurn(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (this.noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1150, now);
        bp.frequency.exponentialRampToValueAtTime(1950, now + 0.085);
        bp.Q.setValueAtTime(1.8, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, now);
        nGain.gain.linearRampToValueAtTime(0.13, now + 0.012);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.092);

        noise.connect(bp);
        bp.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.1);
      }

      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(560, now + 0.012);
      tickOsc.frequency.exponentialRampToValueAtTime(720, now + 0.052);

      tickGain.gain.setValueAtTime(0.0001, now + 0.012);
      tickGain.gain.linearRampToValueAtTime(0.036, now + 0.02);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      tickOsc.start(now + 0.012);
      tickOsc.stop(now + 0.07);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Tiny soft crystalline twinkle chime when Sparkle Rain is toggled ON.
   */
  public playSparkleTwinkle(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [1046.5, 1318.5, 1567.98]; // C6 -> E6 -> G6 airy shimmer

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.042;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.045, start + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.21);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Gentle, warm 2-note pastel marimba chime for Closing Sign-Off Footer replay (gain 0.12).
   */
  public playPastelMarimbaChime(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Warm major-third / fifth wooden marimba pair (E5 -> B5)
      const notes = [
        { freq: 659.25, offset: 0, peak: 0.12, decay: 0.28 },
        { freq: 987.77, offset: 0.115, peak: 0.105, decay: 0.36 },
      ];

      notes.forEach((n) => {
        const start = now + n.offset;
        const fund = ctx.createOscillator();
        const fundGain = ctx.createGain();
        fund.type = 'sine';
        fund.frequency.setValueAtTime(n.freq, start);

        fundGain.gain.setValueAtTime(0.0001, start);
        fundGain.gain.linearRampToValueAtTime(n.peak, start + 0.008);
        fundGain.gain.exponentialRampToValueAtTime(0.0001, start + n.decay);

        // Soft wooden marimba overtone bar click (4th harmonic decaying fast)
        const over = ctx.createOscillator();
        const overGain = ctx.createGain();
        over.type = 'triangle';
        over.frequency.setValueAtTime(n.freq * 3.98, start);

        overGain.gain.setValueAtTime(0.0001, start);
        overGain.gain.linearRampToValueAtTime(n.peak * 0.18, start + 0.004);
        overGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

        fund.connect(fundGain);
        fundGain.connect(ctx.destination);
        over.connect(overGain);
        overGain.connect(ctx.destination);

        fund.start(start);
        over.start(start);
        fund.stop(start + n.decay + 0.02);
        over.stop(start + 0.06);
      });
    } catch {
      // Ignore Web Audio errors when autoplay is restricted
    }
  }

  /**
   * The Little Coop — Stage 3 tiny cute soft kiss pop (gain 0.11).
   */
  public playCoopKissPop(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.055);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.095);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.115);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * The Little Coop — Stage 4 playful tiny cartoon rubbery boing blip (gain 0.10).
   */
  public playCoopBoing(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(490, now + 0.095);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.17);
      osc.frequency.exponentialRampToValueAtTime(415, now + 0.23);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * The Little Coop — Stage 5 crisp tiny eggshell crack tick (gain 0.12).
   */
  public playCoopShellCrack(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (this.noiseBuffer) {
        const crack = ctx.createBufferSource();
        crack.buffer = this.noiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(2900, now);
        bp.Q.setValueAtTime(2.6, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, now);
        nGain.gain.linearRampToValueAtTime(0.12, now + 0.004);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.048);

        crack.connect(bp);
        bp.connect(nGain);
        nGain.connect(ctx.destination);
        crack.start(now);
        crack.stop(now + 0.055);
      }

      const snap = ctx.createOscillator();
      const sGain = ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(1760, now + 0.005);
      snap.frequency.exponentialRampToValueAtTime(920, now + 0.045);

      sGain.gain.setValueAtTime(0.0001, now + 0.005);
      sGain.gain.linearRampToValueAtTime(0.07, now + 0.009);
      sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      snap.connect(sGain);
      sGain.connect(ctx.destination);
      snap.start(now + 0.005);
      snap.stop(now + 0.06);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * The Little Coop — Stage 6 cute tiny 2-note baby-chick chirp for AYUSH (gain 0.12).
   */
  public playCoopBabyChirp(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const chirps = [
        { offset: 0, startHz: 1420, peakHz: 2150, endHz: 1780 },
        { offset: 0.125, startHz: 1580, peakHz: 2380, endHz: 1960 },
      ];

      chirps.forEach((c) => {
        const t = now + c.offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.startHz, t);
        osc.frequency.exponentialRampToValueAtTime(c.peakHz, t + 0.048);
        osc.frequency.exponentialRampToValueAtTime(c.endHz, t + 0.095);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.105);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.115);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Playful cheeky trombone + comic blip for the Secret Passcode 1507 Clown Bluff reveal (gain 0.11).
   * Strictly standalone Web Audio oscillators — never pauses or alters background MP3 playback.
   */
  public playBluffClownTrombone(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const wahSteps = [
        { offset: 0, from: 392.0, to: 369.99, dur: 0.15 },
        { offset: 0.16, from: 349.23, to: 277.18, dur: 0.28 },
      ];

      wahSteps.forEach((step) => {
        const start = now + step.offset;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(step.from, start);
        osc.frequency.exponentialRampToValueAtTime(step.to, start + step.dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(980, start);
        filter.frequency.exponentialRampToValueAtTime(520, start + step.dur);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + step.dur + 0.03);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + step.dur + 0.05);
      });

      // Cheeky clown-nose honk / spring blip tail
      const blipStart = now + 0.46;
      const blip = ctx.createOscillator();
      const bGain = ctx.createGain();
      blip.type = 'triangle';
      blip.frequency.setValueAtTime(290, blipStart);
      blip.frequency.exponentialRampToValueAtTime(540, blipStart + 0.08);
      blip.frequency.exponentialRampToValueAtTime(340, blipStart + 0.17);

      bGain.gain.setValueAtTime(0.0001, blipStart);
      bGain.gain.linearRampToValueAtTime(0.11, blipStart + 0.015);
      bGain.gain.exponentialRampToValueAtTime(0.0001, blipStart + 0.19);

      blip.connect(bGain);
      bGain.connect(ctx.destination);
      blip.start(blipStart);
      blip.stop(blipStart + 0.21);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Playful cartoon buzzer + cheeky spring boing blip for the 0312 Midnight Lock bluff screen (gain 0.11).
   * Strictly standalone Web Audio oscillators — never interferes with background MP3 playback.
   */
  public playBluffBuzzerBoing(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Short cheeky cartoon game-show double buzz
      [0, 0.14].forEach((offset, idx) => {
        const start = now + offset;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        const baseHz = idx === 0 ? 196 : 165;
        osc.frequency.setValueAtTime(baseHz, start);
        osc.frequency.exponentialRampToValueAtTime(baseHz * 0.86, start + 0.11);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(760, start);
        filter.frequency.exponentialRampToValueAtTime(420, start + 0.11);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.11, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.135);
      });

      // Bouncy spring boing tail
      const boingStart = now + 0.28;
      const boing = ctx.createOscillator();
      const bGain = ctx.createGain();
      boing.type = 'triangle';
      boing.frequency.setValueAtTime(220, boingStart);
      boing.frequency.exponentialRampToValueAtTime(520, boingStart + 0.09);
      boing.frequency.exponentialRampToValueAtTime(260, boingStart + 0.19);
      boing.frequency.exponentialRampToValueAtTime(380, boingStart + 0.27);

      bGain.gain.setValueAtTime(0.0001, boingStart);
      bGain.gain.linearRampToValueAtTime(0.11, boingStart + 0.014);
      bGain.gain.exponentialRampToValueAtTime(0.0001, boingStart + 0.29);

      boing.connect(bGain);
      bGain.connect(ctx.destination);
      boing.start(boingStart);
      boing.stop(boingStart + 0.31);
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Stage-reactive zero-latency Web Audio Tapli SFX:
   * - Stages 1-3: Crisp comic pat-pop (240Hz -> 95Hz sine drop + 28ms soft filtered noise snap, pitch scales with combo)
   * - Stages 4-6: Punchier springy cartoon bonk/boing (320Hz -> 82Hz + playful harmonic bounce)
   * - Stage 7 (Soul Out): Funny hollow cartoon bloop + soft airy shimmer
   * - Stage 8 (Zen Goddess): Gentle golden temple chime / sparkling bell tone over a light pat
   * Respects global SFX mute toggle cleanly and never touches background music.
   */
  public playTapliBonk(combo = 1, stageId = 1): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const pitchScale = 1 + Math.min(Math.max(0, combo - 1), 24) * 0.015;

      // Stage 8: Gentle golden temple chime / sparkling bell tone over a light pat
      if (stageId >= 8) {
        // Light calm pat
        const patOsc = ctx.createOscillator();
        const patGain = ctx.createGain();
        patOsc.type = 'sine';
        patOsc.frequency.setValueAtTime(220, now);
        patOsc.frequency.exponentialRampToValueAtTime(110, now + 0.055);
        patGain.gain.setValueAtTime(0.0001, now);
        patGain.gain.linearRampToValueAtTime(0.08, now + 0.005);
        patGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
        patOsc.connect(patGain);
        patGain.connect(ctx.destination);
        patOsc.start(now);
        patOsc.stop(now + 0.07);

        // Serene golden temple bell overtones
        const bellFreqs = [783.99, 1174.66, 1567.98];
        bellFreqs.forEach((freq, idx) => {
          const bell = ctx.createOscillator();
          const bGain = ctx.createGain();
          bell.type = idx === 0 ? 'sine' : 'triangle';
          bell.frequency.setValueAtTime(freq, now + idx * 0.012);
          bGain.gain.setValueAtTime(0.0001, now + idx * 0.012);
          bGain.gain.linearRampToValueAtTime(idx === 0 ? 0.075 : 0.032, now + idx * 0.012 + 0.01);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34 + idx * 0.05);
          bell.connect(bGain);
          bGain.connect(ctx.destination);
          bell.start(now + idx * 0.012);
          bell.stop(now + 0.42 + idx * 0.05);
        });
        return;
      }

      // Stage 7: Funny hollow cartoon bloop + soft airy shimmer
      if (stageId === 7) {
        const bloop = ctx.createOscillator();
        const bGain = ctx.createGain();
        bloop.type = 'sine';
        bloop.frequency.setValueAtTime(210 * pitchScale, now);
        bloop.frequency.exponentialRampToValueAtTime(490 * pitchScale, now + 0.07);
        bloop.frequency.exponentialRampToValueAtTime(260 * pitchScale, now + 0.14);

        bGain.gain.setValueAtTime(0.0001, now);
        bGain.gain.linearRampToValueAtTime(0.14, now + 0.008);
        bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.155);

        bloop.connect(bGain);
        bGain.connect(ctx.destination);
        bloop.start(now);
        bloop.stop(now + 0.165);

        // Soft ghostly airy shimmer
        const shimmer = ctx.createOscillator();
        const sGain = ctx.createGain();
        shimmer.type = 'triangle';
        shimmer.frequency.setValueAtTime(1046.5, now + 0.02);
        shimmer.frequency.exponentialRampToValueAtTime(1318.5, now + 0.18);
        sGain.gain.setValueAtTime(0.0001, now + 0.02);
        sGain.gain.linearRampToValueAtTime(0.035, now + 0.04);
        sGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
        shimmer.connect(sGain);
        sGain.connect(ctx.destination);
        shimmer.start(now + 0.02);
        shimmer.stop(now + 0.22);
        return;
      }

      // Stages 4-6: Punchier springy cartoon bonk/boing (320Hz -> 82Hz + playful harmonic bounce)
      if (stageId >= 4) {
        if (this.noiseBuffer) {
          const snap = ctx.createBufferSource();
          snap.buffer = this.noiseBuffer;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(1650 * pitchScale, now);
          bp.Q.setValueAtTime(1.15, now);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.0001, now);
          nGain.gain.linearRampToValueAtTime(0.16, now + 0.004);
          nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
          snap.connect(bp);
          bp.connect(nGain);
          nGain.connect(ctx.destination);
          snap.start(now);
          snap.stop(now + 0.036);
        }

        const bonk = ctx.createOscillator();
        const bonkGain = ctx.createGain();
        bonk.type = 'sine';
        bonk.frequency.setValueAtTime(320 * pitchScale, now);
        bonk.frequency.exponentialRampToValueAtTime(82 * pitchScale, now + 0.085);
        bonkGain.gain.setValueAtTime(0.0001, now);
        bonkGain.gain.linearRampToValueAtTime(0.21, now + 0.005);
        bonkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
        bonk.connect(bonkGain);
        bonkGain.connect(ctx.destination);
        bonk.start(now);
        bonk.stop(now + 0.105);

        // Playful springy harmonic bounce
        const boing = ctx.createOscillator();
        const boingGain = ctx.createGain();
        boing.type = 'triangle';
        boing.frequency.setValueAtTime(240 * pitchScale, now + 0.03);
        boing.frequency.exponentialRampToValueAtTime(430 * pitchScale, now + 0.085);
        boing.frequency.exponentialRampToValueAtTime(295 * pitchScale, now + 0.135);
        boingGain.gain.setValueAtTime(0.0001, now + 0.03);
        boingGain.gain.linearRampToValueAtTime(0.075, now + 0.042);
        boingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.145);
        boing.connect(boingGain);
        boingGain.connect(ctx.destination);
        boing.start(now + 0.03);
        boing.stop(now + 0.155);
        return;
      }

      // Stages 1-3: Crisp comic pat-pop (240Hz -> 95Hz sine drop + 28ms soft filtered noise snap)
      if (this.noiseBuffer) {
        const pat = ctx.createBufferSource();
        pat.buffer = this.noiseBuffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1400 * pitchScale, now);
        bp.Q.setValueAtTime(1.35, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, now);
        nGain.gain.linearRampToValueAtTime(0.145, now + 0.003);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

        pat.connect(bp);
        bp.connect(nGain);
        nGain.connect(ctx.destination);
        pat.start(now);
        pat.stop(now + 0.032);
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240 * pitchScale, now);
      osc.frequency.exponentialRampToValueAtTime(95 * pitchScale, now + 0.072);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.175, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.088);
    } catch {
      // Ignore Web Audio errors on suspended contexts
    }
  }

  /**
   * Quick cheerful 2-note ascending sparkle chime when unlocking a new Tapli stage.
   */
  public playTapliStageUnlock(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [659.25, 987.77]; // E5 -> B5 bright sparkle interval

      notes.forEach((freq, idx) => {
        const start = now + idx * 0.075;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }

  /**
   * Soft cooling ice-pack sigh + icy sparkle shimmer when pressing Cool Her Down.
   */
  public playTapliCooldownSigh(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Soft airy sigh noise sweep
      if (this.noiseBuffer) {
        const sigh = ctx.createBufferSource();
        sigh.buffer = this.noiseBuffer;

        const lp = ctx.createBiquadFilter();
        lp.type = 'bandpass';
        lp.frequency.setValueAtTime(1600, now);
        lp.frequency.exponentialRampToValueAtTime(520, now + 0.36);
        lp.Q.setValueAtTime(1.8, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.0001, now);
        nGain.gain.linearRampToValueAtTime(0.065, now + 0.05);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        sigh.connect(lp);
        lp.connect(nGain);
        nGain.connect(ctx.destination);
        sigh.start(now);
        sigh.stop(now + 0.42);
      }

      // Chilled descending crystalline chime
      const chillNotes = [1046.5, 880, 659.25];
      chillNotes.forEach((freq, idx) => {
        const start = now + idx * 0.065;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.06, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.26);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch {
      // Ignore Web Audio errors
    }
  }
}

export const soundEngine = new SoundEffectsEngine();
