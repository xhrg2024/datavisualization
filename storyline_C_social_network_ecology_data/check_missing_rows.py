import csv, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
checks = [
    ('Medicine publication record_openalex_enriched.csv','1982444105'),
    ('Chemistry publication record_openalex_enriched.csv','1973083520'),
    ('Chemistry publication record_openalex_enriched.csv','2011912423'),
]
for fname, pid in checks:
    path = os.path.join(ROOT, fname)
    found=False
    with open(path, encoding='utf-8', errors='replace') as fh:
        r = csv.DictReader(fh)
        fields = r.fieldnames
        for row in r:
            if str(row.get('Paper ID') or row.get('paper_id') or '').strip() == pid:
                print('FILE', fname, 'PID', pid)
                keys = ['openalex_topics','openalex_title','openalex_doi','openalex_publication_year','openalex_referenced_works','openalex_authors']
                for k in keys:
                    print(' ', k, ':', row.get(k))
                found=True
                break
    if not found:
        print('NOT FOUND', fname, pid)
