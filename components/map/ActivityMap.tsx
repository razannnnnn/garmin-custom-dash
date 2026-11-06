"use client";

// components/map/ActivityMap.tsx — peta rute GPS/GPX berbasis penuh Leaflet + OpenStreetMap
//
// Memakai Leaflet (L.map, L.tileLayer, L.polyline, L.circleMarker, fitBounds)
// dengan ubin resmi OpenStreetMap tanpa ketergantungan Carto/API key, mendukung
// zoom, pan, penanda Mulai/Selesai, dan inspeksi titik koordinat sepanjang rute.

import { useEffect, useMemo, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";

type ThemeMode = "light" | "dark";

function currentTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    setMode(currentTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setMode(currentTheme());
    mq.addEventListener("change", sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", sync);
      mo.disconnect();
    };
  }, []);

  return mode;
}

interface ActivityMapProps {
  /** [lon, lat] */
  coords: [number, number][];
  label: string;
  height?: number;
  interactive?: boolean;
}

export function ActivityMap({
  coords,
  label,
  height = 240,
  interactive = false,
}: ActivityMapProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const theme = useThemeMode();
  const [hoverInfo, setHoverInfo] = useState<{ pct: number; lat: number; lon: number } | null>(
    null
  );

  // Konversi [lon, lat] (GeoJSON) -> [lat, lon] (Leaflet LatLngTuple)
  const latlngs = useMemo(
    () => coords.map(([lon, lat]) => [lat, lon] as [number, number]),
    [coords]
  );

  useEffect(() => {
    const el = mapElRef.current;
    if (!el || latlngs.length < 2) return;

    let cancelled = false;
    let instance: LeafletNS.Map | null = null;
    let ro: ResizeObserver | null = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapElRef.current) return;

      // Bersihkan instance lama bila ada
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(mapElRef.current, {
        zoomControl: interactive,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: false,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
      });

      instance = map;
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const casingColor = theme === "dark" ? "#0b0f14" : "#ffffff";
      const routeColor = theme === "dark" ? "#29b8cf" : "#0b6b7a";

      // Garis tepi (casing) + jalur utama rute lari
      L.polyline(latlngs, {
        color: casingColor,
        weight: 7,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);

      const routeLine = L.polyline(latlngs, {
        color: routeColor,
        weight: 4,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Titik Mulai (hijau) & Selesai (merah)
      const startPt = latlngs[0];
      const endPt = latlngs[latlngs.length - 1];

      L.circleMarker(startPt, {
        radius: 6,
        color: casingColor,
        weight: 2,
        fillColor: "#10b981",
        fillOpacity: 1,
      })
        .bindTooltip("Mulai", { direction: "top", offset: [0, -6] })
        .addTo(map);

      L.circleMarker(endPt, {
        radius: 6,
        color: casingColor,
        weight: 2,
        fillColor: "#ef4444",
        fillOpacity: 1,
      })
        .bindTooltip("Selesai", { direction: "top", offset: [0, -6] })
        .addTo(map);

      // Titik indikator hover sepanjang rute
      const hoverMarker = L.circleMarker(startPt, {
        radius: 5.5,
        color: casingColor,
        weight: 2,
        fillColor: routeColor,
        fillOpacity: 1,
        opacity: 0,
      }).addTo(map);
      hoverMarker.setStyle({ opacity: 0, fillOpacity: 0 });

      // Pastikan ukuran kontainer akurat dan fitBounds pas di tengah
      map.invalidateSize();
      map.fitBounds(routeLine.getBounds(), {
        padding: [28, 28],
        maxZoom: 17,
        animate: false,
      });

      ro = new ResizeObserver(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.fitBounds(routeLine.getBounds(), {
            padding: [28, 28],
            maxZoom: 17,
            animate: false,
          });
        }
      });
      if (mapElRef.current) ro.observe(mapElRef.current);

      map.on("mousemove", (ev: LeafletNS.LeafletMouseEvent) => {
        const { lat, lng } = ev.latlng;
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < latlngs.length; i += 1) {
          const dLat = latlngs[i][0] - lat;
          const dLon = latlngs[i][1] - lng;
          const d2 = dLat * dLat + dLon * dLon;
          if (d2 < bestDist) {
            bestDist = d2;
            bestIdx = i;
          }
        }
        const pt = latlngs[bestIdx];
        hoverMarker.setLatLng(pt);
        hoverMarker.setStyle({ opacity: 1, fillOpacity: 1 });
        setHoverInfo({
          pct: Math.round((bestIdx / Math.max(1, latlngs.length - 1)) * 100),
          lat: pt[0],
          lon: pt[1],
        });
      });

      map.on("mouseout", () => {
        hoverMarker.setStyle({ opacity: 0, fillOpacity: 0 });
        setHoverInfo(null);
      });
    })();

    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
      if (instance) {
        instance.remove();
      }
      mapRef.current = null;
    };
  }, [latlngs, theme, interactive]);

  return (
    <div className="amap" style={{ height }} role="region" aria-label={label}>
      <div ref={mapElRef} className="amap-inner" />

      <div className="map-legend" aria-hidden="true">
        <span>
          <i className="dot start" /> Mulai
        </span>
        <span>
          <i className="dot end" /> Selesai
        </span>
        {hoverInfo ? (
          <span className="coord-pill">
            {hoverInfo.pct}% · {hoverInfo.lat.toFixed(5)}, {hoverInfo.lon.toFixed(5)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Miniatur jejak rute GPS untuk baris daftar aktivitas (`/activities`). */
export function RouteThumb({ coords }: { coords: [number, number][] }) {
  if (coords.length < 2) return null;
  const W = 54;
  const H = 34;
  const pad = 4;

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const spanLon = maxLon - minLon || 1e-5;
  const spanLat = maxLat - minLat || 1e-5;
  const scale = Math.min((W - pad * 2) / spanLon, (H - pad * 2) / spanLat);
  const ox = (W - spanLon * scale) / 2;
  const oy = (H - spanLat * scale) / 2;

  const pts = coords.map(([lon, lat]) => [
    ox + (lon - minLon) * scale,
    H - (oy + (lat - minLat) * scale),
  ] as [number, number]);

  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const start = pts[0];
  const end = pts[pts.length - 1];

  return (
    <span className="route-thumb" title="Jejak rute GPS tersedia" aria-hidden="true">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={start[0]} cy={start[1]} r="2" fill="var(--batt)" />
        <circle cx={end[0]} cy={end[1]} r="2" fill="var(--heart)" />
      </svg>
    </span>
  );
}
