"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useGameStore } from "@/store/gameStore";

const SAT_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export default function StrikeMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const target = useGameStore((s) => s.target);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;

      const iconRetinaUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const iconUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const shadowUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      // @ts-expect-error — private member
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

      if (cancelled || !containerRef.current || mapRef.current) return;

      const center: [number, number] = target
        ? [target.lat, target.lng]
        : [37.5665, 126.978];
      const map = L.map(containerRef.current, {
        center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
      });
      L.tileLayer(SAT_TILE, { maxZoom: 19 }).addTo(map);

      if (target) {
        L.marker([target.lat, target.lng]).addTo(map);
      }

      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [target]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
