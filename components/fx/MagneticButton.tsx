"use client";

import { forwardRef, useEffect, useRef } from "react";
import { magneticHover, ripple } from "@/lib/anime-presets";
import { audioBus } from "@/lib/audio";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "cyan" | "danger" | "ghost";
  rippleColor?: string;
  magnetStrength?: number;
};

const MagneticButton = forwardRef<HTMLButtonElement, Props>(
  function MagneticButton(
    {
      tone = "cyan",
      rippleColor,
      magnetStrength = 6,
      className = "",
      onClick,
      onPointerDown,
      children,
      ...rest
    },
    ref
  ) {
    const localRef = useRef<HTMLButtonElement | null>(null);
    const setRef = (el: HTMLButtonElement | null) => {
      localRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = el;
    };

    useEffect(() => {
      if (!localRef.current) return;
      return magneticHover(localRef.current, magnetStrength);
    }, [magnetStrength]);

    const toneClass =
      tone === "danger"
        ? "bg-gradient-to-r from-tertiary to-error-container text-[#1a0a00] shadow-[0_0_24px_-4px_rgba(255,183,127,0.55)] hover:brightness-110"
        : tone === "ghost"
        ? "border border-cyan-400/40 text-cyan-300 bg-surface-container/50 hover:bg-cyan-400/10"
        : "bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#00363a] shadow-[0_0_24px_-4px_rgba(0,219,231,0.55)] hover:brightness-110";

    const defaultRipple =
      tone === "danger" ? "rgba(255,183,127,0.5)" : "rgba(0,219,231,0.55)";

    return (
      <button
        ref={setRef}
        {...rest}
        onPointerDown={(e) => {
          if (localRef.current) ripple(localRef.current, e.clientX, e.clientY, rippleColor ?? defaultRipple);
          audioBus.sfx("press");
          onPointerDown?.(e);
        }}
        onClick={onClick}
        className={`relative inline-flex items-center justify-center font-label tracking-[0.3em] text-sm font-bold transition-[filter,transform] duration-200 ${toneClass} ${className}`}
      >
        {children}
      </button>
    );
  }
);

export default MagneticButton;
