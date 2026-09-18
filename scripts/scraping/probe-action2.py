import urllib.request, ssl, json, re
ctx = ssl._create_unverified_context()

url = 'https://banjarnegarakab.bps.go.id/id/publication'
action_id = '60cd2ef6d9f1f17b0b90c6c292a1a9d55d7d508ae2'
body = '["id",{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    'Next-Action': action_id,
    'Content-Type': 'text/plain;charset=UTF-8',
    'Accept': 'text/x-component',
    'Referer': 'https://banjarnegarakab.bps.go.id/id/publication',
    'Origin': 'https://banjarnegarakab.bps.go.id',
    'RSC': '1',
}
req = urllib.request.Request(url, data=body.encode(), headers=headers, method='POST')
r = urllib.request.urlopen(req, timeout=45, context=ctx)
data = r.read()
open(r'I:\pertanian\pertanian-2\data-source\_action-result.txt','wb').write(data)
txt = data.decode('utf-8','replace')
print('LEN', len(data))
# search for publication-ish data
for kw in ['sensus','pertanian','Sensus','pub_id','rl_date','abstract','total','publication','2023','2024','2025']:
    idxs = [m.start() for m in re.finditer(re.escape(kw), txt)]
    print(kw, len(idxs), idxs[:8])
