"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import GlassCard from "@/components/fx/GlassCard";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import BootSequence from "@/components/fx/BootSequence";
import JetSilhouette from "@/components/fx/JetSilhouette";
import { bootTimeline } from "@/lib/anime-presets";

export default function HomePage() {
  const credits = useGameStore((s) => s.credits);
  const maxAltitude = useGameStore((s) => s.maxAltitude);
  const heroRef = useRef<HTMLElement | null>(null);
  const tilesRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLElement | null>(null);
  const telemRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([heroRef.current, tilesRef.current, ctaRef.current, telemRef.current]);
  }, []);

  return (
    <div className="relative pt-20 pb-28 min-h-screen text-on-surface">
      <BootSequence />

      <div className="relative mx-auto max-w-3xl px-4 space-y-6">
        {/* HERO */}
        <section ref={heroRef} className="relative overflow-hidden rounded-xl glass bevel noise">
          <div className="relative aspect-video bg-gradient-to-br from-[#122040] via-[#0a1530] to-[#050920]">
            <div className="absolute inset-0 holo-shimmer opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-3/4 h-3/4">
                <div className="absolute inset-0 bg-surface-glow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <JetSilhouette variant="fighter" className="w-[72%] h-[72%] -rotate-[6deg]" glow={1.1} />
                </div>
              </div>
            </div>

            {[
              "top-2 left-2 border-t border-l",
              "top-2 right-2 border-t border-r",
              "bottom-2 left-2 border-b border-l",
              "bottom-2 right-2 border-b border-r",
            ].map((c) => (
              <div key={c} className={`absolute w-6 h-6 border-cyan-400/80 ${c}`} />
            ))}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            <div className="absolute bottom-4 left-4 right-4">
              <p className="font-label tracking-[0.3em] text-cyan-400 text-[11px] mb-1">
                COMMAND CENTER ∙ SECTOR-07
              </p>
              <h2 className="font-headline text-3xl font-bold text-on-surface text-glow">
                전술 지휘소
              </h2>
            </div>

            <div className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-scanline" />
          </div>
        </section>

        {/* DATA NODES */}
        <section ref={tilesRef} className="grid grid-cols-2 gap-3">
          <GlassCard tilt className="">
            <div className="p-4">
              <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant">
                현재 최고 고도
              </p>
              <p className="mt-2 font-headline text-2xl font-semibold text-primary tabular-nums text-glow">
                <NumberTicker value={maxAltitude} />
                <span className="ml-1 text-sm text-on-surface-variant font-label">m</span>
              </p>
            </div>
          </GlassCard>
          <GlassCard tilt glow="orange">
            <div className="p-4">
              <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant">
                보유 금액
              </p>
              <p className="mt-2 font-headline text-2xl font-semibold text-tertiary tabular-nums">
                <NumberTicker value={credits} />
                <span className="ml-1 text-sm text-on-surface-variant font-label">CR</span>
              </p>
            </div>
          </GlassCard>
        </section>

        {/* CTA */}
        <section ref={ctaRef} className="flex gap-3">
          <Link href="/fleet" className="flex-1">
            <MagneticButton tone="ghost" className="w-full rounded-lg px-4 py-3">
              기체 강화
            </MagneticButton>
          </Link>
          <Link href="/flight" className="flex-1">
            <MagneticButton tone="cyan" className="w-full rounded-lg px-4 py-3">
              비행 시작
            </MagneticButton>
          </Link>
        </section>

        {/* TELEMETRY */}
        <section ref={telemRef}>
          <GlassCard glow="none">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
                  SYSTEM BROADCAST
                </p>
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-pulse" />
                  <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
              <div className="space-y-1 font-body text-xs text-on-surface-variant">
                <p>&gt; 위성 링크 동기화 완료</p>
                <p>&gt; 함대 준비 상태 NOMINAL</p>
                <p>&gt; 최근 임무: SECTOR-07 정찰 성공</p>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
