# Garmin Dash v2 — Migrasi ke `garminconnect-js` + Redesign Navigasi

> Rencana eksekusi. **Belum ada kode yang diubah** — dokumen ini menunggu `/start-work`.
> Disusun: 2026-11-04

---

## 1. Ringkasan Keputusan

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Library | **`garminconnect-js@0.11.0`** | TypeScript, zero-dependency, 201 method live-verified, eksplisit mendukung Next.js server, MFA, token store, `connectapi()` untuk endpoint apa pun |
| Auth | **Email + password → OAuth1/OAuth2 token store** | Menggantikan Personal API key yang hanya membuka ~8 endpoint |
| Runtime | `export const runtime = "nodejs"` di semua route | Library memakai `node:crypto` + `Buffer` |
| Navigasi | Sidebar (desktop) + bottom nav (mobile) | Permintaan eksplisit |

---

## 2. Riset: Kenapa Library Ini

### Kandidat yang dievaluasi

| Library | Bahasa | Stars | Method | Verdict |
|---|---|---|---|---|
| **`garminconnect-js`** | TS | 2 | **201** | ✅ **Dipilih** — live-verified, MFA, Next.js-ready, zero-dep |
| `garmin-connect` (Pythe1337N) | JS | ~300 | ~20 | ❌ MFA belum diimplementasi |
| `@flow-js/garmin-connect` | JS | — | — | ❌ Fork, aktivitas rendah |
| `garmin-connect-client` | TS | — | — | ❌ 9 dependencies |
| `python-garminconnect` | Py | 3.2k | banyak | ❌ Bukan Node — perlu Python sidecar |

`garminconnect-js` memang baru (Sep 2026, 2 stars), tetapi: satu maintainer aktif (262 kontribusi), metode diberi label *live-verified* per tanggal, dan README-nya secara eksplisit menargetkan Next.js. Alternatif JS lain kalah pada MFA.

### Cakupan data (201 method)

| Kategori | Method | Yang dipakai project |
|---|---|---|
| Activities | 39 | `getActivities`, `getActivity`, `getActivityDetails`, `getActivitySplits`, `getActivitySplitSummaries`, `getActivityHrInTimezones`, `countActivities` |
| Wellness | 35 | `getSleepData`, `getHrvData`, `getDailySummary`, `getBodyBattery`, `getStressData`, `getStepsData`, `getRespiration`, `getSpO2`, `getDailyHeartRate` |
| Training metrics | 18 | **`getTrainingReadiness`** (resmi!), `getTrainingStatus`, `getMaxMetrics` (VO₂max), `getHeartRateZones`, `getRacePredictions`, `getEnduranceScore`, `getHillScore`, `getFitnessAgeData`, `getLactateThreshold` |
| Profile & misc | 30 | `getUserProfile` (nama asli), `getUserSettings` |
| Lainnya | 79 | Badges, gear, devices, workouts, courses, body composition |

### Yang berubah drastis dari versi Personal API

| Data | Sebelum (Personal API) | Sesudah (library) |
|---|---|---|
| Training Readiness | ❌ estimasi karangan | ✅ **resmi dari Garmin** |
| CTL / ATL / TSB | ❌ `—` | ✅ training status + load |
| VO₂ Max | ❌ `—` | ✅ `getMaxMetrics` |
| Splits per km | ❌ tidak ada | ✅ `getActivitySplits` |
| Cadence | ❌ tidak ada | ✅ field activity + splits |
| Power | ❌ tidak ada | ✅ `avgPower`, `normPower`, power zones |
| Daya (battery) | ❌ tidak ada | ✅ Body Battery intraday |
| Elevasi per split | ❌ tidak ada | ✅ di splits |
| Cuaca aktivitas | ❌ | ✅ `getActivityWeather` |

---

## 3. Perubahan Arsitektur

### 3.1 Lapisan auth — buang API key sepenuhnya

**Dihapus:**
- `obtainAccessToken()`, `cachedToken`, `jwtExpiryMs()`, `withTokenRetry()`
- `TOKEN_PATH`, `readApiKey()`, header `Authorization: ApiKey`
- `scripts/garmin-token.mjs`, skrip npm `garmin:token`
- `GARMIN_PERSONAL_API_KEY` dari `.env.local`

