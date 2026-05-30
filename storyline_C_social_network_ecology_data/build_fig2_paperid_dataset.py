import csv
import json
import os
from collections import defaultdict
from itertools import combinations

ROOT = os.path.dirname(__file__)
SOURCES = [
    (os.path.join(ROOT, '..', 'Chemistry publication record_openalex_enriched.csv'), 'Chemistry'),
    (os.path.join(ROOT, '..', 'Medicine publication record_openalex_enriched.csv'), 'Medicine'),
    (os.path.join(ROOT, '..', 'Physics publication record_openalex_enriched.csv'), 'Physics'),
]
OUT = os.path.join(ROOT, 'figure2_laureate_collab_pairs_paperid.csv')


def open_text(path):
    for encoding in ('utf-8', 'latin-1'):
        try:
            return open(path, 'r', encoding=encoding, errors='replace')
        except Exception:
            continue
    return open(path, 'r', encoding='utf-8', errors='replace')


def clean_text(value):
    return str(value or '').strip()


def parse_score(row):
    for key in ('openalex_fwci', 'fwci', 'score'):
        text = clean_text(row.get(key))
        if not text:
            continue
        try:
            return float(text)
        except Exception:
            continue
    return None


def norm_paper_key(row):
    for key in ('openalex_id', 'openalex_id'.lower(), 'openalex_id'.upper()):
        if key in row and clean_text(row[key]):
            return clean_text(row[key])
    doi = clean_text(row.get('DOI'))
    if doi:
        return doi.lower()
    paper_id = clean_text(row.get('Paper ID'))
    if paper_id:
        return paper_id[:-2] if paper_id.endswith('.0') else paper_id
    return ''


def parse_keywords(row):
    text = clean_text(row.get('openalex_topics'))
    if not text:
        return []
    parts = [item.strip() for item in text.replace('|', ';').split(';')]
    return [item for item in parts if item]


def parse_sample(row, category, prize_year):
    pub_year = clean_text(row.get('Pub year'))
    paper_id = clean_text(row.get('Paper ID'))
    if paper_id.endswith('.0'):
        paper_id = paper_id[:-2]
    return {
        'category': category,
        'prize_year': str(prize_year) if prize_year else '',
        'pub_year': pub_year,
        'title': clean_text(row.get('Title')),
        'paper_id': paper_id,
        'doi': clean_text(row.get('DOI')),
        'journal': clean_text(row.get('Journal')),
        'score': parse_score(row),
        'abstract': clean_text(row.get('abstract')),
        'keywords': parse_keywords(row),
    }


def load_source_rows():
    paper_map = defaultdict(lambda: {'laureates': {}, 'samples': []})
    laureate_meta = {}
    row_count = 0
    for path, category in SOURCES:
        if not os.path.exists(path):
            print('Missing source:', path)
            continue
        with open_text(path) as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                row_count += 1
                laureate_id = clean_text(row.get('Laureate ID'))
                laureate_name = clean_text(row.get('Laureate name'))
                if not laureate_id:
                    continue
                laureate_meta.setdefault(
                    laureate_id,
                    {
                        'name': laureate_name,
                        'category': category,
                        'prize_year': clean_text(row.get('Prize year')),
                    },
                )
                paper_key = norm_paper_key(row)
                if not paper_key:
                    continue
                entry = paper_map[paper_key]
                entry['laureates'][laureate_id] = laureate_name
                entry['samples'].append((laureate_id, parse_sample(row, category, laureate_meta[laureate_id]['prize_year'])))
    print('Read rows:', row_count, 'unique papers:', len(paper_map), 'laureates:', len(laureate_meta))
    return paper_map, laureate_meta


def build_pairs(paper_map, laureate_meta):
    pair_map = defaultdict(lambda: {'count': 0, 'samples': []})
    for paper_key, entry in paper_map.items():
        laureate_ids = sorted(entry['laureates'].keys())
        if len(laureate_ids) < 2:
            continue
        sample = entry['samples'][0][1] if entry['samples'] else {}
        for a_id, b_id in combinations(laureate_ids, 2):
            if a_id == b_id:
                continue
            a_meta = laureate_meta.get(a_id, {})
            b_meta = laureate_meta.get(b_id, {})
            key = tuple(sorted((a_id, b_id)))
            pair = pair_map[key]
            pair['count'] += 1
            if sample:
                pair['samples'].append(sample)
            pair.setdefault('a_name', a_meta.get('name', entry['laureates'].get(a_id, '')))
            pair.setdefault('b_name', b_meta.get('name', entry['laureates'].get(b_id, '')))
            pair.setdefault('a_category', a_meta.get('category', ''))
            pair.setdefault('b_category', b_meta.get('category', ''))
            pair.setdefault('a_prize_year', a_meta.get('prize_year', ''))
            pair.setdefault('b_prize_year', b_meta.get('prize_year', ''))
    return pair_map


def write_output(pair_map):
    rows = []
    for (a_id, b_id), item in pair_map.items():
        a_name = item.get('a_name', '')
        b_name = item.get('b_name', '')
        if clean_text(a_name).casefold() == clean_text(b_name).casefold():
            continue
        a_category = item.get('a_category', '')
        b_category = item.get('b_category', '')
        a_prize_year = item.get('a_prize_year', '')
        b_prize_year = item.get('b_prize_year', '')
        earliest_year = ''
        years = [y for y in (a_prize_year, b_prize_year) if clean_text(y)]
        if years:
            try:
                earliest_year = str(min(int(float(y)) for y in years))
            except Exception:
                earliest_year = years[0]
        rows.append(
            {
                'laureate_a_id': a_id,
                'laureate_b_id': b_id,
                'laureate_a': a_name,
                'laureate_b': b_name,
                'laureate_a_category': a_category,
                'laureate_b_category': b_category,
                'laureate_a_prize_year': a_prize_year,
                'laureate_b_prize_year': b_prize_year,
                'earliest_prize_year': earliest_year,
                'coop_weight_sum': str(item['count']),
                'sample_paper_count': str(len(item['samples'])),
                'sample_papers_json': json.dumps(item['samples'], ensure_ascii=False),
            }
        )

    rows.sort(key=lambda row: (-int(float(row['coop_weight_sum'])), row['laureate_a'], row['laureate_b']))
    with open(OUT, 'w', encoding='utf-8', newline='') as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=[
                'laureate_a_id',
                'laureate_b_id',
                'laureate_a',
                'laureate_b',
                'laureate_a_category',
                'laureate_b_category',
                'laureate_a_prize_year',
                'laureate_b_prize_year',
                'earliest_prize_year',
                'coop_weight_sum',
                'sample_paper_count',
                'sample_papers_json',
            ],
        )
        writer.writeheader()
        writer.writerows(rows)
    print('Wrote', OUT, 'rows=', len(rows))


def main():
    paper_map, laureate_meta = load_source_rows()
    pair_map = build_pairs(paper_map, laureate_meta)
    write_output(pair_map)


if __name__ == '__main__':
    main()
