"use client";

// app/error.tsx — batas galat tingkat route

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] galat tak tertangani:", error.message);
  }, [error]);

  return (
    <main className="wrap" role="alert">
      <div className="vhead">
        <h2>Ada yang gagal dimuat</h2>
        <p>
          Sebagian data tidak bisa diambil. Coba muat ulang; kalau tetap gagal, periksa
          koneksi dan token Garmin.
        </p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="iconbtn" style={{ width: "auto", padding: "0 14px", height: 34 }} onClick={reset}>
          Coba lagi
        </button>
        <a href="/" style={{ fontSize: 13, color: "var(--accent)" }}>
          Kembali ke beranda
        </a>
      </div>

      {error.digest ? (
        <p className="mono" style={{ fontSize: 10.5, color: "var(--mute)" }}>
          kode: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
