import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
url = 'https://banjarnegarakab.bps.go.id/id/publication'
action_id = '60cd2ef6d9f1f17b0b90c6c292a1a9d55d7d508ae2'

bodies = [
    '0:["id",{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]',
    '["id",{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]',
    '1:["id",{"page":1,"keyword":"sensus pertanian 2023","onlyTitle":true}]',
    '0:["id",{"page":1,"keyword":"sensus pertanian","onlyTitle":true}]',
]

for body in bodies:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        'Next-Action': action_id,
        'Content-Type': 'text/plain;charset=UTF-8',
        'Accept': 'text/x-component',
        'Referer': 'https://banjarnegarakab.bps.go.id/id/publication',
        'Origin': 'https://banjarnegarakab.bps.go.id',
    }
    req = urllib.request.Request(url, data=body.encode(), headers=headers, method='POST')
    try:
        r = urllib.request.urlopen(req, timeout=45, context=ctx)
        data = r.read().decode('utf-8','replace')
        has_data = '"data-availability"' in data
        has_cap = 'Kecamatan' in data
        total_hits = len(re.findall(r'data-availability', data))
        print('=== len', len(data), 'data-availability:', total_hits, 'Kecamatan:', has_cap, '| body=', body[:50])
        # print first data-availability context
        m = re.search(r'data-availability', data)
        if m:
            print('   ', data[max(0,m.start()-150):m.start()+200])
        print()
    except urllib.error.HTTPError as e:
        print('=== HTTPERR', e.code, body[:40])
    except Exception as e:
        print('=== ERR', repr(e), body[:40])
