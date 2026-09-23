/**
 * lib/excel.js — engine Excel untuk dasbor admin.
 *
 * buildWorkbook(domainKey, mode)  : mode "template" | "export" → Buffer .xlsx
 *   - Sheet PETUNJUK: cara pakai, aturan kolom, kunci upsert, daftar kecamatan.
 *   - Sheet per tabel: header + data (export) / kosong (template).
 *   - Sheet CONTOH: 1-2 baris contoh dari DB (template saja).
 *
 * importWorkbook(domainKey, buffer) → laporan per sheet:
 *   { inserted, updated, skipped, errors: [{row, message}] }
 *   - Baris dengan kunci natural sama → UPDATE (kolom kosong tidak mengubah nilai lama).
 *   - Baris baru → INSERT. Sel kosong wajib → baris ditolak (dilaporkan, baris lain tetap diproses).
 *   - Validasi: kecamatan resmi (alias ikut dikenali), tahun 2000-2030, angka, enum.
 */
import ExcelJS from "exceljs";
import { q } from "../db.js";
import { loadDomain, loadKecamatan, resolveKecamatan, normStr, normDesa } from "./domains.js";

const MAX_ROWS = 10000;

// ---------------------------------------------------------------------------
// Pembacaan data
// ---------------------------------------------------------------------------

/** Kolom yang punya nilai untuk SELECT export (termasuk kecamatan virtual). */
function selectSql(spec) {
  if (!spec.kecamatan) return `SELECT * FROM \`${spec.table}\``;
  return `SELECT k.nama AS kecamatan, t.* FROM \`${spec.table}\` t JOIN kecamatan k ON k.id = t.kecamatan_id`;
}

function orderSql(spec) {
  const tahunField = spec.cols.find((c) => c.field === "tahun" || c.field === "tahun_anggaran")?.field;
  const pre = spec.kecamatan ? "t." : ""; // alias t hanya ada saat JOIN kecamatan
  const parts = [];
  if (spec.kecamatan) parts.push("k.nama");
  if (tahunField) parts.push(`${pre}\`${tahunField}\``);
  parts.push(`${pre}id`);
  return ` ORDER BY ${parts.join(", ")}`;
}

// ---------------------------------------------------------------------------
// Builder workbook
// ---------------------------------------------------------------------------

function styleHeader(ws, colCount) {
  const row = ws.getRow(1);
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E7D32" } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 26;
  for (let i = 1; i <= colCount; i++) {
    const cell = row.getCell(i);
    cell.border = { bottom: { style: "thin", color: { argb: "FF9E9E9E" } } };
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addDataSheet(wb, spec, rows) {
  const ws = wb.addWorksheet(spec.name);
  spec.cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(14, Math.min(42, c.header.length + 4));
  });
  const header = spec.cols.map((c) => c.header);
  ws.addRow(header);
  styleHeader(ws, spec.cols.length);
  // Validasi dropdown utk kolom enum (baris 2..2001)
  spec.cols.forEach((c, i) => {
    if (c.type === "enum" && c.enumValues && c.enumValues.join(",").length < 250) {
      ws.dataValidations.add(`${colLetter(i + 1)}2:${colLetter(i + 1)}2001`, {
        type: "list",
        allowBlank: true,
        formulae: [`"${c.enumValues.join(",")}"`],
        showErrorMessage: true,
      });
    }
  });
  for (const r of rows) ws.addRow(r);
  return ws;
}

