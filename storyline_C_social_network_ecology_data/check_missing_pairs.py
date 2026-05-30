import csv, os

HERE = os.path.dirname(__file__)
nodes_f = os.path.join(HERE, 'figure2_coauthor_nodes.csv')
edges_f = os.path.join(HERE, 'figure2_coauthor_edges.csv')
pairs_f = os.path.join(HERE, 'figure2_laureate_collab_pairs_paperid.csv')

def normalize(s):
    if not s:
        return ''
    return ''.join(ch.lower() for ch in s if ch.isalnum() or ch.isspace()).strip().replace('\n',' ').replace('  ',' ').strip()

# load laureate nodes
laureates = {}
with open(nodes_f, encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    for row in r:
        if row.get('node_type','').strip().lower() == 'laureate':
            name = row.get('node_name')
            key = normalize(name)
            laureates[key] = {'name': name, 'category': row.get('category','').strip()}

print('Laureate count:', len(laureates))

# load pairs existing
existing_pairs = set()
with open(pairs_f, encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    for row in r:
        a = normalize(row.get('laureate_a'))
        b = normalize(row.get('laureate_b'))
        if a and b:
            if a < b:
                existing_pairs.add((a,b))
            else:
                existing_pairs.add((b,a))

print('Existing pairs:', len(existing_pairs))

# scan edges for laureate-laureate coauthorships
missing = []
with open(edges_f, encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    for row in r:
        s = normalize(row.get('source') or '')
        t = normalize(row.get('target') or '')
        if s in laureates and t in laureates:
            a,b = (s,t) if s < t else (t,s)
            if (a,b) not in existing_pairs:
                missing.append((laureates[a]['name'], laureates[a]['category'], laureates[b]['name'], laureates[b]['category'], row.get('weight')))

print('Found', len(missing), 'laureate-laureate coauthor edges not in pairs CSV')

# write sample of missing pairs
out = os.path.join(HERE, 'figure2_missing_pairs.csv')
with open(out, 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['laureate_a','a_category','laureate_b','b_category','weight'])
    for r in missing:
        w.writerow(r)

print('Wrote', out)
