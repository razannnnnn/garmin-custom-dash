"use client";

// components/ui/MotionProvider.tsx — setelan gerak global
//
// `reducedMotion="user"` membuat SEMUA animasi framer-motion otomatis mati
// ketika sistem meminta reduced motion, tanpa perlu cek di setiap komponen.

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
