"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useGameStore } from "@/store/gameStore";

interface Props {
  className?: string;
}

const SAT_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export default function TargetsMap({ className }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setTarget = useGameStore((s) => s.setTarget);
  const target = useGameStore((s) => s.target);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    target ? { lat: target.lat, lng: target.lng } : { lat: 37.5665, lng: 126.978 }
  );
  const [query, setQuery] = useState<string>(target?.address ?? "");
  const [status, setStatus] = useState<string>("READY");

  // Init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;

      // Fix default icon paths (Leaflet + webpack)
      const iconRetinaUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
      const iconUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
      const shadowUrl =
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
      // @ts-expect-error — private method on Icon.Default
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [coords.lat, coords.lng],
        zoom: 14,
        zoomControl: true,
      });
      L.tileLayer(SAT_TILE, {
        maxZoom: 19,
        attribution:
          "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      }).addTo(map);

      if (target) {
        markerRef.current = L.marker([target.lat, target.lng]).addTo(map);
      }

      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
        setTarget({ lat, lng, address: query || "MANUAL_PIN" });
        setStatus("TARGET PINNED");
      });

      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus("GEOLOCATION UNAVAILABLE");
      return;
    }
    setStatus("LOCATING...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        const map = mapRef.current;
        if (map) {
          map.setView([latitude, longitude], 15);
          import("leaflet").then(({ default: L }) => {
            if (markerRef.current) {
              markerRef.current.setLatLng([latitude, longitude]);
            } else {
              markerRef.current = L.marker([latitude, longitude]).addTo(map);
            }
          });
        }
        setTarget({
          lat: latitude,
          lng: longitude,
          address: "CURRENT_POSITION",
        });
        setStatus("LOCKED ON SELF");
      },
      () => setStatus("LOCATION DENIED")
    );
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setStatus("SEARCHING...");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "ko,en;q=0.8" },
      });
      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data || data.length === 0) {
        setStatus("NO MATCH");
        return;
      }
      const { lat, lon, display_name } = data[0];
      const latN = parseFloat(lat);
      const lonN = parseFloat(lon);
      setCoords({ lat: latN, lng: lonN });
      const map = mapRef.current;
      if (map) {
        map.setView([latN, lonN], 15);
        const { default: L } = await import("leaflet");
        if (markerRef.current) {
          markerRef.current.setLatLng([latN, lonN]);
        } else {
          markerRef.current = L.marker([latN, lonN]).addTo(map);
        }
      }
      setTarget({ lat: latN, lng: lonN, address: display_name });
      setStatus("TARGET ACQUIRED");
    } catch {
      setStatus("SEARCH FAILED");
    }
  };

  const coordLabel = useMemo(
    () => `${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°`,
    [coords]
  );

  return (
    <div className={className}>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-cyan-400/70 text-[18px]">
            search
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder="목표 지점 (주소) 입력"
            className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low pl-8 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-cyan-400/60"
          />
        </div>
        <button
          onClick={search}
          className="rounded-lg border border-cyan-400/40 bg-surface-container/60 px-3 py-2 font-label tracking-[0.2em] text-xs text-cyan-300 hover:bg-cyan-400/10"
        >
          SEARCH
        </button>
        <button
          onClick={locate}
          aria-label="use my location"
          className="rounded-lg border border-cyan-400/40 bg-surface-container/60 px-3 py-2 text-cyan-300 hover:bg-cyan-400/10"
        >
          <span className="material-symbols-outlined text-[18px]">
            my_location
          </span>
        </button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-cyan-400/30">
        <div ref={containerRef} className="h-[60vh] w-full" />

        {/* HUD corners */}
        {[
          "top-2 left-2 border-t border-l",
          "top-2 right-2 border-t border-r",
          "bottom-2 left-2 border-b border-l",
          "bottom-2 right-2 border-b border-r",
        ].map((c) => (
          <div
            key={c}
            className={`pointer-events-none absolute w-6 h-6 border-cyan-400/80 ${c}`}
          />
        ))}

        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-sm border border-cyan-400/40 bg-black/60 px-3 py-1 font-label text-[10px] tracking-[0.3em] text-cyan-300">
          {status}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/80 p-3">
          <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
            LAT
          </p>
          <p className="font-headline text-sm text-cyan-300 tabular-nums">
            {coords.lat.toFixed(5)}
          </p>
        </div>
        <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest/80 p-3">
          <p className="font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
            LONG
          </p>
          <p className="font-headline text-sm text-cyan-300 tabular-nums">
            {coords.lng.toFixed(5)}
          </p>
        </div>
      </div>
      <p className="mt-2 font-label text-[10px] tracking-[0.25em] text-on-surface-variant">
        {coordLabel}
      </p>
    </div>
  );
}
