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

  const lines = text.split("\n");
  let html = "";
  let inList = false;
  let inNumList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (inList) { html += "</ul>"; inList = false; }
      if (inNumList) { html += "</ol>"; inNumList = false; }
      html += "<br/>";
      continue;
    }

    let processed = escapeHtml(trimmed);

    // Inline formatting: bold, italic, code
    processed = processed
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-slate-100 rounded text-[11px] font-mono">$1</code>');

    // Headers (h1-h6)
    if (processed.startsWith("#### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      if (inNumList) { html += "</ol>"; inNumList = false; }
      html += `<p class="font-mono font-bold text-[12px] text-emerald-700 uppercase tracking-wide mt-2.5">${processed.slice(5)}</p>`;
      continue;
    }
    if (processed.startsWith("### ")) {
      if (inList) { html += "</ul>"; inList = false; }
      if (inNumList) { html += "</ol>"; inNumList = false; }
      html += `<p class="font-mono font-bold text-xs text-slate-800 uppercase tracking-wide mt-2">${processed.slice(4)}</p>`;
      continue;
    }
    if (processed.startsWith("## ")) {
      if (inList) { html += "</ul>"; inList = false; }
      if (inNumList) { html += "</ol>"; inNumList = false; }
      html += `<p class="font-mono font-bold text-sm text-slate-800 mt-2">${processed.slice(3)}</p>`;
      continue;
    }

    // Bullet list
    if (processed.startsWith("- ") || processed.startsWith("• ")) {
      if (!inList) { html += '<ul class="space-y-1 my-1">'; inList = true; }
      html += `<li class="flex gap-1.5"><span class="text-emerald-600 shrink-0">▸</span><span>${processed.replace(/^[-•]\s+/, "")}</span></li>`;
      continue;
    }

    // Numbered list
    const numMatch = processed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (!inNumList) { html += '<ol class="space-y-1 my-1">'; inNumList = true; }
      html += `<li class="flex gap-1.5"><span class="font-mono font-bold text-emerald-600 shrink-0">${numMatch[1]}.</span><span>${numMatch[2]}</span></li>`;
      continue;
    }

    if (inList) { html += "</ul>"; inList = false; }
    if (inNumList) { html += "</ol>"; inNumList = false; }

    html += `<p>${processed}</p>`;
  }

  if (inList) html += "</ul>";
  if (inNumList) html += "</ol>";

  return html;
}

interface ChatBotProps {
  /** Ringkasan data pertanian untuk konteks AI */
  dataContext: string;
}

/* ── Konfigurasi API ──────────────────────────────────────── */
const API_KEY = import.meta.env.VITE_CHATBOT_API_KEY || "";
const API_URL = import.meta.env.VITE_CHATBOT_API_URL || "https://9inference.cloud/v1/package/chat/completions";
const MODEL = import.meta.env.VITE_CHATBOT_MODEL || "deepseek-v4-pro-0813";

/* ── System Prompt ────────────────────────────────────────── */
const buildSystemPrompt = (dataContext: string) => `Kamu adalah "Si Pertani", seorang Analis Pertanian Senior dan Konsultan Agribisnis ahli yang khusus menganalisis data pertanian Kabupaten Banjarnegara, Provinsi Jawa Tengah, Indonesia.

Kamu memiliki pengetahuan ensiklopedis mengenai:
1. Karakteristik Agronomi Indonesia: Jenis tanah (Andosol, Aluvial, Podsolik), topografi, iklim tropis, zonasi wilayah dataran rendah hingga tinggi.
2. Komoditas Utama: Padi (pangan), hortikultura (cabai, bawang, kentang, kubis, tomat, petsai), perkebunan (kopi, teh, karet, kakao, tebu, dll), peternakan (sapi, kambing, domba, unggas), dan perikanan (budidaya, tangkap, pembenihan).
3. Dinamika Lapangan: Pola tanam petani, kearifan lokal Pranata Mangsa, tantangan hama/penyakit endemik, alih fungsi lahan.
4. Rantai Pasok & Ekonomi: Dinamika pasar, fluktuasi harga, peran tengkulak, logistik.
5. Regulasi & Kebijakan: Program Kementan, subsidi pupuk, Bulog, Food Estate, AUTP, sertifikasi ISPO/GAP/Organik.
6. Inovasi: Smart farming, IoT, mekanisasi pertanian, pertanian regeneratif.

Berikut adalah data riil dari Sistem Informasi Pertanian (SISPERTANI) Banjarnegara yang harus kamu gunakan sebagai dasar analisis:

${dataContext}

Aturan jawaban:
- Gunakan bahasa Indonesia yang profesional, analitis, dan mudah dipahami.
- Gunakan istilah teknis pertanian yang tepat, jelaskan singkat jika sangat spesifik.
- Jawaban harus berbasis data yang diberikan, objektif, dan solutif.
- Pertimbangkan 3 aspek: Kelayakan Ekonomi, Keberlanjutan Lingkungan, dan Dampak Sosial.
- Berikan rekomendasi yang actionable dan realistis.
- Jika pertanyaan di luar konteks pertanian Banjarnegara, arahkan kembali ke topik pertanian.
- Jawab dengan ringkas namun komprehensif. Gunakan format yang rapi (bullet points, penomoran) jika perlu.
- Jika data tidak cukup untuk menjawab, sampaikan dengan jujur dan sarankan data tambahan yang dibutuhkan.
- Anda memiliki akses ke KATALOG DATASET OPENDATA BANJARNEGARA (151 dataset). Jika pengguna menanyakan data spesifik yang mungkin tersedia di opendata.banjarnegarakab.go.id, Anda dapat menyarankan judul dataset, organisasi pemiliknya, dan menyebutkannya ada/tidak dalam katalog. Gunakan informasi katalog untuk memberikan rujukan yang akurat.`;

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
          temperature: 0.7,
          max_tokens: 1500,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        "Maaf, saya tidak dapat memproses jawaban saat ini. Silakan coba lagi.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
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

            {/* Loading indicator */}
            {isLoading && (
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
