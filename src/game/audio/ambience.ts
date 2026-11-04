/** Procedural wind, birds by day, crickets and toads at night. Unlocks on the first gesture. No external audio files. */
export class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: AudioBufferSourceNode | null = null;
  private timer = 0;
  private started = false;

  start(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.94 + white * 0.06;
      data[i] = last * 0.8;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    source.connect(filter);
    filter.connect(master);
    source.start();
    this.ctx = ctx;
    this.master = master;
    this.wind = source;
    this.started = true;
    void ctx.resume();
  }

  update(dt: number, active: boolean, period: "night" | "dawn" | "day" | "dusk" = "day"): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(active ? 0.18 : 0.04, this.ctx.currentTime, 0.3);
    this.timer -= dt;
    if (active && this.timer <= 0) {
      if (period === "night") {
        this.timer = 0.6 + Math.random() * 1.4;
        if (Math.random() < 0.25) this.croak(); else this.cricket();
      } else {
        this.timer = period === "day" ? 2.5 + Math.random() * 4 : 1.2 + Math.random() * 2;
        this.chirp();
      }
    }
  }

  /** Short shutter click for photos. */
  shutter(): void {
    this.tone("square", 2200, 0.04, 0.05);
    window.setTimeout(() => this.tone("square", 1600, 0.03, 0.04), 60);
  }

  private cricket(): void {
    for (let i = 0; i < 3; i++) window.setTimeout(() => this.tone("sine", 4300 + Math.random() * 300, 0.03, 0.025), i * 70);
  }

  private croak(): void { this.tone("sawtooth", 140 + Math.random() * 40, 0.22, 0.05); }

  private tone(type: OscillatorType, frequency: number, length: number, volume: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator(), gain = this.ctx.createGain(), t = this.ctx.currentTime;
    osc.type = type; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain); gain.connect(this.master);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start(t); osc.stop(t + length + 0.02);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  dispose(): void {
    this.wind?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }

  private chirp(): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1400 + Math.random() * 900;
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(this.master);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}
