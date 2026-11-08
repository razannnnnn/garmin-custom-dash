"use client";

// app/(app)/analytics/AnalyticsView.tsx — tren & grafik per kelompok

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DayBars } from "@/components/charts/DayBars";
import { Sparkline } from "@/components/charts/Sparkline";
import { Rise, Stagger } from "@/components/ui/Motion";
import { num } from "@/lib/garmin/fmt";
import type { AnalyticsData, DayValue } from "@/lib/garmin/types";

const EASE = [0.22, 0.8, 0.32, 1] as const;

type GroupKey = "jantung" | "tidur" | "lari" | "daya" | "beban" | "stres";

const GROUPS: { key: GroupKey; label: string; note: string }[] = [
  { key: "jantung", label: "Jantung", note: "Detak istirahat & HRV" },
  { key: "tidur", label: "Tidur", note: "Durasi & skor" },
  { key: "lari", label: "Lari", note: "Pace & cadence" },
  { key: "daya", label: "Daya", note: "Power & Body Battery" },
  { key: "beban", label: "Beban", note: "VO₂ Max & pemulihan" },
  { key: "stres", label: "Stres", note: "Level harian" },
];

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const reduce = useReducedMotion();
  const [group, setGroup] = useState<GroupKey>("jantung");

  useEffect(() => {
    const h = window.location.hash.replace("#", "") as GroupKey;
    if (GROUPS.some((g) => g.key === h)) setGroup(h);
  }, []);

  const avg = (arr: DayValue[]) => {
    const nums = arr.map((d) => d.v).filter((v): v is number => typeof v === "number");
    return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0) / nums.length;
  };

  const lastVal = (arr: DayValue[]) => {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (typeof arr[i].v === "number") return arr[i].v;
    }
    return null;
  };

  return (
    <>
      {data.warnings.length > 0 ? (
        <div className="srcbar" role="status">
          <span aria-hidden="true">!</span>
          <span>{data.warnings.slice(0, 2).join(" · ")}</span>
        </div>
      ) : null}

      <div className="vhead">
        <h2>Analytics</h2>
        <p>Tren 30 hari terakhir dari data Garmin Anda.</p>
      </div>

      {/* Ringkasan 30 hari */}
      <Rise as="section" className="sec">
        <div className="sec-h">
          <h2>Ringkasan 30 hari</h2>
          <span>{data.totals.activities} aktivitas</span>
        </div>
        <div className="sumgrid">
          <SumCell label="Jarak" value={data.totals.distance} unit="km" />
          <SumCell label="Durasi" value={data.totals.duration} unit="" />
          <SumCell label="Elevasi" value={data.totals.elevation} unit="m" />
          <SumCell label="HR rata-rata" value={data.totals.avgHr} unit="bpm" />
          <SumCell label="Cadence" value={data.totals.avgCadence} unit="spm" />
          <SumCell label="Power" value={data.totals.avgPower} unit="W" />
        </div>
      </Rise>

      {/* Pemilih kelompok */}
      <div className="tabs" role="tablist" aria-label="Kelompok data">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            className={group === g.key ? "on" : undefined}
            onClick={() => setGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <motion.div
        key={group}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        {group === "jantung" ? (
          <Stagger className="cols" step={0.07}>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Detak istirahat</h2>
                <span>rerata {num(avg(data.restingHr)) ?? "—"} bpm</span>
              </div>
              <Sparkline data={data.restingHr} colorVar="var(--heart)" suffix=" bpm" zeroBased={false} />
            </Rise>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>HRV semalam</h2>
                <span>rerata {num(avg(data.hrv)) ?? "—"} ms</span>
              </div>
              <Sparkline data={data.hrv} colorVar="var(--accent)" suffix=" ms" />
            </Rise>
          </Stagger>
        ) : null}

        {group === "tidur" ? (
          <Stagger className="cols" step={0.07}>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Durasi tidur</h2>
                <span>rerata {num(avg(data.sleepDuration), 1) ?? "—"} jam</span>
              </div>
              <DayBars
                data={data.sleepDuration}
                goal={8}
                goalLabel="target 8 jam"
                colorVar="var(--sleep)"
                formatVal={(v) => (v === null ? "belum ada data" : `${num(v, 1) ?? v} jam`)}
              />
            </Rise>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Skor tidur</h2>
                <span>rerata {num(avg(data.sleepScore)) ?? "—"} / 100</span>
              </div>
              <Sparkline data={data.sleepScore} colorVar="var(--sleep)" suffix=" / 100" max={100} />
            </Rise>
          </Stagger>
        ) : null}

        {group === "lari" ? (
          <Stagger className="cols" step={0.07}>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Pace per sesi</h2>
                <span>{data.paceSeries.length} sesi</span>
              </div>
              {data.paceSeries.length === 0 ? (
                <p className="empty">
                  <b>Belum ada sesi lari</b>
                  <span>Pace muncul setelah ada aktivitas lari dengan GPS.</span>
                </p>
              ) : (
                <Sparkline
                  data={data.paceSeries}
                  colorVar="var(--run)"
                  suffix=""
                  zeroBased={false}
                  invert
                  formatter={secToPace}
                />
              )}
            </Rise>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Cadence</h2>
                <span>rerata {num(avg(data.cadence)) ?? "—"} spm</span>
              </div>
              <DayBars
                data={data.cadence}
                goal={180}
                goalLabel="acuan 180"
                colorVar="var(--run)"
                formatVal={(v) => (v === null ? "belum ada data" : `${v} spm`)}
              />
            </Rise>
          </Stagger>
        ) : null}

        {group === "daya" ? (
          <Stagger className="cols" step={0.07}>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Power rata-rata</h2>
                <span>rerata {num(avg(data.power)) ?? "—"} W</span>
              </div>
              <DayBars
                data={data.power}
                goal={250}
                goalLabel="acuan 250 W"
                colorVar="var(--accent)"
                formatVal={(v) => (v === null ? "belum ada data" : `${v} W`)}
              />
            </Rise>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Body Battery harian</h2>
                <span>rerata puncak {num(avg(data.bodyBattery)) ?? "—"}%</span>
              </div>
              <Sparkline data={data.bodyBattery} colorVar="var(--batt)" suffix="%" max={100} />
            </Rise>
          </Stagger>
        ) : null}

        {group === "beban" ? (
          <Stagger className="cols" step={0.07}>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>VO₂ Max</h2>
                <span>terakhir {num(lastVal(data.vo2max), 1) ?? "—"} ml/kg</span>
              </div>
              <Sparkline
                data={data.vo2max}
                colorVar="var(--accent)"
                suffix=" ml/kg"
                zeroBased={false}
                formatter={(v) => `${num(v, 1) ?? v} ml/kg`}
              />
            </Rise>
            <Rise as="section" className="sec">
              <div className="sec-h">
                <h2>Body Battery terkuras</h2>
                <span>rerata {num(avg(data.load)) ?? "—"} poin</span>
              </div>
              <Sparkline data={data.load} colorVar="var(--stress)" suffix=" poin" />
            </Rise>
          </Stagger>
        ) : null}

        {group === "stres" ? (
          <Rise as="section" className="sec">
            <div className="sec-h">
              <h2>Level stres harian</h2>
              <span>rerata {num(avg(data.stress)) ?? "—"} / 100</span>
            </div>
            <DayBars
              data={data.stress}
              goal={50}
              goalLabel="ambang 50"
              colorVar="var(--stress)"
              formatVal={(v) => (v === null ? "belum terukur" : `${v} dari 100`)}
            />
          </Rise>
        ) : null}
      </motion.div>
    </>
  );
}

function SumCell({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div className="sumcell">
      <span>{label}</span>
      <b>
        {value ?? "—"}
        {value && unit ? <i>{unit}</i> : null}
      </b>
    </div>
  );
}

function secToPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
