"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import FleetShowcase from "@/components/fx/FleetShowcase";
import { bootTimeline } from "@/lib/anime-presets";
import { audioBus } from "@/lib/audio";
import { PLANES } from "@/lib/planes";
import { animate, stagger } from "animejs";

export default function FleetPage() {
  const router = useRouter();
  const plasmaFuel = useGameStore((s) => s.plasmaFuel);
  const selectedPlane = useGameStore((s) => s.selectedPlane);
  const setSelectedPlane = useGameStore((s) => s.setSelectedPlane);

  const fuelBarRef = useRef<HTMLElement | null>(null);
  const carouselRef = useRef<HTMLElement | null>(null);
  const statsRef = useRef<HTMLElement | null>(null);
  const statBarRefs = useRef<(HTMLDivElement | null)[]>([]);

  const plane = PLANES[selectedPlane];

  useEffect(() => {
    bootTimeline([fuelBarRef.current, carouselRef.current, statsRef.current]);
  }, []);

  useEffect(() => {
    audioBus.sfx("lock");
    const bars = statBarRefs.current.filter(Boolean) as HTMLDivElement[];
    if (bars.length === 0) return;
    bars.forEach((b) => { b.style.transform = "scaleX(0)"; b.style.transformOrigin = "left"; });
    animate(bars, {
      scaleX: [0, 1],
      duration: 600,
      delay: stagger(60),
      ease: "outQuart",
    });
  }, [selectedPlane]);

  const prev = () => setSelectedPlane((selectedPlane - 1 + PLANES.length) % PLANES.length);
  const next = () => setSelectedPlane((selectedPlane + 1) % PLANES.length);

  return (
    <div className="relative pt-20 pb-28 min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 space-y-5">
        {/* Plasma fuel bar */}
        <section ref={fuelBarRef}>
          <GlassCard glow="none">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-label tracking-[0.25em] text-[10px] text-on-surface-variant">
                  PLASMA FUEL
                </p>
                <p className="font-label tracking-[0.25em] text-[10px] text-cyan-400">
                  {plasmaFuel}% NOMINAL
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-[0_0_10px_rgba(0,219,231,0.8)] transition-[width] duration-500"
                  style={{ width: `${plasmaFuel}%` }}
                />
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Plane carousel */}
        <section ref={carouselRef}>
          <GlassCard tilt glow="cyan">
            <div className={`relative aspect-video bg-gradient-to-br ${plane.gradient} transition-colors duration-700`}>
              <div className="absolute inset-0 bg-surface-glow" />
              <div className="absolute inset-0 holo-shimmer opacity-60" />
              <div key={plane.id} className="absolute inset-0 animate-[fadeInScale_500ms_cubic-bezier(0.22,1,0.36,1)]">
                <FleetShowcase variant={plane.variant} imageSlug={plane.slug} />
              </div>

              {/* Origin · Manufacturer · Generation badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded border border-cyan-400/40 bg-black/50 backdrop-blur px-2 py-1 font-label text-[9px] tracking-[0.25em] text-cyan-300">
                <span>{plane.origin}</span>
                <span className="opacity-40">·</span>
                <span className="text-on-surface-variant">{plane.manufacturer}</span>
                <span className="opacity-40">·</span>
                <span className="text-tertiary">{plane.generation}</span>
              </div>

              {[
                "top-2 left-2 border-t border-l",
                "top-2 right-2 border-t border-r",
                "bottom-2 left-2 border-b border-l",
                "bottom-2 right-2 border-b border-r",
              ].map((c) => (
                <div key={c} className={`absolute w-6 h-6 border-cyan-400/80 ${c}`} />
              ))}

              <button
                onClick={prev}
                aria-label="previous plane"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-cyan-400/40 bg-black/40 backdrop-blur flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                onClick={next}
                aria-label="next plane"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-cyan-400/40 bg-black/40 backdrop-blur flex items-center justify-center text-cyan-300 hover:bg-cyan-500/20 transition"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>

              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="font-label tracking-[0.3em] text-[10px] text-cyan-400">
                    {plane.role}
                  </p>
                  <h2 className="font-headline text-2xl font-bold text-on-surface text-glow">
                    {plane.name}
                  </h2>
                </div>
                <p className="font-label text-[10px] text-on-surface-variant tracking-widest">
                  {selectedPlane + 1} / {PLANES.length}
                </p>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Stats — 5-row tactical readout */}
        <section ref={statsRef}>
          <GlassCard glow="none">
            <div className="p-4 flex flex-col gap-2.5">
              {[
                { label: "SPEED",   value: plane.speed,   tone: "text-cyan-300" },
                { label: "STEALTH", value: plane.stealth, tone: "text-cyan-300" },
                { label: "PAYLOAD", value: plane.payload, tone: "text-tertiary" },
                { label: "RANGE",   value: plane.range,   tone: "text-cyan-300" },
                { label: "ENGINE",  value: plane.engine,  tone: "text-on-surface-variant" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  ref={(el) => { statBarRefs.current[i] = el; }}
                  className="flex items-center justify-between font-label"
                >
                  <span className="text-[10px] tracking-[0.25em] text-on-surface-variant">
                    {stat.label}
                  </span>
                  <span className={`text-xs tracking-widest font-semibold ${stat.tone}`}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>

        {/* Deploy */}
        <MagneticButton
          onClick={() => router.push("/flight")}
          tone="cyan"
          className="w-full rounded-lg px-4 py-4"
        >
          DEPLOY
        </MagneticButton>

        {/* Uplink status */}
        <section>
          <GlassCard glow="none">
            <div className="p-4 grid grid-cols-3 gap-3">
              {[
                { label: "UPLINK STATUS", value: "SECURE", color: "text-emerald-400" },
                { label: "ACTIVE THREATS", value: "03", color: "text-tertiary" },
                { label: "SQUADRON STATUS", value: "READY", color: "text-cyan-400" },
              ].map((i) => (
                <div key={i.label} className="text-center">
                  <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">
                    {i.label}
                  </p>
                  <p className={`mt-1 font-headline text-xs tracking-[0.2em] font-semibold ${i.color}`}>
                    {i.value}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
