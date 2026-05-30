#!/usr/bin/env python3
import csv, json

infile='figure2_laureate_collab_pairs_paperid.csv'
out='figure2_missing_paper_meta.csv'
miss=[]
with open(infile, newline='', encoding='utf-8') as fh:
    r=csv.DictReader(fh)
    for row in r:
        try:
            arr=json.loads(row.get('sample_papers_json') or '[]')
        except:
            arr=[]
        for p in arr:
            abstract = p.get('abstract') if isinstance(p, dict) else None
            kws = p.get('keywords') if isinstance(p, dict) else None
            if not abstract and (not kws or len(kws)==0):
                pid = p.get('paper_id') if isinstance(p, dict) else p
                doi = p.get('doi') if isinstance(p, dict) else ''
                title = p.get('title') if isinstance(p, dict) else ''
                miss.append({'paper_id':pid,'doi':doi,'title':title})

with open(out,'w',newline='',encoding='utf-8') as fh:
    w=csv.DictWriter(fh, fieldnames=['paper_id','doi','title'])
    w.writeheader()
    w.writerows(miss)
print('Wrote', out, 'count=', len(miss))
