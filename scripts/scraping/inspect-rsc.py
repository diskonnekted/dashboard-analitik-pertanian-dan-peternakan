import re, json
full = open(r'I:\pertanian\pertanian-2\data-source\_rsc-payload.txt', encoding='utf-8').read()

# Show context around 'Sensus' occurrences
print('==== context around Sensus / Pertanian ====')
for kw in ['Sensus','Pertanian']:
    for m in re.finditer(kw, full):
        s = max(0, m.start()-160); e = min(len(full), m.end()+220)
        print('---', kw, m.start(), '---')
        print(full[s:e])
        print()

print('==== context around download ====')
for m in re.finditer('download', full):
    s = max(0, m.start()-120); e = min(len(full), m.end()+180)
    print('---', m.start(), '---')
    print(full[s:e])
    print()
