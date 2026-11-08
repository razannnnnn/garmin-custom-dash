// lib/garmin/activities.ts — daftar & detail aktivitas

import type { Garmin } from "garminconnect-js";
import { MAX_GEO_POINTS, downsample, parseGpxCoords, parseGpxTrack, toCoords, toTrack } from "./geo";
import type { Coord } from "./geo";
import {
  clock,
  dur,
  km,
  orDash,
  paceFromSpeed,
  wallWhen,
} from "./fmt";
import type { ActivityDetail, ActivityList, ActivityRow, ColorToken, SplitRow, ZoneItem } from "./types";

type Raw = Record<string, unknown> & {
  activityId?: number;
  activityName?: string;
  startTimeLocal?: string;
  distance?: number;
  duration?: number;
  movingDuration?: number;
  elapsedDuration?: number;
  averageHR?: number;
  maxHR?: number;
  calories?: number;
  averageSpeed?: number;
  averageMovingSpeed?: number;
  maxSpeed?: number;
  elevationGain?: number;
  maxElevation?: number;
  locationName?: string;
  description?: string;
  startLatitude?: number;
  startLongitude?: number;
  averageRunningCadenceInStepsPerMinute?: number;
  averageRunCadence?: number;
  averageBikingCadenceInRevPerMinute?: number;
  avgPower?: number;
  averagePower?: number;
  normPower?: number;
  normalizedPower?: number;
  aerobicTrainingEffect?: number;
  anaerobicTrainingEffect?: number;
  trainingEffect?: number;
  activityType?: { typeKey?: string; typeId?: number };
  hrTimeInZone_1?: number;
  hrTimeInZone_2?: number;
  hrTimeInZone_3?: number;
  hrTimeInZone_4?: number;
  hrTimeInZone_5?: number;
};

const TYPE_MAP: { match: string[]; icon: string; tag: string; c: ColorToken }[] = [
  { match: ["hik", "trail", "mountaineer"], icon: "mountain", tag: "Hiking", c: "batt" },
  { match: ["walk"], icon: "footprints", tag: "Jalan", c: "accent" },
  { match: ["strength", "gym", "fitness_equipment"], icon: "zap", tag: "Kekuatan", c: "heart" },
  { match: ["cycl", "bike"], icon: "bike", tag: "Sepeda", c: "run" },
  { match: ["swim"], icon: "waves", tag: "Renang", c: "run" },
  { match: ["run"], icon: "route", tag: "Lari", c: "run" },
];

function mapType(key: string | undefined) {
  const k = (key ?? "").toLowerCase();
  return (
    TYPE_MAP.find((t) => t.match.some((m) => k.includes(m))) ?? {
      icon: "activity",
      tag: "Aktivitas",
      c: "accent" as ColorToken,
    }
  );
}

export function toRow(a: Raw): ActivityRow {
  const typeKey = a.activityType?.typeKey ?? "";
  const type = mapType(typeKey);
  const when = wallWhen(a.startTimeLocal);
  const isRun = /run|walk|hik/i.test(typeKey);
  // `averageMovingSpeed` lebih jujur daripada averageSpeed untuk pace lari.
  const speed = a.averageMovingSpeed ?? a.averageSpeed;

  return {
    id: String(a.activityId ?? ""),
    i: type.icon,
    c: type.c,
    t: a.activityName?.trim() || type.tag,
    when: when.label,
    date: when.date,
    tag: type.tag,
    typeKey: typeKey || "other",
    dist: km(a.distance),
    pace: isRun ? paceFromSpeed(speed) : null,
    dur: dur(a.duration ?? a.movingDuration ?? a.elapsedDuration),
    hr: a.averageHR ? `${Math.round(a.averageHR)}` : null,
    elev: a.elevationGain ? `${Math.round(a.elevationGain)}` : null,
    cal: a.calories ? `${Math.round(a.calories)}` : null,
    // `averageRunCadence`/`averageRunningCadenceInStepsPerMinute` sudah total
    // langkah per menit; mengalikannya dua menghasilkan 300+ spm.
    cad: a.averageRunningCadenceInStepsPerMinute
      ? `${Math.round(a.averageRunningCadenceInStepsPerMinute)}`
      : a.averageRunCadence
        ? `${Math.round(a.averageRunCadence)}`
        : a.averageBikingCadenceInRevPerMinute
          ? `${Math.round(a.averageBikingCadenceInRevPerMinute)}`
          : null,
    power: a.avgPower
      ? `${Math.round(a.avgPower)}`
      : a.averagePower
        ? `${Math.round(a.averagePower)}`
        : a.normPower
          ? `${Math.round(a.normPower)}`
          : a.normalizedPower
            ? `${Math.round(a.normalizedPower)}`
            : null,
    geo: null,
  };
}

