"""
Cleanup script: pindahkan file yang tidak dipakai ke folder `_tmp/` di setiap folder dataset.

Yang TETAP:
- Wide CSV utama: `<folder>/<folder> CSV.csv`
- Tidy CSV: `tidy/<folder>/<folder> tidy.csv`

Yang PINDAH ke `_tmp/`:
- Semua `*.xlsx` (Excel sumber, sudah diekstrak ke CSV)
- `~$*.xlsx` (Excel lock files)
- CSV existing yang case-different atau nama tidak match pattern exact
"""

import shutil
from pathlib import Path

BASE = Path(r"I:/pertanian/pertanian-2/public/14. Distankan KP")
TIDY_BASE = BASE / "tidy"


def cleanup_folder(folder: Path):
    """Cleanup 1 folder dataset."""
    folder_name = folder.name
    wide_csv = folder / f"{folder_name} CSV.csv"
    tmp_dir = folder / "_tmp"
    tmp_dir.mkdir(exist_ok=True)

    moved = []
    kept = []

    for item in folder.iterdir():
        if item == tmp_dir:
            continue
        if item.is_dir():
            kept.append(item.name + "/")
            continue
        name = item.name
        if item == wide_csv:
            kept.append(name)
            continue
        target = tmp_dir / name
        shutil.move(str(item), str(target))
        moved.append(name)

    return kept, moved


def cleanup_tidy_folder(tidy_folder: Path):
    """Cleanup 1 sub-folder di tidy/ (e.g. tidy/Jumlah Ternak.../)."""
    folder_name = tidy_folder.name
    tidy_csv = tidy_folder / f"{folder_name} tidy.csv"
    tmp_dir = tidy_folder / "_tmp"
    tmp_dir.mkdir(exist_ok=True)

    moved = []
    kept = []

    for item in tidy_folder.iterdir():
        if item == tmp_dir:
            continue
        if item.is_dir():
            kept.append(item.name + "/")
            continue
        if item == tidy_csv:
            kept.append(item.name)
            continue
        target = tmp_dir / item.name
        shutil.move(str(item), str(target))
        moved.append(item.name)

    return kept, moved


def main():
    folders = sorted([f for f in BASE.iterdir() if f.is_dir() and f.name != "tidy"])
    print(f"Total folder dataset: {len(folders)}")

    total_moved_main = 0
    for folder in folders:
        kept, moved = cleanup_folder(folder)
        if moved:
            print(f"\n{folder.name}:")
            for m in moved:
                print(f"  -> _tmp/{m}")
            total_moved_main += len(moved)

    # Cleanup tidy sub-folders
    print(f"\n=== Tidy sub-folders ===")
    tidy_folders = sorted([f for f in TIDY_BASE.iterdir() if f.is_dir()])
    total_moved_tidy = 0
    for tidy_folder in tidy_folders:
        kept, moved = cleanup_tidy_folder(tidy_folder)
        if moved:
            print(f"\ntidy/{tidy_folder.name}:")
            for m in moved:
                print(f"  -> _tmp/{m}")
            total_moved_tidy += len(moved)

    print(f"\nTotal file dipindah dari folder dataset: {total_moved_main}")
    print(f"Total file dipindah dari tidy sub-folders: {total_moved_tidy}")
    print(f"Total: {total_moved_main + total_moved_tidy}")


if __name__ == "__main__":
    main()