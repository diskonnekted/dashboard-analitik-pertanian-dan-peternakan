$path = "I:\pertanian\pertanian-2\src\components\ChatBot.tsx"
$raw = [System.IO.File]::ReadAllText($path)

# ── 1) Ganti seluruh fungsi renderMarkdown ──────────────────
$startMarker = "function renderMarkdown(text: string): string {"
$endMarker = "interface ChatBotProps {"
$startIdx = $raw.IndexOf($startMarker)
$endIdx = $raw.IndexOf($endMarker)
if ($startIdx -lt 0 -or $endIdx -lt 0) { throw "marker tidak ditemukan (start=$startIdx end=$endIdx)" }

$newFunc = @'
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

    /* ── Tabel markdown ──
       Deteksi: baris "|" diikuti baris pemisah |---| (boleh ada
       baris kosong di antaranya — output LLM sering begitu).
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

'@

$raw = $raw.Substring(0, $startIdx) + $newFunc + $raw.Substring($endIdx)

# ── 2) Prompt: instruksi tabel rapat ────────────────────────
$oldBullet = "- Gunakan format rapi (poin bernomor/bullet; tabel kecil bila membantu). Ringkas namun komprehensif."
$newBullet = "- Gunakan format rapi (poin bernomor/bullet; tabel bila membantu). Jika menyajikan tabel, tulis tabel markdown standar (baris header, baris pemisah |---|, baris data) TANPA baris kosong di antaranya. Ringkas namun komprehensif."
if ($raw.Contains($oldBullet)) {
  $raw = $raw.Replace($oldBullet, $newBullet)
  Write-Host "prompt bullet tabel  : OK"
} else {
  Write-Host "prompt bullet tabel  : MARKER TIDAK ADA (cek manual)"
}

[System.IO.File]::WriteAllText($path, $raw, [System.Text.UTF8Encoding]::new($false))

# ── Verifikasi ──────────────────────────────────────────────
$check = [System.IO.File]::ReadAllText($path)
Write-Host ("isSeparatorRow     : " + $check.Contains('isSeparatorRow'))
Write-Host ("overflow-x-auto    : " + $check.Contains('overflow-x-auto'))
Write-Host ("bg-emerald-700 th  : " + $check.Contains('bg-emerald-700'))
Write-Host ("while loop         : " + $check.Contains('while (i < lines.length)'))
Write-Host ("interface utuh     : " + $check.Contains('interface ChatBotProps'))
