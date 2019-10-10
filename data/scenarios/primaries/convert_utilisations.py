import pandas as pd
import os

for filename in os.listdir():
    if filename.startswith('PeakUtilisation'):
        df = pd.read_csv(filename)
        for year in range(2017,2051):
            current_colname = f'{str(year)}.0'
            df.rename(columns={current_colname : str(year)}, inplace=True)
            df[str(year)] = df.apply(lambda row: row[str(year)] * 100, axis=1)
            df[str(year)] = df.apply(lambda row: round(row[str(year)], 2), axis=1)
        os.remove(filename)
        df.to_csv(filename, index=False)
