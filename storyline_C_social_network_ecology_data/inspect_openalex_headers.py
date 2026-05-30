#!/usr/bin/env python3
import csv, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
files = [
    os.path.join(ROOT, 'Chemistry publication record_openalex_enriched.csv'),
    os.path.join(ROOT, 'Medicine publication record_openalex_enriched.csv'),
    os.path.join(ROOT, 'Physics publication record_openalex_enriched.csv'),
]

def try_read(path):
    for enc in ('utf-8','latin-1'):
        try:
            with open(path, encoding=enc, newline='') as fh:
                reader = csv.DictReader(fh)
                fields = reader.fieldnames
                first = None
                for i,row in enumerate(reader):
                    first = row
                    break
                return enc, fields, first
        except Exception as e:
            err = e
    return None, None, str(err)

for f in files:
    if not os.path.exists(f):
        print('MISSING', f)
        continue
    enc, fields, first = try_read(f)
    print('FILE:', os.path.basename(f))
    print('ENCODING_TRIED:', enc)
    print('FIELDS:', fields[:50] if fields else fields)
    if isinstance(first, dict):
        sample = {k: first.get(k) for k in list(first.keys())[:10]}
        print('SAMPLE_KEYS:', sample)
    else:
        print('SAMPLE_ERROR:', first)
    print('---')
