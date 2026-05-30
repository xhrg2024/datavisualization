import csv
import os

ROOT = os.path.dirname(__file__)
NEW = os.path.join(ROOT, 'figure2_missing_pairs_from_sources_by_paperid.csv')
EXIST = os.path.join(ROOT, 'figure2_laureate_collab_pairs_paperid.csv')
OUT = os.path.join(ROOT, 'figure2_missing_pairs_validated.csv')


def norm(name):
    return name.strip().lower().replace('"', '')


def load_existing():
    s = set()
    if not os.path.exists(EXIST):
        return s
    with open(EXIST, encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            a = r.get('laureate_a', '')
            b = r.get('laureate_b', '')
            if a and b:
                s.add((norm(a), norm(b)))
                s.add((norm(b), norm(a)))
    return s


def find_missing():
    exist = load_existing()
    missing = []
    with open(NEW, encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            a = r.get('laureate_a_name', '')
            b = r.get('laureate_b_name', '')
            pair = (norm(a), norm(b))
            if pair not in exist:
                missing.append(r)
    with open(OUT, 'w', encoding='utf-8', newline='') as fh:
        writer = csv.DictWriter(fh, fieldnames=reader.fieldnames)
        writer.writeheader()
        for r in missing:
            writer.writerow(r)
    print('Wrote', OUT, 'count=', len(missing))


if __name__ == '__main__':
    find_missing()
