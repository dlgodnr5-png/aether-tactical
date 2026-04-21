"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sky, Stars, Cloud, Clouds, Sparkles } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import JetGLTF from "./JetGLTF";

export type AltitudeTier = 1 | 2 | 3;

export interface Obstacle {
  id: number;
  type: "plane" | "enemy" | "asteroid" | "missile";
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  hp: number;
  alive: boolean;
}

export interface MissionState {
  tier: AltitudeTier;
  altitude: number;
  distanceToTarget: number;
  throttle: number;
  speed: number; // m/s scaled
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
  pitch: number; // -1..1  (+ nose up)
  roll: number; // -1..1   (+ roll right)
  yaw: number; // -1..1    (+ yaw right)
}

interface Props {
  tier: AltitudeTier;
  onStateChange?: (state: MissionState) => void;
  onEvent?: (event: MissionEvent) => void;
  fireToken?: number;
  boostToken?: number;
  steering?: SteeringInput;
  cockpitView?: boolean;
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
}: Props) {
  const jetGroup = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  // === Flight physics state (lives in refs to avoid re-renders) ===
  const velocityRef = useRef(new THREE.Vector3(0, 0, -35)); // initial forward speed
  const angularVelRef = useRef({ pitch: 0, roll: 0, yaw: 0 });
  const totalDistanceRef = useRef(0);
  const targetDistanceRef = useRef(4500); // world-space distance until target

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [missiles, setMissiles] = useState<Obstacle[]>([]);
  const [explosions, setExplosions] = useState<{ id: number; position: THREE.Vector3; t: number }[]>([]);

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
    hp: 100,
  });

  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(2);
  const borderCrossedRef = useRef(false);
  const lastFireTokenRef = useRef(fireToken);
  const lastBoostTokenRef = useRef(boostToken);
  const missionEndedRef = useRef(false);

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
    setMissiles((m) => [...m, missile]);
    state.current.missilesFired++;
    onEvent?.({ type: "fired" });
  }, [onEvent]);

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

    // Spawn ahead of jet at 80-150u distance, ±16 off axis horizontally, ±10 vertically
    const spawnDist = 100 + Math.random() * 70;
    const basePos = jetPos.clone().add(forward.clone().multiplyScalar(spawnDist));
    const lateral = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
    basePos.addScaledVector(lateral, (Math.random() - 0.5) * 32);
    basePos.y += (Math.random() - 0.5) * 18;

    let type: Obstacle["type"] = "plane";
    if (tierNow === 3) type = Math.random() < 0.55 ? "asteroid" : "enemy";
    else if (tierNow === 2) type = Math.random() < 0.5 ? "enemy" : Math.random() < 0.8 ? "plane" : "asteroid";

    // Enemy obstacles fly toward the jet; asteroids/planes drift
    const velocity = new THREE.Vector3();
    if (type === "enemy") {
      velocity.copy(jetPos).sub(basePos).normalize().multiplyScalar(40 + Math.random() * 25);
    } else {
      velocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 4, -8 + Math.random() * 16);
    }

    setObstacles((o) => [
      ...o,
      {
        id: nextIdRef.current++,
        type,
        position: basePos,
        velocity,
        hp: type === "asteroid" ? 2 : 1,
        alive: true,
      },
    ]);
  }, []);

  useFrame((ctx, delta) => {
    if (!jetGroup.current) return;
    if (missionEndedRef.current) return;

    const s = state.current;
    const steer: SteeringInput = steering ?? { pitch: 0, roll: 0, yaw: 0 };

    // === Angular dynamics ===
    // Target angular rates from steering input
    const targetPitchRate = steer.pitch * 1.2; // rad/s
    const targetRollRate = -steer.roll * 2.2;
    const targetYawRate = steer.yaw * 0.7;
    const av = angularVelRef.current;
    const rateLerp = Math.min(1, delta * 4);
    av.pitch += (targetPitchRate - av.pitch) * rateLerp;
    av.roll += (targetRollRate - av.roll) * rateLerp;
    av.yaw += (targetYawRate - av.yaw) * rateLerp;

    // Integrate orientation via Euler (jet-relative)
    jetGroup.current.rotation.x += av.pitch * delta;
    jetGroup.current.rotation.z += av.roll * delta;
    jetGroup.current.rotation.y += av.yaw * delta;

    // Banked turn: roll drives yaw (how real aircraft turn)
    jetGroup.current.rotation.y += jetGroup.current.rotation.z * 0.7 * delta;

    // Auto-level roll when no input
    if (Math.abs(steer.roll) < 0.02) {
      const decay = Math.pow(0.6, delta);
      jetGroup.current.rotation.z *= decay;
    }

    // Soft pitch envelope: prevent inversion
    jetGroup.current.rotation.x = THREE.MathUtils.clamp(jetGroup.current.rotation.x, -Math.PI / 2.5, Math.PI / 2.5);

    // === Linear dynamics ===
    // Forward vector from jet orientation
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);

    // Thrust = throttle × base thrust, along forward
    const baseThrust = 90;
    const thrust = forward.clone().multiplyScalar(baseThrust * s.throttle * delta);
    velocityRef.current.add(thrust);

    // Subtle gravity (tier 3 = reduced, ≈ orbital)
    const gravityMag = tier === 3 ? 1.5 : tier === 2 ? 5 : 9;
    velocityRef.current.y -= gravityMag * delta;

    // Drag (proportional to v²)
    const dragCoef = 0.006;
    const speedSq = velocityRef.current.lengthSq();
    const dragForce = velocityRef.current.clone().multiplyScalar(-dragCoef * Math.sqrt(speedSq) * delta);
    velocityRef.current.add(dragForce);

    // Lift: perpendicular to velocity + up component scaled by pitch and speed
    // Simplified: extra upward push when nose-up + moving fast
    const pitchRad = jetGroup.current.rotation.x;
    const lift = Math.sin(pitchRad) * velocityRef.current.length() * 0.35 * delta;
    velocityRef.current.y += lift;

    // Throttle decay toward 0.65 baseline
    s.throttle += (0.68 - s.throttle) * Math.min(1, delta * 0.7);
    s.throttle = Math.max(0.35, Math.min(1, s.throttle));

    // Integrate position
    jetGroup.current.position.addScaledVector(velocityRef.current, delta);

    // === Altitude + distance tracking ===
    const distStep = velocityRef.current.length() * delta;
    totalDistanceRef.current += distStep;
    const tierInfo = TIER_ALTITUDES[tier];
    // Altitude = tier base + Y offset scaled (world Y is compressed: 1 world u ~= 1000m)
    const altBoost = Math.max(0, jetGroup.current.position.y) * 400;
    s.altitude = Math.min(
      tierInfo.end,
      tierInfo.start + altBoost + (totalDistanceRef.current / 4500) * (tierInfo.end - tierInfo.start) * 0.8
    );
    s.altitude = Math.max(tierInfo.start, s.altitude);

    s.distanceToTarget = Math.max(0, 100 * (1 - totalDistanceRef.current / targetDistanceRef.current));
    s.speed = velocityRef.current.length();
    s.pitchDeg = THREE.MathUtils.radToDeg(jetGroup.current.rotation.x);
    s.rollDeg = THREE.MathUtils.radToDeg(jetGroup.current.rotation.z);
    s.yawDeg = THREE.MathUtils.radToDeg(jetGroup.current.rotation.y);

    // === Border crossing event ===
    if (!borderCrossedRef.current && tier >= 2 && s.distanceToTarget < 70) {
      borderCrossedRef.current = true;
      onEvent?.({ type: "border-crossed" });
    }

    // === Spawn loop ===
    spawnTimerRef.current -= delta;
    if (spawnTimerRef.current <= 0) {
      spawnObstacle();
      const base = tier === 3 ? 0.85 : tier === 2 ? 1.2 : 1.9;
      spawnTimerRef.current = base + Math.random() * 0.9;
    }

    // === Move & cleanup obstacles ===
    const jetPos = jetGroup.current.position;
    setObstacles((list) => {
      const next: Obstacle[] = [];
      for (const o of list) {
        if (!o.alive) continue;
        o.position.addScaledVector(o.velocity, delta);
        const d = o.position.distanceTo(jetPos);
        if (d < 2.4) {
          o.alive = false;
          s.hp -= o.type === "asteroid" ? 22 : 16;
          onEvent?.({ type: "hp-loss", hp: Math.max(0, s.hp) });
          setExplosions((e) => [...e, { id: nextIdRef.current++, position: o.position.clone(), t: 0 }]);
          continue;
        }
        // Cull if far behind jet
        if (o.position.distanceTo(jetPos) > 260) continue;
        next.push(o);
      }
      return next;
    });

    // === Missiles ===
    setMissiles((list) => {
      const next: Obstacle[] = [];
      for (const m of list) {
        if (!m.alive) continue;
        m.position.addScaledVector(m.velocity, delta);
        let hit: Obstacle | null = null;
        setObstacles((obs) => {
          for (const o of obs) {
            if (!o.alive) continue;
            if (m.position.distanceTo(o.position) < 3.8) {
              o.hp -= 1;
              if (o.hp <= 0) {
                o.alive = false;
                hit = o;
              }
              m.alive = false;
              break;
            }
          }
          return obs;
        });
        if (hit) {
          const obstacle = hit as Obstacle;
          s.hitsLanded++;
          s.score += obstacle.type === "asteroid" ? 300 : obstacle.type === "enemy" ? 250 : 100;
          onEvent?.({ type: "hit", obstacleType: obstacle.type });
          setExplosions((e) => [
            ...e,
            { id: nextIdRef.current++, position: obstacle.position.clone(), t: 0 },
          ]);
          continue;
        }
        if (m.position.distanceTo(jetPos) > 300) continue;
        if (m.alive) next.push(m);
      }
      return next;
    });

    setExplosions((list) => {
      const next = [];
      for (const e of list) {
        e.t += delta;
        if (e.t < 1.2) next.push(e);
      }
      return next;
    });

    // === Mission complete ===
    if (!s.missionComplete && s.distanceToTarget <= 0) {
      s.missionComplete = true;
      missionEndedRef.current = true;
      onEvent?.({ type: "bomb-dropped" });
      window.setTimeout(() => onEvent?.({ type: "mission-complete" }), 1400);
    }

    // === Camera ===
    if (cockpitView) {
      // Inside cockpit
      const cockpitOffset = new THREE.Vector3(0, 0.55, 0.9).applyQuaternion(jetGroup.current.quaternion);
      camera.position.copy(jetGroup.current.position).add(cockpitOffset);
      const lookTarget = jetGroup.current.position.clone().add(forward.clone().multiplyScalar(40));
      camera.lookAt(lookTarget);
      // Apply jet's roll to camera for cockpit tilt
      camera.up.set(0, 1, 0).applyQuaternion(jetGroup.current.quaternion);
    } else {
      // Chase cam behind jet
      const chaseOffset = new THREE.Vector3(0, 2.4, 10).applyQuaternion(jetGroup.current.quaternion);
      const desired = jetGroup.current.position.clone().add(chaseOffset);
      camera.position.lerp(desired, Math.min(1, delta * 2.4));
      camera.lookAt(
        jetGroup.current.position.x + forward.x * 4,
        jetGroup.current.position.y + forward.y * 4 + 0.3,
        jetGroup.current.position.z + forward.z * 4
      );
      camera.up.set(0, 1, 0);
    }

    onStateChange?.({ ...s });
  });

  const tierNow = state.current.tier;

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

      {/* Sky */}
      {tierNow === 1 && <Sky sunPosition={[40, 60, 20]} turbidity={6} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {tierNow >= 2 && <Stars radius={400} depth={80} count={3500} factor={4} fade speed={0.5} />}
      {tierNow >= 3 && <Sparkles count={180} scale={120} size={2.4} speed={0.25} color="#bdf2f7" />}

      {/* Clouds (tier 1 atmospheric) */}
      {tierNow === 1 && (
        <Clouds material={THREE.MeshBasicMaterial}>
          <Cloud seed={1} bounds={[60, 10, 60]} volume={14} color="#f5faff" position={[-30, -3, -80]} />
          <Cloud seed={2} bounds={[50, 8, 50]} volume={10} color="#dce6f0" position={[20, -6, -140]} />
          <Cloud seed={3} bounds={[70, 12, 70]} volume={16} color="#ffffff" position={[60, -1, -220]} />
          <Cloud seed={4} bounds={[55, 8, 55]} volume={12} color="#e8eff8" position={[-50, -4, -300]} />
        </Clouds>
      )}

      {/* Ground plane (tier 1) */}
      {tierNow === 1 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -28, 0]}>
          <planeGeometry args={[4000, 4000, 1, 1]} />
          <meshStandardMaterial color="#0d1228" roughness={1} />
        </mesh>
      )}

      {/* The JET */}
      <group ref={jetGroup} position={[0, 0, 0]}>
        <JetGLTF throttle={state.current.throttle} bank={angularVelRef.current.roll * 0.5} contrails />
      </group>

      {/* Obstacles */}
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} />
      ))}
      {missiles.map((m) => (
        <MissileMesh key={m.id} missile={m} />
      ))}
      {explosions.map((e) => (
        <ExplosionEffect key={e.id} position={e.position} t={e.t} />
      ))}

      {/* Border wall (tier 2+) */}
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

      {/* Target approach ring */}
      {state.current.distanceToTarget < 18 && !state.current.missionComplete && (
        <group
          position={(() => {
            if (!jetGroup.current) return [0, 0, -50];
            const p = jetGroup.current.position.clone();
            const f = new THREE.Vector3(0, 0, -1).applyQuaternion(jetGroup.current.quaternion);
            p.add(f.multiplyScalar(60));
            return [p.x, p.y, p.z];
          })() as [number, number, number]}
        >
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
        {/* Fuselage */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.22, 2.4, 10]} />
          <meshStandardMaterial color="#5a1028" metalness={0.7} roughness={0.35} emissive="#ff2244" emissiveIntensity={0.55} />
        </mesh>
        {/* Wings */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.1, 0.2]}>
          <boxGeometry args={[0.3, 2.6, 0.12]} />
          <meshStandardMaterial color="#5a1028" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Cockpit dome */}
        <mesh position={[0, 0.22, 0.6]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshStandardMaterial color="#a0e8f0" metalness={0.6} roughness={0.18} transparent opacity={0.65} />
        </mesh>
        {/* Exhaust */}
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

function ExplosionEffect({ position, t }: { position: THREE.Vector3; t: number }) {
  const scale = 0.5 + t * 7;
  const opacity = Math.max(0, 1 - t / 1.2);
  return (
    <group position={position}>
      <mesh scale={scale}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ffb77f" transparent opacity={opacity * 0.85} depthWrite={false} />
      </mesh>
      <mesh scale={scale * 0.55}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity} depthWrite={false} />
      </mesh>
    </group>
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
