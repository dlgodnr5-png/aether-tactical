"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";
import { engineAudio } from "@/lib/engine-audio";

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

interface MissileState {
  id: number;
  from: "bl" | "br"; // bottom-left or bottom-right launch origin
  spawnAt: number; // ms timestamp
}

interface ExplosionState {
  id: number;
  x: number; // viewport px
  y: number;
  spawnAt: number;
}

const MISSILE_COST = 50;
const MISSILE_FLIGHT_MS = 900;
const EXPLOSION_LIFE_MS = 900;

export default function StrikePage() {
  const target = useGameStore((s) => s.target);
  const credits = useGameStore((s) => s.credits);
  const addCredits = useGameStore((s) => s.addCredits);
  const [exploding, setExploding] = useState(false);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [missiles, setMissiles] = useState<MissileState[]>([]);
  const [explosions, setExplosions] = useState<ExplosionState[]>([]);
  const [hits, setHits] = useState(0);
  const [score, setScore] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const nextIdRef = useRef(1);

  const leftRef = useRef<HTMLElement | null>(null);
  const rightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([leftRef.current, rightRef.current]);
  }, []);

  useEffect(() => {
    return () => engineAudio.stop();
  }, []);

  const launchMissile = useCallback(() => {
    if (credits < MISSILE_COST) {
      alert(`크레딧 부족 (${MISSILE_COST} CR 필요)`);
      return;
    }
    addCredits(-MISSILE_COST);
    const id = nextIdRef.current++;
    const from: "bl" | "br" = Math.random() < 0.5 ? "bl" : "br";
    setMissiles((list) => [...list, { id, from, spawnAt: performance.now() }]);
    if (audioOn) engineAudio.missileWhoosh();

    // Impact after flight time → explosion at crosshair center
    window.setTimeout(() => {
      setMissiles((list) => list.filter((m) => m.id !== id));
      // crosshair is at viewport center
      const x = window.innerWidth / 2;
      const y = window.innerHeight / 2;
      const expId = nextIdRef.current++;
      setExplosions((list) => [
        ...list,
        { id: expId, x, y, spawnAt: performance.now() },
      ]);
      if (audioOn) engineAudio.explosion();
      // small flash
      setFlash(true);
      window.setTimeout(() => setFlash(false), 140);
      setHits((h) => h + 1);
      setScore((s) => s + 100);
      window.setTimeout(() => {
        setExplosions((list) => list.filter((e) => e.id !== expId));
      }, EXPLOSION_LIFE_MS);
    }, MISSILE_FLIGHT_MS);
  }, [credits, addCredits, audioOn]);

  const toggleAudio = () => {
    if (!audioOn) {
      engineAudio.start();
      engineAudio.setThrottle(0.15); // ambient idle, no active flight
      setAudioOn(true);
    } else {
      engineAudio.stop();
      setAudioOn(false);
    }
  };

  const drop = () => {
    if (credits < 100) {
      alert("크레딧 부족: 연료&크레딧 탭에서 충전하세요.");
      return;
    }
    addCredits(-100);
    setExploding(true);

    setCountdown(3);
    const tick = (n: number) => {
      setCountdown(n);
      if (n === 0) {
        setFlash(true);
        if (audioOn) engineAudio.bombRelease();
        window.setTimeout(() => setFlash(false), 180);
        window.setTimeout(() => {
          if (audioOn) engineAudio.explosion();
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

  // Keyboard: SPACE → missile, F → bomb
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        launchMissile();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        if (!exploding) drop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launchMissile, exploding]); // drop doesn't need to be in deps; referenced via closure

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

      {/* Flight path dashed curves (both missile launch vectors) */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M 5 90 Q 25 40 50 50" fill="none" stroke="rgba(0,219,231,0.25)" strokeWidth="0.2" strokeDasharray="1,1.5" />
        <path d="M 95 90 Q 75 40 50 50" fill="none" stroke="rgba(0,219,231,0.25)" strokeWidth="0.2" strokeDasharray="1,1.5" />
      </svg>

      {/* Missiles in flight — each uses a CSS animation from origin → center */}
      {missiles.map((m) => (
        <Missile key={m.id} from={m.from} />
      ))}

      {/* Explosions */}
      {explosions.map((e) => (
        <Explosion key={e.id} x={e.x} y={e.y} />
      ))}

      {/* Target data panel */}
      <aside
        ref={leftRef}
        className="absolute top-20 left-3 z-20 w-56 rounded-xl glass bevel noise p-3 space-y-2"
      >
        <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">TARGET DATA</p>
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

      {/* Guidance + Combat panel */}
      <aside
        ref={rightRef}
        className="absolute top-20 right-3 z-20 w-64 rounded-xl glass bevel noise p-3 space-y-2"
      >
        <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">COMBAT STATUS</p>
        <div className="h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 animate-pulse" />
        </div>
        <p className="font-label text-[10px] tracking-[0.25em] text-emerald-400">GUIDANCE ACTIVE</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">HITS</p>
            <p className="font-headline text-sm text-cyan-300 tabular-nums">
              <NumberTicker value={hits} />
            </p>
          </div>
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">SCORE</p>
            <p className="font-headline text-sm text-cyan-300 tabular-nums">
              <NumberTicker value={score} />
            </p>
          </div>
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">CREDITS</p>
            <p className="font-headline text-sm text-tertiary tabular-nums">
              <NumberTicker value={credits} />
            </p>
          </div>
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">MSL</p>
            <p className="font-headline text-sm text-cyan-300 tabular-nums">
              {missiles.length}/∞
            </p>
          </div>
        </div>
        <button
          onClick={toggleAudio}
          className={`w-full mt-2 flex items-center justify-center gap-1 rounded border px-2 py-1 font-label text-[10px] tracking-[0.2em] transition ${
            audioOn
              ? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
              : "border-outline-variant/50 text-on-surface-variant hover:border-cyan-400 hover:text-cyan-300"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {audioOn ? "volume_up" : "volume_off"}
          </span>
          {audioOn ? "CINEMATIC AUDIO LIVE" : "ENGAGE AUDIO"}
        </button>
      </aside>

      {/* Screen flash */}
      {flash && <div className="pointer-events-none fixed inset-0 z-40 bg-white/60" />}

      {/* Action buttons */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 flex-wrap justify-center">
        <MagneticButton
          onClick={launchMissile}
          tone="cyan"
          disabled={credits < MISSILE_COST}
          className="rounded-lg px-6 py-3 shadow-[0_0_24px_-4px_rgba(0,219,231,0.8)] disabled:opacity-60"
        >
          🚀 미사일 [SPACE] -{MISSILE_COST}CR
        </MagneticButton>
        <MagneticButton
          onClick={drop}
          disabled={exploding}
          tone="danger"
          className="rounded-lg px-6 py-3 disabled:opacity-60 disabled:cursor-wait"
        >
          {exploding ? "DROPPING..." : "💣 폭탄 [F] -100CR"}
        </MagneticButton>
        <Link href="/mission">
          <MagneticButton
            tone="ghost"
            className="rounded-lg px-6 py-3"
          >
            ⚔ 3D 작전
          </MagneticButton>
        </Link>
      </div>

      <style jsx>{`
        @keyframes missileBL {
          0% { transform: translate(-50%, 250%) rotate(-48deg) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(-48deg) scale(1.1); opacity: 0.95; }
        }
        @keyframes missileBR {
          0% { transform: translate(50%, 250%) rotate(48deg) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate(50%, -50%) rotate(48deg) scale(1.1); opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}

function Missile({ from }: { from: "bl" | "br" }) {
  const originStyle: React.CSSProperties =
    from === "bl"
      ? { left: "5%", bottom: "10%" }
      : { right: "5%", bottom: "10%" };
  const anim = from === "bl" ? "missileBL" : "missileBR";
  return (
    <div
      className="pointer-events-none absolute z-20 w-48 h-2"
      style={{
        ...originStyle,
        animation: `${anim} ${MISSILE_FLIGHT_MS}ms cubic-bezier(0.3,0,0.2,1) forwards`,
      }}
    >
      {/* Missile body */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-2 rounded-sm"
        style={{
          background: "linear-gradient(90deg, #ffb77f 0%, #fffbe5 40%, #e8ecf2 100%)",
          boxShadow: "0 0 12px rgba(255,183,127,0.9), 0 0 24px rgba(255,120,40,0.6)",
        }}
      />
      {/* Trail */}
      <div
        className="absolute right-8 top-1/2 -translate-y-1/2 w-40 h-1"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,183,127,0.2) 15%, rgba(255,150,80,0.6) 50%, rgba(255,220,180,0.95) 90%, transparent 100%)",
          filter: "blur(1.5px)",
        }}
      />
    </div>
  );
}

function Explosion({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: x,
        top: y,
        width: 0,
        height: 0,
      }}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,140,0.85) 18%, rgba(255,120,40,0.75) 40%, rgba(200,40,20,0.35) 70%, transparent 95%)",
          animation: `explosionGrow ${EXPLOSION_LIFE_MS}ms ease-out forwards`,
        }}
      />
      <style jsx>{`
        @keyframes explosionGrow {
          0% { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
          40% { transform: translate(-50%, -50%) scale(1.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }
      `}</style>
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
