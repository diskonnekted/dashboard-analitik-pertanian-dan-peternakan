import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
BASE = "https://banjarnegarakab.bps.go.id"

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept':'text/html,*/*', 'Accept-Language':'id-ID,id;q=0.9'})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

html = get(BASE + '/id/publication')
open(r'I:\pertanian\pertanian-2\data-source\pub-list.html','w',encoding='utf-8').write(html)
print("len", len(html))
# cari semua link href
links = re.findall(r'href="([^"]+)"', html)
for l in links:
    if 'publication' in l.lower() or 'sensus' in l.lower() or 'pdf' in l.lower() or 'api' in l.lower() or '.json' in l.lower():
        print(l)
