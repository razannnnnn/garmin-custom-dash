// lib/garmin/client.ts — klien Garmin Connect (server-only)
//
// Token akses disimpan di cookie browser milik pengguna (lihat cookie-store.ts),
// bukan di filesystem server. Karena itu klien tidak boleh di-cache global:
// setiap request membawa cookie pengguna sendiri.
//
// Library memakai node:crypto → semua pemanggil wajib `runtime = "nodejs"`.

import { GarminClient, Garmin } from "garminconnect-js";
import { CookieTokenStore, ReadOnlyCookieTokenStore } from "./cookie-store";
import { jakartaDate, daysAgo } from "./fmt";

export type ConnState =
  | { connected: true; name: string }
  | { connected: false; reason: "no-token" | "expired" };

export class GarminNotConnected extends Error {
  constructor(public reason: "no-token" | "expired") {
    super(reason === "no-token" ? "Belum login ke Garmin" : "Token Garmin kedaluwarsa");
    this.name = "GarminNotConnected";
  }
}

/**
 * Klien baru untuk dipakai saat render (Server Component).
 *
 * Memakai store read-only: Server Component tidak boleh mengubah cookie, dan token
 * hasil refresh akan tersimpan di request berikutnya lewat route handler.
 */
export function newClient(): GarminClient {
  return new GarminClient({ tokenStore: new ReadOnlyCookieTokenStore() });
}

// Cache per-request: satu Garmin per request agar panggilan berulang (mis. layout
// + page) berbagi profil yang sudah diambil, tanpa merembes ke request lain.
const PER_REQUEST = Symbol.for("gd.garmin.instance");

type Slot = { [PER_REQUEST]?: Promise<Garmin> };

function slot(): Slot {
  return globalThis as unknown as Slot;
}

/**
 * Klien siap pakai; melempar GarminNotConnected bila token tidak ada / kedaluwarsa.
 *
 * Aman dipanggil saat render karena store-nya read-only; lihat `flush()`.
 */
export async function garmin(): Promise<Garmin> {
  const bag = slot();
  if (!bag[PER_REQUEST]) {
    bag[PER_REQUEST] = build();
    // Jangan biarkan kegagalan menempel di slot; request berikutnya harus mencoba lagi.
    bag[PER_REQUEST].catch(() => {
      delete bag[PER_REQUEST];
    });
  }
  return bag[PER_REQUEST];
}

async function build(): Promise<Garmin> {
  const client = newClient();
  if (!(await client.loadTokens())) throw new GarminNotConnected("no-token");

  const g = new Garmin(client);

  // Pancing satu request supaya token yang hampir kedaluwarsa di-refresh sekarang,
  // jadi kegagalan auth terdeteksi sebagai "expired" dan bukan error 401 acak nanti.
  try {
    await g.getUserProfile();
  } catch (err) {
    throw new GarminNotConnected(isAuthError(err) ? "expired" : "no-token");
  }

  return g;
}

function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number; statusCode?: number } | null)?.status ??
    (err as { statusCode?: number } | null)?.statusCode;
  if (status === 401 || status === 403) return true;
  const message = err instanceof Error ? err.message : "";
  return /\b(401|403)\b|unauthori[sz]ed|refresh token expired|not authenticated/i.test(message);
}

/**
 * Simpan token hasil refresh ke cookie. HANYA boleh dipanggil dari Route Handler
 * atau Server Action — di Server Component Next.js menolak mengubah cookie.
 */
export async function flush(): Promise<void> {
  const pending = slot()[PER_REQUEST];
  if (!pending) return;
  const g = await pending.catch(() => null);
  if (!g) return;

  const tokens = g.client.getTokens();
  if (tokens) await new CookieTokenStore().save(tokens);
}

/** Lupakan instance request ini (dipakai setelah login/logout). */
export function resetGarmin() {
  delete slot()[PER_REQUEST];
}

/** Hapus token dari cookie browser. */
export async function clearTokens(): Promise<void> {
  resetGarmin();
  await new CookieTokenStore().clear();
}

/** Cek status sambungan tanpa melempar. */
export async function connectionState(): Promise<ConnState> {
  try {
    const g = await garmin();
    const profile = await g.getUserProfile();
    const name = profile?.fullName ?? profile?.displayName ?? "Pengguna Garmin";
    return { connected: true, name: String(name) };
  } catch (err) {
    if (err instanceof GarminNotConnected) return { connected: false, reason: err.reason };
    return { connected: false, reason: "expired" };
  }
}

export const jkDate = jakartaDate;
export const jkDaysAgo = daysAgo;
