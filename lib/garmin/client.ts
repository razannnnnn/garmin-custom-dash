// lib/garmin/client.ts — singleton klien Garmin Connect (server-only)
//
// Token memberi akses penuh ke akun, jadi file ini tidak boleh diimpor dari
// Client Component. Library memakai node:crypto → semua pemanggil wajib
// `runtime = "nodejs"`.

import { GarminClient, Garmin, FileTokenStore } from "garminconnect-js";
import { jakartaDate, daysAgo } from "./fmt";

export const TOKEN_DIR = process.env.GARMIN_TOKEN_DIR ?? "./.garmin-tokens";

export type ConnState =
  | { connected: true; name: string }
  | { connected: false; reason: "no-token" | "expired" };

export class GarminNotConnected extends Error {
  constructor(public reason: "no-token" | "expired") {
    super(reason === "no-token" ? "Belum login ke Garmin" : "Token Garmin kedaluwarsa");
    this.name = "GarminNotConnected";
  }
}

let instance: Garmin | null = null;

export function newClient(): GarminClient {
  return new GarminClient({ tokenStore: new FileTokenStore(TOKEN_DIR) });
}

/** Klien siap pakai; melempar GarminNotConnected bila token tidak ada. */
export async function garmin(): Promise<Garmin> {
  if (instance) return instance;

  const client = newClient();
  if (!(await client.loadTokens())) throw new GarminNotConnected("no-token");

  instance = new Garmin(client);
  return instance;
}

/** Buang instance cache setelah login/logout agar token baru dipakai. */
export function resetGarmin() {
  instance = null;
}

/** Cek status sambungan tanpa melempar. */
export async function connectionState(): Promise<ConnState> {
  const client = newClient();
  if (!(await client.loadTokens())) return { connected: false, reason: "no-token" };

  try {
    const profile = await new Garmin(client).getUserProfile();
    const name = profile?.fullName ?? profile?.displayName ?? "Pengguna Garmin";
    return { connected: true, name: String(name) };
  } catch {
    return { connected: false, reason: "expired" };
  }
}

export const jkDate = jakartaDate;
export const jkDaysAgo = daysAgo;
