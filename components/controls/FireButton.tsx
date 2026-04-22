"use client";

/**
 * Large thumb-friendly fire button for mobile cockpit.
 *
 * Parent is responsible for debouncing — this just emits an event on each
 * press. For dogfight use, press = launch missile. For a "boost" variant
 * pass a different label/icon.
 */

import { useCallback } from "react";

export interface FireButtonProps {
  onFire: () => void;
  label?: string;
  icon?: string;
  tone?: "fire" | "boost" | "ghost";
  disabled?: boolean;
  className?: string;
}

const TONE_CLASS: Record<NonNullable<FireButtonProps["tone"]>, string> = {
  fire:
    "bg-red-600/80 border-red-300 text-white shadow-[0_0_28px_rgba(239,68,68,0.55)] hover:bg-red-500",
  boost:
    "bg-amber-500/80 border-amber-300 text-black shadow-[0_0_28px_rgba(245,158,11,0.55)] hover:bg-amber-400",
  ghost:
    "bg-black/50 border-cyan-400/50 text-cyan-300 shadow-[0_0_16px_rgba(0,219,231,0.2)] hover:border-cyan-400",
};

export default function FireButton({
  onFire,
  label = "FIRE",
  icon = "🚀",
  tone = "fire",
  disabled,
  className,
}: FireButtonProps) {
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      onFire();
    },
    [onFire, disabled],
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={onPointerDown}
      className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 font-label text-[11px] tracking-[0.2em] font-bold transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${TONE_CLASS[tone]} ${className ?? ""}`}
      style={{ touchAction: "manipulation", WebkitUserSelect: "none" }}
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl leading-none">{icon}</span>
        <span className="leading-none">{label}</span>
      </div>
    </button>
  );
}
