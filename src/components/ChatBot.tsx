import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Send, X, MessageCircle, Sparkles } from "lucide-react";

/* ── Types ────────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/* ── Markdown Renderer (ringan, tanpa dependency) ─────────── */
function renderMarkdown(text: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inlineFmt = (s: string) =>
    escapeHtml(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono">$1</code>');

  // Baris pemisah tabel: |---|, |:---:|, dsb.
  const isSeparatorRow = (s: string) =>
    /^\|?[\s:|-]+\|?$/.test(s) && s.includes("-");

  const parseRow = (line: string): string[] => {
    let l = line.trim();
    if (l.startsWith("|")) l = l.slice(1);
    if (l.endsWith("|")) l = l.slice(0, -1);
    return l.split("|").map((c) => c.trim());
  };

  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let inNumList = false;
  const closeLists = () => {
    if (inList) { html += "</ul>"; inList = false; }
    if (inNumList) { html += "</ol>"; inNumList = false; }
  };

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (trimmed === "") {
      closeLists();
      html += "<br/>";
      i++;
      continue;
    }

    /* â”€â”€ Tabel markdown â”€â”€
       Deteksi: baris "|" diikuti baris pemisah |---| (boleh ada
       baris kosong di antaranya â€” output LLM sering begitu).
       Baris data juga boleh dipisah baris kosong. */
    if (trimmed.startsWith("|")) {
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      if (j < lines.length && lines[j].trim().startsWith("|") && isSeparatorRow(lines[j].trim())) {
        closeLists();
        const header = parseRow(trimmed);
        const aligns = parseRow(lines[j].trim()).map((a) =>
          a.startsWith(":") && a.endsWith(":") ? "center" : a.endsWith(":") ? "right" : "left"
        );
        const alignOf = (idx: number) => aligns[idx] || "left";

        const rows: string[][] = [];
        let k = j + 1;
        while (k < lines.length) {
          const t = lines[k].trim();
          if (t === "") {
            // toleransi baris kosong antar baris tabel
            let m = k + 1;
            while (m < lines.length && lines[m].trim() === "") m++;
            if (m < lines.length && lines[m].trim().startsWith("|")) { k = m; continue; }
            break;
          }
          if (!t.startsWith("|")) break;
          if (isSeparatorRow(t)) { k++; continue; }
          rows.push(parseRow(t));
          k++;
        }

        html += '<div class="overflow-x-auto my-2 rounded-lg border border-slate-200 shadow-sm"><table class="min-w-full text-[11px] leading-snug border-collapse">';
        html += "<thead><tr>";
        header.forEach((h, idx) => {
          html += `<th class="bg-emerald-700 text-white font-semibold px-2.5 py-1.5 border-b-2 border-emerald-800 whitespace-nowrap" style="text-align:${alignOf(idx)}">${inlineFmt(h)}</th>`;
        });
        html += "</tr></thead><tbody>";
        rows.forEach((r, ri) => {
          html += `<tr class="${ri % 2 === 1 ? "bg-slate-50" : "bg-white"}">`;
          r.forEach((c, ci) => {
            html += `<td class="px-2.5 py-1.5 border-b border-slate-100 align-top text-slate-700" style="text-align:${alignOf(ci)}">${inlineFmt(c)}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table></div>";
        i = k;
        continue;
      }
    }

    let processed = inlineFmt(trimmed);

    // Headers (h4-h2)
    if (processed.startsWith("#### ")) {
      closeLists();
      html += `<p class="font-mono font-bold text-[12px] text-emerald-700 uppercase tracking-wide mt-2.5">${processed.slice(5)}</p>`;
      i++;
      continue;
    }
    if (processed.startsWith("### ")) {
      closeLists();
      html += `<p class="font-mono font-bold text-xs text-slate-800 uppercase tracking-wide mt-2">${processed.slice(4)}</p>`;
      i++;
      continue;
    }
    if (processed.startsWith("## ")) {
      closeLists();
      html += `<p class="font-mono font-bold text-sm text-slate-800 mt-2">${processed.slice(3)}</p>`;
      i++;
      continue;
    }

    // Bullet list
    if (processed.startsWith("- ") || processed.startsWith("* ")) {
      if (!inList) { html += '<ul class="space-y-1 my-1">'; inList = true; }
      html += `<li class="flex gap-1.5"><span class="text-emerald-600 shrink-0">&#9656;</span><span>${processed.replace(/^[-*]\s+/, "")}</span></li>`;
      i++;
      continue;
    }

    // Numbered list
    const numMatch = processed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (!inNumList) { html += '<ol class="space-y-1 my-1">'; inNumList = true; }
      html += `<li class="flex gap-1.5"><span class="font-mono font-bold text-emerald-600 shrink-0">${numMatch[1]}.</span><span>${numMatch[2]}</span></li>`;
      i++;
      continue;
    }

    closeLists();
    html += `<p>${processed}</p>`;
    i++;
  }

  closeLists();
  return html;
}
interface ChatBotProps {
  /** Ringkasan data pertanian untuk konteks AI */
  dataContext: string;
}

/* ── Konfigurasi API ──────────────────────────────────────── */
const API_KEY = import.meta.env.VITE_CHATBOT_API_KEY || "";
const API_URL = import.meta.env.VITE_CHATBOT_API_URL || "https://9inference.cloud/v1/package/chat/completions";
const MODEL = import.meta.env.VITE_CHATBOT_MODEL || "glm-5.3";

/* ── System Prompt ────────────────────────────────────────── */
const buildSystemPrompt = (dataContext: string) => `Kamu adalah "Si Pertani" -- asisten AI resmi SISPERTANI (Sistem Informasi Pertanian Kabupaten Banjarnegara, Dinas Ketahanan Pangan dan Pertanian). Kamu berperan ganda: Analis Pertanian Senior DAN Konsultan Agribisnis yang menguasai konteks Kabupaten Banjarnegara, Provinsi Jawa Tengah, Indonesia.

KEAHLIANMU:
1. Analisa data pertanian: membaca tren produksi, luas panen, produktivitas, dan populasi; menghitung rata-rata tertimbang (mis. total produksi / total luas); membandingkan antar kecamatan; menginterpretasi konsentrasi geografis (HHI) dan indikator ekonomi sektoral.
2. Agronomi Indonesia: jenis tanah (Andosol, Aluvial, Podsolik), topografi, iklim tropis-muson (kemarau Apr-Okt, penghujan Nov-Mar), zonasi dataran rendah hingga dataran tinggi Dieng (~2000 mdpl).
3. Komoditas utama Banjarnegara: padi sawah & ladang; hortikultura (bawang merah, bawang putih, cabai besar/rawit, kentang, kubis, tomat, petsai); perkebunan (kopi, teh, karet, kakao, tebu, kelapa); peternakan (sapi, kambing, domba, unggas); perikanan (budidaya kolam, karamba, tangkap, pembenihan).
4. Dinamika lapangan: pola tanam, kearifan lokal Pranata Mangsa, organisme pengganggu tumbuhan endemik, alih fungsi lahan.
5. Rantai pasok & ekonomi: simpul pasar, fluktuasi harga dan inflasi pangan, logistik antar kecamatan, nilai ekonomi komoditas.
6. Regulasi & program: Kementan, subsidi pupuk, AUTP, LP2B/RTRW, SIMLUH, kelembagaan Poktan/Gapoktan/KTH.

DATA RIIL SISPERTANI (wajib menjadi dasar analisis):

${dataContext}

ATURAN MENGGUNAKAN DATA:
- Seluruh jawaban harus berbasis data di atas. Kutip angka spesifik beserta satuan, kecamatan, dan tahunnya -- dilarang mengarang angka.
- Bedakan dengan jelas antara: FAKTA dari data, INTERPRETASI/analisis, dan REKOMENDASI.
- Saat menghitung (mis. produktivitas = produksi / luas), tunjukkan cara hitungnya secara singkat agar pengguna bisa memverifikasi.
- Jika data tidak cukup atau tidak tersedia, katakan dengan jujur, sebutkan dataset apa yang dibutuhkan, dan rujuk katalog OpenData Banjarnegara bila relevan (sebutkan judul dataset dan organisasi pemiliknya).
- Sebutkan cakupan tahun data saat menjawab pertanyaan tren historis.

BAHASA (WAJIB):
- SELALU jawab dalam Bahasa Indonesia baku yang baik dan mudah dipahami, APA PUN bahasa yang dipakai pengguna (termasuk bila pengguna menulis dalam bahasa Inggris, Jawa, atau bahasa lain).
- Istilah teknis asing (mis. "HHI", "supply chain") boleh dipakai bila perlu, tetapi wajib dijelaskan dalam Bahasa Indonesia.

GAYA KONSULTASI:
- Bahasa Indonesia profesional, analitis, dan mudah dipahami -- melayani petani, penyuluh, maupun pengambil kebijakan.
- Solutif dan actionable: berikan langkah konkret, bukan teori kosong. Pertimbangkan kelayakan ekonomi, keberlanjutan lingkungan, dan dampak sosial.
- Untuk konsultasi budidaya (jadwal tanam, pemupukan, pengendalian hama/penyakit, pascapanen, pemasaran): sesuaikan dengan agroekologi Banjarnegara (dataran tinggi Dieng vs dataran rendah; pola musim muson), dan sarankan konfirmasi ke penyuluh/PPL kecamatan setempat untuk keputusan lapangan.
- Gunakan format rapi (poin bernomor/bullet; tabel bila membantu). Jika menyajikan tabel, tulis tabel markdown standar (baris header, baris pemisah |---|, baris data) TANPA baris kosong di antaranya. Ringkas namun komprehensif.
- Jika pertanyaan di luar konteks pertanian, jawab seperlunya lalu arahkan kembali ke topik pertanian Banjarnegara.

Ingat seluruh riwayat percakapan dalam sesi ini; jawabanmu harus konsisten dengan jawaban sebelumnya.`;

/* ── Quick Suggestions ────────────────────────────────────── */
const QUICK_QUESTIONS = [
  "Analisa produksi padi Banjarnegara",
  "Komoditas unggulan hortikultura",
  "Rekomendasi peningkatan ketahanan pangan",
  "Potensi sektor peternakan",
];

/* ── Component ────────────────────────────────────────────── */
export default function ChatBot({ dataContext }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya **Si Pertani**, asisten analisis pertanian Anda. Saya siap menjelaskan data pertanian dan analisa di web SISPERTANI Banjarnegara. Apa yang ingin Anda ketahui?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll ke bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  /* Focus input saat buka */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setIsStreaming(false);

    try {
      const systemPrompt = buildSystemPrompt(dataContext);
      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: apiMessages,
          temperature: 0.6,
          max_tokens: 8192,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      if (!response.body) {
        throw new Error("Streaming tidak didukung browser ini");
      }

      /* ── Streaming SSE: jawaban tampil progresif ────────────
         Format: baris "data: {JSON}" diakhiri "data: [DONE]".
         glm-5.3 (model reasoning) mengirim delta.reasoning_content
         lebih dulu -- fase berpikir, diabaikan; hanya delta.content
         yang ditampilkan. Baris keep-alive (awalan ":") diabaikan. */
      let acc = "";
      let streamStarted = false;
      let lastPaint = 0;

      const paintBubble = (text: string) =>
        setMessages((prev) => {
          if (prev.length === 0 || prev[prev.length - 1].role !== "assistant") {
            return [...prev, { role: "assistant", content: text }];
          }
          const next = prev.slice();
          next[next.length - 1] = { role: "assistant", content: text };
          return next;
        });

      const handleLine = (raw: string) => {
        const t = raw.trim();
        if (!t.startsWith("data:")) return;
        const payload = t.slice(5).trim();
        if (!payload || payload === "[DONE]") return;
        let piece: string | undefined;
        try {
          piece = (JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          }).choices?.[0]?.delta?.content;
        } catch {
          return; // JSON parsial antar chunk jaringan -- abaikan
        }
        if (!piece) return;
        acc += piece;
        const now = Date.now();
        if (!streamStarted) {
          streamStarted = true;
          setIsStreaming(true);
          lastPaint = now;
          paintBubble(acc);
        } else if (now - lastPaint > 80) {
          lastPaint = now;
          paintBubble(acc);
        }
      };

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // baris terakhir bisa parsial
        for (const line of lines) handleLine(line);
      }
      buffer += decoder.decode(); // flush byte UTF-8 sisa
      for (const line of buffer.split("\n")) handleLine(line);

      if (streamStarted) {
        paintBubble(acc); // flush teks final di bawah ambang throttle
      } else {
        // Anggaran token bisa habis semua di fase reasoning -- jawaban kosong
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Maaf, saya tidak dapat memproses jawaban saat ini. Silakan coba lagi.",
          },
        ]);
      }
    } catch (error) {
      console.error("ChatBot API error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Maaf, terjadi kesalahan koneksi. Pastikan jaringan internet tersedia dan coba lagi. Jika masalah berlanjut, hubungi administrator sistem.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating Button ─────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="no-print fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 hover:shadow-xl transition-all duration-200 group"
          aria-label="Buka chat Si Pertani"
        >
          <div className="relative">
            <img
              src="/sipertani.ico"
              alt="Si Pertani"
              className="w-8 h-8 rounded-lg object-cover"
            />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full ring-2 ring-emerald-600 animate-pulse" />
          </div>
          <span className="font-mono font-bold text-sm uppercase tracking-wide hidden sm:inline group-hover:inline">
            Si Pertani
          </span>
        </button>
      )}

      {/* ── Chat Panel ──────────────────────────────────── */}
      {isOpen && (
        <div className="no-print fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[600px] max-h-[100vh] sm:max-h-[85vh] bg-white border border-slate-200 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src="/sipertani.ico"
                  alt="Si Pertani"
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-300 rounded-full ring-2 ring-emerald-700" />
              </div>
              <div>
                <h3 className="font-mono font-bold text-sm uppercase tracking-wide">
                  Si Pertani
                </h3>
                <p className="text-[10px] font-mono text-emerald-100 flex items-center gap-1">
                  <Sparkles size={10} />
                  Analis Pertanian AI
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              aria-label="Tutup chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                    msg.role === "user"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {msg.role === "user" ? (
                    <MessageCircle size={16} />
                  ) : (
                    <img
                      src="/sipertani.ico"
                      alt="Si Pertani"
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  )}
                </div>
                {/* Bubble */}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-tr-md whitespace-pre-wrap"
                      : "bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-md shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="[&_p]:mb-1 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_ul]:space-y-1 [&_ol]:space-y-1"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Indikator berpikir (sebelum token pertama tampil) */}
            {isLoading && !isStreaming && (
              <div className="flex gap-2.5 flex-row">
                <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden">
                  <img
                    src="/sipertani.ico"
                    alt="Si Pertani"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md shadow-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick questions (hanya tampil saat pesan pertama) */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
                  Coba tanyakan:
                </p>
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pertanyaan tentang pertanian..."
                rows={1}
                className="flex-1 resize-none border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-all max-h-32"
                style={{ minHeight: "42px" }}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
                aria-label="Kirim pesan"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-[9px] font-mono text-slate-400 mt-1.5 text-center">
              Si Pertani berdasarkan data SISPERTANI Banjarnegara
            </p>
          </div>
        </div>
      )}
    </>
  );
}
