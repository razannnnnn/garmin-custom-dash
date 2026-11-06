"use client";

// components/ui/RouteProgress.tsx — indikator loading saat navigasi & refresh
//
// Muncul sebagai garis tipis di bawah top bar. Hanya mengandalkan event
// Next.js; tidak ada polling, jadi nol biaya saat idle.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function RouteProgress() {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const start = () => {
      clear();
      setVisible(true);
      // Navigasi cepat (<180ms) tidak perlu memunculkan kilatan garis.
      timer.current = setTimeout(() => setVisible(false), 8000);
    };

    const done = () => {
      clear();
      timer.current = setTimeout(() => setVisible(false), 220);
    };

    window.addEventListener("gd:navigate-start", start);
    window.addEventListener("gd:navigate-done", done);

    return () => {
      clear();
      window.removeEventListener("gd:navigate-start", start);
      window.removeEventListener("gd:navigate-done", done);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="routeprogress"
          role="progressbar"
          aria-label="Memuat data"
          aria-valuetext="Memuat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {reduce ? (
            <span className="rp-fill static" />
          ) : (
            <span className="rp-fill" />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
