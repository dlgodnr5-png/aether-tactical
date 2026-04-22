"use client";

/**
 * Signature moment: Google-Earth-style zoom-in to the target.
 *
 * Plays a ~8s camera flight from orbit height down to ~500m above the
 * target coordinates, then fires `onComplete`. The game state machine
 * should transition from `phase="zoom"` to `phase="strike"` on completion.
 *
 * Usage (via dynamic import, ssr:false):
 *   <CesiumZoomCinematic
 *     target={{ lat, lng }}
 *     onComplete={() => setPhase("strike")}
 *   />
 */

import "./cesium-setup";
import { CESIUM_ION_TOKEN } from "./cesium-setup";

import { useEffect, useRef } from "react";
import {
  Ion,
  Cartesian3,
  Math as CesiumMath,
  EasingFunction,
  Color,
  type Viewer as CesiumViewerType,
} from "cesium";
import { Viewer, Entity, PointGraphics } from "resium";

if (CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

export interface CesiumZoomCinematicProps {
  target: { lat: number; lng: number };
  onComplete: () => void;
  /** Camera flight duration in seconds. Defaults to 8s. */
  durationSec?: number;
  /** Final camera altitude in meters. Defaults to 500m. */
  finalAltitudeM?: number;
}

export default function CesiumZoomCinematic({
  target,
  onComplete,
  durationSec = 8,
  finalAltitudeM = 500,
}: CesiumZoomCinematicProps) {
  const viewerRef = useRef<{ cesiumElement?: CesiumViewerType } | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    // Start high up and off-center for dramatic approach
    const start = Cartesian3.fromDegrees(target.lng, target.lat, 5_000_000);
    viewer.camera.setView({ destination: start });

    // Fly down to target
    const destination = Cartesian3.fromDegrees(
      target.lng,
      target.lat,
      finalAltitudeM,
    );

    viewer.camera.flyTo({
      destination,
      duration: durationSec,
      easingFunction: EasingFunction.QUADRATIC_IN_OUT,
      orientation: {
        heading: CesiumMath.toRadians(0),
        pitch: CesiumMath.toRadians(-45),
        roll: 0,
      },
      complete: () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onComplete();
      },
    });

    // Safety fallback: onComplete fires even if Cesium swallows the complete cb
    const timeoutMs = (durationSec + 1.5) * 1000;
    const t = window.setTimeout(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onComplete();
    }, timeoutMs);

    return () => window.clearTimeout(t);
  }, [target, onComplete, durationSec, finalAltitudeM]);

  const targetPos = Cartesian3.fromDegrees(target.lng, target.lat);

  return (
    <div className="relative h-full w-full">
      <Viewer
        full
        ref={viewerRef as React.RefObject<{ cesiumElement?: CesiumViewerType } | null>}
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={false}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
      >
        <Entity position={targetPos}>
          <PointGraphics
            pixelSize={18}
            color={Color.RED}
            outlineColor={Color.WHITE}
            outlineWidth={3}
          />
        </Entity>
      </Viewer>

      {/* Scanlines + vignette overlay for cinematic feel */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* HUD text */}
      <div className="pointer-events-none absolute left-6 top-6 font-mono text-sm text-lime-300">
        TARGET LOCK ACQUIRED
      </div>
      <div className="pointer-events-none absolute right-6 top-6 font-mono text-xs tabular-nums text-red-400">
        {target.lat.toFixed(4)}°N {target.lng.toFixed(4)}°E
      </div>
    </div>
  );
}
