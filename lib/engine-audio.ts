"use client";

/**
 * Procedural jet engine sound generator using Web Audio API.
 * - Two detuned sawtooth oscillators form the engine "whine"
 * - Band-filtered noise provides the roar
 * - A slow LFO adds organic vibrato
 * - Master gain + throttle control
 * - Missile-launch whoosh and explosion boom are one-shot helpers
 */

class EngineAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private whineOsc1: OscillatorNode | null = null;
  private whineOsc2: OscillatorNode | null = null;
  private whineGain: GainNode | null = null;

  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private started = false;

  private throttle = 0.5;

  start() {
    if (this.started) return;
    if (typeof window === "undefined") return;
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.started = true;

    // --- Master ---
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.18;
    this.masterGain.connect(this.ctx.destination);

    // --- Whine (two detuned saws) ---
    this.whineGain = this.ctx.createGain();
    this.whineGain.gain.value = 0.25;
    this.whineGain.connect(this.masterGain);

    this.whineOsc1 = this.ctx.createOscillator();
    this.whineOsc1.type = "sawtooth";
    this.whineOsc1.frequency.value = 140;
    this.whineOsc1.connect(this.whineGain);

    this.whineOsc2 = this.ctx.createOscillator();
    this.whineOsc2.type = "sawtooth";
    this.whineOsc2.frequency.value = 146;
    this.whineOsc2.connect(this.whineGain);

    // --- Roar (filtered white noise loop) ---
    const sampleRate = this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 380;
    this.noiseFilter.Q.value = 0.9;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.55;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    // --- LFO vibrato ---
    this.lfo = this.ctx.createOscillator();
    this.lfo.frequency.value = 3;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 5;
    this.lfo.connect(this.lfoGain);
    if (this.whineOsc1) this.lfoGain.connect(this.whineOsc1.frequency);
    if (this.whineOsc2) this.lfoGain.connect(this.whineOsc2.frequency);

    // Start everything
    this.whineOsc1.start();
    this.whineOsc2.start();
    this.noiseSource.start();
    this.lfo.start();

    this.applyThrottle(this.throttle);
  }

  stop() {
    if (!this.started || !this.ctx) return;
    this.started = false;
    try {
      this.whineOsc1?.stop();
      this.whineOsc2?.stop();
      this.noiseSource?.stop();
      this.lfo?.stop();
    } catch {
      /* already stopped */
    }
    this.ctx.close();
    this.ctx = null;
  }

  setThrottle(t: number) {
    this.throttle = Math.max(0, Math.min(1, t));
    this.applyThrottle(this.throttle);
  }

  private applyThrottle(t: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Whine pitch rises with throttle
    const basePitch = 120 + t * 220;
    this.whineOsc1?.frequency.setTargetAtTime(basePitch, now, 0.18);
    this.whineOsc2?.frequency.setTargetAtTime(basePitch * 1.045, now, 0.18);
    // Roar volume + filter open with throttle
    this.noiseFilter?.frequency.setTargetAtTime(300 + t * 1400, now, 0.2);
    this.noiseGain?.gain.setTargetAtTime(0.3 + t * 0.6, now, 0.2);
    // Master volume scales gently
    this.masterGain?.gain.setTargetAtTime(0.09 + t * 0.22, now, 0.25);
  }

  /** One-shot missile-launch whoosh */
  missileWhoosh() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const dur = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.masterGain);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur);
    bp.Q.value = 1.5;

    noise.connect(bp).connect(g);
    noise.start();
    noise.stop(ctx.currentTime + dur);
  }

  /** Explosion boom */
  explosion() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const dur = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.8, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.masterGain);

    // Sub-bass thump
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + dur);
    osc.connect(g);
    osc.start();
    osc.stop(ctx.currentTime + dur);

    // Crackle noise
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    noise.connect(lp).connect(g);
    noise.start();
    noise.stop(ctx.currentTime + dur);
  }

  /** Bomb release thud */
  bombRelease() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const dur = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.masterGain);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + dur);
    osc.connect(g);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
}

export const engineAudio = new EngineAudio();
