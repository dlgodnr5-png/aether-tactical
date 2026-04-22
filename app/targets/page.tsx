"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useTierStore } from "@/store/slices/tierSlice";
import { activeTier, haversineKm } from "@/lib/tiers";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import TargetLockRing from "@/components/fx/TargetLockRing";
import { bootTimeline } from "@/lib/anime-presets";

// Cesium is browser-only — must be ssr:false
const CesiumGlobe = dynamic(() => import("@/components/fx/CesiumGlobe"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full rounded-xl glass flex items-center justify-center">
      <p className="font-label tracking-[0.3em] text-[11px] text-cyan-400 animate-pulse">
        LOADING ORBITAL IMAGERY...
      </p>
    </div>
  ),
});

// Carrier home position — USS Ronald Reagan, Yokosuka (placeholder).
// Later phases can let the user pick from multiple carrier groups.
const CARRIER_ORIGIN = { lat: 35.288, lng: 139.672 };

export default function TargetsPage() {
  const target = useGameStore((s) => s.target);
  const setTarget = useGameStore((s) => s.setTarget);
  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const tier = activeTier(unlockedKm);

  const [lockPulse, setLockPulse] = useState(false);
  const prevTargetRef = useRef<string | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bootTimeline([headerRef.current, mapRef.current, ctaRef.current]);
  }, []);

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
        address: `${lat.toFixed(4)}°, ${lng.toFixed(4)}° · ${km.toFixed(0)}km`,
      });
    },
    [setTarget],
  );

  return (
    <div className="relative pt-20 pb-28 min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 space-y-4">
        <div ref={headerRef}>
          <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
            RECON // TARGET ACQUISITION
          </p>
          <h1 className="font-headline text-2xl font-bold text-on-surface text-glow">
            목표 지점 탐색
          </h1>
          <p className="mt-1 font-label text-[10px] tracking-[0.2em] text-on-surface-variant">
            ACTIVE TIER: <span className="text-lime-400">{tier.label}</span>
            {"  ·  "}MAX RANGE: <span className="text-lime-400 tabular-nums">{tier.km}km</span>
          </p>
        </div>

        <div ref={mapRef} className="relative h-[60vh] rounded-xl overflow-hidden glass">
          <CesiumGlobe
            onPick={onPick}
            maxRangeKm={tier.km}
            carrierOrigin={CARRIER_ORIGIN}
            target={target ? { lat: target.lat, lng: target.lng } : null}
          />
          {/* Lock ring overlay when new target acquired */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <TargetLockRing active={lockPulse} />
          </div>
        </div>

        <div ref={ctaRef}>
          <Link
            href="/strike"
            aria-disabled={!target}
            onClick={(e) => {
              if (!target) e.preventDefault();
            }}
            className="block"
          >
            <MagneticButton
              tone={target ? "cyan" : "ghost"}
              disabled={!target}
              className={`w-full rounded-lg px-4 py-4 ${!target ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              타격 지점 확정
            </MagneticButton>
          </Link>
        </div>

        {target ? (
          <GlassCard glow="cyan">
            <div className="p-3">
              <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                SELECTED
              </p>
              <p className="mt-1 font-body text-sm text-on-surface truncate">
                {target.address}
              </p>
              <p className="mt-0.5 font-label text-[10px] text-cyan-400 tabular-nums">
                {target.lat.toFixed(5)}°, {target.lng.toFixed(5)}°
              </p>
            </div>
          </GlassCard>
        ) : (
          <p className="font-label text-[11px] tracking-[0.25em] text-on-surface-variant text-center">
            지구본을 클릭해 목표 지점을 찍으세요.
          </p>
        )}
      </div>
    </div>
  );
}
