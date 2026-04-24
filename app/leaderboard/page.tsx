"use client";

import { useEffect, useRef, useState } from "react";
import { getTop10, type ScoreEntry } from "@/lib/scoreboard";
import GlassCard from "@/components/fx/GlassCard";
import { bootTimeline } from "@/lib/anime-presets";

const PLANE_NAMES = ["F-35", "J-20", "KF-21", "F-22", "KAAN"];
const PLANE_FLAGS = ["🇺🇸", "🇨🇳", "🇰🇷", "🇺🇸", "🇹🇷"];

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([headerRef.current, tableRef.current]);
    getTop10()
      .then((data) => setScores(data))
      .catch((e) => setError(e.message ?? "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative pt-20 pb-28 min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 space-y-5">
        {/* Header */}
        <div ref={headerRef} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">leaderboard</span>
          <div>
            <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
              GLOBAL // COMBAT RANKING
            </p>
            <h1 className="font-headline text-2xl font-bold text-on-surface text-glow">
              스코어보드
            </h1>
          </div>
        </div>

        {/* Table */}
        <section ref={tableRef}>
          <GlassCard glow="none">
            <div className="p-2">
              {/* Column headers */}
              <div className="grid grid-cols-[2rem_1fr_6rem_6rem_6rem] gap-2 px-3 py-2 border-b border-cyan-400/10">
                <span className="font-label text-[9px] tracking-[0.3em] text-on-surface-variant">#</span>
                <span className="font-label text-[9px] tracking-[0.3em] text-on-surface-variant">PILOT</span>
                <span className="font-label text-[9px] tracking-[0.3em] text-on-surface-variant text-right">SCORE</span>
                <span className="font-label text-[9px] tracking-[0.3em] text-on-surface-variant text-right">KILLS</span>
                <span className="font-label text-[9px] tracking-[0.3em] text-on-surface-variant text-right">AIRCRAFT</span>
              </div>

              {loading && (
                <div className="py-12 text-center font-label text-xs tracking-[0.3em] text-cyan-400 animate-pulse">
                  LOADING TELEMETRY…
                </div>
              )}

              {error && (
                <div className="py-8 text-center font-label text-xs text-red-400">{error}</div>
              )}

              {!loading && !error && scores.length === 0 && (
                <div className="py-12 text-center font-label text-xs tracking-[0.3em] text-on-surface-variant">
                  첫 번째 파일럿이 되어보세요 ↑
                </div>
              )}

              {scores.map((entry, i) => {
                const isTop3 = i < 3;
                const rankColor =
                  i === 0
                    ? "text-yellow-400"
                    : i === 1
                    ? "text-slate-300"
                    : i === 2
                    ? "text-amber-600"
                    : "text-on-surface-variant";

                return (
                  <div
                    key={i}
                    className={`grid grid-cols-[2rem_1fr_6rem_6rem_6rem] gap-2 px-3 py-3 border-b border-cyan-400/5 last:border-b-0 transition-colors hover:bg-cyan-400/5 ${
                      isTop3 ? "bg-cyan-400/[0.03]" : ""
                    }`}
                  >
                    <span className={`font-headline text-sm font-bold ${rankColor}`}>
                      {i + 1}
                    </span>
                    <span className="font-body text-sm text-on-surface truncate">
                      {entry.displayName}
                    </span>
                    <span className="font-label text-xs tabular-nums text-cyan-400 text-right">
                      {entry.score.toLocaleString()}
                    </span>
                    <span className="font-label text-xs tabular-nums text-orange-400 text-right">
                      {entry.enemiesDowned}
                    </span>
                    <span className="font-label text-[10px] text-on-surface-variant text-right">
                      {PLANE_FLAGS[entry.plane] ?? ""}{" "}
                      {PLANE_NAMES[entry.plane] ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </section>

        <p className="text-center font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
          * 실시간 · 미션 완료 시 자동 등록 (Google 로그인 필요)
        </p>
      </div>
    </div>
  );
}
