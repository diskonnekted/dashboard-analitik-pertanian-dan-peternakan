import sys
import json
import fitz  # PyMuPDF

if len(sys.argv) < 3:
    print("Usage: python extract-pdf.py <input.pdf> <output.txt>")
    sys.exit(1)

pdf_path = sys.argv[1]
output_path = sys.argv[2]

try:
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"=== EXTRACTED TEXT FROM PDF ({total_pages} pages) ===\n\n")

        # Ekstrak teks halaman demi halaman
        for page_num in range(min(total_pages, 50)):  # Baca maks 50 halaman pertama
            page = doc.load_page(page_num)
            text = page.get_text()

            f.write(f"--- HALAMAN {page_num + 1} ---\n")
            f.write(text)
            f.write("\n\n")

    print(f"Success: Extracted {total_pages} pages to {output_path}")
    doc.close()

except Exception as e:
    print(f"Error: {str(e)}")
    sys.exit(1)
