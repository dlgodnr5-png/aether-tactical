"use client";

/**
 * Touch virtual joystick for mobile cockpit control.
 *
 * Emits normalized (x, y) in [-1, 1] while held; zero on release.
 * Parent wires:
 *   - x → roll (steering.roll)
 *   - y → pitch (steering.pitch)
 *
 * Placed as an absolute element — parent controls position. The base is
 * fixed; a nub follows touch within the radius. Uses Pointer Events so
 * works with mouse too (for desktop testing).
 *
 * Usage:
 *   <VirtualJoystick onChange={(x, y) => setSteering({roll: x, pitch: y})} />
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface VirtualJoystickProps {
  onChange: (x: number, y: number) => void;
  /** Radius of the joystick base in pixels. Nub travels up to this distance. */
  radius?: number;
  /** Deadzone 0–1. Input below this returns 0. */
  deadzone?: number;
  className?: string;
}

export default function VirtualJoystick({
  onChange,
  radius = 56,
  deadzone = 0.08,
  className,
}: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [nub, setNub] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerRef = useRef<number | null>(null);

  const setFromEvent = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }
      setNub({ x: dx, y: dy });

      let nx = dx / radius;
      let ny = dy / radius;
      if (Math.abs(nx) < deadzone) nx = 0;
      if (Math.abs(ny) < deadzone) ny = 0;
      onChange(nx, ny);
    },
    [radius, deadzone, onChange],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      activePointerRef.current = e.pointerId;
      setActive(true);
      setFromEvent(e.clientX, e.clientY);
    },
    [setFromEvent],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      e.preventDefault();
      setFromEvent(e.clientX, e.clientY);
    },
    [setFromEvent],
  );

  const release = useCallback(() => {
    activePointerRef.current = null;
    setActive(false);
    setNub({ x: 0, y: 0 });
    onChange(0, 0);
  }, [onChange]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerRef.current !== e.pointerId) return;
      e.preventDefault();
      release();
    },
    [release],
  );

  // Safety: release on unmount / tab switch
  useEffect(() => {
    const onBlur = () => release();
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [release]);

  const size = radius * 2 + 32;

  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={`relative select-none ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        touchAction: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Base ring */}
      <div
        className="absolute inset-2 rounded-full border-2 border-cyan-400/60 bg-black/50 backdrop-blur-sm shadow-[0_0_20px_rgba(0,219,231,0.2)]"
        style={{
          boxShadow: active
            ? "0 0 24px rgba(0,219,231,0.55) inset"
            : "0 0 12px rgba(0,219,231,0.15) inset",
        }}
      />
      {/* Nub */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full bg-cyan-400/90 shadow-[0_0_16px_rgba(0,219,231,0.9)] transition-[transform] duration-75"
        style={{
          width: 38,
          height: 38,
          transform: `translate(calc(-50% + ${nub.x}px), calc(-50% + ${nub.y}px))`,
        }}
      />
    </div>
  );
}
