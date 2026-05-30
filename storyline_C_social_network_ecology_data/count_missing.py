import csv
f='figure2_missing_pairs_from_sources.csv'
c=0
with open(f,encoding='utf-8') as fh:
    next(fh)
    for _ in fh:
        c+=1
print(c)