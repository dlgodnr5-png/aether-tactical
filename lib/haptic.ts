"use client";

/**
 * 햅틱 피드백 — 모바일 게임 이벤트.
 *
 * Web Vibration API 사용 (Android/Chrome 지원, iOS 미지원).
 * 패턴: 짧은 burst 또는 ms 배열 [on, off, on, off, ...].
 *
 * 사용:
 *   import { haptic } from "@/lib/haptic";
 *   haptic.tap();         // 버튼 탭
 *   haptic.fire();        // 발사
 *   haptic.hit();         // 명중
 *   haptic.warning();     // 경고
 *   haptic.explosion();   // 폭발
 */

const PATTERNS = {
  tap: 10,
  fire: [25, 30, 15],
  hit: [40, 20, 60],
  warning: [50, 80, 50],
  explosion: [80, 40, 120, 40, 80],
  success: [30, 50, 30, 50, 60],
  fail: [200],
} as const;

export type HapticPattern = keyof typeof PATTERNS;

class Haptic {
  private _enabled = true;
  private _supported: boolean | null = null;

  get enabled() { return this._enabled; }
  setEnabled(v: boolean) { this._enabled = v; }

  get supported(): boolean {
    if (this._supported !== null) return this._supported;
    if (typeof window === "undefined") return false;
    this._supported = "vibrate" in navigator && typeof navigator.vibrate === "function";
    return this._supported;
  }

  private fire(pattern: HapticPattern): void {
    if (!this._enabled || !this.supported) return;
    try {
      navigator.vibrate(PATTERNS[pattern] as number | number[]);
    } catch {
      /* 일부 브라우저 보안 정책 */
    }
  }

  tap()       { this.fire("tap"); }
  fire_()     { this.fire("fire"); }
  hit()       { this.fire("hit"); }
  warning()   { this.fire("warning"); }
  explosion() { this.fire("explosion"); }
  success()   { this.fire("success"); }
  fail()      { this.fire("fail"); }

  /** 사용자 정의 패턴 (ms). */
  custom(pattern: number | number[]): void {
    if (!this._enabled || !this.supported) return;
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  /** 진행 중 진동 즉시 중단. */
  cancel(): void {
    if (!this.supported) return;
    try { navigator.vibrate(0); } catch { /* ignore */ }
  }
}

export const haptic = new Haptic();
