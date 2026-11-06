"use client";

// app/connect/ConnectForm.tsx — form login akun Garmin

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

type Stage = "credentials" | "mfa" | "done";

const EASE = [0.22, 0.8, 0.32, 1] as const;

export function ConnectForm() {
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
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login gagal");
        return;
      }
      if (data.mfaRequired) {
        setMfaMethod(data.method ?? "kode verifikasi");
        setStage("mfa");
        return;
      }
      setStage("done");
      router.refresh();
      setTimeout(() => router.push("/overview"), 900);
    } catch {
      setError("Tidak dapat menghubungi server");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "done") {
    return (
      <motion.div
        className="connect-done"
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <ShieldCheck size={28} aria-hidden="true" />
        <b>Terhubung ke Garmin</b>
        <span>Membuka ringkasan…</span>
      </motion.div>
    );
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
        <p className="connect-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
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
