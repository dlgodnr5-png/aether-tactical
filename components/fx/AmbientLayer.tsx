"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  r: number;
  a: number;
}

export default function AmbientLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();

    const STAR_COUNT = 80;
    const stars: Star[] = Array.from({ length: STAR_COUNT }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random() * 0.6 + 0.2,
    }));

    let raf = 0;
    let t = 0;
    const draw = () => {
      t += 0.5;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.y += s.z * 0.25;
        if (s.y > canvas.height) {
          s.y = -2;
          s.x = Math.random() * canvas.width;
        }
        const twinkle = 0.6 + Math.sin(t * 0.04 * s.z + s.x * 0.01) * 0.4;
        ctx.globalAlpha = s.a * twinkle;
        ctx.fillStyle = s.z > 0.7 ? "#9ce8ff" : "#6fb7d1";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    if (!reduced) draw();

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Layer 1: deep gradient field */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,_#12204a_0%,_transparent_60%),radial-gradient(ellipse_at_80%_90%,_#1a0e3a_0%,_transparent_55%),linear-gradient(180deg,#050818_0%,#0a0f24_50%,#060819_100%)]" />

      {/* Layer 2: starfield canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Layer 3: rotating radar sweep (large, blurred) */}
      <div className="absolute -right-[30vmin] -top-[30vmin] w-[110vmin] h-[110vmin] opacity-[0.14] blur-2xl radar-sweep rounded-full" />

      {/* Layer 4: grid */}
      <div className="absolute inset-0 tactical-grid opacity-30" />

      {/* Layer 5: vignette */}
      <div className="absolute inset-0 radial-vignette" />

      {/* Layer 6: noise */}
      <div className="absolute inset-0 noise" />
    </div>
  );
}
