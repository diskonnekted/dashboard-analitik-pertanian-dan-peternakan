import re
h = open(r'I:\pertanian\pertanian-2\data-source\pub-list.html', encoding='utf-8').read()
srcs = sorted(set(re.findall(r'src="([^"]+)"', h)))
print('TOTAL script srcs:', len(srcs))
for s in srcs:
    print(s)
