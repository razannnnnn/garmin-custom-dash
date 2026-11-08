// lib/garmin/cookie-store.ts — TokenStore Garmin yang hidup di cookie browser
//
// Tidak ada file token di server. Token milik pengguna disimpan sebagai cookie
// httpOnly yang sudah dienkripsi AES-256-GCM, lalu dipecah menjadi beberapa
// bagian (chunk) karena batas satu cookie ±4 KB sementara token Garmin ±3,2 KB.
//
// Catatan keamanan:
// - Kunci enkripsi berasal dari env GARMIN_TOKEN_SECRET (wajib, acak, ≥32 byte).
//   Tanpa kunci itu aplikasi menolak menyimpan token — tidak ada fallback diam-diam
//   ke kunci hardcoded, karena kunci yang bisa dibaca dari source tidak mengamankan apa pun.
// - Cookie httpOnly: JavaScript di browser tidak bisa membaca token. Server tetap
//   menerimanya bolak-balik, jadi transport wajib HTTPS di produksi.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { TokenStore, Tokens } from "garminconnect-js";

/** Nama cookie bagian pertama. Bagian lain memakai sufiks `-2`, `-3`, dan seterusnya. */
const COOKIE_PREFIX = "gd_garmin_tok";
const CHUNK_BYTES = 2600; // base64url ±3467 byte — masih di bawah batas 4 KB per cookie
const VERSION = 1;

const MAX_AGE = 60 * 60 * 24 * 400; // 400 hari, batas maksimum umur cookie di Chrome

export class TokenSecretMissing extends Error {
  constructor() {
    super(
      "GARMIN_TOKEN_SECRET belum di-set di server. Tambahkan sebagai Environment Variable (minimal 32 karakter acak) lalu redeploy."
    );
    this.name = "TokenSecretMissing";
  }
}

export class TokenSecretInvalid extends Error {
  constructor() {
    super("Token Garmin tersimpan tapi GARMIN_TOKEN_SECRET berubah — cookie tidak bisa dibuka.");
    this.name = "TokenSecretInvalid";
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
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < 29) throw new TokenSecretInvalid();
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const body = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // GCM gagal autentikasi = kunci berbeda atau cookie diutak-atik.
    throw new TokenSecretInvalid();
  }
}

/** Pecah string base64url menjadi potongan seukuran cookie. */
function chunk(payload: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < payload.length; i += CHUNK_BYTES) {
    out.push(payload.slice(i, i + CHUNK_BYTES));
  }
  return out.length > 0 ? out : [""];
}

function cookieName(index: number): string {
  return index === 0 ? COOKIE_PREFIX : `${COOKIE_PREFIX}-${index + 1}`;
}

/**
 * TokenStore yang membaca/menulis cookie lewat API Next.js `cookies()`.
 *
 * `cookies()` hanya bisa dipanggil di dalam scope request (Server Component,
 * Route Handler, atau Server Function), jadi store ini di-instansiasi per request.
 */
/**
 * Penyimpan token yang bisa DIBACA saat render tapi MENOLAK menulis.
 *
 * Server Component memang dilarang Next.js mengubah cookie. Kalau library mencoba
 * menyimpan token hasil refresh di tengah render, percobaan itu diabaikan (bukan
 * dilempar sebagai error) — token lama tetap valid sampai request berikutnya
 * memperbaruinya, dan penulisan sebenarnya terjadi di Route Handler.
 */
export class ReadOnlyCookieTokenStore implements TokenStore {
  readonly #store = new CookieTokenStore();

  load(): Promise<Tokens | null> {
    return this.#store.load();
  }

  async save(): Promise<void> {}

  async clear(): Promise<void> {}
}

export class CookieTokenStore implements TokenStore {
  async load(): Promise<Tokens | null> {
    const jar = await readJar();
    const head = jar.get(cookieName(0))?.value;
    if (!head) return null; // belum login

    // Prefix `1.` menandai versi payload; cookie asing/milik app lain diabaikan.
    if (!head.startsWith(`${VERSION}.`)) return null;
    let encoded = head.slice(VERSION + 1);

    // Sambung sisa bagian. Berhenti pada celah pertama — urutan penulisan selalu rapat.
    for (let i = 1; i <= 8; i += 1) {
      const part = jar.get(cookieName(i))?.value;
      if (part === undefined) break;
      encoded += part;
    }
    if (!encoded) return null;

    const tokens = JSON.parse(decrypt(encoded)) as Tokens;

    // Tolak payload yang tidak lengkap sebelum dipakai library.
    if (!tokens?.oauth1?.oauth_token || !tokens?.oauth2?.access_token) return null;
    if (!Number.isFinite(tokens.oauth2.expires_at)) return null;

    return tokens;
  }

  async save(tokens: Tokens): Promise<void> {
    const jar = await readJar();
    const parts = chunk(`${VERSION}.${encrypt(JSON.stringify(tokens))}`);

    parts.forEach((value: string, index: number) => {
      jar.set(cookieName(index), value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: MAX_AGE,
      });
    });

    // Buang sisa bagian dari token sebelumnya yang lebih panjang.
    this.#clearChunks(jar, parts.length);
  }

  async clear(): Promise<void> {
    const jar = await readJar();
    jar.delete(cookieName(0));
    this.#clearChunks(jar, 1);
  }

  /** Hapus bagian mulai dari `from` sampai batas maksimum yang mungkin pernah ditulis. */
  #clearChunks(jar: Awaited<ReturnType<typeof readJar>>, from: number) {
    for (let i = from; i < 8; i += 1) {
      const name = cookieName(i);
      if (jar.get(name) === undefined) continue;
      jar.delete(name);
    }
  }
}

async function readJar() {
  const mod = await import("next/headers");
  return mod.cookies();
}
