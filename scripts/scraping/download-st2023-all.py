import json, urllib.request, ssl, os, re, time
ctx = ssl._create_unverified_context()
pubs = json.load(open(r'I:\pertanian\pertanian-2\data-source\_st2023-publications.json', encoding='utf-8'))

def kec_name(title):
    m = re.match(r'Hasil Sensus Pertanian 2023 Kecamatan (.+)', title)
    return m.group(1).strip() if m else None

targets = []
for p in pubs:
    k = kec_name(p['title'])
    if not k:
        continue
    fn = 'hasil-sensus-pertanian-2023-kecamatan-' + k.lower().replace(' ', '-') + '.pdf'
    path = os.path.join(r'I:\pertanian\pertanian-2\data-source', fn)
    targets.append((k, p['pdf'], path))

todo = [t for t in targets if not os.path.exists(t[2])]
print('TODO:', len(todo))
for i, (k, url, path) in enumerate(todo, 1):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
            'Referer':'https://banjarnegarakab.bps.go.id/'})
        r = urllib.request.urlopen(req, timeout=180, context=ctx)
        data = r.read()
        assert data[:5] == b'%PDF-', 'not a pdf'
        open(path, 'wb').write(data)
        print(f'[{i}/{len(todo)}] OK {k} ({len(data)//1024} KB)')
    except Exception as e:
        print(f'[{i}/{len(todo)}] FAIL {k}: {repr(e)[:100]}')
    time.sleep(0.5)
