"use client";

// components/charts/ElevationChart.tsx — profil elevasi / detak jantung sesi dengan hover angka real

import { useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { dur } from "@/lib/garmin/fmt";
import type { TrackPoint } from "@/lib/garmin/geo";

interface Props {
  track: TrackPoint[];
  kind: "elev" | "hr" | "speed";
  height?: number;
}

const CFG = {
  elev: { key: "elev" as const, color: "var(--batt)", unit: "m", label: "Elevasi" },
  hr: { key: "hr" as const, color: "var(--heart)", unit: "bpm", label: "Detak jantung" },
  speed: { key: "speed" as const, color: "var(--run)", unit: "m/s", label: "Kecepatan" },
};

export function ElevationChart({ track, kind, height = 110 }: Props) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const cfg = CFG[kind];
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const pts = track
    .map((p) => ({ t: p.t, v: p[cfg.key] }))
    .filter((p): p is { t: number; v: number } => typeof p.v === "number" && Number.isFinite(p.v));

  if (pts.length < 2) {
    return (
      <p className="empty">
        <b>Belum ada rekaman</b>
        <span>Data {cfg.label.toLowerCase()} tidak tersedia untuk sesi ini.</span>
      </p>
    );
  }

  const W = 300;
  const H = height;
  const pad = 5;

  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t || 1;
  const vMin = Math.min(...pts.map((p) => p.v));
  const vMax = Math.max(...pts.map((p) => p.v));
  const span = vMax - vMin || 1;

  const xs = (t: number) => pad + ((t - tMin) / (tMax - tMin || 1)) * (W - pad * 2);
  const ys = (v: number) => H - pad - ((v - vMin) / span) * (H - pad * 2);

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xs(p.t).toFixed(1)},${ys(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${xs(tMax).toFixed(1)},${H - pad} L${pad},${H - pad} Z`;

  const hoverPt = hoverIdx !== null ? pts[hoverIdx] : null;
  const hoverPct = hoverPt ? (xs(hoverPt.t) / W) * 100 : 50;
  const fmtVal = (v: number) =>
    kind === "elev" ? `${v.toFixed(1).replace(".", ",")} ${cfg.unit}` : `${Math.round(v)} ${cfg.unit}`;

  function handleMove(clientX: number, rect: DOMRect) {
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const idx = Math.round(rel * (pts.length - 1));
    setHoverIdx(idx);
  }

  return (
    <figure className="chart-fig" style={{ margin: 0 }} onMouseLeave={() => setHoverIdx(null)}>
      <div
        className="spark-wrap"
        onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => {
          if (e.touches[0]) handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
        }}
        onTouchEnd={() => setHoverIdx(null)}
      >
        {hoverPt ? (
          <div
            className="chart-tip"
            style={{
              left: `clamp(52px, ${hoverPct.toFixed(1)}%, calc(100% - 52px))`,
              top: 0,
            }}
            aria-hidden="true"
          >
            <b>{fmtVal(hoverPt.v)}</b>
            <span>Menit {dur(hoverPt.t) ?? "0:00"}</span>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${cfg.label}: ${Math.round(vMin)} sampai ${Math.round(vMax)} ${cfg.unit}`}
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`e${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cfg.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path
            d={area}
            fill={`url(#e${gid})`}
            className={reduce ? undefined : "spark-area"}
          />
          <path
            d={line}
            fill="none"
            stroke={cfg.color}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={reduce ? undefined : "spark-line"}
          />

          {hoverPt ? (
            <g>
              <line
                x1={xs(hoverPt.t)}
                y1={pad}
                x2={xs(hoverPt.t)}
                y2={H - pad}
                stroke="var(--faint)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={xs(hoverPt.t)}
                cy={ys(hoverPt.v)}
                r="5.5"
                fill={cfg.color}
                fillOpacity="0.2"
              />
              <circle
                cx={xs(hoverPt.t)}
                cy={ys(hoverPt.v)}
                r="3.5"
                fill={cfg.color}
                stroke="var(--surface)"
                strokeWidth="1.2"
              />
            </g>
          ) : null}
        </svg>
      </div>

      <figcaption className="readout" aria-live="polite">
        {hoverPt
          ? `Menit ${dur(hoverPt.t) ?? "0:00"} · ${fmtVal(hoverPt.v)} (rentang ${Math.round(vMin)}–${Math.round(vMax)} ${cfg.unit})`
          : `${Math.round(vMin)}–${Math.round(vMax)} ${cfg.unit} · arahkan kursor untuk angka real`}
      </figcaption>
    </figure>
  );
}
