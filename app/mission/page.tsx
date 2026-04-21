"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import MagneticButton from "@/components/fx/MagneticButton";
import NumberTicker from "@/components/fx/NumberTicker";
import CarrierLaunch from "@/components/fx/CarrierLaunch";
import { engineAudio } from "@/lib/engine-audio";
import type {
  AltitudeTier,
  MissionState,
  MissionEvent,
  SteeringInput,
} from "@/components/fx/MissionScene";

const MissionScene = dynamic(() => import("@/components/fx/MissionScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f24]">
      <p className="font-label tracking-[0.3em] text-cyan-400 animate-pulse text-sm">
        INITIALIZING MISSION COMPUTER...
      </p>
    </div>
  ),
});

const TIER_COST: Record<AltitudeTier, number> = {
  1: 1000,
  2: 5000,
  3: 10000,
};

const TIER_LABEL: Record<AltitudeTier, string> = {
  1: "$1 ∙ 10 KM",
  2: "$5 ∙ KARMAN LINE",
  3: "$10 ∙ LOW EARTH ORBIT",
};

const TIER_KM: Record<AltitudeTier, number> = {
  1: 10,
  2: 100,
  3: 400,
};

export default function MissionPage() {
  const credits = useGameStore((s) => s.credits);
  const target = useGameStore((s) => s.target);
  const addCredits = useGameStore((s) => s.addCredits);
  const [tier, setTier] = useState<AltitudeTier>(1);
  const [audioOn, setAudioOn] = useState(false);
  const [fireToken, setFireToken] = useState(0);
  const [boostToken, setBoostToken] = useState(0);
  const [cockpitView, setCockpitView] = useState(false);
  const [launchComplete, setLaunchComplete] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem("mission:launched") === "1";
  });
  const [hud, setHud] = useState<MissionState>({
    tier: 1,
    altitude: 0,
    distanceToTarget: 100,
    throttle: 0.7,
    speed: 35,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    missionComplete: false,
    score: 0,
    missilesFired: 0,
    hitsLanded: 0,
    hp: 100,
  });
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimerRef = useRef<number | null>(null);
  const [missionDone, setMissionDone] = useState(false);

  // === Steering state (updated every frame via refs to avoid re-render) ===
  const keyStateRef = useRef({ up: false, down: false, left: false, right: false, qyaw: false, eyaw: false });
  const mouseStateRef = useRef({ active: false, dx: 0, dy: 0 });
  const [steering, setSteering] = useState<SteeringInput>({ pitch: 0, roll: 0, yaw: 0 });

  // Loop: read key/mouse → compute steering every frame
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const k = keyStateRef.current;
      const m = mouseStateRef.current;
      let pitch = 0;
      let roll = 0;
      let yaw = 0;
      if (k.up) pitch += 1;
      if (k.down) pitch -= 1;
      if (k.left) roll -= 1;
      if (k.right) roll += 1;
      if (k.qyaw) yaw -= 1;
      if (k.eyaw) yaw += 1;
      // Mouse influence blends with keyboard (mouse wins when active)
      if (m.active) {
        pitch = Math.max(-1, Math.min(1, pitch + -m.dy));
        roll = Math.max(-1, Math.min(1, roll + m.dx));
      }
      setSteering({ pitch, roll, yaw });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  // === Audio lifecycle ===
  useEffect(() => {
    return () => {
      engineAudio.stop();
    };
  }, []);

  const toggleAudio = () => {
    if (!audioOn) {
      engineAudio.start();
      setAudioOn(true);
    } else {
      engineAudio.stop();
      setAudioOn(false);
    }
  };

  useEffect(() => {
    if (audioOn) engineAudio.setThrottle(hud.throttle);
  }, [hud.throttle, audioOn]);

  const showBanner = useCallback((msg: string, ms = 2200) => {
    setBanner(msg);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  const onEvent = useCallback(
    (event: MissionEvent) => {
      if (event.type === "fired") {
        engineAudio.missileWhoosh();
      } else if (event.type === "hit") {
        engineAudio.explosion();
        if (event.obstacleType === "enemy") showBanner(">> ENEMY DOWN <<", 1400);
        else if (event.obstacleType === "asteroid") showBanner(">> ASTEROID DESTROYED <<", 1400);
      } else if (event.type === "border-crossed") {
        showBanner("⚠ 국경 돌입 ∙ 적 전투기 요격 접근", 2800);
      } else if (event.type === "bomb-dropped") {
        engineAudio.bombRelease();
        window.setTimeout(() => engineAudio.explosion(), 900);
        showBanner("💥 타겟 폭파 성공", 1800);
      } else if (event.type === "mission-complete") {
        setMissionDone(true);
        addCredits(500 + hud.score);
      } else if (event.type === "hp-loss") {
        showBanner("⚠ 피격", 1000);
      }
    },
    [addCredits, hud.score, showBanner]
  );

  // === Keyboard controls ===
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setFireToken((t) => t + 1); return; }
      if (e.key === "Shift") { setBoostToken((t) => t + 1); return; }
      if (e.code === "KeyV") { setCockpitView((v) => !v); return; }
      const k = keyStateRef.current;
      if (e.code === "KeyW" || e.code === "ArrowUp") { k.up = true; e.preventDefault(); }
      if (e.code === "KeyS" || e.code === "ArrowDown") { k.down = true; e.preventDefault(); }
      if (e.code === "KeyA" || e.code === "ArrowLeft") { k.left = true; e.preventDefault(); }
      if (e.code === "KeyD" || e.code === "ArrowRight") { k.right = true; e.preventDefault(); }
      if (e.code === "KeyQ") k.qyaw = true;
      if (e.code === "KeyE") k.eyaw = true;
    };
    const onUp = (e: KeyboardEvent) => {
      const k = keyStateRef.current;
      if (e.code === "KeyW" || e.code === "ArrowUp") k.up = false;
      if (e.code === "KeyS" || e.code === "ArrowDown") k.down = false;
      if (e.code === "KeyA" || e.code === "ArrowLeft") k.left = false;
      if (e.code === "KeyD" || e.code === "ArrowRight") k.right = false;
      if (e.code === "KeyQ") k.qyaw = false;
      if (e.code === "KeyE") k.eyaw = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // === Mouse steering (pointer movement within viewport) ===
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // Only apply when pointer is over the canvas area, not over HUD panels
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-hud-panel]")) {
        mouseStateRef.current.active = false;
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dx = (e.clientX / w) * 2 - 1; // -1..1
      const dy = (e.clientY / h) * 2 - 1;
      // Dead zone in center
      const dead = 0.12;
      const nx = Math.abs(dx) < dead ? 0 : Math.sign(dx) * (Math.abs(dx) - dead) / (1 - dead);
      const ny = Math.abs(dy) < dead ? 0 : Math.sign(dy) * (Math.abs(dy) - dead) / (1 - dead);
      mouseStateRef.current.active = true;
      mouseStateRef.current.dx = Math.max(-1, Math.min(1, nx));
      mouseStateRef.current.dy = Math.max(-1, Math.min(1, ny));
    };
    const onLeave = () => { mouseStateRef.current.active = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const purchaseTier = (next: AltitudeTier) => {
    if (next === tier) return;
    const cost = TIER_COST[next] - TIER_COST[tier];
    if (cost > 0 && credits < cost) {
      showBanner(`✗ 크레딧 부족 (${cost.toLocaleString()} CR 필요)`);
      return;
    }
    if (cost > 0) addCredits(-cost);
    setTier(next);
    showBanner(`✓ 고도 티어 ${next} 승급 ∙ ${TIER_LABEL[next]}`, 2000);
  };

  const restart = () => {
    setMissionDone(false);
    setTier(1);
    setFireToken(0);
    setBoostToken(0);
    window.location.reload();
  };

  return (
    <div className="relative pt-16 pb-20 min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <MissionScene
          tier={tier}
          fireToken={fireToken}
          boostToken={boostToken}
          steering={steering}
          cockpitView={cockpitView}
          paused={!launchComplete}
          onStateChange={setHud}
          onEvent={onEvent}
        />
      </div>

      {/* Carrier launch cutscene — plays once per session before physics starts */}
      {!launchComplete && (
        <div className="absolute inset-0 z-20">
          <CarrierLaunch
            variant="fighter"
            onComplete={() => {
              window.sessionStorage.setItem("mission:launched", "1");
              setLaunchComplete(true);
            }}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        {/* Top-left: altitude + flight data */}
        <div data-hud-panel className="pointer-events-auto absolute top-20 left-4 w-64 rounded-xl glass bevel noise p-3 space-y-2">
          <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
            ALTITUDE — {TIER_LABEL[tier]}
          </p>
          <p className="font-headline text-2xl font-bold text-primary tabular-nums text-glow">
            <NumberTicker value={Math.floor(hud.altitude)} duration={250} />
            <span className="ml-1 text-sm text-on-surface-variant font-label">m</span>
          </p>
          <div className="grid grid-cols-3 gap-1 text-[9px] font-label tracking-[0.2em] text-on-surface-variant">
            <div>
              <p>SPD</p>
              <p className="text-cyan-300 tabular-nums">{Math.floor(hud.speed)}</p>
            </div>
            <div>
              <p>PIT</p>
              <p className="text-cyan-300 tabular-nums">{hud.pitchDeg.toFixed(0)}°</p>
            </div>
            <div>
              <p>ROL</p>
              <p className="text-cyan-300 tabular-nums">{hud.rollDeg.toFixed(0)}°</p>
            </div>
          </div>
          <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
            TARGET {Math.floor(hud.distanceToTarget)}%
          </p>
          <div className="h-1 w-full rounded-full bg-surface-container-lowest overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-tertiary via-orange-400 to-red-400 transition-[width] duration-300"
              style={{ width: `${100 - hud.distanceToTarget}%` }}
            />
          </div>
          <p className="font-label text-[9px] tracking-[0.25em] text-on-surface-variant">
            HULL {Math.floor(hud.hp)}% / HITS {hud.hitsLanded} / SCORE {hud.score}
          </p>
          <div className="h-1 w-full rounded-full bg-surface-container-lowest overflow-hidden">
            <div
              className={`h-full transition-[width] duration-300 ${
                hud.hp > 50 ? "bg-emerald-400" : hud.hp > 25 ? "bg-tertiary" : "bg-red-500"
              }`}
              style={{ width: `${Math.max(0, hud.hp)}%` }}
            />
          </div>
        </div>

        {/* Top-right: controls */}
        <div data-hud-panel className="pointer-events-auto absolute top-20 right-4 w-64 rounded-xl glass bevel noise p-3 space-y-2">
          <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">TIER UP</p>
          <div className="space-y-1.5">
            {([1, 2, 3] as AltitudeTier[]).map((t) => {
              const delta = TIER_COST[t] - TIER_COST[tier];
              const disabled = t <= tier;
              return (
                <button
                  key={t}
                  onClick={() => purchaseTier(t)}
                  disabled={disabled}
                  className={`w-full flex items-center justify-between rounded border px-2 py-1 font-label text-[10px] tracking-[0.2em] transition ${
                    tier === t
                      ? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
                      : disabled
                      ? "border-outline-variant/30 text-on-surface-variant/50 cursor-not-allowed"
                      : "border-outline-variant/50 text-on-surface-variant hover:border-cyan-400 hover:text-cyan-300"
                  }`}
                >
                  <span>T{t} · {TIER_KM[t]}KM</span>
                  <span>{disabled ? (tier === t ? "ACTIVE" : "—") : `-${delta.toLocaleString()} CR`}</span>
                </button>
              );
            })}
          </div>
          <div className="pt-2 border-t border-outline-variant/30 space-y-1">
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">
              CREDITS <span className="float-right text-tertiary tabular-nums"><NumberTicker value={credits} /></span>
            </p>
            <p className="font-label text-[9px] tracking-[0.2em] text-on-surface-variant">
              MISSILES <span className="float-right text-cyan-300 tabular-nums">{hud.missilesFired}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={toggleAudio}
              className={`flex items-center justify-center gap-1 rounded border px-2 py-1 font-label text-[10px] tracking-[0.2em] transition ${
                audioOn
                  ? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
                  : "border-outline-variant/50 text-on-surface-variant hover:border-cyan-400 hover:text-cyan-300"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {audioOn ? "volume_up" : "volume_off"}
              </span>
              {audioOn ? "ENGINE" : "OFF"}
            </button>
            <button
              onClick={() => setCockpitView((v) => !v)}
              className={`flex items-center justify-center gap-1 rounded border px-2 py-1 font-label text-[10px] tracking-[0.2em] transition ${
                cockpitView
                  ? "border-cyan-400 text-cyan-300 bg-cyan-400/10"
                  : "border-outline-variant/50 text-on-surface-variant hover:border-cyan-400 hover:text-cyan-300"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {cockpitView ? "visibility" : "visibility_off"}
              </span>
              {cockpitView ? "COCKPIT" : "CHASE"}
            </button>
          </div>
        </div>

        {/* Artificial horizon indicator (center) — reflects pitch/roll */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div
            className="relative w-32 h-32 rounded-full border border-cyan-400/50"
            style={{ transform: `rotate(${-hud.rollDeg}deg)` }}
          >
            <div
              className="absolute left-0 right-0 h-px bg-cyan-400/80"
              style={{ top: `${50 - hud.pitchDeg * 0.5}%` }}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* Banner */}
        {banner && (
          <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 font-headline text-xl sm:text-2xl font-bold text-cyan-300 text-glow tracking-[0.15em] animate-pulse">
            {banner}
          </div>
        )}

        {/* Mission complete overlay */}
        {missionDone && (
          <div data-hud-panel className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <div className="rounded-xl glass bevel noise p-6 w-80 space-y-3 text-center">
              <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">MISSION COMPLETE</p>
              <h2 className="font-headline text-3xl font-bold text-primary text-glow">작전 성공</h2>
              <div className="space-y-1 text-left font-label text-xs text-on-surface-variant">
                <p className="flex justify-between">
                  <span>SCORE</span>
                  <span className="text-cyan-300 tabular-nums">{hud.score}</span>
                </p>
                <p className="flex justify-between">
                  <span>HITS</span>
                  <span className="text-cyan-300 tabular-nums">
                    {hud.hitsLanded} / {hud.missilesFired}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span>MAX ALT</span>
                  <span className="text-cyan-300 tabular-nums">{Math.floor(hud.altitude).toLocaleString()}m</span>
                </p>
                <p className="flex justify-between">
                  <span>REWARD</span>
                  <span className="text-tertiary tabular-nums">+{(500 + hud.score).toLocaleString()} CR</span>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <MagneticButton onClick={restart} tone="ghost" className="flex-1 rounded-lg px-3 py-2 text-xs">
                  RESTART
                </MagneticButton>
                <Link href="/" className="flex-1">
                  <MagneticButton tone="cyan" className="w-full rounded-lg px-3 py-2 text-xs">
                    HOME
                  </MagneticButton>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* FIRE button (mobile-friendly) */}
        <button
          onClick={() => setFireToken((t) => t + 1)}
          data-hud-panel
          className="pointer-events-auto fixed bottom-24 left-1/2 -translate-x-1/2 z-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white font-label tracking-[0.2em] text-sm font-bold px-8 py-4 shadow-[0_0_32px_-4px_rgba(255,40,40,0.7)] active:scale-95 transition"
        >
          🚀 FIRE [SPACE]
        </button>

        {/* Bottom status */}
        <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between font-label text-[10px] tracking-[0.3em] text-cyan-400/70">
          <span>MACH {(1 + hud.throttle * 2).toFixed(1)} ∙ {audioOn ? "AUDIO LIVE" : "AUDIO OFF"}</span>
          <span>
            TARGET {target ? `${target.lat.toFixed(2)}°, ${target.lng.toFixed(2)}°` : "— NO TARGET —"}
          </span>
          <span>WASD/화살표: 조향 ∙ SPACE: 발사 ∙ SHIFT: 부스트 ∙ V: 콕핏</span>
        </div>
      </div>
    </div>
  );
}
