// app/loading.tsx — skeleton yang meniru bentuk layout akhir (bukan spinner)

export default function Loading() {
  return (
    <main className="wrap" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat ringkasan kebugaran…</span>

      <div className="greet">
        <div className="skeleton" style={{ height: 26, width: "46%", maxWidth: 320 }} />
        <div className="skeleton" style={{ height: 11, width: "34%", maxWidth: 220 }} />
      </div>

      <div className="hero">
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton" style={{ height: 46, width: 92 }} />
            <div className="skeleton" style={{ height: 5, width: 96 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton" style={{ height: 16, width: "58%" }} />
            <div className="skeleton" style={{ height: 11, width: "100%" }} />
            <div className="skeleton" style={{ height: 11, width: "84%" }} />
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              <div className="skeleton" style={{ height: 30, width: 74 }} />
              <div className="skeleton" style={{ height: 30, width: 74 }} />
              <div className="skeleton" style={{ height: 30, width: 74 }} />
            </div>
          </div>
        </div>

        <div className="ledger">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 0",
                borderTop: i === 0 ? "0" : "var(--hair)",
              }}
            >
              <div className="skeleton" style={{ height: 30, width: 30, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 12, flex: 1, maxWidth: 130 }} />
              <div className="skeleton" style={{ height: 18, width: 56 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="sec">
        <div className="skeleton" style={{ height: 13, width: 120 }} />
        <div className="rail">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
              <div className="skeleton" style={{ height: 26, width: 26, borderRadius: 7 }} />
              <div className="skeleton" style={{ height: 11, flex: 1, maxWidth: 90 }} />
              <div className="skeleton" style={{ height: 15, width: 48 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="cols">
        {[0, 1].map((i) => (
          <div key={i} className="sec">
            <div className="skeleton" style={{ height: 13, width: 140 }} />
            <div className="skeleton" style={{ height: 110, width: "100%", marginTop: 14 }} />
          </div>
        ))}
      </div>
    </main>
  );
}
