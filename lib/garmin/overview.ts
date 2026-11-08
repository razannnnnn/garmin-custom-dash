// lib/garmin/overview.ts — ringkasan seluruh data untuk halaman Overview
//
// Memakai `getDailySummaries(start,end)`: satu panggilan mengembalikan seluruh
// hari (movement/calories/heartRate/stress/bodyBattery/intensityMinutes),
// jauh lebih ringan daripada memanggil per-hari.

import type { Garmin } from "garminconnect-js";
import { fetchActivityList } from "./activities";
import { dayLabel, daysAgo, hm, jakartaDate, lastDays, num, safeAvg } from "./fmt";
import type { DayValue, Overview, Period, SnapRow, SleepInfo, StatCell } from "./types";

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

const READINESS_LABEL: Record<string, string> = {
  PRIME: "Prima",
  HIGH: "Tinggi",
  MODERATE: "Sedang",
  LOW: "Rendah",
  POOR: "Kurang",
};

interface DaySummary {
  calendarDate?: string;
  movement?: { steps?: { value?: number; goal?: number } };
  calories?: { burnedActive?: number; burnedTotal?: number };
  heartRate?: { restingValue?: number };
  stress?: { avgLevel?: number };
  bodyBattery?: { latestValue?: number };
  intensityMinutes?: { moderate?: number; vigorous?: number };
}

/**
 * Tidur sering baru terekam setelah bangun, dan akun dengan pemakaian jarang
 * punya banyak malam kosong. Gunakan `getSleepDaily` (1 panggilan 30 hari)
 * untuk menemukan tanggal malam terakhir yang terukur, lalu ambil detailnya.
 */
async function sleepWithFallback(g: Garmin, today: string): Promise<unknown> {
  const daily = await g.getSleepDaily(daysAgo(29), today).catch(() => [] as Any[]);
  const list = Array.isArray(daily) ? (daily as Any[]) : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const entry = list[i];
    const date = String(entry?.calendarDate ?? "");
    const secs = pos(pick(entry, "values", "totalSleepTimeInSeconds"));
    if (date && secs !== null) {
      const detail = await g.getSleepData(date).catch(() => null);
      const dto = (pick(detail, "dailySleepDTO") ?? detail) as Any | null;
      if (pos(pick(dto, "sleepTimeSeconds"))) {
        return { ...(detail as Any), __date: date };
      }
      return { __fromDaily: entry, __date: date };
    }
  }
  const night = await g.getSleepData(today).catch(() => null);
  const dto = (pick(night, "dailySleepDTO") ?? night) as Any | null;
  return pos(pick(dto, "sleepTimeSeconds")) ? { ...(night as Any), __date: today } : null;
}

/**
 * Ambil HRV terakhir dalam 30 hari dengan satu panggilan `getHrvDataRange`.
 */
async function latestHrv(
  g: Garmin,
  today: string
): Promise<{ val: number; weeklyAvg: number | null; date: string } | null> {
  const range = await g.getHrvDataRange(daysAgo(29), today).catch(() => null);
  const list = Array.isArray(pick(range, "hrvSummaries"))
    ? (pick(range, "hrvSummaries") as Any[])
    : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const h = list[i];
    const date = String(h?.calendarDate ?? "");
    const v = pos(h?.lastNightAvg) ?? pos(h?.weeklyAvg);
    if (date && v !== null) {
      return { val: v, weeklyAvg: pos(h?.weeklyAvg), date };
    }
  }
  return null;
}

async function latestMaxMetrics(
  g: Garmin,
  today: string
): Promise<{ raw: unknown; date: string } | null> {
  const m = await g.getMaxMetrics(today).catch(() => null);
  const first = Array.isArray(m) ? (m[0] as Any) : (m as Any);
  if (
    pos(pick(first, "generic", "vo2MaxPreciseValue")) !== null ||
    pos(pick(first, "vo2MaxPreciseValue")) !== null
  ) {
    const date = String(pick(first, "generic", "calendarDate") ?? today);
    return { raw: m, date };
  }
  return null;
}

