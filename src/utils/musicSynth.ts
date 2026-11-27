/**
 * Persistent HTML5 <audio> background music player wired to the local repo MP3
 * (`public/Milky - Just The Way You Are (Official Audio).mp3`) via the shared
 * Web Audio API AudioContext + GainNode (with smooth audio.volume fallback for
 * iOS Safari / Android Chrome), sequential intro handoff, passive autoplay unlock,
 * visibilitychange pause/resume, and smart interactive audio ducking.
 */
import {
  AUTOPLAY_HANDOFF_FADE_MS,
  BG_MUSIC_SRC,
  CASE_FILE_DUCK_DOWN_MS,
  CASE_FILE_DUCK_GAIN,
  CASE_FILE_RESTORE_MS,
  CELEBRATION_DIP_GAIN,
  CELEBRATION_DIP_HOLD_MS,
  CELEBRATION_DIP_RAMP_MS,
  CELEBRATION_SETTLE_MS,
  CELEBRATION_SWELL_GAIN,
  CELEBRATION_SWELL_HOLD_MS,
  CELEBRATION_SWELL_RAMP_MS,
  DEFAULT_BG_MUSIC_GAIN,
  MANUAL_PAUSE_FADE_MS,
  MANUAL_PLAY_FADE_MS,
  MODE_TRANSITION_MS,
  REPLAY_FADE_OUT_MS,
  SCANNER_DUCK_DOWN_MS,
  SCANNER_DUCK_GAIN,
  SCANNER_RESTORE_MS,
  SCANNER_VERDICT_HOLD_MS,
  SCRATCH_DUCK_GAIN,
  SCRATCH_DUCK_HOLD_MS,
  SCRATCH_DUCK_RAMP_MS,
  SCRATCH_RESTORE_MS,
  UNLOCK_FADE_MS,
  VAULT_DUCK_DOWN_MS,
  VAULT_DUCK_GAIN,
  VAULT_RESTORE_DELAY_MS,
  VAULT_RESTORE_MS,
  VISIBILITY_RESUME_FADE_MS,
  WHEEL_DUCK_DOWN_MS,
  WHEEL_DUCK_GAIN,
  WHEEL_RESTORE_DELAY_MS,
  WHEEL_RESTORE_MS,
  clampGain,
  getBaseGainForMode,
  resolveEffectiveMusicGain,
  shouldTriggerAutoplayUnlock,
  type ActiveDuckMap,
  type DuckChannel,
  type MusicVibeMode,
} from './musicController';
import { soundEngine } from './soundEngine';

export { BG_MUSIC_SRC, DEFAULT_BG_MUSIC_GAIN };

export interface BgMusicSnapshot {
  isPlaying: boolean;
  showMusicHint: boolean;
  userPaused: boolean;
  vibeMode: MusicVibeMode;
  targetGain: number;
  currentGain: number;
}

type MusicListener = (snapshot: BgMusicSnapshot) => void;

