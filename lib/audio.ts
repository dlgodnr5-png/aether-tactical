"use client";

type SfxId = "nav" | "press" | "lock" | "boot";

// 존재하는 BGM 파일만 포함. public/audio/bgm/menu, /combat, /cinematic 디렉터리는
// 비어있어 풀에 등록하면 랜덤 선택 시 404 → play() 실패 → engaged가 조용히 false로 revert됨.
// 새 BGM 파일을 드롭하면 이 배열에 경로 추가하는 방식으로 확장.
const BGM_POOL = [
  "/audio/bgm/cyber-news.mp3",
];

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
  private currentBgmIdx = 0;
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
    
    // Pick a random BGM from the pool for variety each session
    this.currentBgmIdx = Math.floor(Math.random() * BGM_POOL.length);
    this.bgmEl = new Audio(BGM_POOL[this.currentBgmIdx]);
    this.bgmEl.loop = true;
    this.bgmEl.volume = 0.25;
    this.bgmEl.preload = "auto";

    (Object.keys(SFX_SRC) as SfxId[]).forEach((id) => {
      for (let i = 0; i < VOICES; i++) {
        const a = new Audio(SFX_SRC[id]);
        a.preload = "auto";
        a.volume = id === "press" ? 0.3 : 0.45;
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
      // 현재 선택된 BGM으로 play 시도 → 404/디코딩 실패 시 풀의 다른 트랙으로 재시도.
      // 모두 실패해야 engaged를 revert하므로, 일부 파일이 없어도 한 곡만 살아있으면 동작한다.
      let played = false;
      for (let attempt = 0; attempt < BGM_POOL.length; attempt++) {
        try {
          await this.bgmEl?.play();
          played = true;
          break;
        } catch {
          const next = (this.currentBgmIdx + 1) % BGM_POOL.length;
          if (next === this.currentBgmIdx) break; // pool 크기 1 — 순환 불가
          this.currentBgmIdx = next;
          if (this.bgmEl) {
            this.bgmEl.src = BGM_POOL[next];
            this.bgmEl.load();
          }
        }
      }
      if (!played) {
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
