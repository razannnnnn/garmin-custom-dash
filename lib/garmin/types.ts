// lib/garmin/types.ts — kontrak UI (bentuk siap-render)
//
// Aturan: data yang tidak tersedia = `null` → UI merender "—".

import type { Coord, TrackPoint } from "./geo";

export type ColorToken = "accent" | "heart" | "sleep" | "batt" | "stress" | "run";

export interface Period {
  score: number | null;
  label: string | null;
  note: string | null;
  parts: { l: string; v: string; p: number | null }[];
}

export interface SnapRow {
  i: string;
  c: ColorToken;
  l: string;
  v: string;
  u?: string;
  p?: number | null;
  d?: string | null;
}

export interface StatCell {
  i: string;
  c: ColorToken;
  l: string;
  v: string;
  u?: string;
  p: number | null;
}

export interface DayValue {
  d: string;
  v: number | null;
  date: string;
  seg?: { v: number; color: string; label: string }[] | null;
}

export interface SleepStage {
  n: string;
  m: number;
  c: ColorToken;
}

export interface SleepInfo {
  score: number | null;
  total: string | null;
  bed: string | null;
  wake: string | null;
  eff: string | null;
  stress: number | null;
  note: string | null;
  stages: SleepStage[];
}

export interface ZoneItem {
  z: string;
  m: number | null;
  c: string;
}

export interface ActivityRow {
  id: string;
  i: string;
  c: ColorToken;
  t: string;
  when: string;
  date: string;
  tag: string;
  typeKey: string;
  dist: string | null;
  pace: string | null;
  dur: string | null;
  hr: string | null;
  elev: string | null;
  cal: string | null;
  cad: string | null;
  power: string | null;
  geo?: Coord[] | null;
  location?: string | null;
}

export interface SplitRow {
  n: number;
  dist: string;
  pace: string;
  hr: string | null;
  elev: string | null;
  cad: string | null;
  power: string | null;
  active: boolean;
}

export interface ActivityDetail extends ActivityRow {
  desc: string | null;
  location: string | null;
  startedAt: string | null;
  maxHr: string | null;
  cadMax: string | null;
  trainingEffect: string | null;
  anaerobEffect: string | null;
  track: TrackPoint[];
  splits: SplitRow[];
  zones: ZoneItem[];
  bestSplits: { label: string; value: string }[];
}

export interface Overview {
  user: string;
  connected: boolean;
  warnings: string[];
  readiness: Period;
  readinessSupported: boolean;
  snap: SnapRow[];
  stats: StatCell[];
  trainingStatus: { label: string | null; note: string | null } | null;
  steps: DayValue[];
  goal: number;
  stress: DayValue[];
  sleep: SleepInfo;
  recent: ActivityRow[];
}

export interface AnalyticsData {
  warnings: string[];
  restingHr: DayValue[];
  hrv: DayValue[];
  sleepDuration: DayValue[];
  sleepScore: DayValue[];
  stress: DayValue[];
  vo2max: DayValue[];
  load: DayValue[];
  paceSeries: DayValue[];
  cadence: DayValue[];
  power: DayValue[];
  bodyBattery: DayValue[];
  zones: ZoneItem[];
  totals: {
    distance: string | null;
    duration: string | null;
    activities: number;
    elevation: string | null;
    avgHr: string | null;
    avgCadence: string | null;
    avgPower: string | null;
  };
}

export interface ActivityList {
  warnings: string[];
  rows: ActivityRow[];
  types: { key: string; label: string; count: number }[];
}
