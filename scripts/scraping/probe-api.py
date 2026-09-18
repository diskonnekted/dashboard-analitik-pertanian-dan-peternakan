import urllib.request, ssl, json
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept':'application/json,*/*'})
    try:
        return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')
    except Exception as e:
        return f"ERR {e}"

# coba beberapa endpoint API yang mungkin
candidates = [
  "https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/keyword/sensus%20pertanian",
  "https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1/keyword/sensus",
  "https://web-api.bps.go.id/v1/api/list/publication/domain/3304/keyword/sensus",
  "https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1",
]
for u in candidates:
    r = get(u)
    print("==== ", u)
    print(r[:600])
    print()
