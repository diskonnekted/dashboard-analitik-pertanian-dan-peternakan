import re, html, json
h = open(r'I:\pertanian\pertanian-2\data-source\pub-list.html', encoding='utf-8').read()

# Extract the Next.js RSC payload
# self.__next_f.push([1,"..."]) lines
pushes = re.findall(r'self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)', h)
print('num pushes', len(pushes))
full = ''
for p in pushes:
    full += p

# unescape
full = full.encode().decode('unicode_escape', 'ignore')
print('payload len', len(full))

# save raw payload
open(r'I:\pertanian\pertanian-2\data-source\_rsc-payload.txt', 'w', encoding='utf-8').write(full)

# search for keywords
for kw in ['sensus','pertanian','Sensus','Pertanian','2023','2024','download','publication','f=']:
    idxs = [m.start() for m in re.finditer(re.escape(kw), full)]
    print(kw, len(idxs), idxs[:5])
