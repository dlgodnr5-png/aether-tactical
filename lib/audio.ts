"use client";

type SfxId = "nav" | "press" | "lock" | "boot";

const BGM_SRC = "/audio/bgm/cyber-news.mp3";
const SFX_SRC: Record<SfxId, string> = {
  nav: "/audio/sfx/nav.mp3",
  press: "/audio/sfx/press.mp3",
  lock: "/audio/sfx/lock.mp3",
  boot: "/audio/sfx/boot.mp3",
};

const ENGAGED_KEY = "audio:engaged";
const VOICES = 3;

class AudioBus {
  private bgmEl: HTMLAudioElement | null = null;
  private sfxPool: Record<SfxId, HTMLAudioElement[]> = {
    nav: [], press: [], lock: [], boot: [],
  };
  private poolIndex: Record<SfxId, number> = {
    nav: 0, press: 0, lock: 0, boot: 0,
  };
  private listeners = new Set<(engaged: boolean) => void>();
  private _engaged = false;
  private _loaded = false;

  get engaged() { return this._engaged; }

  init() {
    if (this._loaded || typeof window === "undefined") return;
    this._loaded = true;
    this.bgmEl = new Audio(BGM_SRC);
    this.bgmEl.loop = true;
    this.bgmEl.volume = 0.3;
    this.bgmEl.preload = "auto";
    (Object.keys(SFX_SRC) as SfxId[]).forEach((id) => {
      for (let i = 0; i < VOICES; i++) {
        const a = new Audio(SFX_SRC[id]);
        a.preload = "auto";
        a.volume = id === "press" ? 0.35 : 0.5;
        this.sfxPool[id].push(a);
      }
    });
    const stored = window.localStorage.getItem(ENGAGED_KEY);
    this._engaged = stored === "1";
  }

  subscribe(fn: (engaged: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.listeners.forEach((fn) => fn(this._engaged));
  }

  async toggle() {
    this.init();
    this._engaged = !this._engaged;
    window.localStorage.setItem(ENGAGED_KEY, this._engaged ? "1" : "0");
    if (this._engaged) {
      try {
        await this.bgmEl?.play();
      } catch {
        this._engaged = false;
        window.localStorage.setItem(ENGAGED_KEY, "0");
      }
    } else {
      this.bgmEl?.pause();
    }
    this.emit();
  }

  sfx(id: SfxId) {
    if (!this._engaged) return;
    const pool = this.sfxPool[id];
    if (!pool || pool.length === 0) return;
    const idx = this.poolIndex[id];
    const voice = pool[idx];
    this.poolIndex[id] = (idx + 1) % pool.length;
    try {
      voice.currentTime = 0;
      const p = voice.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* autoplay blocked silently */
    }
  }
}

export const audioBus = new AudioBus();
