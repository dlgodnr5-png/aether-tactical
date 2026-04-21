"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import GlassCard from "@/components/fx/GlassCard";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";

interface Pack {
  id: string;
  name: string;
  creditsDelta: number;
  price: string;
  badge?: string;
  icon: string;
}

const PACKS: Pack[] = [
  { id: "basic",  name: "Basic Refuel", creditsDelta: 100,  price: "$1",  icon: "local_gas_station" },
  { id: "combat", name: "Combat Pack",  creditsDelta: 550,  price: "$5",  badge: "RECOMMENDED", icon: "bolt" },
  { id: "elite",  name: "Elite Bundle", creditsDelta: 1200, price: "$10", icon: "military_tech" },
];

export default function ExchangePage() {
  const credits = useGameStore((s) => s.credits);
  const plasmaFuel = useGameStore((s) => s.plasmaFuel);
  const addCredits = useGameStore((s) => s.addCredits);
  const addFuel = useGameStore((s) => s.addFuel);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const assetsRef = useRef<HTMLElement | null>(null);
  const packsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([headerRef.current, assetsRef.current, packsRef.current]);
  }, []);

  const purchase = (pack: Pack) => {
    addCredits(pack.creditsDelta);
    addFuel(Math.min(100, Math.floor(pack.creditsDelta / 20)));
    alert(
      `✔ ${pack.name} 충전 완료\n+${pack.creditsDelta.toLocaleString()} CR\n(추후 Stripe 결제 연동 예정)`
    );
  };

  return (
    <div className="relative pt-20 pb-28 min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 space-y-5">
        <div ref={headerRef} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">inventory_2</span>
          <div>
            <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
              AEROSPACE_COMMAND
            </p>
            <h1 className="font-headline text-2xl font-bold text-on-surface text-glow">
              연료 &amp; 크레딧 충전
            </h1>
          </div>
        </div>

        {/* Current assets */}
        <section ref={assetsRef}>
          <GlassCard glow="none">
            <div className="p-4">
              <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant">
                CURRENT ASSETS
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                    CREDITS
                  </p>
                  <p className="mt-1 font-headline text-2xl font-semibold text-tertiary tabular-nums">
                    <NumberTicker value={credits} />
                    <span className="ml-1 text-xs text-on-surface-variant font-label">CR</span>
                  </p>
                </div>
                <div>
                  <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
                    PLASMA FUEL
                  </p>
                  <p className="mt-1 font-headline text-2xl font-semibold text-primary tabular-nums text-glow">
                    <NumberTicker value={Math.floor(plasmaFuel)} />
                    <span className="ml-1 text-xs text-on-surface-variant font-label">%</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-[width] duration-500"
                      style={{ width: `${plasmaFuel}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Packs */}
        <section ref={packsRef} className="space-y-3">
          {PACKS.map((pack) => (
            <GlassCard key={pack.id} tilt glow={pack.badge ? "cyan" : "none"}>
              <div className="relative p-4">
                {pack.badge && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-sm bg-cyan-400 text-[10px] tracking-[0.3em] font-label font-bold text-[#00363a] shadow-[0_0_12px_rgba(0,219,231,0.6)]">
                    {pack.badge}
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border border-cyan-400/40 bg-surface-container-lowest flex items-center justify-center">
                    <span className="material-symbols-outlined text-cyan-300">{pack.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-headline text-lg text-on-surface font-semibold">
                      {pack.name}
                    </p>
                    <p className="font-label text-[11px] tracking-[0.2em] text-tertiary">
                      +{pack.creditsDelta.toLocaleString()} CR
                    </p>
                  </div>
                  <MagneticButton
                    onClick={() => purchase(pack)}
                    tone={pack.badge ? "cyan" : "ghost"}
                    className="rounded-lg px-4 py-2 text-xs"
                  >
                    {pack.price}
                  </MagneticButton>
                </div>
              </div>
            </GlassCard>
          ))}
        </section>

        <p className="text-center font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
          * 결제는 Stripe 보안 결제로 진행됩니다 (연동 예정)
        </p>
      </div>
    </div>
  );
}
