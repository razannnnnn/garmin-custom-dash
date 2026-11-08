// lib/garmin/analytics.ts — deret waktu untuk halaman Analytics

import type { Garmin } from "garminconnect-js";
import {
  avgInt,
  dayLabel,
  daysAgo,
  dur,
  km,
  lastDays,
  num,
  paceFromSpeed,
  tanggalPendek,
  wallWhen,
} from "./fmt";
import type { AnalyticsData, DayValue, ZoneItem } from "./types";

type Any = Record<string, unknown>;

const pick = (o: unknown, ...path: string[]): unknown => {
  let cur: unknown = o;
  for (const p of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Any)[p];
  }
  return cur;
};

const n = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const pos = (v: unknown): number | null => {
  const x = n(v);
  return x !== null && x > 0 ? x : null;
};

const msg = (e: unknown) => (e instanceof Error ? e.message : "galat");

function series(dates: string[], get: (d: string) => number | null): DayValue[] {
  return dates.map((date) => ({ d: dayLabel(date), v: get(date), date }));
}

export async function fetchAnalytics(g: Garmin): Promise<AnalyticsData> {
  const warnings: string[] = [];
  const dates = lastDays(30);
  const start = daysAgo(29);
  const end = daysAgo(0);

  const [summaries, rhr, hrv, sleepDays, stressDays, maxMetrics, zones, rawActs] =
    await Promise.all([
      g.getDailySummaries(start, end).catch((e) => {
        warnings.push(`Ringkasan harian gagal (${msg(e)})`);
        return [] as Any[];
      }),
      g.getRhrDaily(start, end).catch(() => [] as Any[]),
      g.getHrvDataRange(start, end).catch(() => null),
      g.getSleepDaily(start, end).catch(() => [] as Any[]),
      g.getDailyStress(start, end).catch(() => [] as Any[]),
      g.getMaxMetrics(end).catch(() => null),
      g.getHeartRateZones().catch(() => null),
      g.getActivities(0, 50).catch((e) => {
        warnings.push(`Aktivitas gagal dimuat (${msg(e)})`);
        return [] as Any[];
      }),
    ]);

  const dayMap = new Map<string, Any>();
  for (const d of Array.isArray(summaries) ? summaries : []) {
    const date = String(d.calendarDate ?? "");
    if (date) dayMap.set(date, d);
  }

  const rhrMap = new Map<string, number>();
  for (const r of Array.isArray(rhr) ? rhr : []) {
    const date = String(r.calendarDate ?? "");
    const v = pos(r.value);
    if (date && v !== null) rhrMap.set(date, v);
  }

  const hrvMap = new Map<string, number>();
  const hrvList = Array.isArray(pick(hrv, "hrvSummaries"))
    ? (pick(hrv, "hrvSummaries") as Any[])
    : [];
  for (const h of hrvList) {
    const date = String(h.calendarDate ?? "");
    const v = pos(h.lastNightAvg) ?? pos(h.weeklyAvg);
    if (date && v !== null) hrvMap.set(date, v);
  }

  const sleepMap = new Map<string, Any>();
  for (const s of Array.isArray(sleepDays) ? sleepDays : []) {
    const date = String(s.calendarDate ?? "");
    if (date) sleepMap.set(date, s);
  }

  const stressMap = new Map<string, number>();
  for (const st of Array.isArray(stressDays) ? stressDays : []) {
    const date = String(st.calendarDate ?? "");
    const v = pos(pick(st, "values", "overallStressLevel")) ?? pos(st.overallStressLevel);
    if (date && v !== null) stressMap.set(date, v);
  }

  const restingHr = series(dates, (d) => {
    const fromDaily = pos(pick(dayMap.get(d), "heartRate", "restingValue"));
    const fromSleep = pos(pick(sleepMap.get(d), "values", "restingHeartRate"));
    return fromDaily ?? rhrMap.get(d) ?? fromSleep ?? null;
  });

  const hrvSeries = series(
    dates,
    (d) => hrvMap.get(d) ?? pos(pick(sleepMap.get(d), "values", "avgOvernightHrv")) ?? null
  );

  // `getSleepDaily` menempatkan metrik tidur di dalam objek `values`.
  const sleepDuration = series(dates, (d) => {
    const raw = sleepMap.get(d);
    const secs =
      pos(pick(raw, "values", "totalSleepTimeInSeconds")) ??
      pos(pick(raw, "sleepTimeSeconds")) ??
      pos(pick(raw, "dailySleepDTO", "sleepTimeSeconds")) ??
      pos(pick(dayMap.get(d), "sleepTimeSeconds"));
    return secs === null ? null : Math.round((secs / 3600) * 10) / 10;
  });

  const sleepScore = series(dates, (d) => {
    const raw = sleepMap.get(d);
    return (
      pos(pick(raw, "values", "sleepScore")) ??
      pos(pick(raw, "sleepScores", "overall", "value")) ??
      pos(pick(raw, "sleepScore")) ??
      null
    );
  });

  const stress = series(
    dates,
    (d) => pos(pick(dayMap.get(d), "stress", "avgLevel")) ?? stressMap.get(d) ?? null
  );

  // Body Battery harian: gunakan level puncak harian (`maxValue`), fallback `latestValue`.
  const bodyBattery = series(
    dates,
    (d) =>
      pos(pick(dayMap.get(d), "bodyBattery", "maxValue")) ??
      pos(pick(dayMap.get(d), "bodyBattery", "latestValue")) ??
      pos(pick(dayMap.get(d), "bodyBattery", "chargedValue"))
  );

  const load = series(dates, (d) => pos(pick(dayMap.get(d), "bodyBattery", "drainedValue")));

  const vo2Raw = Array.isArray(maxMetrics) ? maxMetrics[0] : maxMetrics;
  const vo2Latest =
    pos(pick(vo2Raw, "generic", "vo2MaxPreciseValue")) ??
    pos(pick(vo2Raw, "vo2MaxPreciseValue")) ??
    pos(pick(vo2Raw, "generic", "vo2MaxValue")) ??
    pos(pick(vo2Raw, "vo2MaxValue"));

  const allActs = (Array.isArray(rawActs) ? rawActs : []) as Any[];
  const acts30d = allActs.filter((a) => {
    const d = wallWhen(String(a.startTimeLocal ?? "")).date;
    return d >= start && d <= end;
  });
  const activities = acts30d.length > 0 ? acts30d : allActs.slice(0, 20);
  const chronological = activities.slice().reverse();

  const vo2ByDate = new Map<string, number>();
  for (const a of chronological) {
    const d = wallWhen(String(a.startTimeLocal ?? "")).date;
    const v = pos(a.vO2MaxValue);
    if (d && v !== null) vo2ByDate.set(d, v);
  }
  if (vo2Latest !== null) vo2ByDate.set(end, vo2Latest);

  const vo2max =
    vo2ByDate.size >= 2
      ? series(dates, (d) => vo2ByDate.get(d) ?? null)
      : series(dates, () => vo2Latest);

  const runs = chronological.filter((a) =>
    /run|walk|hik/i.test(String(pick(a, "activityType", "typeKey") ?? ""))
  );

  const paceSeries: DayValue[] = runs
    .map((a) => {
      const date = wallWhen(String(a.startTimeLocal ?? "")).date;
      const speed = pos(a.averageMovingSpeed) ?? pos(a.averageSpeed);
      const p = paceFromSpeed(speed);
      return {
        d: date ? tanggalPendek(date) : "—",
        v: p ? parsePace(p) : null,
        date,
      };
    })
    .filter((x) => x.v !== null);

  const cadence: DayValue[] = chronological
    .map((a) => {
      const date = wallWhen(String(a.startTimeLocal ?? "")).date;
      const cad =
        pos(a.averageRunningCadenceInStepsPerMinute) ??
        pos(a.averageRunCadence) ??
        pos(a.averageBikingCadenceInRevPerMinute);
      return {
        d: date ? tanggalPendek(date) : "—",
        v: cad !== null ? Math.round(cad) : null,
        date,
      };
    })
    .filter((x) => x.v !== null);

  const power: DayValue[] = chronological
    .map((a) => {
      const date = wallWhen(String(a.startTimeLocal ?? "")).date;
      const pw = pos(a.avgPower) ?? pos(a.averagePower) ?? pos(a.normPower) ?? pos(a.normalizedPower);
      return {
        d: date ? tanggalPendek(date) : "—",
        v: pw !== null ? Math.round(pw) : null,
        date,
      };
    })
    .filter((x) => x.v !== null);

  const zoneList = Array.isArray(zones) ? (zones as Any[]) : [];
  const defaultZone =
    zoneList.find((z) => String(z.sport ?? "") === "DEFAULT") ?? zoneList[0] ?? null;

  const zoneColors = ["#64A8B8", "#3AA794", "#93B83E", "#E39A2D", "#D65A5A"];
  const zoneItems: ZoneItem[] = defaultZone
    ? [1, 2, 3, 4, 5].map((i) => ({
        z: `Z${i}`,
        m: null,
        c: zoneColors[i - 1],
      }))
    : [];

  const totalDistMeters = activities.reduce((s, a) => s + (pos(a.distance) ?? 0), 0);
  const totalDurSecs = activities.reduce(
    (s, a) => s + (pos(a.duration) ?? pos(a.movingDuration) ?? pos(a.elapsedDuration) ?? 0),
    0
  );
  const totalElevMeters = activities.reduce((s, a) => s + (pos(a.elevationGain) ?? 0), 0);

  return {
    warnings,
    restingHr,
    hrv: hrvSeries,
    sleepDuration,
    sleepScore,
    stress,
    vo2max,
    load,
    paceSeries,
    cadence,
    power,
    bodyBattery,
    zones: zoneItems,
    totals: {
      distance: totalDistMeters > 0 ? km(totalDistMeters) : null,
      duration: dur(totalDurSecs),
      activities: activities.length,
      elevation: totalElevMeters > 0 ? num(Math.round(totalElevMeters)) : null,
      avgHr: avgInt(activities.map((a) => pos(a.averageHR))),
      avgCadence: avgInt(
        activities.map(
          (a) =>
            pos(a.averageRunningCadenceInStepsPerMinute) ??
            pos(a.averageRunCadence) ??
            pos(a.averageBikingCadenceInRevPerMinute)
        )
      ),
      avgPower: avgInt(
        activities.map(
          (a) => pos(a.avgPower) ?? pos(a.averagePower) ?? pos(a.normPower) ?? pos(a.normalizedPower)
        )
      ),
    },
  };
}

/** "5:12" → 312 detik (untuk skala grafik; lebih kecil = lebih cepat). */
function parsePace(text: string): number | null {
  const [m, s] = text.split(":").map(Number);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  return m * 60 + s;
}
