fpath = r"I:/pertanian/pertanian-2/src/services/api.ts"
with open(fpath, "r", encoding="utf-8") as f:
    content = f.read()

old = 'petsai: cleanNum(findNum: cleanNum(findVal("Petsai", tahun)),'
new = 'petsai: cleanNum(findVal("Petsai", tahun)),'

if old in content:
    content = content.replace(old, new)
    with open(fpath, "w", encoding="utf-8") as f:
        f.write(content)
    print("FIXED")
else:
    print("NOT FOUND")