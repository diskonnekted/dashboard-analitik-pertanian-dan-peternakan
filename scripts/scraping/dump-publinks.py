import re
h = open(r'I:\pertanian\pertanian-2\data-source\pub-list.html', encoding='utf-8').read()
print('LEN', len(h))
links = re.findall(r'href="([^"]+)"', h)
for l in links:
    print(l)
print('---- web-api / api refs ----')
for m in re.findall(r'["\'](https?://[^"\']+|/[^"\']*api[^"\']*)["\']', h):
    print(m)
