"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import JetModel3D from "./JetModel3D";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  variant: Variant;
  className?: string;
}

// Per-variant group transform (scale + rotation + pose)
const VARIANT_TRANSFORM: Record<
  Variant,
  { scale: [number, number, number]; rotation: [number, number, number]; camY: number }
> = {
  fighter: { scale: [1, 1, 1], rotation: [0, 0, 0], camY: 2.2 },
  bomber: { scale: [1.35, 0.55, 0.9], rotation: [-0.05, 0, 0], camY: 1.6 }, // flatter, wider (flying wing)
  interceptor: { scale: [0.75, 0.85, 1.45], rotation: [-0.05, 0, 0], camY: 2.0 }, // longer, thinner
  multirole: { scale: [1.0, 1.0, 1.0], rotation: [0, 0, 0], camY: 2.2 },
  support: { scale: [1.2, 1.05, 0.9], rotation: [0, 0, 0], camY: 2.1 }, // stubbier, wider
};

function RotatingJet({ variant }: { variant: Variant }) {
  const ref = useRef<THREE.Group>(null!);
  const cfg = VARIANT_TRANSFORM[variant];

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.28;
      // Gentle vertical bob
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    }
  });

  return (
    <group ref={ref} rotation={cfg.rotation} scale={cfg.scale}>
      <JetModel3D throttle={0.55} bank={0} contrails={false} variant={variant} />
    </group>
  );
}

export default function FleetShowcase({ variant, className = "" }: Props) {
  const cfg = VARIANT_TRANSFORM[variant];

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, cfg.camY, 11], fov: 32, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#080d22"]} />
        <fog attach="fog" args={["#080d22", 14, 30]} />

        {/* Lighting — showroom style */}
        <ambientLight intensity={0.35} color="#c6dcff" />
        <directionalLight
          position={[6, 9, 4]}
          intensity={1.4}
          color="#f0f7ff"
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-6, 3, -4]} intensity={0.45} color="#8ec1ff" />
        <pointLight position={[0, 2.5, 6]} intensity={1.0} color="#00dbe7" distance={14} />
        <pointLight position={[0, -2, -4]} intensity={0.4} color="#00dbe7" distance={10} />

        {/* HDR environment for metallic reflections */}
        <Environment preset="night" />

        {/* Rotating jet */}
        <RotatingJet variant={variant} />

        {/* Ground contact shadow */}
        <ContactShadows position={[0, -1.6, 0]} opacity={0.55} scale={14} blur={2.4} far={5} />

        {/* Platform ring */}
        <mesh position={[0, -1.59, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.5, 64]} />
          <meshBasicMaterial color="#00dbe7" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.6, 4.2, 64]} />
          <meshBasicMaterial color="#00dbe7" transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>
      </Canvas>

      {/* HUD corner brackets overlay (on top of canvas) */}
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
