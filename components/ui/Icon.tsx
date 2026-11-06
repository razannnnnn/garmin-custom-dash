// components/ui/Icon.tsx — peta nama ikon (string dari data) → komponen Lucide
//
// Nama ikon datang dari layer data sebagai string kebab-case. Satu tempat
// pemetaan membuat data tetap serializable.

import {
  Activity,
  BatteryCharging,
  Bike,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Moon,
  Mountain,
  Route,
  Timer,
  TrendingUp,
  Wind,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { FC } from "react";

const ICONS: Record<string, FC<LucideProps>> = {
  activity: Activity,
  "battery-charging": BatteryCharging,
  bike: Bike,
  flame: Flame,
  footprints: Footprints,
  gauge: Gauge,
  "heart-pulse": HeartPulse,
  moon: Moon,
  mountain: Mountain,
  route: Route,
  timer: Timer,
  "trending-up": TrendingUp,
  wind: Wind,
  zap: Zap,
};

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, ...props }: IconProps) {
  const Component = ICONS[name] ?? Activity;
  return <Component strokeWidth={1.75} {...props} />;
}