**Ditambahkan:**
- `lib/garmin/client.ts` — singleton `GarminClient` + `Garmin`

```ts
// lib/garmin/client.ts
import { GarminClient, Garmin, FileTokenStore } from "garminconnect-js";

let cached: Garmin | null = null;

export async function garmin(): Promise<Garmin> {
  if (cached) return cached;
  const client = new GarminClient({
    tokenStore: new FileTokenStore(process.env.GARMIN_TOKEN_DIR ?? "./.garmin-tokens"),
  });
  if (!(await client.loadTokens())) throw new GarminNotConnected();
  cached = new Garmin(client);
  return cached;
}
```

- `scripts/garmin-login.mjs` — login sekali di terminal, simpan token, dukung MFA

```bash
npm run garmin:login          # prompt email/password/MFA
```

- `.gitignore`: tambah `.garmin-tokens/`
- `.env.local`: `GARMIN_TOKEN_DIR=./.garmin-tokens` (opsional)

**Env baru (hanya dipakai skrip login, tidak pernah oleh app):**
`GARMIN_EMAIL`, `GARMIN_PASSWORD` — opsional, untuk login non-interaktif.

### 3.2 `lib/garmin.ts` ditulis ulang

Struktur baru:

```
lib/garmin/
├── client.ts       singleton + error type
├── types.ts        kontrak DashboardData (revisi)
├── overview.ts     data ringkasan (readiness, wellness, metrics)
├── analytics.ts    seri waktu 7/30/90 hari
├── activities.ts   list + detail + splits
└── format.ts       (dipindah dari lib/format.ts, ditambah helper pace/power)
```

Aturan tetap dari `docs/README.md`:
1. Kredensial hanya di server — **dan sekarang token bisa membuka seluruh akun**, jadi `.garmin-tokens/` wajib gitignore + `chmod 600`.
2. Tidak mengarang angka. Field kosong → `null` → `—`.
3. `npm run typecheck` wajib hijau.

### 3.3 Rute baru (App Router)

```
app/
├── layout.tsx              root: MotionProvider + AppShell
├── (app)/
│   ├── layout.tsx          sidebar/bottom-nav + slot konten
│   ├── page.tsx            → redirect /overview
│   ├── overview/page.tsx
│   ├── analytics/page.tsx
│   ├── activities/
│   │   ├── page.tsx        list
│   │   └── [id]/page.tsx   detail gaya Strava
│   └── coach/page.tsx      coming soon
└── api/
    └── revalidate/route.ts (dipertahankan)
```

Halaman lama (`app/page.tsx`, komponen `views/*`) **dihapus** setelah migrasi konten.

---

## 4. Desain UI/UX

Mengikuti **craft floor NeedMCP** yang sudah dimuat. Konflik yang disadari dan diselesaikan:

| Aturan floor | Kondisi project | Resolusi |
|---|---|---|
| "Marquee angka besar = hero-metric template (ditolak)" | Dashboard kebugaran wajib menonjolkan skor | **Override dinamai**: angka besar hanya di 1 tempat (Overview hero), bukan di setiap kartu. Kartu lain memakai baris metrik, bukan angka raksasa |
| "Sparkline/progress ring sebagai pengganti konten (ditolak)" | Grafik diminta eksplisit | Grafik dipakai untuk **deret waktu nyata** (7/30 hari), bukan dekorasi; sumbu dan label hadir |
| "Eyebrow dekoratif (ditolak)" | — | Tidak ada eyebrow; judul section langsung |
| Tracking ≥ -0.04em | — | Maksimum -0.03em |
| Kontras ≥ 4.5:1 | — | Token warna diaudit ulang (sudah lolos sebelum: 7.75:1) |

### 4.1 Shell responsif

