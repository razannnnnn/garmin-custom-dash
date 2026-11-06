# Data Contract — Garmin Dash

> Skema data yang dipakai UI + pemetaan ke Garmin.
> Sumber sampel: objek `D` di `Dashboard Garmin.html` (bagian `<script>` paling bawah).
> File ini adalah kontrak antara layer data (`lib/garmin.ts`, server) dan komponen UI.

---

## 1. Tipe TypeScript Kanonikal

Simpan di `lib/types.ts`. UI hanya menerima bentuk ini — bentuk response mentah Garmin di-map di server.

```ts
export interface DashboardData {
  user: string;                  // nama depan untuk sapaan
  sync: string;                  // label jam sinkron terakhir, mis. "07.42 WIB"
  readiness: Readiness;
  snap: SnapshotItem[];          // 3 baris: body battery, detak istirahat, stres
  stats: StatItem[];             // 6 kartu statistik
  week: DayValue[];              // langkah 7 hari
  goal: number;                  // target langkah harian
  sleep: Sleep;
  zones: ZoneItem[];             // Z1–Z5
  acts: Activity[];
  load: TrainingLoad;
}

export interface Readiness {
  score: number;                 // 0–100
  label: string;                 // "Siap latihan" | "Cukup" | "Butuh pemulihan"
  note: string;                  // 1–2 kalimat rekomendasi
}

export interface SnapshotItem {
  i: IconName;                   // nama ikon Lucide: "battery-charging" | "heart-pulse" | "gauge"
  c: "batt" | "heart" | "stress" | "sleep" | "run" | "accent";  // token warna
  l: string;                     // label
  v: string;                     // nilai utama (string, sudah terformat)
  u?: string;                    // unit kecil ("%", "bpm", "/ 100")
  p?: number;                    // proporsi bar 0..1
  d?: string;                    // catatan kecil, mis. "−2 dgn rata-rata 7 hari"
}

export interface StatItem {
  i: IconName;
  c: ColorToken;
  l: string;
  v: string;
  u?: string;
  p: number;                     // 0..1 untuk progress bar
}

export interface DayValue { d: string; v: number; }   // d: "Sen".."Min"; v: langkah (atau jam tidur utk sleep.week)

export interface Sleep {
  score: number;                 // 0–100
  total: string;                 // "7j 28m"
  bed: string;                   // "23.12"
  wake: string;                  // "06.40"
  eff: string;                   // "94%"
  stages: { n: string; m: number; c: ColorToken }[];  // m = menit
  week: { d: string; h: number; s: number }[];         // h = jam desimal, s = skor
}

export interface ZoneItem { z: string; m: number; c: string; }  // c = hex langsung

export interface Activity {
  i: IconName;                   // "route" (lari), "mountain" (hiking), "footprints" (jalan), "zap" (gym)
  c: ColorToken;
  t: string;                     // judul
  w: string;                     // waktu tampil: "Hari ini · 06.10"
  tag: string;                   // chip kategori: LARI | HIKING | JALAN | KEKUATAN
  big?: boolean;                 // kartu unggulan (peta lebih tinggi + elevasi)
  a: [string, string][];         // pasangan [nilai, unit]: [["8,4","km"],["5:30","/km"],["148","bpm"]]
  map?: [number, number][] | null; // titik rute dinormalisasi 0–100 (x,y); null/absen = indoor
  elev?: number[];               // profil elevasi (m), hanya utk big
  elevNote?: string;             // "Elevasi +64 m · titik tertinggi 112 m"
}

export interface TrainingLoad {
  ctl: number;                   // kebugaran (fitness), 42 hari
  atl: number;                   // kelelahan (fatigue), 7 hari
  tsb: number;                   // form = ctl - atl; negatif = segar/istirahat
  status: string;                // "Segar" | "Netral" | "Perlu istirahat"
  note: string;                  // 1 kalimat naratif
}

export type ColorToken = "accent" | "heart" | "sleep" | "batt" | "stress" | "run";
export type IconName = string;   // nama komponen Lucide (kebab-case) — dipakai via peta di §3
```

