// components/shell/nav.ts — definisi menu tunggal (dipakai sidebar & bottom nav)

export interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: "home" | "chart" | "activity" | "sparkles";
}

export const NAV: NavItem[] = [
  { href: "/overview", label: "Overview", hint: "Ringkasan hari ini", icon: "home" },
  { href: "/analytics", label: "Analytics", hint: "Tren & grafik", icon: "chart" },
  { href: "/activities", label: "Aktivitas", hint: "Riwayat & detail", icon: "activity" },
  { href: "/coach", label: "Coach", hint: "Segera hadir", icon: "sparkles" },
];
