# NorthernPowerGrid Scenarios

This directory contains configuration for the visualisation and the data files.

## Adding a new parameter

Let's add a new parameter. 

### Add CSV files

Add the CSV files for this parameter to the [Primaries data directory](https://github.com/odileeds/northern-powergrid/tree/master/data/scenarios/primaries).

### Update the index

We need to let the visualisation know that the CSV files exist and where they are. Edit the [index.json](https://github.com/odileeds/northern-powergrid/blob/master/data/scenarios/index.json) file. We need a _unique_ key for the new parameter. Existing keys are e.g. `ev`, `peakdemand`, `peakutilisation` etc. Keys should be simple - they won't be displayed in the visualisation - and any special characters (e.g. `‘`, `”`, `\`) will need to be escaped with a `\`. For this example we will use `newparameter`. Add the new parameter to each of the scenarios e.g.

```javascript
{
  "Community renewables": {
    "description": "<ul><li>Achieves 80% decarbonisation by 2050.</li><li>Local energy schemes flourish.</li></ul>",
    "color": "#E6007C",
    "css": "c9-bg",
    "data": {
      "ev": {
        "primary": { "file": "primaries/EV-CommunityRenewables.csv" }
      },
      "newparameter": {
        "primary": { "file": "primaries/NewParameter-CommunityRenewables.csv" }
      },
      ...
    }
  }
  ...
}
```
Once you've finished adding this parameter to `index.json`, check it is valid JSON using [JSON Lint](https://jsonlint.com/) otherwise you could break the visualisation if you have an invalid file.

### Update configuration

Next we need to update the [config.json](config.json) file. This file contains the configuration for each of the parameters that appear in the drop-down box in the visualisation. It uses the same keys as in the `index.json` file (e.g. `ev` and `heatpumps`) to list the configuration of each parameter. The order of the keys in this file determines the order of the options in the drop-down. The format of each parameter is a JSON object (key-value pairs) along the lines of:

```javascript
"newparameter": { "title": "Our brand new parameter", "combine": "sum", "units":"", "dp": 0, "description": "The short description that appears below the drop down" }
```

Where:
* `key` is a _unique_ key for this property;
* `title` is the label that appears in the drop down list (e.g. `Electric Vehicles (number)`);
* `combine` determines how Primary Sub-station values are combined into Local Authorities (`sum` to add each Primary contribution up or `max` to find the maximum value of a Primary in the Local Authority);
* `units` is the label to put after a number on the scale and popups (e.g. `MWh`);
* `description` is the help text that appears below the drop down.

Check that your changes are still valid JSON using [JSON Lint](https://jsonlint.com/).
