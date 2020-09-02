# DFES Data

## Adding parameters

1. Save the parameter files for each of the four scenarios into [scenarios/primaries](scenarios/primaries/).
2. Edit [config.json](scenarios/config.json) to include the new parameter in the dropdown:
```
{
	"ev": { "title": "Electric Vehicles (number)", "combine": "sum", "units":"", "dp": 0, "description": "Number of registered plug in electric vehicles (pure and hybrid)" },
	"heatpumps": { "title": "Heat Pumps (number)", "combine": "sum", "units":"", "dp": 0, "description": "Number of heat pumps per residential household and commercial properties including from district heating schemes" },
.
.
.
};
```
Each parameter can have the following properties:
  * `title` - the label used for this parameter
  * `description` - the description that appears below the drop down
  * `combine` - how the data from the smaller regions are combined into larger regions (`sum` or `max` are the options)
  * `units` - the units to use e.g. `MWh`
  * `dp` - the number of decimal places to use for this value
3. Edit [index.json](index.json) and add the file references for each scenario:
```
	"Community renewables": {
		"description": "<ul><li>Achieves the 2050 decarbonisation target.</li><li>Decentralised pathway.</li></ul>",
		"color": "#E6007C",
		"css": "c9-bg",
		"data": {
			"ev": {
				"primary": { "file": "primaries/EV-CommunityRenewables.csv" }
			},
			"peakdemand":{
				"primary": { "file": "primaries/PeakDemand-CommunityRenewables.csv" }
			},
			"peakutilisation":{
				"primary": { "file": "primaries/PeakUtilisation-CommunityRenewables.csv" }
			},
			"windcapacity":{
				"primary": { "file": "primaries/WindCapacity-CommunityRenewables.csv" }
			}
		}
	},
```



## Sources

The [Local Authority Districts](https://geoportal.statistics.gov.uk/datasets/local-authority-districts-april-2019-boundaries-uk-buc) are taken from [the ONS geo service](https://ons-inspire.esriuk.com/arcgis/rest/services/Administrative_Boundaries/Local_Authority_Districts_April_2019_Boundaries_UK_BUC/MapServer/0/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=5&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=geojson). They are [released under OGL](https://www.ons.gov.uk/methodology/geography/licences):

* Contains National Statistics data © Crown copyright and database right 2019
* Contains OS data © Crown copyright and database right 2019


We have to convert from Output Area (2011) to Local Authority District (2019) using [data from the ONS](https://geoportal.statistics.gov.uk/datasets/postcode-to-output-area-to-lower-layer-super-output-area-to-middle-layer-super-output-area-to-local-authority-district-august-2019-lookup-in-the-uk).
