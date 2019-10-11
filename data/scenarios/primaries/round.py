import pandas as pd
import os

for filename in os.listdir():
    if filename.startswith('PeakDemand'):
        df = pd.read_csv(filename)
        for year in range(2017,2051):
            df[str(year)] = df.apply(lambda row: round(row[str(year)], 3), axis=1)
        os.remove(filename)
        df.to_csv(filename, index=False)
