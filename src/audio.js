export class AudioSystem {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.lastShot = 0;
  }
  enable(value) {
    this.enabled = value;
    if (value) {
      try {
        this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
        this.ctx.resume().catch(() => {});
      } catch {
        this.enabled = false;
      }
    }
    return this.enabled;
  }
  tone(freq, duration = 0.1, type = "square", volume = 0.035, slide) {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide)
      osc.frequency.exponentialRampToValueAtTime(slide, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
  play(event) {
    if (event === "shoot") {
      if (performance.now() - this.lastShot < 90) return;
      this.lastShot = performance.now();
      this.tone(650, 0.045, "square", 0.013, 260);
    }
    if (event === "kill") this.tone(150, 0.09, "triangle", 0.04, 55);
    if (event === "pickup") this.tone(960, 0.07, "sine", 0.026, 1350);
    if (event === "hurt") this.tone(120, 0.17, "sawtooth", 0.05, 40);
    if (event === "dash") this.tone(230, 0.13, "triangle", 0.06, 700);
    if (event === "pulse") {
      this.tone(90, 0.45, "sawtooth", 0.055, 550);
      this.tone(440, 0.5, "sine", 0.04, 55);
    }
    if (event === "repair") {
      this.tone(520, 0.12, "sine", 0.06);
      setTimeout(() => this.tone(780, 0.16, "sine", 0.04), 90);
    }
    if (event === "wave") {
      [260, 330, 390, 520].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.2, "triangle", 0.04), i * 120),
      );
    }
    if (event === "boss") this.tone(65, 0.8, "sawtooth", 0.06, 100);
    if (event === "won") {
      [330, 440, 550, 660, 880].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.35, "triangle", 0.045), i * 150),
      );
    }
    if (event === "lost") {
      [220, 180, 130, 65].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.3, "triangle", 0.05), i * 180),
      );
    }
  }
}
