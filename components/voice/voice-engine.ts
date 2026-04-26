"use client";

/**
 * Voice Engine — 한국어 음성 안내.
 *
 * 우선순위:
 *  1. 사전 합성 mp3 (`/public/audio/voice/{id}.mp3`) — melotts 등으로 미리 생성
 *  2. Web Speech API (브라우저 내장) — OS 음성 사용, 폴백
 *  3. silent (둘 다 안 되면)
 *
 * 사전 합성 권장 — Web Speech 한국어 음성은 OS 별 품질 편차 큼.
 * 합성 스크립트: scripts/generate-voice.mjs (melotts 또는 외부)
 *
 * Usage:
 *   import { voice } from "@/components/voice/voice-engine";
 *   voice.play("mission_start");
 *   voice.play("missile_low", { interrupt: true });
 */

export type VoiceId =
  | "mission_start"      // "미션 시작"
  | "target_locked"      // "타겟 락온"
  | "missile_low"        // "포탄 잔량 부족"
  | "missile_critical"   // "포탄 마지막 1발"
  | "missile_empty"      // "포탄 소진"
  | "warning_sam"        // "위험: 지대공 미사일"
  | "warning_drone"      // "위험: 적 드론"
  | "mission_success"    // "임무 성공"
  | "mission_failed"     // "임무 실패"
  | "altitude_warning"   // "고도 경고"
  | "entering_space";    // "우주 진입";

const VOICE_TEXT: Record<VoiceId, string> = {
  mission_start: "미션 시작",
  target_locked: "타겟 락온",
  missile_low: "포탄 잔량 부족",
  missile_critical: "포탄 마지막 한 발",
  missile_empty: "포탄 소진. 충전 필요",
  warning_sam: "위험. 지대공 미사일 접근",
  warning_drone: "위험. 적 드론 감지",
  mission_success: "임무 성공",
  mission_failed: "임무 실패",
  altitude_warning: "고도 경고",
  entering_space: "우주 진입",
};

interface PlayOptions {
  /** 다른 음성 진행 중이면 차단 (false) 또는 가로채기 (true). 기본 false. */
  interrupt?: boolean;
  /** 볼륨 0.0 ~ 1.0. 기본 0.7. */
  volume?: number;
}

class VoiceEngine {
  private cache: Map<VoiceId, HTMLAudioElement | null> = new Map();
  private current: HTMLAudioElement | null = null;
  private currentSpeech: SpeechSynthesisUtterance | null = null;
  private synthVoiceKo: SpeechSynthesisVoice | null = null;
  private _enabled = true;

  get enabled() { return this._enabled; }
  setEnabled(v: boolean) { this._enabled = v; if (!v) this.stop(); }

  private getCachedAudio(id: VoiceId): HTMLAudioElement | null {
    if (this.cache.has(id)) return this.cache.get(id) ?? null;
    if (typeof window === "undefined") return null;
    const url = `/audio/voice/${id}.mp3`;
    const el = new Audio(url);
    el.preload = "auto";
    el.volume = 0.7;
    // 404 시 cache 에 null 로 저장 (재시도 안 함)
    el.addEventListener("error", () => this.cache.set(id, null), { once: true });
    this.cache.set(id, el);
    return el;
  }

  private getKoreanVoice(): SpeechSynthesisVoice | null {
    if (this.synthVoiceKo) return this.synthVoiceKo;
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    this.synthVoiceKo =
      voices.find((v) => v.lang === "ko-KR" || v.lang.startsWith("ko")) ?? null;
    return this.synthVoiceKo;
  }

  play(id: VoiceId, opts: PlayOptions = {}): void {
    if (!this._enabled) return;
    if (typeof window === "undefined") return;

    if (opts.interrupt) this.stop();
    else if (this.isSpeaking()) return; // 진행 중이면 무시

    const audio = this.getCachedAudio(id);
    if (audio && audio.readyState >= 2 /* HAVE_CURRENT_DATA */) {
      audio.volume = opts.volume ?? 0.7;
      audio.currentTime = 0;
      audio.play().then(() => { this.current = audio; }).catch(() => this.fallbackToSpeech(id, opts));
      return;
    }
    // 합성 mp3 가 아직 load 안 됐거나 404 — Speech API 폴백
    this.fallbackToSpeech(id, opts);
  }

  private fallbackToSpeech(id: VoiceId, opts: PlayOptions): void {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const text = VOICE_TEXT[id];
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.volume = opts.volume ?? 0.7;
    u.rate = 1.05;
    const koVoice = this.getKoreanVoice();
    if (koVoice) u.voice = koVoice;
    this.currentSpeech = u;
    window.speechSynthesis.speak(u);
  }

  private isSpeaking(): boolean {
    if (this.current && !this.current.paused && !this.current.ended) return true;
    if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
    return false;
  }

  stop(): void {
    if (this.current) {
      this.current.pause();
      this.current.currentTime = 0;
      this.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.currentSpeech = null;
  }

  /** 사전 합성 mp3 가용 여부 검사 (개발/디버그용). */
  async checkPrebuilt(id: VoiceId): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      const res = await fetch(`/audio/voice/${id}.mp3`, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const voice = new VoiceEngine();

/** 외부에서 합성된 음성 텍스트 노출 — 동일 한글로 자막 표시 등에 활용. */
export function getVoiceText(id: VoiceId): string {
  return VOICE_TEXT[id] ?? "";
}
