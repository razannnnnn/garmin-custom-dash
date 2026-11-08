// app/api/garmin/login/route.ts — login akun Garmin, token disimpan ke database
//
// Kredensial Garmin tidak disimpan. Yang disimpan hanya token OAuth hasil login,
// terenkripsi, di tabel garmin_credentials. Cookie browser diberi ID baris itu.

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { GarminClient, Garmin } from "garminconnect-js";
import type { MfaState } from "garminconnect-js";
import { resetGarmin } from "@/lib/garmin/client";
import { saveCredential, normalizeEmail } from "@/lib/garmin/credential-store";
import { writeSession } from "@/lib/garmin/session";
import { SupabaseNotConfigured } from "@/lib/supabase/admin";
import { TokenSecretMissing, TokenSecretInvalid } from "@/lib/garmin/credential-store";

const NO_STORE = { "Cache-Control": "no-store" };

type MfaEntry = { state: MfaState; email: string; at: number };
const MFA_TTL_MS = 5 * 60 * 1000;
const pending = globalThis as unknown as { __garminMfa?: MfaEntry };

function knownError(err: unknown) {
  if (err instanceof TokenSecretMissing || err instanceof TokenSecretInvalid) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
  if (err instanceof SupabaseNotConfigured) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
  return null;
}

/** Token harus benar-benar ada sebelum sesi dibuat. */
async function persistAndOpenSession(client: GarminClient, email: string) {
  const tokens = client.getTokens();
  if (!tokens) {
    return NextResponse.json(
      {
        error:
          "Garmin menerima login, tetapi token tidak diterima. Coba lagi; kalau berulang, periksa log server.",
      },
      { status: 500, headers: NO_STORE }
    );
  }

  const profile = await new Garmin(client).getUserProfile();
  const displayName = profile?.fullName ?? profile?.displayName ?? null;

  const credentialId = await saveCredential({
    email,
    tokens,
    displayName,
    garminUserId: profile?.displayName ? String(profile.displayName) : null,
  });

  resetGarmin();
  revalidateTag("garmin", { expire: 0 });
  await writeSession(credentialId);

  return NextResponse.json(
    { ok: true, name: displayName ?? "Pengguna Garmin", email },
    { headers: NO_STORE }
  );
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400, headers: NO_STORE });
  }

  const client = new GarminClient();

  if (body.code) {
    const entry = pending.__garminMfa;
    if (!entry || Date.now() - entry.at > MFA_TTL_MS) {
      delete pending.__garminMfa;
      return NextResponse.json(
        { error: "Sesi MFA kedaluwarsa. Ulangi login dari awal." },
        { status: 400, headers: NO_STORE }
      );
    }

    try {
      await client.resumeLogin(entry.state, body.code.trim());
      delete pending.__garminMfa;
      return await persistAndOpenSession(client, entry.email);
    } catch (err) {
      const handled = knownError(err);
      if (handled) return handled;
      return NextResponse.json(
        { error: `Kode MFA ditolak: ${err instanceof Error ? err.message : "galat"}` },
        { status: 401, headers: NO_STORE }
      );
    }
  }

  const email = body.email?.trim();
  if (!email || !body.password) {
    return NextResponse.json(
      { error: "Email dan password wajib diisi" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const result = await client.login(email, body.password);

    if (result.state === "mfa_required") {
      pending.__garminMfa = { state: result.mfaState, email: normalizeEmail(email), at: Date.now() };
      const method = result.mfaState.mfaMethod ?? "kode verifikasi";
      return NextResponse.json({ mfaRequired: true, method }, { headers: NO_STORE });
    }

    return await persistAndOpenSession(client, email);
  } catch (err) {
    const handled = knownError(err);
    if (handled) return handled;

    const message = err instanceof Error ? err.message : "galat tidak diketahui";

    // Garmin membalas 401 pada rute SSO ketika percobaan login terlalu sering.
    if (/rate limit|429|too many requests|not authorized.*sso\/signin/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Garmin sementara menolak login dari server ini karena percobaan terlalu sering. Tunggu ±15–30 menit lalu coba lagi.",
        },
        { status: 429, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { error: `Login Garmin gagal: ${message}` },
      { status: 401, headers: NO_STORE }
    );
  }
}

export async function DELETE() {
  delete pending.__garminMfa;
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
