"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useTierStore } from "@/store/slices/tierSlice";
import { activeTier, formatAltitudeKm, formatRangeKm, INFINITE_KM } from "@/lib/tiers";
import GlassCard from "@/components/fx/GlassCard";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import TargetLockRing from "@/components/fx/TargetLockRing";
import JetSilhouette from "@/components/fx/JetSilhouette";
import CarrierLaunch from "@/components/fx/CarrierLaunch";
import AltitudeHorizon from "@/components/fx/AltitudeHorizon";
import { bootTimeline, scrambleText } from "@/lib/anime-presets";

const LAUNCH_SESSION_KEY = "flight:launched";

// Pacific Ocean carrier group home — must match /targets
const CARRIER_ORIGIN = { lat: 20.0, lng: 170.0, name: "CVN-78 · PACIFIC" };

export default function FlightPage() {
  const plasmaFuel = useGameStore((s) => s.plasmaFuel);
  const consumeFuel = useGameStore((s) => s.consumeFuel);
  const target = useGameStore((s) => s.target);
  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const tier = activeTier(unlockedKm);

  // Altitude ceiling in meters. Infinite tier → 999km equivalent for display.
  const ceilingMeters = useMemo(
    () => (tier.altitudeKm >= INFINITE_KM ? 999_000 : tier.altitudeKm * 1000),
    [tier.altitudeKm],
  );
  const isInfiniteTier = tier.altitudeKm >= INFINITE_KM;

  // Start altitude = carrier deck level (0m sea level)
  const [currentAltitude, setCurrentAltitude] = useState<number>(0);
  const [velocity, setVelocity] = useState<number>(2.4);
  const [boosted, setBoosted] = useState(false);
  const [launched, setLaunched] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(LAUNCH_SESSION_KEY) === "1";
  });
  const ceilingReached = currentAltitude >= ceilingMeters;

  const hudRef = useRef<HTMLElement | null>(null);
  const telemRef = useRef<HTMLElement | null>(null);
  const statusRef = useRef<HTMLSpanElement | null>(null);
  const jetHudRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bootTimeline([hudRef.current, telemRef.current]);
  }, []);

  // Passive climb — only after launch finished. Clamped to tier ceiling.
  useEffect(() => {
    if (!launched) return;
    const id = window.setInterval(() => {
      setCurrentAltitude((a) => {
        if (a >= ceilingMeters) return a;
        return Math.min(ceilingMeters, a + 50);
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [launched, ceilingMeters]);

  useEffect(() => {
    if (!statusRef.current) return;
    const id = window.setInterval(() => {
      if (statusRef.current)
        scrambleText(statusRef.current, "STATUS :: OPERATIONAL");
    }, 12000);
    return () => window.clearInterval(id);
  }, []);

  // Subtle jet pitch/roll tied to velocity + altitude
  useEffect(() => {
    if (!jetHudRef.current) return;
    const pitchDeg = Math.min(18, (velocity - 2) * 10);
    const rollDeg = Math.sin(currentAltitude / 4000) * 4;
    jetHudRef.current.style.transform = `rotate(${-8 - pitchDeg}deg) rotateX(${rollDeg}deg)`;
  }, [velocity, currentAltitude]);

  const boost = () => {
    if (ceilingReached) return;
    setCurrentAltitude((a) => Math.min(ceilingMeters, a + 1000));
    consumeFuel(0.5);
    setVelocity((v) => Math.min(3.5, +(v + 0.05).toFixed(2)));
    setBoosted(true);
    window.setTimeout(() => setBoosted(false), 1200);
  };

  const onLaunchDone = () => {
    window.sessionStorage.setItem(LAUNCH_SESSION_KEY, "1");
    setLaunched(true);
  };

  const fuelSegments = 20;
  const filledSegments = Math.round((plasmaFuel / 100) * fuelSegments);

  return (
    <div className="relative pt-20 pb-32 min-h-screen">
      <div className="relative mx-auto max-w-4xl px-4 flex flex-col lg:flex-row gap-6 items-center">
        {/* Jet HUD */}
        <section ref={hudRef} className="relative w-full lg:w-3/5">
          <div className="relative w-4/5 mx-auto aspect-video rounded-xl overflow-hidden glass bevel noise">
            {/* Altitude-aware horizon backdrop */}
            <AltitudeHorizon altitude={currentAltitude} />

            {/* scanline */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-cyan-400/12 to-transparent animate-scanline" />
            </div>

            <div className="absolute inset-0 holo-shimmer opacity-40" />

            {[
              "top-2 left-2 border-t border-l",
              "top-2 right-2 border-t border-r",
              "bottom-2 left-2 border-b border-l",
              "bottom-2 right-2 border-b border-r",
            ].map((c) => (
              <div key={c} className={`absolute w-8 h-8 border-2 border-cyan-400/80 ${c}`} />
            ))}

            {/* Jet silhouette — with dynamic pitch/roll */}
            <div
              ref={jetHudRef}
              className="absolute inset-0 flex items-center justify-center transition-transform duration-700 ease-out"
              style={{ transformStyle: "preserve-3d" }}
            >
              <JetSilhouette variant="fighter" className="w-[60%] h-[60%]" glow={1.3} />
            </div>

            {/* Target Lock Ring (always on) */}
            <div className="absolute inset-0 flex items-center justify-center">
              <TargetLockRing active className="" />
            </div>

            {/* Carrier launch cutscene — plays once per session */}
            {!launched && <CarrierLaunch variant="fighter" onComplete={onLaunchDone} />}
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 animate-pulse">
                radar
              </span>
              <span
                ref={statusRef}
                className="font-label tracking-[0.35em] text-[11px] text-cyan-400"
              >
                STATUS :: OPERATIONAL
              </span>
            </div>
            <h2 className="mt-2 font-headline text-3xl font-bold text-primary text-glow">
              {ceilingReached ? "고도 상한 도달" : "고도 상승 중..."}
            </h2>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-black/50 backdrop-blur px-3 py-1.5 font-label text-[10px] tracking-[0.25em]">
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="text-emerald-300">출발지</span>
              <span className="text-cyan-200">{CARRIER_ORIGIN.name}</span>
              <span className="opacity-40">·</span>
              <span className="tabular-nums text-cyan-100">
                {CARRIER_ORIGIN.lat.toFixed(1)}°N, {CARRIER_ORIGIN.lng.toFixed(1)}°E
              </span>
            </div>
            {target && (
              <p className="mt-2 font-label text-[10px] tracking-[0.25em] text-amber-300">
                🎯 목표: {target.address}
              </p>
            )}
          </div>
        </section>

        {/* Telemetry */}
        <aside ref={telemRef} className="w-full lg:w-2/5 space-y-4">
          <GlassCard glow="none">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                  VELOCITY
                </p>
                <p className="font-headline text-sm text-cyan-300">MACH {velocity.toFixed(1)}</p>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.min(100, (velocity / 3.5) * 100)}%` }}
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard glow="none">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                  PLASMA FUEL
                </p>
                <p className="font-headline text-sm text-cyan-300">{plasmaFuel.toFixed(1)}%</p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: fuelSegments }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-[1px] transition-all duration-300 ${
                      i < filledSegments
                        ? "bg-gradient-to-t from-cyan-500 to-cyan-300 shadow-[0_0_6px_rgba(0,219,231,0.7)]"
                        : "bg-surface-container-lowest"
                    }`}
                  />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard glow={boosted ? "cyan" : ceilingReached ? "orange" : "none"}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                  ALTITUDE
                </p>
                <p className="font-label text-[9px] tracking-[0.25em] text-lime-400">
                  TIER <span className="font-bold">{tier.label}</span>
                </p>
              </div>
              <p className="mt-1 font-headline text-3xl font-bold text-primary tabular-nums text-glow">
                <NumberTicker value={currentAltitude} duration={350} />
                <span className="ml-1 text-sm text-on-surface-variant font-label">m</span>
              </p>
              {/* Altitude bar with tier ceiling */}
              <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-300 ease-out ${
                    ceilingReached
                      ? "bg-gradient-to-r from-amber-500 to-red-500"
                      : "bg-gradient-to-r from-cyan-500 to-emerald-400"
                  }`}
                  style={{
                    width: `${Math.min(100, (currentAltitude / ceilingMeters) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between font-label text-[9px] tracking-[0.25em]">
                <span className="text-on-surface-variant">
                  CEILING {isInfiniteTier ? "∞" : `${(ceilingMeters / 1000).toLocaleString()} km`}
                </span>
                <span className="text-on-surface-variant">
                  RANGE {formatRangeKm(tier.rangeKm)}
                </span>
              </div>
              {ceilingReached && !isInfiniteTier && (
                <Link
                  href="/exchange"
                  className="mt-3 block w-full rounded-md border border-amber-400/60 bg-amber-500/10 py-1.5 text-center font-label text-[10px] tracking-[0.25em] text-amber-300 hover:bg-amber-500/20 transition"
                >
                  ⚡ 상위 티어 해금 → 더 높이
                </Link>
              )}
            </div>
          </GlassCard>
        </aside>
      </div>

      <MagneticButton
        onClick={boost}
        tone={ceilingReached ? "ghost" : "cyan"}
        disabled={ceilingReached}
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-lg px-8 py-3 ${
          ceilingReached ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {ceilingReached ? `상한 도달 (${formatAltitudeKm(tier.altitudeKm)})` : "고도 가속"}
      </MagneticButton>
    </div>
  );
}
