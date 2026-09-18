import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

# fetch the publication list page JS chunk to find the API endpoint
chunks = [
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/app/%5Blang%5D/publication/page-a4162c49d33ed43a.js",
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/2173-5de70caa13647d4d.js",
  "https://banjarnegarakab.bps.go.id/_next/static/chunks/3415-c4238e69b67eda6a.js",
]
for c in chunks:
    try:
        js = get(c)
        # find api urls
        urls = re.findall(r'["\'`]([^"\'`]*(?:web-api|/v1/api|api/|publication)[^"\'`]*)["\'`]', js)
        print("=== ", c, "len", len(js))
        for u in set(urls):
            if 'api' in u.lower() or 'publication' in u.lower():
                print("   ", u[:200])
    except Exception as e:
        print("ERR", c, e)
