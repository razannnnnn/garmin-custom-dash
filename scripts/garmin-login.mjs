#!/usr/bin/env node
// scripts/garmin-login.mjs — login sekali ke Garmin Connect, simpan token
//
// Token memberi akses penuh ke akun, jadi perlakukan seperti kata sandi.
// Jalankan: npm run garmin:login

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { GarminClient, Garmin, FileTokenStore } from "garminconnect-js";

const TOKEN_DIR = process.env.GARMIN_TOKEN_DIR ?? "./.garmin-tokens";

async function main() {
  const store = new FileTokenStore(TOKEN_DIR);
  const client = new GarminClient({ tokenStore: store });

  if (await client.loadTokens()) {
    const garmin = new Garmin(client);
    try {
      const profile = await garmin.getUserProfile();
      const name = profile?.fullName ?? profile?.displayName ?? "?";
      console.log(`✓ Token tersimpan masih berlaku (${name}).`);
      const again = await ask("\nLogin ulang? (y/N): ");
      if (again.toLowerCase() !== "y") return;
    } catch {
      console.log("⚠ Token tersimpan ditolak Garmin — login ulang diperlukan.\n");
    }
  }

  const email = process.env.GARMIN_EMAIL ?? (await ask("Email Garmin: "));
  const password = process.env.GARMIN_PASSWORD ?? (await askHidden("Password Garmin: "));

  if (!email || !password) {
    console.error("✗ Email dan password wajib diisi.");
    process.exit(1);
  }

  console.log("\nMenghubungi Garmin…");
  const result = await client.login(email.trim(), password);

  if (result.state === "mfa_required") {
    console.log(`⚠ MFA diperlukan (${result.mfaState.mfaMethod ?? "kode"}).`);
    const code = await ask("Kode MFA: ");
    await client.resumeLogin(result.mfaState, code.trim());
  }

  const garmin = new Garmin(client);
  const profile = await garmin.getUserProfile();
  const name = profile?.fullName ?? profile?.displayName ?? "?";

  console.log(`\n✓ Login berhasil sebagai ${name}.`);
  console.log(`  Token disimpan di ${TOKEN_DIR}`);
  console.log("  Pastikan folder itu tidak masuk git dan hanya bisa dibaca Anda.\n");
  console.log("Uji ambil data:");

  const checks = [
    ["Aktivitas", () => garmin.getActivities(0, 1)],
    ["Tidur", () => garmin.getSleepData(today())],
    ["Kesiapan", () => garmin.getTrainingReadiness(today())],
  ];

  let failed = 0;
  for (const [label, fn] of checks) {
    try {
      const r = await fn();
      const ok = Array.isArray(r) ? r.length > 0 : r !== null && r !== undefined;
      if (!ok) failed += 1;
      console.log(`  ${ok ? "✓" : "·"} ${label}`);
    } catch (err) {
      failed += 1;
      console.log(`  ✗ ${label} (${err instanceof Error ? err.message : "galat"})`);
    }
  }

  if (failed > 0) {
    console.log("\nSebagian data kosong — normal bila akun belum punya rekaman hari ini.");
  }
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

async function ask(q) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(q);
  rl.close();
  return answer;
}

async function askHidden(q) {
  stdout.write(q);
  stdin.setRawMode?.(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  let value = "";
  await new Promise((resolve) => {
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n") {
        stdin.removeListener("data", onData);
        stdin.setRawMode?.(false);
        stdin.pause();
        stdout.write("\n");
        resolve();
      } else if (ch === "\u0003") {
        stdin.removeListener("data", onData);
        stdin.setRawMode?.(false);
        stdout.write("\n");
        process.exit(130);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });

  return value;
}

main().catch((err) => {
  console.error("\n✗ Login gagal:", err instanceof Error ? err.message : err);
  if (err && typeof err === "object" && "status" in err) {
    console.error("  Status HTTP:", err.status);
  }
  console.error("\n  Penyebab umum: password salah, akun terkunci sementara,");
  console.error("  atau Garmin membatasi login berulang (tunggu beberapa menit).");
  process.exit(1);
});
