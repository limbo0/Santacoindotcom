/**
 * Synthesised sound effects (Web Audio API, no audio files).
 *
 * Browsers only allow audio after a user gesture, so call `unlock()` from
 * input handlers; until then sounds are silently skipped or queued on a
 * suspended context. Cosmetic only: nothing here affects game rules.
 */
import type { GameEvent } from "./sim";

export type SoundName = "start" | "drop" | "hit" | "perfect" | "combo" | "extra" | "miss" | "passed" | "lifeUp" | "over";

const MASTER = 0.8;
// Major pentatonic steps (semitones) so rising streak notes always sound pleasant.
const PENTATONIC = [0, 2, 4, 7, 9];
const C6 = 1046.5;

const semis = (base: number, n: number) => base * 2 ** (n / 12);

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  slideTo?: number;
}

interface NoiseOpts {
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  gain?: number;
  slideTo?: number;
}

export class SoundBoard {
  private ctx: BaseAudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private lastMultiplier = 1;
  muted = false;

  /** Create or resume the audio context. Safe to call repeatedly; call from user input. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.attach(new AC());
    }
    const ctx = this.ctx;
    if (ctx && "resume" in ctx && ctx.state === "suspended") {
      (ctx as AudioContext).resume().catch(() => {});
    }
  }

  /** Wire the sound graph to a context (also used with OfflineAudioContext for testing). */
  attach(ctx: BaseAudioContext): void {
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : MASTER;
    master.connect(comp).connect(ctx.destination);
    this.out = master;

    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.out) this.out.gain.setTargetAtTime(muted ? 0 : MASTER, this.ctx.currentTime, 0.02);
  }

  reset(): void {
    this.lastMultiplier = 1;
  }

  /** React to the events produced by one simulation step. */
  handle(events: GameEvent[], streak: number): void {
    for (const e of events) {
      switch (e.type) {
        case "drop":
          this.play("drop");
          break;
        case "hit":
          this.play(e.perfect ? "perfect" : "hit", { streak });
          if (e.multiplier > this.lastMultiplier) this.play("combo", { delay: 0.12 });
          this.lastMultiplier = e.multiplier;
          break;
        case "extra":
          this.play("extra");
          break;
        case "miss":
          this.play("miss");
          this.lastMultiplier = 1;
          break;
        case "passed":
          this.play("passed");
          this.lastMultiplier = 1;
          break;
        case "life":
          if (e.delta > 0) this.play("lifeUp", { delay: 0.15 });
          break;
        case "over":
          this.play("over", { delay: 0.35 });
          break;
      }
    }
  }

  play(name: SoundName, opts: { streak?: number; delay?: number; at?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || this.muted) return;
    const t = (opts.at ?? ctx.currentTime) + (opts.delay ?? 0) + 0.005;

    switch (name) {
      case "start":
        this.jingle(t, 6, 0.09);
        this.bell(C6, t + 0.05, 0.16);
        this.bell(semis(C6, 7), t + 0.17, 0.16);
        break;
      case "drop":
        this.tone(620, t, 0.1, { type: "triangle", gain: 0.13, slideTo: 300 });
        this.noiseBurst(t, 0.09, { filter: "bandpass", freq: 1800, q: 1.2, gain: 0.05, slideTo: 500 });
        break;
      case "hit":
      case "perfect": {
        const i = Math.max(0, (opts.streak ?? 1) - 1) % 10;
        const note = semis(C6, PENTATONIC[i % 5] + 12 * Math.floor(i / 5));
        this.noiseBurst(t, 0.12, { filter: "lowpass", freq: 420, gain: 0.16 }); // gift lands in the chimney
        this.bell(note, t + 0.02, 0.2);
        if (name === "perfect") {
          this.bell(note * 2, t + 0.09, 0.09, 0.6);
          this.bell(semis(note * 2, 4), t + 0.15, 0.07, 0.5);
          this.jingle(t + 0.04, 2, 0.05);
        }
        break;
      }
      case "combo":
        [0, 4, 7, 12].forEach((n, k) =>
          this.tone(semis(C6, n), t + k * 0.065, 0.2, { type: "triangle", gain: 0.12 }),
        );
        break;
      case "extra":
        this.noiseBurst(t, 0.1, { filter: "lowpass", freq: 500, gain: 0.14 });
        break;
      case "miss":
        this.tone(190, t, 0.24, { type: "sine", gain: 0.4, slideTo: 55 });
        this.noiseBurst(t, 0.16, { filter: "lowpass", freq: 650, gain: 0.22, slideTo: 200 });
        break;
      case "passed":
        this.tone(392, t, 0.16, { type: "triangle", gain: 0.26, slideTo: 370 });
        this.tone(311, t + 0.17, 0.32, { type: "triangle", gain: 0.26, slideTo: 277 });
        break;
      case "lifeUp":
        this.bell(semis(C6, 7), t, 0.14);
        this.bell(semis(C6, 12), t + 0.1, 0.14);
        this.jingle(t, 3, 0.07);
        break;
      case "over":
        [7, 4, 0, -5].forEach((n, k) =>
          this.tone(semis(C6 / 2, n), t + k * 0.2, k === 3 ? 0.7 : 0.22, { type: "triangle", gain: 0.26 }),
        );
        break;
    }
  }

  // --- primitives -----------------------------------------------------------

  private tone(freq: number, t: number, dur: number, o: ToneOpts = {}): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    const g = ctx.createGain();
    const peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.out!);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  /** Bell: a few inharmonic partials with fast-decaying highs. */
  private bell(freq: number, t: number, gain: number, dur = 0.9): void {
    const partials: [number, number][] = [
      [1, 1],
      [2, 0.45],
      [2.76, 0.3],
      [5.4, 0.14],
      [8.93, 0.06],
    ];
    for (const [ratio, amp] of partials) {
      this.tone(freq * ratio, t, dur / Math.sqrt(ratio), { gain: gain * amp, attack: 0.002 });
    }
  }

  private noiseBurst(t: number, dur: number, o: NoiseOpts = {}): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? "bandpass";
    filter.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.slideTo) filter.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
    filter.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain ?? 0.1, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.out!);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
  }

  /** Sleigh-bell shake: bright filtered noise plus tiny metallic pings. */
  private jingle(t: number, shakes: number, gain: number): void {
    for (let i = 0; i < shakes; i++) {
      const at = t + i * 0.075 + (i % 2) * 0.012;
      this.noiseBurst(at, 0.07, { filter: "bandpass", freq: 7200, q: 3, gain });
      this.tone(2650 + (i % 3) * 410, at, 0.12, { gain: gain * 0.35, attack: 0.001 });
      this.tone(3920 + (i % 2) * 300, at + 0.004, 0.09, { gain: gain * 0.22, attack: 0.001 });
    }
  }
}

// --- mute preference (per browser) -------------------------------------------

const MUTE_KEY = "santacoindotcom:muted";
const muteListeners = new Set<() => void>();

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable: preference just won't persist */
  }
  muteListeners.forEach((l) => l());
}

export function subscribeMuted(l: () => void): () => void {
  muteListeners.add(l);
  return () => muteListeners.delete(l);
}
