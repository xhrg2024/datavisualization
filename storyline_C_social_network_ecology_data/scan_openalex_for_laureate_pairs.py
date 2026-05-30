#!/usr/bin/env python3
import csv, os, glob, itertools

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..'))
source_files = [
    os.path.join(ROOT, 'Chemistry publication record_openalex_enriched.csv'),
    os.path.join(ROOT, 'Medicine publication record_openalex_enriched.csv'),
    os.path.join(ROOT, 'Physics publication record_openalex_enriched.csv'),
]

def normalize_name(s):
    if not s: return ''
    s = s.strip().lower()
    # remove punctuation except spaces
    import re
    s = re.sub(r'["\(\)\[\]\.]','',s)
    s = re.sub(r'[,/\\]',' ', s)
    s = ' '.join(s.split())
    return s

def laureate_variants(full_name):
    # produce a set of variants to match against author tokens
    v = set()
    if not full_name: return v
    n = normalize_name(full_name)
    v.add(n)
    parts = n.split()
    if len(parts) >= 1:
        lastname = parts[-1]
        v.add(lastname)
        # add surname + first initial
        if len(parts) >= 2:
            first = parts[0]
            if first:
                v.add(f"{lastname} {first[0]}")
                v.add(f"{lastname},{first[0]}")
    return v

def author_variants(author_str):
    # author_str like 'F. Joliot' or 'J. K. Rowling'
    s = normalize_name(author_str)
    parts = s.split()
    v = set()
    if not parts: return v
    lastname = parts[-1]
    v.add(lastname)
    first = parts[0]
    if first:
        v.add(f"{lastname} {first[0]}")
        v.add(f"{lastname},{first[0]}")
    v.add(s)
    return v

# load laureates from nobel_enriched.csv to be comprehensive
nobel_f = os.path.join(ROOT, 'nobel_enriched.csv')
laureate_names = set()
if os.path.exists(nobel_f):
    with open(nobel_f, encoding='utf-8', errors='replace') as fh:
        r = csv.DictReader(fh)
        for row in r:
            name = row.get('laureats_name') or row.get('full_name')
            if name:
                laureate_names.add(normalize_name(name))

# build variant map
variant_map = {}
for name in list(laureate_names):
    for v in laureate_variants(name):
        variant_map.setdefault(v, set()).add(name)

print('Loaded laureates:', len(laureate_names), 'variant keys:', len(variant_map))

# existing pairs
existing = set()
pairs_f = os.path.join(HERE, 'figure2_laureate_collab_pairs_paperid.csv')
with open(pairs_f, encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    for row in r:
        a = normalize_name(row.get('laureate_a'))
        b = normalize_name(row.get('laureate_b'))
        if a and b:
            existing.add(tuple(sorted((a,b))))

found_pairs = set()

for sf in source_files:
    if not os.path.exists(sf):
        print('Missing source', sf)
        continue
    # try encodings
    for enc in ('utf-8','latin-1'):
        try:
            with open(sf, encoding=enc, errors='replace') as fh:
                reader = csv.DictReader(fh)
                for row in reader:
                    authors_raw = row.get('openalex_authors') or row.get('openalex_authors'.upper()) or ''
                    if not authors_raw: continue
                    authors = [a.strip() for a in authors_raw.split(';') if a.strip()]
                    matched = []
                    for a in authors:
                        av = author_variants(a)
                        matched_names = set()
                        for variant in av:
                            if variant in variant_map:
                                matched_names.update(variant_map[variant])
                        if matched_names:
                            # add all matched laureate canonical names
                            matched.extend(matched_names)
                    # if two or more laureates matched in this paper, add all pairs
                    if len(matched) >= 2:
                        # normalize canonical names
                        matched_norm = [normalize_name(x) for x in matched]
                        for a,b in itertools.combinations(sorted(set(matched_norm)),2):
                            found_pairs.add((a,b))
            break
        except Exception as e:
            continue

print('Found laureate pairs in source files:', len(found_pairs))

# compute missing (in found_pairs but not in existing)
missing = [p for p in found_pairs if tuple(sorted(p)) not in existing]
print('Missing pairs count:', len(missing))

out = os.path.join(HERE, 'figure2_missing_pairs_from_sources.csv')
with open(out, 'w', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh)
    w.writerow(['laureate_a','laureate_b'])
    for a,b in missing:
        w.writerow([a,b])

print('Wrote', out)
