// app/not-found.tsx

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="vhead">
        <h2>Halaman tidak ditemukan</h2>
        <p>Alamat ini tidak ada di dashboard.</p>
      </div>
      <a href="/" style={{ fontSize: 13, color: "var(--accent)" }}>
        Kembali ke beranda
      </a>
    </main>
  );
}
