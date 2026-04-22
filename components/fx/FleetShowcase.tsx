"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import JetModel3D from "./JetModel3D";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant: Variant;
  className?: string;
}

// Per-variant 3D fallback transform
const VARIANT_TRANSFORM: Record<
  Variant,
  { scale: [number, number, number]; rotation: [number, number, number]; camY: number }
> = {
  fighter: { scale: [1, 1, 1], rotation: [0, 0, 0], camY: 2.2 },
  bomber: { scale: [1.35, 0.55, 0.9], rotation: [-0.05, 0, 0], camY: 1.6 },
  interceptor: { scale: [0.75, 0.85, 1.45], rotation: [-0.05, 0, 0], camY: 2.0 },
  multirole: { scale: [1.0, 1.0, 1.0], rotation: [0, 0, 0], camY: 2.2 },
  support: { scale: [1.2, 1.05, 0.9], rotation: [0, 0, 0], camY: 2.1 },
};

function RotatingJet({ variant }: { variant: Variant }) {
  const ref = useRef<THREE.Group>(null!);
  const cfg = VARIANT_TRANSFORM[variant];

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.28;
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    }
  });

  return (
    <group ref={ref} rotation={cfg.rotation} scale={cfg.scale}>
      <JetModel3D throttle={0.55} bank={0} contrails={false} variant={variant} />
    </group>
  );
}

function Fallback3D({ variant }: { variant: Variant }) {
  const cfg = VARIANT_TRANSFORM[variant];
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, cfg.camY, 11], fov: 32, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#080d22"]} />
      <fog attach="fog" args={["#080d22", 14, 30]} />
      <ambientLight intensity={0.35} color="#c6dcff" />
      <directionalLight position={[6, 9, 4]} intensity={1.4} color="#f0f7ff" castShadow />
      <directionalLight position={[-6, 3, -4]} intensity={0.45} color="#8ec1ff" />
      <pointLight position={[0, 2.5, 6]} intensity={1.0} color="#00dbe7" distance={14} />
      <Environment preset="night" />
      <RotatingJet variant={variant} />
      <ContactShadows position={[0, -1.6, 0]} opacity={0.55} scale={14} blur={2.4} far={5} />
      <mesh position={[0, -1.59, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.5, 64]} />
        <meshBasicMaterial color="#00dbe7" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
    </Canvas>
  );
}

function PhotoHero({ variant, src }: { variant: Variant; src: string }) {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Ken-Burns zoom-in */}
      <img
        src={src}
        alt={variant}
        className="absolute inset-0 w-full h-full object-cover will-change-transform"
        style={{ animation: "heroZoom 14s ease-in-out infinite alternate" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {/* Holographic cyan tint overlay (mixes with photo) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1430]/80 via-transparent to-[#0a1430]/40 pointer-events-none" />
      <div className="absolute inset-0 bg-cyan-500/5 mix-blend-overlay pointer-events-none" />
      {/* Scanline */}
      <div className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-cyan-400/8 to-transparent animate-scanline pointer-events-none" />

      {/* keyframes inlined */}
      <style jsx>{`
        @keyframes heroZoom {
          0% {
            transform: scale(1) translate(0, 0);
          }
          100% {
            transform: scale(1.09) translate(-1%, -1%);
          }
        }
      `}</style>
    </div>
  );
}

export default function FleetShowcase({ variant, className = "" }: Props) {
  const [hasImage, setHasImage] = useState<boolean | null>(null);
  const imgSrc = `/images/fleet/${variant}.jpg`;

  // Probe for photorealistic image; fallback to 3D if absent
  useEffect(() => {
    let cancelled = false;
    setHasImage(null);
    fetch(imgSrc, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setHasImage(r.ok);
      })
      .catch(() => {
        if (!cancelled) setHasImage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [imgSrc]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {hasImage === true && <PhotoHero variant={variant} src={imgSrc} />}
      {hasImage === false && <Fallback3D variant={variant} />}
      {hasImage === null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="font-label text-[10px] tracking-[0.3em] text-cyan-400 animate-pulse">
            LOADING…
          </p>
        </div>
      )}

      {/* HUD corner brackets */}
      {[
        "top-2 left-2 border-t border-l",
        "top-2 right-2 border-t border-r",
        "bottom-2 left-2 border-b border-l",
        "bottom-2 right-2 border-b border-r",
      ].map((c) => (
        <div key={c} className={`pointer-events-none absolute w-6 h-6 border-cyan-400/70 ${c}`} />
      ))}

      {/* Altitude tick overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-6 opacity-30">
        {["60K", "45K", "30K", "15K", "0M"].map((tick) => (
          <div
            key={tick}
            className="flex items-center gap-2 px-4 font-label text-[9px] tracking-[0.3em] text-cyan-400"
          >
            <span className="w-6 h-px bg-cyan-400/50" />
            <span>{tick}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
