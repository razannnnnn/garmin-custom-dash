// lib/garmin/geo.ts — geometri rute dari respons Garmin

export type Coord = [number, number]; // [lon, lat]

export const MAX_GEO_POINTS = 400;

/** Decoder polyline terenkode Google (dipakai Garmin di beberapa respons). */
export function decodePolyline(encoded: string): Coord[] {
  const out: Coord[] = [];
  let i = 0;
  let lat = 0;
  let lon = 0;
  while (i < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(i++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lon += result & 1 ? ~(result >> 1) : result >> 1;

    out.push([lon / 1e5, lat / 1e5]);
  }
  return out;
}

/**
 * Ambil koordinat dari respons `getActivityDetails`.
 * Toleran terhadap beberapa bentuk karena endpoint tidak berdokumen.
 */
export function toCoords(dto: unknown): Coord[] | null {
  const point = (p: unknown): Coord | null => {
    if (Array.isArray(p) && p.length >= 2) {
      const a = Number(p[0]);
      const b = Number(p[1]);
      return Number.isFinite(a) && Number.isFinite(b) ? [b, a] : null; // input [lat,lon]
    }
    if (p && typeof p === "object") {
      const o = p as Record<string, unknown>;
      const lat = Number(o.lat ?? o.latitude);
      const lon = Number(o.lon ?? o.lng ?? o.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return [lon, lat];
    }
    return null;
  };

  const fromArray = (arr: unknown): Coord[] | null => {
    if (!Array.isArray(arr) || arr.length < 2) return null;
    const pts = arr.map(point).filter((c): c is Coord => c !== null);
    return pts.length >= 2 ? pts : null;
  };

  if (!dto || typeof dto !== "object") return null;
  const d = dto as Record<string, unknown>;

  const geo = d.geoPolylineDTO as Record<string, unknown> | undefined;
  if (geo) {
    if (typeof geo.polyline === "string" && geo.polyline.length > 4) {
      const decoded = decodePolyline(geo.polyline);
      if (decoded.length >= 2) return decoded;
    }
    const a = fromArray(geo.polyline);
    if (a) return a;
    const s = point(geo.startPoint);
    const e = point(geo.endPoint);
    if (s && e) return [s, e];
  }

  if (typeof d.polyline === "string" && d.polyline.length > 4) {
    const decoded = decodePolyline(d.polyline);
    if (decoded.length >= 2) return decoded;
  }
  const direct = fromArray(d.polyline) ?? fromArray(d.geoPolyline) ?? fromArray(d.points);
  if (direct) return direct;

  // Fallback: ambil dari `activityDetailMetrics` (directLongitude & directLatitude)
  const descriptors = d.metricDescriptors;
  const rows = d.activityDetailMetrics;
  if (Array.isArray(descriptors) && Array.isArray(rows)) {
    let lonIdx = -1;
    let latIdx = -1;
    for (const raw of descriptors) {
      if (!raw || typeof raw !== "object") continue;
      const desc = raw as { metricsIndex?: unknown; key?: unknown };
      if (desc.key === "directLongitude" && typeof desc.metricsIndex === "number") {
        lonIdx = desc.metricsIndex;
      } else if (desc.key === "directLatitude" && typeof desc.metricsIndex === "number") {
        latIdx = desc.metricsIndex;
      }
    }
    if (lonIdx >= 0 && latIdx >= 0) {
      const pts: Coord[] = [];
      for (const r of rows) {
        const m = (r as { metrics?: unknown })?.metrics;
        if (!Array.isArray(m)) continue;
        const lon = Number(m[lonIdx]);
        const lat = Number(m[latIdx]);
        if (Number.isFinite(lon) && Number.isFinite(lat)) pts.push([lon, lat]);
      }
      if (pts.length >= 2) return pts;
    }
  }

  return null;
}

/** Ekstrak koordinat `[lon, lat]` dari teks XML GPX Garmin. */
export function parseGpxCoords(gpxXml: string): Coord[] | null {
  if (!gpxXml || typeof gpxXml !== "string") return null;
  const out: Coord[] = [];
  const re = /<trkpt\b[^>]*?\blat=["']([+-]?\d+(?:\.\d+)?)["'][^>]*?\blon=["']([+-]?\d+(?:\.\d+)?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(gpxXml)) !== null) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      out.push([lon, lat]);
    }
  }
  return out.length >= 2 ? out : null;
}

