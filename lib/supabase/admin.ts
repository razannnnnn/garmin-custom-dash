// lib/supabase/admin.ts — klien Supabase berhak penuh, hanya untuk server
//
// Memakai secret key yang melewati RLS. Jangan pernah diimpor dari Client
// Component: nilainya membuka seluruh isi database.
//
// Tidak memakai generic `Database`: bentuknya berbeda antar versi supabase-js.
// Baris hasil query diberi tipe di pemakainya (lihat credential-store.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseNotConfigured extends Error {
  constructor() {
    super(
      "SUPABASE_URL / SUPABASE_SECRET_KEY belum di-set. Tambahkan keduanya sebagai Environment Variable di server, lalu redeploy."
    );
    this.name = "SupabaseNotConfigured";
  }
}

let cached: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new SupabaseNotConfigured();

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
