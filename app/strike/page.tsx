"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";

const StrikeMap = dynamic(() => import("@/components/StrikeMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-surface-container-lowest flex items-center justify-center">
      <p className="font-label tracking-[0.3em] text-[11px] text-cyan-400 animate-pulse">
        LOADING STRIKE FEED...
      </p>
    </div>
  ),
});

export default function StrikePage() {
  const target = useGameStore((s) => s.target);
  const credits = useGameStore((s) => s.credits);
  const addCredits = useGameStore((s) => s.addCredits);
  const [exploding, setExploding] = useState(false);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const leftRef = useRef<HTMLElement | null>(null);
  const rightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([leftRef.current, rightRef.current]);
  }, []);

  const drop = () => {
    if (credits < 100) {
      alert("크레딧 부족: 연료&크레딧 탭에서 충전하세요.");
      return;
    }
    addCredits(-100);
    setExploding(true);

    // 3-2-1 countdown
    setCountdown(3);
    const tick = (n: number) => {
      setCountdown(n);
      if (n === 0) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 180);
        window.setTimeout(() => {
          setExploding(false);
          setCountdown(null);
          alert(
            `💥 폭탄 투하 성공!\n좌표: ${target ? `${target.lat.toFixed(4)}, ${target.lng.toFixed(4)}` : "UNKNOWN"}\n-100 CR`
          );
        }, 350);
        return;
      }
      window.setTimeout(() => tick(n - 1), 600);
    };
    window.setTimeout(() => tick(2), 600);
  };

  return (
    <div className="relative pt-16 pb-20 min-h-screen overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0">
        <StrikeMap />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      </div>

      {/* Crosshair overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 shadow-[0_0_30px_rgba(0,219,231,0.45)]" />
          <div className="absolute inset-6 rounded-full border border-cyan-300/60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(0,219,231,0.9)]" />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/80" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/80" />
          <div className="absolute inset-0 rounded-full border border-cyan-300/60 animate-pulse-ring" />
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-headline text-7xl font-bold text-cyan-300 text-glow tabular-nums animate-pulse">
                {countdown}
              </span>
            </div>
          )}
          {exploding && countdown === 0 && (
            <div className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-400 via-orange-500 to-transparent opacity-80 animate-ping" />
          )}
        </div>
      </div>

      {/* Flight path dashed curve (SVG) */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 5 90 Q 50 5 50 50"
          fill="none"
          stroke="rgba(0,219,231,0.6)"
          strokeWidth="0.3"
          strokeDasharray="1,1.2"
        />
      </svg>

      {/* Target data panel */}
      <aside
        ref={leftRef}
        className="absolute top-20 left-3 z-20 w-56 rounded-xl glass bevel noise p-3 space-y-2"
      >
        <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
          TARGET DATA
        </p>
        <div className="space-y-1">
          <Row label="DIST" value="12.4 KM" />
          <Row label="ALT" value="18,200 M" />
          <Row label="WIND" value="NE 8 KTS" />
          <Row
            label="COORD"
            value={target ? `${target.lat.toFixed(3)}, ${target.lng.toFixed(3)}` : "—"}
          />
        </div>
      </aside>

      {/* Guidance panel */}
      <aside
        ref={rightRef}
        className="absolute top-20 right-3 z-20 w-56 rounded-xl glass bevel noise p-3"
      >
        <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
          PRECISION GUIDANCE
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 animate-pulse" />
        </div>
        <p className="mt-2 font-label text-[10px] tracking-[0.25em] text-emerald-400">
          ACTIVE
        </p>
        <div className="mt-3 flex items-baseline justify-between">
          <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
            CREDITS
          </p>
          <p className="font-headline text-sm text-tertiary tabular-nums">
            <NumberTicker value={credits} />
          </p>
        </div>
      </aside>

      {/* Screen flash on detonation */}
      {flash && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-white/60" />
      )}

      {/* Drop CTA + 3D Mission CTA */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        <MagneticButton
          onClick={drop}
          disabled={exploding}
          tone="danger"
          className="rounded-lg px-8 py-3 disabled:opacity-60 disabled:cursor-wait"
        >
          {exploding ? "DROPPING..." : "즉시 폭격"}
        </MagneticButton>
        <Link href="/mission">
          <MagneticButton
            tone="cyan"
            className="rounded-lg px-8 py-3 shadow-[0_0_32px_-4px_rgba(0,219,231,0.8)]"
          >
            🚀 출격 (3D 작전)
          </MagneticButton>
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between font-label text-[10px] tracking-[0.2em]">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-cyan-300 tabular-nums">{value}</span>
    </div>
  );
}