/** Ekstrak TrackPoint (elevasi, HR, cadence) dari teks XML GPX bila detail metrics kosong. */
export function parseGpxTrack(gpxXml: string): TrackPoint[] {
  if (!gpxXml || typeof gpxXml !== "string") return [];
  const out: TrackPoint[] = [];
  const blocks = gpxXml.match(/<trkpt\b[\s\S]*?<\/trkpt>/gi) ?? [];
  let t0: number | null = null;

  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const timeMatch = b.match(/<time>([^<]+)<\/time>/i);
    const ms = timeMatch ? Date.parse(timeMatch[1]) : NaN;
    if (Number.isFinite(ms) && t0 === null) t0 = ms;
    const t = Number.isFinite(ms) && t0 !== null ? Math.round((ms - t0) / 1000) : i;

    const eleMatch = b.match(/<ele>([+-]?\d+(?:\.\d+)?)<\/ele>/i);
    const hrMatch = b.match(/<(?:[\w]+:)?hr>(\d+)<\/(?:[\w]+:)?hr>/i);
    const cadMatch = b.match(/<(?:[\w]+:)?cad>(\d+)<\/(?:[\w]+:)?cad>/i);

    const elev = eleMatch ? Number(eleMatch[1]) : null;
    const hr = hrMatch ? Number(hrMatch[1]) : null;
    const cad = cadMatch ? Number(cadMatch[1]) * 2 : null;

    out.push({
      t,
      hr: hr !== null && Number.isFinite(hr) ? hr : null,
      speed: null,
      elev: elev !== null && Number.isFinite(elev) ? elev : null,
      cad: cad !== null && Number.isFinite(cad) ? cad : null,
      power: null,
    });
  }
  return out;
}

/** Kurangi ke `max` titik dengan langkah seragam; titik terakhir selalu ikut. */
export function downsample(coords: Coord[], max = MAX_GEO_POINTS): Coord[] {
  if (coords.length <= max) return coords;
  const stride = Math.ceil(coords.length / max);
  const out: Coord[] = [];
  for (let i = 0; i < coords.length; i += stride) out.push(coords[i]);
  if (out[out.length - 1] !== coords[coords.length - 1]) out.push(coords[coords.length - 1]);
  return out;
}

export interface TrackPoint {
  t: number; // detik sejak mulai
  hr: number | null;
  speed: number | null; // m/s
  elev: number | null; // m
  cad: number | null; // langkah/menit
  power: number | null;
}

/**
 * Ambil seri metrik dari `activityDetailMetrics`.
 *
 * `metrics[]` adalah array POSISIONAL: nilainya ada di indeks yang sama dengan
 * `metricsIndex` pada `metricDescriptors[]`. Indeks bisa berbeda antar-akun,
 * jadi posisinya dicari lewat `key`.
 */
export function toTrack(dto: unknown): TrackPoint[] {
  if (!dto || typeof dto !== "object") return [];
  const d = dto as Record<string, unknown>;
  const descriptors = d.metricDescriptors;
  const rows = d.activityDetailMetrics;
  if (!Array.isArray(descriptors) || !Array.isArray(rows)) return [];

  const idx = new Map<string, number>();
  for (const raw of descriptors) {
    if (!raw || typeof raw !== "object") continue;
    const desc = raw as { metricsIndex?: unknown; key?: unknown };
    if (typeof desc.metricsIndex === "number" && typeof desc.key === "string") {
      idx.set(desc.key, desc.metricsIndex);
    }
  }

  const pick = (values: unknown[], key: string): number | null => {
    const i = idx.get(key);
    if (i === undefined) return null;
    const v = values[i];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const out: TrackPoint[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const values = (raw as { metrics?: unknown }).metrics;
    if (!Array.isArray(values)) continue;

    const t = pick(values, "sumElapsedDuration");
    if (t === null) continue;
    out.push({
      t,
      hr: pick(values, "directHeartRate"),
      speed: pick(values, "directSpeed"),
      elev: pick(values, "directElevation"),
      cad: pick(values, "directRunCadence") ?? pick(values, "directDoubleCadence"),
      power: pick(values, "directPower"),
    });
  }
  return out;
}
