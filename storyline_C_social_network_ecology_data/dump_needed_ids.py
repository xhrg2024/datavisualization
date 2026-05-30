import json, csv
p='figure2_laureate_collab_pairs.csv'
need_pids=set(); need_dois=set()
with open(p, encoding='utf-8') as fh:
    r=csv.DictReader(fh)
    for row in r:
        try:
            arr=json.loads(row.get('sample_papers_json') or '[]')
        except:
            arr=[]
        for a in arr:
            if isinstance(a, dict):
                pid=str(a.get('paper_id') or '')
                doi=str(a.get('doi') or '').strip().lower()
                if pid: need_pids.add(pid)
                if doi: need_dois.add(doi)
            else:
                need_pids.add(str(a))
print('need_pids=', sorted(need_pids))
print('need_dois=', sorted(need_dois))
