"use client";

/**
 * 미사일 잔량 부족 모달 — 사용자 구매 hook.
 *
 * 트리거:
 *  - 잔량 = 1 → 슬라이드 모달 (구매 권유, dismissible)
 *  - 잔량 = 0 → 강제 모달 (구매 또는 close)
 *
 * 구매: $1 → 100발 즉시 충전.
 */

import { useEffect, useState } from "react";
import { useMissilesStore, MISSILE_CRITICAL_THRESHOLD } from "@/store/slices/missilesSlice";
import { audioBus } from "@/lib/audio";

export function MissileLowModal() {
  const count = useMissilesStore((s) => s.count);
  const [dismissed, setDismissed] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // 잔량 변화 시 dismissal 상태 리셋 (새로 떨어지면 다시 보여야)
  useEffect(() => {
    if (count > MISSILE_CRITICAL_THRESHOLD) setDismissed(false);
  }, [count]);

  // 잔량 1발 도달 시 SFX 경고
  useEffect(() => {
    if (count === 1) {
      try { audioBus.sfx("press"); } catch { /* ignore */ }
    }
  }, [count]);

  if (count > MISSILE_CRITICAL_THRESHOLD) return null;
  if (dismissed && count > 0) return null;

  const isCritical = count === 0;
  const title = isCritical ? "포탄 소진" : "마지막 1발";
  const subtitle = isCritical
    ? "$1 로 100발 즉시 충전하고 임무 계속"
    : "$1 로 100발 충전 (지금 안 사면 곧 끊깁니다)";

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: "missile_pack" }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      // 폴백: 직접 reload (개발 모드 등)
      useMissilesStore.getState().reload(100);
      setDismissed(true);
    } catch (err) {
      console.error("[missile] purchase failed:", err);
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none"
      aria-modal="true"
      role="dialog"
    >
      {/* 배경 */}
      {isCritical && (
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
          onClick={() => { /* critical 은 close 안 됨 */ }}
        />
      )}

      <div className="relative pointer-events-auto w-full sm:max-w-md mx-4 mb-4 sm:mb-0">
        <div className={`bevel glass border ${isCritical ? "border-red-500" : "border-yellow-400"} rounded-xl p-5 shadow-2xl`}>
          <div className="flex items-start gap-3 mb-4">
            <div className={`text-3xl ${isCritical ? "text-red-400" : "text-yellow-400"}`}>
              {isCritical ? "🚫" : "⚠️"}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="text-sm text-white/70 mt-1">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all"
            >
              {purchasing ? "결제 진행..." : "$1 충전 (100발)"}
            </button>
            {!isCritical && (
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="py-3 px-4 border border-white/20 text-white/70 rounded-lg hover:bg-white/5 transition-all"
              >
                나중에
              </button>
            )}
          </div>

          {!isCritical && (
            <p className="text-[11px] text-white/50 mt-3 text-center">
              잔량 0 발 시 자동으로 다시 표시됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
