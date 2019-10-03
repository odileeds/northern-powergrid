# NorthernPowerGrid work

## 1. Create geography of distribution sub-stations 

We start with three big (>100MB) files containing sub-stations and the postcodes of customers. The header lines were cleaned up to remove new line characters. The first task is to group the postcodes by sub-station.

`perl step1-a.pl`

This takes the three files `LV DSS fed postcodes Northeast_MB.csv`, `LV DSS fed postcodes Yorkshire_MB_A_to_M.csv`, and `LV DSS fed postcodes Yorkshire_MB_N_toZ.csv` and outputs to `substation-postcodes.csv`. Error messages are saved in `substation-postcodes.log` and will include the number of lines with missing postcodes (5426), the invalid postcodes (5718), the number of distribution sub-stations names that are in more than one area (114 are in Yorkshire and the North East), and the number of distribution sub-stations with multiple IDs within a region. This results in unique postcodes for 58439 distribution sub-stations (this is ~4000 fewer than the number listed in DistributionSubstation_BaseData.csv).

Next we need to find the Output Areas for each Distribution Station. Drop `getDSSBaseData.csv` into [CSV2GeoJSON](https://odileeds.github.io/CSV2GeoJSON/) and save the output as `getDSSBaseData.geojson`. Load it into QGIS along with the Shapefile for Output Areas. Fix the geometry of the Output Areas. Export as SQLLite. Export the OAs as SQLLite. Use `Vector > Data Management Tools > Join Attributes By Location`. The first layer should be the points (SQL) and the second is the polygons (SQL). Set `Join type` to `Take attributes of first located feature only` (to make things quicker). The geometric predicate is `intersets`. Export the output to `GeoJSON newline delimited` as `getDSSBaseData-oa.geojson`.


Next we need to convert all postcodes to Output Areas:

`perl step1-b.pl`

This converts postcodes to OAs. It processes two files:

  * `OAs/substation-postcodes.csv` is converted to `OAs/substation-OAs.csv`. There are 2206 warnings on postcodes that couldn't be found in the ONS data. Badly formatted postcodes include postcode outcodes as well as non-existent postcodes. This is a small number so we will assume it doesn't have a big impact (we could test to see if some distribution sub-stations are missing lots of postcodes).
  * `Substations/getDSSBaseData.csv` is converted to `Substations/getDSSBaseData-oa.csv`.


```
perl step1-c.pl
```

The script `step1-c.pl` reads in `Substations/DistributionSubstation_BaseData.csv` to get the data (exported by Patrick) about the sub-stations. It reads in ` OAs/substation-OAs.csv` to get the OAs.

It also saves `Substations/primaries2lad.json` which gives the fractional split of each Primary between Local Authority Districts.


## 2. Create geography of primaries


## 3. EV data mapped to distribution IDs over time (1 spreadsheet per scenario)


## 4. Peak demand data mapped to primaries
