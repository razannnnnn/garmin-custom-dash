// app/api/garmin/login/route.ts — login akun Garmin dari browser
//
// Token hasil login langsung ditulis ke cookie httpOnly pengguna (lihat
// lib/garmin/cookie-store.ts), jadi tidak ada file token di server.

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Garmin } from "garminconnect-js";
import type { MfaState } from "garminconnect-js";
import { newClient, resetGarmin } from "@/lib/garmin/client";
import { CookieTokenStore, TokenSecretMissing, TokenSecretInvalid } from "@/lib/garmin/cookie-store";

// State MFA hanya bertahan beberapa detik antar dua request; disimpan singkat di
// memori proses. Bukan data pengguna jangka panjang, dan hilang saat proses restart.
type MfaEntry = { state: MfaState; at: number };
const MFA_TTL_MS = 5 * 60 * 1000;

const pending = globalThis as unknown as { __garminMfa?: MfaEntry };

/** Token Garmin sensitif: jangan pernah di-cache oleh proxy/CDN. */
const NO_STORE = { "Cache-Control": "no-store" };

function storeError(err: unknown) {
  if (err instanceof TokenSecretMissing || err instanceof TokenSecretInvalid) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: NO_STORE });
  }
  return null;
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400, headers: NO_STORE });
  }

  const client = newClient();
  const store = new CookieTokenStore();

  if (body.code) {
    const entry = pending.__garminMfa;
    if (!entry || Date.now() - entry.at > MFA_TTL_MS) {
      delete pending.__garminMfa;
      return NextResponse.json(
        { error: "Sesi MFA tidak ditemukan atau kedaluwarsa. Ulangi login dari awal." },
        { status: 400, headers: NO_STORE }
      );
    }

    try {
      // resumeLogin menyimpan token ke CookieTokenStore lewat client tokenStore.
      await client.resumeLogin(entry.state, body.code.trim());
      delete pending.__garminMfa;
      resetGarmin();
      revalidateTag("garmin", { expire: 0 });

      const profile = await new Garmin(client).getUserProfile();
      return NextResponse.json(
        { ok: true, name: profile?.fullName ?? "Pengguna Garmin" },
        { headers: NO_STORE }
      );
    } catch (err) {
      const handled = storeError(err);
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
      pending.__garminMfa = { state: result.mfaState, at: Date.now() };
      const method = result.mfaState.mfaMethod ?? "kode verifikasi";
      return NextResponse.json({ mfaRequired: true, method }, { headers: NO_STORE });
    }

    resetGarmin();
    revalidateTag("garmin", { expire: 0 });

    const profile = await new Garmin(client).getUserProfile();

    // Pastikan token benar-benar tersimpan. Tanpa ini login bisa "sukses" tapi
    // browser tidak menerima cookie, sehingga pengguna terlempar balik ke /connect.
    if (!client.getTokens()) {
      return NextResponse.json(
        {
          error:
            "Garmin menerima login, tetapi token gagal disimpan ke browser. Pastikan situs diakses lewat HTTPS dan cookie tidak diblokir.",
        },
        { status: 500, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { ok: true, name: profile?.fullName ?? "Pengguna Garmin" },
      { headers: NO_STORE }
    );
  } catch (err) {
    const handled = storeError(err);
    if (handled) return handled;

    const message = err instanceof Error ? err.message : "galat tidak diketahui";

    // Garmin membatasi percobaan login (biasanya 429 atau 401 pada rute SSO).
    // Beri tahu pengguna untuk menunggu, bukan sekadar "login gagal".
    if (/rate limit|429|too many requests/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Garmin membatasi percobaan login dari server ini. Tunggu ±15–30 menit lalu coba lagi, atau login lewat aplikasi Garmin untuk memastikan akun tidak terkunci sementara.",
        },
        { status: 429, headers: NO_STORE }
      );
    }

    if (/not authorized.*sso\/signin|(401)/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Garmin menolak login ini (401). Biasanya karena percobaan berulang terlalu cepat — tunggu beberapa menit, lalu pastikan email & password benar.",
        },
        { status: 401, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      { error: `Login Garmin gagal: ${message}` },
      { status: 401, headers: NO_STORE }
    );
  }
}

/** Bersihkan state MFA yang menggantung (dipanggil halaman /connect saat dibuka). */
export async function DELETE() {
  delete pending.__garminMfa;
  await new CookieTokenStore().clear().catch(() => null);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
