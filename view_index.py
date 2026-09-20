import json
with open(r"I:\pertanian\pertanian-2\public\distankan-index.json", encoding='utf-8') as f:
    idx = json.load(f)
print(f"Total dataset: {len(idx)}")
print()
for r in idx:
    print(f"  {r['status']:4s} {r.get('mode','?'):1s} {r['folder'][:55]:55s} years={r.get('years')}")