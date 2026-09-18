import re
txt = open(r'I:\pertanian\pertanian-2\data-source\_action-result.txt', encoding='utf-8').read()
for kw in ['data-availability','"status"','"response"','"msg"','"total"','"count"','"data"','OK','kalibening','Kalibening','purwareja','Purwareja','banjarmangu']:
    idxs = [m.start() for m in re.finditer(kw, txt)]
    print(kw, len(idxs), idxs[:10])