type ExtendedAudioElement = HTMLAudioElement & {
  playsInline?: boolean;
  preservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

interface MediaAudioRouting {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
}

/**
 * Module-level WeakMap guarantees `createMediaElementSource(audio)` is created
 * at most ONCE per HTMLMediaElement (preventing StrictMode InvalidStateError or silent muting).
 */
const mediaElementRoutingMap = new WeakMap<HTMLMediaElement, MediaAudioRouting>();

export class BirthdayMusicPlayer {
  private audioEl: ExtendedAudioElement | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private webAudioConnected = false;

  private isPlaying = false;
  private showMusicHint = false;
  private awaitingUnlock = false;
  private userPaused = false;
  private wasPlayingBeforeHidden = false;
  private vibeMode: MusicVibeMode = 'default';
  private activeDucks: ActiveDuckMap = {};
  private currentGain = 0;
  private targetGain = DEFAULT_BG_MUSIC_GAIN;

  private volumeRafId: number | null = null;
  private pauseTimerId: number | null = null;
  private wheelRestoreTimerId: number | null = null;
  private scannerRestoreTimerId: number | null = null;
  private celebrationSwellTimerId: number | null = null;
  private celebrationSettleTimerId: number | null = null;
  private scratchRestoreTimerId: number | null = null;
  private vaultRestoreTimerId: number | null = null;

  private unlockListenerAttached = false;
  private visibilityListenerAttached = false;
  private audioPreloadUpgraded = false;
  private listeners = new Set<MusicListener>();

  public subscribe(listener: MusicListener): () => void {
    this.listeners.add(listener);
    this.ensureVisibilityListener();
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): BgMusicSnapshot {
    return {
      isPlaying: this.isPlaying,
      showMusicHint: this.showMusicHint,
      userPaused: this.userPaused,
      vibeMode: this.vibeMode,
      targetGain: this.targetGain,
      currentGain: this.currentGain,
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    this.syncAudioElementDataset();
    this.listeners.forEach((cb) => cb(snap));
  }

  private syncAudioElementDataset(): void {
    if (!this.audioEl) return;
    this.audioEl.dataset.playing = String(this.isPlaying);
    this.audioEl.dataset.userPaused = String(this.userPaused);
    this.audioEl.dataset.awaitingUnlock = String(this.awaitingUnlock);
    this.audioEl.dataset.vibeMode = this.vibeMode;
    this.audioEl.dataset.baseGain = getBaseGainForMode(this.vibeMode).toFixed(3);
    this.audioEl.dataset.targetGain = this.targetGain.toFixed(3);
    this.audioEl.dataset.currentGain = this.currentGain.toFixed(3);
    this.audioEl.dataset.webAudio = String(this.webAudioConnected);
  }

  private ensureAudioEl(): ExtendedAudioElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (!this.audioEl) {
      const el = document.createElement('audio') as ExtendedAudioElement;
      el.setAttribute('data-testid', 'bg-music-audio');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('playsinline', '');
      el.setAttribute('webkit-playsinline', '');
      el.hidden = true;
      el.src = BG_MUSIC_SRC;
      el.loop = true;
      el.preload = 'metadata';
      el.playsInline = true;
      el.playbackRate = 1.0;
      el.defaultPlaybackRate = 1.0;
      el.preservesPitch = true;
      if ('mozPreservesPitch' in el) el.mozPreservesPitch = true;
      if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = true;
      el.volume = 0;

      // Non-intrusive diagnostic warning only if loading the local MP3 fails (e.g. 404)
      el.addEventListener('error', () => {
        const mediaErr = el.error;
        console.warn(
          `[BgMusic] Unable to load local audio file "${BG_MUSIC_SRC}" (MediaError code: ${mediaErr?.code ?? 'unknown'}). Confirm "public/Milky - Just The Way You Are (Official Audio).mp3" exists.`,
        );
      });

      // Keep a single persistent <audio> element in DOM for reliable iOS/Android & test inspection
      document.body.appendChild(el);
      this.audioEl = el;
      this.syncAudioElementDataset();
    }
    return this.audioEl;
  }

  /**
   * Routes the persistent HTML5 <audio> element through the shared Web Audio API
   * AudioContext + GainNode at most once (guarded by module-level WeakMap).
   * If AudioContext is blocked, suspended, or throws, NEVER attaches createMediaElementSource
   * blindly — falls back cleanly to native HTML5 <audio> playback + rAF volume fading.
   */
  private async tryEnsureWebAudioRouting(el: ExtendedAudioElement): Promise<boolean> {
    const existing = mediaElementRoutingMap.get(el);
    if (existing) {
      if (existing.ctx.state === 'suspended') {
        try {
          await existing.ctx.resume();
        } catch {
          // Ignore resume rejection
        }
      }
      this.sourceNode = existing.source;
      this.gainNode = existing.gain;
      this.webAudioConnected = true;
      el.volume = 1;
      this.syncAudioElementDataset();
      return existing.ctx.state === 'running';
    }

    const ctx = await soundEngine.resumeSharedContext();
    if (!ctx || ctx.state !== 'running') {
      // AudioContext is unavailable or still suspended: stay on native HTML5 <audio> playback
      return false;
    }

    try {
      const source = ctx.createMediaElementSource(el);
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      const initial = clampGain(this.currentGain);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(initial, now);
      source.connect(gain);
      gain.connect(ctx.destination);

      mediaElementRoutingMap.set(el, { ctx, source, gain });
      el.volume = 1;
      this.sourceNode = source;
      this.gainNode = gain;
      this.webAudioConnected = true;
      this.syncAudioElementDataset();
      return true;
    } catch {
      // Smoothly fall back to direct HTMLAudioElement.volume ramping
      return false;
    }
  }

  private clearVolumeRamp(): void {
    if (this.volumeRafId !== null) {
      window.cancelAnimationFrame(this.volumeRafId);
      this.volumeRafId = null;
    }
  }

  private clearPendingPauseTimer(): void {
    if (this.pauseTimerId !== null) {
      window.clearTimeout(this.pauseTimerId);
      this.pauseTimerId = null;
    }
  }

  private clearDuckTimers(): void {
    if (this.wheelRestoreTimerId !== null) {
      window.clearTimeout(this.wheelRestoreTimerId);
      this.wheelRestoreTimerId = null;
    }
    if (this.scannerRestoreTimerId !== null) {
      window.clearTimeout(this.scannerRestoreTimerId);
      this.scannerRestoreTimerId = null;
    }
    if (this.celebrationSwellTimerId !== null) {
      window.clearTimeout(this.celebrationSwellTimerId);
      this.celebrationSwellTimerId = null;
    }
    if (this.celebrationSettleTimerId !== null) {
      window.clearTimeout(this.celebrationSettleTimerId);
      this.celebrationSettleTimerId = null;
    }
    if (this.scratchRestoreTimerId !== null) {
      window.clearTimeout(this.scratchRestoreTimerId);
      this.scratchRestoreTimerId = null;
    }
    if (this.vaultRestoreTimerId !== null) {
      window.clearTimeout(this.vaultRestoreTimerId);
      this.vaultRestoreTimerId = null;
    }
  }

  private rampGainTo(target: number, durationMs: number, fromGain?: number): void {
    const el = this.audioEl;
    if (!el) return;

    const clampedTarget = clampGain(target);
    const routing = mediaElementRoutingMap.get(el);
    const ctx = routing?.ctx ?? soundEngine.getAudioContext();
    const liveGain =
      fromGain !== undefined
        ? fromGain
        : this.webAudioConnected && this.gainNode && ctx && ctx.state === 'running'
          ? this.gainNode.gain.value
          : this.currentGain;
    const startGain = clampGain(liveGain);
    this.targetGain = clampedTarget;
    this.clearVolumeRamp();

    if (this.webAudioConnected && this.gainNode && ctx) {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      try {
        const now = ctx.currentTime;
        const param = this.gainNode.gain;
        param.cancelScheduledValues(now);
        param.setValueAtTime(startGain, now);
        if (durationMs <= 16) {
          param.setValueAtTime(clampedTarget, now);
        } else {
          param.linearRampToValueAtTime(clampedTarget, now + durationMs / 1000);
        }
        el.volume = 1;
        this.currentGain = clampedTarget;
        this.syncAudioElementDataset();
        return;
      } catch {
        // Fall through to HTMLAudioElement.volume ramp fallback
      }
    }

    if (durationMs <= 16) {
      try {
        el.volume = clampedTarget;
      } catch {
        // Ignore read-only volume restrictions on iOS Safari
      }
      this.currentGain = clampedTarget;
      this.syncAudioElementDataset();
      return;
    }

    const startTs = performance.now();
    try {
      el.volume = startGain;
    } catch {
      // Ignore read-only volume restrictions
    }
    this.currentGain = startGain;
    this.syncAudioElementDataset();

    const step = (now: number) => {
      const u = Math.min(1, Math.max(0, (now - startTs) / durationMs));
      const next = clampGain(startGain + (clampedTarget - startGain) * u);
      this.currentGain = next;
      try {
        el.volume = next;
      } catch {
        // Ignore read-only volume restrictions
      }
      this.syncAudioElementDataset();
      if (u < 1) {
        this.volumeRafId = window.requestAnimationFrame(step);
      } else {
        this.volumeRafId = null;
      }
    };

    this.volumeRafId = window.requestAnimationFrame(step);
  }

  private applyEffectiveGain(durationMs: number): void {
    const next = resolveEffectiveMusicGain(this.vibeMode, this.activeDucks);
    this.targetGain = next;
    if (this.isPlaying) {
      this.rampGainTo(next, durationMs);
    } else {
      this.syncAudioElementDataset();
    }
  }

  private readonly handleFirstTapUnlock = (event: Event): void => {
    // Let dedicated TopBar music button or Replay button handle their own click directly
    const target = event.target as Element | null;
    if (target?.closest?.('[data-testid="music-toggle-btn"], [data-testid="replay-intro-btn"]')) {
      return;
    }

    this.detachUnlockListeners();

    if (
      !shouldTriggerAutoplayUnlock({
        awaitingUnlock: this.awaitingUnlock,
        userPaused: this.userPaused,
        isPlaying: this.isPlaying,
      })
    ) {
      return;
    }

    this.awaitingUnlock = false;
    void this.playInternal(UNLOCK_FADE_MS, false);
  };

  private attachUnlockListeners(): void {
    if (typeof window === 'undefined' || this.unlockListenerAttached || this.userPaused) return;
    this.unlockListenerAttached = true;
    window.addEventListener('pointerdown', this.handleFirstTapUnlock, { passive: true });
    window.addEventListener('click', this.handleFirstTapUnlock, { passive: true });
  }

  private detachUnlockListeners(): void {
    if (typeof window === 'undefined' || !this.unlockListenerAttached) return;
    this.unlockListenerAttached = false;
    window.removeEventListener('pointerdown', this.handleFirstTapUnlock);
    window.removeEventListener('click', this.handleFirstTapUnlock);
  }

  private readonly handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      if (this.isPlaying && this.audioEl) {
        this.wasPlayingBeforeHidden = true;
        this.clearPendingPauseTimer();
        this.clearVolumeRamp();
        try {
          this.audioEl.pause();
        } catch {
          // Ignore pause errors
        }
        this.currentGain = 0;
        if (this.webAudioConnected && this.gainNode) {
          const ctx = soundEngine.getAudioContext();
          if (ctx) {
            try {
              const now = ctx.currentTime;
              this.gainNode.gain.cancelScheduledValues(now);
              this.gainNode.gain.setValueAtTime(0, now);
            } catch {
              // Ignore gain reset error
            }
          }
        }
        this.syncAudioElementDataset();
      }
    } else if (this.wasPlayingBeforeHidden && !this.userPaused && this.isPlaying) {
      this.wasPlayingBeforeHidden = false;
      const el = this.audioEl;
      if (!el) return;
      void soundEngine.resumeSharedContext().then(() => {
        if (document.hidden || this.userPaused || !this.isPlaying) return;
        el.playbackRate = 1.0;
        void el
          .play()
          .then(() => {
            if (!this.isPlaying || this.userPaused) {
              el.pause();
              return;
            }
            const nextGain = resolveEffectiveMusicGain(this.vibeMode, this.activeDucks);
            this.rampGainTo(nextGain, VISIBILITY_RESUME_FADE_MS, 0);
          })
          .catch(() => {
            // Silently ignore if browser requires tap after return
            this.isPlaying = false;
            this.showMusicHint = true;
            this.awaitingUnlock = true;
            this.attachUnlockListeners();
            this.emit();
          });
      });
    }
  };

  private ensureVisibilityListener(): void {
    if (typeof document === 'undefined' || this.visibilityListenerAttached) return;
    this.visibilityListenerAttached = true;
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /**
   * Pre-creates the persistent <audio> element with `preload="metadata"` so initial page load
   * and intro video buffering never compete with a multi-MB MP3 download.
   */
  public warmUp(): void {
    this.ensureVisibilityListener();
    this.ensureAudioEl();
  }

  /**
   * Gently upgrades the background MP3 to `preload="auto"` once the intro video is smoothly
   * playing (`currentTime > 1.0`) or during idle warmup — without starting playback.
   */
  public upgradePreloadToAuto(): void {
    if (this.audioPreloadUpgraded || this.isPlaying) return;
    const el = this.ensureAudioEl();
    if (!el) return;
    this.audioPreloadUpgraded = true;
    el.preload = 'auto';
    if (el.readyState < 3 && el.paused) {
      try {
        el.load();
      } catch {
        // Ignore load() errors in minimal environments
      }
    }
  }

  private async playInternal(fadeMs: number, isAutoplayAttempt: boolean): Promise<boolean> {
    const el = this.ensureAudioEl();
    if (!el) return false;
    if (el.preload !== 'auto') {
      el.preload = 'auto';
      this.audioPreloadUpgraded = true;
    }

    this.clearPendingPauseTimer();
    this.wasPlayingBeforeHidden = false;
    el.playbackRate = 1.0;

    // Recover cleanly if a previous load attempt errored
    if (el.error) {
      el.src = BG_MUSIC_SRC;
      try {
        el.load();
      } catch {
        // Ignore reload errors
      }
    }

    const effectiveTarget = resolveEffectiveMusicGain(this.vibeMode, this.activeDucks);
    this.targetGain = effectiveTarget;

    // Kick off AudioContext resume synchronously in parallel WITHOUT awaiting before el.play()
    // so iOS Safari / Android Chrome never lose the user-gesture token prior to el.play()!
    const existingRouting = mediaElementRoutingMap.get(el);
    const ctxResumePromise = existingRouting
      ? existingRouting.ctx.state === 'suspended'
        ? existingRouting.ctx.resume().then(() => existingRouting.ctx).catch(() => existingRouting.ctx)
        : Promise.resolve(existingRouting.ctx)
      : soundEngine.resumeSharedContext();

    // Start cleanly at 0.0 before play() so there is zero volume pop
    if (existingRouting) {
      this.sourceNode = existingRouting.source;
      this.gainNode = existingRouting.gain;
      this.webAudioConnected = true;
      try {
        const now = existingRouting.ctx.currentTime;
        existingRouting.gain.gain.cancelScheduledValues(now);
        existingRouting.gain.gain.setValueAtTime(0, now);
        el.volume = 1;
      } catch {
        // Ignore gain init errors
      }
    } else {
      try {
        el.volume = 0;
      } catch {
        // Ignore volume property restrictions on iOS Safari
      }
    }
    this.currentGain = 0;

    // CRITICAL FOR MOBILE: invoke el.play() synchronously before any await
    const playPromise = el.play();

    try {
      await playPromise;
      // Guard against a manual pause or Replay Intro arriving while play() was resolving
      if (this.userPaused) {
        el.pause();
        this.isPlaying = false;
        this.emit();
        return false;
      }

      // Now that playback is unlocked, attach WeakMap-guarded Web Audio routing ONLY if ctx is running
      await ctxResumePromise;
      await this.tryEnsureWebAudioRouting(el);

      this.isPlaying = true;
      this.showMusicHint = false;
      this.awaitingUnlock = false;
      this.detachUnlockListeners();
      this.rampGainTo(effectiveTarget, fadeMs, 0);
      this.emit();
      return true;
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      this.isPlaying = false;

      if (errName === 'NotAllowedError' || isAutoplayAttempt) {
        // Silently catch blocked mobile autoplay, show pulsing "Tap for music 🎵", and arm passive unlock listener
        if (!this.userPaused) {
          this.showMusicHint = true;
          this.awaitingUnlock = true;
          this.attachUnlockListeners();
        }
      }
      this.emit();
      return false;
    }
  }

  /**
   * Manual tap on "Play Music": clears userPaused, resumes AudioContext if suspended,
   * starts playback, and fades smoothly from 0.0 -> active base gain (0.45 default) over 1.2s.
   */
  public async playManual(fadeMs = MANUAL_PLAY_FADE_MS): Promise<boolean> {
    this.userPaused = false;
    this.awaitingUnlock = false;
    this.showMusicHint = false;
    this.detachUnlockListeners();
    return this.playInternal(fadeMs, false);
  }

  /**
   * Manual tap on "Now Playing": fades smoothly from current gain -> 0.0 over 0.45s,
   * pauses the <audio>, and sets userPaused = true so autoplay listeners never override it.
   */
  public pauseManual(fadeMs = MANUAL_PAUSE_FADE_MS): void {
    this.userPaused = true;
    this.awaitingUnlock = false;
    this.showMusicHint = false;
    this.wasPlayingBeforeHidden = false;
    this.detachUnlockListeners();

    this.fadeOutAndPause(fadeMs, false);
  }

  /**
   * Sequential automatic autoplay right after intro video audio finishes fading to 0 and stops
   * (or immediately after muted intro snap-shut unmounts): fades 0.0 -> 0.45 over 1.5s.
   */
  public async autoplayAfterIntro(fadeMs = AUTOPLAY_HANDOFF_FADE_MS): Promise<boolean> {
    if (this.userPaused || this.isPlaying) {
      return this.isPlaying;
    }
    return this.playInternal(fadeMs, true);
  }

  /**
   * Called on footer "Replay Intro 🎬": smoothly fades MP3 down to 0 (0.4s),
   * pauses it, resets currentTime = 0, and resets button/manual-pause state cleanly.
   */
  public resetForReplayIntro(fadeMs = REPLAY_FADE_OUT_MS): void {
    this.userPaused = false;
    this.awaitingUnlock = false;
    this.showMusicHint = false;
    this.wasPlayingBeforeHidden = false;
    this.detachUnlockListeners();
    this.clearDuckTimers();
    this.activeDucks = {};

    this.fadeOutAndPause(fadeMs, true);
  }

  private fadeOutAndPause(fadeMs: number, resetTime: boolean): void {
    const el = this.audioEl;
    const wasActive = this.isPlaying;
    this.isPlaying = false;
    this.clearPendingPauseTimer();

    if (!el || (!wasActive && el.paused)) {
      this.clearVolumeRamp();
      this.currentGain = 0;
      if (el && resetTime) {
        try {
          el.currentTime = 0;
        } catch {
          // Ignore seek errors before metadata
        }
      }
      this.emit();
      return;
    }

    this.rampGainTo(0, fadeMs);
    this.emit();

    this.pauseTimerId = window.setTimeout(() => {
      this.pauseTimerId = null;
      if (this.isPlaying) return;
      try {
        el.pause();
        if (resetTime) {
          el.currentTime = 0;
        }
      } catch {
        // Ignore pause/seek errors
      }
      this.currentGain = 0;
      this.syncAudioElementDataset();
    }, fadeMs);
  }

  // --- Smart Interactive Audio Ducking Controls ---

  /**
   * Roast Mode (0.40) vs. Wholesome Mode (0.50) with smooth 1.0s transition.
   */
  public setVibeMode(isWholesomeMode: boolean): void {
    const nextMode: MusicVibeMode = isWholesomeMode ? 'wholesome' : 'roast';
    if (this.vibeMode === nextMode) return;
    this.vibeMode = nextMode;
    this.applyEffectiveGain(MODE_TRANSITION_MS);
    this.emit();
  }

  private setDuckChannel(channel: DuckChannel, gain: number | null, rampMs: number): void {
    if (gain === null) {
      delete this.activeDucks[channel];
    } else {
      this.activeDucks[channel] = gain;
    }
    this.applyEffectiveGain(rampMs);
  }

  /**
   * Spin the Wheel: dip to 0.12 (0.3s) while spinning.
   */
  public beginWheelSpin(): void {
    if (this.wheelRestoreTimerId !== null) {
      window.clearTimeout(this.wheelRestoreTimerId);
      this.wheelRestoreTimerId = null;
    }
    this.setDuckChannel('wheel', WHEEL_DUCK_GAIN, WHEEL_DUCK_DOWN_MS);
  }

  /**
   * Spin the Wheel landing: restore to base gain (1.2s) 1.5s after landing.
   */
  public endWheelSpin(): void {
    if (this.wheelRestoreTimerId !== null) {
      window.clearTimeout(this.wheelRestoreTimerId);
    }
    this.wheelRestoreTimerId = window.setTimeout(() => {
      this.wheelRestoreTimerId = null;
      this.setDuckChannel('wheel', null, WHEEL_RESTORE_MS);
    }, WHEEL_RESTORE_DELAY_MS);
  }

  public clearWheelDuck(): void {
    if (this.wheelRestoreTimerId !== null) {
      window.clearTimeout(this.wheelRestoreTimerId);
      this.wheelRestoreTimerId = null;
    }
    if (this.activeDucks.wheel !== undefined) {
      this.setDuckChannel('wheel', null, WHEEL_RESTORE_MS);
    }
  }

  /**
   * Bauni-Meter Hold Scanner: dip to 0.10 (0.25s) while holding.
   */
  public beginScannerHold(): void {
    if (this.scannerRestoreTimerId !== null) {
      window.clearTimeout(this.scannerRestoreTimerId);
      this.scannerRestoreTimerId = null;
    }
    this.setDuckChannel('scanner', SCANNER_DUCK_GAIN, SCANNER_DUCK_DOWN_MS);
  }

  /**
   * Bauni-Meter early release / reset: restore to base gain (0.8s) immediately.
   */
  public endScannerAbort(): void {
    if (this.scannerRestoreTimerId !== null) {
      window.clearTimeout(this.scannerRestoreTimerId);
      this.scannerRestoreTimerId = null;
    }
    if (this.activeDucks.scanner !== undefined) {
      this.setDuckChannel('scanner', null, SCANNER_RESTORE_MS);
    }
  }

  /**
   * Bauni-Meter 99% verdict: hold dip for 1.0s after verdict, then restore (0.8s).
   */
  public endScannerVerdict(): void {
    if (this.scannerRestoreTimerId !== null) {
      window.clearTimeout(this.scannerRestoreTimerId);
    }
    this.scannerRestoreTimerId = window.setTimeout(() => {
      this.scannerRestoreTimerId = null;
      this.setDuckChannel('scanner', null, SCANNER_RESTORE_MS);
    }, SCANNER_VERDICT_HOLD_MS);
  }

  /**
   * Birthday Cake Blowout & Gift Box Reveal:
   * Dip to 0.15 for 0.6s on whoosh/pop SFX -> swell to 0.55 for 3.0s while confetti rains -> settle back to base gain.
   */
  public triggerCelebrationSwell(): void {
    if (this.celebrationSwellTimerId !== null) {
      window.clearTimeout(this.celebrationSwellTimerId);
      this.celebrationSwellTimerId = null;
    }
    if (this.celebrationSettleTimerId !== null) {
      window.clearTimeout(this.celebrationSettleTimerId);
      this.celebrationSettleTimerId = null;
    }

    this.setDuckChannel('celebration', CELEBRATION_DIP_GAIN, CELEBRATION_DIP_RAMP_MS);

    this.celebrationSwellTimerId = window.setTimeout(() => {
      this.celebrationSwellTimerId = null;
      this.setDuckChannel('celebration', CELEBRATION_SWELL_GAIN, CELEBRATION_SWELL_RAMP_MS);

      this.celebrationSettleTimerId = window.setTimeout(() => {
        this.celebrationSettleTimerId = null;
        this.setDuckChannel('celebration', null, CELEBRATION_SETTLE_MS);
      }, CELEBRATION_SWELL_HOLD_MS);
    }, CELEBRATION_DIP_HOLD_MS);
  }

  /**
   * Scratch Card Reveals: dip to 0.22 for 1.2s when a card reveals past 50%, then restore smoothly.
   */
  public triggerScratchReveal(): void {
    if (this.scratchRestoreTimerId !== null) {
      window.clearTimeout(this.scratchRestoreTimerId);
    }
    this.setDuckChannel('scratch', SCRATCH_DUCK_GAIN, SCRATCH_DUCK_RAMP_MS);

    this.scratchRestoreTimerId = window.setTimeout(() => {
      this.scratchRestoreTimerId = null;
      this.setDuckChannel('scratch', null, SCRATCH_RESTORE_MS);
    }, SCRATCH_DUCK_HOLD_MS);
  }

  /**
   * Case File #0721 Folder Open: smoothly duck down to 0.18 over 0.25s
   * so paperclip, cardstock slide, and rubber stamp thud stand out cleanly.
   */
  public beginCaseFileOpen(): void {
    this.setDuckChannel('caseFile', CASE_FILE_DUCK_GAIN, CASE_FILE_DUCK_DOWN_MS);
  }

  /**
   * Case File #0721 Stamp Landed / Cleanup: smoothly restore back to active base gain over 0.9s.
   */
  public endCaseFileOpen(): void {
    if (this.activeDucks.caseFile !== undefined) {
      this.setDuckChannel('caseFile', null, CASE_FILE_RESTORE_MS);
    }
  }

  /**
   * Infinity Gift Vault Unlock (`1845`): duck background music smoothly down to 0.14
   * so orbital hum, Thanos-snap dust, and reward reveal chimes stand out cleanly.
   */
  public beginVaultSequence(): void {
    if (this.vaultRestoreTimerId !== null) {
      window.clearTimeout(this.vaultRestoreTimerId);
      this.vaultRestoreTimerId = null;
    }
    this.setDuckChannel('vault', VAULT_DUCK_GAIN, VAULT_DUCK_DOWN_MS);
  }

  /**
   * Infinity Gift Vault Reward Revealed: hold dip for 1.5s, then restore smoothly back to base gain.
   */
  public scheduleVaultRestore(): void {
    if (this.vaultRestoreTimerId !== null) {
      window.clearTimeout(this.vaultRestoreTimerId);
    }
    this.vaultRestoreTimerId = window.setTimeout(() => {
      this.vaultRestoreTimerId = null;
      if (this.activeDucks.vault !== undefined) {
        this.setDuckChannel('vault', null, VAULT_RESTORE_MS);
      }
    }, VAULT_RESTORE_DELAY_MS);
  }

  /**
   * Infinity Gift Vault Reset (`9876`) or unmount: cancel timer and restore music immediately.
   */
  public endVaultSequenceImmediate(): void {
    if (this.vaultRestoreTimerId !== null) {
      window.clearTimeout(this.vaultRestoreTimerId);
      this.vaultRestoreTimerId = null;
    }
    if (this.activeDucks.vault !== undefined) {
      this.setDuckChannel('vault', null, VAULT_RESTORE_MS);
    }
  }

  public dispose(): void {
    this.clearPendingPauseTimer();
    this.clearVolumeRamp();
    this.clearDuckTimers();
    this.detachUnlockListeners();
    if (typeof document !== 'undefined' && this.visibilityListenerAttached) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
    this.isPlaying = false;
    this.activeDucks = {};
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // Ignore disconnect error
      }
      this.sourceNode = null;
    }
    this.gainNode = null;
    this.webAudioConnected = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.remove();
      } catch {
        // Ignore DOM cleanup error
      }
      this.audioEl = null;
    }
  }
}

export const bgMusicPlayer = new BirthdayMusicPlayer();