const ZONE_COLORS = ["#64A8B8", "#3AA794", "#93B83E", "#E39A2D", "#D65A5A"];

function zonesFrom(a: Raw): ZoneItem[] {
  const mins = [
    a.hrTimeInZone_1,
    a.hrTimeInZone_2,
    a.hrTimeInZone_3,
    a.hrTimeInZone_4,
    a.hrTimeInZone_5,
  ];
  const total = mins.reduce<number>((s, v) => s + (v ?? 0), 0);
  return ZONE_COLORS.map((c, i) => ({
    z: `Z${i + 1}`,
    m: total > 0 ? Math.round((mins[i] ?? 0) / 60) : null,
    c,
  }));
}

export async function fetchActivityList(
  g: Garmin,
  opts: { start?: number; limit?: number } = {}
): Promise<ActivityList> {
  const warnings: string[] = [];
  let raw: Raw[] = [];

  try {
    raw = ((await g.getActivities(opts.start ?? 0, opts.limit ?? 50)) ?? []) as Raw[];
  } catch (err) {
    warnings.push(`Daftar aktivitas gagal dimuat (${err instanceof Error ? err.message : "galat"})`);
  }

  const validRaw = raw.filter((a) => a?.activityId);
  const rows = validRaw.map(toRow);

  // Ambil polyline rute (atau fallback GPX) untuk maksimal 8 aktivitas GPS teratas
  const gpsTargets = validRaw
    .map((a, idx) => ({ a, idx }))
    .filter(({ a }) => typeof a.startLatitude === "number" && typeof a.startLongitude === "number")
    .slice(0, 8);

  await Promise.all(
    gpsTargets.map(async ({ a, idx }) => {
      const id = String(a.activityId);
      const det = await g.getActivityDetails(id, 1, 200).catch(() => null);
      let coords = toCoords(det);
      if (!coords) {
        const gpxBuf = await g.downloadActivity(id, "GPX").catch(() => null);
        if (gpxBuf) coords = parseGpxCoords(gpxBuf.toString("utf8"));
      }
      if (coords && coords.length >= 2) {
        rows[idx].geo = downsample(coords, 80);
      }
    })
  );

  const counts = new Map<string, { key: string; label: string; count: number }>();
  for (const r of rows) {
    const t = mapType(r.typeKey);
    const cur = counts.get(r.typeKey) ?? { key: r.typeKey, label: t.tag, count: 0 };
    cur.count += 1;
    counts.set(r.typeKey, cur);
  }

  return {
    warnings,
    rows,
    types: [...counts.values()].sort((a, b) => b.count - a.count),
  };
}

interface LapDTO {
  distance?: number;
  duration?: number;
  movingDuration?: number;
  averageSpeed?: number;
  averageMovingSpeed?: number;
  averageHR?: number;
  maxHR?: number;
  elevationGain?: number;
  elevationLoss?: number;
  averageRunCadence?: number;
  averageBikeCadence?: number;
  averagePower?: number;
  intensityType?: string;
}

/**
 * `getActivitySplits` mengembalikan `lapDTOs` (bukan `activitySplits`).
 * Untuk lari, Garmin memecah per kilometer; `averageRunCadence` sudah dalam
 * langkah/menit total, jadi jangan dikali dua.
 */
