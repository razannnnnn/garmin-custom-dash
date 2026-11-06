"use client";

// components/charts/Sparkline.tsx — grafik garis SVG interaktif dengan hover tooltip angka real

import { useId, useState } from "react";
import { dayLabel, tanggalPendek } from "@/lib/garmin/fmt";
import type { DayValue } from "@/lib/garmin/types";

interface SparklineProps {
  data: DayValue[];
  colorVar?: string;
  suffix?: string;
  max?: number;
  zeroBased?: boolean;
  invert?: boolean;
  formatter?: (v: number) => string;
  height?: number;
}

function fullLabel(p: DayValue): string {
  if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    return `${dayLabel(p.date)}, ${tanggalPendek(p.date)}`;
  }
  return p.d;
}

export function Sparkline({
  data,
  colorVar = "var(--accent)",
  suffix = "",
  max,
  zeroBased = true,
  invert = false,
  formatter,
  height = 96,
}: SparklineProps) {
  const gid = useId().replace(/:/g, "");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = data.filter((d) => typeof d.v === "number") as (DayValue & { v: number })[];
  if (points.length < 2) {
    return (
      <p className="empty">
        <b>Data belum cukup</b>
        <span>Grafik muncul setelah ada minimal dua hari terukur.</span>
      </p>
    );
  }

  const W = 300;
  const H = height;
  const pad = 6;

  const values = points.map((p) => p.v);
  const rawMax = max ?? Math.max(...values);
  const rawMin = zeroBased ? 0 : Math.min(...values);
  const span = rawMax - rawMin || 1;

  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const ys = (v: number) => {
    const t = (v - rawMin) / span;
    return H - pad - (invert ? 1 - t : t) * (H - pad * 2);
  };

  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xs(points.length - 1).toFixed(1)},${H - pad} L${pad},${H - pad} Z`;

  const last = points[points.length - 1];
  const fmt = formatter ?? ((v: number) => `${Math.round(v)}${suffix}`);
  const lbl = (p: DayValue) =>
    p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? tanggalPendek(p.date) : p.d;

  const activeIdx = hoverIdx ?? points.length - 1;
  const activePt = points[activeIdx];
  const hoverPct = (xs(activeIdx) / W) * 100;

  function handleMove(clientX: number, rect: DOMRect) {
    const rel = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const idx = Math.round(rel * (points.length - 1));
    setHoverIdx(idx);
  }

  return (
    <figure
      className="chart-fig"
      style={{ margin: 0 }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <div
        className="spark-wrap"
        onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => {
          if (e.touches[0]) handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
        }}
        onTouchEnd={() => setHoverIdx(null)}
      >
        {hoverIdx !== null && activePt ? (
          <div
            className="chart-tip"
            style={{
              left: `clamp(52px, ${hoverPct.toFixed(1)}%, calc(100% - 52px))`,
              top: 0,
            }}
            aria-hidden="true"
          >
            <b>{fmt(activePt.v)}</b>
            <span>{fullLabel(activePt)}</span>
          </div>
        ) : null}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Grafik ${points.length} titik, terakhir ${fmt(last.v)}`}
          className="spark"
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorVar} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colorVar} stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={area} fill={`url(#g${gid})`} className="spark-area" />
          <path
            d={line}
            fill="none"
            stroke={colorVar}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="spark-line"
          />

          {hoverIdx !== null && activePt ? (
            <line
              x1={xs(activeIdx)}
              y1={pad}
              x2={xs(activeIdx)}
              y2={H - pad}
              stroke="var(--faint)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          ) : null}

          {activePt ? (
            <g>
              {hoverIdx !== null ? (
                <circle
                  cx={xs(activeIdx)}
                  cy={ys(activePt.v)}
                  r="6"
                  fill={colorVar}
                  fillOpacity="0.2"
                />
              ) : null}
              <circle
                cx={xs(activeIdx)}
                cy={ys(activePt.v)}
                r={hoverIdx !== null ? "3.8" : "3.2"}
                fill={colorVar}
                stroke="var(--surface)"
                strokeWidth="1.2"
              />
            </g>
          ) : null}
        </svg>
      </div>

      <figcaption className="readout" aria-live="polite">
        {hoverIdx !== null && activePt
          ? `${fullLabel(activePt)} · ${fmt(activePt.v)}`
          : points[0].date === last.date
            ? `${lbl(last)} · ${fmt(last.v)}`
            : `${lbl(points[0])}: ${fmt(points[0].v)} → ${lbl(last)}: ${fmt(last.v)}`}
      </figcaption>
    </figure>
  );
}
