"use client";

import type { ReactElement } from "react";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant?: Variant;
  className?: string;
  /** 0-1, intensity of the glow filter */
  glow?: number;
}

const FIGHTER = (
  <g>
    {/* Diamond wing (6th-gen NGAD/tailless delta) */}
    <path
      d="M 0 -130  L 92 34  L 28 42  L 8 116  L -8 116  L -28 42  L -92 34 Z"
      fill="url(#bodyGrad)"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Fuselage spine */}
    <path d="M 0 -130 L 0 110" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.55" />
    {/* Canopy */}
    <ellipse cx="0" cy="-55" rx="9" ry="28" fill="rgba(125,231,240,0.35)" stroke="currentColor" strokeWidth="0.8" />
    {/* Inlets (sides) */}
    <path d="M -18 -35 L -32 -5 L -26 8 L -12 -10 Z" fill="#050814" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 18 -35 L 32 -5 L 26 8 L 12 -10 Z" fill="#050814" stroke="currentColor" strokeWidth="0.8" />
    {/* Twin nozzles */}
    <rect x="-22" y="86" width="14" height="24" rx="2" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <rect x="8" y="86" width="14" height="24" rx="2" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <circle cx="-15" cy="104" r="3" fill="#ffb77f" opacity="0.9" />
    <circle cx="15" cy="104" r="3" fill="#ffb77f" opacity="0.9" />
    {/* V-tail stubs */}
    <path d="M -24 56 L -40 86 L -20 74 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 24 56 L 40 86 L 20 74 Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="0.8" />
    {/* Panel lines */}
    <path
      d="M -8 -110 L -20 -20 L -60 20 M 8 -110 L 20 -20 L 60 20 M -40 45 L 40 45"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeOpacity="0.45"
      fill="none"
    />
    {/* Weapon pylons */}
    <circle cx="-45" cy="55" r="2" fill="currentColor" opacity="0.7" />
    <circle cx="45" cy="55" r="2" fill="currentColor" opacity="0.7" />
  </g>
);

const BOMBER = (
  <g>
    {/* Flying wing (B-21 style) */}
    <path
      d="M 0 -60  L 140 50  L 120 70  L 60 68  L 14 100  L -14 100  L -60 68  L -120 70  L -140 50 Z"
      fill="url(#bodyGrad)"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Center hump / cockpit bubble */}
    <path d="M -20 -30 L -14 20 L 14 20 L 20 -30 Q 0 -60 -20 -30 Z" fill="rgba(125,231,240,0.18)" stroke="currentColor" strokeWidth="1" />
    {/* Intakes on top */}
    <rect x="-12" y="-10" width="8" height="26" rx="2" fill="#050814" stroke="currentColor" strokeWidth="0.7" />
    <rect x="4" y="-10" width="8" height="26" rx="2" fill="#050814" stroke="currentColor" strokeWidth="0.7" />
    {/* Exhaust slots */}
    <rect x="-24" y="60" width="18" height="8" rx="1" fill="#050814" stroke="currentColor" strokeWidth="0.8" />
    <rect x="6" y="60" width="18" height="8" rx="1" fill="#050814" stroke="currentColor" strokeWidth="0.8" />
    {/* Panel lines */}
    <path
      d="M -120 55 L -30 50 L 30 50 L 120 55 M 0 -55 L 0 95"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeOpacity="0.4"
      fill="none"
      strokeDasharray="2 3"
    />
  </g>
);

const INTERCEPTOR = (
  <g>
    {/* Long thin interceptor (SR-72 / Dark Eagle style) */}
    <path
      d="M 0 -145  L 20 -90  L 16 60  L 60 85  L 58 92  L 14 80  L 12 115  L -12 115  L -14 80  L -58 92  L -60 85  L -16 60  L -20 -90 Z"
      fill="url(#bodyGrad)"
      fillOpacity="0.2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    {/* Canopy narrow */}
    <ellipse cx="0" cy="-60" rx="6" ry="24" fill="rgba(125,231,240,0.35)" stroke="currentColor" strokeWidth="0.8" />
    {/* Tail nozzle single large */}
    <rect x="-10" y="98" width="20" height="18" rx="2" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <circle cx="0" cy="112" r="5" fill="#ffb77f" opacity="0.95" />
    {/* Panel lines */}
    <path d="M 0 -140 L 0 100 M -18 -20 L 18 -20 M -16 30 L 16 30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" fill="none" />
    {/* Speed streaks */}
    <path d="M -14 -120 L -10 -70 M 14 -120 L 10 -70" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
  </g>
);

