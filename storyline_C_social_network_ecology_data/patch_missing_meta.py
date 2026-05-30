#!/usr/bin/env python3
import csv, json, os, glob

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..'))
missing_file = os.path.join(HERE, 'figure2_missing_paper_meta.csv')
enriched = os.path.join(HERE, 'figure2_laureate_collab_pairs_paperid.csv')
source_patterns = [os.path.join(ROOT, '*_openalex_enriched.csv')]

if not os.path.exists(missing_file):
    print('Missing file not found:', missing_file)
    raise SystemExit(1)

missing = set()
with open(missing_file, newline='', encoding='utf-8') as fh:
    r = csv.DictReader(fh)
    for row in r:
        missing.add(str(row['paper_id']).strip())

print('Papers to patch:', missing)

# build lookup from source files by Paper ID
lookup = {}
for pattern in source_patterns:
    for f in glob.glob(pattern):
        # try encodings
        for enc in ('utf-8','latin-1'):
            try:
                with open(f, newline='', encoding=enc) as fh:
                    reader = csv.DictReader(fh)
                    for row in reader:
                        pid = (row.get('Paper ID') or row.get('paper_id') or '').strip()
                        if not pid:
                            continue
                        if pid in missing:
                            lookup[pid] = row
                break
            except Exception as e:
                # try next encoding
                continue

print('Found in sources:', set(lookup.keys()))

# load enriched CSV, patch sample_papers_json
rows = []
with open(enriched, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    header = reader.fieldnames
    for row in reader:
        try:
            arr = json.loads(row.get('sample_papers_json') or '[]')
        except Exception:
            arr = []
        changed = False
        for p in arr:
            pid = str(p.get('paper_id') if isinstance(p, dict) else p).strip()
            if pid in lookup:
                src = lookup[pid]
                kws_raw = src.get('openalex_topics') or src.get('openalex_topics'.upper()) or ''
                if kws_raw:
                    sep = ';' if ';' in kws_raw else ','
                    kws = [k.strip() for k in kws_raw.split(sep) if k.strip()]
                    if isinstance(p, dict):
                        p['keywords'] = kws
                    changed = True
        if changed:
            row['sample_papers_json'] = json.dumps(arr, ensure_ascii=False)
        rows.append(row)

with open(enriched, 'w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=header)
    writer.writeheader()
    writer.writerows(rows)

print('Patched enriched CSV written.')
