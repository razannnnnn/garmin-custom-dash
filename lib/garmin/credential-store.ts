// lib/garmin/credential-store.ts — token Garmin tersimpan di Supabase
//
// Token dienkripsi AES-256-GCM sebelum dikirim ke database, jadi isi tabel tidak
// pernah memuat token mentah meski seseorang membaca dump database.
//
// Sesi browser hanya menyimpan `session_id` (cookie httpOnly), bukan token.
// Akibatnya satu akun Garmin bisa dipakai dari beberapa browser sekaligus.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { TokenStore, Tokens } from "garminconnect-js";
import { adminClient } from "@/lib/supabase/admin";


const TABLE = "garmin_credentials";

export interface CredentialRow {
  id: string;
  garmin_email: string;
  garmin_user_id: string | null;
  display_name: string | null;
  oauth1_enc: string;
  oauth2_enc: string;
  oauth2_expires_at: string;
  refresh_token_expires_at: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}

interface AccountRow {
  id: string;
  garmin_email: string;
  display_name: string | null;
  last_login_at: string;
}

export class TokenSecretMissing extends Error {
  constructor() {
    super(
      "GARMIN_TOKEN_SECRET belum di-set. Tambahkan sebagai Environment Variable (minimal 32 karakter acak) lalu redeploy."
    );
    this.name = "TokenSecretMissing";
  }
}

export class TokenSecretInvalid extends Error {
  constructor() {
    super("Token tersimpan tidak bisa dibuka — GARMIN_TOKEN_SECRET berubah sejak token disimpan.");
    this.name = "TokenSecretInvalid";
  }
}

export class AccountNotFound extends Error {
  constructor(email: string) {
    super(`Akun Garmin ${email} tidak ditemukan atau belum pernah login.`);
    this.name = "AccountNotFound";
  }
}

function secretKey(): Buffer {
  const secret = process.env.GARMIN_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new TokenSecretMissing();
  return createHash("sha256").update(secret).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 29) throw new TokenSecretInvalid();
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  try {
    return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    throw new TokenSecretInvalid();
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type StoredCredential = CredentialRow;

export function decodeTokens(row: StoredCredential): Tokens {
  return {
    oauth1: JSON.parse(decrypt(row.oauth1_enc)),
    oauth2: JSON.parse(decrypt(row.oauth2_enc)),
  };
}

export async function findCredential(email: string): Promise<StoredCredential | null> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select("*")
    .eq("garmin_email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(`Gagal membaca kredensial: ${error.message}`);
  return (data as StoredCredential | null) ?? null;
}

export async function findCredentialById(id: string): Promise<StoredCredential | null> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Gagal membaca kredensial: ${error.message}`);
  return (data as StoredCredential | null) ?? null;
}

/** Daftar akun yang sudah pernah login — untuk memilih di halaman masuk. */
export async function listAccounts(): Promise<
  { id: string; email: string; name: string | null; lastLoginAt: string }[]
> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select("id, garmin_email, display_name, last_login_at")
    .order("last_login_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(`Gagal membaca daftar akun: ${error.message}`);

  return ((data ?? []) as AccountRow[]).map((r) => ({
    id: String(r.id),
    email: String(r.garmin_email),
    name: r.display_name ?? null,
    lastLoginAt: String(r.last_login_at),
  }));
}

export interface SaveOptions {
  email: string;
  tokens: Tokens;
  displayName?: string | null;
  garminUserId?: string | null;
}

/** Simpan/replace token satu akun. Upsert berdasarkan email. */
export async function saveCredential(opts: SaveOptions): Promise<string> {
  const { tokens } = opts;
  const row = {
    garmin_email: normalizeEmail(opts.email),
    garmin_user_id: opts.garminUserId ?? null,
    display_name: opts.displayName ?? null,
    oauth1_enc: encrypt(JSON.stringify(tokens.oauth1)),
    oauth2_enc: encrypt(JSON.stringify(tokens.oauth2)),
    oauth2_expires_at: new Date(tokens.oauth2.expires_at * 1000).toISOString(),
    refresh_token_expires_at: new Date(tokens.oauth2.refresh_token_expires_at * 1000).toISOString(),
    last_login_at: new Date().toISOString(),
  };

  const { data, error } = await adminClient()
    .from(TABLE)
    .upsert(row, { onConflict: "garmin_email" })
    .select("id")
    .single();
  if (error) throw new Error(`Gagal menyimpan kredensial: ${error.message}`);
  return String((data as { id: string }).id);
}

/** Perbarui token hasil refresh untuk satu akun. */
export async function updateTokens(id: string, tokens: Tokens): Promise<void> {
  const { error } = await adminClient()
    .from(TABLE)
    .update({
      oauth1_enc: encrypt(JSON.stringify(tokens.oauth1)),
      oauth2_enc: encrypt(JSON.stringify(tokens.oauth2)),
      oauth2_expires_at: new Date(tokens.oauth2.expires_at * 1000).toISOString(),
      refresh_token_expires_at: new Date(tokens.oauth2.refresh_token_expires_at * 1000).toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`Gagal memperbarui token: ${error.message}`);
}

export async function deleteCredential(id: string): Promise<void> {
  const { error } = await adminClient().from(TABLE).delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus kredensial: ${error.message}`);
}

/**
 * TokenStore untuk satu baris kredensial.
 *
 * `load()` membaca dari database; `save()` menulis balik token hasil refresh
 * supaya login tidak perlu diulang setiap access token berputar.
 */
export class DatabaseTokenStore implements TokenStore {
  constructor(private readonly credentialId: string) {}

  async load(): Promise<Tokens | null> {
    const row = await findCredentialById(this.credentialId);
    if (!row) return null;
    return decodeTokens(row);
  }

  async save(tokens: Tokens): Promise<void> {
    await updateTokens(this.credentialId, tokens);
  }

  async clear(): Promise<void> {
    await deleteCredential(this.credentialId);
  }
}

/** Store read-only untuk dipakai saat render (Server Component tidak boleh menulis). */
export class ReadOnlyDatabaseTokenStore implements TokenStore {
  readonly #inner: DatabaseTokenStore;

  constructor(credentialId: string) {
    this.#inner = new DatabaseTokenStore(credentialId);
  }

  load(): Promise<Tokens | null> {
    return this.#inner.load();
  }

  async save(): Promise<void> {}

  async clear(): Promise<void> {}
}