function toSplits(dto: unknown): SplitRow[] {
  const list = (dto as { lapDTOs?: LapDTO[] } | null)?.lapDTOs;
  if (!Array.isArray(list)) return [];

  return list
    .filter((s) => (s.distance ?? 0) > 0)
    .map((s, i) => {
      const m = (s.distance ?? 0) / 1000;
      return {
        n: i + 1,
        dist: `${m.toLocaleString("id-ID", { maximumFractionDigits: 2 })} km`,
        pace:
          paceFromSpeed(s.averageMovingSpeed ?? s.averageSpeed) ??
          dur(s.movingDuration ?? s.duration) ??
          "—",
        hr: s.averageHR ? `${Math.round(s.averageHR)}` : null,
        elev: s.elevationGain ? `+${Math.round(s.elevationGain)}` : null,
        cad: s.averageRunCadence
          ? `${Math.round(s.averageRunCadence)}`
          : s.averageBikeCadence
            ? `${Math.round(s.averageBikeCadence)}`
            : null,
        power: s.averagePower ? `${Math.round(s.averagePower)}` : null,
        active: !/rest/i.test(s.intensityType ?? ""),
      };
    });
}

function bestSplits(raw: Raw): { label: string; value: string }[] {
  const defs: [string, keyof Raw][] = [
    ["1 km", "fastestSplit_1000"],
    ["1 mil", "fastestSplit_1609"],
    ["5 km", "fastestSplit_5000"],
    ["10 km", "fastestSplit_10000"],
  ];
  const out: { label: string; value: string }[] = [];
  for (const [label, key] of defs) {
    const v = raw[key];
    if (typeof v === "number" && v > 0) out.push({ label, value: dur(v) ?? "—" });
  }
  return out;
}

export async function fetchActivityDetail(g: Garmin, id: string): Promise<ActivityDetail | null> {
  if (!/^\d+$/.test(id)) return null;

  const summary = (await g.getActivity(id).catch(() => null)) as
    | {
        summaryDTO?: Raw;
        activityName?: string;
        description?: string;
        locationName?: string;
        activityTypeDTO?: { typeKey?: string };
      }
    | null;

  const dto = summary?.summaryDTO ?? {};

  const flat: Raw = {
    ...dto,
    activityId: Number(id),
    activityName: summary?.activityName ?? dto.activityName,
    description: summary?.description ?? dto.description,
    locationName: summary?.locationName ?? dto.locationName,
    // Detail memakai `activityTypeDTO`, list memakai `activityType`.
    activityType: dto.activityType ?? summary?.activityTypeDTO,
    startTimeLocal: dto.startTimeLocal,
  };

  const base = toRow(flat);

  const [details, splitsDto] = await Promise.all([
    g.getActivityDetails(id, 2000, 4000).catch(() => null),
    g.getActivitySplits(id).catch(() => null),
  ]);

  let geo: Coord[] | null = toCoords(details);
  let track = toTrack(details);

  // Fallback ke file GPX resmi Garmin bila `getActivityDetails` tidak memuat rute
  if (!geo || geo.length < 2) {
    const gpxBuf = await g.downloadActivity(id, "GPX").catch(() => null);
    if (gpxBuf) {
      const gpxXml = gpxBuf.toString("utf8");
      geo = parseGpxCoords(gpxXml);
      if (track.length < 2) track = parseGpxTrack(gpxXml);
    }
  }

  if (geo) geo = downsample(geo, MAX_GEO_POINTS);
  const splits = toSplits(splitsDto);

  return {
    ...base,
    geo,
    desc: flat.description?.trim() || null,
    location: flat.locationName ?? null,
    startedAt: clock(flat.startTimeLocal) ?? null,
    maxHr: flat.maxHR ? `${Math.round(flat.maxHR)}` : null,
    cadMax: null,
    trainingEffect:
      (flat.aerobicTrainingEffect ?? flat.trainingEffect)?.toFixed(1) ?? null,
    anaerobEffect: flat.anaerobicTrainingEffect?.toFixed(1) ?? null,
    track,
    splits,
    zones: zonesFrom(flat),
    bestSplits: bestSplits(flat),
  };
}

export const dash = orDash;
