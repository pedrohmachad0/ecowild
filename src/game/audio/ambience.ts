/** Procedural wind and sparse birds. Unlocks on the first gesture. No external audio files. */
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

  update(dt: number, active: boolean): void {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(active ? 0.18 : 0.04, this.ctx.currentTime, 0.3);
    this.timer -= dt;
    if (active && this.timer <= 0) {
      this.timer = 2.5 + Math.random() * 4;
      this.chirp();
    }
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
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }
}
