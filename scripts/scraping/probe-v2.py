import urllib.request, ssl, json
ctx = ssl._create_unverified_context()

def get(url, timeout=40):
    try:
        req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        r = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        data = r.read()
        ct = r.headers.get('Content-Type','')
        return r.status, ct, data
    except urllib.error.HTTPError as e:
        return e.code, '', e.read()
    except Exception as e:
        return -1, '', str(e)[:200].encode()

tests = [
    'https://web-api.bps.go.id/v2/api/',
    'https://web-api.bps.go.id/docs',
    'https://web-api.bps.go.id/swagger',
    'https://web-api.bps.go.id/openapi.json',
    'https://web-api.bps.go.id/v1/api/domain/type/all/key/',
    'https://web-api.bps.go.id/v1/api/list/model/domain/',
    'https://web-api.bps.go.id/v1/api/list/model/publication',
]
for u in tests:
    s, ct, body = get(u)
    print('====', s, ct, u)
    if body:
        print(body.decode('utf-8','replace')[:800])
