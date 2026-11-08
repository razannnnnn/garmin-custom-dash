// lib/garmin/session.ts — sesi browser ↔ baris kredensial Garmin
//
// Cookie hanya menyimpan ID kredensial (uuid). Token asli tetap di database,
// terenkripsi. Jadi cookie kecil, dan mengganti token tidak mengubah cookie.

import { cookies } from "next/headers";

export const SESSION_COOKIE = "gd_session";

const MAX_AGE = 60 * 60 * 24 * 400;

export async function readSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function writeSession(credentialId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, credentialId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
