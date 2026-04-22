"use client";

/**
 * Game-level SFX registry — the full sound palette for Aether Tactical.
 *
 * Keeps `lib/audio.ts` (which powers the UI chrome: nav/press/lock/boot)
 * untouched. This module is for in-game action sounds.
 *
 * Design:
 *   - Each SFX id maps to one or more CC0 audio files (fallback chain).
 *   - First play lazy-initializes a pool of <audio> voices (up to 4) to
 *     allow rapid-fire triggers (e.g. cannon bursts) without cutting off.
 *   - Missing files are swallowed silently (console.warn in dev) so the
 *     game stays playable while assets are being gathered.
 *   - Global mute state is mirrored from localStorage `sfx:muted`.
 *
 * Asset collection — run `scripts/download-sfx.mjs` once CC0 sources are
 * chosen (see public/audio/README.md).
 */

export type SfxId =
  | "carrier_catapult"    // 항모 카타펄트 이륙 (3~4초)
  | "afterburner_loop"    // 크루즈 엔진 루프 (20~30초 루프 가능)
  | "cannon_burst"        // 기관포 3연발 (0.3초)
  | "missile_launch"      // 미사일 발사음 (짧은 펑)
  | "missile_flight"      // 미사일 비행음 (쉬이익)
  | "explosion_large"     // 대형 폭발 (목표 타격)
  | "explosion_small"     // 소형 폭발 (적기 격추)
  | "radar_lock"          // 레이더 락온 비프
  | "warning_beep"        // 경고 (낮은 HP, 범위 초과 등)
  | "hit_confirm"         // 명중 확인음 (상쾌한 팅)
  | "miss_thud";          // 빗맞음 (둔탁한 탁)

/**
 * Registry. Arrays allow fallbacks — first URL that successfully loads wins.
 * All paths are relative to /public (served at site root).
 */
const REGISTRY: Record<SfxId, string[]> = {
  carrier_catapult:  ["/audio/sfx/carrier-catapult/main.mp3"],
  afterburner_loop:  ["/audio/sfx/engine-loop/afterburner.mp3"],
  cannon_burst:      ["/audio/sfx/cannon/burst.mp3"],
  missile_launch:    ["/audio/sfx/missile-launch/main.mp3"],
  missile_flight:    ["/audio/sfx/missile-flight/whoosh.mp3"],
  explosion_large:   ["/audio/sfx/explosion/large.mp3"],
  explosion_small:   ["/audio/sfx/explosion/small.mp3"],
  radar_lock:        ["/audio/sfx/lock-on/beep.mp3"],
  warning_beep:      ["/audio/sfx/warning/alert.mp3"],
  hit_confirm:       ["/audio/sfx/confirm/hit.mp3"],
  miss_thud:         ["/audio/sfx/confirm/miss.mp3"],
};

const VOICES = 4;
const MUTE_KEY = "sfx:muted";

type Pool = { voices: HTMLAudioElement[]; idx: number; loaded: boolean };

class SfxBus {
  private pools = new Map<SfxId, Pool>();
  private _muted = false;
  private _inited = false;

  init() {
    if (this._inited || typeof window === "undefined") return;
    this._inited = true;
    try {
      this._muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* ignore */
    }
  }

  get muted() {
    return this._muted;
  }

  setMuted(v: boolean) {
    this._muted = v;
    try {
      window.localStorage.setItem(MUTE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  /** Fire-and-forget. Safe to call before init(); will no-op on SSR. */
  play(id: SfxId, opts?: { volume?: number; rate?: number }) {
    if (typeof window === "undefined") return;
    this.init();
    if (this._muted) return;

    let pool = this.pools.get(id);
    if (!pool) {
      const urls = REGISTRY[id];
      const voices: HTMLAudioElement[] = [];
      for (let i = 0; i < VOICES; i++) {
        const a = new Audio();
        a.preload = "auto";
        a.src = urls[0];
        a.addEventListener("error", () => {
          // Try next fallback URL once; after that give up quietly
          const next = urls[1];
          if (next && a.src !== next) {
            a.src = next;
          } else if (process.env.NODE_ENV !== "production") {
            console.warn(`[sfx] failed to load ${id} from ${urls.join(" / ")}`);
          }
        });
        voices.push(a);
      }
      pool = { voices, idx: 0, loaded: true };
      this.pools.set(id, pool);
    }

    const voice = pool.voices[pool.idx % VOICES];
    pool.idx++;
    try {
      voice.currentTime = 0;
      voice.volume = opts?.volume ?? 0.7;
      voice.playbackRate = opts?.rate ?? 1;
      const p = voice.play();
      if (p && typeof p.catch === "function") p.catch(() => {/* autoplay blocked */});
    } catch {
      /* ignore */
    }
  }

  /** Start a looping channel (for engine loop). Returns a stop fn. */
  loop(id: SfxId, opts?: { volume?: number }): () => void {
    if (typeof window === "undefined") return () => {};
    this.init();
    const urls = REGISTRY[id];
    const el = new Audio(urls[0]);
    el.loop = true;
    el.volume = opts?.volume ?? 0.4;
    if (!this._muted) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
    return () => {
      try {
        el.pause();
        el.src = "";
      } catch {
        /* ignore */
      }
    };
  }
}

export const sfx = new SfxBus();
