"use client";

/**
 * 전술지휘소 (Command Center) — 모바일 전투 게임 본부 허브.
 *
 * 레퍼런스 DNA: Sky Warriors / Sky Combat / Ace Combat / Top Gun 모바일.
 * 원칙:
 *   - 실제 기체 사진 중심 (와이어프레임은 폴백만)
 *   - 3초 안에 "뭘 해야 하는지" 명확 → 거대한 DEPLOY 버튼
 *   - 미션 브리핑이 허브의 중심 (타겟 없음 → 타겟 선택 유도)
 *   - 상시 모션: 스캔바, 플러드라이트 스윕, 펄스 점
 *   - Smart routing: 상태 체크 후 다음 필요 단계로 자동 이동
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useTierStore } from "@/store/slices/tierSlice";
import { activeTier } from "@/lib/tiers";
import GlassCard from "@/components/fx/GlassCard";
import NumberTicker from "@/components/fx/NumberTicker";
import MagneticButton from "@/components/fx/MagneticButton";
import BootSequence from "@/components/fx/BootSequence";
import JetSilhouette from "@/components/fx/JetSilhouette";
import { bootTimeline } from "@/lib/anime-presets";
import { PLANES } from "@/lib/planes";

export default function HomePage() {
  const router = useRouter();
  const credits = useGameStore((s) => s.credits);
  const selectedPlane = useGameStore((s) => s.selectedPlane);
  const target = useGameStore((s) => s.target);
  const lastResult = useGameStore((s) => s.lastResult);
  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const tier = activeTier(unlockedKm);
  const plane = PLANES[selectedPlane] ?? PLANES[0];

  const [carrierImgOk, setCarrierImgOk] = useState(true);
  const [clock, setClock] = useState("");

  const heroRef = useRef<HTMLElement | null>(null);
  const briefRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLElement | null>(null);
  const feedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([heroRef.current, briefRef.current, ctaRef.current, feedRef.current]);
  }, []);

  useEffect(() => {
    setCarrierImgOk(true);
  }, [selectedPlane]);

  // Ticking mission clock (pseudo urgency)
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}Z`
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Smart deploy — route to the next required step
  const deploy = () => {
    if (!target) {
      router.push("/targets");
      return;
    }
    router.push("/mission");
  };

  // Pseudo mission preview numbers (replace with real calc in later phase)
  const estReward = useMemo(() => 800 + Math.round(tier.rangeKm * 1.2), [tier.rangeKm]);
  const difficulty = tier.rangeKm >= 1000 ? "★★★★" : tier.rangeKm >= 400 ? "★★★" : tier.rangeKm >= 10 ? "★★" : "★";

  // Unlocked jet count (starter + purchased — stub: only free one for now)
  const unlockedJets = 1; // TODO: persist unlocked jet IDs
  const totalJets = PLANES.length;

  return (
    <div className="relative pt-16 pb-28 min-h-screen text-on-surface overflow-hidden">
      <BootSequence />

      {/* Ambient hangar lighting (fixed background) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020] via-[#0d1428] to-[#050810]" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 25%, rgba(255,170,40,0.22), transparent 45%), radial-gradient(circle at 80% 75%, rgba(0,219,231,0.18), transparent 50%)",
          }}
        />
        {/* Scan bar */}
        <div
          className="absolute inset-x-0 h-24 opacity-40"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(0,219,231,0.15), transparent)",
            animation: "scan-vertical 9s linear infinite",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-3 space-y-4">
        {/* ═══ HERO — Carrier deck / hangar with selected jet ═══ */}
        <section ref={heroRef} className="relative overflow-hidden rounded-2xl glass bevel noise">
          <div
            className={`relative aspect-[5/3] md:aspect-[16/9] bg-gradient-to-br ${plane.gradient}`}
          >
            {/* Primary: real carrier photo — fallback: wireframe silhouette */}
            {carrierImgOk ? (
              <img
                key={plane.slug}
                src={`/images/carrier/${plane.slug}.jpg`}
                alt={`${plane.name} — CARRIER STANDBY`}
                className="absolute inset-0 w-full h-full object-cover animate-[fadeInScale_700ms_cubic-bezier(0.22,1,0.36,1)]"
                onError={() => setCarrierImgOk(false)}
              />
            ) : (
              <>
                <div className="absolute inset-0 holo-shimmer opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <JetSilhouette
                    variant={plane.variant}
                    className="w-[72%] h-[72%] -rotate-[6deg]"
                    glow={1.1}
                  />
                </div>
              </>
            )}

            {/* Heavy vignette for hangar feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 to-transparent" />

            {/* Floodlight diagonal sweep */}
            <div
              className="pointer-events-none absolute -inset-full"
              style={{
                background:
                  "linear-gradient(115deg, transparent 42%, rgba(255,200,100,0.10) 50%, transparent 58%)",
                animation: "flood-sweep 9s linear infinite",
              }}
            />

            {/* Scanline overlay */}
            <div className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent animate-scanline" />

            {/* Noise texture for hangar grit */}
            <div className="absolute inset-0 noise opacity-40" />

            {/* ── TOP-LEFT: player ID + rank pill ── */}
            <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 rounded border border-cyan-400/50 bg-black/75 backdrop-blur px-2 py-1 font-label text-[9px] tracking-[0.25em]">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span className="text-emerald-300">PLAYER ∙ PHD-LEE</span>
              </div>
              <div className="flex items-center gap-1 rounded border border-amber-400/60 bg-black/75 backdrop-blur px-2 py-1 font-label text-[9px] tracking-[0.25em]">
                <span className="material-symbols-outlined text-amber-300 text-[12px]">
                  military_tech
                </span>
                <span className="text-amber-200">RECRUIT</span>
              </div>
            </div>

            {/* ── TOP-RIGHT: pilot card + mission clock ── */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <div className="hidden sm:flex flex-col items-end rounded border border-cyan-400/40 bg-black/75 backdrop-blur px-2 py-1 font-label text-[8px] tracking-[0.25em]">
                <span className="text-cyan-300">MISSION CLOCK</span>
                <span className="text-cyan-100 tabular-nums text-[10px]">{clock || "—"}</span>
              </div>
              <div className="flex items-center gap-2 rounded border border-cyan-400/40 bg-black/75 backdrop-blur px-2 py-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/40 to-cyan-900/40 border border-cyan-400/50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-200 text-[16px]">
                    person
                  </span>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-label text-[8px] tracking-[0.25em] text-cyan-300">PILOT</p>
                  <p className="font-headline text-[10px] font-bold text-on-surface tracking-wider">
                    {plane.pilotCallsign}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Corner brackets ── */}
            {[
              "top-2 left-2 border-t border-l",
              "top-2 right-2 border-t border-r",
              "bottom-2 left-2 border-b border-l",
              "bottom-2 right-2 border-b border-r",
            ].map((c) => (
              <div key={c} className={`absolute w-6 h-6 border-cyan-400/80 ${c}`} />
            ))}

            {/* ── BOTTOM: status + aircraft name ── */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1 font-label text-[9px] tracking-[0.3em] text-amber-300">
                  <span className="relative inline-flex h-1.5 w-1.5">
                    <span className="absolute inset-0 rounded-full bg-amber-400 animate-pulse" />
                    <span className="relative rounded-full h-1.5 w-1.5 bg-amber-400" />
                  </span>
                  ARMED ∙ READY ∙ CVN-78
                </div>
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface text-glow leading-tight">
                  {plane.name}
                </h2>
                <p className="mt-0.5 font-label text-[10px] tracking-[0.25em] text-cyan-200">
                  {plane.role} · {plane.generation}
                </p>
              </div>
              <div className="hidden sm:block text-right font-label text-[9px] tracking-[0.25em] text-on-surface-variant">
                <p className="text-tertiary">SORTIE #00001</p>
                <p className="mt-0.5 opacity-70">{plane.pilotName}</p>
                <p className="mt-0.5 opacity-70">{plane.origin}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ MISSION BRIEFING ═══ */}
        <section ref={briefRef}>
          <GlassCard glow={target ? "cyan" : "none"}>
            <div className="p-4 relative">
              <div className="absolute top-3 right-3 flex items-center gap-1 rounded px-1.5 py-0.5 bg-red-500/20 border border-red-400/40">
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-red-400" />
                </span>
                <span className="font-label text-[8px] tracking-[0.3em] text-red-300">URGENT</span>
              </div>
              <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
                MISSION BRIEFING
              </p>

              {target ? (
                <>
                  <h3 className="mt-2 font-headline text-xl font-bold text-on-surface text-glow leading-tight">
                    NEXT STRIKE
                  </h3>
                  <p className="mt-0.5 font-body text-sm text-cyan-100 truncate">
                    📍 {target.address || "UNKNOWN"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-black/30 border border-cyan-400/20 py-1.5">
                      <p className="font-label text-[8px] tracking-[0.25em] text-on-surface-variant">
                        DISTANCE
                      </p>
                      <p className="mt-0.5 font-headline text-lg text-cyan-300 tabular-nums">
                        <NumberTicker value={tier.rangeKm} />
                        <span className="text-[9px] opacity-60 ml-0.5">km</span>
                      </p>
                    </div>
                    <div className="rounded-md bg-black/30 border border-amber-400/20 py-1.5">
                      <p className="font-label text-[8px] tracking-[0.25em] text-on-surface-variant">
                        REWARD
                      </p>
                      <p className="mt-0.5 font-headline text-lg text-tertiary tabular-nums">
                        +<NumberTicker value={estReward} />
                        <span className="text-[9px] opacity-60 ml-0.5">CR</span>
                      </p>
                    </div>
                    <div className="rounded-md bg-black/30 border border-red-400/20 py-1.5">
                      <p className="font-label text-[8px] tracking-[0.25em] text-on-surface-variant">
                        DIFFICULTY
                      </p>
                      <p className="mt-0.5 font-headline text-lg text-amber-300">{difficulty}</p>
                    </div>
                  </div>
                  <p className="mt-3 font-label text-[9px] tracking-[0.25em] text-on-surface-variant">
                    COORD {target.lat.toFixed(3)}°, {target.lng.toFixed(3)}° · TIER{" "}
                    <span className="text-lime-300">{tier.label}</span>
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-headline text-xl font-bold text-amber-300">
                    NO TARGET ACQUIRED
                  </h3>
                  <p className="mt-2 font-body text-sm text-on-surface-variant">
                    지구본에서 타격 좌표를 찍어야 출격 가능합니다.
                  </p>
                  <Link href="/targets" className="block mt-3">
                    <MagneticButton tone="cyan" className="w-full rounded-lg px-3 py-2 text-xs">
                      🎯 목표 지점 선택
                    </MagneticButton>
                  </Link>
                </>
              )}
            </div>
          </GlassCard>
        </section>

        {/* ═══ DEPLOY + QUICK ACTIONS ═══ */}
        <section ref={ctaRef} className="space-y-2">
          <button
            onClick={deploy}
            disabled={!target}
            className={`group relative w-full overflow-hidden rounded-xl px-6 py-5 font-headline text-xl font-bold tracking-[0.25em] transition-all ${
              target
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-black shadow-[0_0_40px_rgba(255,150,30,0.55)] hover:shadow-[0_0_64px_rgba(255,150,30,0.8)] active:scale-[0.98]"
                : "bg-on-surface-variant/10 text-on-surface-variant/40 cursor-not-allowed"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-[28px]">flight_takeoff</span>
              출 격 · DEPLOY
            </span>
            {target && (
              <span className="pointer-events-none absolute inset-0">
                <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:translate-x-[400%] transition-transform duration-700" />
              </span>
            )}
          </button>

          <div className="grid grid-cols-4 gap-2">
            <QuickAction
              href="/fleet"
              icon="airplane_ticket"
              label="기체"
              value={`${unlockedJets}/${totalJets}`}
            />
            <QuickAction
              href="/targets"
              icon="target"
              label="목표"
              value={target ? "LOCKED" : "—"}
              highlight={!!target}
            />
            <QuickAction
              href="/exchange"
              icon="radar"
              label="티어"
              value={tier.rangeKm >= 1000 ? `${tier.rangeKm / 1000}K km` : `${tier.rangeKm}km`}
              highlight={tier.rangeKm > 5}
            />
            <QuickAction
              href="/strike"
              icon="crisis_alert"
              label="타격"
              value={target ? "GO" : "—"}
            />
          </div>
        </section>

        {/* ═══ RECENT ENGAGEMENTS ═══ */}
        <section ref={feedRef}>
          <GlassCard glow="none">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
                  RECENT ENGAGEMENTS
                </p>
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-400/60 animate-pulse" />
                  <span className="relative rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              </div>
              <div className="space-y-1 font-body text-xs">
                {lastResult ? (
                  <LogRow
                    status={lastResult.hit ? "hit" : "miss"}
                    target={target?.address ?? "LAST STRIKE"}
                    reward={lastResult.creditsEarned}
                    acc={null}
                  />
                ) : (
                  <LogRow
                    status="none"
                    target="— 첫 출격 대기 중 —"
                    reward={null}
                    acc={null}
                  />
                )}
                <LogRow status="none" target="SECTOR-07 정찰" reward={null} acc={null} />
                <LogRow status="none" target="CVN-78 함대 나포" reward={null} acc={null} />
              </div>
            </div>
          </GlassCard>

          <div className="mt-3 flex items-center justify-between px-2 font-label text-[9px] tracking-[0.3em] text-on-surface-variant">
            <span>AETHER TACTICAL ∙ v0.9 ∙ SECTOR-07</span>
            <span className="text-tertiary">
              💰 <NumberTicker value={credits} /> CR
            </span>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes flood-sweep {
          0% {
            transform: translate(-30%, -30%) rotate(0deg);
          }
          100% {
            transform: translate(30%, 30%) rotate(360deg);
          }
        }
        @keyframes scan-vertical {
          0% {
            transform: translateY(-10vh);
          }
          100% {
            transform: translateY(110vh);
          }
        }
      `}</style>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  value,
  highlight,
}: {
  href: string;
  icon: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <div
        className={`rounded-lg border bg-black/35 backdrop-blur p-2 text-center transition active:scale-95 ${
          highlight
            ? "border-lime-400/60 shadow-[0_0_14px_rgba(163,230,53,0.3)]"
            : "border-cyan-400/30 hover:border-cyan-400/70"
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] ${
            highlight ? "text-lime-300" : "text-cyan-300"
          }`}
        >
          {icon}
        </span>
        <p className="mt-0.5 font-label text-[8px] tracking-[0.25em] text-on-surface-variant">
          {label}
        </p>
        <p
          className={`font-headline text-[10px] tabular-nums ${
            highlight ? "text-lime-300" : "text-cyan-300"
          }`}
        >
          {value}
        </p>
      </div>
    </Link>
  );
}

function LogRow({
  status,
  target,
  reward,
  acc,
}: {
  status: "hit" | "miss" | "none";
  target: string;
  reward: number | null;
  acc: number | null;
}) {
  const icon =
    status === "hit"
      ? "check_circle"
      : status === "miss"
        ? "cancel"
        : "radio_button_unchecked";
  const color =
    status === "hit"
      ? "text-emerald-400"
      : status === "miss"
        ? "text-red-400"
        : "text-on-surface-variant/40";
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`material-symbols-outlined text-[14px] ${color}`}>{icon}</span>
      <span className="flex-1 text-on-surface-variant truncate">{target}</span>
      {reward !== null && (
        <span className="text-tertiary tabular-nums font-label text-[10px]">+{reward}CR</span>
      )}
      {acc !== null && (
        <span className="text-cyan-300 tabular-nums font-label text-[10px]">{acc}%</span>
      )}
    </div>
  );
}
