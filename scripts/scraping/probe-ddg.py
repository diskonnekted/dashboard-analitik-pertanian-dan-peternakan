import urllib.request, ssl, re, urllib.parse
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

q = 'hasil sensus pertanian 2023 kecamatan purwanegara banjarnegara bps'
url = 'https://html.duckduckgo.com/html/?q=' + urllib.parse.quote(q)
try:
    r = get(url)
    print("len", len(r))
    # ekstrak link hasil
    for m in re.finditer(r'uddg=([^&"]+)', r):
        u = urllib.parse.unquote(m.group(1))
        print("  ", u)
except Exception as e:
    print("ERR", e)
