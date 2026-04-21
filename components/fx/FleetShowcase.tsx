"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import JetSilhouette from "./JetSilhouette";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant: Variant;
  className?: string;
}

export default function FleetShowcase({ variant, className = "" }: Props) {
  const jetRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let jetAnim: ReturnType<typeof animate> | null = null;
    let ringAnim: ReturnType<typeof animate> | null = null;

    if (jetRef.current) {
      jetAnim = animate(jetRef.current, {
        rotateY: [
          { to: 14, duration: 3200 },
          { to: -14, duration: 3200 },
        ],
        rotateX: [
          { to: 6, duration: 3200 },
          { to: -2, duration: 3200 },
        ],
        translateY: [
          { to: -8, duration: 2400 },
          { to: 0, duration: 2400 },
        ],
        loop: true,
        alternate: true,
        ease: "inOutSine",
      });
    }
    if (ringRef.current) {
      ringAnim = animate(ringRef.current, {
        rotate: "1turn",
        duration: 18000,
        loop: true,
        ease: "linear",
      });
    }

    return () => {
      jetAnim?.pause();
      ringAnim?.pause();
    };
  }, [variant]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      style={{ perspective: "1400px", perspectiveOrigin: "50% 45%" }}
    >
      {/* Rotating hologram platform ring */}
      <div
        className="absolute left-1/2 bottom-[10%] -translate-x-1/2 w-[78%] h-[28%] pointer-events-none"
        style={{ transform: "rotateX(72deg)", transformOrigin: "50% 100%" }}
      >
        <div
          ref={ringRef}
          className="relative w-full h-full rounded-full border border-cyan-400/25"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,219,231,0.15) 0%, rgba(0,219,231,0.04) 40%, transparent 70%)",
            boxShadow:
              "inset 0 0 40px rgba(0,219,231,0.18), 0 0 40px -8px rgba(0,219,231,0.35)",
          }}
        >
          {/* tick marks on ring */}
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-0 h-1.5 w-[2px] bg-cyan-400/45"
              style={{
                transform: `translate(-50%, 0) rotate(${(360 / 24) * i}deg)`,
                transformOrigin: "50% 50vmin",
              }}
            />
          ))}
        </div>
      </div>

      {/* Ground ambient shadow (elliptical) */}
      <div
        aria-hidden
        className="absolute left-1/2 bottom-[14%] -translate-x-1/2 w-[58%] h-4 rounded-[50%] bg-black/55 blur-md"
      />

      {/* Altitude scan tick lines (flying atmosphere feel) */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-6 opacity-35">
        {["60K", "45K", "30K", "15K", "0M"].map((tick) => (
          <div
            key={tick}
            className="flex items-center gap-2 px-4 font-label text-[9px] tracking-[0.3em] text-cyan-400"
          >
            <span className="w-6 h-px bg-cyan-400/50" />
            <span>{tick}</span>
          </div>
        ))}
      </div>

      {/* The jet itself — with 3D transform */}
      <div
        ref={jetRef}
        className="absolute inset-0 flex items-center justify-center will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Back glow silhouette (behind, larger, blurred) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: "translateZ(-30px) scale(1.05)", filter: "blur(14px)" }}
        >
          <JetSilhouette variant={variant} className="w-[70%] h-[70%] opacity-45" glow={0.8} />
        </div>
        {/* Hero layer */}
        <JetSilhouette variant={variant} className="relative w-[72%] h-[72%]" glow={1.3} />
        {/* Front highlight ghost (subtle) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: "translateZ(12px)", mixBlendMode: "screen" }}
        >
          <JetSilhouette variant={variant} className="w-[72%] h-[72%] opacity-25" glow={0.6} />
        </div>
      </div>

      {/* Corner brackets reinforcing HUD feel */}
      {[
        "top-2 left-2 border-t border-l",
        "top-2 right-2 border-t border-r",
        "bottom-2 left-2 border-b border-l",
        "bottom-2 right-2 border-b border-r",
      ].map((c) => (
        <div key={c} className={`pointer-events-none absolute w-6 h-6 border-cyan-400/70 ${c}`} />
      ))}
    </div>
  );
}
