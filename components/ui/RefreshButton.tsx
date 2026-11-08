"use client";

// components/ui/RefreshButton.tsx — ambil ulang data dari server
//
// `router.refresh()` menjalankan ulang server component; cache Garmin
// di-bypass lewat revalidateTag di route handler agar angkanya benar-benar baru.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function RefreshButton({ label = "Muat ulang data" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const reduce = useReducedMotion();

  function refresh() {
    if (pending) return;
    window.dispatchEvent(new Event("gd:navigate-start"));

    startTransition(async () => {
      try {
        await fetch("/api/revalidate", { method: "POST" });
      } catch {
        // Gagal membuang cache bukan alasan menahan refresh UI.
      }
      router.refresh();
      window.dispatchEvent(new Event("gd:navigate-done"));

      setDone(true);
      setTimeout(() => setDone(false), 1600);
    });
  }

  return (
    <button
      type="button"
      className="iconbtn refresh"
      onClick={refresh}
      disabled={pending}
      aria-label={pending ? "Sedang memuat ulang" : label}
      title={done ? "Diperbarui" : pending ? "Memuat…" : label}
      data-state={pending ? "loading" : done ? "done" : "idle"}
    >
      <motion.span
        style={{ display: "inline-flex" }}
        animate={pending && !reduce ? { rotate: 360 } : { rotate: 0 }}
        transition={
          pending && !reduce
            ? { duration: 0.9, repeat: Infinity, ease: "linear" }
            : { duration: 0.25 }
        }
      >
        <RefreshCw size={16} aria-hidden="true" strokeWidth={1.75} />
      </motion.span>
    </button>
  );
}
