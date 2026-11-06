# 06 — Rencana Eksekusi

Referensi: `01-audit.md` (apa yang diperbaiki), `03-design.md` (bagaimana
tampil), `04-maps.md` + `05-data-contract.md` (kontrak).

---

## Fase 0 — Fondasi

- [ ] `npm install maplibre-gl@^6.16.0`
- [ ] `package.json`: tambah `"typecheck": "tsc --noEmit"`
- [ ] Verifikasi `npx tsc --noEmit` lulus pada kode yang ada (baseline)

**Selesai bila:** dependency terpasang, typecheck baseline hijau.

---

## Fase 1 — Lapisan data (blocker untuk semua fase lain)

- [ ] `lib/types.ts` → kontrak baru (`05-data-contract.md`): semua field
      opsional menjadi `| null`, tambah `source`, `warnings`, `Activity.geo`,
      `DayValue.date`, `Activity.id`. Hapus `Activity.map`.
- [ ] `lib/format.ts` → semua tanggal/jam di `Asia/Jakarta`; helper
      `formatJam`, `toJakartaDate`, `safeAvg`, `fmtOrDash`.
- [ ] `lib/garmin.ts`
  - [ ] `resolveSource()`: bedakan `no-key` / `expired` / `rejected` / `ok`
  - [ ] validasi JWT `exp` sebelum request
  - [ ] semua fallback angka karangan → `null` (audit P1)
  - [ ] `fetchActivityDetails()` + `toCoords()` + `downsample()` (`04-maps.md`)
  - [ ] urutkan `week` & `sleep.week` naik, isi 7 slot berdasarkan tanggal
  - [ ] intensitas = `moderate + 2×vigorous`
  - [ ] `warnings[]` diisi dari endpoint yang gagal
- [ ] `lib/mock-data.ts` → bentuk baru + rute Jakarta nyata (`[lon,lat]`)
      untuk 3 aktivitas outdoor, 1 indoor tanpa GPS

**Selesai bila:** `npm run typecheck` lulus; `fetchDashboard()` mengembalikan
`source: "demo"` + `warnings` berisi alasan token.

---

## Fase 2 — Sistem desain & shell

- [ ] `app/globals.css` ditulis ulang mengikuti `03-design.md` §3–§4
      (token baru, satu elevasi, mono hanya untuk angka, tanpa glow,
      tanpa grid hias, radius 3 nilai)
- [ ] `app/layout.tsx`: tema dari cookie (`gd-theme` = `system|light|dark`),
      set `data-theme` **di server**, tanpa flash
- [ ] `components/TopBar.tsx`: toggle 3 status, brand `href="/"`,
      chip sumber data (`live` / `demo` + alasan)
- [ ] `components/AppShell.tsx`: render semua view, visibilitas via
      `data-active`, tanpa `matchMedia`
- [ ] `components/TabBar.tsx`: `aria-controls`, tanpa remount
- [ ] `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`

**Selesai bila:** tidak ada flash tema; desktop tidak melompat; pindah tab
tidak memicu animasi ulang; `tsc` lulus.

---

## Fase 3 — Peta

- [ ] `components/map/ActivityMap.tsx` sesuai `04-maps.md` §4
- [ ] Hapus `components/charts/RouteMap.tsx`

**Selesai bila:** peta OpenFreeMap merender rute contoh di tab Aktivitas,
mengikuti tema, dan tidak hijack scroll.

---

## Fase 4 — View & kartu

- [ ] Beranda: hero readout + ledger + rail 6 + grafik langkah (tanpa card soup)
- [ ] Aktivitas: kartu unggulan berpeta + baris untuk sisanya + tombol
      "Perbesar peta"
- [ ] Tidur: skor numeral + bar fase + 7 malam
- [ ] Latihan: zona bertumpuk + 3 kolom beban
- [ ] `components/charts/WeekBars.tsx`: satu skala `y(v)` untuk batang &
      garis target; "hari ini" dari tanggal
- [ ] Semua angka `—` saat `null`; guard pembagian nol

**Selesai bila:** keempat tab benar pada 360px, 768px, 1440px; kedua tema;
`prefers-reduced-motion` mematikan animasi.

---

## Fase 5 — Verifikasi & debug

- [ ] `npx tsc --noEmit` → 0 error
- [ ] `npm run build` → sukses
- [ ] `npm run dev` + smoke test HTTP: `/` mengembalikan 200 dan memuat
      `data-source` demo
- [ ] Jalankan protokol `03-design.md` §7 (aksesibilitas) & `04-maps.md` §7
- [ ] Audit Lighthouse (mobile) — target ≥ 90 Performance/A11y

---

## Definition of Done

1. `npx tsc --noEmit` dan `npm run build` hijau.
2. Tidak ada angka karangan: setiap `null` tampil `—`.
3. Token kedaluwarsa terlihat oleh pengguna sebagai pesan, bukan data palsu.
4. Peta berasal dari tile nyata dengan geometri rute nyata (atau tidak ada peta).
5. Tidak ada glow, card soup, eyebrow berlebih, atau grid hias di CSS.
6. Kedua tema lolos tabel kontras `03-design.md` §3.
7. Tidak ada kredensial di output client (`grep -r GARMIN_PERSONAL .next/static` kosong).
