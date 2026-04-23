"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars, Cloud, Clouds, Sparkles } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import JetGLTF from "./JetGLTF";
import type { PlaneSpecs } from "@/lib/planes";
import { BASE_HP } from "@/lib/planes";

const DEFAULT_SPECS: PlaneSpecs = {
  speedMul: 1.0, hpMul: 1.0, damageMul: 1.0, stealth: 0.5, unlockCost: 0, rank: 0,
};

export type AltitudeTier = 1 | 2 | 3;

export interface Obstacle {
  id: number;
  type: "plane" | "enemy" | "asteroid" | "missile";
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  alive: boolean;
}

interface Explosion {
  id: number;
  position: THREE.Vector3;
  t: number;
}

export interface MissionState {
  tier: AltitudeTier;
  altitude: number;
  distanceToTarget: number;
  throttle: number;
  speed: number;
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  missionComplete: boolean;
  score: number;
  missilesFired: number;
  hitsLanded: number;
  hp: number;
}

export type MissionEvent =
  | { type: "fired" }
  | { type: "hit"; obstacleType: Obstacle["type"] }
  | { type: "bomb-dropped" }
  | { type: "mission-complete" }
  | { type: "border-crossed" }
  | { type: "hp-loss"; hp: number };

export interface SteeringInput {
  pitch: number;
  roll: number;
  yaw: number;
}

interface Props {
  tier: AltitudeTier;
  onStateChange?: (state: MissionState) => void;
  onEvent?: (event: MissionEvent) => void;
  fireToken?: number;
  boostToken?: number;
  steering?: SteeringInput;
  cockpitView?: boolean;
  paused?: boolean;
  /** Per-jet specs from lib/planes.ts. Drives HP/speed/damage/stealth. */
  planeSpecs?: PlaneSpecs;
}

const TIER_ALTITUDES: Record<AltitudeTier, { start: number; end: number; name: string }> = {
  1: { start: 0, end: 10000, name: "TROPOSPHERE" },
  2: { start: 10000, end: 100000, name: "STRATOSPHERE → KARMAN" },
  3: { start: 100000, end: 400000, name: "LOW EARTH ORBIT" },
};

