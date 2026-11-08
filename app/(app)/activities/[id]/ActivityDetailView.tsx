"use client";

// app/(app)/activities/[id]/ActivityDetailView.tsx — detail sesi gaya Strava

import { useReducedMotion } from "framer-motion";
import { ActivityMap } from "@/components/map/ActivityMap";
import { ElevationChart } from "@/components/charts/ElevationChart";
import { Rise, Stagger } from "@/components/ui/Motion";
import { Icon } from "@/components/ui/Icon";
import type { ActivityDetail } from "@/lib/garmin/types";

export function ActivityDetailView({ data }: { data: ActivityDetail }) {
  const reduce = useReducedMotion();
  const hasGeo = Array.isArray(data.geo) && data.geo.length >= 2;
  const hasTrack = data.track.length > 1;

  const stats: { l: string; v: string | null; u?: string }[] = [
    { l: "Jarak", v: data.dist, u: "km" },
    { l: "Durasi", v: data.dur },
    { l: "Pace rata-rata", v: data.pace, u: "/km" },
    { l: "HR rata-rata", v: data.hr, u: "bpm" },
    { l: "HR maks", v: data.maxHr, u: "bpm" },
    { l: "Elevasi", v: data.elev, u: "m" },
    { l: "Kalori", v: data.cal, u: "kkal" },
    { l: "Cadence", v: data.cad, u: "spm" },
    { l: "Power", v: data.power, u: "W" },
  ].filter((s) => s.v !== null);

  return (
    <>
      <div className="vhead">
        <h2>{data.t}</h2>
        <p>
          {data.when} · {data.tag}
          {data.location ? ` · ${data.location}` : ""}
          {data.startedAt ? ` · mulai ${data.startedAt}` : ""}
        </p>
      </div>

      {data.desc ? <p className="actdesc">{data.desc}</p> : null}

      <Stagger className="statgrid" step={0.045}>
        {stats.map((s) => (
          <Rise key={s.l}>
            <div className="statcell">
              <span>{s.l}</span>
              <b>
                {s.v}
                {s.u ? <i>{s.u}</i> : null}
              </b>
            </div>
          </Rise>
        ))}
      </Stagger>

      {hasGeo ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Rute GPS / GPX</h2>
            <span className="mono">{data.geo?.length ?? 0} titik</span>
            <a
              className="seclink"
              href={`/api/garmin/gpx/${data.id}`}
              download={`activity-${data.id}.gpx`}
            >
              Unduh GPX
            </a>
          </div>
          <ActivityMap
            coords={data.geo as [number, number][]}
            label={`Peta rute ${data.t}`}
            height={320}
            interactive
          />
        </Rise>
      ) : (
        <p className="empty">
          <b>Tanpa rute GPS</b>
          <span>Aktivitas ini tidak merekam jejak lokasi (mis. latihan dalam ruangan).</span>
        </p>
      )}

      {hasTrack ? (
        <div className="cols">
          <Rise as="section" className="sec">
            <div className="sec-h">
              <h2>Elevasi</h2>
              <span>{data.elev ? `+${data.elev} m` : ""}</span>
            </div>
            <ElevationChart track={data.track} kind="elev" />
          </Rise>
          <Rise as="section" className="sec">
            <div className="sec-h">
              <h2>Detak jantung</h2>
              <span>{data.hr ? `rata-rata ${data.hr} bpm` : ""}</span>
            </div>
            <ElevationChart track={data.track} kind="hr" />
          </Rise>
        </div>
      ) : null}

      {data.splits.length > 0 ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Split per kilometer</h2>
            <span>{data.splits.length} split</span>
          </div>
          <div className="splitwrap">
            <table className="splits">
              <thead>
                <tr>
                  <th scope="col">Km</th>
                  <th scope="col">Pace</th>
                  <th scope="col">HR</th>
                  <th scope="col">Elevasi</th>
                  <th scope="col">Cadence</th>
                </tr>
              </thead>
              <tbody>
                {data.splits.map((s) => (
                  <tr key={s.n}>
                    <td>
                      <b>{s.n}</b>
                      <em>{s.dist}</em>
                    </td>
                    <td className="strong">{s.pace}</td>
                    <td>{s.hr ?? "—"}</td>
                    <td>{s.elev ?? "—"}</td>
                    <td>{s.cad ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Rise>
      ) : null}

      {data.bestSplits.length > 0 ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Upaya terbaik</h2>
          </div>
          <div className="bestgrid">
            {data.bestSplits.map((b) => (
              <div key={b.label} className="bestcell">
                <span>{b.label}</span>
                <b>{b.value}</b>
              </div>
            ))}
          </div>
        </Rise>
      ) : null}

      {data.zones.some((z) => z.m !== null) ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Zona detak jantung</h2>
          </div>
          <div className="zone">
            {data.zones.map((z) => (
              <div key={z.z} className="zone-row" style={{ "--c": z.c } as React.CSSProperties}>
                <b>{z.z}</b>
                <div className="bar" aria-hidden="true">
                  <i
                    style={{
                      width: `${Math.min(100, ((z.m ?? 0) / Math.max(1e-6, Math.max(...data.zones.map((x) => x.m ?? 0)))) * 100)}%`,
                    }}
                  />
                </div>
                <em>{z.m === null ? "—" : `${z.m} mnt`}</em>
              </div>
            ))}
          </div>
        </Rise>
      ) : null}

      {data.trainingEffect || data.anaerobEffect ? (
        <Rise as="section" className="sec">
          <div className="sec-h">
            <h2>Efek latihan</h2>
          </div>
          <div className="bestgrid">
            {data.trainingEffect ? (
              <div className="bestcell">
                <span>Aerobik</span>
                <b>{data.trainingEffect}</b>
              </div>
            ) : null}
            {data.anaerobEffect ? (
              <div className="bestcell">
                <span>Anaerobik</span>
                <b>{data.anaerobEffect}</b>
              </div>
            ) : null}
          </div>
        </Rise>
      ) : null}

      {reduce ? null : <span className="sr-only">Detail aktivitas selesai dimuat.</span>}

      <div className="actfoot">
        <Icon name={data.i} size={14} />
        <span>{data.tag}</span>
      </div>
    </>
  );
}
