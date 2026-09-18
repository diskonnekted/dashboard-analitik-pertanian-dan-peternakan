import re
txt = open(r'I:\pertanian\pertanian-2\data-source\_chunks\page-a4162c49d33ed43a.js', encoding='utf-8').read()
# find module 86472
i = txt.find('86472:')
print('found at', i)
print(txt[i:i+4000])
