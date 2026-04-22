"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTierStore } from "@/store/slices/tierSlice";
import { TIERS, activeTier, type Tier } from "@/lib/tiers";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";

/**
 * Tier purchase page — real Stripe Checkout flow.
 *
 *   1. User clicks tier → POST /api/checkout
 *   2. Redirect to Stripe Checkout URL
 *   3. On success Stripe redirects back to ?checkout=success&tier=$N
 *      The webhook /api/stripe-webhook sets `aether_unlocked_km` cookie.
 *      Here on success, we mirror it into useTierStore.
 *   4. Free tier unlocks instantly without Stripe call.
 */

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function ExchangePage() {
  return (
    <Suspense
      fallback={
        <div className="pt-20 text-center font-label text-xs tracking-[0.3em] text-cyan-400">
          LOADING TIERS…
        </div>
      }
    >
      <ExchangeInner />
    </Suspense>
  );
}

function ExchangeInner() {
  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const unlockTier = useTierStore((s) => s.unlockTier);

  const [pending, setPending] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const currentTier = activeTier(unlockedKm);

  const searchParams = useSearchParams();
  const router = useRouter();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLElement | null>(null);
  const tiersRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    bootTimeline([headerRef.current, statusRef.current, tiersRef.current]);
  }, []);

  // Sync tier unlock from cookie (set by webhook) or success param
  useEffect(() => {
    const cookieKm = Number(readCookie("aether_unlocked_km"));
    if (Number.isFinite(cookieKm) && cookieKm > 0) {
      unlockTier(cookieKm);
    }

    const status = searchParams.get("checkout");
    const tierUsd = Number(searchParams.get("tier"));
    if (status === "success" && Number.isFinite(tierUsd)) {
      const tier = TIERS.find((t) => t.usd === tierUsd);
      if (tier) {
        unlockTier(tier.km);
        setBanner({
          kind: "ok",
          text: `✅ 결제 완료 — ${tier.label} (${tier.km}km) 해금`,
        });
      }
      // Clear query params so refresh doesn't re-run
      router.replace("/exchange");
    } else if (status === "cancel") {
      setBanner({ kind: "err", text: "결제 취소됨" });
      router.replace("/exchange");
    }
  }, [searchParams, router, unlockTier]);

  const purchase = async (tier: Tier) => {
    if (tier.usd === 0) {
      // Free tier instant unlock
      unlockTier(tier.km);
      setBanner({ kind: "ok", text: `${tier.label} (${tier.km}km) 활성화` });
      return;
    }
    setPending(tier.id);
    setBanner(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierUsd: tier.usd }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "결제 세션 생성 실패");
      }
      window.location.href = data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBanner({ kind: "err", text: `❌ ${msg}` });
      setPending(null);
    }
  };

  return (
    <div className="relative pt-20 pb-28 min-h-screen">
      <div className="relative mx-auto max-w-3xl px-4 space-y-5">
        <div ref={headerRef} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400">radar</span>
          <div>
            <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
              RANGE // TIER ACQUISITION
            </p>
            <h1 className="font-headline text-2xl font-bold text-on-surface text-glow">
              작전 반경 구매
            </h1>
          </div>
        </div>

        {banner && (
          <div
            className={`rounded-lg border px-4 py-3 font-label text-xs tracking-[0.2em] ${
              banner.kind === "ok"
                ? "border-lime-400/50 bg-lime-400/10 text-lime-300"
                : "border-red-400/50 bg-red-400/10 text-red-300"
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* Current tier */}
        <section ref={statusRef}>
          <GlassCard glow="none">
            <div className="p-4">
              <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant">
                ACTIVE TIER
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-headline text-2xl font-semibold text-lime-400">
                  {currentTier.label}
                </span>
                <span className="font-label text-xs tabular-nums text-lime-300">
                  {currentTier.km.toLocaleString()}km
                </span>
              </div>
              <p className="mt-1 font-label text-[11px] text-on-surface-variant">
                {currentTier.description}
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Tiers */}
        <section ref={tiersRef} className="space-y-3">
          {TIERS.map((tier) => {
            const isActive = tier.km === currentTier.km;
            const isUpgrade = tier.km > currentTier.km;
            const isPending = pending === tier.id;
            return (
              <GlassCard
                key={tier.id}
                tilt={!isActive}
                glow={tier.usd === 5 ? "cyan" : "none"}
              >
                <div className="relative p-4">
                  {tier.usd === 5 && (
                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-sm bg-cyan-400 text-[10px] tracking-[0.3em] font-label font-bold text-[#00363a] shadow-[0_0_12px_rgba(0,219,231,0.6)]">
                      RECOMMENDED
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-sm bg-lime-400 text-[10px] tracking-[0.3em] font-label font-bold text-[#052a0e]">
                      ACTIVE
                    </span>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg border border-cyan-400/40 bg-surface-container-lowest flex items-center justify-center">
                      <span className="font-headline text-lg font-bold text-cyan-300 tabular-nums">
                        {tier.km >= 1000 ? `${tier.km / 1000}K` : tier.km}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-headline text-lg text-on-surface font-semibold">
                        {tier.label}
                      </p>
                      <p className="font-label text-[11px] tracking-[0.2em] text-on-surface-variant">
                        반경 {tier.km.toLocaleString()}km
                      </p>
                    </div>
                    <MagneticButton
                      onClick={() => purchase(tier)}
                      disabled={isActive || isPending || !isUpgrade}
                      tone={tier.usd === 5 ? "cyan" : "ghost"}
                      className={`rounded-lg px-4 py-2 text-xs ${
                        isActive || !isUpgrade ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isActive
                        ? "현재"
                        : isPending
                          ? "로딩..."
                          : tier.usd === 0
                            ? "FREE"
                            : `$${tier.usd}`}
                    </MagneticButton>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </section>

        <p className="text-center font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
          * Stripe 안전 결제 · 결제 완료 시 즉시 반경 확장
        </p>
      </div>
    </div>
  );
}
