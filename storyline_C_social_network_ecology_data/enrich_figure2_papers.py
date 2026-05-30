#!/usr/bin/env python3
"""Enrich figure2_laureate_collab_pairs_paperid.csv by adding abstract and keywords
for sample papers from local *_openalex_enriched.csv files.

Writes:
- figure2_laureate_collab_pairs_paperid.csv (in same folder)
- figure2_paper_meta.json (mapping paper_id -> metadata)
"""
import csv
import json
import os
import glob
import sys

HERE = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(HERE, '..'))

pairs_path = os.path.join(HERE, 'figure2_laureate_collab_pairs_paperid.csv')
out_csv = os.path.join(HERE, 'figure2_laureate_collab_pairs_paperid.csv')
out_json = os.path.join(HERE, 'figure2_paper_meta.json')

if not os.path.exists(pairs_path):
    print('Cannot find', pairs_path)
    sys.exit(1)

def normalize_pid(pid):
    if pid is None:
        return None
    s = str(pid).strip()
    if s.endswith('.0'):
        s = s[:-2]
    return s

# gather paper ids and dois from pairs file
needed_pids = set()
needed_dois = set()
rows = []
with open(pairs_path, newline='', encoding='utf-8') as fh:
    reader = csv.DictReader(fh)
    header = reader.fieldnames
    for r in reader:
        rows.append(r)
        try:
            arr = json.loads(r.get('sample_papers_json') or '[]')
        except Exception:
            arr = []
        for p in arr:
            pid = normalize_pid(p.get('paper_id') if isinstance(p, dict) else p)
            if pid:
                needed_pids.add(pid)
            doi = p.get('doi') if isinstance(p, dict) else None
            if doi:
                needed_dois.add(doi.strip().lower())

print('Need', len(needed_pids), 'paper ids and', len(needed_dois), 'dois')

# scan parent folder for *_openalex_enriched.csv
found_files = []
for pattern in ('*_openalex_enriched.csv', '* publication record_openalex_enriched.csv'):
    found_files.extend(glob.glob(os.path.join(ROOT, pattern)))

# also try directly in ROOT
found_files = list(sorted(set(found_files)))
print('Found source files:', found_files)

meta = {}
remaining_pids = set(needed_pids)
remaining_dois = set(needed_dois)

def pick_field(fields, candidates):
    for c in candidates:
        for f in fields:
            if f.lower() == c:
                return f
    for f in fields:
        lf = f.lower()
        for c in candidates:
            if c in lf:
                return f
    return None

