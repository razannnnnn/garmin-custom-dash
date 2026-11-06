// app/api/garmin/login/route.ts — login akun Garmin dari browser

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { Garmin } from "garminconnect-js";
import { newClient, resetGarmin } from "@/lib/garmin/client";

// shortcut: single-user local server MFA state on globalThis, move to encrypted cookie/session store if multi-user
type MfaState = unknown;
const pending = globalThis as unknown as { __garminMfa?: MfaState };

export async function POST(req: Request) {
  let body: { email?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON" }, { status: 400 });
  }

  const client = newClient();

  if (body.code) {
    const mfaState = pending.__garminMfa;
    if (!mfaState) {
      return NextResponse.json(
        { error: "Sesi MFA tidak ditemukan. Ulangi login dari awal." },
        { status: 400 }
      );
    }
    try {
      await client.resumeLogin(mfaState as never, body.code.trim());
      delete pending.__garminMfa;
      resetGarmin();
      revalidateTag("garmin", { expire: 0 });
      const profile = await new Garmin(client).getUserProfile();
      return NextResponse.json({ ok: true, name: profile?.fullName ?? "Pengguna Garmin" });
    } catch (err) {
      return NextResponse.json(
        { error: `Kode MFA ditolak: ${err instanceof Error ? err.message : "galat"}` },
        { status: 401 }
      );
    }
  }

  const email = body.email?.trim();
  if (!email || !body.password) {
    return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  }

  try {
    const result = await client.login(email, body.password);

    if (result.state === "mfa_required") {
      pending.__garminMfa = result.mfaState;
      const method =
        (result.mfaState as { mfaMethod?: string }).mfaMethod ?? "kode verifikasi";
      return NextResponse.json({ mfaRequired: true, method });
    }

    resetGarmin();
    revalidateTag("garmin", { expire: 0 });
    const profile = await new Garmin(client).getUserProfile();
    return NextResponse.json({ ok: true, name: profile?.fullName ?? "Pengguna Garmin" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "galat tidak diketahui";
    return NextResponse.json(
      { error: `Login Garmin gagal: ${message}` },
      { status: 401 }
    );
  }
}
