# Rencana Pengembangan Chatbot "Si Pertani" — Menuju RAG

**Tanggal:** 2026-09-30
**Status:** Rencana (belum diimplementasikan)
**Konteks:** Chatbot tidak bisa menemukan data wortel padahal data ada di `/horticulture`.

---

## 1. Masalah Saat Ini

Chatbot **tidak benar-benar membaca data**. Alur sekarang:

1. Halaman `/recommendations` menyusun **satu string statis** `chatBotContext`
   (`src/pages/recommendations.tsx` ± baris 651).
2. String disuntikkan ke *system prompt* lewat `buildSystemPrompt(dataContext)`
   (`src/components/ChatBot.tsx`), lalu AI diinstruksikan:
   *"jawab HANYA dari data ini, kalau tidak ada bilang jujur."*
3. Isi `chatBotContext` **hanya**:
   - Ringkasan agregat padi/sapi/ikan (Top-5 kecamatan),
   - Narasi hardcoded (daftar sayuran — **wortel tidak disebut**),
   - Daftar **judul** 40 dataset CKAN (judul saja, bukan isi).

**Akibat:** wortel tidak pernah masuk konteks. Data wortel asli ada di
`fetchVegetableProduction()` (dipakai `/horticulture`), tapi fungsi itu tidak
pernah dipanggil untuk chatbot. AI menjawab "tidak ada" karena instruksinya
begitu — **bukan bug AI**, tapi arsitektur konteks yang terbatas.

### Jawaban 3 pertanyaan kunci

| Pertanyaan | Jawaban |
|---|---|
| Perlu index lengkap? | Ya, tapi **bukan** suntik semua data mentah (boros token). Butuh index **metadata + retrieval**. |
| Bisa mendekati RAG? | Bisa, sangat cocok. 2 cara: pseudo-RAG (retrieval keyword) atau function-calling (tool-use). |

---

## 2. Opsi Pengembangan

### Opsi A — Index statis lengkap (suntik semua) — ❌ TIDAK DIREKOMENDASIKAN
Bangun satu string besar berisi semua komoditas × kecamatan × tahun.
- ➕ Simpel, tanpa ubah alur chat.
- ➖ Ratusan ribu baris → meledakkan context window, lambat, mahal, banyak data
  tak relevan.

### Opsi B — Pseudo-RAG (retrieval sisi klien) — ⭐ pragmatis
Lapisan *index* dari semua fetcher yang sudah ada:
- Setiap dataset dipetakan ke metadata:
  `{nama, komoditas[], satuan, tahun[], kecamatan[], contoh baris}`.
- Saat user bertanya, kata kunci dicocokkan ("wortel" → dataset hortikultura),
  ambil **Top-K baris relevan saja**, suntikkan **hanya itu** ke prompt.
- ➕ Skala bagus, token hemat, tanpa vector DB / backend baru. Pencocokan
  keyword + tag cukup untuk bahasa Indonesia + daftar komoditas dikenal.
- ➖ Kurang presisi untuk pertanyaan ambigu; perlu daftar sinonim
  (mis. "wortel" = "carrot").

### Opsi C — Function-calling / tool-use (agent) — ⭐ paling akurat, paling RAG-like
Beri model *tool definitions*: `getHortikultura(komoditas, tahun, kecamatan)`,
`getPeternakan(...)`, `cariDataset(query)`. Model **memanggil tool** → klien
menjalankan fetcher yang sudah ada → hasil dikembalikan → model menjawab.
- ➕ Paling akurat & hemat token (hanya ambil data yang ditanya). `qwen3.8-max`
  (API OpenAI-compatible) mendukung `tools`.
- ➖ Perlu ubah `ChatBot.tsx` jadi loop multi-giliran
  (kirim → deteksi tool_call → eksekusi → kirim ulang). Kerja lebih banyak.

---

## 3. Rekomendasi

**Opsi C (function-calling)** paling tepat karena semua data sudah tersedia lewat
~40 fetcher di `src/services/api.ts` — tinggal dibungkus jadi tool. Chatbot bisa
*menemukan sendiri* data apa pun (wortel, salak, telur, dll.) tanpa menebak
pertanyaan user, token tetap efisien.

Kalau ingin hasil cepat dengan usaha minimal, **Opsi B** jadi batu loncatan
(dan bisa di-upgrade ke C karena index-nya dipakai ulang).

### Perkiraan usaha
- **B**: ~1 file index/retrieval baru + ubah cara `chatBotContext` dibangun (sedang).
- **C**: ~1 file definisi tool + rewrite alur `sendMessage` di `ChatBot.tsx`
  jadi loop tool-calling (sedang-besar).

---

## 4. File Terkait (untuk implementasi)

- `src/components/ChatBot.tsx` — komponen chatbot, `buildSystemPrompt`, `sendMessage` (streaming SSE).
- `src/pages/recommendations.tsx` — penyusun `chatBotContext`, render `<ChatBot dataContext={...}/>`.
- `src/services/api.ts` — ~40 fetcher (`fetchVegetableProduction`, `fetchLivestockPopulation`, dll.) = sumber data riil.
- `src/services/aiRecommendation.ts` — pola pemanggilan API non-streaming (rujukan untuk tool-loop).
- `.env` — `VITE_CHATBOT_API_KEY`, `VITE_CHATBOT_API_URL`, `VITE_CHATBOT_MODEL` (qwen3.8-max).

### Catatan konfigurasi API
- Endpoint: `https://9inference.cloud/v1/package/chat/completions`
- Model: `qwen3.8-max` (reasoning model: kirim `reasoning_content` saat berpikir,
  lalu `content` untuk jawaban final, diakhiri `data: [DONE]`).
- Untuk tool-use: pakai `stream:false` dulu agar parsing `tool_calls` lebih mudah,
  atau tangani `tool_calls` delta saat streaming.
