import urllib.request, ssl, re, urllib.parse, html
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept':'text/html,application/xhtml+xml'})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

q = 'hasil sensus pertanian 2023 kecamatan purwanegara banjarnegara'
r = get('https://www.bing.com/search?q=' + urllib.parse.quote(q))
# semua kemunculan bps.go.id (termasuk citation + data dalam base64)
for m in re.finditer(r'bps\.go\.id[^"\s<>]{0,120}', r):
    print("  ", m.group(0))
print("---- juga cek judul hasil ----")
for m in re.finditer(r'<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>(.*?)</a></h2>', r, re.S):
    title = re.sub('<[^>]+>','',m.group(2))
    print("  TITLE:", html.unescape(title).strip()[:90])
    print("    URL:", m.group(1)[:150])
