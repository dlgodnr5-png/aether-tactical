"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";

type Variant = "fighter" | "bomber" | "interceptor" | "multirole" | "support";

interface Props {
  throttle?: number;
  bank?: number;
  /** Show contrails from wingtips */
  contrails?: boolean;
  /** Gear deployed (on takeoff/landing). Default false = retracted */
  gearDown?: boolean;
  /** Visual variant — controls part visibility / tint (not geometry) */
  variant?: Variant;
}

/**
 * Detailed low-poly stealth fighter. All geometry authored via three.js
 * primitives (no external model). Oriented forward along -Z after the
 * parent group rotateY(π), matching drei chase-cam conventions.
 */
export default function JetModel3D({
  throttle = 0.6,
  bank = 0,
  contrails = true,
  gearDown = false,
  variant = "fighter",
}: Props) {
  const hideTails = variant === "bomber"; // flying wing
  const hideCanopyBubble = false; // keep canopy for all for now
  const bodyTint =
    variant === "bomber" ? "#1a2040" :
    variant === "interceptor" ? "#2a1040" :
    variant === "support" ? "#2a2a18" :
    "#2a3654";
  const bodyEmissive =
    variant === "bomber" ? "#0a0f2a" :
    variant === "interceptor" ? "#1a0828" :
    "#0a1f3a";
  const rootRef = useRef<THREE.Group>(null!);
  const leftWingTipRef = useRef<THREE.Mesh>(null!);
  const rightWingTipRef = useRef<THREE.Mesh>(null!);
  const ab1Ref = useRef<THREE.Mesh>(null!);
  const ab2Ref = useRef<THREE.Mesh>(null!);
  const ab1CoreRef = useRef<THREE.Mesh>(null!);
  const ab2CoreRef = useRef<THREE.Mesh>(null!);
  const flapLeftRef = useRef<THREE.Mesh>(null!);
  const flapRightRef = useRef<THREE.Mesh>(null!);

  // === Fuselage profile via LatheGeometry ===
  // A smooth rounded "cigar" shape
  const fuselagePoints = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    // (radius, z)  — builds from nose (z=+3.8) to tail (z=-3.2)
    pts.push(new THREE.Vector2(0.0, 3.8));
    pts.push(new THREE.Vector2(0.08, 3.6));
    pts.push(new THREE.Vector2(0.22, 3.3));
    pts.push(new THREE.Vector2(0.36, 2.8));
    pts.push(new THREE.Vector2(0.48, 2.1));
    pts.push(new THREE.Vector2(0.55, 1.2));
    pts.push(new THREE.Vector2(0.6, 0.3));
    pts.push(new THREE.Vector2(0.62, -0.5));
    pts.push(new THREE.Vector2(0.58, -1.4));
    pts.push(new THREE.Vector2(0.5, -2.2));
    pts.push(new THREE.Vector2(0.42, -2.8));
    pts.push(new THREE.Vector2(0.38, -3.2));
    return pts;
  }, []);

  // Wing shape (left side; mirrored for right)
  const wingShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 1.6);
    s.quadraticCurveTo(-2.2, 1.0, -3.8, 0.0);
    s.quadraticCurveTo(-4.1, -0.3, -3.9, -0.6);
    s.lineTo(-1.2, -1.3);
    s.lineTo(-0.3, -1.6);
    s.quadraticCurveTo(0, -1.3, 0, -0.4);
    s.closePath();
    return s;
  }, []);

  const wingSettings = useMemo(
    () => ({
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.035,
      bevelThickness: 0.04,
      curveSegments: 8,
    }),
    []
  );

  useFrame((state, delta) => {
    if (rootRef.current) {
      const t = state.clock.elapsedTime;
      // Only apply bob if parent hasn't set position itself — keep subtle
      rootRef.current.rotation.z = bank + Math.sin(t * 0.6) * 0.03;
    }
    const flicker = 0.7 + Math.sin(state.clock.elapsedTime * 55) * 0.3;
    const intensity = throttle * flicker;
    const scale = 0.7 + intensity * 1.8;
    [ab1Ref, ab2Ref].forEach((r) => {
      if (r.current) {
        r.current.scale.set(1, 1, scale);
        (r.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.6 * intensity;
      }
    });
    [ab1CoreRef, ab2CoreRef].forEach((r) => {
      if (r.current) {
        r.current.scale.set(1, 1, scale * 0.85);
        (r.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 3.5 * intensity;
      }
    });
    // Flap deflection based on bank input (simulated aileron)
    if (flapLeftRef.current) flapLeftRef.current.rotation.x = -bank * 0.3;
    if (flapRightRef.current) flapRightRef.current.rotation.x = bank * 0.3;
  });

  return (
    <group ref={rootRef} rotation={[0, Math.PI, 0]}>
      {/* ============ FUSELAGE (smooth lathe) ============ */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[fuselagePoints, 20]} />
        <meshStandardMaterial
          color={bodyTint}
          metalness={0.82}
          roughness={0.28}
          emissive={bodyEmissive}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Panel line strips (dark emissive rings) */}
      {[1.6, 0.6, -0.4, -1.5].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[z > 1 ? 0.5 : z > 0 ? 0.58 : z > -1 ? 0.6 : 0.55, 0.01, 4, 32]} />
          <meshStandardMaterial color="#070e1e" metalness={0.4} roughness={0.9} />
        </mesh>
      ))}

      {/* Spine dorsal fin */}
      <mesh position={[0, 0.45, -0.5]}>
        <boxGeometry args={[0.06, 0.14, 3.2]} />
        <meshStandardMaterial color="#1a2540" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* ============ NOSE DETAILS ============ */}
      {/* Radar-absorbent nose cone (already part of lathe). Add pitot tube */}
      <mesh position={[0, 0, 3.95]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.28, 6]} />
        <meshStandardMaterial color="#0a0a14" metalness={1} roughness={0.3} />
      </mesh>

      {/* Chin IR sensor */}
      <mesh position={[0, -0.25, 2.9]}>
        <sphereGeometry args={[0.12, 14, 10, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.6]} />
        <meshStandardMaterial color="#050510" metalness={0.9} roughness={0.18} emissive="#ffb77f" emissiveIntensity={0.4} />
      </mesh>

      {/* ============ CANOPY ============ */}
      {/* Frame */}
      <mesh position={[0, 0.42, 1.05]}>
        <boxGeometry args={[0.88, 0.08, 2.4]} />
        <meshStandardMaterial color="#1a2540" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Glass — elongated half-dome */}
      <mesh position={[0, 0.45, 1.05]} scale={[0.42, 0.45, 1.25]}>
        <sphereGeometry args={[1, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#a0e8f0"
          metalness={0.4}
          roughness={0.05}
          transmission={0.7}
          transparent
          opacity={0.65}
          thickness={0.1}
          ior={1.4}
          clearcoat={1}
          clearcoatRoughness={0.08}
          emissive="#00dbe7"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* Pilot helmet (visible through canopy) */}
      <group position={[0, 0.35, 1.3]}>
        {/* Helmet */}
        <mesh>
          <sphereGeometry args={[0.17, 14, 10]} />
          <meshStandardMaterial color="#14202b" metalness={0.4} roughness={0.6} />
        </mesh>
        {/* Visor */}
        <mesh position={[0, 0.02, 0.1]} rotation={[0.1, 0, 0]}>
          <sphereGeometry args={[0.14, 14, 10, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.45]} />
          <meshStandardMaterial color="#0a0a14" metalness={0.95} roughness={0.1} emissive="#ffb77f" emissiveIntensity={0.6} />
        </mesh>
      </group>
      {/* Seat (barely visible) */}
      <mesh position={[0, 0.22, 1.2]}>
        <boxGeometry args={[0.28, 0.4, 0.3]} />
        <meshStandardMaterial color="#0a0e1a" roughness={0.85} />
      </mesh>
      {/* HUD glow inside cockpit */}
      <mesh position={[0, 0.38, 0.75]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.3, 0.12]} />
        <meshBasicMaterial color="#00dbe7" transparent opacity={0.5} />
      </mesh>

      {/* ============ INTAKES (DSI-style under fuselage, sides) ============ */}
      <mesh position={[-0.42, -0.05, 0.5]} rotation={[0, 0.05, 0]}>
        <boxGeometry args={[0.32, 0.4, 1.3]} />
        <meshStandardMaterial color="#1a2540" metalness={0.75} roughness={0.4} />
      </mesh>
      <mesh position={[0.42, -0.05, 0.5]} rotation={[0, -0.05, 0]}>
        <boxGeometry args={[0.32, 0.4, 1.3]} />
        <meshStandardMaterial color="#1a2540" metalness={0.75} roughness={0.4} />
      </mesh>
      {/* Intake holes (dark) */}
      <mesh position={[-0.42, -0.05, 1.15]}>
        <boxGeometry args={[0.25, 0.32, 0.02]} />
        <meshStandardMaterial color="#030308" metalness={0.9} roughness={0.9} />
      </mesh>
      <mesh position={[0.42, -0.05, 1.15]}>
        <boxGeometry args={[0.25, 0.32, 0.02]} />
        <meshStandardMaterial color="#030308" metalness={0.9} roughness={0.9} />
      </mesh>

      {/* ============ WINGS ============ */}
      {/* Left wing */}
      <mesh position={[0, -0.08, -0.1]} castShadow receiveShadow>
        <extrudeGeometry args={[wingShape, wingSettings]} />
        <meshStandardMaterial color={bodyTint} metalness={0.78} roughness={0.32} />
      </mesh>
      {/* Right wing (mirrored via negative scale) */}
      <mesh position={[0, -0.08, -0.1]} scale={[-1, 1, 1]} castShadow receiveShadow>
        <extrudeGeometry args={[wingShape, wingSettings]} />
        <meshStandardMaterial color={bodyTint} metalness={0.78} roughness={0.32} />
      </mesh>

      {/* Wing leading-edge cyan glow (HUD aesthetic) */}
      <mesh position={[-2.2, 0.05, 0.55]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[2.2, 0.04, 0.08]} />
        <meshStandardMaterial color="#00dbe7" emissive="#00dbe7" emissiveIntensity={1.5} roughness={0.5} />
      </mesh>
      <mesh position={[2.2, 0.05, 0.55]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[2.2, 0.04, 0.08]} />
        <meshStandardMaterial color="#00dbe7" emissive="#00dbe7" emissiveIntensity={1.5} roughness={0.5} />
      </mesh>

      {/* Control surfaces (flaps) — animate with bank */}
      <mesh ref={flapLeftRef} position={[-2.4, -0.06, -0.7]}>
        <boxGeometry args={[1.8, 0.06, 0.4]} />
        <meshStandardMaterial color="#1a2540" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh ref={flapRightRef} position={[2.4, -0.06, -0.7]}>
        <boxGeometry args={[1.8, 0.06, 0.4]} />
        <meshStandardMaterial color="#1a2540" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Wingtip nav lights: red (port/left), green (starboard/right) */}
      <mesh ref={leftWingTipRef} position={[-3.85, 0.0, -0.2]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#ff3355" emissive="#ff1133" emissiveIntensity={2} />
      </mesh>
      <mesh ref={rightWingTipRef} position={[3.85, 0.0, -0.2]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#33ff88" emissive="#22ff55" emissiveIntensity={2} />
      </mesh>

      {/* Contrails from wingtips */}
      {contrails && (
        <>
          <Trail
            width={0.35}
            length={18}
            color="#d0e8f5"
            attenuation={(t) => Math.pow(t, 2)}
            target={leftWingTipRef}
          />
          <Trail
            width={0.35}
            length={18}
            color="#d0e8f5"
            attenuation={(t) => Math.pow(t, 2)}
            target={rightWingTipRef}
          />
        </>
      )}

      {/* Wingtip AIM missiles */}
      {[-3.5, 3.5].map((x) => (
        <group key={x} position={[x, -0.12, -0.3]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 1.4, 8]} />
            <meshStandardMaterial color="#d5d8df" metalness={0.65} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.75, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.06, 0.22, 8]} />
            <meshStandardMaterial color="#ffb77f" metalness={0.6} roughness={0.35} />
          </mesh>
          {/* Fins */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, -0.65, 0]} rotation={[0, 0, (i * Math.PI) / 2]}>
              <boxGeometry args={[0.01, 0.2, 0.18]} />
              <meshStandardMaterial color="#d5d8df" metalness={0.6} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ============ V-TAILS (hidden for bomber/flying-wing — visibility toggle keeps scene graph stable) ============ */}
      <group position={[0, 0.25, -1.7]} visible={!hideTails}>
        <mesh position={[-0.55, 0.5, 0]} rotation={[0, 0, -0.42]} castShadow>
          <boxGeometry args={[0.08, 1.2, 0.85]} />
          <meshStandardMaterial color={bodyTint} metalness={0.78} roughness={0.32} />
        </mesh>
        <mesh position={[0.55, 0.5, 0]} rotation={[0, 0, 0.42]} castShadow>
          <boxGeometry args={[0.08, 1.2, 0.85]} />
          <meshStandardMaterial color={bodyTint} metalness={0.78} roughness={0.32} />
        </mesh>
        <mesh position={[-0.8, 1.0, -0.2]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#00dbe7" emissive="#00dbe7" emissiveIntensity={2.5} />
        </mesh>
        <mesh position={[0.8, 1.0, -0.2]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#00dbe7" emissive="#00dbe7" emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* Bomber dorsal spine detail */}
      <mesh position={[0, 0.35, -0.8]} visible={hideTails}>
        <boxGeometry args={[0.14, 0.18, 2.4]} />
        <meshStandardMaterial color={bodyTint} metalness={0.75} roughness={0.35} />
      </mesh>
      {hideCanopyBubble ? null : null}

      {/* ============ ENGINE NOZZLES ============ */}
      {[-0.38, 0.38].map((x, i) => (
        <group key={i} position={[x, 0, -2.8]}>
          {/* Outer housing */}
          <mesh>
            <cylinderGeometry args={[0.34, 0.3, 0.9, 14]} rotation-x={Math.PI / 2} />
          </mesh>
          {/* Interior dark */}
          <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.27, 0.27, 0.7, 14]} />
            <meshStandardMaterial color="#030308" metalness={1} roughness={0.5} />
          </mesh>
          {/* Nozzle petals (thin radial bars) */}
          {Array.from({ length: 10 }).map((_, j) => (
            <mesh
              key={j}
              position={[0, 0, 0]}
              rotation={[0, 0, (j * Math.PI) / 5]}
            >
              <boxGeometry args={[0.04, 0.5, 0.9]} />
              <meshStandardMaterial color="#1a2030" metalness={0.95} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ============ AFTERBURNER FLAMES ============ */}
      {[-0.38, 0.38].map((x, i) => (
        <group key={i} position={[x, 0, -3.5]}>
          {/* Outer orange flame */}
          <mesh ref={i === 0 ? ab1Ref : ab2Ref} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.26, 1.5, 14]} />
            <meshStandardMaterial
              color="#ffb77f"
              emissive="#ff5820"
              emissiveIntensity={2.6}
              transparent
              opacity={0.82}
              depthWrite={false}
            />
          </mesh>
          {/* Inner white-blue core */}
          <mesh
            ref={i === 0 ? ab1CoreRef : ab2CoreRef}
            position={[0, 0, 0.15]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.13, 0.85, 10]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#bdf2f7"
              emissiveIntensity={3.2}
              transparent
              opacity={0.92}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* ============ LANDING GEAR (when deployed) ============ */}
      {gearDown && (
        <group>
          {/* Nose gear */}
          <mesh position={[0, -0.75, 2.1]}>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#4a5260" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0, -1.15, 2.1]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.16, 0.16, 0.12, 16]} />
            <meshStandardMaterial color="#0a0a10" roughness={0.9} />
          </mesh>
          {/* Main gear left */}
          <mesh position={[-0.5, -0.8, -0.4]}>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color="#4a5260" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[-0.5, -1.25, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
            <meshStandardMaterial color="#0a0a10" roughness={0.9} />
          </mesh>
          {/* Main gear right */}
          <mesh position={[0.5, -0.8, -0.4]}>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshStandardMaterial color="#4a5260" metalness={0.8} roughness={0.4} />
          </mesh>
          <mesh position={[0.5, -1.25, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 16]} />
            <meshStandardMaterial color="#0a0a10" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* Small fill light from below for visibility */}
      <pointLight position={[0, -1.5, 0]} intensity={0.25} color="#8dc5ff" distance={8} />
      <pointLight position={[0, 2, 0]} intensity={0.35} color="#00dbe7" distance={6} />
    </group>
  );
}
