import urllib.request, urllib.parse, ssl, json
ctx = ssl._create_unverified_context()

def get(url, timeout=40):
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        r = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        data = r.read()
        ct = r.headers.get('Content-Type','')
        return r.status, ct, data[:400]
    except urllib.error.HTTPError as e:
        return e.code, '', e.read()[:200]
    except Exception as e:
        return -1, '', str(e)[:200]

kws = ['sensus pertanian 2023', 'hasil sensus pertanian']
tests = []
for kw in [urllib.parse.quote(k) for k in kws]:
    tests += [
        f'https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1/keyword/{kw}',
        f'https://web-api.bps.go.id/v1/api/list/model/publication/domain/33/page/1/keyword/{kw}',
        f'https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/keyword/{kw}',
        f'https://web-api.bps.go.id/v1/api/list/model/publication/page/1/keyword/{kw}',
    ]
tests += [
    'https://web-api.bps.go.id/',
    'https://web-api.bps.go.id/v1/api/',
    'https://web-api.bps.go.id/api/',
    'https://web-api.bps.go.id/v1/api/list/model/publication/domain/3304/page/1',
    'https://web-api.bps.go.id/v1/api/list/model/domain/3304/variable/',
]

for u in tests:
    s, ct, body = get(u)
    print(s, '|', ct, '|', u)
    if s == 200 and ct and 'json' in ct:
        print('    ', body.decode('utf-8', 'replace')[:300])
