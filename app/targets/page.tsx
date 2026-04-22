"use client";

/**
 * 목표 지점 탐색 — Cesium 지구본 전체화면.
 *
 * 인터랙션:
 *   - 드래그: 지구 회전 / 줌
 *   - 더블클릭: 타격 좌표 확정 (재더블클릭 → 재지정 + 자동 플라이투)
 *
 * 레이아웃: TopBar + BottomNav 아래 모든 공간을 globe가 차지. 브리핑
 * 정보는 globe 위에 플로팅 오버레이. BottomNav와 결제 버튼이 겹치지
 * 않도록 하단 세이프존 확보.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useTierStore } from "@/store/slices/tierSlice";
import { activeTier, formatAltitudeKm, formatRangeKm, haversineKm } from "@/lib/tiers";
import TargetLockRing from "@/components/fx/TargetLockRing";

const CesiumGlobe = dynamic(() => import("@/components/fx/CesiumGlobe"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050810]">
      <p className="font-label tracking-[0.3em] text-[11px] text-cyan-400 animate-pulse">
        LOADING ORBITAL IMAGERY...
      </p>
    </div>
  ),
});

// Pacific Ocean carrier group — centered in Pacific for global range
const CARRIER_ORIGIN = { lat: 20.0, lng: 170.0 };

export default function TargetsPage() {
  const target = useGameStore((s) => s.target);
  const setTarget = useGameStore((s) => s.setTarget);
  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const tier = activeTier(unlockedKm);

  const [lockPulse, setLockPulse] = useState(false);
  const prevTargetRef = useRef<string | null>(null);

  useEffect(() => {
    const key = target ? `${target.lat.toFixed(5)},${target.lng.toFixed(5)}` : null;
    if (key && key !== prevTargetRef.current) {
      setLockPulse(true);
      window.setTimeout(() => setLockPulse(false), 1300);
    }
    prevTargetRef.current = key;
  }, [target]);

  const onPick = useCallback(
    (lat: number, lng: number) => {
      const km = haversineKm(CARRIER_ORIGIN, { lat, lng });
      setTarget({
        lat,
        lng,
        address: `${lat.toFixed(3)}°, ${lng.toFixed(3)}° · ${km.toFixed(0)}km`,
      });
    },
    [setTarget],
  );

  return (
    // Full-screen globe stage: between TopBar (h-16 = 64px) and BottomNav (~80px)
    <div className="fixed inset-0 top-16 bottom-[76px] bg-[#050810]">
      {/* Globe fills the stage */}
      <div className="absolute inset-0">
        <CesiumGlobe
          onPick={onPick}
          maxRangeKm={tier.rangeKm}
          carrierOrigin={CARRIER_ORIGIN}
          target={target ? { lat: target.lat, lng: target.lng } : null}
        />
      </div>

      {/* Lock ring center overlay when target acquired */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <TargetLockRing active={lockPulse} />
      </div>

      {/* TOP-LEFT: mission heading + active tier */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-sm">
        <div className="rounded-lg border border-cyan-400/40 bg-black/75 backdrop-blur px-3 py-2">
          <p className="font-label text-[9px] tracking-[0.3em] text-cyan-400">
            RECON // TARGET ACQUISITION
          </p>
          <h1 className="mt-0.5 font-headline text-lg font-bold text-on-surface text-glow leading-tight">
            목표 지점 탐색
          </h1>
          <p className="mt-1 font-label text-[10px] tracking-[0.2em] text-on-surface-variant">
            TIER <span className="text-lime-400">{tier.label}</span>
            {" · "}
            고도 <span className="text-lime-400 tabular-nums">{formatAltitudeKm(tier.altitudeKm)}</span>
            {" · "}
            반경 <span className="text-lime-400 tabular-nums">{formatRangeKm(tier.rangeKm)}</span>
          </p>
          <p className="mt-1 font-label text-[9px] tracking-[0.25em] text-amber-300">
            📍 항모 {CARRIER_ORIGIN.lat.toFixed(1)}°N, {CARRIER_ORIGIN.lng.toFixed(1)}°E · 태평양
          </p>
        </div>
      </div>

      {/* TOP-RIGHT: selected target info */}
      {target && (
        <div className="pointer-events-none absolute top-3 right-3 z-10 max-w-xs">
          <div className="rounded-lg border border-lime-400/60 bg-black/75 backdrop-blur px-3 py-2 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
            <div className="flex items-center gap-1.5">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-lime-400 animate-pulse" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-lime-400" />
              </span>
              <p className="font-label text-[9px] tracking-[0.3em] text-lime-400">
                TARGET LOCKED
              </p>
            </div>
            <p className="mt-1 font-body text-xs text-on-surface truncate">
              {target.address}
            </p>
            <p className="mt-0.5 font-label text-[9px] text-cyan-300 tabular-nums">
              {target.lat.toFixed(5)}°, {target.lng.toFixed(5)}°
            </p>
          </div>
        </div>
      )}

      {/* BOTTOM: confirm button (shown when target locked) */}
      <div className="pointer-events-none absolute bottom-3 inset-x-3 z-10 flex justify-center">
        {target ? (
          <Link
            href="/exchange"
            className="pointer-events-auto group relative overflow-hidden rounded-xl px-8 py-4 bg-gradient-to-r from-lime-500 via-emerald-500 to-cyan-500 text-black font-headline text-base font-bold tracking-[0.25em] shadow-[0_0_32px_rgba(163,230,53,0.55)] hover:shadow-[0_0_48px_rgba(163,230,53,0.8)] active:scale-[0.98] transition-all"
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px]">radar</span>
              타격 지점 확정 · 사거리 구매
            </span>
            <span className="pointer-events-none absolute inset-0">
              <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:translate-x-[400%] transition-transform duration-700" />
            </span>
          </Link>
        ) : (
          <div className="rounded-lg bg-black/80 backdrop-blur border border-cyan-400/40 px-4 py-2 font-label text-[11px] tracking-[0.25em] text-cyan-300">
            <span className="animate-pulse">지구본을 더블클릭하여 타격 좌표 지정</span>
          </div>
        )}
      </div>
    </div>
  );
}
