import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept':'application/json, text/html, */*'})
    try:
        r = urllib.request.urlopen(req, timeout=45, context=ctx)
        return r.status, r.read().decode('utf-8','replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8','replace')[:200]
    except Exception as e:
        return 'EXC', str(e)[:150]

KW = 'sensus pertanian 2023'
import urllib.parse
kw = urllib.parse.quote(KW)
tests = [
  f"https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1/keyword/{kw}",
  f"https://web-api.bps.go.id/v1/api/list/model/publication/domain/9/page/1/keyword/{kw}",
  f"https://web-api.bps.go.id/v1/api/list/model/publication/domain/1/page/1/keyword/{kw}",
  f"https://web-api.bps.go.id/api/list/model/publication/domain/3304/page/1/keyword/{kw}",
  f"https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1",
  f"https://banjarnegarakab.bps.go.id/id/search?keyword={kw}",
  f"https://banjarnegarakab.bps.go.id/id/search.html?keyword={kw}",
]
for u in tests:
    st, body = get(u)
    # ringkasan
    snippet = body[:160].replace('\n',' ')
    print(f"{st} | {u}")
    print("     ", snippet)
    print()
