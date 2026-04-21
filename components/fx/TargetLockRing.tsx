"use client";

import { useEffect, useState } from "react";
import { audioBus } from "@/lib/audio";

interface Props {
  active: boolean;
  onDone?: () => void;
  className?: string;
}

export default function TargetLockRing({ active, onDone, className = "" }: Props) {
  const [phase, setPhase] = useState<"idle" | "pulse">("idle");

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }
    setPhase("pulse");
    audioBus.sfx("lock");
    const t = window.setTimeout(() => {
      setPhase("idle");
      onDone?.();
    }, 1200);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  const visible = phase === "pulse";

  return (
    <div
      aria-hidden
      className={`pointer-events-none transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
    >
      <svg viewBox="0 0 200 200" className="w-40 h-40">
        {/* dashed outer */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="rgba(0,219,231,0.85)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          className={visible ? "animate-[spin_4s_linear_infinite] origin-center" : ""}
          style={{ transformOrigin: "100px 100px" }}
        />
        {/* inner ring */}
        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0,219,231,0.6)" strokeWidth="1" />
        {/* cross */}
        <line x1="100" y1="20" x2="100" y2="55" stroke="rgba(0,219,231,0.9)" strokeWidth="1.5" />
        <line x1="100" y1="145" x2="100" y2="180" stroke="rgba(0,219,231,0.9)" strokeWidth="1.5" />
        <line x1="20" y1="100" x2="55" y2="100" stroke="rgba(0,219,231,0.9)" strokeWidth="1.5" />
        <line x1="145" y1="100" x2="180" y2="100" stroke="rgba(0,219,231,0.9)" strokeWidth="1.5" />
        {/* corner brackets */}
        {[
          [30, 30, 1, 1],
          [170, 30, -1, 1],
          [30, 170, 1, -1],
          [170, 170, -1, -1],
        ].map(([cx, cy, dx, dy], i) => (
          <g key={i} stroke="rgba(255,183,127,0.9)" strokeWidth="2" fill="none">
            <line x1={cx} y1={cy} x2={cx + dx * 14} y2={cy} />
            <line x1={cx} y1={cy} x2={cx} y2={cy + dy * 14} />
          </g>
        ))}
        {/* center dot */}
        <circle cx="100" cy="100" r="3" fill="#00dbe7" />
        {/* pulse ring */}
        {visible && (
          <circle
            cx="100"
            cy="100"
            r="60"
            fill="none"
            stroke="rgba(0,219,231,0.9)"
            strokeWidth="2"
            className="animate-pulse-ring origin-center"
            style={{ transformOrigin: "100px 100px" }}
          />
        )}
      </svg>
    </div>
  );
}
