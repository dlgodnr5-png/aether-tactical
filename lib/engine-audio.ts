"use client";

/**
 * Cinematic jet engine audio generator (Web Audio API).
 *
 * Layers:
 *  1. Sub-bass drone (sine @ 35-60Hz) — chest rumble
 *  2. Mid whine (two detuned sawtooth @ 120-340Hz) — turbine whine
 *  3. Harmonic scream (square @ 2-4x whine) — high jet scream
 *  4. Roar (bandpass-filtered pink noise) — exhaust roar
 *  5. Slow LFO vibrato on pitch
 *  6. Master compressor → limiter for cinematic punch
 *
 * Transient helpers (one-shot): launchStinger, missileWhoosh, explosion,
 * bombRelease, lockOn.
 */

class EngineAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Sub-bass
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;

  // Whine
  private whineOsc1: OscillatorNode | null = null;
  private whineOsc2: OscillatorNode | null = null;
  private whineGain: GainNode | null = null;

  // Scream harmonic
  private screamOsc: OscillatorNode | null = null;
  private screamGain: GainNode | null = null;
  private screamFilter: BiquadFilterNode | null = null;

  // Roar
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  // Vibrato
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
    const ctx = this.ctx;

    // --- Master chain: layers → compressor → master gain → destination ---
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.28;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // --- Sub-bass drone (Deep chest rumble) ---
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0.55;
    this.subOsc = ctx.createOscillator();
    this.subOsc.type = "sine";
    this.subOsc.frequency.value = 38;
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.compressor);

    // --- Whine (Turbine scream) ---
    this.whineGain = ctx.createGain();
    this.whineGain.gain.value = 0.25;
    this.whineGain.connect(this.compressor);

    this.whineOsc1 = ctx.createOscillator();
    this.whineOsc1.type = "sawtooth";
    this.whineOsc1.frequency.value = 135;
    this.whineOsc1.connect(this.whineGain);

    this.whineOsc2 = ctx.createOscillator();
    this.whineOsc2.type = "sawtooth";
    this.whineOsc2.frequency.value = 142;
    this.whineOsc2.connect(this.whineGain);

    // --- High harmonic scream (Jet whistle) ---
    this.screamFilter = ctx.createBiquadFilter();
    this.screamFilter.type = "bandpass";
    this.screamFilter.frequency.value = 2200;
    this.screamFilter.Q.value = 4;
    this.screamGain = ctx.createGain();
    this.screamGain.gain.value = 0.12;
    this.screamOsc = ctx.createOscillator();
    this.screamOsc.type = "square";
    this.screamOsc.frequency.value = 440;
    this.screamOsc.connect(this.screamFilter);
    this.screamFilter.connect(this.screamGain);
    this.screamGain.connect(this.compressor);

    // --- Roar (Pink noise with random jitter for wind/exhaust) ---
    const sampleRate = ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.0555179;
      b1 = 0.985 * b1 + w * 0.075;
      b2 = 0.93 * b2 + w * 0.12;
      data[i] = b0 + b1 + b2 + w * 0.22;
    }

    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = "lowpass";
    this.noiseFilter.frequency.value = 450;
    this.noiseFilter.Q.value = 1.0;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.65;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.compressor);

    // --- LFO for asymmetric rumble jitter ---
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 4.5;
    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 12;
    this.lfo.connect(this.lfoGain);
    if (this.whineOsc1) this.lfoGain.connect(this.whineOsc1.frequency);
    if (this.noiseFilter) this.lfoGain.connect(this.noiseFilter.frequency);


    // Start
    this.subOsc.start();
    this.whineOsc1.start();
    this.whineOsc2.start();
    this.screamOsc.start();
    this.noiseSource.start();
    this.lfo.start();

    this.applyThrottle(this.throttle);
  }

  stop() {
    if (!this.started || !this.ctx) return;
    this.started = false;
    try {
      this.subOsc?.stop();
      this.whineOsc1?.stop();
      this.whineOsc2?.stop();
      this.screamOsc?.stop();
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
    // Sub-bass deepens + swells with throttle
    this.subOsc?.frequency.setTargetAtTime(35 + t * 28, now, 0.25);
    this.subGain?.gain.setTargetAtTime(0.22 + t * 0.5, now, 0.25);
    // Whine rises
    const basePitch = 120 + t * 240;
    this.whineOsc1?.frequency.setTargetAtTime(basePitch, now, 0.18);
    this.whineOsc2?.frequency.setTargetAtTime(basePitch * 1.045, now, 0.18);
    // Scream tracks 3x whine, opens with throttle
    this.screamOsc?.frequency.setTargetAtTime(basePitch * 2.85, now, 0.18);
    this.screamFilter?.frequency.setTargetAtTime(1400 + t * 2400, now, 0.25);
    this.screamGain?.gain.setTargetAtTime(0.03 + t * 0.13, now, 0.25);
    // Roar
    this.noiseFilter?.frequency.setTargetAtTime(300 + t * 1600, now, 0.2);
    this.noiseGain?.gain.setTargetAtTime(0.28 + t * 0.55, now, 0.2);
    // Master swell
    this.masterGain?.gain.setTargetAtTime(0.14 + t * 0.24, now, 0.25);
  }

  // ============ One-shot cinematic stingers ============

  /** Epic launch horn — massive brass-like down-up swell on deploy/launch */
  launchStinger() {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);
    g.connect(this.compressor);

    // Brass-like stack (3 detuned saws, slight pitch rise)
    const freqs = [65, 98, 131]; // C2, G2, C3
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f * 0.94, ctx.currentTime);
      o.frequency.linearRampToValueAtTime(f, ctx.currentTime + 0.35);
      const og = ctx.createGain();
      og.gain.value = 0.22;
      o.connect(og).connect(g);
      o.start();
      o.stop(ctx.currentTime + 2.05);
    }
    // Filter sweep for cinematic feel
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(300, ctx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.6);
    filt.Q.value = 3;
    g.connect(filt).connect(this.compressor);
  }

  missileWhoosh() {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const dur = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.compressor);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(2400, ctx.currentTime);
    bp.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + dur);
    bp.Q.value = 2;
    noise.connect(bp).connect(g);

    // Low pitch sweep under it
    const sub = ctx.createOscillator();
    sub.type = "sawtooth";
    sub.frequency.setValueAtTime(180, ctx.currentTime);
    sub.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + dur);
    const subg = ctx.createGain();
    subg.gain.setValueAtTime(0.35, ctx.currentTime);
    subg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    sub.connect(subg).connect(this.compressor);

    noise.start();
    sub.start();
    noise.stop(ctx.currentTime + dur);
    sub.stop(ctx.currentTime + dur);
  }

  explosion() {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const dur = 1.2;

    // Massive sub thump
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(1.0, ctx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g1.connect(this.compressor);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + dur);
    osc.connect(g1);
    osc.start();
    osc.stop(ctx.currentTime + dur);

    // Crackle debris
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.7, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g2.connect(this.compressor);
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1200, ctx.currentTime);
    lp.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur);
    noise.connect(lp).connect(g2);
    noise.start();
    noise.stop(ctx.currentTime + dur);
  }

  bombRelease() {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const dur = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.85, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.compressor);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(75, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(22, ctx.currentTime + dur);
    osc.connect(g);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  /** Quick "target lock" ping (sharp metallic) */
  lockOn() {
    if (!this.ctx || !this.compressor) return;
    const ctx = this.ctx;
    const dur = 0.18;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    g.connect(this.compressor);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.connect(g);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2700, ctx.currentTime + 0.05);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, ctx.currentTime + 0.05);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur + 0.05);
    osc2.connect(g2).connect(this.compressor);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + dur + 0.08);
  }

  /** Run audio routines even when engine loop is off (for menu SFX) */
  ensureContext() {
    if (!this.ctx) this.start();
  }
}

export const engineAudio = new EngineAudio();
