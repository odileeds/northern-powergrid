import pandas as pd
import json

lads_df = pd.read_csv('LAD2019.csv', header=None)
lads_df.columns = ['Code', 'Name']

df = pd.read_json('primaries2lad.json', orient='index')
df.index.name = 'Primary'
col_names = {}
for lad_code in df.columns.values:
    lad_name = lads_df.Name[lads_df.Code == lad_code].values[0]
    col_names[lad_code] = lad_name
df.rename(columns=col_names, inplace=True)
df.fillna(0, inplace=True)
df.sort_index(axis=1, inplace=True)
df.sort_index(axis=0, inplace=True)
df.to_csv('Primaries_to_LAD.csv', float_format='%.4g')
