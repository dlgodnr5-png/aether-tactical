"use client";

import { useEffect, useRef, useState } from "react";
import { createTimeline } from "animejs";
import JetSilhouette from "./JetSilhouette";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant?: Variant;
  onComplete?: () => void;
}

/**
 * Aircraft carrier CATOBAR launch cutscene (stylized 2D SVG + CSS perspective).
 * Plays once. Deck, steam, afterburner, screen flash, status HUD.
 */
export default function CarrierLaunch({ variant = "fighter", onComplete }: Props) {
  const [phase, setPhase] = useState<"active" | "done">("active");
  const deckRef = useRef<HTMLDivElement | null>(null);
  const jetWrapRef = useRef<HTMLDivElement | null>(null);
  const jetRef = useRef<HTMLDivElement | null>(null);
  const steamRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const countdownRef = useRef<HTMLDivElement | null>(null);
  const [countLabel, setCountLabel] = useState<string>("");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setPhase("done");
      onComplete?.();
    };
    if (reduced) {
      window.setTimeout(finish, 300);
      return;
    }

    // Pre-launch countdown
    const countTicks = [
      { t: 0, label: "DECK CLEAR" },
      { t: 400, label: "CAT-1 TENSION" },
      { t: 800, label: "READY" },
      { t: 1200, label: "LAUNCH" },
    ];
    countTicks.forEach(({ t, label }) => {
      window.setTimeout(() => setCountLabel(label), t);
    });

    const tl = createTimeline({ onComplete: finish });

    if (statusRef.current) {
      tl.add(statusRef.current, { opacity: [0, 1], duration: 300, ease: "outQuad" });
    }

    // Sky sunrise glow
    if (skyRef.current) {
      tl.add(skyRef.current, { opacity: [0.7, 1], duration: 1200, ease: "inOutSine" }, 0);
    }

    // Catapult steam burst
    if (steamRef.current) {
      tl.add(
        steamRef.current,
        {
          opacity: [0, 1, 0.6],
          scaleX: [0.3, 2.0],
          scaleY: [0.4, 1.6],
          duration: 700,
          ease: "outQuart",
        },
        800
      );
    }

    // Jet idle shudder pre-launch
    if (jetWrapRef.current) {
      tl.add(
        jetWrapRef.current,
        {
          translateX: [
            { to: -2, duration: 80 },
            { to: 2, duration: 80 },
            { to: -1, duration: 80 },
            { to: 1, duration: 80 },
            { to: 0, duration: 80 },
          ],
          loop: 2,
          duration: 400,
        },
        400
      );
    }

    // Jet accelerates forward down deck (translateY upward = going away + up)
    if (jetWrapRef.current) {
      tl.add(
        jetWrapRef.current,
        {
          translateY: [0, -180],
          scale: [1, 0.35],
          rotate: [0, -2],
          duration: 1100,
          ease: "inQuart",
        },
        1200
      );
    }

    // Afterburner trail ignite
    if (trailRef.current) {
      tl.add(
        trailRef.current,
        {
          opacity: [0, 1, 0.8],
          scaleY: [0.1, 1.3],
          duration: 900,
          ease: "outQuad",
        },
        1350
      );
    }

    // Climb-out: jet rises further toward sky
    if (jetWrapRef.current) {
      tl.add(
        jetWrapRef.current,
        {
          translateY: -320,
          scale: 0.22,
          rotate: -8,
          duration: 700,
          ease: "outQuart",
        },
        2100
      );
    }

    // Screen white flash on afterburner peak
    if (overlayRef.current) {
      tl.add(
        overlayRef.current,
        {
          opacity: [0, 0.5, 0],
          duration: 500,
          ease: "outExpo",
        },
        1400
      );
    }

    // Full scene fade out
    if (deckRef.current) {
      tl.add(
        deckRef.current,
        {
          opacity: [1, 0],
          duration: 500,
          ease: "inQuad",
        },
        2700
      );
    }

    return () => {
      tl.pause();
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div ref={deckRef} className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {/* Sky gradient (dawn) */}
      <div
        ref={skyRef}
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ff8060 0%, #c4527f 12%, #3e5090 35%, #1a2a55 55%, #0a1428 100%)",
        }}
      />

      {/* Sun glow */}
      <div
        className="absolute"
        style={{
          left: "68%",
          top: "22%",
          width: "22%",
          aspectRatio: "1",
          background:
            "radial-gradient(circle, rgba(255,220,150,0.9) 0%, rgba(255,140,80,0.4) 35%, transparent 65%)",
          filter: "blur(14px)",
        }}
      />

      {/* Horizon band with atmospheric haze */}
      <div className="absolute left-0 right-0 top-[40%] h-16 bg-gradient-to-b from-[#ff9f70]/20 via-[#6280c0]/25 to-transparent" />
      <div className="absolute left-0 right-0 top-[42%] h-px bg-cyan-200/50" />

      {/* Ocean below horizon */}
      <div
        className="absolute left-0 right-0 bottom-0 top-[42%]"
        style={{
          background:
            "linear-gradient(180deg, #1a2e4a 0%, #0a1628 40%, #040810 100%)",
        }}
      >
        {/* Subtle water lines */}
        {[55, 65, 72, 80, 88, 94].map((t) => (
          <div
            key={t}
            className="absolute left-0 right-0 bg-cyan-300/10"
            style={{ top: `${t}%`, height: "1px" }}
          />
        ))}
      </div>

      {/* Distant carrier silhouette (parallax backdrop) */}
      <div
        className="absolute"
        style={{
          left: "68%",
          top: "41%",
          width: "8%",
          height: "2%",
          background: "#0a141f",
          clipPath: "polygon(0 60%, 10% 30%, 15% 25%, 20% 35%, 90% 40%, 100% 55%, 95% 100%, 5% 100%)",
          opacity: 0.7,
        }}
      />

      {/* CARRIER DECK — tilted trapezoid with angled flight deck */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{
          width: "200%",
          height: "70%",
          transform: "translateX(-50%) perspective(800px) rotateX(62deg)",
          transformOrigin: "50% 100%",
        }}
      >
        {/* Main deck plate (angled) */}
        <div
          className="absolute inset-x-[6%] bottom-0 top-0 rounded-t-[4%]"
          style={{
            background:
              "linear-gradient(180deg, #141c2a 0%, #1c2639 35%, #252f48 75%, #2e3b58 100%)",
            boxShadow: "inset 0 4px 0 rgba(255,255,255,0.04), inset 0 -4px 12px rgba(0,0,0,0.5)",
          }}
        />

        {/* Non-skid texture stripes */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-[6%] right-[6%] bg-black/15"
            style={{ top: `${(i / 30) * 100}%`, height: "1px" }}
          />
        ))}

        {/* Deck edge (outer yellow safety line) */}
        <div className="absolute left-[6%] top-0 bottom-0 w-[3px] bg-[#f5b15c]/65" />
        <div className="absolute right-[6%] top-0 bottom-0 w-[3px] bg-[#f5b15c]/65" />

        {/* Main centerline (dashed white) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-[6%] bottom-[4%] w-[3px] bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.95)_0_18px,transparent_18px_30px)]" />

        {/* Catapult track #1 (yellow) */}
        <div className="absolute left-[40%] top-[8%] bottom-[24%] w-[4px] bg-gradient-to-b from-transparent via-[#ffb77f] to-[#ffb77f]/80 shadow-[0_0_12px_rgba(255,183,127,0.6)]" />
        {/* Catapult track #2 */}
        <div className="absolute left-[58%] top-[12%] bottom-[30%] w-[3px] bg-gradient-to-b from-transparent via-[#ffb77f]/70 to-[#ffb77f]/50" />

        {/* Angled landing deck markings (yellow chevrons) */}
        <div className="absolute left-[10%] top-[30%] right-[58%] h-[3px] bg-[repeating-linear-gradient(90deg,#ffb77f_0_14px,transparent_14px_26px)] opacity-70 rotate-[-7deg]" />
        <div className="absolute left-[12%] top-[42%] right-[60%] h-[3px] bg-[repeating-linear-gradient(90deg,#ffb77f_0_14px,transparent_14px_26px)] opacity-60 rotate-[-7deg]" />
        <div className="absolute left-[14%] top-[54%] right-[62%] h-[3px] bg-[repeating-linear-gradient(90deg,#ffb77f_0_14px,transparent_14px_26px)] opacity-55 rotate-[-7deg]" />

        {/* Arresting cables (3 white wires across deck) */}
        {[35, 42, 49, 56].map((top) => (
          <div
            key={top}
            className="absolute left-[8%] right-[8%] h-[2px] bg-white/55"
            style={{ top: `${top}%` }}
          />
        ))}

        {/* Deck numbers (fictional) */}
        <div className="absolute left-[44%] top-[12%] font-headline font-bold text-white/50 text-3xl select-none">
          07
        </div>

        {/* Island superstructure (right side — more detailed) */}
        <div
          className="absolute right-[8%] top-[16%] w-[12%] h-[46%] rounded-sm"
          style={{
            background: "linear-gradient(180deg, #2c3850 0%, #1c2438 100%)",
            boxShadow: "inset 2px 0 0 rgba(255,255,255,0.06), 2px 0 8px rgba(0,0,0,0.4)",
          }}
        >
          {/* Mast */}
          <div className="absolute top-[-18%] left-[45%] w-[2px] h-[20%] bg-[#3a4660]" />
          {/* Radar (rotating disk) */}
          <div
            className="absolute top-[-12%] left-[28%] w-[40%] aspect-square rounded-full bg-[#4a5670]/80 border border-white/20"
            style={{ animation: "spin 6s linear infinite" }}
          />
          {/* Bridge windows */}
          <div className="absolute top-[14%] left-[10%] right-[10%] h-[4%] bg-cyan-300/50" />
          <div className="absolute top-[22%] left-[10%] right-[10%] h-[3%] bg-cyan-300/35" />
          {/* Navigation lights */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse" />
          <div className="absolute top-[35%] left-[85%] w-[4px] h-[4px] rounded-full bg-[#33ff88]" />
          <div className="absolute top-[35%] left-[5%] w-[4px] h-[4px] rounded-full bg-red-500" />
        </div>

        {/* Deck edge LED strip */}
        <div className="absolute left-[6%] top-0 bottom-0 w-[2px] bg-[repeating-linear-gradient(180deg,#ffb77f_0_4px,transparent_4px_22px)] opacity-70" />
        <div className="absolute right-[6%] top-0 bottom-0 w-[2px] bg-[repeating-linear-gradient(180deg,#ffb77f_0_4px,transparent_4px_22px)] opacity-70" />

        {/* Ski-jump bow (subtle upward curve at top/far end) */}
        <div
          className="absolute left-[6%] right-[6%] top-0 h-[10%]"
          style={{
            background: "linear-gradient(180deg, #1a2438 0%, transparent 100%)",
            borderTopLeftRadius: "30% 100%",
            borderTopRightRadius: "30% 100%",
          }}
        />
      </div>

      {/* Catapult steam burst */}
      <div
        ref={steamRef}
        className="absolute left-1/2 -translate-x-1/2 bottom-[30%] w-[55%] h-[22%] opacity-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 80%, rgba(255,255,255,0.95) 0%, rgba(220,230,240,0.55) 35%, transparent 65%)",
          filter: "blur(10px)",
        }}
      />

      {/* Afterburner trail cone */}
      <div
        ref={trailRef}
        className="absolute left-1/2 -translate-x-1/2 bottom-[28%] w-[11%] h-[30%] opacity-0 origin-bottom"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,219,231,0) 0%, rgba(255,220,100,0.85) 30%, rgba(255,120,40,0.98) 70%, rgba(255,60,20,0) 100%)",
          filter: "blur(5px)",
          clipPath: "polygon(45% 0%, 55% 0%, 85% 100%, 15% 100%)",
        }}
      />

      {/* JET — stylized silhouette, animated forward and up */}
      <div
        ref={jetWrapRef}
        className="absolute left-1/2 bottom-[22%] -translate-x-1/2 w-[30%] aspect-square will-change-transform"
      >
        <div ref={jetRef} className="w-full h-full">
          <JetSilhouette variant={variant} glow={1.5} />
        </div>
        {/* Wingtip vortex puffs */}
        <div
          className="absolute left-[10%] bottom-[42%] w-[10%] aspect-square rounded-full bg-white/25 blur-md"
          style={{ animation: "pulse 800ms ease-out infinite" }}
        />
        <div
          className="absolute right-[10%] bottom-[42%] w-[10%] aspect-square rounded-full bg-white/25 blur-md"
          style={{ animation: "pulse 800ms ease-out infinite" }}
        />
      </div>

      {/* White flash overlay */}
      <div ref={overlayRef} className="absolute inset-0 bg-white opacity-0" />

      {/* Top status HUD */}
      <div
        ref={statusRef}
        className="absolute top-6 left-4 right-4 flex items-center justify-between font-label text-[11px] tracking-[0.3em] text-cyan-300 opacity-0"
      >
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          CATOBAR LAUNCH — CAT-1
        </div>
        <div>AETHER CVN-Ω // DECK-07</div>
      </div>

      {/* Countdown label (center-top) */}
      <div
        ref={countdownRef}
        className="absolute top-[28%] left-1/2 -translate-x-1/2 font-headline text-2xl sm:text-3xl font-bold text-white tracking-[0.3em]"
        style={{ textShadow: "0 0 24px rgba(0,219,231,0.7), 0 2px 0 rgba(0,0,0,0.5)" }}
      >
        {countLabel}
      </div>

      {/* Bottom ticker */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-label text-[10px] tracking-[0.3em] text-cyan-400/70">
        <span>WIND 045 @ 12 KTS</span>
        <span>DECK CLEAR</span>
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
