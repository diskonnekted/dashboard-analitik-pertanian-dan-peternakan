import urllib.request, ssl, re, json
ctx = ssl._create_unverified_context()
url = 'https://banjarnegarakab.bps.go.id/id/publication'
action_id = '60cd2ef6d9f1f17b0b90c6c292a1a9d55d7d508ae2'

def fetch(page):
    body = json.dumps(["id",{"page":page,"keyword":"sensus pertanian 2023","onlyTitle":True}], ensure_ascii=False)
    # react flight uses plain JSON but ensure no unicode issues -> keep ascii ok
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
        'Next-Action': action_id,
        'Content-Type': 'text/plain;charset=UTF-8',
        'Accept': 'text/x-component',
        'Referer': 'https://banjarnegarakab.bps.go.id/id/publication',
        'Origin': 'https://banjarnegarakab.bps.go.id',
    }
    req = urllib.request.Request(url, data=body.encode(), headers=headers, method='POST')
    r = urllib.request.urlopen(req, timeout=45, context=ctx)
    return r.read().decode('utf-8','replace')

all_pubs = []
meta = {}
for page in range(1,4):
    txt = fetch(page)
    # response is flight: "0:{...}" newline "1:{status...}" 
    # extract the 1: row (the action result)
    m = re.search(r'\n1:(\{.*\})\n?$', txt)
    if not m:
        m = re.search(r'1:(\{.*\})', txt)
    obj = json.loads(m.group(1))
    resp = obj['response']
    meta = resp['data'][0]
    pubs = resp['data'][1]
    all_pubs.extend(pubs)
    print('page', page, 'count', len(pubs), 'meta', meta)

print('\nTOTAL pubs:', len(all_pubs))
for p in all_pubs:
    print(json.dumps(p, ensure_ascii=False, indent=1))

# save
open(r'I:\pertanian\pertanian-2\data-source\_st2023-publications.json','w',encoding='utf-8').write(json.dumps(all_pubs, ensure_ascii=False, indent=1))
