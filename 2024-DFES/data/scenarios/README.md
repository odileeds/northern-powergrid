# NorthernPowerGrid Scenarios

This directory contains configuration for the visualisation as well as data files to power it.

## Adding a new parameter

Let's add a new parameter. 

### Add CSV files

Add the CSV files for this parameter to the [Primaries data directory](https://github.com/odileeds/northern-powergrid/tree/main/data/scenarios/primaries).

### Update the index

We need to let the visualisation know that the CSV files exist and where they are. Edit the [index.json](index.json) file. We need a _unique_ key for the new parameter. Existing keys are e.g. `ev`, `peakdemand`, `peakutilisation` etc. Keys should be simple - they won't be displayed in the visualisation - and any special characters (e.g. `‘`, `”`, `\`) will need to be escaped with a `\`. For this example we will use `newparameter`. Add the new parameter to each of the scenarios e.g.

```javascript
{
	"Steady Progression": {
		"description": "<ul><li>Achieves the 2050 decarbonisation target.</li><li>Decentralised pathway.</li></ul>",
		"color": "#901320",
		"negativecolor": "#d7191c",
		"css": "steady-progression",
		"data": {
			"ev": { "dataBy": "primary", "file": "primaries/EV-S1.csv", "key": "LSOA11CD" },
			"newparameter": { "dataBy": "primary", "file": "lsoa/NewParameter-CommunityRenewables.csv", "key": "MSOA11CD" }
                }
	}
}
```

For each parameter, `description` is HTML that will be shown below the scenario drop-down box, `color` is the hex code to use for this scenario, `negativecolor` is a contrasting colour to use for negative values (you could get inspiration from [ColorBrewer](https://colorbrewer2.org/#type=diverging&scheme=BrBG&n=3)), `css` is a CSS class used for this scenario (so make sure to update [style.css](../../resources/style.css) with any `color` change), and `data` is an object defining the parameters for this scenario. Each `data` object should have a unique key (the same one will be used `config.json`, below e.g. `ev`). Each of the data objects should have a `dataBy` property (we are using `primary`), a `file` property for the relative path to the file from this directory, and a `key` which is the column heading in the CSV that contains the unique geography code.

Once you've finished adding this parameter to `index.json`, check it is valid JSON using [JSON Lint](https://jsonlint.com/) otherwise you could break the visualisation if you have an invalid file.

### Update configuration

Next we need to update the [config.json](config.json) file. This file contains the configuration for each of the parameters that appear in the drop-down box in the visualisation. It uses the same keys as in the `index.json` file (e.g. `ev` and `heatpumps`) to list the configuration of each parameter. The order of the keys in this file determines the order of the options in the drop-down. The format of each parameter is a JSON object (key-value pairs) along the lines of:

```javascript
"newparameter": { "title": "Our brand new parameter", "combine": "sum", "units":"", "dp": 0, "description": "The short description that appears below the drop down" }
```

where:
* `newparameter` is a _unique_ key for this property;
* `title` is the label that appears in the drop down list (e.g. `Electric Vehicles (number)`);
* `combine` determines how Primary Sub-station values are combined into Local Authorities (`sum` to add each Primary contribution up or `max` to find the maximum value of a Primary in the Local Authority);
* `units` is the label to put after a number on the scale and popups (e.g. `MWh`);
* `description` is the help text that appears below the drop down.

Check that your changes are still valid JSON using [JSON Lint](https://jsonlint.com/).
