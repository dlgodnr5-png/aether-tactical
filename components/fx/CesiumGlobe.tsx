"use client";

/**
 * 3D Earth globe for picking strike targets.
 *
 * Usage (always via dynamic import, ssr:false):
 *   const CesiumGlobe = dynamic(
 *     () => import("@/components/fx/CesiumGlobe"),
 *     { ssr: false, loading: () => <div>지구본 로드 중…</div> }
 *   );
 *
 *   <CesiumGlobe
 *     onPick={(lat, lng) => setTarget({lat, lng, address: ""})}
 *     maxRangeKm={1000}
 *     carrierOrigin={{ lat: 33.4, lng: 130.1 }}
 *   />
 *
 * Cesium Ion token: set NEXT_PUBLIC_CESIUM_ION_TOKEN in .env to enable
 * satellite imagery + terrain. Without it the globe renders with offline
 * Natural Earth imagery (still functional, lower fidelity).
 */

// MUST be first — sets window.CESIUM_BASE_URL before any cesium module loads
import "./cesium-setup";
import { CESIUM_ION_TOKEN } from "./cesium-setup";

import { useEffect, useRef, useState } from "react";
import {
  Ion,
  Cartesian2,
  Cartesian3,
  Color,
  ScreenSpaceEventType,
  type Viewer as CesiumViewerType,
} from "cesium";
import { Viewer, Entity, PointGraphics, EllipseGraphics } from "resium";
import { haversineKm } from "@/lib/tiers";

// Configure Ion token once, module-scope (safe: only runs after setup)
if (CESIUM_ION_TOKEN) {
  Ion.defaultAccessToken = CESIUM_ION_TOKEN;
}

export interface CesiumGlobeProps {
  /** Called when the user clicks a point within allowed range. */
  onPick: (lat: number, lng: number) => void;
  /** Maximum allowed distance from carrier origin (km). */
  maxRangeKm: number;
  /** Home carrier location. Target must be within maxRangeKm of this. */
  carrierOrigin: { lat: number; lng: number };
  /** Currently selected target (rendered as a red pin). */
  target?: { lat: number; lng: number } | null;
}

export default function CesiumGlobe({
  onPick,
  maxRangeKm,
  carrierOrigin,
  target,
}: CesiumGlobeProps) {
  const viewerRef = useRef<{ cesiumElement?: CesiumViewerType } | null>(null);
  const [outOfRange, setOutOfRange] = useState(false);

  // Attach left-click handler to the viewer canvas.
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    const handler = viewer.screenSpaceEventHandler;
    handler.setInputAction(
      (movement: { position: Cartesian2 }) => {
        const pos = new Cartesian2(movement.position.x, movement.position.y);
        const ray = viewer.camera.getPickRay(pos);
        if (!ray) return;
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        if (!cartesian) return;
        const cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
        const lat = (cartographic.latitude * 180) / Math.PI;
        const lng = (cartographic.longitude * 180) / Math.PI;

        const dist = haversineKm(carrierOrigin, { lat, lng });
        if (dist > maxRangeKm) {
          setOutOfRange(true);
          window.setTimeout(() => setOutOfRange(false), 2000);
          return;
        }
        onPick(lat, lng);
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      handler.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
    };
  }, [onPick, maxRangeKm, carrierOrigin]);

  const originPos = Cartesian3.fromDegrees(carrierOrigin.lng, carrierOrigin.lat);
  const targetPos = target
    ? Cartesian3.fromDegrees(target.lng, target.lat)
    : null;

  return (
    <div className="relative h-full w-full">
      <Viewer
        full
        ref={viewerRef as React.RefObject<{ cesiumElement?: CesiumViewerType } | null>}
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        geocoder={!!CESIUM_ION_TOKEN}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        fullscreenButton={false}
        infoBox={false}
        selectionIndicator={false}
      >
        {/* Carrier origin (green, with range ring) */}
        <Entity position={originPos}>
          <PointGraphics pixelSize={12} color={Color.LIMEGREEN} outlineColor={Color.WHITE} outlineWidth={2} />
          <EllipseGraphics
            semiMinorAxis={maxRangeKm * 1000}
            semiMajorAxis={maxRangeKm * 1000}
            material={Color.LIMEGREEN.withAlpha(0.15)}
            outline
            outlineColor={Color.LIMEGREEN.withAlpha(0.6)}
            height={0}
          />
        </Entity>

        {/* Selected target (red) */}
        {targetPos && (
          <Entity position={targetPos}>
            <PointGraphics pixelSize={14} color={Color.RED} outlineColor={Color.WHITE} outlineWidth={2} />
          </Entity>
        )}
      </Viewer>

      {outOfRange && (
        <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 rounded-md bg-red-900/90 px-4 py-2 font-mono text-sm text-red-100 shadow-lg">
          OUT OF RANGE — 반경 {maxRangeKm}km 초과
        </div>
      )}

      {!CESIUM_ION_TOKEN && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 font-mono text-[10px] text-amber-300">
          OFFLINE MODE — Ion 토큰 미설정 (위성 사진 비활성)
        </div>
      )}
    </div>
  );
}