for fpath in found_files:
    try:
        # try utf-8 first, fall back to latin-1 for some large files
        try:
            fh = open(fpath, newline='', encoding='utf-8')
        except Exception:
            fh = open(fpath, newline='', encoding='latin-1')
        with fh:
            reader = csv.DictReader(fh)
            fields = reader.fieldnames or []
            id_field = pick_field(fields, ['paper_id', 'id', 'openalex_id'])
            doi_field = pick_field(fields, ['doi'])
            title_field = pick_field(fields, ['title', 'display_name'])
            abstract_field = pick_field(fields, ['abstract', 'abstract_text', 'abstract_inverted_index'])
            keywords_field = pick_field(fields, ['keywords', 'concepts', 'subjects', 'mesh', 'topics'])
            journal_field = pick_field(fields, ['journal', 'journal_title', 'venue', 'source'])
            year_field = pick_field(fields, ['pub_year', 'year', 'publication_year'])

            for row in reader:
                row_id = None
                if id_field and row.get(id_field):
                    row_id = normalize_pid(row.get(id_field))
                row_doi = None
                if doi_field and row.get(doi_field):
                    row_doi = str(row.get(doi_field)).strip().lower()

                matched = False
                if row_id and row_id in remaining_pids:
                    matched = True
                if not matched and row_doi and row_doi in remaining_dois:
                    matched = True
                if not matched:
                    continue

                pid_key = row_id or (row_doi and row_doi.replace('/', '_')) or None
                if not pid_key:
                    continue

                title = (row.get(title_field) if title_field else '') or ''
                abstract = (row.get(abstract_field) if abstract_field else '') or ''
                journal = (row.get(journal_field) if journal_field else '') or ''
                pub_year = (row.get(year_field) if year_field else '') or ''
                kws_raw = (row.get(keywords_field) if keywords_field else '') or ''
                # try to parse keywords as JSON list or semicolon/comma separated
                keywords = None
                try:
                    kw_parsed = json.loads(kws_raw)
                    if isinstance(kw_parsed, (list, tuple)):
                        keywords = [str(x) for x in kw_parsed]
                except Exception:
                    pass
                if keywords is None and kws_raw:
                    sep = ';' if ';' in kws_raw else ','
                    keywords = [k.strip() for k in kws_raw.split(sep) if k.strip()]

                meta_val = {
                    'paper_id': row_id,
                    'doi': row_doi,
                    'title': title,
                    'abstract': abstract,
                    'keywords': keywords or [],
                    'journal': journal,
                    'pub_year': pub_year,
                    'source_file': os.path.basename(fpath)
                }
                # index meta by multiple possible id forms for robust lookup
                keys_to_index = set()
                if row_id:
                    keys_to_index.add(str(row_id))
                # also try 'Paper ID' raw field if present
                if row.get('Paper ID'):
                    keys_to_index.add(str(row.get('Paper ID')).strip())
                if row.get('openalex_id'):
                    keys_to_index.add(str(row.get('openalex_id')).strip())
                # DOI forms
                if row_doi:
                    keys_to_index.add(str(row_doi))
                if row.get('openalex_doi'):
                    keys_to_index.add(str(row.get('openalex_doi')).strip().lower())

                # numeric suffix for OpenAlex W IDs
                try:
                    if row_id and 'openalex.org' in str(row_id):
                        import re
                        m = re.search(r'W(\d+)$', str(row_id))
                        if m:
                            keys_to_index.add(m.group(1))
                except Exception:
                    pass

                for k in list(keys_to_index):
                    meta[str(k)] = meta_val

                if row_id and row_id in remaining_pids:
                    remaining_pids.discard(row_id)
                if row_doi and row_doi in remaining_dois:
                    remaining_dois.discard(row_doi)

                if not remaining_pids and not remaining_dois:
                    break
    except Exception as e:
        print('Error reading', fpath, e)

print('Matches found:', len(meta), 'Remaining pids:', len(remaining_pids), 'dois:', len(remaining_dois))

# write meta json
with open(out_json, 'w', encoding='utf-8') as fh:
    json.dump(meta, fh, ensure_ascii=False, indent=2)
print('Wrote', out_json)

# produce enriched CSV
with open(out_csv, 'w', newline='', encoding='utf-8') as fh:
    writer = csv.DictWriter(fh, fieldnames=header)
    writer.writeheader()
    for r in rows:
        try:
            arr = json.loads(r.get('sample_papers_json') or '[]')
        except Exception:
            arr = []
        new_arr = []
        for p in arr:
            pid = normalize_pid(p.get('paper_id') if isinstance(p, dict) else p)
            doi = (p.get('doi') if isinstance(p, dict) else None) or None
            doi_l = doi.strip().lower() if doi else None
            found = None
            if pid and str(pid) in meta:
                found = meta[str(pid)]
            elif doi_l and doi_l in meta:
                found = meta[doi_l]
            else:
                # try matching by numeric-ish
                if pid and pid in meta:
                    found = meta[pid]

            base = p if isinstance(p, dict) else {'paper_id': pid}
            if found:
                base.update({'abstract': found.get('abstract', ''), 'keywords': found.get('keywords', [])})
            new_arr.append(base)
        r['sample_papers_json'] = json.dumps(new_arr, ensure_ascii=False)
        writer.writerow(r)

print('Wrote', out_csv)
