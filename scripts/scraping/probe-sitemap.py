import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

for u in ["https://banjarnegarakab.bps.go.id/sitemap.xml",
          "https://banjarnegarakab.bps.go.id/robots.txt"]:
    try:
        r = get(u)
        print("==== ", u, " len", len(r))
        print(r[:1500])
    except Exception as e:
        print("ERR", u, e)
    print()
