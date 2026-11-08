// lib/garmin/load.ts — jalankan pengambilan data Garmin untuk satu request
//
// Access token Garmin berputar (refresh) di tengah pemakaian, tapi Server Component
// tidak boleh menulis cookie. Jadi fungsi ini hanya menyediakan klien; penyimpanan
// token hasil refresh dilakukan route handler lewat `persistTokens()`.

import type { Garmin } from "garminconnect-js";
import { garmin } from "./client";

export async function withGarmin<T>(fn: (g: Garmin) => Promise<T>): Promise<T> {
  const g = await garmin();
  return fn(g);
}