function MissionInner({
  tier,
  onStateChange,
  onEvent,
  fireToken,
  boostToken,
  steering,
  cockpitView,
  paused,
  planeSpecs,
}: Props) {
  const specs = planeSpecs ?? DEFAULT_SPECS;
  const initialHp = Math.round(BASE_HP * specs.hpMul);
  const jetGroup = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  // === Flight physics (refs — no re-render) ===
  const velocityRef = useRef(new THREE.Vector3(0, 0, -35));
  const angularVelRef = useRef({ pitch: 0, roll: 0, yaw: 0 });
  const totalDistanceRef = useRef(0);
  const targetDistanceRef = useRef(4500);

  // === Game entities (refs, NOT state — mutated in place) ===
  const obstaclesRef = useRef<Obstacle[]>([]);
  const missilesRef = useRef<Obstacle[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  // Single version counter — increment only when entity COUNT changes
  const [renderTick, setRenderTick] = useState(0);
  const lastCountsRef = useRef({ o: 0, m: 0, e: 0 });

  const state = useRef<MissionState>({
    tier,
    altitude: TIER_ALTITUDES[tier].start,
    distanceToTarget: 100,
    throttle: 0.7,
    speed: 35,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    missionComplete: false,
    score: 0,
    missilesFired: 0,
    hitsLanded: 0,
    hp: initialHp,
  });

  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(2);
  const borderCrossedRef = useRef(false);
  const lastFireTokenRef = useRef(fireToken);
  const lastBoostTokenRef = useRef(boostToken);
  const missionEndedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  useEffect(() => {
    state.current.tier = tier;
    state.current.altitude = Math.max(state.current.altitude, TIER_ALTITUDES[tier].start);
  }, [tier]);

  const fireMissile = useCallback(() => {
    if (!jetGroup.current || missionEndedRef.current) return;
    const origin = jetGroup.current.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);
    const missile: Obstacle = {
      id: nextIdRef.current++,
      type: "missile",
      position: origin.clone().add(forward.clone().multiplyScalar(2)),
      velocity: forward.multiplyScalar(140).add(velocityRef.current.clone().multiplyScalar(0.8)),
      hp: 1,
      alive: true,
    };
    missilesRef.current.push(missile);
    state.current.missilesFired++;
    setRenderTick((t) => t + 1);
    onEventRef.current?.({ type: "fired" });
  }, []);

  useEffect(() => {
    if (fireToken !== undefined && fireToken !== lastFireTokenRef.current) {
      lastFireTokenRef.current = fireToken;
      fireMissile();
    }
  }, [fireToken, fireMissile]);

  useEffect(() => {
    if (boostToken !== undefined && boostToken !== lastBoostTokenRef.current) {
      lastBoostTokenRef.current = boostToken;
      state.current.throttle = Math.min(1, state.current.throttle + 0.22);
    }
  }, [boostToken]);

  const spawnObstacle = useCallback(() => {
    if (missionEndedRef.current || !jetGroup.current) return;
    const tierNow = state.current.tier;
    const jetPos = jetGroup.current.position;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);
    const spawnDist = 100 + Math.random() * 70;
    const basePos = jetPos.clone().add(forward.clone().multiplyScalar(spawnDist));
    const lateral = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
    basePos.addScaledVector(lateral, (Math.random() - 0.5) * 32);
    basePos.y += (Math.random() - 0.5) * 18;

    let type: Obstacle["type"] = "plane";
    if (tierNow === 3) type = Math.random() < 0.55 ? "asteroid" : "enemy";
    else if (tierNow === 2) type = Math.random() < 0.5 ? "enemy" : Math.random() < 0.8 ? "plane" : "asteroid";

    const velocity = new THREE.Vector3();
    if (type === "enemy") {
      velocity.copy(jetPos).sub(basePos).normalize().multiplyScalar(40 + Math.random() * 25);
    } else {
      velocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, -8 + Math.random() * 16);
    }

    obstaclesRef.current.push({
      id: nextIdRef.current++,
      type,
      position: basePos,
      velocity,
      hp: type === "asteroid" ? 2 : 1,
      alive: true,
    });
  }, []);

  useFrame((ctx, delta) => {
    if (!jetGroup.current) return;
    if (missionEndedRef.current) return;
    if (paused) return;

    // Clamp delta to avoid physics explosion after tab-switch
    const dt = Math.min(delta, 0.05);

    const s = state.current;
    const steer: SteeringInput = steering ?? { pitch: 0, roll: 0, yaw: 0 };

    // === Angular dynamics ===
    const targetPitchRate = steer.pitch * 1.2;
    const targetRollRate = -steer.roll * 2.2;
    const targetYawRate = steer.yaw * 0.7;
    const av = angularVelRef.current;
    const rateLerp = Math.min(1, dt * 4);
    av.pitch += (targetPitchRate - av.pitch) * rateLerp;
    av.roll += (targetRollRate - av.roll) * rateLerp;
    av.yaw += (targetYawRate - av.yaw) * rateLerp;

    jetGroup.current.rotation.x += av.pitch * dt;
    jetGroup.current.rotation.z += av.roll * dt;
    jetGroup.current.rotation.y += av.yaw * dt;
    jetGroup.current.rotation.y += jetGroup.current.rotation.z * 0.7 * dt;

    if (Math.abs(steer.roll) < 0.02) {
      const decay = Math.pow(0.6, dt);
      jetGroup.current.rotation.z *= decay;
    }
    jetGroup.current.rotation.x = THREE.MathUtils.clamp(
      jetGroup.current.rotation.x,
      -Math.PI / 2.5,
      Math.PI / 2.5
    );

    // === Linear dynamics ===
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);
    const baseThrust = 90 * specs.speedMul;
    const thrust = forward.clone().multiplyScalar(baseThrust * s.throttle * dt);
    velocityRef.current.add(thrust);

    // === Flight Physics (Bank-to-turn + Inertia) ===
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(jetGroup.current.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(jetGroup.current.quaternion);

    // Thrust based on throttle
    const thrustMag = 45 * s.throttle;
    velocityRef.current.addScaledVector(forward, thrustMag * dt);

    // Banking logic: rolling causes lateral lift (turn)
    const rollAmount = -angularVelRef.current.roll; 
    const turnStrength = velocityRef.current.length() * 0.4;
    const turnVec = right.clone().multiplyScalar(rollAmount * turnStrength * dt);
    velocityRef.current.add(turnVec);

    // Gravity & Lift
    const gravityMag = tier === 3 ? 1.5 : tier === 2 ? 5 : 9.8;
    velocityRef.current.y -= gravityMag * dt;

    const pitchRad = jetGroup.current.rotation.x;
    const liftMag = Math.cos(jetGroup.current.rotation.z) * velocityRef.current.length() * 0.42;
    velocityRef.current.y += liftMag * dt;

    // Drag (increased at high speeds)
    const dragCoef = 0.008;
    velocityRef.current.multiplyScalar(1 - dragCoef * velocityRef.current.length() * dt);

    jetGroup.current.position.addScaledVector(velocityRef.current, dt);

    // === Dynamic Camera Juice (Shake & G-Force) ===
    const shakeRef = useRef(0);
    // Use speed and explosions to drive shake
    const speedShake = Math.max(0, (s.speed - 25) * 0.02);
    const totalShake = shakeRef.current + speedShake;
    if (shakeRef.current > 0) shakeRef.current *= 0.9; // decay

    if (cockpitView) {
      const cockpitOffset = new THREE.Vector3(0, 0.55, 0.9).applyQuaternion(jetGroup.current.quaternion);
      const shakeOffset = new THREE.Vector3(
        (Math.random() - 0.5) * totalShake,
        (Math.random() - 0.5) * totalShake,
        0
      );
      camera.position.copy(jetGroup.current.position).add(cockpitOffset).add(shakeOffset);
      const lookTarget = jetGroup.current.position.clone().add(forward.clone().multiplyScalar(40));
      camera.lookAt(lookTarget);
      camera.up.set(0, 1, 0).applyQuaternion(jetGroup.current.quaternion);
    } else {
      const chaseOffset = new THREE.Vector3(0, 2.4, 10).applyQuaternion(jetGroup.current.quaternion);
      const desired = jetGroup.current.position.clone().add(chaseOffset);
      camera.position.lerp(desired, Math.min(1, dt * 3.0));
      
      // Look slightly ahead with a tiny bit of random jitter
      const jitterX = (Math.random() - 0.5) * totalShake * 0.5;
      const jitterY = (Math.random() - 0.5) * totalShake * 0.5;
      camera.lookAt(
        jetGroup.current.position.x + forward.x * 4 + jitterX,
        jetGroup.current.position.y + forward.y * 4 + 0.3 + jitterY,
        jetGroup.current.position.z + forward.z * 4
      );
    }


    onStateChangeRef.current?.({ ...s });
  });

  const tierNow = state.current.tier;

  // Target approach ring position (read from ref at render time)
  const targetRingPos = useMemo<[number, number, number]>(() => {
    if (!jetGroup.current) return [0, 0, -50];
    const p = jetGroup.current.position.clone();
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);
    p.add(f.multiplyScalar(60));
    return [p.x, p.y, p.z];
  }, [renderTick]);

  return (
    <>
      <ambientLight intensity={tierNow === 3 ? 0.15 : tierNow === 2 ? 0.35 : 0.55} color={tierNow === 3 ? "#8ea5c8" : "#e0ecff"} />
      <directionalLight
        position={[30, 40, 20]}
        intensity={tierNow === 3 ? 1.0 : tierNow === 2 ? 1.4 : 1.8}
        color={tierNow === 3 ? "#e5f0ff" : "#fff3d9"}
        castShadow
      />
      <pointLight position={[0, 3, 6]} intensity={0.55} color="#00dbe7" distance={18} />

      {tierNow === 1 && <Sky sunPosition={[40, 60, 20]} turbidity={6} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {tierNow >= 2 && <Stars radius={400} depth={80} count={3500} factor={4} fade speed={0.5} />}
      {tierNow >= 3 && <Sparkles count={180} scale={120} size={2.4} speed={0.25} color="#bdf2f7" />}

      {tierNow === 1 && (
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud seed={1} bounds={[60, 10, 60]} volume={14} color="#f5faff" position={[-30, -3, -80]} />
          <Cloud seed={2} bounds={[50, 8, 50]} volume={10} color="#dce6f0" position={[20, -6, -140]} />
          <Cloud seed={3} bounds={[70, 12, 70]} volume={16} color="#ffffff" position={[60, -1, -220]} />
          <Cloud seed={4} bounds={[55, 8, 55]} volume={12} color="#e8eff8" position={[-50, -4, -300]} />
        </Clouds>
      )}

      {tierNow === 1 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -28, 0]}>
          <planeGeometry args={[4000, 4000, 1, 1]} />
          <meshStandardMaterial color="#0d1228" roughness={1} />
        </mesh>
      )}

      <group ref={jetGroup} position={[0, 0, 0]}>
        <JetGLTF throttle={state.current.throttle} bank={angularVelRef.current.roll * 0.5} contrails />
      </group>

      {obstaclesRef.current.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} />
      ))}
      {missilesRef.current.map((m) => (
        <MissileMesh key={m.id} missile={m} />
      ))}
      {explosionsRef.current.map((e) => (
        <ExplosionEffect key={e.id} explosion={e} />
      ))}

      {tierNow >= 2 && !borderCrossedRef.current && state.current.distanceToTarget > 70 && (
        <group position={[0, 0, -260]}>
          <mesh>
            <planeGeometry args={[220, 80]} />
            <meshBasicMaterial color="#ff3355" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.1]}>
            <planeGeometry args={[220, 0.3]} />
            <meshBasicMaterial color="#ff3355" transparent opacity={0.7} />
          </mesh>
        </group>
      )}

      {state.current.distanceToTarget < 18 && !state.current.missionComplete && (
        <group position={targetRingPos}>
          <mesh>
            <ringGeometry args={[4, 5, 32]} />
            <meshBasicMaterial color="#ffb77f" side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.6, 0.9, 16]} />
            <meshBasicMaterial color="#ffb77f" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </>
  );
}

