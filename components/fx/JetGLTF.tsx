"use client";

import { Suspense, useEffect, useState } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import JetModel3D from "./JetModel3D";

const MODEL_URL = "/models/fighter.glb";

interface Props {
  throttle?: number;
  bank?: number;
  contrails?: boolean;
  /** Scale applied to GLB root (tune to match primitive jet's ~8u wingspan) */
  gltfScale?: number;
}

/**
 * Attempts to load /public/models/fighter.glb via useGLTF.
 * Falls back to the primitive JetModel3D if file is missing or load fails.
 *
 * To use a real model, drop a CC0/CC-BY .glb at `public/models/fighter.glb`.
 * Recommended sources: Sketchfab (filter "Downloadable" + CC0), Khronos glTF
 * Sample Models, NASA 3D Resources.
 */
function GLTFJet({ throttle, bank, gltfScale = 1 }: Props) {
  const gltf = useGLTF(MODEL_URL);
  return (
    <group rotation={[0, Math.PI, 0]} scale={gltfScale}>
      <primitive object={gltf.scene.clone()} />
      {/* Reuse the procedural afterburners from the primitive jet so we get
          animated flame even when using an external mesh */}
      <group position={[0, 0, -2.6]} scale={0.7}>
        <JetModel3D throttle={throttle} bank={bank} contrails={false} />
      </group>
    </group>
  );
}

export default function JetGLTF(props: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    // Probe for the file — fetch with HEAD; if 200 → try GLTF loader,
    // otherwise silently fall back to the primitive jet.
    let active = true;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => {
        if (active) setAvailable(r.ok);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (available === null) {
    // Probe in-flight → render primitive for now; swap later if GLB is found
    return <JetModel3D {...props} />;
  }
  if (!available) {
    return <JetModel3D {...props} />;
  }
  return (
    <Suspense fallback={<JetModel3D {...props} />}>
      <GLTFJet {...props} />
    </Suspense>
  );
}
