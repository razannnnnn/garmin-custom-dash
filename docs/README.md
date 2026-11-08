# Garmin Dash — Dokumentasi Proyek

Dashboard kebugaran personal: satu halaman, data dari Garmin Connect,
peta rute asli untuk setiap aktivitas outdoor.

Stack: **Next.js 16.4.3** (App Router, `cacheComponents`) · React 19.3 ·
Tailwind 4 · framer-motion 14 · lucide-react 1.61 · **maplibre-gl 6** (baru).

---

## Baca dokumen dalam urutan ini

| # | Dokumen | Isi |
|---|---|---|
| 1 | [`01-audit.md`](./01-audit.md) | 20 bug/error yang ditemukan, bukti, dan perbaikannya |
| 2 | [`02-architecture.md`](./02-architecture.md) | Struktur folder, alur data server→client, keputusan |
| 3 | [`03-design.md`](./03-design.md) | Arah redesign, token, aturan komponen, daftar "jangan" |
| 4 | [`04-maps.md`](./04-maps.md) | Integrasi peta: library, tile, sumber GPS, fallback |
| 5 | [`05-data-contract.md`](./05-data-contract.md) | Kontrak tipe kanonik server↔UI |
| 6 | [`06-plan.md`](./06-plan.md) | Rencana eksekusi berfase + Definition of Done |
| 7 | [`07-runbook.md`](./07-runbook.md) | Perintah, perpanjang token, debugging |

---

## Aturan kerja yang mengikat

1. **Server-only untuk kredensial.** `GARMIN_PERSONAL_API_KEY` tidak boleh
   pernah muncul di bundle client, log, atau HTML.
2. **Jangan mengarang angka.** Field yang tidak tersedia dari Garmin = `null`.
   UI menampilkan `—`, bukan angka default.
3. **Peta harus asli.** Tidak ada lagi latar `repeating-linear-gradient`
   yang menyerupai jalan. Kalau tidak ada GPS, tidak ada peta.
4. **Satu aksen, satu skala radius, satu sistem elevasi** (lihat `03-design.md`).
5. **`npm run typecheck` wajib lulus** sebelum menyatakan selesai.

---

## Mulai cepat

```bash
npm install          # maplibre-gl ikut terpasang
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # build produksi
```

Tanpa token yang valid aplikasi tetap jalan penuh dengan **data contoh**,
dan UI menyatakan itu secara eksplisit di strip sumber data.

---

## Status

| Area | Status |
|---|---|
| Scaffold + token desain | selesai |
| Beranda / Tidur / Latihan | selesai, di-redesign |
| Aktivitas + peta asli | selesai (butuh token valid untuk data nyata) |
| GPS dari Garmin | terpasang, **belum terverifikasi live** (token kedaluwarsa) |
| Skeleton / error / empty state | selesai |
| Lint + typecheck di CI | typecheck ada, lint belum |