export async function fetchOverview(g: Garmin): Promise<Overview> {
  const warnings: string[] = [];
  const today = jakartaDate();
  const start = daysAgo(7);
  const dates = lastDays(7);

  const [profile, readiness, daysRaw, sleepResolved, hrv, maxMetrics, status, actList] =
    await Promise.all([
      g.getUserProfile().catch((e) => {
        warnings.push(`Profil gagal dimuat (${msg(e)})`);
        return null;
      }),
      g.getTrainingReadiness(today).catch((e) => {
        warnings.push(`Kesiapan latihan tidak tersedia (${msg(e)})`);
        return null;
      }),
      g.getDailySummaries(start, today).catch((e) => {
        warnings.push(`Ringkasan harian tidak tersedia (${msg(e)})`);
        return [] as DaySummary[];
      }),
      sleepWithFallback(g, today),
      latestHrv(g, today),
      latestMaxMetrics(g, today),
      g.getTrainingStatus(today).catch(() => null),
      fetchActivityList(g, { limit: 12 }).catch((e) => {
        warnings.push(`Aktivitas gagal dimuat (${msg(e)})`);
        return null;
      }),
    ]);

  const days = Array.isArray(daysRaw) ? (daysRaw as DaySummary[]) : [];
  const byDate = new Map<string, DaySummary>();
  for (const d of days) if (d.calendarDate) byDate.set(d.calendarDate, d);
  const todaySummary = byDate.get(today) ?? days[days.length - 1] ?? null;

  const user = String((profile as Any)?.fullName ?? (profile as Any)?.displayName ?? "Kamu")
    .split(/\s+/)[0];

  // ── Snapshot hari ini & Tidur (dihitung lebih dulu untuk fallback Kesiapan) ──
  const lastBatt = [...dates]
    .reverse()
    .map((d) => ({ d, v: pos(pick(byDate.get(d), "bodyBattery", "latestValue")) }))
    .find((x) => x.v !== null) ?? null;
  const batt = pos(pick(todaySummary, "bodyBattery", "latestValue")) ?? lastBatt?.v ?? null;
  const rhr = pos(pick(todaySummary, "heartRate", "restingValue"));
  const stressToday = pos(pick(todaySummary, "stress", "avgLevel"));
  const stepsToday = pos(pick(todaySummary, "movement", "steps", "value"));
  const stepGoal = pos(pick(todaySummary, "movement", "steps", "goal")) ?? 10000;
  const kcal =
    pos(pick(todaySummary, "calories", "burnedActive")) ??
    pos(pick(todaySummary, "calories", "burnedTotal"));

  const rhrPrev = dates
    .filter((d) => d < today)
    .map((d) => pos(pick(byDate.get(d), "heartRate", "restingValue")))
    .filter((v): v is number => v !== null);
  const rhrAvg = safeAvg(rhrPrev);

  // Hari ini sering belum terukur (avgLevel -1); pakai hari terakhir terukur
  // dan sebut tanggalnya agar angka tidak terbaca sebagai hari ini.
  const lastStress = [...dates]
    .reverse()
    .map((d) => ({ d, v: pos(pick(byDate.get(d), "stress", "avgLevel")) }))
    .find((x) => x.v !== null) ?? null;
  const stressValue = stressToday ?? lastStress?.v ?? null;

  const sleepInfo = buildSleep(sleepResolved);
  const sleepDate = String((sleepResolved as Any)?.__date ?? "");
  const hrvLast = hrv?.val ?? null;

  // ── Kesiapan: skor resmi Garmin atau komposit fisiologis (Body Battery, Tidur, HRV, Stres) ──
  const entries = Array.isArray(readiness) ? (readiness as Any[]) : [];
  const ready = entries.find((e) => e.inputContext === "AFTER_WAKEUP_RESET") ?? entries[0] ?? null;
  const rScore = pos(pick(ready, "score")) ?? pos(pick(ready, "readinessScore"));
  const rLevel = String(pick(ready, "level") ?? pick(ready, "readinessLevel") ?? "");
  const rNote = String(pick(ready, "feedbackLong") ?? pick(ready, "feedbackShort") ?? "").trim();

  const componentDefs: [string, string][] = [
    ["Tidur", "sleepScoreFactorPercent"],
    ["HRV", "hrvFactorPercent"],
    ["Beban", "acwrFactorPercent"],
    ["Pemulihan", "recoveryTimeFactorPercent"],
  ];
  let parts = componentDefs
    .map(([l, key]) => {
      const v = n(pick(ready, key));
      if (v === null || v <= 0) return null;
      const item: { l: string; v: string; p: number | null } = {
        l,
        v: `${Math.round(v)}%`,
        p: v / 100,
      };
      return item;
    })
    .filter((x): x is { l: string; v: string; p: number | null } => x !== null);

  let finalScore = rScore;
  let finalLabel = rLevel
    ? (READINESS_LABEL[rLevel] ?? rLevel)
    : rScore === null
      ? null
      : "Terukur";
  let finalNote = rNote;

  if (finalScore === null) {
    const sleepMinutes = sleepInfo.stages.reduce((a, s) => a + s.m, 0);
    const sleepPct =
      sleepInfo.score ??
      (sleepMinutes > 0 ? Math.min(100, Math.round((sleepMinutes / 480) * 100)) : null);
    const battPct = batt !== null ? Math.max(0, Math.min(100, batt)) : null;
    const hrvPct = hrv
      ? hrv.weeklyAvg
        ? Math.min(100, Math.max(30, Math.round((hrv.val / hrv.weeklyAvg) * 80)))
        : Math.min(100, Math.round(hrv.val))
      : null;
    const calmPct = stressValue !== null ? Math.max(0, Math.min(100, 100 - stressValue)) : null;

    const weighted: { l: string; pct: number; w: number }[] = [];
    if (battPct !== null) weighted.push({ l: "Body Battery", pct: battPct, w: 0.35 });
    if (sleepPct !== null) weighted.push({ l: "Tidur", pct: sleepPct, w: 0.3 });
    if (hrvPct !== null) weighted.push({ l: "HRV", pct: hrvPct, w: 0.2 });
    if (calmPct !== null) weighted.push({ l: "Ketenangan", pct: calmPct, w: 0.15 });

    if (weighted.length > 0) {
      const wSum = weighted.reduce((acc, item) => acc + item.w, 0);
      finalScore = Math.round(
        weighted.reduce((acc, item) => acc + item.pct * item.w, 0) / Math.max(1e-6, wSum)
      );
      parts = weighted.map((item) => ({
        l: item.l,
        v: `${Math.round(item.pct)}%`,
        p: Math.round(item.pct) / 100,
      }));

      if (finalScore >= 80) {
        finalLabel = "Kesiapan Prima";
        finalNote =
          "Daya tubuh, kualitas tidur, dan HRV sangat mendukung untuk latihan intensitas tinggi hari ini.";
      } else if (finalScore >= 65) {
        finalLabel = "Kesiapan Tinggi";
        finalNote =
          "Kondisi fisik segar dan stabil. Siap menjalani sesi latihan harian sesuai target.";
      } else if (finalScore >= 50) {
        finalLabel = "Kesiapan Sedang";
        finalNote =
          "Kesiapan moderat berdasarkan Body Battery, Tidur, HRV, dan tingkat stres. Latihan ringan–sedang disarankan.";
      } else if (finalScore >= 35) {
        finalLabel = "Kesiapan Rendah";
        finalNote =
          "Daya tubuh atau tidur semalam belum optimal. Utamakan latihan pemulihan atau jalan santai.";
      } else {
        finalLabel = "Perlu Pemulihan";
        finalNote =
          "Cadangan energi tubuh sedang rendah. Prioritaskan istirahat dan tidur berkualitas hari ini.";
      }
    }
  }

  const readinessPeriod: Period = {
    score: finalScore,
    label: finalLabel,
    note: finalNote,
    parts,
  };
  const readinessSupported = finalScore !== null || entries.length > 0;

  const snap: SnapRow[] = [
    {
      i: "battery-charging",
      c: "batt",
      l: "Body Battery",
      v: batt !== null ? String(batt) : "—",
      u: "%",
      p: batt !== null ? batt / 100 : null,
      d: null,
    },
    {
      i: "heart-pulse",
      c: "heart",
      l: "Detak istirahat",
      v: rhr !== null ? String(rhr) : "—",
      u: "bpm",
      p: null,
      d:
        rhr !== null && rhrAvg !== null
          ? rhr === Math.round(rhrAvg)
            ? `sama dengan rata-rata ${Math.round(rhrAvg)} bpm`
            : `${rhr > rhrAvg ? "+" : "−"}${Math.abs(rhr - Math.round(rhrAvg))} dari rata-rata ${Math.round(rhrAvg)} bpm`
          : null,
    },
    {
      i: "gauge",
      c: "stress",
      l: "Stres rata-rata",
      v: stressValue !== null ? String(stressValue) : "—",
      u: "/ 100",
      p: stressValue !== null ? stressValue / 100 : null,
      d:
        stressToday !== null
          ? null
          : lastStress
            ? `terakhir terukur ${dayLabel(lastStress.d)}`
            : null,
    },
  ];
  // `getMaxMetrics` mengembalikan array; VO₂max ada di elemen pertama.
  const mmRaw = maxMetrics?.raw;
  const mm = Array.isArray(mmRaw) ? (mmRaw[0] as Any) : (mmRaw as Any);
  const vo2 =
    pos(pick(mm, "generic", "vo2MaxPreciseValue")) ??
    pos(pick(mm, "generic", "vo2MaxValue")) ??
    pos(pick(mm, "vo2MaxPreciseValue")) ??
    pos(pick(mm, "vo2MaxValue"));
  const fitnessAge = pos(pick(mm, "generic", "fitnessAge"));

  const moderate = n(pick(todaySummary, "intensityMinutes", "moderate")) ?? 0;
  const vigorous = n(pick(todaySummary, "intensityMinutes", "vigorous")) ?? 0;
  const intensity = moderate || vigorous ? moderate + 2 * vigorous : null;

  const stats: StatCell[] = [
    {
      i: "footprints",
      c: "accent",
      l: "Langkah",
      v: stepsToday !== null ? (num(stepsToday) ?? "—") : "—",
      u: `dari ${num(stepGoal) ?? "—"}`,
      p: stepsToday !== null ? Math.min(stepsToday / stepGoal, 1) : null,
    },
    {
      i: "moon",
      c: "sleep",
      l: "Tidur",
      v: sleepInfo.total ?? "—",
      u: sleepDate && sleepDate !== today ? dayLabel(sleepDate) : "",
      p: sleepInfo.score !== null ? Math.min(sleepInfo.score / 100, 1) : null,
    },
    {
      i: "flame",
      c: "stress",
      l: "Kalori aktif",
      v: kcal !== null ? (num(kcal) ?? "—") : "—",
      u: "kkal",
      p: kcal !== null ? Math.min(kcal / 3000, 1) : null,
    },
    {
      i: "timer",
      c: "run",
      l: "Intensitas",
      v: intensity !== null ? String(intensity) : "—",
      u: "dari 150 mnt",
      p: intensity !== null ? Math.min(intensity / 150, 1) : null,
    },
    {
      i: "activity",
      c: "heart",
      l: "HRV semalam",
      v: hrvLast !== null ? String(Math.round(hrvLast)) : "—",
      u: hrv && hrv.date !== today ? `ms · ${dayLabel(hrv.date)}` : "ms",
      p: hrvLast !== null ? Math.min(hrvLast / 100, 1) : null,
    },
    {
      i: "wind",
      c: "run",
      l: "VO₂ Max",
      v: vo2 !== null ? vo2.toFixed(1).replace(".", ",") : "—",
      u:
        maxMetrics && maxMetrics.date !== today
          ? `ml/kg · ${dayLabel(maxMetrics.date)}`
          : fitnessAge !== null
            ? `ml/kg · usia ${Math.round(fitnessAge)}`
            : "ml/kg",
      p: vo2 !== null ? Math.min(vo2 / 70, 1) : null,
    },
  ];

  const steps: DayValue[] = dates.map((date) => ({
    d: dayLabel(date),
    v: pos(pick(byDate.get(date), "movement", "steps", "value")),
    date,
  }));

  const stress: DayValue[] = dates.map((date) => ({
    d: dayLabel(date),
    v: pos(pick(byDate.get(date), "stress", "avgLevel")),
    date,
  }));

  const statusArr = Array.isArray(status) ? (status as Any[]) : status ? [status as Any] : [];
  const st = statusArr[0] ?? null;
  const stLabelRaw = String(
    pick(st, "trainingStatusFeedbackPhrase") ??
      pick(st, "mostRecentTrainingStatus", "latestTrainingStatusData", "trainingStatusFeedbackPhrase") ??
      ""
  );
  const trainingStatus = stLabelRaw ? { label: humanizeStatus(stLabelRaw), note: null } : null;

  return {
    user,
    connected: true,
    warnings,
    readiness: readinessPeriod,
    readinessSupported,
    snap,
    stats,
    trainingStatus,
    steps,
    goal: stepGoal,
    stress,
    sleep: sleepInfo,
    recent: actList?.rows.slice(0, 4) ?? [],
  };
}