function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(obstacle.position);
      ref.current.rotation.y += 0.03;
      ref.current.rotation.x += 0.02;
    }
  });
  if (obstacle.type === "asteroid") {
    return (
      <group ref={ref}>
        <mesh>
          <dodecahedronGeometry args={[1.5, 0]} />
          <meshStandardMaterial color="#6b5b4a" metalness={0.3} roughness={0.85} />
        </mesh>
      </group>
    );
  }
  if (obstacle.type === "enemy") {
    return (
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.22, 2.4, 10]} />
          <meshStandardMaterial color="#5a1028" metalness={0.7} roughness={0.35} emissive="#ff2244" emissiveIntensity={0.55} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.1, 0.2]}>
          <boxGeometry args={[0.3, 2.6, 0.12]} />
          <meshStandardMaterial color="#5a1028" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0.6]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshStandardMaterial color="#a0e8f0" metalness={0.6} roughness={0.18} transparent opacity={0.65} />
        </mesh>
        <mesh position={[0, 0, -1.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.2, 0.6, 10]} />
          <meshStandardMaterial color="#ff3322" emissive="#ff4400" emissiveIntensity={2} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      </group>
    );
  }
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.2, 2.0, 10]} />
        <meshStandardMaterial color="#b0b8c4" metalness={0.5} roughness={0.35} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.02, 0]}>
        <boxGeometry args={[0.22, 2.2, 0.1]} />
        <meshStandardMaterial color="#b0b8c4" metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}

