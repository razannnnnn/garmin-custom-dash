// lib/garmin/client.ts — klien Garmin Connect (server-only)
//
// Token disimpan di tabel `garmin_credentials` (Supabase), terenkripsi. Cookie
// browser hanya berisi ID kredensial, jadi aplikasi bisa melayani beberapa akun
// sekaligus dan tidak menyimpan state di memori proses.
//
// Library memakai node:crypto → semua pemanggil wajib `runtime = "nodejs"`.

import { GarminClient, Garmin } from "garminconnect-js";
import { DatabaseTokenStore, ReadOnlyDatabaseTokenStore, findCredential } from "./credential-store";
import { readSessionId } from "./session";
import { jakartaDate, daysAgo } from "./fmt";

export type ConnState =
  | { connected: true; name: string; email: string; credentialId: string }
  | { connected: false; reason: "no-session" | "expired" | "not-found" };

export class GarminNotConnected extends Error {
  constructor(public reason: "no-session" | "expired" | "not-found") {
    super(
      reason === "no-session"
        ? "Belum login ke Garmin"
        : reason === "not-found"
          ? "Kredensial tidak ditemukan"
          : "Token Garmin kedaluwarsa"
    );
    this.name = "GarminNotConnected";
  }
}

const PER_REQUEST = Symbol.for("gd.garmin.instance");
type Slot = { [PER_REQUEST]?: Promise<Garmin> };

function slot(): Slot {
  return globalThis as unknown as Slot;
}

/**
 * Klien untuk sesi saat ini. Melempar GarminNotConnected bila belum login.
 *
 * Memakai store read-only: Server Component tidak boleh menulis cookie/database.
 * Token hasil refresh disimpan oleh Route Handler lewat `persistTokens()`.
 */
export async function garmin(): Promise<Garmin> {
  const bag = slot();
  if (!bag[PER_REQUEST]) {
    bag[PER_REQUEST] = build();
    bag[PER_REQUEST].catch(() => {
      delete bag[PER_REQUEST];
    });
  }
  return bag[PER_REQUEST];
}

async function build(): Promise<Garmin> {
  const credentialId = await readSessionId();
  if (!credentialId) throw new GarminNotConnected("no-session");

  const client = new GarminClient({ tokenStore: new ReadOnlyDatabaseTokenStore(credentialId) });
  if (!(await client.loadTokens())) throw new GarminNotConnected("not-found");

  const g = new Garmin(client);
  try {
    await g.getUserProfile();
  } catch (err) {
    throw new GarminNotConnected(isAuthError(err) ? "expired" : "not-found");
  }
  return g;
}

function isAuthError(err: unknown): boolean {
  const status =
    (err as { status?: number; statusCode?: number } | null)?.status ??
    (err as { statusCode?: number } | null)?.statusCode;
  if (status === 401 || status === 403) return true;
  const message = err instanceof Error ? err.message : "";
  return /\b(401|403)\b|unauthori[sz]ed|refresh token expired|not authenticated/i.test(message);
}

/**
 * Simpan token hasil refresh ke database. Panggil dari Route Handler saja.
 */
export async function persistTokens(): Promise<void> {
  const pending = slot()[PER_REQUEST];
  if (!pending) return;
  const g = await pending.catch(() => null);
  if (!g) return;

  const credentialId = await readSessionId();
  if (!credentialId) return;

  const tokens = g.client.getTokens();
  if (!tokens) return;
  await new GarminClient({ tokenStore: new DatabaseTokenStore(credentialId) })
    .tokenStore.save(tokens);
}

export function resetGarmin() {
  delete slot()[PER_REQUEST];
}

/** Akun yang sedang dipakai di sesi ini, atau null. */
export async function currentAccount() {
  const id = await readSessionId();
  if (!id) return null;
  return findCredential(id);
}

export async function connectionState(): Promise<ConnState> {
  const id = await readSessionId();
  if (!id) return { connected: false, reason: "no-session" };

  const row = await findCredential(id);
  if (!row) return { connected: false, reason: "not-found" };

  try {
    const g = await garmin();
    const profile = await g.getUserProfile();
    const name = profile?.fullName ?? profile?.displayName ?? row.display_name ?? "Pengguna Garmin";
    return { connected: true, name: String(name), email: row.garmin_email, credentialId: id };
  } catch (err) {
    if (err instanceof GarminNotConnected) return { connected: false, reason: err.reason };
    return { connected: false, reason: "expired" };
  }
}

export const jkDate = jakartaDate;
export const jkDaysAgo = daysAgo;
