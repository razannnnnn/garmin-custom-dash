# 07 — Runbook

## Perintah

```bash
npm install          # termasuk maplibre-gl & menyalin web worker
npm run garmin:login # login akun Garmin via terminal (opsional, bisa juga lewat /connect)
npm run dev          # dev server
npm run typecheck    # tsc --noEmit
npm run build        # build produksi
npm start            # jalankan hasil build
```

---

## Menghubungkan / Memperbarui Sesi Garmin

Token disimpan di `.garmin-tokens/` (`oauth1_token.json` & `oauth2_token.json`). Tidak perlu lagi `GARMIN_PERSONAL_API_KEY`.

### Opsi 1 — Lewat Browser
Buka `/connect` (atau klik **Putuskan Garmin** di sidebar lalu login ulang). Mendukung MFA/OTP.

### Opsi 2 — Lewat Terminal
```bash
npm run garmin:login
```

---

## Diagnosa Cepat

| Gejala | Sebab | Tindakan |
|---|---|---|
| Muncul kartu "Belum terhubung ke Garmin" | `.garmin-tokens/` belum ada | Login lewat `/connect` atau `npm run garmin:login` |
| Muncul kartu "Sesi Garmin berakhir" | Token kedaluwarsa / dicabut | Klik **Masuk ulang** di `/connect` |
| Sebagian angka tampil `—` | Perangkat tidak merekam metrik tsb hari ini | Normal — aplikasi tidak pernah mengarang angka default |
| Peta kosong, ada pesan galat | `tiles.openfreemap.org` tidak terjangkau | Cek koneksi/adblock lalu klik **Coba lagi** |
| Aktivitas tanpa peta | Aktivitas indoor / tanpa GPS | Normal — tampil empty state "Tanpa rute GPS" |
