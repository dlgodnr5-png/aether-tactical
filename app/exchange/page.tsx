"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useTierStore } from "@/store/slices/tierSlice";
import { useMissilesStore, MISSILE_LOW_THRESHOLD } from "@/store/slices/missilesSlice";
import { TIERS, activeTier, formatAltitudeKm, formatRangeKm, type Tier } from "@/lib/tiers";
import GlassCard from "@/components/fx/GlassCard";
import MagneticButton from "@/components/fx/MagneticButton";
import { bootTimeline } from "@/lib/anime-presets";

/**
 * Tier purchase page — 멀티 PG (Stripe / PayPal / Toss) 결제.
 *
 * 1. 사용자 → tier/reload 클릭 → POST /api/checkout {product, provider}
 * 2. response.status 분기:
 *    - "ok"                       → window.location = response.url
 *    - "client_action_required"   → Toss SDK loadTossPayments(clientKey).requestPayment(...)
 *    - "failed"                   → banner 에러
 * 3. 각 provider 가 successUrl 으로 돌아옴 → /exchange?checkout=success
 *    cookie (aether_unlocked_km / aether_missile_grant / aether_missile_reload)
 *    를 읽어 store 에 반영하고 cookie 즉시 만료.
 */

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function expireCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

type ProviderName = "stripe" | "paypal" | "toss";

const PROVIDER_LABELS: Record<ProviderName, { label: string; sub: string; icon: string }> = {
  toss:   { label: "토스",     sub: "한국 카드/계좌",  icon: "💳" },
  paypal: { label: "PayPal",   sub: "글로벌 카드",     icon: "🌐" },
  stripe: { label: "Stripe",   sub: "카드 (백업)",     icon: "💼" },
};

