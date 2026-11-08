"use client";

// components/charts/DayBars.tsx — grafik batang N hari dengan hover tooltip angka real

import { useState } from "react";
import { dayLabel, tanggalPendek } from "@/lib/garmin/fmt";
import type { DayValue } from "@/lib/garmin/types";

interface DayBarsProps {
  data: DayValue[];
  goal: number;
  goalLabel: string;
  colorVar?: string;
  height?: number;
  formatVal: (v: number | null) => string;
}

function fullDayLabel(d: DayValue): string {
  if (!d.date || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return d.d;
  return `${dayLabel(d.date)}, ${tanggalPendek(d.date)}`;
}

export function DayBars({
  data,
  goal,
  goalLabel,
  colorVar = "var(--accent)",
  height = 110,
  formatVal,
}: DayBarsProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="empty">Belum ada data.</p>;
  }

  let lastMeasuredIdx = data.length - 1;
  for (let i = data.length - 1; i >= 0; i -= 1) {
    if (data[i].v !== null) {
      lastMeasuredIdx = i;
      break;
    }
  }

  const peak = Math.max(goal, ...data.map((d) => d.v ?? 0), 1) * 1.08;
  const y = (value: number) => (value / peak) * height;

  const dense = data.length > 10;
  const step = dense ? Math.max(2, Math.ceil(data.length / 6)) : 1;
  const shouldShowTick = (i: number) =>
    !dense || i === 0 || i === data.length - 1 || (i % step === 0 && data.length - 1 - i >= 2);

  const activeIdx = hovered ?? picked ?? lastMeasuredIdx;
  const pickedDay = data[activeIdx] ?? null;
  const hoverDay = hovered !== null ? data[hovered] : null;
  const isTargetGoal = /^target/i.test(goalLabel);

  const colsStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))`,
    gap: dense ? 4 : 6,
  };

  const hoverLeftPct =
    hovered !== null ? ((hovered + 0.5) / Math.max(1, data.length)) * 100 : 50;

  return (
    <figure className="chart-fig" style={{ margin: 0 }} onMouseLeave={() => setHovered(null)}>
      <div className="week-plot" style={{ ...colsStyle, height }}>
        <div className="goal" style={{ bottom: y(goal) }} aria-hidden="true">
          <em>{goalLabel}</em>
        </div>

        {hoverDay ? (
          <div
            className="chart-tip"
            style={{
              left: `clamp(56px, ${hoverLeftPct.toFixed(1)}%, calc(100% - 56px))`,
              bottom: Math.min(height - 8, Math.max(20, (hoverDay.v ? y(hoverDay.v) : 6) + 8)),
            }}
            aria-hidden="true"
          >
            <b>{formatVal(hoverDay.v)}</b>
            <span>{fullDayLabel(hoverDay)}</span>
          </div>
        ) : null}

        {data.map((d, i) => {
          const isHighlighted = activeIdx === i;
          const barH = d.v === null ? 3 : Math.max(4, y(d.v));

          return (
            <div
              key={`${d.date}-${i}`}
              className={`col${isHighlighted ? " on" : ""}`}
              style={{ "--c": colorVar, "--delay": `${Math.min(i * 18, 360)}ms` } as React.CSSProperties}
              onMouseEnter={() => setHovered(i)}
            >
              <button
                type="button"
                className="bar-grow"
                style={{
                  height: barH,
                  background:
                    d.v === null
                      ? "var(--track)"
                      : isHighlighted
                        ? colorVar
                        : `color-mix(in srgb, ${colorVar} 34%, var(--track))`,
                }}
                aria-label={`${fullDayLabel(d)}: ${formatVal(d.v)}`}
                aria-pressed={picked === i}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                onClick={() => setPicked(picked === i ? null : i)}
              />
            </div>
          );
        })}
      </div>

      <div className="week-axis" style={colsStyle} aria-hidden="true">
        {data.map((d, i) => {
          const show = shouldShowTick(i);
          const isHighlighted = activeIdx === i;
          const text = dense && d.date ? tanggalPendek(d.date) : d.d;
          return (
            <span key={`lbl-${d.date}-${i}`} className={isHighlighted ? "on" : undefined}>
              {show ? text : ""}
            </span>
          );
        })}
      </div>

      <figcaption className="readout" aria-live="polite">
        {pickedDay
          ? `${fullDayLabel(pickedDay)} · ${formatVal(pickedDay.v)}${
              isTargetGoal && pickedDay.v !== null && goal > 0
                ? ` — ${Math.round((pickedDay.v / goal) * 100)}% dari target`
                : ""
            }`
          : "Arahkan kursor atau ketuk batang untuk melihat detail hari."}
      </figcaption>
    </figure>
  );
}
