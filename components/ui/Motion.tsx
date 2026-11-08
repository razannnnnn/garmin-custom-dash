"use client";

// components/ui/Motion.tsx — primitif gerak bersama
//
// Semua animasi memakai transform/opacity saja (GPU) dan menghormati
// `prefers-reduced-motion` lewat MotionConfig di root.

import { animate, motion, useMotionValue, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

const EASE = [0.22, 0.8, 0.32, 1] as const;

export const riseVariants: Variants = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Wadah yang mengurutkan anak-anaknya muncul berurutan. */
export function Stagger({
  children,
  delay = 0,
  step = 0.06,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  step?: number;
  className?: string;
  as?: "div" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "section" ? motion.section : motion.div;

  if (reduce) return <Comp className={className}>{children}</Comp>;

  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: step, delayChildren: delay } },
      }}
    >
      {children}
    </Comp>
  );
}

/** Anak dari <Stagger>. */
export function Rise({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = as === "section" ? motion.section : motion.div;

  if (reduce) return <Comp className={className}>{children}</Comp>;

  return (
    <Comp className={className} variants={riseVariants}>
      {children}
    </Comp>
  );
}

/** Bilah yang tumbuh ke lebar target saat pertama tampil. */
export function GrowBar({
  pct,
  className,
  style,
}: {
  pct: number;
  className?: string;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const width = `${Math.round(Math.min(1, Math.max(0, pct)) * 100)}%`;
  return <i className={className} style={{ ...style, width }} />;
}

/** Angka metrik utama (langsung tampil akurat sejak SSR). */
export function CountUp({
  value,
  className,
  suffix = "",
}: {
  value: number;
  className?: string;
  suffix?: string;
  duration?: number;
}) {
  return (
    <span className={className}>
      {value}
      {suffix}
    </span>
  );
}
