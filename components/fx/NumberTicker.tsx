"use client";

import { useEffect, useRef } from "react";
import { numberTick } from "@/lib/anime-presets";

interface Props {
  value: number;
  decimals?: number;
  suffix?: string;
  duration?: number;
  className?: string;
}

export default function NumberTicker({
  value,
  decimals = 0,
  suffix = "",
  duration = 700,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const prev = useRef<number>(value);

  useEffect(() => {
    if (!ref.current) return;
    if (prev.current === value) {
      ref.current.textContent =
        value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix;
      return;
    }
    numberTick(ref.current, prev.current, value, { duration, decimals, suffix });
    prev.current = value;
  }, [value, decimals, suffix, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
