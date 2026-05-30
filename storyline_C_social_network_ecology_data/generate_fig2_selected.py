# Generate a deduplicated list of laureates appearing in figure2 pairs with coop_weight_sum >= 1
import csv
import os

DATA_DIR = os.path.dirname(__file__)
PAIRS_CSV = os.path.join(DATA_DIR, 'figure2_laureate_collab_pairs.csv')
NODES_CSV = os.path.join(DATA_DIR, 'figure3_internal_citation_nodes.csv')
OUT_CSV = os.path.join(DATA_DIR, 'figure2_selected_laureates.csv')

def normalize(s):
    if s is None: return ''
    return ' '.join(s.strip().lower().split())

pairs = []
with open(PAIRS_CSV, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            w = float(row.get('coop_weight_sum') or 0)
        except:
            w = 0
        if w >= 1:
            pairs.append(row)

# collect unique laureate names
keys = set()
for p in pairs:
    keys.add(normalize(p.get('laureate_a')))
    keys.add(normalize(p.get('laureate_b')))

# load metadata
meta = {}
with open(NODES_CSV, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        nk = normalize(row.get('node_name'))
        meta[nk] = {
            'node_key': nk,
            'name': row.get('node_name') or '',
            'category': row.get('category') or '',
            'prize_year': row.get('prize_year') or ''
        }

# assemble output rows
out_rows = []
for k in sorted(keys):
    m = meta.get(k, {'node_key':k, 'name':k, 'category':'', 'prize_year':''})
    out_rows.append(m)

# write CSV
with open(OUT_CSV, 'w', newline='', encoding='utf-8') as f:
    fieldnames = ['node_key','name','category','prize_year']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    for r in out_rows:
        writer.writerow(r)

print(f'Wrote {len(out_rows)} laureates to {OUT_CSV}')