function humanizeStatus(key: string): string {
  const map: Record<string, string> = {
    PRODUCTIVE: "Produktif",
    PEAKING: "Puncak",
    RECOVERY: "Pemulihan",
    MAINTAINING: "Menjaga",
    UNPRODUCTIVE: "Kurang produktif",
    OVERREACHING: "Beban berlebih",
    DETRAINING: "Menurun",
    NO_STATUS: "Belum ada status",
  };
  const up = key.toUpperCase().replace(/\s+/g, "_");
  return map[up] ?? key.replace(/_/g, " ").toLowerCase();
}

function buildSleep(raw: unknown): SleepInfo {
  const fromDaily = pick(raw, "__fromDaily") as Any | undefined;
  const vals = (pick(fromDaily, "values") as Any | undefined) ?? null;
  const dto = (pick(raw, "dailySleepDTO") ?? raw) as Any | null;

  const secs = pos(pick(dto, "sleepTimeSeconds")) ?? pos(pick(vals, "totalSleepTimeInSeconds"));
  const deep = n(pick(dto, "deepSleepSeconds")) ?? n(pick(vals, "deepTime")) ?? 0;
  const light = n(pick(dto, "lightSleepSeconds")) ?? n(pick(vals, "lightTime")) ?? 0;
  const rem = n(pick(dto, "remSleepSeconds")) ?? n(pick(vals, "remTime")) ?? 0;
  const awake = n(pick(dto, "awakeSleepSeconds")) ?? n(pick(vals, "awakeTime")) ?? 0;

  const score =
    pos(pick(raw, "sleepScores", "overall", "value")) ??
    pos(pick(dto, "sleepScores", "overall", "value")) ??
    pos(pick(dto, "sleepScore")) ??
    pos(pick(raw, "sleepScore")) ??
    pos(pick(vals, "sleepScore"));

  if (!secs) {
    return {
      score: null,
      total: null,
      bed: null,
      wake: null,
      eff: null,
      stress: null,
      note: null,
      stages: [],
    };
  }

  const totalMin = Math.round(secs / 60);
  const bedRaw =
    n(pick(dto, "sleepStartTimestampGMT")) ??
    n(pick(vals, "gmtSleepStartTimeInMillis")) ??
    n(pick(dto, "sleepStartTimestampLocal"));
  const wakeRaw =
    n(pick(dto, "sleepEndTimestampGMT")) ??
    n(pick(vals, "gmtSleepEndTimeInMillis")) ??
    n(pick(dto, "sleepEndTimestampLocal"));

  const stages = [
    { n: "Dalam", m: Math.round(deep / 60), c: "sleep" as const },
    { n: "Ringan", m: Math.round(light / 60), c: "run" as const },
    { n: "REM", m: Math.round(rem / 60), c: "accent" as const },
    { n: "Terjaga", m: Math.round(awake / 60), c: "stress" as const },
  ].filter((s) => s.m > 0);

  const inBed = secs + awake;
  return {
    score,
    total: hm(totalMin),
    bed: bedRaw ? clockMs(bedRaw) : null,
    wake: wakeRaw ? clockMs(wakeRaw) : null,
    eff: inBed > 0 ? `${Math.round((secs / inBed) * 100)}%` : null,
    stress: pos(pick(dto, "avgSleepStress")),
    note: sleepFeedback(String(pick(dto, "sleepScoreFeedback") ?? "")),
    stages,
  };
}

function clockMs(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(ms))
    .replace(":", ".");
}

function sleepFeedback(key: string): string | null {
  if (!key) return null;
  const map: Record<string, string> = {
    NEGATIVE_SHORT_AND_NONRECOVERING: "Durasi pendek dan pemulihan kurang.",
    NEGATIVE_SHORT_BUT_RECOVERING: "Durasi pendek, tetapi pemulihan cukup.",
    NEGATIVE_LONG_BUT_NONRECOVERING: "Durasi panjang, tetapi pemulihan kurang.",
    NEGATIVE_NOT_RECOVERING: "Pemulihan malam ini kurang.",
    POSITIVE_RECOVERING: "Pemulihan berjalan baik.",
    POSITIVE_OPTIMAL: "Tidur optimal.",
    POSITIVE_EXCELLENT: "Kualitas tidur sangat baik.",
  };
  return map[key] ?? null;
}
