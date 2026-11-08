// lib/garmin/fmt.ts — pemformat angka & waktu (locale id-ID, zona Jakarta)

export const TZ = "Asia/Jakarta";
const DASH = "—";

export const orDash = (v: string | null | undefined): string =>
  v === null || v === undefined || v === "" ? DASH : v;

export const num = (v: number | null | undefined, digits = 0): string | null =>
  typeof v === "number" && Number.isFinite(v)
    ? v.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : null;

/** Detik → "1:02:03" atau "12:34". */
export function dur(sec: number | null | undefined): string | null {
  if (typeof sec !== "number" || !Number.isFinite(sec) || sec <= 0) return null;
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}

/** Menit → "1j 46m". */
export function hm(min: number | null | undefined): string | null {
  if (typeof min !== "number" || !Number.isFinite(min) || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

/** m/s → "5:12 /km". */
export function paceFromSpeed(mps: number | null | undefined): string | null {
  if (typeof mps !== "number" || !Number.isFinite(mps) || mps <= 0.3) return null;
  const secPerKm = 1000 / mps;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  const carry = sec === 60 ? 1 : 0;
  return `${min + carry}:${String(sec === 60 ? 0 : sec).padStart(2, "0")}`;
}

/** meter → "8,4 km". */
export function km(meters: number | null | undefined): string | null {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) return null;
  return (meters / 1000).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

/** "YYYY-MM-DD" atau timestamp → "HH.MM" waktu Jakarta. */
export function clock(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined || input === "") return null;
  const d = new Date(typeof input === "number" ? input : input);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(":", ".");
}

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+07:00`);
  return Number.isNaN(d.getTime()) ? "" : HARI[d.getUTCDay()];
}

/** "2026-11-03 05:14:00" (waktu dinding) → "Sel, 3 Nov · 05.14". */
export function wallWhen(local: string | null | undefined): { label: string; date: string } {
  const m = local?.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return { label: "Tanggal tidak diketahui", date: "" };
  const [, date, hh, mm] = m;
  const rel = relativeDay(date);
  const dayStr = rel ?? `${dayLabel(date)}, ${tanggalPendek(date)}`;
  return { label: `${dayStr} · ${hh}.${mm}`, date };
}

/** "Hari ini" / "Kemarin" / null untuk tanggal lain. */
export function relativeDay(date: string): string | null {
  const today = jakartaDate();
  if (date === today) return "Hari ini";
  const y = new Date(`${today}T12:00:00+07:00`);
  y.setUTCDate(y.getUTCDate() - 1);
  const yStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(y);
  return date === yStr ? "Kemarin" : null;
}

/** Jam sekarang di Jakarta sebagai "HH.MM". */
export function nowClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(":", ".");
}

export function jakartaDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return jakartaDate(d);
}

export function lastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => daysAgo(n - 1 - i));
}

/** Rata-rata aman; null bila tidak ada nilai. */
export function safeAvg(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function avgInt(values: (number | null | undefined)[]): string | null {
  const a = safeAvg(values);
  return a === null ? null : num(Math.round(a));
}

export function tanggal(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function salam(nama: string, jam: number): string {
  const s = jam < 4 ? "Selamat malam" : jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam";
  return `${s}, ${nama}`;
}

export function jakartaHour(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)
  );
}

export function tanggalPendek(date: string): string {
  const d = new Date(`${date}T12:00:00+07:00`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
  }).format(d);
}
