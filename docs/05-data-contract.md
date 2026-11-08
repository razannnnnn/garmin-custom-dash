# 05 — Kontrak Data

Kontrak antara server (`lib/garmin.ts`) dan UI. UI **hanya** menerima bentuk ini.
Tidak ada objek respons mentah Garmin yang menyeberang ke client.

Prinsip: **tidak ada angka karangan.** Field yang tidak tersedia dari Garmin
bernilai `null`, dan UI merender `—`.

```ts
// lib/types.ts

export type DataSource = "live" | "demo";

export interface DashboardData {
  source: DataSource;        // dari mana angka ini berasal
  warnings: string[];        // mis. "token kedaluwarsa 10 hari"
  user: string;              // nama depan; "Kamu" bila tidak diketahui
  sync: string | null;       // "07.42 WIB" — null bila demo
  readiness: Readiness;
  snap: SnapshotItem[];      // 3 baris: body battery, RHR, stres
  stats: StatItem[];         // 6 item rail
  week: DayValue[];          // tepat 7, urut naik, index 6 = hari ini
  goal: number;              // target langkah harian
  sleep: Sleep;
  zones: ZoneItem[];         // Z1–Z5
  acts: Activity[];
  load: TrainingLoad;
}

export interface Readiness {
  score: number | null;      // 0–100, null bila Garmin tidak memberi
  label: string | null;
  note: string | null;
}

export interface SnapshotItem {
  i: string;                 // nama ikon Lucide kebab-case
  c: ColorToken;
  l: string;
  v: string;                 // "—" bila tidak ada
  u?: string;
  p?: number | null;         // 0..1 untuk bar; null = tidak ada bar
  d?: string | null;         // catatan pembanding
}

export interface StatItem {
  i: string;
  c: ColorToken;
  l: string;
  v: string;                 // "—" bila tidak ada
  u?: string;
  p: number | null;
}

export interface DayValue {
  d: string;                 // "Sen".."Min" diturunkan dari tanggal
  v: number | null;
  date: string;              // "2026-10-25" — untuk menentukan "hari ini"
}

export interface Sleep {
  score: number | null;
  total: string | null;      // "7j 28m"
  bed: string | null;        // "23.12"
  wake: string | null;       // "06.40"
  eff: string | null;        // "94%"
  stages: { n: string; m: number; c: ColorToken }[];   // m = menit, boleh []
  week: { d: string; h: number | null; s: number | null; date: string }[];
}

export interface ZoneItem {
  z: string;                 // "Z1".."Z5"
  m: number | null;          // menit
  c: string;                 // hex
}

export interface Activity {
  id: string;                // activityId Garmin, atau "demo-1"
  i: string;                 // ikon Lucide kebab-case
  c: ColorToken;
  t: string;
  w: string;                 // "Hari ini · 06.10"
  tag: string;               // "Lari" | "Hiking" | "Jalan" | "Kekuatan" | …
  big?: boolean;
  a: [string, string][];     // [["8,4","km"], …] minimal satu entri
  geo?: [number, number][] | null;   // [lon, lat] ≤400 titik, null = tanpa GPS
  elev?: number[] | null;
  elevNote?: string | null;
}

export interface TrainingLoad {
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  status: string | null;     // "Segar" | "Netral" | "Perlu istirahat"
  note: string | null;
}

export type ColorToken = "accent" | "heart" | "sleep" | "batt" | "stress" | "run";
```

---

## Pemetaan Garmin → field

| Field | Endpoint | Transformasi |
|---|---|---|
| `readiness` | `trainingReadiness` pada dailysummaries | skor apa adanya; **tidak** diturunkan dari body battery |
| `snap[0]` | `bodyBatteryMostRecentValue` | `p = v/100` |
| `snap[1]` | `restingHeartRate` | `d` = selisih vs `lastSevenDaysAvgRestingHeartRate` |
| `snap[2]` | `averageStressLevel` | `0` diperlakukan sebagai tidak ada data |
| `stats[]` | steps / sleep / activeKilocalories / intensity / HRV / vo2Max | `null` bila kosong |
| `stats[3]` | `moderateIntensityMinutes + 2 × vigorousIntensityMinutes` | aturan Garmin |
| `week` | `/usersummary-service/stats/steps/daily/{start}/{end}` | diurutkan naik, dipetakan ke 7 slot tanggal |
| `goal` | `stepGoal` bila ada, else 10000 | konstanta terdokumentasi |
| `sleep.*` | `/sleep-service/sleep/dailySleep` | field `*Local` diprioritaskan; fallback `Asia/Jakarta` |
| `sleep.week` | `/sleep-service/sleep/dailySleepSummariesByDate` | diurutkan naik |
| `zones` | `hrTimeInZone_1..5` dijumlahkan dari aktivitas | semua nol → `m: null` |
| `acts[].geo` | `/activity-service/activity/{id}/details` → `geoPolylineDTO` | `toCoords()` + downsample |
| `acts[].elev` | `elevationGain` / `maxElevation` untuk catatan | profil hanya bila tersedia |
| `load` | `ctl`/`atl`/`tsb` | null bila tidak ada; `status` dihitung dari `tsb` |

## Normalisasi waktu

- Semua tanggal dihitung di **`Asia/Jakarta`**, bukan zona server.
- `formatJam()` memakai `Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta" })`.
- `toDateStr(d)` memakai komponen tanggal Jakarta, bukan `toISOString()`
  (yang akan bergeser untuk waktu setelah 17.00 WIB).
- Label "Hari ini" dibandingkan terhadap tanggal Jakarta.

## Atribusi & disclaimer

- Data contoh: `source: "demo"`, `warnings` berisi alasan.
- Data nyata: `source: "live"`, `warnings` kosong atau berisi endpoint yang gagal.
