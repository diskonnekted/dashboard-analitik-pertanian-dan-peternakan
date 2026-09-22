// Uji semua endpoint yang diiklankan /api/v1 — deteksi mismatch daftar vs router
const BASE = "http://127.0.0.1:4100";
const res = await fetch(`${BASE}/api/v1`);
const { endpoints } = await res.json();
let ok = 0, bad = 0;
for (const ep of endpoints) {
  const url = BASE + ep;
  try {
    const r = await fetch(url);
    if (r.ok) { ok++; console.log(`OK   ${r.status} ${ep}`); }
    else { bad++; console.log(`BAD  ${r.status} ${ep}`); }
  } catch (e) { bad++; console.log(`ERR  -    ${ep} (${e.message})`); }
}
console.log(`\nTOTAL: ${endpoints.length} diiklankan, ${ok} OK, ${bad} GAGAL`);
