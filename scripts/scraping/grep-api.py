import re, os, glob
d = r'I:\pertanian\pertanian-2\data-source\_chunks'
pat = re.compile(r'(https?://[a-zA-Z0-9.\-/]+api[a-zA-Z0-9.\-/]*|web-?api[^"\'\s\\]*|/[a-zA-Z0-9_./]*api/[a-zA-Z0-9_./?=&{}:%]*|baseURL[^,;]{0,80}|API_URL[^,;]{0,80}|apiUrl[^,;]{0,80})')
for f in sorted(glob.glob(d + '/*.js')):
    txt = open(f, encoding='utf-8', errors='replace').read()
    hits = set()
    for m in re.finditer(r'(https?://[^"\'\s\\]{0,120}|fetch\([^)]{0,80})', txt):
        hits.add(m.group(0)[:140])
    interesting = [x for x in hits if 'api' in x.lower() or 'web' in x.lower() or 'fetch(' in x.lower()]
    if interesting:
        print('===', os.path.basename(f))
        for x in sorted(interesting)[:40]:
            print('   ', x)