function detectDefaultProvider(): ProviderName {
  if (typeof navigator === "undefined") return "paypal";
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("ko")) return "toss";
  return "paypal";
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
  const { data: session, status: authStatus } = useSession();
  const isAuthed = authStatus === "authenticated" && !!session?.user?.email;

  const unlockedKm = useTierStore((s) => s.unlockedKm);
  const unlockTier = useTierStore((s) => s.unlockTier);

  const [pending, setPending] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [provider, setProvider] = useState<ProviderName>("toss");
  const currentTier = activeTier(unlockedKm);

  const searchParams = useSearchParams();
  const router = useRouter();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLElement | null>(null);
  const tiersRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setProvider(detectDefaultProvider());
    bootTimeline([headerRef.current, statusRef.current, tiersRef.current]);
  }, []);

  // 로그인 시 — 서버 grant 로드 → store 동기화 (다른 기기에서 산 미사일 복원)
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/grants", { cache: "no-store" });
        if (!res.ok) return;
        const grants = await res.json() as { tier: string; unlockedKm: number; missiles: number };
        if (cancelled) return;
        if (Number.isFinite(grants.unlockedKm) && grants.unlockedKm > 0) {
          unlockTier(grants.unlockedKm);
        }
        if (Number.isFinite(grants.missiles)) {
          // 서버가 truth — 클라 store 덮어쓰기
          useMissilesStore.setState({ count: grants.missiles });
        }
      } catch { /* offline / no upstash — 클라 store fallback */ }
    })();
    return () => { cancelled = true; };
  }, [isAuthed, unlockTier]);

  // 결제 후 redirect 처리 — cookie + query 동기화
  useEffect(() => {
    // 1. tier 언락 cookie
    const cookieKm = Number(readCookie("aether_unlocked_km"));
    if (Number.isFinite(cookieKm) && cookieKm > 0) {
      unlockTier(cookieKm);
    }

    // 2. unlimited 결제 직후 — 미사일 100발 초기 지급
    const grant = Number(readCookie("aether_missile_grant"));
    if (Number.isFinite(grant) && grant > 0) {
      useMissilesStore.getState().initializePaid();
      expireCookie("aether_missile_grant");
    }

    // 3. missile_pack reload — 100발 추가
    const reload = Number(readCookie("aether_missile_reload"));
    if (Number.isFinite(reload) && reload > 0) {
      useMissilesStore.getState().reload(reload);
      expireCookie("aether_missile_reload");
    }

    const status = searchParams.get("checkout");
    const product = searchParams.get("product");
    const usedProvider = searchParams.get("provider") ?? "결제";
    if (status === "success") {
      const text = product === "missile_pack"
        ? `✅ 충전 완료 — 미사일 100발 추가 (via ${usedProvider})`
        : product === "unlimited"
          ? `✅ 결제 완료 — UNLIMITED 해금 + 미사일 100발 (via ${usedProvider})`
          : `✅ 결제 완료 (via ${usedProvider})`;
      setBanner({ kind: "ok", text });
      router.replace("/exchange");
    } else if (status === "cancel") {
      const reason = searchParams.get("reason");
      setBanner({
        kind: "err",
        text: reason
          ? `결제 취소 (${decodeURIComponent(reason).slice(0, 80)})`
          : "결제 취소됨",
      });
      router.replace("/exchange");
    }
  }, [searchParams, router, unlockTier]);

  const startCheckout = async (product: "unlimited" | "missile_pack", pendingKey: string) => {
    if (!isAuthed) {
      setBanner({
        kind: "err",
        text: "❗ 결제 전 Google 로그인 필요 — 구매 영구 보존을 위해. 자동 이동…",
      });
      setTimeout(() => signIn("google", { callbackUrl: window.location.href }), 1200);
      return;
    }
    setPending(pendingKey);
    setBanner(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, provider }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setBanner({ kind: "err", text: "세션 만료 — 다시 로그인" });
        signIn("google", { callbackUrl: window.location.href });
        return;
      }
      if (!res.ok) throw new Error(data.error || "결제 세션 생성 실패");

      // 분기 1: 일반 redirect (Stripe / PayPal)
      if (data.status === "ok" && data.url) {
        window.location.href = data.url;
        return;
      }

      // 분기 2: Toss SDK 호출
      if (data.status === "client_action_required" && data.clientPayload?.sdk === "toss") {
        const { loadTossPayments } = await import("@tosspayments/payment-sdk");
        const toss = await loadTossPayments(data.clientPayload.clientKey);
        await toss.requestPayment(data.clientPayload.method, {
          amount: data.clientPayload.amount,
          orderId: data.clientPayload.orderId,
          orderName: data.clientPayload.orderName,
          successUrl: data.clientPayload.successUrl,
          failUrl: data.clientPayload.failUrl,
        });
        // requestPayment 가 자체 redirect — 여기 도달하면 사용자 취소
        setPending(null);
        return;
      }

      throw new Error(`알 수 없는 응답: ${JSON.stringify(data).slice(0, 100)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBanner({ kind: "err", text: `❌ ${msg}` });
      setPending(null);
    }
  };

  const purchase = async (tier: Tier) => {
    if (tier.usd === 0) {
      unlockTier(tier.rangeKm);
      setBanner({ kind: "ok", text: `${tier.label} 활성화 (반경 ${formatRangeKm(tier.rangeKm)})` });
      return;
    }
    await startCheckout("unlimited", tier.id);
  };

  const reloadMissiles = () => startCheckout("missile_pack", "missile_pack");

  const isUnlimited = currentTier.id === "unlimited";
  const upgradeTiers = TIERS.filter((t) => t.rangeKm > currentTier.rangeKm);
  const showProviderTabs = !isUnlimited || true; // 항상 (충전 시 필요)

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

        {!isAuthed && authStatus !== "loading" && (
          <GlassCard glow="orange">
            <div className="p-4 flex items-center gap-3">
              <span className="text-2xl">🔐</span>
              <div className="flex-1">
                <p className="font-headline text-sm text-amber-300">
                  Google 로그인 필요
                </p>
                <p className="font-label text-[11px] text-on-surface-variant mt-0.5">
                  구매한 미사일 / UNLIMITED 가 다른 기기·세션에서도 유지되려면 로그인하세요
                </p>
              </div>
              <MagneticButton
                onClick={() => signIn("google", { callbackUrl: window.location.href })}
                tone="cyan"
                className="rounded-lg px-4 py-2 text-xs"
              >
                Google 로그인
              </MagneticButton>
            </div>
          </GlassCard>
        )}

        {/* Current tier — UNLIMITED 시 더 prominent */}
        <section ref={statusRef}>
          <GlassCard glow={isUnlimited ? "cyan" : "none"}>
            <div className="p-4">
              <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400">
                {isUnlimited ? "✓ ACTIVE — UNLIMITED" : "ACTIVE TIER"}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`font-headline text-2xl font-semibold ${isUnlimited ? "text-cyan-300" : "text-lime-400"}`}>
                  {currentTier.label}
                </span>
                <div className="flex items-baseline gap-3 font-label text-xs tabular-nums">
                  <span className="text-on-surface-variant">고도</span>
                  <span className={isUnlimited ? "text-cyan-300" : "text-lime-300"}>{formatAltitudeKm(currentTier.altitudeKm)}</span>
                  <span className="text-on-surface-variant">/ 반경</span>
                  <span className={isUnlimited ? "text-cyan-300" : "text-lime-300"}>{formatRangeKm(currentTier.rangeKm)}</span>
                </div>
              </div>
              <p className="mt-2 font-label text-[11px] text-on-surface-variant">
                {currentTier.description}
              </p>
            </div>
          </GlassCard>
        </section>

        {/* Provider 선택 — 충전 또는 업그레이드 결제용 */}
        {showProviderTabs && <ProviderTabs current={provider} onChange={setProvider} />}

        {/* 업그레이드 카드 — UNLIMITED 시 표시 안 함 */}
        {upgradeTiers.length > 0 && (
          <section ref={tiersRef} className="space-y-3">
            <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant pl-1">
              UPGRADE
            </p>
            {upgradeTiers.map((tier) => {
              const isPending = pending === tier.id;
              return (
                <GlassCard key={tier.id} tilt glow="cyan">
                  <div className="relative p-4">
                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-sm bg-cyan-400 text-[10px] tracking-[0.3em] font-label font-bold text-[#00363a] shadow-[0_0_12px_rgba(0,219,231,0.6)]">
                      RECOMMENDED
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg border border-cyan-400/40 bg-surface-container-lowest flex flex-col items-center justify-center">
                        <span className="font-headline text-lg font-bold text-cyan-300 tabular-nums leading-none">
                          ∞
                        </span>
                        <span className="font-label text-[8px] tracking-[0.2em] text-on-surface-variant mt-0.5">
                          KM
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-headline text-lg text-on-surface font-semibold">
                          {tier.label}
                        </p>
                        <p className="font-label text-[11px] tracking-[0.2em] text-on-surface-variant">
                          무한 반경 · 무한 미션
                        </p>
                        <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
                          포탄 {tier.initialMissiles}발 + 추가 충전 \$1/100발
                        </p>
                      </div>
                      <MagneticButton
                        onClick={() => purchase(tier)}
                        disabled={isPending}
                        tone="cyan"
                        className="rounded-lg px-4 py-2 text-xs"
                      >
                        {isPending ? "로딩..." : `\$${tier.usd}`}
                      </MagneticButton>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </section>
        )}

        {/* 미사일 잔량 + Reload */}
        <MissileReloadCard onReload={reloadMissiles} pending={pending === "missile_pack"} />

        <p className="text-center font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
          * 안전 결제 · 결제 완료 시 즉시 반영
        </p>
      </div>
    </div>
  );
}

function ProviderTabs({ current, onChange }: { current: ProviderName; onChange: (p: ProviderName) => void }) {
  const order: ProviderName[] = ["toss", "paypal", "stripe"];
  return (
    <div className="grid grid-cols-3 gap-2">
      {order.map((p) => {
        const meta = PROVIDER_LABELS[p];
        const active = current === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              active
                ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_12px_rgba(0,219,231,0.4)]"
                : "border-on-surface-variant/30 hover:border-cyan-400/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{meta.icon}</span>
              <div>
                <div className={`font-headline text-sm font-semibold ${active ? "text-cyan-300" : "text-on-surface"}`}>
                  {meta.label}
                </div>
                <div className="font-label text-[10px] tracking-[0.2em] text-on-surface-variant">
                  {meta.sub}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** 미사일 잔량 + 100발 충전 CTA */
function MissileReloadCard({ onReload, pending }: { onReload: () => void; pending: boolean }) {
  const count = useMissilesStore((s) => s.count);
  const isLow = count <= MISSILE_LOW_THRESHOLD;
  const isCritical = count <= 1;

  const tone = isCritical ? "text-red-400 animate-pulse" : isLow ? "text-amber-400" : "text-lime-300";

  return (
    <GlassCard glow={isCritical ? "orange" : "none"}>
      <div className="p-4 flex items-center gap-4">
        <div className="text-3xl">🚀</div>
        <div className="flex-1">
          <p className="font-label text-[10px] tracking-[0.3em] text-on-surface-variant">
            MISSILES
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className={`font-headline text-3xl tabular-nums ${tone}`}>
              {count}
            </span>
            <span className="text-on-surface-variant text-sm">발</span>
          </div>
          {isLow && (
            <p className="font-label text-[10px] text-amber-400 mt-1">
              {isCritical ? "충전 필요" : "잔량 부족"}
            </p>
          )}
        </div>
        <MagneticButton
          onClick={onReload}
          disabled={pending}
          tone={isCritical ? "danger" : "ghost"}
          className="rounded-lg px-4 py-2 text-xs"
        >
          {pending ? "결제..." : "$1 / 100발"}
        </MagneticButton>
      </div>
    </GlassCard>
  );
}
