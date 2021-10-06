# Future Energy Scenario Data

Element Energy create yearly predictions for each Primary sub-station over a variety of `parameters` for several `scenarios`. The data are stored in separate files - one for each `scenario`/`parameter` combination - within the [scenarios/primaries](scenarios/primaries/) sub-directory. 

## Files

The following files are in this directory:

* [colours.csv](colours.csv) - this is used to define the colours used for lines on the graphs.
* [graphs.pl](graphs.pl) - Perl code that generates the graphs and tables. It will need to be re-run if the graph data are updated.
* [primaries2lad.json](primaries2lad.json) - how Primary sub-stations split between Local Authority Districts. The split was calculated using the proportion of customers attached to a Primary were within different Local Authority Districts.

## Sub-directories

### [graphs/](graphs/)

The graphs directory contains CSV files used to generate the graphs for `graph.html`. The [index.json](graphs/index.json) file defines each of the graphs that will be made by running `perl graph.pl`. Each one is of the form:

```
{
	"csv":"Total number of EVs (#).csv",
	"svg":"graph-ev.svg",
	"table":"graph-ev.html",
	"yaxis-label": "Number",
	"yaxis-max": 100,
	"yscale": 100,
	"left": 120
}
```

where `csv` is the CSV file in the [graphs/](graphs/) directory to use, `svg` is the file name for the resulting SVG graphic, `table` is the resulting HTML fragment for the table, `yaxis-label` is the y-axis label, `left` is the left placement (in pixels) of the y-axis, `yaxis-max` is the maximum value for the y-axis (useful for limiting the auto-range), and `yscale` is a factor by which to scale the y-axis values (particularly useful for getting to percentages from 0-1 range numbers).

### [lib/](lib/)

This directory contains Perl modules for use by the `graphs.pl` code.

### [maps/](maps/)

The maps directory contains GeoJSON files that are needed for the visualisation. These include:

  * [LAD2019-npg.geojson](maps/LAD2019-npg.geojson) - the Local Authority boundaries (2019)
  * [primaries-unique-all.geojson](maps/primaries-unique-all.geojson) - the geography of the Primary sub-stations (based on 2019)

### [scenarios/](scenarios/)

The [scenarios/index.json](scenarios/index.json) JSON file describes the scenarios and gives links to the relevant data files for each parameter within each scenario.

The `parameters` are defined in [scenarios/config.json](scenarios/config.json).

