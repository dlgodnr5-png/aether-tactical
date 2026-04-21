"use client";

import { forwardRef, useEffect, useRef } from "react";
import { tiltCard } from "@/lib/anime-presets";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  tilt?: boolean;
  glow?: "cyan" | "orange" | "none";
  children?: React.ReactNode;
}

const GlassCard = forwardRef<HTMLDivElement, Props>(function GlassCard(
  { tilt = false, glow = "cyan", className = "", children, ...rest },
  ref
) {
  const inner = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tilt || !inner.current) return;
    return tiltCard(inner.current);
  }, [tilt]);

  const glowClass =
    glow === "cyan"
      ? "shadow-[0_0_30px_-10px_rgba(0,219,231,0.45)]"
      : glow === "orange"
      ? "shadow-[0_0_30px_-10px_rgba(255,183,127,0.45)]"
      : "";

  return (
    <div ref={ref} {...rest} className={`relative ${className}`}>
      <div
        ref={inner}
        className={`relative overflow-hidden rounded-xl glass bevel noise ${glowClass}`}
      >
        {children}
        {/* inner holographic sheen */}
        <div className="pointer-events-none absolute inset-0 holo-shimmer opacity-70" />
      </div>
    </div>
  );
});

export default GlassCard;
