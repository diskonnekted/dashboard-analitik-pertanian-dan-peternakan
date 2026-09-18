import re
h = open(r'I:\pertanian\pertanian-2\data-source\pub-list.html', encoding='utf-8').read()
print('LEN', len(h))
srcs = re.findall(r'src="([^"]+)"', h)
for s in srcs:
    print(s)
print('---- script tags ----')
for m in re.findall(r'<script[^>]*>', h)[:20]:
    print(m)
