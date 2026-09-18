import json, re
lahan = json.load(open(r'I:\pertanian\pertanian-2\public\data\lahan-fallback.json', encoding='utf-8-sig'))
def normkey(kec, desa):
    return re.sub(r'[^A-Za-z]','',kec).upper()+'|'+re.sub(r'[^A-Za-z]','',desa).upper()
target = ['KARANGTENGAH','SOMAWANGI','KEBONDALEM','PARAKANCANGGAH','SEMARANG','KRANDEGAN','JALATUNDA','CANDIWULAN','SIMBANG','BANDINGAN','JOHO','BINORONG']
for d in lahan:
    if d['desa'] in target:
        print(f"{d['kecamatan']:16} {d['desa']:16} sawah={d['lahanSawah']:>10} bsawah={d['lahanBukanSawah']:>10} jumlah={d['jumlah']:>10}")
