import urllib.request, ssl, json
ctx = ssl._create_unverified_context()

url = 'https://banjarnegarakab.bps.go.id/id/publication'
action_id = '60cd2ef6d9f1f17b0b90c6c292a1a9d55d7d508ae2'

# React Flight reply body variants
bodies = [
    '["id",{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]',
    '[{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]',
    '{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}',
]

for body in bodies:
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
    try:
        r = urllib.request.urlopen(req, timeout=45, context=ctx)
        data = r.read()
        print('=== STATUS', r.status, 'CT', r.headers.get('Content-Type'), 'LEN', len(data))
        print(data.decode('utf-8','replace')[:1500])
        print()
    except urllib.error.HTTPError as e:
        print('=== HTTPERR', e.code)
        print(e.read().decode('utf-8','replace')[:800])
        print()
    except Exception as e:
        print('=== ERR', repr(e))
