"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import FleetShowcase from "@/components/fx/FleetShowcase";
import { bootTimeline } from "@/lib/anime-presets";
import { audioBus } from "@/lib/audio";
import { animate, stagger } from "animejs";

type JetVariant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Plane {
  id: number;
  name: string;
  role: string;
  speed: string;
  stealth: string;
  payload: string;
  variant: JetVariant;
  gradient: string;
}

const PLANES: Plane[] = [
  { id: 0, name: "F-47 NGAD",         role: "6TH-GEN AIR DOMINANCE", speed: "MACH 2+", stealth: "MAX",    payload: "INTERNAL AAM BAY",           variant: "fighter",     gradient: "from-[#0a2040] via-[#122c5a] to-[#050920]" },
  { id: 1, name: "B-21 RAIDER",       role: "STEALTH BOMBER",     speed: "HIGH-SUB",  stealth: "MAX",    payload: "~13,600 kg INTERNAL",         variant: "bomber",      gradient: "from-[#071030] via-[#0f1a3e] to-[#030619]" },
  { id: 2, name: "F-35A LIGHTNING II", role: "MULTI-ROLE STRIKE", speed: "MACH 1.6",  stealth: "HIGH",   payload: "4x AIM-120 / 18,000 LB EXT", variant: "multirole",   gradient: "from-[#102040] via-[#1a3050] to-[#080d22]" },
  { id: 3, name: "SR-72 DARK EAGLE",  role: "HYPERSONIC RECON",   speed: "MACH 6+",   stealth: "HIGH",   payload: "HYPERSONIC STRIKE",           variant: "interceptor", gradient: "from-[#2a0a30] via-[#1a1a4a] to-[#060618]" },
  { id: 4, name: "A-10C THUNDERBOLT II", role: "CLOSE AIR SUPPORT", speed: "MACH 0.75", stealth: "LOW",  payload: "GAU-8 30MM + 7,260 KG",       variant: "support",     gradient: "from-[#2a1a10] via-[#3a2418] to-[#120a05]" },
];

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
                <FleetShowcase variant={plane.variant} />
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

        {/* Stats */}
        <section ref={statsRef} className="grid grid-cols-3 gap-3">
          {[
            { label: "SPEED", value: plane.speed },
            { label: "STEALTH", value: plane.stealth },
            { label: "PAYLOAD", value: plane.payload },
          ].map((stat, i) => (
            <GlassCard key={stat.label} glow="none">
              <div
                ref={(el) => { statBarRefs.current[i] = el; }}
                className="p-3 text-center"
              >
                <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                  {stat.label}
                </p>
                <p className="mt-1 font-headline text-sm font-semibold text-cyan-300">
                  {stat.value}
                </p>
              </div>
            </GlassCard>
          ))}
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
