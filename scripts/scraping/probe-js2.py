import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

chunks = [
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/main-app-880bf1748d113d6f.js",
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/6766-2f75c0e7333cc4ee.js",
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/3402-0000000000000000.js",
]
seen = set()
for c in chunks:
    try:
        js = get(c)
        for m in re.finditer(r'["\'`]([^"\'`]*(?:web-api\.bps|/v1/|/api/|\.php\?|list[_-]?data|publikasi|publication)[^"\'`]*)["\'`]', js):
            u = m.group(1)
            if u not in seen and len(u) < 120:
                seen.add(u)
                print("  ", u)
    except Exception as e:
        print("ERR", c, e)
print("---- done, total", len(seen))
