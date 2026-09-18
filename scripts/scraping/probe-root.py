import urllib.request, ssl, json
ctx = ssl._create_unverified_context()
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    r = urllib.request.urlopen(req, timeout=40, context=ctx)
    return r.read()

for u in [
    'https://web-api.bps.go.id/',
    'https://web-api.bps.go.id/v1/api/',
    'https://web-api.bps.go.id/v1/api',
]:
    try:
        b = get(u)
        print('====', u)
        print(b.decode('utf-8','replace'))
    except Exception as e:
        print('====', u, 'ERR', e)
