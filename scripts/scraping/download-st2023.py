import json, urllib.request, ssl, os, re
ctx = ssl._create_unverified_context()
pubs = json.load(open(r'I:\pertanian\pertanian-2\data-source\_st2023-publications.json', encoding='utf-8'))

def kec_name(title):
    m = re.match(r'Hasil Sensus Pertanian 2023 Kecamatan (.+)', title)
    return m.group(1).strip() if m else None

targets = []
for p in pubs:
    k = kec_name(p['title'])
    if not k:
        continue
    fn = 'hasil-sensus-pertanian-2023-kecamatan-' + k.lower().replace(' ', '-') + '.pdf'
    path = os.path.join(r'I:\pertanian\pertanian-2\data-source', fn)
    targets.append((k, p['pdf'], path))

print('Total kecamatan pubs:', len(targets))
for k, url, path in targets:
    exists = os.path.exists(path)
    print(('HAVE' if exists else 'NEED'), k, '|', path)

# TEST DOWNLOAD: first NEED kecamatan (Batur)
test = [t for t in targets if not os.path.exists(t[2])][0]
k, url, path = test
print('\nTEST download:', k)
print('URL:', url[:80], '...')
req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36','Referer':'https://banjarnegarakab.bps.go.id/'})
r = urllib.request.urlopen(req, timeout=120, context=ctx)
data = r.read()
print('status', r.status, 'len', len(data), 'ct', r.headers.get('Content-Type'))
print('head:', data[:8])
open(path, 'wb').write(data)
print('saved', path)
