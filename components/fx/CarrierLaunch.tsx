"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createTimeline } from "animejs";
import JetSilhouette from "./JetSilhouette";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant?: Variant;
  onComplete?: () => void;
}

/**
 * Aircraft carrier CATOBAR launch cutscene.
 * Plays once per mount. Stylized SVG deck with perspective; jet accelerates
 * down the deck, catapult steam burst, afterburner trail, climb-out.
 */
export default function CarrierLaunch({ variant = "fighter", onComplete }: Props) {
  const [phase, setPhase] = useState<"active" | "done">("active");
  const deckRef = useRef<HTMLDivElement | null>(null);
  const jetRef = useRef<HTMLDivElement | null>(null);
  const steamRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setPhase("done");
      onComplete?.();
    };
    if (reduced) {
      window.setTimeout(finish, 500);
      return;
    }

    const tl = createTimeline({
      onComplete: finish,
    });

    // Status ticker pulse
    if (statusRef.current) {
      tl.add(statusRef.current, {
        opacity: [0, 1],
        duration: 300,
        ease: "outQuad",
      });
    }

    // Catapult steam burst
    if (steamRef.current) {
      tl.add(
        steamRef.current,
        {
          opacity: [0, 0.9, 0.5],
          scaleX: [0.3, 1.6],
          scaleY: [0.4, 1.2],
          duration: 500,
          ease: "outQuart",
        },
        400
      );
    }

    // Jet accelerates forward down deck
    if (jetRef.current) {
      tl.add(
        jetRef.current,
        {
          translateY: [0, -140],
          translateZ: [0, 260],
          scale: [1, 0.42],
          rotateX: [0, -14],
          duration: 1000,
          ease: "inQuart",
        },
        600
      );
    }

    // Afterburner trail ignite
    if (trailRef.current) {
      tl.add(
        trailRef.current,
        {
          opacity: [0, 1, 0.7],
          scaleY: [0.1, 1],
          duration: 800,
          ease: "outQuad",
        },
        800
      );
    }

    // Climb-out: jet rises off the deck
    if (jetRef.current) {
      tl.add(
        jetRef.current,
        {
          translateY: -260,
          rotateX: -28,
          scale: 0.34,
          duration: 600,
          ease: "outQuart",
        },
        1500
      );
    }

    // Screen white flash on afterburner peak
    if (overlayRef.current) {
      tl.add(
        overlayRef.current,
        {
          opacity: [0, 0.25, 0],
          duration: 400,
          ease: "outExpo",
        },
        900
      );
    }

    // Full scene fade out
    if (deckRef.current) {
      tl.add(
        deckRef.current,
        {
          opacity: [1, 0],
          duration: 450,
          ease: "inQuad",
        },
        2000
      );
    }

    return () => {
      tl.pause();
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      ref={deckRef}
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#233e6e] via-[#1a2d55] to-[#0a1428]" />

      {/* Horizon line + distant sea */}
      <div className="absolute left-0 right-0 top-[40%] h-px bg-cyan-400/40" />
      <div className="absolute left-0 right-0 top-[40%] bottom-0 bg-gradient-to-b from-[#0c1a2e] to-[#04080f]" />

      {/* Distant horizon haze */}
      <div className="absolute left-0 right-0 top-[38%] h-8 bg-gradient-to-b from-cyan-300/15 to-transparent" />

      {/* CARRIER DECK — perspective trapezoid with angled flight deck */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{
          width: "180%",
          height: "68%",
          transform: "translateX(-50%) perspective(900px) rotateX(58deg)",
          transformOrigin: "50% 100%",
        }}
      >
        {/* Main deck plate */}
        <div
          className="absolute inset-x-[10%] bottom-0 top-0 rounded-t-[6%]"
          style={{
            background:
              "linear-gradient(180deg, #1a2436 0%, #222d42 40%, #2c3851 100%)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.06)",
          }}
        />
        {/* Centerline */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[6%] bottom-[4%] w-[3px] bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.9)_0_16px,transparent_16px_28px)]" />
        {/* Catapult track (yellow) */}
        <div className="absolute left-[44%] top-[8%] bottom-[20%] w-[3px] bg-gradient-to-b from-transparent via-[#ffb77f] to-[#ffb77f]/70" />
        {/* Landing zone angle markings */}
        <div className="absolute left-[16%] top-[30%] right-[60%] h-[3px] bg-[repeating-linear-gradient(90deg,#ffb77f_0_12px,transparent_12px_22px)] opacity-70 rotate-[-6deg]" />
        <div className="absolute left-[18%] top-[45%] right-[62%] h-[3px] bg-[repeating-linear-gradient(90deg,#ffb77f_0_12px,transparent_12px_22px)] opacity-60 rotate-[-6deg]" />

        {/* Island superstructure (right side) */}
        <div
          className="absolute right-[12%] top-[18%] w-[9%] h-[38%] rounded-sm bg-gradient-to-b from-[#3a475f] to-[#242b40] border-l border-cyan-400/15"
          style={{ boxShadow: "inset 2px 0 0 rgba(255,255,255,0.04)" }}
        >
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-500/70 animate-pulse" />
          <div className="absolute top-[25%] left-1/2 -translate-x-1/2 w-[60%] h-1 bg-cyan-400/25" />
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[50%] h-1 bg-cyan-400/20" />
        </div>

        {/* Deck edge lights */}
        <div className="absolute left-[10%] top-0 bottom-0 w-[2px] bg-[repeating-linear-gradient(180deg,#ffb77f_0_4px,transparent_4px_22px)] opacity-60" />
        <div className="absolute right-[10%] top-0 bottom-0 w-[2px] bg-[repeating-linear-gradient(180deg,#ffb77f_0_4px,transparent_4px_22px)] opacity-60" />
      </div>

      {/* Catapult steam burst (in front of deck, at launch point) */}
      <div
        ref={steamRef}
        className="absolute left-1/2 -translate-x-1/2 bottom-[32%] w-[45%] h-[18%] opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.9) 0%, rgba(220,230,240,0.5) 30%, transparent 65%)",
          filter: "blur(8px)",
        }}
      />

      {/* Afterburner trail (vertical cyan/orange cone below jet) */}
      <div
        ref={trailRef}
        className="absolute left-1/2 -translate-x-1/2 bottom-[30%] w-[9%] h-[22%] opacity-0 origin-bottom"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,219,231,0) 0%, rgba(255,183,127,0.85) 40%, rgba(255,120,40,0.95) 80%, rgba(255,255,255,0) 100%)",
          filter: "blur(4px)",
          clipPath: "polygon(45% 0%, 55% 0%, 80% 100%, 20% 100%)",
        }}
      />

      {/* JET — starts on deck near viewer, launches toward horizon */}
      <div
        ref={jetRef}
        className="absolute left-1/2 bottom-[22%] -translate-x-1/2 w-[26%] aspect-square will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        <JetSilhouette variant={variant} className="w-full h-full" glow={1.4} />
      </div>

      {/* White flash overlay on launch peak */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-white opacity-0"
      />

      {/* Launch status HUD */}
      <div
        ref={statusRef}
        className="absolute top-6 left-4 right-4 flex items-center justify-between font-label text-[11px] tracking-[0.3em] text-cyan-300 opacity-0"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          CATOBAR LAUNCH — CAT-1 READY
        </div>
        <div>AETHER CVN-Ω // DECK-07</div>
      </div>

      {/* Bottom status */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-label text-[10px] tracking-[0.3em] text-cyan-400/70">
        <span>DECK CLEAR</span>
        <span>WIND 045 @ 12 KTS</span>
        <span>LAUNCH AUTHORIZED</span>
      </div>

      {/* HUD corners */}
      {[
        "top-2 left-2 border-t border-l",
        "top-2 right-2 border-t border-r",
        "bottom-2 left-2 border-b border-l",
        "bottom-2 right-2 border-b border-r",
      ].map((c) => (
        <div key={c} className={`absolute w-8 h-8 border-2 border-cyan-400/80 ${c}`} />
      ))}
    </div>
  );
}
