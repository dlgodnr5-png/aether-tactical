"use client";

/**
 * Strike — final aim-and-fire gameplay.
 *
 * Change from the previous auto-hit version: the missile no longer always
 * lands on center. The player aims with pointer/touch. A drifting red
 * target zone (the ACTUAL strike coordinate from the Cesium zoom) sits on
 * the satellite view. A hit only counts if the reticle is within the zone
 * radius when fire is pressed. Missed shots flash red and award nothing.
 *
 * Controls:
 *   - Pointer / touch move : aim the reticle
 *   - Click / tap / SPACE  : launch missile at reticle position
 *   - F                    : drop bomb (same as before)
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";
import { engineAudio } from "@/lib/engine-audio";
import { sfx } from "@/lib/sfx-registry";

interface MissileState {
  id: number;
  /** Start screen position (px). */
  sx: number;
  sy: number;
  /** Target screen position (where the missile will land, px). */
  tx: number;
  ty: number;
  spawnAt: number;
}

interface ExplosionState {
  id: number;
  x: number;
  y: number;
  isHit: boolean;
  spawnAt: number;
}

const MISSILE_COST = 50;
const MISSILE_FLIGHT_MS = 900;
const EXPLOSION_LIFE_MS = 900;

/** Target zone radius in viewport pixels. Hits within this count. */
const HIT_RADIUS_PX = 60;
/** Bonus credits per hit scaled by proximity to center. */
const HIT_BASE_REWARD = 150;

