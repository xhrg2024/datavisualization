import json
j=json.load(open('figure2_paper_meta.json','r',encoding='utf-8'))
for k in ['1982444105','1973083520','2011912423']:
    print(k, 'in json?', k in j)
    if k in j:
        print('  keys:', list(j[k].keys()))
