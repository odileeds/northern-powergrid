// Define a new instance of the FES
var dfes

S(document).ready(function(){

	dfes = new FES({
		"options": {
			"scenario": "Steady progression",
			"view": "LAD",
			"key": (new Date()).getFullYear()+'',
			"parameter": "ev",
			"scale": "relative",
			"source": null,
			"years": {"min":2020, "max":2050},
			"map": {
				"bounds": [[52.6497,-5.5151],[56.01680,2.35107]]
			}
		},
		"layers": {
			"LADlayer":{
				"geojson": "data/maps/LAD2019-npg.geojson",
				"key": "lad19cd",
				"data": {
					"mapping": {
						"src": "data/primaries2lad.json"	// JSON that maps from primaries -> LADs
					},
					"src": "primary"
				}
			},
			"PRIMARYlayer":{
				"data": {
					"src": "primary"	// This is the key used in data/scenarios/index.json
				},
				"geojson":"data/maps/primaries-unique-all.geojson",
				"key": "Primary"
			}
		},
		"views":{
			"LAD":{
				"title":"Local Authorities",
				"file":"data/maps/LAD-npg.geojson",
				"source": "primary",
				"layers":[{
					"id": "LADlayer",
					"heatmap": true,
					"boundary":{"strokeWidth":2}
				}],
				"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p>%VALUE%</p><div id="barchart"></div><p style="font-size:0.8em;margin-top: 0.25em;margin-bottom:0;text-align:center;">Primary substations (ordered)</p><p style="font-size:0.8em;margin-top:0.5em;">Columns show totals for each Primary substation associated with %TITLE%. The coloured portions show the fraction considered to be in %TITLE%. Hover over each to see details.</p>';
						title = (attr.properties.lad19nm||'?');
						dp = (typeof attr.parameter.dp==="number" ? attr.parameter.dp : 2);
						value = '<strong>'+attr.parameter.title+' '+this.options.key+':</strong> '+(dp==0 ? Math.round(attr.value) : attr.value.toFixed(dp)).toLocaleString()+''+(attr.parameter.units ? '&thinsp;'+attr.parameter.units : '');
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					},
					"open": function(attr){

						if(!attr) attr = {};

						if(attr.id){

							var data = [];
							
							// Work out the Local Authority name
							var lad19nm = attr.id;
							if(this.layers.LADlayer){
								for(var c = 0; c < this.layers.LADlayer.geojson.features.length; c++){
									if(this.layers.LADlayer.geojson.features[c].properties.lad19cd==attr.id) lad19nm = this.layers.LADlayer.geojson.features[c].properties.lad19nm;
								}
							}

							for(var p in this.layers.LADlayer.data.mapping.data){
								if(this.layers.LADlayer.data.mapping.data[p][attr.id]){
									v = 0;
									if(this.data.scenarios[this.options.scenario].data[this.options.parameter].primary.layers.PRIMARYlayer.values[p]) v = this.data.scenarios[this.options.scenario].data[this.options.parameter].primary.layers.PRIMARYlayer.values[p][this.options.key];
									fracLA = this.layers.LADlayer.data.mapping.data[p][attr.id]*v;
									fracOther = v - fracLA;
									data.push([p+'<br />Total: %VALUE%<br />'+(this.layers.LADlayer.data.mapping.data[p][attr.id]*100).toFixed(2).replace(/\.?0+$/,"")+'% is in '+lad19nm,[v,fracLA,fracOther]]);
								}
							}

							data.sort(function(a, b) {
								if(a[1][0]===b[1][0]) return 0;
								else return (a[1][0] < b[1][0]) ? -1 : 1;
							}).reverse();

							// Remove totals from bars now that we've sorted by total
							for(var i = 0; i < data.length; i++){
								data[i][1].splice(0,1);
							}
							
							// Create the barchart object. We'll add a function to
							// customise the class of the bar depending on the key.
							var chart = new S.barchart('#barchart',{
								'formatKey': function(key){
									return '';
								},
								'formatBar': function(key,val,series){
									var cls = (typeof series==="number" ? "series-"+series : "");
									for(var i = 0; i < this.data.length; i++){
										if(this.data[i][0]==key){
											if(i > this.data.length/2) cls += " bar-right";
										}
									}
									return cls;
								}
							});

							// Send the data array and bin size then draw the chart
							chart.setData(data).setBins({ 'mintick': 5 }).draw();
							parameter = this.parameters[this.options.parameter].title+' '+this.options.key;
							units = this.parameters[this.options.parameter].units;
							dp = this.parameters[this.options.parameter].dp;

							// Add an event
							chart.on('barover',function(e){
								S('.balloon').remove();
								S(e.event.currentTarget).find('.bar.series-1').append(
									"<div class=\"balloon\">"+this.bins[e.bin].key.replace(/%VALUE%/,parseFloat((this.bins[e.bin].value).toFixed(dp)).toLocaleString()+(units ? '&thinsp;'+units:''))+"</div>"
								);
							});
							S('.barchart table .bar').css({'background-color':'#cccccc'});
							S('.barchart table .bar.series-0').css({'background-color':this.data.scenarios[this.options.scenario].color});
						}else{
							S(attr.el).find('#barchart').remove();
						}
					}
				}
			},
			"primaries":{
				"title":"Primary Substations",
				"file":"data/maps/primaries-unique-all.geojson",
				"source": "primary",
				"layers":[{
					"id": "PRIMARYlayer",
					"heatmap": true,
				}],
				"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p>%VALUE%</p>';
						title = (attr.properties.Primary||'?');
						dp = (typeof attr.parameter.dp==="number" ? attr.parameter.dp : 2);
						value = '<strong>'+attr.parameter.title+' '+this.options.key+':</strong> '+(dp==0 ? Math.round(attr.value) : attr.value.toFixed(dp)).toLocaleString()+''+(attr.parameter.units ? '&thinsp;'+attr.parameter.units : '');
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					}
				}
			},
			"primariesLAD":{
				"title":"Primary Substations (with Local Authorities)",
				"source": "primary",
				"layers":[{
					"id":"LADlayer",
					"heatmap": false,
					"boundary":{"color":"#444444","strokeWidth":1,"opacity":0.5,"fillOpacity":0}
				},{
					"id":"primaries",
					"heatmap": true,
				}],
				"popup": {
					"text": function(attr){
						var popup,title,dp,value;
						popup = '<h3>%TITLE%</h3><p>%VALUE%</p>';
						title = (attr.properties.Primary||'?');
						dp = (typeof attr.parameter.dp==="number" ? attr.parameter.dp : 2);
						value = '<strong>'+attr.parameter.title+' '+this.options.key+':</strong> '+(dp==0 ? Math.round(attr.value) : attr.value.toFixed(dp)).toLocaleString()+''+(attr.parameter.units ? '&thinsp;'+attr.parameter.units : '');
						return popup.replace(/\%VALUE\%/g,value).replace(/\%TITLE\%/g,title); // Replace values
					}
				}
			}
		}
	});
});