const MULTIROLE = (
  <g>
    {/* F-35-ish delta */}
    <path
      d="M 0 -120  L 22 -30  L 78 50  L 22 54  L 10 105  L -10 105  L -22 54  L -78 50  L -22 -30 Z"
      fill="url(#bodyGrad)"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path d="M 0 -120 L 0 100" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.5" />
    <ellipse cx="0" cy="-58" rx="9" ry="26" fill="rgba(125,231,240,0.32)" stroke="currentColor" strokeWidth="0.8" />
    {/* Single large central nozzle */}
    <rect x="-12" y="86" width="24" height="22" rx="3" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <circle cx="0" cy="102" r="6" fill="#ffb77f" opacity="0.9" />
    {/* Horizontal stabilizers */}
    <path d="M -22 56 L -52 82 L -20 70 Z" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 22 56 L 52 82 L 20 70 Z" fill="currentColor" fillOpacity="0.28" stroke="currentColor" strokeWidth="0.8" />
    {/* Vertical tails */}
    <path d="M -14 60 L -22 92 L -10 76 Z" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 14 60 L 22 92 L 10 76 Z" fill="currentColor" fillOpacity="0.45" stroke="currentColor" strokeWidth="0.8" />
    {/* Pylons */}
    <circle cx="-38" cy="52" r="2" fill="currentColor" opacity="0.7" />
    <circle cx="38" cy="52" r="2" fill="currentColor" opacity="0.7" />
    <circle cx="-58" cy="52" r="2" fill="currentColor" opacity="0.6" />
    <circle cx="58" cy="52" r="2" fill="currentColor" opacity="0.6" />
  </g>
);

const SUPPORT = (
  <g>
    {/* Boxy close-support (A-10 spiritual successor) */}
    <path
      d="M 0 -110  L 18 -70  L 24 -20  L 96 20  L 96 34  L 24 40  L 14 95  L -14 95  L -24 40  L -96 34  L -96 20  L -24 -20  L -18 -70 Z"
      fill="url(#bodyGrad)"
      fillOpacity="0.18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    {/* Cockpit */}
    <rect x="-10" y="-90" width="20" height="30" rx="4" fill="rgba(125,231,240,0.3)" stroke="currentColor" strokeWidth="0.8" />
    {/* Twin external pod engines */}
    <ellipse cx="-38" cy="55" rx="10" ry="16" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <ellipse cx="38" cy="55" rx="10" ry="16" fill="#050814" stroke="currentColor" strokeWidth="1" />
    <circle cx="-38" cy="67" r="4" fill="#ffb77f" opacity="0.9" />
    <circle cx="38" cy="67" r="4" fill="#ffb77f" opacity="0.9" />
    {/* Gatling nose */}
    <rect x="-4" y="-120" width="8" height="14" fill="#050814" stroke="currentColor" strokeWidth="0.8" />
    {/* Tail twin vertical */}
    <path d="M -18 75 L -30 100 L -10 92 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    <path d="M 18 75 L 30 100 L 10 92 Z" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="0.8" />
    {/* Hardpoints (6 pylons under wing) */}
    {[-75, -55, -35, 35, 55, 75].map((x) => (
      <rect key={x} x={x - 1.5} y={22} width={3} height={10} fill="currentColor" opacity="0.65" />
    ))}
  </g>
);

const VARIANT_MAP: Record<Variant, ReactElement> = {
  fighter: FIGHTER,
  bomber: BOMBER,
  interceptor: INTERCEPTOR,
  multirole: MULTIROLE,
  support: SUPPORT,
};

export default function JetSilhouette({
  variant = "fighter",
  className = "",
  glow = 1,
}: Props) {
  return (
    <svg
      viewBox="-150 -150 300 300"
      preserveAspectRatio="xMidYMid meet"
      className={`text-cyan-300 ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0%" stopColor="#bdf2f7" />
          <stop offset="55%" stopColor="#00dbe7" />
          <stop offset="100%" stopColor="#00646a" />
        </linearGradient>
        <filter id="jetGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={3 * glow} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#jetGlow)" style={{ filter: `drop-shadow(0 0 ${8 * glow}px rgba(0,219,231,${0.55 * glow}))` }}>
        {VARIANT_MAP[variant]}
      </g>
    </svg>
  );
}
