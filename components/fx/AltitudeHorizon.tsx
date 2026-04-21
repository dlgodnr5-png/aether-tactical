"use client";

import { useMemo } from "react";

interface Props {
  /** Altitude in meters (m). Visual bands: 0-12km troposphere, 12-50km stratosphere, 50-100km mesosphere, 100km+ near-space */
  altitude: number;
  className?: string;
}

/**
 * Altitude-aware horizon backdrop.
 * Sky gradient, cloud layers, and horizon line all react to current altitude,
 * giving a sense of climbing from sea level toward near-space.
 */
export default function AltitudeHorizon({ altitude, className = "" }: Props) {
  // 0..1 progress across atmospheric layers (caps at ~120km)
  const progress = useMemo(() => {
    const km = altitude / 1000;
    return Math.min(1, km / 120);
  }, [altitude]);

  // Sky color stops interpolated by progress
  const skyTop = useMemo(() => {
    if (progress < 0.08) return "#6ab7e8"; // low-altitude blue
    if (progress < 0.25) return "#2a5a94"; // upper troposphere
    if (progress < 0.5) return "#0c1e48"; // stratosphere
    if (progress < 0.8) return "#040820"; // mesosphere
    return "#010208"; // near space
  }, [progress]);

  const skyMid = useMemo(() => {
    if (progress < 0.08) return "#a5d4f0";
    if (progress < 0.25) return "#4a7db0";
    if (progress < 0.5) return "#1a2e5a";
    if (progress < 0.8) return "#070c28";
    return "#020310";
  }, [progress]);

  // Horizon line Y offset — as altitude climbs, ground falls away
  const horizonPct = 55 + progress * 35; // 55% → 90% from top
  // Cloud opacity — max around 2-4km, thins at higher altitude
  const cloudOpacity = useMemo(() => {
    if (progress < 0.02) return 0.2;
    if (progress < 0.1) return 0.85;
    if (progress < 0.2) return 0.55;
    if (progress < 0.35) return 0.2;
    return 0;
  }, [progress]);
  // Clouds drift down as altitude rises
  const cloudY = Math.min(100, progress * 140);
  const starsOpacity = Math.max(0, Math.min(1, (progress - 0.4) / 0.3));

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Sky gradient */}
      <div
        className="absolute inset-0 transition-[background] duration-[1200ms] ease-out"
        style={{
          background: `linear-gradient(180deg, ${skyTop} 0%, ${skyMid} ${horizonPct - 10}%, #0c1a2e ${horizonPct}%, #04080f 100%)`,
        }}
      />

      {/* Faint sun glow — fades at higher altitudes */}
      <div
        className="absolute transition-opacity duration-1000"
        style={{
          right: "12%",
          top: `${Math.max(6, horizonPct - 40)}%`,
          width: "22%",
          aspectRatio: "1",
          background: "radial-gradient(circle, rgba(255,220,180,0.45) 0%, rgba(255,180,120,0.18) 40%, transparent 70%)",
          filter: "blur(12px)",
          opacity: Math.max(0, 1 - progress * 1.8),
        }}
      />

      {/* Stars — appear at high altitude */}
      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: starsOpacity }}
      >
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 37) % 100;
          const y = (i * 53) % 70;
          const r = ((i * 7) % 3) + 0.6;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${r}px`,
                height: `${r}px`,
                opacity: 0.5 + ((i * 13) % 5) / 10,
              }}
            />
          );
        })}
      </div>

      {/* Horizon line (curves as altitude climbs — simulated via border-radius) */}
      <div
        className="absolute left-[-20%] right-[-20%] h-[3px] transition-all duration-[1200ms] ease-out"
        style={{
          top: `${horizonPct}%`,
          background: "linear-gradient(90deg, transparent, rgba(0,219,231,0.7) 20%, rgba(0,219,231,0.9) 50%, rgba(0,219,231,0.7) 80%, transparent)",
          borderRadius: `${Math.min(50, progress * 60)}% / 0`,
          boxShadow: `0 0 ${12 + progress * 14}px rgba(0,219,231,${0.3 + progress * 0.3})`,
        }}
      />

      {/* Ground / ocean below horizon */}
      <div
        className="absolute left-0 right-0 bg-gradient-to-b from-[#0c1a2e] via-[#071223] to-[#020510]"
        style={{ top: `${horizonPct}%`, bottom: 0 }}
      />

      {/* Cloud layer 1 (far, slow) */}
      <div
        className="absolute left-0 right-0 h-16 transition-all duration-1000"
        style={{
          top: `${horizonPct - 8 + cloudY * 0.15}%`,
          opacity: cloudOpacity * 0.6,
          background:
            "radial-gradient(ellipse 40% 100% at 15% 50%, rgba(255,255,255,0.6) 0%, transparent 70%), radial-gradient(ellipse 30% 100% at 60% 50%, rgba(255,255,255,0.5) 0%, transparent 70%), radial-gradient(ellipse 35% 100% at 85% 50%, rgba(255,255,255,0.55) 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
      />

      {/* Cloud layer 2 (mid) */}
      <div
        className="absolute left-0 right-0 h-14 transition-all duration-1000"
        style={{
          top: `${horizonPct - 4 + cloudY * 0.25}%`,
          opacity: cloudOpacity,
          background:
            "radial-gradient(ellipse 25% 100% at 28% 50%, rgba(255,255,255,0.7) 0%, transparent 70%), radial-gradient(ellipse 35% 100% at 70% 50%, rgba(255,255,255,0.75) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />

      {/* Cloud layer 3 (near, fast) */}
      <div
        className="absolute left-0 right-0 h-20 transition-all duration-1000"
        style={{
          top: `${horizonPct + 2 + cloudY * 0.4}%`,
          opacity: cloudOpacity * 0.85,
          background:
            "radial-gradient(ellipse 22% 100% at 8% 50%, rgba(255,255,255,0.85) 0%, transparent 72%), radial-gradient(ellipse 30% 100% at 44% 50%, rgba(255,255,255,0.8) 0%, transparent 72%), radial-gradient(ellipse 24% 100% at 80% 50%, rgba(255,255,255,0.82) 0%, transparent 72%)",
          filter: "blur(3px)",
        }}
      />

      {/* Atmosphere rim (bright arc at horizon as altitude grows) */}
      <div
        className="absolute left-[-25%] right-[-25%] h-24 transition-opacity duration-1000"
        style={{
          top: `${horizonPct - 8}%`,
          opacity: Math.min(1, progress * 1.4),
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(0,219,231,0.35) 0%, rgba(0,219,231,0.18) 35%, transparent 60%)",
          filter: "blur(6px)",
        }}
      />

      {/* Altitude band label */}
      <div className="absolute left-4 top-4 font-label text-[9px] tracking-[0.3em] text-cyan-300/85">
        <span className="text-on-surface-variant">LAYER</span>{" "}
        <span>{labelForAltitude(altitude)}</span>
      </div>
    </div>
  );
}

function labelForAltitude(m: number): string {
  const km = m / 1000;
  if (km < 12) return "TROPOSPHERE";
  if (km < 50) return "STRATOSPHERE";
  if (km < 85) return "MESOSPHERE";
  if (km < 100) return "THERMOSPHERE";
  return "NEAR SPACE ∙ KARMAN LINE CROSSED";
}