function colLetter(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function contohBaris(spec, dbRow, kecNames) {
  return spec.cols.map((c) => {
    if (dbRow) {
      const v = c.field === "kecamatan" ? dbRow.kecamatan : dbRow[c.field];
      if (v !== undefined && v !== null) return v;
    }
    if (c.type === "kecamatan") return kecNames[0] ?? "Banjarnegara";
    if (c.type === "year") return 2025;
    if (c.type === "number") return 0;
    if (c.type === "enum") return c.enumValues?.[0] ?? "";
    return `Contoh ${c.header}`;
  });
}

async function buildPetunjuk(wb, domain, specs, kec) {
  const ws = wb.addWorksheet("PETUNJUK");
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 34;
  ws.getColumn(3).width = 90;
  const judul = ws.addRow(["", domain.label.toUpperCase(), ""]);
  judul.font = { bold: true, size: 14, color: { argb: "FF2E7D32" } };
  ws.addRow(["", domain.desc, ""]).font = { italic: true };
  ws.addRow(["", `Dibuat otomatis: ${new Date().toLocaleString("id-ID")}`, ""]).font = { color: { argb: "FF757575" } };
  ws.addRow([""]);
  const langkah = [
    ["CARA PAKAI", ""],
    ["1.", "Isi data di sheet DATA (satu baris = satu data). Jangan mengubah baris header dan nama sheet."],
    ["2.", "Kolom bertanda * (wajib) harus diisi. Selain itu boleh dikosongkan."],
    ["3.", "Baris dengan kombinasi KOLOM KUNCI yang sama dengan data lama akan MEMPERBARUI data lama itu (kolom yang dikosongkan TIDAK mengubah nilai lama). Kombinasi kunci baru akan MENAMBAH baris baru."],
    ["4.", "Hapus baris yang tidak ingin diubah — hanya baris yang ada di file yang diproses. Baris yang salah validasi ditolak dan dilaporkan (baris lain tetap diproses)."],
    ["5.", "Simpan sebagai .xlsx lalu unggah di Dasbor Admin → domain ini → tombol Import."],
  ];
  for (const [a, b] of langkah) {
    const r = ws.addRow(["", a, b]);
    if (!b) r.font = { bold: true, color: { argb: "FF2E7D32" } };
    r.alignment = { wrapText: true, vertical: "top" };
  }
  ws.addRow([""]);
  for (const spec of specs) {
    const r = ws.addRow(["", `Sheet "${spec.name}" — tabel ${spec.table}`, ""]);
    r.font = { bold: true };
    const keyCols = spec.key.map((f) => spec.cols.find((c) => c.field === f)?.header ?? f).join(" + ");
    ws.addRow(["", "Kolom kunci (upsert):", keyCols]).alignment = { wrapText: true };
    const aturan = ws.addRow(["", "Kolom:", ""]);
    aturan.font = { bold: true };
    const head = ws.addRow(["", "Header", "Keterangan"]);
    head.font = { bold: true };
    for (const c of spec.cols) {
      const tipe =
        c.type === "kecamatan" ? "nama kecamatan resmi"
        : c.type === "year" ? "tahun (2000-2030)"
        : c.type === "number" ? "angka (titik desimal, tanpa pemisah ribuan)"
        : c.type === "enum" ? `pilihan: ${c.enumValues.join(" / ")}`
        : "teks";
      ws.addRow(["", `${c.header}${c.required ? " *" : ""}`, tipe]).alignment = { wrapText: true };
    }
    ws.addRow([""]);
  }
  if (kec) {
    const r = ws.addRow(["", "DAFTAR NAMA KECAMATAN RESMI", ""]);
    r.font = { bold: true, color: { argb: "FF2E7D32" } };
    for (let i = 0; i < kec.names.length; i += 4) {
      ws.addRow(["", "", kec.names.slice(i, i + 4).join(" • ")]);
    }
  }
  return ws;
}

export async function buildWorkbook(domainKey, mode = "template") {
  const domain = await loadDomain(domainKey);
  if (!domain) throw Object.assign(new Error(`Domain tidak dikenal: ${domainKey}`), { status: 404 });
  const specs = domain.sheets;
  const hasKec = specs.some((s) => s.kecamatan);
  const kec = hasKec ? await loadKecamatan() : null;

  const wb = new ExcelJS.Workbook();
  wb.creator = "SISPERTANI Backend";
  wb.created = new Date();
  await buildPetunjuk(wb, domain, specs, kec);

  for (const spec of specs) {
    if (mode === "export") {
      const rows = await q(selectSql(spec) + orderSql(spec));
      const mapped = rows.map((r) => spec.cols.map((c) => (c.field === "kecamatan" ? r.kecamatan ?? "" : r[c.field] ?? null)));
      addDataSheet(wb, spec, mapped);
    } else {
      addDataSheet(wb, spec, []);
      // Sheet contoh: ambil 2 baris terakhir dari DB, atau contoh sintetis
      const rows = await q(selectSql(spec) + orderSql(spec) + " DESC LIMIT 2");
      const ws = wb.addWorksheet(`CONTOH ${spec.name}`.slice(0, 31));
      ws.addRow(spec.cols.map((c) => c.header)).font = { bold: true };
      const contoh = rows.length
        ? rows.map((r) => spec.cols.map((c) => (c.field === "kecamatan" ? r.kecamatan ?? "" : r[c.field] ?? null)))
        : [contohBaris(spec, null, kec ? kec.names : [])];
      for (const r of contoh) ws.addRow(r);
      ws.addRow([]);
      ws.addRow(["Baris di sheet ini hanya CONTOH — tidak diimpor. Isi data di sheet aslinya."]).font = { italic: true, color: { argb: "FF757575" } };
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

function cleanNum(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (s === "" || s === "-" || s === "—" || s === "--") return null;
  s = s.replace(/,/g, "").replace(/\s+/g, ""); // koma = ribuan (konvensi BPS)
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cellVal(cell) {
  // Nilai mentah; formula diambil hasilnya
  const v = cell?.value;
  if (v && typeof v === "object") {
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    if (v.richText) return v.richText.map((t) => t.text).join("");
    return null;
  }
  return v ?? null;
}

/** Validasi + normalisasi satu baris → { values, error } */
function validateRow(spec, kec, rowMap) {
  const values = {};
  for (const c of spec.cols) {
    const raw = rowMap.get(c.header);
    const empty = raw === null || raw === undefined || String(raw).trim() === "";
    if (c.type === "kecamatan") {
      if (empty) return { error: "Kolom Kecamatan wajib diisi" };
      const k = resolveKecamatan(raw, kec);
      if (!k) return { error: `Kecamatan "${normStr(raw)}" tidak dikenal — gunakan nama resmi (lihat PETUNJUK)` };
      values.kecamatan_id = k.id;
      values.kecamatan = k.nama;
      continue;
    }
    if (empty) {
      if (c.required) return { error: `Kolom "${c.header}" wajib diisi` };
      values[c.field] = null;
      continue;
    }
    if (c.type === "year") {
      const n = cleanNum(raw);
      if (n === null || !Number.isInteger(n) || n < 2000 || n > 2030) return { error: `"${c.header}" harus tahun 2000-2030 (dibaca: ${normStr(raw)})` };
      values[c.field] = n;
    } else if (c.type === "number") {
      const n = cleanNum(raw);
      if (n === null) return { error: `"${c.header}" harus angka (dibaca: ${normStr(raw)})` };
      values[c.field] = n;
    } else if (c.type === "enum") {
      const hit = c.enumValues.find((v) => v.toLowerCase() === normStr(raw).toLowerCase());
      if (!hit) return { error: `"${c.header}" harus salah satu dari: ${c.enumValues.join(" / ")} (dibaca: ${normStr(raw)})` };
      values[c.field] = hit;
    } else {
      values[c.field] = normStr(raw);
    }
  }
  return { values };
}

function keyWhere(spec, values) {
  const clauses = [];
  const params = [];
  for (const f of spec.key) {
    if (f === "kecamatan") { clauses.push("kecamatan_id = ?"); params.push(values.kecamatan_id); }
    else if (f === "desa") { clauses.push("desa_norm = ?"); params.push(normDesa(values.desa)); }
    else {
      // NULL-safe match untuk kolom kunci yang boleh kosong (mis. triwulan NULL =
      // baris tahunan): `= NULL` tidak pernah cocok sehingga upsert akan menduplikasi.
      const isNull = values[f] === null || values[f] === undefined;
      clauses.push(`\`${f}\` ${isNull ? "<=>" : "="} ?`);
      params.push(isNull ? null : values[f]);
    }
  }
  return { where: clauses.join(" AND "), params };
}

async function upsertRow(spec, values) {
  const { where, params } = keyWhere(spec, values);
  const existing = await q(`SELECT id FROM \`${spec.table}\` WHERE ${where} ORDER BY id LIMIT 1`, params);
  if (existing.length) {
    const sets = [];
    const vals = [];
    for (const c of spec.cols) {
      if (c.type === "kecamatan" || spec.key.includes(c.field)) continue;
      if (values[c.field] === null || values[c.field] === undefined) continue; // kosong → tidak diubah
      sets.push(`\`${c.field}\` = ?`);
      vals.push(values[c.field]);
    }
    if (spec.hasDesaNorm && values.desa) { sets.push("desa_norm = ?"); vals.push(normDesa(values.desa)); }
    if (!sets.length) return "skipped";
    vals.push(existing[0].id);
    await q(`UPDATE \`${spec.table}\` SET ${sets.join(", ")} WHERE id = ?`, vals);
    return "updated";
  }
  const cols = [];
  const vals = [];
  const push = (c, v) => { cols.push(`\`${c}\``); vals.push(v); };
  if (spec.kecamatan) push("kecamatan_id", values.kecamatan_id);
  for (const c of spec.cols) {
    if (c.type === "kecamatan") continue;
    if (values[c.field] === null || values[c.field] === undefined) continue;
    push(c.field, values[c.field]);
  }
  if (spec.hasDesaNorm && values.desa) push("desa_norm", normDesa(values.desa));
  if (spec.hasSumber) push("sumber", "manual");
  await q(`INSERT INTO \`${spec.table}\` (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, vals);
  return "inserted";
}

export async function importWorkbook(domainKey, buffer) {
  const domain = await loadDomain(domainKey);
  if (!domain) throw Object.assign(new Error(`Domain tidak dikenal: ${domainKey}`), { status: 404 });
  const kec = domain.sheets.some((s) => s.kecamatan) ? await loadKecamatan() : null;

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    throw Object.assign(new Error("File bukan .xlsx yang valid (bukan Excel Workbook?)"), { status: 400 });
  }

  const report = { domain: domainKey, sheets: [], inserted: 0, updated: 0, skipped: 0, errors: [] };
  for (const spec of domain.sheets) {
    const ws = wb.getWorksheet(spec.name);
    if (!ws) {
      report.sheets.push({ name: spec.name, table: spec.table, missing: true, inserted: 0, updated: 0, skipped: 0, errors: [] });
      continue;
    }
    const sheetReport = { name: spec.name, table: spec.table, inserted: 0, updated: 0, skipped: 0, errors: [] };

    // Peta header → kolom (kolom tak dikenal diabaikan)
    const headerRow = ws.getRow(1);
    const colMap = new Map(); // colIndex → col spec
    const unknown = [];
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = normStr(cellVal(cell));
      const col = spec.cols.find((c) => c.header.toLowerCase() === header.toLowerCase());
      if (col) colMap.set(colNumber, col);
      else if (header) unknown.push(header);
    });
    const requiredCols = spec.cols.filter((c) => c.required || spec.key.includes(c.field));
    const foundFields = new Set([...colMap.values()].map((c) => c.field));
    const missingCols = requiredCols.filter((c) => !foundFields.has(c.field));
    if (missingCols.length) {
      sheetReport.errors.push({ row: 1, message: `Kolom wajib tidak ditemukan di header: ${missingCols.map((c) => c.header).join(", ")}` });
      report.sheets.push(sheetReport);
      continue;
    }
    if (unknown.length) sheetReport.errors.push({ row: 1, message: `Kolom diabaikan (header tak dikenal): ${unknown.join(", ")}` });

    let processed = 0;
    for (let r = 2; r <= ws.rowCount; r++) {
      if (processed >= MAX_ROWS) {
        sheetReport.errors.push({ row: r, message: `Berhenti di baris ${r}: melebihi batas ${MAX_ROWS} baris per sheet` });
        break;
      }
      const row = ws.getRow(r);
      const rowMap = new Map();
      let allEmpty = true;
      for (const [colNumber, col] of colMap) {
        const v = cellVal(row.getCell(colNumber));
        if (v !== null && String(v).trim() !== "") allEmpty = false;
        rowMap.set(col.header, v);
      }
      if (allEmpty) continue;
      processed++;
      const { values, error } = validateRow(spec, kec, rowMap);
      if (error) {
        sheetReport.errors.push({ row: r, message: error });
        continue;
      }
      try {
        const res = await upsertRow(spec, values);
        sheetReport[res]++;
      } catch (e) {
        const msg = String(e?.sqlMessage ?? e?.message ?? e);
        sheetReport.errors.push({ row: r, message: `Gagal simpan ke DB: ${msg}` });
      }
    }
    report.sheets.push(sheetReport);
    report.inserted += sheetReport.inserted;
    report.updated += sheetReport.updated;
    report.skipped += sheetReport.skipped;
    report.errors.push(...sheetReport.errors.map((e) => ({ sheet: spec.name, ...e })));
  }
  return report;
}
