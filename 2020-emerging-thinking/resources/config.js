// Define a new instance of the FES
var dfes

S(document).ready(function(){
	dfes = new FES({
		"options": {
			"scenario": "Deep electrification",
			"view": "LAD",
			"key": (new Date()).getFullYear()+'',
			"parameter": "ev",
			"scale": "relative",
			"source": null,
			"years": {"min":2017,"max":2050}
		},
		"layers": {
			"LAD":{
				"file": "data/maps/LAD2019-npg.geojson"
			},
			"primaries":{
				"file":"data/maps/primaries-unique-all.geojson"
			}
		},
		"views":{
			'LAD':{
				'title':'Local Authorities',
				'file':'data/maps/LAD-npg.geojson',
				'source': 'primary',
				'layers':[{
					'id': 'LAD',
					'heatmap': true,
					'boundary':{'strokeWidth':2}
				}]
			},
			'primaries':{
				'title':'Primary Substations',
				'file':'data/maps/primaries-unique-all.geojson',
				'source': 'primary',
				'layers':[{
					'id': 'primaries',
					'heatmap': true,
				}]
			},
			'primariesLAD':{
				'title':'Primary Substations (with Local Authorities)',
				'source': 'primary',
				'layers':[{
					'id':'LAD',
					'heatmap': false,
					'boundary':{'color':'#444444','strokeWidth':1,"opacity":0.5,"fillOpacity":0}
				},{
					'id':'primaries',
					'heatmap': true,
				}]
			}
		}
	});
});