| Viewport | Navigasi |
|---|---|
| ≥ 1024px | **Sidebar kiri 240px** sticky: brand, 4 item (ikon + label), status sinkron di bawah |
| 768–1023px | Sidebar jadi rail 72px (ikon saja, label via `title`/tooltip) |
| < 768px | **Bottom nav 4 item** sticky, `safe-area-inset-bottom`, target sentuh ≥ 48px |

Item: **Overview · Analytics · Aktivitas · Coach**

### 4.2 Overview — semua ringkasan

1. **Hero readiness resmi** — skor Garmin asli + label + komponen (tidur, HRV, beban, recovery)
2. **Ledger hari ini** — Body Battery, RHR (+delta 7 hari), stres, kalori
3. **Rail 6 metrik** — langkah, tidur, intensitas, HRV, VO₂ Max, fitness age
4. **Training status** — label status + interpretasi
5. **Dua grafik** — langkah 7 hari, stres 7 hari
6. **Aktivitas terakhir** — 3 baris ringkas + tautan ke list

### 4.3 Analytics — data penting & grafik

Dikelompokkan, bukan satu dinding grafik:

| Grup | Isi |
|---|---|
| **Jantung** | RHR 30 hari, HRV 30 hari, zona HR, HR maks |
| **Tidur** | durasi bertumpuk fase 14 hari, skor, efisiensi |
| **Lari** | pace per aktivitas, cadence, stride length, ground contact |
| **Daya** | power avg/norm, power zones, Body Battery intraday |
| **Beban** | VO₂max trend, training load, endurance/hill score |
| **Stres** | level harian 7/30 hari |

Grafik: satu komponen `TimeSeries` (SVG, tanpa library baru) + `WeekBars` yang sudah ada.

### 4.4 Aktivitas — list → detail gaya Strava

**List**
- Filter tipe (Semua / Lari / Jalan / Sepeda / Kekuatan)
- Baris: ikon tipe, nama, tanggal, jarak, pace, durasi, avg HR
- Klik → `/activities/[id]`

**Detail** (`/activities/[id]`)
1. Header: nama, tanggal, lokasi, tipe
2. **Stat grid** — Jarak · Durasi · Pace rata-rata · Avg HR · Elevasi gain · Kalori
3. **Peta** rute (MapLibre, sudah ada)
4. **Grafik elevasi** + HR sepanjang sesi (dari `getActivityDetails` metrics)
5. **Splits per km** — tabel: km, pace, HR avg, elevasi, cadence
6. **Zona HR** di sesi ini
7. Cuaca (jika ada)

### 4.5 Coach — coming soon

Halaman statis bernada jelas (bukan tombol mati):
- Judul + penjelasan konsep
- Daftar data yang akan dibaca AI (readiness, sleep, HRV, load, splits)
- Badge "Segera hadir"
- Tidak ada input yang tidak berfungsi

### 4.6 Gerak (Framer Motion — sudah terpasang)

Satu momen authored per halaman: rise+stagger saat masuk. Grafik tumbuh sekali. Bar chart tetap interaktif. Semua lewat `MotionConfig reducedMotion="user"`.

---

## 5. Rencana Eksekusi Berfase

### Fase 0 — Persiapan (blocker)
- [ ] `npm install garminconnect-js@0.11.0`
- [ ] `.gitignore`: `.garmin-tokens/`
- [ ] `scripts/garmin-login.mjs` (login + MFA + simpan token)
- [ ] `npm run garmin:login` → verifikasi token tersimpan
- [ ] Smoke test: satu panggilan `getUserProfile()` berhasil

**Selesai bila:** token ada di `.garmin-tokens/`, `getUserProfile()` mengembalikan nama asli.

### Fase 1 — Lapisan data
- [ ] `lib/garmin/client.ts` + `GarminNotConnected` error
- [ ] Hapus seluruh logic API key dari `lib/garmin.ts`
- [ ] `lib/garmin/overview.ts` — readiness resmi, wellness, metrics
- [ ] `lib/garmin/analytics.ts` — seri 7/30 hari (sleep, HRV, stress, steps, VO₂max)
- [ ] `lib/garmin/activities.ts` — list + detail + splits
- [ ] Revisi `lib/types.ts` untuk bentuk baru
- [ ] Hapus `scripts/garmin-token.mjs`, `npm run garmin:token`

