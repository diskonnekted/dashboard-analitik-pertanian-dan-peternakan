txt = open(r'I:\pertanian\pertanian-2\data-source\_chunks\page-a4162c49d33ed43a.js', encoding='utf-8').read()
# find the component module and the call site
import re
# find "getListPublication" usage / callServer / .F(
for m in re.finditer(r'\.F\)\([^)]*', txt):
    print('CALL:', m.group(0)[:300])
    print()
# also find module 69756 and 35219
for mid in ['69756:', '35219:', '4148:']:
    i = txt.find(mid)
    if i>=0:
        print('==== MODULE', mid, 'at', i)
        print(txt[i:i+2500])
        print()
