import urllib.request, ssl, re
ctx = ssl._create_unverified_context()
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8','replace')

# cek portal sensus bps + coba temukan pola publikasi via halaman BPS lain (tabel statistik / data sensus)
for u in [
  "https://sensus.bps.go.id/",
  "https://banjarnegarakab.bps.go.id/id/census",
  "https://banjarnegarakab.bps.go.id/id/publication/2024",
]:
    try:
        r = get(u)
        print("==== ", u, " len", len(r))
        # cari 'sensus pertanian 2023' dan 'hasil sensus'
        for m in re.finditer(r'(hasil.{0,40}sensus.{0,40}pertanian|sensus.{0,20}pertanian.{0,20}2023)', r, re.I):
            print("   HIT:", m.group(0)[:100])
    except Exception as e:
        print("ERR", u, e)
