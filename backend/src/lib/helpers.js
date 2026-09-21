// Helper bersama untuk semua route.
import { q } from "../db.js";

/** Bungkus handler async: error -> JSON (err.status dihormuai, default 500). */
export function route(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req);
      res.json(data);
    } catch (err) {
      const status = err?.status || 500;
      if (status >= 500) console.error("[api] error:", err.message);
      res.status(status).json({ error: status === 404 ? "not_found" : "internal", message: String(err?.message || err) });
    }
  };
}

/**
 * Pivot baris long (kecamatan, tahun, kunci, nilai...) menjadi satu objek per (kecamatan, tahun).
 * rows: hasil query yang punya kolom `kecamatan`, `tahun`, dan kolom kunci/nilai sesuai mapFn.
 * mapFn(row) -> [fieldName, value] atau null untuk skip.
 * baseFn(row) -> objek dasar tambahan (opsional), dipanggil sekali per grup.
 * Urutan hasil: kecamatan ASC, tahun ASC — deterministik.
 */
export function pivotLong(rows, mapFn, baseFn = null) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.kecamatan}|${r.tahun}`;
    let obj = map.get(key);
    if (!obj) {
      obj = { kecamatan: r.kecamatan, ...(baseFn ? baseFn(r) : {}), tahun: String(r.tahun) };
      map.set(key, obj);
    }
    const mapped = mapFn(r, obj);
    if (mapped) obj[mapped[0]] = mapped[1];
  }
  return [...map.values()].sort((a, b) =>
    a.kecamatan === b.kecamatan ? Number(a.tahun) - Number(b.tahun) : a.kecamatan.localeCompare(b.kecamatan),
  );
}

/** Peta kecamatan: nama baku -> true. Dipakai untuk validasi join. */
let kecCache = null;
export async function kecamatanNames() {
  if (!kecCache) {
    const rows = await q("SELECT id, nama FROM kecamatan ORDER BY id");
    kecCache = rows;
  }
  return kecCache;
}

/** SQL standar join kecamatan: alias tabel t dengan kolom kecamatan_id. */
export const KEC_JOIN = "JOIN kecamatan k ON k.id = t.kecamatan_id";

export const num = (v) => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));
