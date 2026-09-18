import json, urllib.request, ssl, re
ctx = ssl._create_unverified_context()
BASE = "https://opendata.banjarnegarakab.go.id"
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})
    return json.load(urllib.request.urlopen(req, timeout=60, context=ctx))

# cari dataset terkait sensus/pertanian/st2023
for kw in ['sensus', 'pertanian', 'ternak', 'petani', '2000']:
    try:
        d = get(f"{BASE}/api/3/action/package_search?q={kw}&rows=100")
        pkgs = d['result']['results']
        print(f"=== q={kw} -> {d['result']['count']} dataset ===")
        for p in pkgs:
            print("  ", p['name'])
    except Exception as e:
        print("ERR", kw, e)
