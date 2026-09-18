import urllib.request, ssl, gzip, io
ctx = ssl._create_unverified_context()

url = 'https://banjarnegarakab.bps.go.id/_next/static/chunks/app/%5Blang%5D/publication/page-a4162c49d33ed43a.js'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
    'Referer': 'https://banjarnegarakab.bps.go.id/id/publication',
    'Accept-Encoding': 'gzip, deflate, br',
}
req = urllib.request.Request(url, headers=headers)
try:
    r = urllib.request.urlopen(req, timeout=45, context=ctx)
    data = r.read()
    if r.headers.get('Content-Encoding') == 'gzip':
        data = gzip.decompress(data)
    print('STATUS', r.status, 'LEN', len(data), 'CT', r.headers.get('Content-Type'))
    open(r'I:\pertanian\pertanian-2\data-source\_pub-page.js','wb').write(data)
    txt = data.decode('utf-8','replace')
    # search for api endpoints
    import re
    for m in re.finditer(r'web-api\.bps\.go\.id[^"\'`\s]*|[^"\'`\s]*/v1/api/[^"\'`\s]*|[^"\'`\s]*/api/[^"\'`\s]*', txt):
        print(m.group(0)[:200])
except urllib.error.HTTPError as e:
    print('HTTP ERROR', e.code, e.read()[:300])
except Exception as e:
    print('ERR', repr(e))
