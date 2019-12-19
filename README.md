# Northern Powergrid Future Energy Scenarios

A collaboration between Northern Powergrid and ODI Leeds to visualise Northern Powergrid's potential future scenarios as defined in the National Grid Future Energy Scenarios.


## About the visualisation

### Predictions

Each modelled parameter is calculated by Element Energy for each of Northern Powergrid's Primary substations.


### Geographies

For this visualisation we have created [geographies (polygons) for each Primary substation in Northern Powergrid's network](data/maps/primaries-unique.geojson). We chose to use [Output Areas](https://www.ons.gov.uk/census/2001censusandearlier/dataandproducts/outputgeography/outputareas) (2011) as these are the building blocks of census geography as used by the [Office of National Statistics](https://www.ons.gov.uk/). We have used Northern Powergrid customer postcodes to identify each Output Area supplied by each Primary substation. Output Areas with fewer than 10 customers connected to a Primary were excluded. This helped with anonymisation and also reduced data issues in the customer database e.g. incorrect customer postcodes. We construct representative geographies for each Primary substation from the remaining Output Areas. In cases where multiple Primary substations serve the same Output Area, that Output Area is assigned to the Primary substation that serves the most customers there.

Some Primary substation geographies may show larger areas on the map than they cover in practice particularly in rural areas where network connectivity may be concentrated in specific parts of an Output Area. The areas shown here are representative for the purpose of showing the Future Energy Scenario model data and should not be relied upon for checking connectivity or to assess the terms of connection for specific premises.

### Local Authority view

The model predictions have been created by Primary Supply Point and that is the definitive view. The Local Authority view is constructed from the Primary substation values. We have found the proportion of a Primary substation's customers in each Local Authority District (as defined in April 2019) by adding up the customers in each Output Area belonging to a specific Local Authority District. For some parameters (e.g. electric vehicles) the values from the Primary substations are apportioned to each Local Authority District and then summed into totals. For values which can't be summed (e.g. Peak demand) we have shown the maximum value for any Primary substation that serves a Local Authority. Note that for Local Authorities which are only partially in Northern Powergrid areas the model only produces forecasts for the area that overlaps with NPg, so it is not a total LA forecast. Examples of these boundary Local Authorities include Bassetlaw, East Lindsey, High Peak, North East Derbyshire, North East Lincolnshire, North Lincolnshire, Pendle, West Lindsey.