> Catatan penting soal `map`: prototype menyimpan koordinat **yang sudah dinormalisasi ke kotak 100×100**.
> Saat integrasi Garmin: server yang melakukan normalisasi (fit bbox rute ke 100×100 dengan `preserveAspectRatio="xMidYMid slice"`), UI tetap menerima bentuk 0–100.

---

## 2. Pemetaan Garmin → Field

Pengguna memakai **API resmi Garmin** (bukan MCP). Pemetaan di bawah berdasar protokol Garmin Connect / garmin_mcp sebagai acuan bentuk data; sesuaikan nama endpoint resmi yang dipakai.

| Field di `DashboardData` | Sumber Garmin | Catatan transformasi |
|---|---|---|
| `readiness` | Training Readiness | skor + label dari band skor; `note` dirakit dari kontributor (HRV, sleep, acuity) |
| `snap[0]` Body Battery | Body Battery harian | nilai terkini, `p = v/100` |
| `snap[1]` Detak istirahat | Heart Rate (restingHeartRate) | `d` = selisih vs rata-rata 7 hari |
| `snap[2]` Stres | Stress harian | rata-rata, `p = v/100` |
| `stats[0]` Langkah | Daily Steps | `p = steps/goal` |
| `stats[1]` Tidur | Sleep data | durasi utama hari ini |
| `stats[2]` Kalori aktif | Calories (active) | |
| `stats[3]` Intensitas | Intensity Minutes | target mingguan 150 |
| `stats[4]` HRV | HRV semalam | `u: "ms"` |
| `stats[5]` VO₂ Max | Max Metrics | `u: "ml/kg"` |
| `week`, `goal` | Daily Steps 7 hari | target dari pengaturan user |
| `sleep.*` | Sleep data semalam + 7 hari | stages dalam menit; week.h jam desimal |
| `zones` | Heart Rate Zones (time-in-zone) | menit per Z1–Z5 |
| `acts` | Activities (list) | `map` dari polyline GPS → normalisasi 0–100; aktivitas tanpa GPS → `map: null`; `elev` dari sampling elevasi (~16–20 titik) |
| `load` | Training Load / Training Status | CTL=fitness, ATL=fatigue, TSB=form |

---

## 3. Peta Ikon (string → Lucide)

Karena data memakai nama ikon sebagai string, buat satu peta di `components/ui/icon.tsx`:

```ts
import { Activity, BatteryCharging, Bike, Footprints, Gauge, HeartPulse,
         Moon, Mountain, Route, Timer, TrendingUp, Wind, Zap } from "lucide-react";

export const ICONS = {
  "activity": Activity,
  "battery-charging": BatteryCharging,
  "heart-pulse": HeartPulse,
  "gauge": Gauge,
  "moon": Moon,
  "mountain": Mountain,
  "route": Route,
  "footprints": Footprints,
  "timer": Timer,
  "trending-up": TrendingUp,
  "wind": Wind,
  "zap": Zap,
} as const;
```

Data sampel prototype memakai nama pendek (`foot`, `heart`, `batt`, …) — **saat rebuild, ganti ke nama Lucide kebab-case di atas** dan perbarui sampel `D`.

---

## 4. Sampel Data Dev

Untuk development tanpa API, salin objek `D` dari `Dashboard Garmin.html` ke `lib/mock-data.ts` (dengan nama ikon sudah diganti sesuai §3) dan gunakan saat env Garmin belum diset. Halaman tetap penuh ter-render dengan data contoh — perilaku yang sama dengan prototype.

---

## 5. Aturan Integrasi (untuk AI yang mengerjakan M6)

1. Fetch Garmin **hanya di server** (route handler / server component). Client menerima JSON `DashboardData` siap-render.
2. Semua transformasi (normalisasi rute, format angka id-ID, label relatif waktu "Hari ini") dilakukan di `lib/garmin.ts` / `lib/format.ts`.
3. Tangani error: jika fetch gagal → tampilkan state error per bagian (bukan halaman kosong); jika belum ada kredensial → fallback ke mock data dengan chip "Data contoh".
4. Jangan pernah menampilkan/menyimpan kredensial di sisi client; jangan log token.
5. Tambahkan revalidate/cache (mis. ISR 5–15 menit) agar tidak menembak API tiap request.
