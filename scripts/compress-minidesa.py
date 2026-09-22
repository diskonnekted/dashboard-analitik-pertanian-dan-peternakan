# Kompresi foto ilustrasi popup desa (public/img/minidesa -> public/img/minidesa-min)
# Sumber: foto mentah pengguna (126-229 KB, resolusi penuh) — dibiarkan utuh.
# Output: lebar 480px (cukup untuk kolom popup ~205px @2x retina), q72 progressive.
# Penamaan: lowercase + spasi -> hyphen (ASCII-only, aman untuk fetch & deploy pscp).
import os
import glob

from PIL import Image

SRC = r"I:\pertanian\pertanian-2\public\img\minidesa"
DST = r"I:\pertanian\pertanian-2\public\img\minidesa-min"
TARGET_W = 480
TARGET_ASPECT = 4 / 3  # display popup ~205x154, rasio 4:3
QUALITY = 70

def center_crop(img: Image.Image, aspect: float) -> Image.Image:
    w, h = img.size
    if w / h > aspect:  # terlalu lebar -> potong sisi
        new_w = round(h * aspect)
        x = (w - new_w) // 2
        return img.crop((x, 0, x + new_w, h))
    new_h = round(w / aspect)  # terlalu tinggi -> potong atas-bawah
    y = (h - new_h) // 2
    return img.crop((0, y, w, y + new_h))

os.makedirs(DST, exist_ok=True)

total_before = 0
total_after = 0
files = [
    p
    for p in sorted(glob.glob(os.path.join(SRC, "*")))
    if os.path.splitext(p)[1].lower() in (".jpg", ".jpeg")
]
for path in files:
    base = os.path.splitext(os.path.basename(path))[0]
    out_name = base.strip().lower().replace(" ", "-") + ".jpg"
    out_path = os.path.join(DST, out_name)
    img = Image.open(path).convert("RGB")
    if img.size[0] > TARGET_W:
        img = img.resize((TARGET_W, round(img.size[1] * TARGET_W / img.size[0])), Image.LANCZOS)
    img = center_crop(img, TARGET_ASPECT)
    img.save(out_path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    before = os.path.getsize(path)
    after = os.path.getsize(out_path)
    total_before += before
    total_after += after
    src_w, src_h = Image.open(path).size
    print(f"{os.path.basename(path):16s} {src_w}x{src_h} {before//1024:4d}KB -> {out_name:16s} {img.size[0]}x{img.size[1]} {after//1024:3d}KB")

print(f"\nTOTAL: {total_before//1024} KB -> {total_after//1024} KB ({100*total_after//max(total_before,1)}%)")
