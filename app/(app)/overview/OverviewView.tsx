"use client";

// app/(app)/overview/OverviewView.tsx — tampilan Overview

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import { CountUp, GrowBar, Rise, Stagger } from "@/components/ui/Motion";
import { DayBars } from "@/components/charts/DayBars";
import { Icon } from "@/components/ui/Icon";
import { num, tanggal, jakartaHour, salam } from "@/lib/garmin/fmt";
import type { Overview } from "@/lib/garmin/types";

const EASE = [0.22, 0.8, 0.32, 1] as const;

export function OverviewView({ data }: { data: Overview }) {
  const reduce = useReducedMotion();
  const [greet, setGreet] = useState<{ h: string; d: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setGreet({ h: salam(data.user, jakartaHour(now)), d: tanggal(now) });
  }, [data.user]);

  const score = data.readiness.score;

  return (
    <>
      {data.warnings.length > 0 ? (
        <div className="srcbar" role="status">
          <span aria-hidden="true">!</span>
          <span>{data.warnings.slice(0, 2).join(" · ")}</span>
        </div>
      ) : null}

      <div className="greet">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {greet?.h ?? ""}
        </motion.h1>
        <motion.p
          className="dateline"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
        >
          {greet?.d ?? ""}
        </motion.p>
      </div>

      {/* Kesiapan resmi Garmin */}
      <Stagger className="hero" step={0.08} delay={0.08}>
        <Rise>
          <div className="ready">
            <div className="ready-score">
              <span className="big">
                {score === null ? "—" : <CountUp value={score} />}
              </span>
              <span className="unit" style={{ marginLeft: 0 }}>
                {score === null ? "belum ada skor" : "dari 100"}
              </span>
              <div className="ready-scale" aria-hidden="true">
                <GrowBar pct={(score ?? 0) / 100} delay={0.05} />
              </div>
            </div>

            <div className="ready-txt">
              <h2>
                {data.readiness.label ??
                  (data.readinessSupported ? "Kesiapan belum tersedia" : "Training Readiness tidak aktif")}
              </h2>
              <p>
                {data.readiness.note ||
                  (data.readinessSupported
                    ? "Garmin belum mengirim skor kesiapan untuk hari ini."
                    : "Perangkat Anda belum mengirim Training Readiness. Metrik yang tetap terukur hari ini ada di bawah.")}
              </p>

              {data.readiness.parts.length > 0 ? (
                <ul className="ready-alt">
                  {data.readiness.parts.map((p) => (
                    <li key={p.l}>
                      <span>{p.l}</span>
                      <b>{p.v}</b>
                      {p.p !== null ? (
                        <div className="ready-mini" aria-hidden="true">
                          <GrowBar pct={p.p} delay={0.12} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {data.trainingStatus?.label ? (
                <p className="statusline">
                  <TrendingUp size={13} aria-hidden="true" />
                  Status latihan: <b>{data.trainingStatus.label}</b>
                </p>
              ) : null}
            </div>
          </div>
        </Rise>

        <Rise>
          <div className="ledger">
            {data.snap.map((row, i) => (
              <motion.div
                key={row.l}
                className="srow"
                style={{ "--c": `var(--${row.c})` } as React.CSSProperties}
                initial={reduce ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.36, ease: EASE, delay: 0.1 + i * 0.07 }}
              >
                <span className="srow-ic" aria-hidden="true">
                  <Icon name={row.i} size={16} />
                </span>
                <span className="srow-l">{row.l}</span>
                <span className="srow-v">
                  {row.v}
                  {row.u ? <span className="unit">{row.u}</span> : null}
                </span>
                {typeof row.p === "number" ? (
                  <div className="bar srow-bar" aria-hidden="true">
                    <GrowBar pct={row.p} delay={0.2 + i * 0.07} />
                  </div>
                ) : null}
                {row.d ? <span className="srow-note">{row.d}</span> : null}
              </motion.div>
            ))}
          </div>
        </Rise>
      </Stagger>

      {/* Enam metrik */}
      <Rise as="section" className="sec">
        <div className="sec-h">
          <h2>Hari ini</h2>
        </div>
        <div className="rail">
          {data.stats.map((s, i) => (
            <motion.div
              key={s.l}
              className="stat"
              style={{ "--c": `var(--${s.c})` } as React.CSSProperties}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: EASE, delay: 0.06 + i * 0.05 }}
            >
              <span className="stat-ic" aria-hidden="true">
                <Icon name={s.i} size={15} />
              </span>
              <span className="lbl">{s.l}</span>
              <span className="stat-num">
                {s.v}
                {s.u ? <span className="unit">{s.u}</span> : null}
              </span>
              {typeof s.p === "number" ? (
                <div
                  className="bar"
                  role="progressbar"
                  aria-valuenow={Math.round(Math.min(1, Math.max(0, s.p)) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${s.l}: ${Math.round(s.p * 100)} persen`}
                >
                  <GrowBar pct={s.p} delay={0.18 + i * 0.05} />
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
      </Rise>

      {/* Tidur semalam */}
      <Rise as="section" className="sec">
        <div className="sec-h">
          <h2>Tidur semalam</h2>
          {data.sleep.score !== null ? <span>skor {data.sleep.score}</span> : null}
        </div>
        <SleepCard sleep={data.sleep} />
      </Rise>

      {/* Grafik */}
      <div className="cols">
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Langkah 7 hari</h2>
            <span>target {(num(data.goal) ?? "—")}</span>
          </div>
          <DayBars
            data={data.steps}
            goal={data.goal}
            goalLabel={`target ${(num(data.goal) ?? "—")}`}
            formatVal={(v) => (v === null ? "belum ada data" : `${(num(v) ?? "—")} langkah`)}
          />
        </Rise>

        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Stres 7 hari</h2>
            <span>ambang 50</span>
          </div>
          <DayBars
            data={data.stress}
            goal={50}
            goalLabel="ambang 50"
            colorVar="var(--stress)"
            formatVal={(v) => (v === null ? "belum terukur" : `${v} dari 100`)}
          />
        </Rise>
      </div>

      {/* Aktivitas terakhir */}
      {data.recent.length > 0 ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Aktivitas terakhir</h2>
            <Link className="seclink" href="/activities">
              Semua <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="alist">
            {data.recent.map((a) => (
              <Link key={a.id} className="actrow" href={`/activities/${a.id}`}>
                <span className="actrow-ic" aria-hidden="true">
                  <Icon name={a.i} size={15} />
                </span>
                <span className="actrow-main">
                  <b>{a.t}</b>
                  <span className="actrow-sub">
                    <span>{a.when}</span>
                    <span>{a.tag}</span>
                  </span>
                </span>
                <span className="actrow-metrics">
                  {a.dist ? <span>{a.dist} km</span> : null}
                  {a.pace ? <span>{a.pace}/km</span> : null}
                  {a.dur ? <span>{a.dur}</span> : null}
                </span>
              </Link>
            ))}
          </div>
        </Rise>
      ) : null}
    </>
  );
}

function SleepCard({ sleep }: { sleep: Overview["sleep"] }) {
  const total = sleep.stages.reduce((a, s) => a + s.m, 0);

  if (total === 0) {
    return (
      <p className="empty">
        <b>Belum ada data tidur</b>
        <span>Garmin belum mengirim rekaman tidur semalam.</span>
      </p>
    );
  }

  return (
    <div className="sleepcard">
      <div className="sleephead">
        <span className="big">{sleep.score ?? "—"}</span>
        <span>
          skor tidur
          {sleep.total ? ` · total ${sleep.total}` : ""}
        </span>
      </div>

      {sleep.note ? <p className="sleepnote">{sleep.note}</p> : null}

      <div className="stages" aria-hidden="true">
        {sleep.stages.map((s) => (
          <i
            key={s.n}
            style={{ background: `var(--${s.c})`, width: `${(s.m / total) * 100}%` }}
          />
        ))}
      </div>

      <dl className="dl">
        {sleep.stages.map((s) => (
          <div key={s.n}>
            <dt>
              <i style={{ background: `var(--${s.c})` }} aria-hidden="true" />
              {s.n}
            </dt>
            <dd>
              {Math.floor(s.m / 60)}j {String(s.m % 60).padStart(2, "0")}m
            </dd>
          </div>
        ))}
        <div>
          <dt>Mulai tidur</dt>
          <dd>{sleep.bed ?? "—"}</dd>
        </div>
        <div>
          <dt>Bangun</dt>
          <dd>{sleep.wake ?? "—"}</dd>
        </div>
        <div>
          <dt>Efisiensi</dt>
          <dd>{sleep.eff ?? "—"}</dd>
        </div>
        <div>
          <dt>Stres saat tidur</dt>
          <dd>{sleep.stress === null ? "—" : `${sleep.stress} / 100`}</dd>
        </div>
      </dl>
    </div>
  );
}
