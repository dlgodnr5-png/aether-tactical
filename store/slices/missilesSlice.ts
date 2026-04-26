"use client";

/**
 * 미사일(포탄) 잔량 — consumable micro-purchase 모델 (2026-04-25).
 *
 * - FREE 티어: 미션당 5발 (시작 시 자동 reset)
 * - $1 UNLIMITED: 결제 시 100발 → 소진 시 100발 / $1 충전
 * - 잔량 ≤ 1: hook 트리거 (MissileLowModal 자동 표시)
 *
 * 영구 저장 (localStorage) — 다음 세션에도 유지.
 *
 * Usage:
 *   const { count, consume, reload } = useMissilesStore();
 *   if (!consume()) showLowModal();   // 잔량 0 시 false
 *   reload(100);  // checkout success 후
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FREE_MISSILES, MISSILE_PACK_COUNT, PAID_MISSILES_INITIAL } from "@/lib/tiers";

export interface MissilesState {
  count: number;
  max: number;          // 표시용 (현재 티어 최대)
  lastReloadedAt: number | null;
  totalPurchasedPacks: number;   // 통계 (LTV 계산용)

  /** 한 발 소비. 잔량 0 이면 false. */
  consume: () => boolean;
  /** 결제 성공 시 호출 — count 증가, max 갱신. */
  reload: (qty?: number) => void;
  /** 무료 미션 시작 시 — count = 5 (현재 잔량 무시) */
  resetToFree: () => void;
  /** 첫 결제 unlock 시 — count = 100, max = 100 */
  initializePaid: () => void;
}

export const useMissilesStore = create<MissilesState>()(
  persist(
    (set, get) => ({
      count: FREE_MISSILES,
      max: FREE_MISSILES,
      lastReloadedAt: null,
      totalPurchasedPacks: 0,

      consume: () => {
        const cur = get().count;
        if (cur <= 0) return false;
        set({ count: cur - 1 });
        return true;
      },

      reload: (qty = MISSILE_PACK_COUNT) => {
        set((s) => ({
          count: s.count + qty,
          max: Math.max(s.max, s.count + qty),
          lastReloadedAt: Date.now(),
          totalPurchasedPacks: s.totalPurchasedPacks + 1,
        }));
      },

      resetToFree: () => set({ count: FREE_MISSILES, max: FREE_MISSILES }),

      initializePaid: () =>
        set({
          count: PAID_MISSILES_INITIAL,
          max: PAID_MISSILES_INITIAL,
          lastReloadedAt: Date.now(),
        }),
    }),
    {
      name: "aether-missiles",
      version: 1,
    },
  ),
);

/** 잔량 임계 — 화면 표시/모달 트리거. */
export const MISSILE_LOW_THRESHOLD = 5;
export const MISSILE_CRITICAL_THRESHOLD = 1;
