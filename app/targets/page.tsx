"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import TargetLockRing from "@/components/fx/TargetLockRing";
import { bootTimeline } from "@/lib/anime-presets";

const TargetsMap = dynamic(() => import("@/components/TargetsMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] w-full rounded-xl glass flex items-center justify-center">
      <p className="font-label tracking-[0.3em] text-[11px] text-cyan-400 animate-pulse">
        LOADING SATELLITE FEED...
      </p>
    </div>
  ),
});

export default function TargetsPage() {
  const target = useGameStore((s) => s.target);
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
        </div>

        <div ref={mapRef} className="relative">
          <TargetsMap />
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
            지도를 클릭하거나 주소를 검색하여 목표를 확정하세요.
          </p>
        )}
      </div>
    </div>
  );
}
