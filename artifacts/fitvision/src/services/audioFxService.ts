class AudioFxService {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Play a clean synth tone (sine or triangle)
   */
  public playTone(freq: number, durationSec: number = 0.12, type: OscillatorType = "sine", gainLevel: number = 0.15) {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);
    } catch {
      /* ignore audio context restrictions */
    }
  }

  /**
   * Countdown beeps for 3, 2, 1
   */
  public playCountdownBeep(n: number) {
    if (n > 0) {
      // Short focused pip
      this.playTone(520, 0.10, "sine", 0.18);
    } else {
      // High triumphant GO chime
      this.playTone(880, 0.28, "triangle", 0.22);
    }
  }

  /**
   * Set completion chime (Ascending major triad C5 -> E5 -> G5)
   */
  public playSetComplete() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        window.setTimeout(() => {
          this.playTone(freq, 0.18, "triangle", 0.2);
        }, idx * 75);
      });
    } catch {
      /* ignore */
    }
  }

  /**
   * Full workout celebration fanfare chord
   */
  public playVictoryFanfare() {
    if (this.muted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const chord = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      chord.forEach((freq, idx) => {
        window.setTimeout(() => {
          this.playTone(freq, 0.45, "triangle", 0.25);
        }, idx * 110);
      });
    } catch {
      /* ignore */
    }
  }
}

export const audioFx = new AudioFxService();
