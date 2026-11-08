"use client";

// app/connect/ConnectForm.tsx — form login akun Garmin

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

type Stage = "credentials" | "mfa";

const EASE = [0.22, 0.8, 0.32, 1] as const;

interface Account {
  id: string;
  email: string;
  name: string | null;
}

export function ConnectForm({ accounts = [] }: { accounts?: Account[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mfaMethod, setMfaMethod] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(payload: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/garmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: { error?: string; mfaRequired?: boolean; method?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Server bisa membalas HTML (mis. 500 dari runtime), bukan JSON.
        data = { error: `Server membalas ${res.status} tanpa detail.` };
      }

      if (!res.ok) {
        setError(data.error ?? `Login gagal (HTTP ${res.status})`);
        return;
      }
      if (data.mfaRequired) {
        setMfaMethod(data.method ?? "kode verifikasi");
        setStage("mfa");
        return;
      }

      // Sesi sudah aktif di server; langsung ke dasbor.
      router.replace("/overview");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="connect-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (stage === "mfa") send({ code });
        else send({ email, password });
      }}
    >
      {stage === "credentials" ? (
        <>
          {accounts.length > 0 ? (
            <div className="connect-accounts">
              <span>Pilih akun tersimpan</span>
              <div>
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setError(null);
                    }}
                  >
                    {a.name ?? a.email}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="field">
            <span>
              <Mail size={14} aria-hidden="true" /> Email Garmin
            </span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </label>

          <label className="field">
            <span>
              <Lock size={14} aria-hidden="true" /> Password
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
        </>
      ) : (
        <label className="field">
          <span>
            <ShieldCheck size={14} aria-hidden="true" /> Kode verifikasi
          </span>
          <input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            autoFocus
          />
          <em>Garmin mengirim kode lewat {mfaMethod}. Masukkan di sini.</em>
        </label>
      )}

      {error ? (
        <motion.p
          className="connect-error"
          role="alert"
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </motion.p>
      ) : null}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? <Loader2 size={15} className="spin" aria-hidden="true" /> : null}
        {busy ? "Menghubungi Garmin…" : stage === "mfa" ? "Verifikasi" : "Masuk"}
      </button>

      {stage === "mfa" ? (
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            setStage("credentials");
            setCode("");
            setError(null);
          }}
        >
          Kembali
        </button>
      ) : null}
    </form>
  );
}