function MissileMesh({ missile }: { missile: Obstacle }) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(missile.position);
      const dir = missile.velocity.clone().normalize();
      const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0));
      ref.current.quaternion.setFromRotationMatrix(m);
    }
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 1.3, 8]} />
        <meshStandardMaterial color="#d5d8df" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.75]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.25, 8]} />
        <meshStandardMaterial color="#ffb77f" emissive="#ff6820" emissiveIntensity={1.2} />
      </mesh>
      <mesh position={[0, 0, -0.85]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 1.6, 8]} />
        <meshStandardMaterial color="#ffb77f" emissive="#ff6820" emissiveIntensity={2.3} transparent opacity={0.7} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ExplosionEffect({ explosion }: { explosion: Explosion }) {
  const outerRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const scale = 0.5 + explosion.t * 7;
    const opacity = Math.max(0, 1 - explosion.t / 1.2);
    if (outerRef.current) {
      outerRef.current.position.copy(explosion.position);
      outerRef.current.scale.setScalar(scale);
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity = opacity * 0.85;
    }
    if (innerRef.current) {
      innerRef.current.position.copy(explosion.position);
      innerRef.current.scale.setScalar(scale * 0.55);
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });
  return (
    <>
      <mesh ref={outerRef}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ffb77f" transparent depthWrite={false} />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
      </mesh>
    </>
  );
}

export default function MissionScene(props: Props) {
  const tierNow = props.tier;
  const bgColor = useMemo(() => {
    if (tierNow === 1) return "#6ab7e8";
    if (tierNow === 2) return "#0c1e48";
    return "#020310";
  }, [tierNow]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 62, position: [0, 3, 10], near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true }}
      style={{ background: bgColor }}
    >
      <fog attach="fog" args={[bgColor, 80, tierNow === 1 ? 600 : 900]} />
      <MissionInner {...props} />
    </Canvas>
  );
}