export default function StrikePage() {
  const target = useGameStore((s) => s.target);
  const credits = useGameStore((s) => s.credits);
  const addCredits = useGameStore((s) => s.addCredits);

  const [missiles, setMissiles] = useState<MissileState[]>([]);
  const [explosions, setExplosions] = useState<ExplosionState[]>([]);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const [score, setScore] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const [flashColor, setFlashColor] = useState<"hit" | "miss" | null>(null);
  const [reticle, setReticle] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const nextIdRef = useRef(1);

  // Drifting target zone (the real strike coordinate — it jitters to add skill)
  const zoneRef = useRef<{ x: number; y: number; vx: number; vy: number }>({
    x: 0, y: 0, vx: 0, vy: 0,
  });
  const [zoneDisplay, setZoneDisplay] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const leftRef = useRef<HTMLElement | null>(null);
  const rightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([leftRef.current, rightRef.current]);
  }, []);

  // Initialize reticle + zone to viewport center on mount
  useEffect(() => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    setReticle({ x: cx, y: cy });
    zoneRef.current = { x: cx, y: cy, vx: 0, vy: 0 };
    setZoneDisplay({ x: cx, y: cy });
  }, []);

  // Drift the target zone gently — simulates imprecise geolocation
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - prev) / 1000);
      prev = now;
      const z = zoneRef.current;
      // Brownian-ish velocity
      z.vx += (Math.random() - 0.5) * 40 * dt;
      z.vy += (Math.random() - 0.5) * 40 * dt;
      z.vx *= Math.pow(0.85, dt);
      z.vy *= Math.pow(0.85, dt);
      z.x += z.vx * dt;
      z.y += z.vy * dt;
      // Gentle pull toward center
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      z.x += (cx - z.x) * 0.6 * dt;
      z.y += (cy - z.y) * 0.6 * dt;
      setZoneDisplay({ x: z.x, y: z.y });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => () => engineAudio.stop(), []);

  const launchMissile = useCallback(
    (tx: number, ty: number) => {
      if (credits < MISSILE_COST) return;
      addCredits(-MISSILE_COST);
      setShots((s) => s + 1);

      const fromLeft = Math.random() < 0.5;
      const sx = fromLeft ? window.innerWidth * 0.08 : window.innerWidth * 0.92;
      const sy = window.innerHeight * 0.92;

      const id = nextIdRef.current++;
      setMissiles((list) => [...list, { id, sx, sy, tx, ty, spawnAt: performance.now() }]);
      sfx.play("missile_launch");
      if (audioOn) engineAudio.missileWhoosh();

      window.setTimeout(() => {
        setMissiles((list) => list.filter((m) => m.id !== id));

        // Resolve hit at impact time using the CURRENT zone position
        const z = zoneRef.current;
        const dx = tx - z.x;
        const dy = ty - z.y;
        const dist = Math.hypot(dx, dy);
        const isHit = dist <= HIT_RADIUS_PX;
        const expId = nextIdRef.current++;

        setExplosions((list) => [
          ...list,
          { id: expId, x: tx, y: ty, isHit, spawnAt: performance.now() },
        ]);
        sfx.play(isHit ? "explosion_large" : "miss_thud");
        if (isHit) sfx.play("hit_confirm", { volume: 0.5 });
        if (audioOn) engineAudio.explosion();

        setFlashColor(isHit ? "hit" : "miss");
        window.setTimeout(() => setFlashColor(null), 160);

        if (isHit) {
          setHits((h) => h + 1);
          // Proximity bonus: 1.0 at dead-center, fades to 0.5 at edge
          const proximity = 1 - (dist / HIT_RADIUS_PX) * 0.5;
          const reward = Math.round(HIT_BASE_REWARD * proximity);
          addCredits(reward);
          setScore((s) => s + reward);
        }

        window.setTimeout(() => {
          setExplosions((list) => list.filter((e) => e.id !== expId));
        }, EXPLOSION_LIFE_MS);
      }, MISSILE_FLIGHT_MS);
    },
    [credits, addCredits, audioOn],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setReticle({ x: e.clientX, y: e.clientY });
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setReticle({ x: e.clientX, y: e.clientY });
      launchMissile(e.clientX, e.clientY);
    },
    [launchMissile],
  );

  const toggleAudio = () => {
    if (!audioOn) {
      engineAudio.start();
      engineAudio.setThrottle(0.15);
      setAudioOn(true);
    } else {
      engineAudio.stop();
      setAudioOn(false);
    }
  };

  // Keyboard: SPACE → fire at current reticle pos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        launchMissile(reticle.x, reticle.y);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launchMissile, reticle]);

  const accuracy = shots === 0 ? 0 : Math.round((hits / shots) * 100);

  return (
    <div
      className="relative pt-16 pb-20 min-h-screen overflow-hidden cursor-crosshair"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      style={{ touchAction: "none" }}
    >
      {/* Satellite-style dark background with grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, #1a2340 0%, #0a1020 60%, #050810 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,219,231,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(0,219,231,0.25) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Drifting target zone (red circle) */}
      <div
        className="pointer-events-none absolute z-10"
        style={{
          left: zoneDisplay.x,
          top: zoneDisplay.y,
          width: HIT_RADIUS_PX * 2,
          height: HIT_RADIUS_PX * 2,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse" />
        <div className="absolute inset-2 rounded-full border border-red-400/40" />
        <div className="absolute left-1/2 top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 font-label text-[9px] tracking-[0.3em] text-red-400">
          PRIMARY TARGET
        </div>
      </div>

      {/* Reticle follows pointer */}
      <div
        className="pointer-events-none absolute z-20"
        style={{
          left: reticle.x,
          top: reticle.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/90 shadow-[0_0_20px_rgba(0,219,231,0.6)]" />
          <div className="absolute inset-3 rounded-full border border-cyan-300/60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/80" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/80" />
        </div>
      </div>

      {/* Missiles in flight */}
      {missiles.map((m) => (
        <Missile key={m.id} missile={m} />
      ))}

      {/* Explosions */}
      {explosions.map((e) => (
        <Explosion key={e.id} x={e.x} y={e.y} isHit={e.isHit} />
      ))}

      {/* Screen flash (hit = green, miss = red) */}
      {flashColor && (
        <div
          className={`pointer-events-none fixed inset-0 z-40 ${
            flashColor === "hit" ? "bg-lime-400/25" : "bg-red-500/25"
          }`}
        />
      )}

      {/* Target data panel */}
      <aside
        ref={leftRef}
        className="absolute top-20 left-3 z-30 w-56 rounded-xl glass bevel noise p-3 space-y-2 pointer-events-none"
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

      {/* Combat status panel */}
      <aside
        ref={rightRef}
        className="absolute top-20 right-3 z-30 w-64 rounded-xl glass bevel noise p-3 space-y-2 pointer-events-auto"
      >
        <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">COMBAT STATUS</p>
        <div className="h-1.5 w-full rounded-full bg-surface-container-lowest overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-cyan-500 via-cyan-300 to-cyan-500 animate-pulse" />
        </div>
        <p className="font-label text-[10px] tracking-[0.25em] text-emerald-400">
          GUIDANCE ACTIVE — 클릭으로 미사일 발사
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">HITS</p>
            <p className="font-headline text-sm text-lime-300 tabular-nums">
              <NumberTicker value={hits} />
              <span className="text-[9px] text-on-surface-variant ml-1">/{shots}</span>
            </p>
          </div>
          <div>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">ACC</p>
            <p className="font-headline text-sm text-cyan-300 tabular-nums">
              <NumberTicker value={accuracy} />
              <span className="text-[9px] text-on-surface-variant ml-1">%</span>
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
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
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
          {audioOn ? "AUDIO LIVE" : "ENGAGE AUDIO"}
        </button>
      </aside>

      {/* Action buttons (bottom nav pointer-events enabled on button zone) */}
      <div
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 flex-wrap justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant px-3 py-2 rounded bg-black/60">
          SPACE / 클릭 = 발사 (-{MISSILE_COST}CR) · 적중 시 +{HIT_BASE_REWARD}CR
        </div>
        <Link href="/mission">
          <MagneticButton tone="ghost" className="rounded-lg px-6 py-3">
            ⚔ 3D 작전
          </MagneticButton>
        </Link>
      </div>
    </div>
  );
}

function Missile({ missile }: { missile: MissileState }) {
  const { sx, sy, tx, ty } = missile;
  const dx = tx - sx;
  const dy = ty - sy;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <div
      className="pointer-events-none absolute z-25"
      style={{
        left: 0,
        top: 0,
        width: 60,
        height: 6,
        animation: `missileFly ${MISSILE_FLIGHT_MS}ms cubic-bezier(0.3,0,0.25,1) forwards`,
        transformOrigin: "0% 50%",
        // Use CSS vars for the animation to target start/end coords
        // @ts-expect-error custom CSS vars
        "--sx": `${sx}px`,
        "--sy": `${sy}px`,
        "--tx": `${tx}px`,
        "--ty": `${ty}px`,
        "--angle": `${angle}deg`,
      }}
    >
      <div
        className="w-full h-full rounded-sm"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(255,183,127,0.7) 30%, #fffbe5 100%)",
          boxShadow: "0 0 10px rgba(255,183,127,0.9), 0 0 20px rgba(255,120,40,0.6)",
        }}
      />
      <style jsx>{`
        @keyframes missileFly {
          0% {
            transform: translate(var(--sx), var(--sy)) rotate(var(--angle)) scale(0.8);
            opacity: 0;
          }
          10% { opacity: 1; }
          100% {
            transform: translate(var(--tx), var(--ty)) rotate(var(--angle)) scale(1);
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}

function Explosion({ x, y, isHit }: { x: number; y: number; isHit: boolean }) {
  const color = isHit
    ? "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(167,243,208,0.85) 18%, rgba(74,222,128,0.75) 40%, rgba(22,163,74,0.35) 70%, transparent 95%)"
    : "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,140,0.85) 18%, rgba(255,120,40,0.75) 40%, rgba(200,40,20,0.35) 70%, transparent 95%)";
  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{ left: x, top: y, width: 0, height: 0 }}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 160,
          height: 160,
          background: color,
          animation: `explosionGrow ${EXPLOSION_LIFE_MS}ms ease-out forwards`,
        }}
      />
      {!isHit && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 font-headline font-bold text-red-400 text-lg text-glow"
          style={{ top: -20 }}
        >
          MISS
        </div>
      )}
      {isHit && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 font-headline font-bold text-lime-400 text-lg text-glow"
          style={{ top: -20 }}
        >
          HIT +
        </div>
      )}
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
