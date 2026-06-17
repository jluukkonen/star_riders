type Phase = "day" | "evening" | "night" | "storm" | "space";

interface MusicLayer {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  targetVolume: number;
}

const MUSIC_TRACKS: Record<Phase, string[]> = {
  day: ["music/Day/Cherry Blossom.mp3", "music/Day/Glitter Blast.mp3"],
  evening: ["music/Evening/Ethereal Relaxation.mp3", "music/Evening/Pamgaea.mp3"],
  night: ["music/Night/Eighties Action.mp3", "music/Night/Night of Chaos.mp3"],
  storm: ["music/Storm/Almost Bliss.mp3", "music/Storm/Stormfront.mp3"],
  space: ["music/Space/Floating Cities.mp3", "music/Space/Spellbound.mp3"],
};

const FADE_SPEED = 2.0;
const MASTER_MUSIC_VOLUME = 0.35;

export class GlobeMusicManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private layers: Record<Phase, MusicLayer> | null = null;
  private started = false;
  private _muted = false;
  private loaded = false;

  constructor(ctx: AudioContext, analyser?: AnalyserNode) {
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1.0;

    if (analyser) {
      this.masterGain.connect(analyser);
      analyser.connect(ctx.destination);
    } else {
      this.masterGain.connect(ctx.destination);
    }

    this.layers = {
      day: this.createLayer(),
      evening: this.createLayer(),
      night: this.createLayer(),
      storm: this.createLayer(),
      space: this.createLayer(),
    };
  }

  get isReady() { return this.loaded; }
  get isStarted() { return this.started; }

  private createLayer(): MusicLayer {
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.masterGain);
    return { buffer: null, source: null, gain, targetVolume: 0 };
  }

  async init() {
    if (this.loaded || !this.ctx || !this.layers) return;
    await this.loadAllMusic();
    this.loaded = true;
  }

  private async loadAllMusic() {
    const phases: Phase[] = ["day", "evening", "night", "storm", "space"];
    const promises: Promise<void>[] = [];

    for (const phase of phases) {
      const urls = MUSIC_TRACKS[phase];
      const pick = urls[Math.floor(Math.random() * urls.length)];
      const p = (async () => {
        try {
          const res = await fetch(pick);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuf = await res.arrayBuffer();
          this.layers![phase].buffer = await this.ctx.decodeAudioData(arrayBuf);
        } catch (e) {
          console.warn(`GlobeMusicManager: failed to load ${pick} for ${phase}`, e);
        }
      })();
      promises.push(p);
    }

    await Promise.all(promises);
  }

  start() {
    if (this.started || !this.ctx || !this.layers || !this.loaded) return;
    this.started = true;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    for (const phase of ["day", "evening", "night", "storm", "space"] as Phase[]) {
      this.startLayer(this.layers[phase]);
    }
  }

  private startLayer(layer: MusicLayer) {
    if (!layer.buffer || !this.ctx) return;
    const source = this.ctx.createBufferSource();
    source.buffer = layer.buffer;
    source.loop = true;
    source.connect(layer.gain);
    source.start(0);
    layer.source = source;
  }

  /**
   * Set per-phase weights (0–1). Call every frame.
   * Weights are smoothed internally for crossfade.
   */
  setWeights(weights: Partial<Record<Phase, number>>) {
    if (!this.layers) return;
    for (const phase of ["day", "evening", "night", "storm", "space"] as Phase[]) {
      const w = weights[phase] ?? 0;
      this.layers[phase].targetVolume = w * MASTER_MUSIC_VOLUME;
    }
  }

  /** Smooth gain ramping — call every frame with dt. */
  update(dt: number) {
    if (!this.layers) return;
    for (const phase of ["day", "evening", "night", "storm", "space"] as Phase[]) {
      const layer = this.layers[phase];
      const current = layer.gain.gain.value;
      const target = layer.targetVolume;
      const diff = target - current;
      if (Math.abs(diff) < 0.001) {
        layer.gain.gain.value = target;
      } else {
        layer.gain.gain.value = current + diff * Math.min(1, FADE_SPEED * dt);
      }
    }
  }

  pause() {
    if (!this.layers) return;
    for (const phase of ["day", "evening", "night", "storm", "space"] as Phase[]) {
      const layer = this.layers[phase];
      if (layer.source) {
        try { layer.source.stop(); } catch (e) {}
        layer.source.disconnect();
        layer.source = null;
      }
    }
    this.started = false;
  }

  dispose() {
    this.pause();
    if (this.layers) {
      for (const phase of ["day", "evening", "night", "storm", "space"] as Phase[]) {
        const layer = this.layers[phase];
        layer.gain.disconnect();
      }
    }
    this.masterGain.disconnect();
    this.layers = null;
    this.started = false;
    this.loaded = false;
  }
}
