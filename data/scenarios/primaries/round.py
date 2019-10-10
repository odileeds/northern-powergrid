import pandas as pd
import os

for filename in os.listdir():
    if filename.startswith('EV'):
        df = pd.read_csv(filename)
        for year in range(2017,2050):
            df[str(year)] = df.apply(lambda row: round(row[str(year)]), axis=1)
        os.remove(filename)
        df.to_csv(filename, index=False)
