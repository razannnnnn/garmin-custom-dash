// scripts/copy-maplibre-worker.mjs
//
// MapLibre membuat Web Worker dari file saudara bundle-nya sendiri lewat
// import.meta.url. Turbopack menulis ulang import.meta.url ke chunk-nya
// sendiri sehingga worker tidak pernah ikut di-emit → "Worker failed to load"
// dan peta tidak merender apa pun.
//
// Solusinya: layani worker sebagai aset statis dan tunjuk lewat setWorkerUrl().
// Skrip ini menyalinnya supaya tetap sinkron dengan versi maplibre-gl.

import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const target = resolve(root, "public/maplibre/maplibre-gl-worker.mjs");

if (!existsSync(source)) {
  console.warn("[maplibre] worker tidak ditemukan, lewati:", source);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });

const alreadyFresh = existsSync(target) && statSync(target).size === statSync(source).size;
if (!alreadyFresh) {
  copyFileSync(source, target);
}

const kb = Math.round(statSync(target).size / 1024);
console.log(`[maplibre] worker siap: public/maplibre/maplibre-gl-worker.mjs (${kb} kB)`);