**Selesai bila:** `tsc` lulus; `fetchOverview()` mengembalikan readiness **resmi** (bukan estimasi).

### Fase 2 — Shell & navigasi
- [ ] `components/shell/Sidebar.tsx` (240px / rail 72px)
- [ ] `components/shell/BottomNav.tsx` (< 768px)
- [ ] `app/(app)/layout.tsx`, `app/page.tsx` → redirect
- [ ] Hapus `components/TabBar.tsx`, `components/views/*`, `app/page.tsx` lama
- [ ] Tema & `TopBar` dipertahankan, disesuaikan

**Selesai bila:** 4 menu dapat diakses di 360px, 768px, 1440px; tidak ada scroll horizontal.

### Fase 3 — Overview
- [ ] Hero readiness + komponen
- [ ] Ledger + rail 6 + training status
- [ ] Grafik langkah & stres
- [ ] 3 aktivitas terakhir

### Fase 4 — Analytics
- [ ] Komponen `TimeSeries` (SVG)
- [ ] Enam grup data
- [ ] Empty state per grup saat data kosong

### Fase 5 — Aktivitas + detail
- [ ] List + filter tipe
- [ ] Detail: stat grid, peta, elevasi, splits per km, zona HR, cuaca
- [ ] Loading skeleton & error state per rute

### Fase 6 — Coach
- [ ] Halaman coming soon

### Fase 7 — Verifikasi
- [ ] `npx tsc --noEmit` → 0 error
- [ ] `npm run build` → sukses
- [ ] Test browsermcp: desktop 1440px (sidebar), 768px (rail), 390px (bottom nav)
- [ ] Klik semua menu, buka 1 detail aktivitas, cek splits tampil
- [ ] Tidak ada token/kredensial di bundle client (`grep -r GCDC_ .next/static` kosong — sekarang juga `grep -r oauth .next/static`)
- [ ] Update `GARMIN_API.md`, `docs/07-runbook.md`

---

## 6. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Library 0.x, API bisa berubah | Build rusak saat update | Pin versi **tepat** (`0.11.0`, tanpa `^`) |
| Garmin rate-limit login | Tidak bisa login berulang | Token store (30 hari) — login sekali saja |
| Endpoint tidak resmi bisa berubah | Data hilang mendadak | Setiap pemanggilan dibungkus `try/catch` → `warnings[]`, UI tampilkan `—` |
| Token membuka seluruh akun | Risiko keamanan lebih besar dari API key | `.garmin-tokens/` gitignore + `chmod 600`, tidak pernah di-log, tidak pernah ke client |
| MFA | Login gagal diam-diam | Skrip login interaktif menangani MFA |
| `getActivitySplits` kosong untuk aktivitas indoor | Tabel splits kosong | Empty state "Aktivitas ini tanpa GPS/splits" |
| Rate limit saat Analytics memanggil 30 hari | Halaman lambat | Cache per-rute (`cacheLife`), panggilan paralel dibatasi |

---

## 7. Yang Tidak Berubah

- Prinsip **tidak mengarang angka** — tetap
- **Tema 3-status** via cookie + skrip blocking — tetap
- **MapLibre + OpenFreeMap** — tetap
- **Framer Motion** — tetap
- `app/api/revalidate` — tetap
- Bahasa UI Indonesia, locale `id-ID` — tetap

---

## 8. Definition of Done

1. `npx tsc --noEmit` dan `npm run build` hijau.
2. Login Garmin lewat akun (bukan API key), token tersimpan lokal & gitignored.
3. Tidak ada satu pun referensi `GARMIN_PERSONAL_API_KEY` / Bearer token tersisa.
4. Empat menu berfungsi di desktop (sidebar) dan mobile (bottom nav), tanpa scroll horizontal.
5. Detail aktivitas menampilkan: jarak, pace, avg HR, elevasi, durasi, **dan splits per km**.
6. Data yang tidak tersedia tampil `—` atau empty state, tidak pernah angka default.
7. Tidak ada kredensial di output client.
