/**
 * Generator analisa rekomendasi per bidang via AI (9inference / qwen3.8-max).
 *
 * Memakai konfigurasi env yang SAMA dengan ChatBot (VITE_CHATBOT_*), jadi tidak
 * perlu kunci/endpoint baru. Mengembalikan array rekomendasi terstruktur (JSON)
 * yang siap dirender ke kartu rekomendasi di halaman /recommendations.
 *
 * Dipanggil on-demand lewat tombol "Analisa" per bidang (Pertanian / Peternakan /
 * Perikanan). Hasilnya bersifat PELENGKAP rekomendasi statis resmi, bukan pengganti.
 */

export interface AiRekomendasi {
  judul: string;
  masalah: string;
  aksi: string[];
  dampak: string;
  prioritas: "Tinggi" | "Sedang" | "Jangka Panjang";
}

const API_KEY = import.meta.env.VITE_CHATBOT_API_KEY || "";
const API_URL =
  import.meta.env.VITE_CHATBOT_API_URL ||
  "https://9inference.cloud/v1/package/chat/completions";
const MODEL = import.meta.env.VITE_CHATBOT_MODEL || "qwen3.8-max";

const PRIORITAS_VALID: readonly string[] = ["Tinggi", "Sedang", "Jangka Panjang"];

function buildPrompt(namaBidang: string, dataContext: string): string {
  return `Anda adalah analis kebijakan pertanian, peternakan, dan perikanan Pemerintah Kabupaten Banjarnegara, Jawa Tengah.

Tugas: susun rekomendasi kebijakan yang SPECIFIK dan DATA-DRIVEN untuk bidang "${namaBidang}" berdasarkan data resmi berikut.

== DATA BIDANG ${namaBidang.toUpperCase()} ==
${dataContext}

== ATURAN ==
- Buat 3 sampai 4 rekomendasi.
- Setiap rekomendasi harus konkret, dapat ditindaklanjuti (actionable), dan merujuk angka / kecamatan / konteks yang benar-benar ada di data di atas.
- JANGAN mengarang angka atau nama yang tidak ada di data.
- Gunakan bahasa Indonesia formal, singkat, dan padat.
- "prioritas" harus salah satu dari: "Tinggi", "Sedang", "Jangka Panjang".

== FORMAT OUTPUT ==
Balas HANYA dengan array JSON murni (tanpa kalimat pembuka, tanpa markdown code fence) dengan struktur persis berikut:
[
  {
    "judul": "Judul Rekomendasi",
    "masalah": "Permasalahan yang diangkat, boleh merujuk angka data.",
    "aksi": ["Langkah konkret 1", "Langkah konkret 2"],
    "dampak": "Dampak yang diharapkan.",
    "prioritas": "Tinggi"
  }
]`;
}

/** Ekstrak array JSON dari teks model (tahan terhadap code fence / teks pengantar). */
function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("[");
  const end = t.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

/** Validasi + normalisasi hasil AI ke bentuk AiRekomendasi yang aman dirender. */
function normalize(raw: unknown): AiRekomendasi[] {
  if (!Array.isArray(raw)) {
    throw new Error("Format AI tidak valid (bukan array JSON).");
  }
  const out: AiRekomendasi[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const judul = typeof o.judul === "string" ? o.judul.trim() : "";
    const masalah = typeof o.masalah === "string" ? o.masalah.trim() : "";
    const dampak = typeof o.dampak === "string" ? o.dampak.trim() : "";
    const aksi = (Array.isArray(o.aksi) ? o.aksi : [])
      .filter((a): a is string => typeof a === "string")
      .map((a) => a.trim())
      .filter(Boolean);
    const prioritasRaw = typeof o.prioritas === "string" ? o.prioritas.trim() : "";
    const prioritas = PRIORITAS_VALID.includes(prioritasRaw)
      ? (prioritasRaw as AiRekomendasi["prioritas"])
      : "Sedang";
    if (!judul && !masalah && aksi.length === 0) continue;
    out.push({ judul: judul || "(Tanpa judul)", masalah, aksi, dampak, prioritas });
  }
  if (out.length === 0) {
    throw new Error("AI tidak mengembalikan rekomendasi yang valid.");
  }
  return out;
}

/**
 * Panggil AI untuk menyusun rekomendasi satu bidang.
 * @param namaBidang  mis. "Pertanian" / "Peternakan" / "Perikanan"
 * @param dataContext ringkasan data bidang tsb (angka, sentra, konteks pasar)
 */
export async function generateSectorAnalysis(
  namaBidang: string,
  dataContext: string,
): Promise<AiRekomendasi[]> {
  if (!API_KEY) {
    throw new Error("Kunci API AI belum dikonfigurasi (VITE_CHATBOT_API_KEY di .env).");
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Anda adalah analis kebijakan pertanian yang presisi dan berbasis data. Anda hanya membalas dengan array JSON valid, tanpa teks lain.",
        },
        { role: "user", content: buildPrompt(namaBidang, dataContext) },
      ],
      temperature: 0.7,
      max_tokens: 8192,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API AI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  // qwen3.8-max = model reasoning: reasoning_content (fase berpikir) diabaikan,
  // hanya message.content (jawaban final) yang dipakai.
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("AI tidak mengembalikan konten jawaban.");
  }
  return normalize(extractJson(content));
}
