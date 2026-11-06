"use client";

// app/(app)/activities/ActivitiesView.tsx — daftar aktivitas + filter tipe

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Download, MapPin } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { ActivityMap, RouteThumb } from "@/components/map/ActivityMap";
import type { ActivityList } from "@/lib/garmin/types";

const EASE = [0.22, 0.8, 0.32, 1] as const;

export function ActivitiesView({ data }: { data: ActivityList }) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<string>("all");
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const rows = useMemo(
    () => (filter === "all" ? data.rows : data.rows.filter((r) => r.typeKey === filter)),
    [data.rows, filter]
  );

  const gpsRows = useMemo(
    () => rows.filter((r) => Array.isArray(r.geo) && r.geo.length >= 2),
    [rows]
  );

  const activeMapRow = useMemo(
    () => gpsRows.find((r) => r.id === selectedMapId) ?? gpsRows[0] ?? null,
    [gpsRows, selectedMapId]
  );

  return (
    <>
      {data.warnings.length > 0 ? (
        <div className="srcbar" role="status">
          <span aria-hidden="true">!</span>
          <span>{data.warnings.slice(0, 2).join(" · ")}</span>
        </div>
      ) : null}

      <div className="vhead">
        <h2>Aktivitas</h2>
        <p>{data.rows.length} sesi terakhir dari Garmin Connect.</p>
      </div>

      {data.types.length > 1 ? (
        <div className="tabs" role="tablist" aria-label="Filter tipe aktivitas">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={filter === "all" ? "on" : undefined}
            onClick={() => setFilter("all")}
          >
            Semua
          </button>
          {data.types.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              className={filter === t.key ? "on" : undefined}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <em>{t.count}</em>
            </button>
          ))}
        </div>
      ) : null}

      {activeMapRow && activeMapRow.geo ? (
        <section className="sec">
          <div className="sec-h">
            <h2>
              <MapPin size={14} style={{ display: "inline", verticalAlign: "-2px", marginRight: 5 }} />
              Peta Rute — {activeMapRow.t}
            </h2>
            <span className="mono">{activeMapRow.when}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
              <a
                className="seclink"
                href={`/api/garmin/gpx/${activeMapRow.id}`}
                download={`activity-${activeMapRow.id}.gpx`}
              >
                <Download size={12} /> Unduh GPX
              </a>
              <Link className="seclink" href={`/activities/${activeMapRow.id}`}>
                Detail sesi →
              </Link>
            </div>
          </div>

          <ActivityMap
            coords={activeMapRow.geo}
            label={`Peta rute ${activeMapRow.t}`}
            height={260}
            interactive
          />

          {gpsRows.length > 1 ? (
            <div className="tabs" style={{ marginTop: 10 }} aria-label="Pilih aktivitas ber-GPS">
              {gpsRows.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={g.id === activeMapRow.id ? "on" : undefined}
                  onClick={() => setSelectedMapId(g.id)}
                >
                  {g.t} <em>{g.when} · {g.dist ? `${g.dist} km` : ""}</em>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {rows.length === 0 ? (
        <p className="empty">
          <b>Belum ada aktivitas</b>
          <span>Sinkronkan perangkat Garmin, lalu muat ulang halaman ini.</span>
        </p>
      ) : (
        <motion.div
          className="alist"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {rows.map((a) => (
            <Link key={a.id} className="actrow big" href={`/activities/${a.id}`}>
              <span className="actrow-ic" aria-hidden="true">
                <Icon name={a.i} size={16} />
              </span>

              <span className="actrow-main">
                <b>{a.t}</b>
                <span className="actrow-sub">
                  <span>{a.when}</span>
                  <span>{a.tag}</span>
                  {a.location ? <span>{a.location}</span> : null}
                </span>
              </span>

              {a.geo && a.geo.length >= 2 ? <RouteThumb coords={a.geo} /> : null}

              <span className="actrow-metrics">
                {a.dist ? <span>{a.dist} km</span> : null}
                {a.pace ? <span>{a.pace}/km</span> : null}
                {a.dur ? <span>{a.dur}</span> : null}
                {a.hr ? <span>{a.hr} bpm</span> : null}
                {a.elev ? <span>+{a.elev} m</span> : null}
              </span>

              <ChevronRight size={15} className="actrow-go" aria-hidden="true" />
            </Link>
          ))}
        </motion.div>
      )}
    </>
  );
}
