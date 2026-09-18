import re, urllib.request, ssl, gzip, os
ctx = ssl._create_unverified_context()
h = open(r'I:\pertanian\pertanian-2\data-source\pub-list.html', encoding='utf-8').read()
srcs = sorted(set(re.findall(r'src="([^"]+)"', h)))
base = 'https://banjarnegarakab.bps.go.id'
os.makedirs(r'I:\pertanian\pertanian-2\data-source\_chunks', exist_ok=True)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    'Accept': '*/*', 'Referer': 'https://banjarnegarakab.bps.go.id/id/publication',
    'Accept-Encoding': 'gzip, deflate',
}
api_patterns = re.compile(r'(web-api\.bps\.go\.id[^"\'\s\\]*|/v\d+/api/[^"\'\s\\]*|publication[^"\'\s\\]*(?:search|list|domain|keyword)[^"\'\s\\]*)')

found = {}
for s in srcs:
    if not s.startswith('/_next/static/chunks/'):
        continue
    u = base + s
    name = s.rsplit('/', 1)[-1]
    try:
        req = urllib.request.Request(u, headers=headers)
        r = urllib.request.urlopen(req, timeout=40, context=ctx)
        data = r.read()
        if r.headers.get('Content-Encoding') == 'gzip':
            data = gzip.decompress(data)
        open(r'I:\pertanian\pertanian-2\data-source\_chunks\\' + name, 'wb').write(data)
        txt = data.decode('utf-8', 'replace')
        for m in api_patterns.finditer(txt):
            key = m.group(0)
            if 'web-api' in key or '/api/' in key or 'domain' in key or 'keyword' in key:
                found.setdefault(name, set()).add(key)
        print('OK', r.status, len(data), name)
    except Exception as e:
        print('ERR', name, repr(e)[:120])

print('\n===== API REFERENCES =====')
for name, pats in sorted(found.items()):
    print('---', name)
    for p in sorted(pats):
        print('   ', p[:250])
