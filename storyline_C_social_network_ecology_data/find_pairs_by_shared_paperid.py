import csv
import json
import os
from collections import defaultdict
from itertools import combinations

ROOT = os.path.dirname(__file__)
SOURCES = [
    os.path.join('..', 'Chemistry publication record_openalex_enriched.csv'),
    os.path.join('..', 'Medicine publication record_openalex_enriched.csv'),
    os.path.join('..', 'Physics publication record_openalex_enriched.csv'),
]
OUT_CSV = os.path.join(ROOT, 'figure2_missing_pairs_from_sources_by_paperid.csv')


def try_open(path):
    for enc in ('utf-8', 'latin-1'):
        try:
            return open(path, 'r', encoding=enc, errors='replace')
        except Exception:
            continue
    return open(path, 'r', encoding='utf-8', errors='replace')


def collect():
    paper_map = defaultdict(lambda: {'laureates': {}, 'title': None, 'doi': None, 'openalex_id': None})
    total_rows = 0
    for src in SOURCES:
        path = os.path.join(ROOT, os.path.basename(src)) if not os.path.isabs(src) else src
        if not os.path.exists(path):
            path = os.path.join(os.path.dirname(ROOT), os.path.basename(src))
        if not os.path.exists(path):
            print('Missing source:', src)
            continue
        fh = try_open(path)
        reader = csv.DictReader(fh)
        for row in reader:
            total_rows += 1
            # normalize keys to expected names
            la_id = None
            la_name = ''
            for cand in ('Laureate ID', 'laureate id', 'laureate_id'):
                if cand in row and row[cand].strip():
                    la_id = row[cand].strip()
                    break
            for cand in ('Laureate name', 'laureate name', 'Laureate Name'):
                if cand in row and row[cand].strip():
                    la_name = row[cand].strip()
                    break
            if not la_id:
                continue
            key = None
            # try openalex_id or Paper ID or DOI
            if 'openalex_id' in row and row['openalex_id'].strip():
                key = row['openalex_id'].strip()
            elif 'openalex_id'.lower() in row and row['openalex_id'.lower()].strip():
                key = row['openalex_id'.lower()].strip()
            elif 'DOI' in row and row['DOI'].strip():
                key = row['DOI'].strip().lower()
            elif 'Paper ID' in row and row['Paper ID'].strip():
                v = row['Paper ID'].strip()
                if v.endswith('.0'):
                    v = v[:-2]
                key = v
            else:
                # try alternative keys
                for k in row:
                    if k.lower().replace(' ', '') in ('openalexid','openalex_id') and row[k].strip():
                        key = row[k].strip()
                        break
            if not key:
                continue
            entry = paper_map[key]
            entry['laureates'].setdefault(la_id, la_name)
            # store sample metadata
            if not entry['title'] and 'Title' in row:
                entry['title'] = row.get('Title', '').strip()
            if not entry['doi'] and 'DOI' in row:
                entry['doi'] = row.get('DOI', '').strip()
            if not entry['openalex_id'] and 'openalex_id' in row:
                entry['openalex_id'] = row.get('openalex_id', '').strip()
        fh.close()
    print('Read rows:', total_rows, 'unique papers:', len(paper_map))
    return paper_map


def build_pairs(paper_map):
    pair_map = defaultdict(lambda: {'count': 0, 'papers': set(), 'names': {}})
    for paper_key, info in paper_map.items():
        laureates = list(info['laureates'].keys())
        if len(laureates) < 2:
            continue
        for a, b in combinations(sorted(laureates), 2):
            k = (a, b)
            pair_map[k]['count'] += 1
            pair_map[k]['papers'].add(paper_key)
            pair_map[k]['names'][a] = info['laureates'].get(a, '')
            pair_map[k]['names'][b] = info['laureates'].get(b, '')
    return pair_map


def write_pairs(pair_map):
    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as fh:
        writer = csv.writer(fh)
        writer.writerow(['laureate_a_id','laureate_b_id','laureate_a_name','laureate_b_name','shared_count','sample_paper','sample_title'])
        for (a,b), v in sorted(pair_map.items(), key=lambda x: (-x[1]['count'], x[0])):
            sample = next(iter(v['papers'])) if v['papers'] else ''
            title = ''
            writer.writerow([a,b,v['names'].get(a,''),v['names'].get(b,''),v['count'],sample,title])
    print('Wrote', OUT_CSV, 'pairs=', len(pair_map))


def main():
    paper_map = collect()
    pair_map = build_pairs(paper_map)
    write_pairs(pair_map)


if __name__ == '__main__':
    main()
