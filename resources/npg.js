/*!
 * ODI Leeds FES viewer
 */
var future;

S(document).ready(function(){

	// Main function
	function FES(file){

		this.scenario = "Community renewables";
		this.view = "LAD";
		this.parameter = "ev";
		this.parameters = {
			'ev':{ 'title': 'Electric vehicles' }
		};
		this.scenarios = null;
		this.views = {
			'LAD':{'title':'Local Authorities','file':'data/maps/LAD-npg.geojson'},
			'primaries':{'title':'Primary Supply','file':'data/maps/primaries-unique.geojson'}
		};
		
		S().ajax("data/primaries2lad.json",{
			'this':this,
			'cache':false,
			'dataType':'json',
			'success': function(d){
				this.primary2lad = d;
				S().ajax("data/scenarios/index.json",{
					'this':this,
					'cache':false,
					'dataType':'json',
					'success': function(d){
						this.scenarios = d;
						this.init();
					},
					'error': function(e,attr){
						console.error('Unable to load '+attr.file);
					}
				});
			},
			'error': function(e,attr){
				console.error('Unable to load '+attr.file);
			}
		});

		return this;
	}

	FES.prototype.init = function(){

		if(this.scenarios && S('#scenarios').length==0){
			var html = "";
			for(var s in this.scenarios) html += "<option"+(this.scenario == s ? " selected=\"selected\"":"")+" value=\""+s+"\">"+s+"</option>";
			S('#scenario-holder').html('<select id="scenarios">'+html+'</select>');
		}
		if(this.views && S('#view').length==0){
			var html = "";
			for(var l in this.views) html += "<option"+(this.view == l ? " selected=\"selected\"":"")+" value=\""+l+"\">"+this.views[l].title+"</option>";
			S('#view-holder').html('<select id="views">'+html+'</select>');
			S('#views').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.view = e.currentTarget.value;
				e.data.me.buildMap();
			})
		}
		if(this.parameters && S('#parameters').length==0){
			var html = "";
			for(var p in this.parameters) html += "<option"+(this.parameter == p ? " selected=\"selected\"":"")+" value=\""+p+"\">"+this.parameters[p].title+"</option>";
			S('#parameter-holder').html('<select id="parameters">'+html+'</select>');
		}
		
		this.buildMap();
		
		return this;
	}


	FES.prototype.buildMap = function(){

		
		var bounds = L.latLngBounds(L.latLng(56.01680,2.43896),L.latLng(52.82268,-5.603027));
		
		function makeMarker(colour){
			return L.divIcon({
				'className': '',
				'html':	'<svg xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="7.0556mm" height="11.571mm" viewBox="0 0 25 41.001" id="svg2" version="1.1"><g id="layer1" transform="translate(1195.4,216.71)"><path style="fill:%COLOUR%;fill-opacity:1;fill-rule:evenodd;stroke:#ffffff;stroke-width:0.1;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:none" d="M 12.5 0.5 A 12 12 0 0 0 0.5 12.5 A 12 12 0 0 0 1.8047 17.939 L 1.8008 17.939 L 12.5 40.998 L 23.199 17.939 L 23.182 17.939 A 12 12 0 0 0 24.5 12.5 A 12 12 0 0 0 12.5 0.5 z " transform="matrix(1,0,0,1,-1195.4,-216.71)" id="path4147" /><ellipse style="opacity:1;fill:#ffffff;fill-opacity:1;stroke:none;stroke-width:1.428;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" id="path4173" cx="-1182.9" cy="-204.47" rx="5.3848" ry="5.0002" /></g></svg>'.replace(/%COLOUR%/,colour||"#000000"),
				iconSize:	 [25, 41], // size of the icon
				shadowSize:	 [41, 41], // size of the shadow
				iconAnchor:	 [12.5, 41], // point of the icon which will correspond to marker's location
				shadowAnchor: [12.5, 41],	// the same for the shadow
				popupAnchor:	[0, -41] // point from which the popup should open relative to the iconAnchor
			});
		}

		if(!this.map){
			var mapel = S('#map');
			var mapid = mapel.attr('id');
			this.map = L.map(mapid,{'scrollWheelZoom':true}).fitBounds(bounds);

			// CartoDB map
			L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			}).addTo(this.map);
		}

		var geoattr = {
			"style": {
				"color": "#D73058",
				"weight": 0.5,
				"opacity": 0.65
			}
		};
		
		if(!this.scenarios[this.scenario][this.parameter].raw){
			// Load the file
			S().ajax("data/scenarios/"+this.scenarios[this.scenario][this.parameter].file,{
				'this':this,
				'cache':false,
				'dataType':'text',
				'scenario': this.scenario,
				'parameter': this.parameter,
				'complete': function(d,attr){
					this.scenarios[attr.scenario][attr.parameter].raw = CSV2JSON(d,1);
					this.scenarios[attr.scenario][attr.parameter].primaries = {};
					this.scenarios[attr.scenario][attr.parameter].LAD = {};
					var r,c,v,p,lad;
					var key = (this.scenarios[attr.scenario][attr.parameter].key||"");
					console.log(key)
					var col = -1;
					for(i = 0; i < this.scenarios[attr.scenario][attr.parameter].raw.fields.name.length; i++){
						if(this.scenarios[attr.scenario][attr.parameter].raw.fields.name[i] == key) col = i;
					}
					if(col >= 0){
						for(r = 0; r < this.scenarios[attr.scenario][attr.parameter].raw.rows.length; r++){
							pkey = this.scenarios[attr.scenario][attr.parameter].raw.rows[r][col];
							this.scenarios[attr.scenario][attr.parameter].primaries[pkey] = {};
							for(c = 0; c < this.scenarios[attr.scenario][attr.parameter].raw.fields.name.length; c++){
								if(c != col){
									v = parseFloat(this.scenarios[attr.scenario][attr.parameter].raw.rows[r][c]);
									this.scenarios[attr.scenario][attr.parameter].primaries[pkey][this.scenarios[attr.scenario][attr.parameter].raw.fields.name[c]] = (typeof v==="number") ? v : this.scenarios[attr.scenario][attr.parameter].raw.rows[r][c];
								}
							}
						}
						// Convert to LADs
						// For each primary
						for(p in this.scenarios[attr.scenario][attr.parameter].primaries){
							if(this.primary2lad[p]){
								// Loop over the LADs for this primary
								for(lad in this.primary2lad[p]){
									// Loop over each key
									for(key in this.scenarios[attr.scenario][attr.parameter].primaries[p]){
										// Zero the variable if necessary
										if(!this.scenarios[attr.scenario][attr.parameter].LAD[lad]) this.scenarios[attr.scenario][attr.parameter].LAD[lad] = {};
										if(!this.scenarios[attr.scenario][attr.parameter].LAD[lad][key]) this.scenarios[attr.scenario][attr.parameter].LAD[lad][key] = 0;
										// Sum the fractional amount for this LAD/Primary
										this.scenarios[attr.scenario][attr.parameter].LAD[lad][key] += this.primary2lad[p][lad]*this.scenarios[attr.scenario][attr.parameter].primaries[p][key];
									}
								}
							}
						}
						
					}
					this.buildMap();
				},
				'error': function(e,attr){
					console.error('Unable to load '+attr.file);
				}
			});
		}else{
			var min = 0;
			var max = 1;
			var key =  '2019';
			var _obj = this;
			var _scenario = this.scenarios[this.scenario][this.parameter];

			if(_scenario[this.view]){
				var min = 1e100;
				var max = -1e100;
				for(i in _scenario[this.view]){
					v = _scenario[this.view][i][key];
					if(typeof v==="number"){
						min = Math.min(v,min);
						max = Math.max(v,max);
					}
				}
			}

			geoattr.style = function(feature){
				if(feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon"){
					var v = 0;
					var data = _scenario[_obj.view];
					if(_obj.view == "LAD"){
						// Need to convert primaries to LAD
						lad19cd = feature.properties.lad19cd;
						if(data[lad19cd]) v = (data[lad19cd][key]-min)/(max-min);
					}else if(_obj.view == "primaries"){
						f = (data[feature.properties.Primary][key]-min)/(max-min);
						v = f;//v = (f*0.6 + 0.2);
					}
					return { "color": "#D73058", "weight": 0.5, "opacity": 0.65,"fillOpacity": v };
				}else return { "color": "#D73058" };
			};		
		}

		if(this.map){

			if(!this.views[this.view].data){
				S('#map .spinner').css({'display':''});		
				S().ajax(this.views[this.view].file,{
					'this':this,
					'cache':false,
					'dataType':'json',
					'view': this.view,
					'complete': function(d,attr){
						this.views[attr.view].data = d;
						this.init();
					},
					'error': function(e,attr){
						console.error('Unable to load '+attr.file);
					}
				});
			}else{
				if(!this.views[this.view].layer){
					this.views[this.view].layer = L.geoJSON(this.views[this.view].data, geoattr);
				}
			}

			if(this.view=="LAD"){
				if(this.views.primaries.layer && this.views.primaries.layer._map) this.views.primaries.layer.remove();
				if(this.views.LAD.layer){
					this.views.LAD.layer.addTo(this.map);
					S('#map .spinner').css({'display':'none'});
				}
			}else if(this.view=="primaries"){
				if(this.views.LAD.layer && this.views.LAD.layer._map) this.views.LAD.layer.remove();
				if(this.views.primaries.layer){
					this.views.primaries.layer.addTo(this.map);
					S('#map .spinner').css({'display':'none'});
				}
			}
		}
		

		/*
		function popuptext(feature){
			// does this feature have a property named popupContent?
			popup = '';
			if(feature.properties){
				// If this feature has a default popup
				// Convert "other_tags" e.g "\"ele:msl\"=>\"105.8\",\"ele:source\"=>\"GPS\",\"material\"=>\"stone\""
				if(feature.properties.other_tags){
					tags = feature.properties.other_tags.split(/,/);
					for(var t = 0; t < tags.length; t++){
						tags[t] = tags[t].replace(/\"/g,"");
						bits = tags[t].split(/\=\>/);
						if(bits.length == 2){
							if(!feature.properties[bits[0]]) feature.properties[bits[0]] = bits[1];
						}
					}
				}
				if(feature.properties.popup){
					popup = feature.properties.popup.replace(/\n/g,"<br />");
				}else{
					title = '';
					if(feature.properties.title || feature.properties.name || feature.properties.Name) title = (feature.properties.title || feature.properties.name || feature.properties.Name);
					//if(!title) title = "Unknown name";
					if(title) popup += '<h3>'+(title)+'</h3>';
					var added = 0;
					for(var f in feature.properties){
						if(f != "Name" && f!="name" && f!="title" && f!="other_tags" && (typeof feature.properties[f]==="number" || (typeof feature.properties[f]==="string" && feature.properties[f].length > 0))){
							popup += (added > 0 ? '<br />':'')+'<strong>'+f+':</strong> '+(typeof feature.properties[f]==="string" && feature.properties[f].indexOf("http")==0 ? '<a href="'+feature.properties[f]+'" target="_blank">'+feature.properties[f]+'</a>' : feature.properties[f])+'';
							added++;
						}
					}
				}
				// Loop over properties and replace anything
				for(p in feature.properties){
					while(popup.indexOf("%"+p+"%") >= 0){
						popup = popup.replace("%"+p+"%",feature.properties[p] || "?");
					}
				}
				popup = popup.replace(/%type%/g,feature.geometry.type.toLowerCase());
				// Replace any remaining unescaped parts
				popup = popup.replace(/%[^\%]+%/g,"?");
			}
			return popup;
		}
		var customicon = makeMarker('#FF6700');

		this.geojson = {
			"type": "FeatureCollection",
			"features": []
		}

		// Build marker list
		var markerList = [];

		for(var i = 0; i < this.data.rows.length; i++){
			if(this.data.geo[i] && this.data.geo[i].length == 2){

				feature = {"type":"Feature","properties":{},"geometry": { "type": "Point", "coordinates": this.data.geo[i] }};
				for(var c = 0; c < this.data.rows[i].length; c++){
					var n = this.data.fields.title[c];
					if(this.data.fields.required[c]==true && this.data.rows[i][c]!=""){
						feature.properties[n] = this.data.rows[i][c];
					}
				}
				this.geojson.features.push(feature);

				// Add marker
				marker = L.marker([this.data.geo[i][1],this.data.geo[i][0]],{icon: customicon});
				marker.bindPopup(popuptext(feature));
				markerList.push(marker);
			}
		}

		if(this.map && this.geojson.features.length > 0){
			if(this.layer) this.map.removeLayer(this.layer);

			// Define a cluster layer
			this.layer = L.markerClusterGroup({
				chunkedLoading: true,
				maxClusterRadius: 70,
				iconCreateFunction: function (cluster) {
					var markers = cluster.getAllChildMarkers();
					return L.divIcon({ html: '<div class="marker-group" style="background-color:#FF6700;color:black">'+markers.length+'</div>', className: '',iconSize: L.point(40, 40) });
				},
				// Disable all of the defaults:
				spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true
			});
			// Add marker list to layer
			this.layer.addLayers(markerList);
			this.map.fitBounds(this.layer.getBounds(),{'padding':[8,8]});
			this.layer.addTo(this.map);
		}
		
		txt = JSON.stringify(this.geojson);
		this.geojsonnewline = txt.replace(/\{"type":"Feature"/g,"\n{\"type\":\"Feature\"");
		*/

		return this;
	}
	
	


	// Useful functions


	function niceSize(b){
		if(b > 1e12) return (b/1e12).toFixed(2)+" TB";
		if(b > 1e9) return (b/1e9).toFixed(2)+" GB";
		if(b > 1e6) return (b/1e6).toFixed(2)+" MB";
		if(b > 1e3) return (b/1e3).toFixed(2)+" kB";
		return (b)+" bytes";
	}

	/**
	 * CSVToArray parses any String of Data including '\r' '\n' characters,
	 * and returns an array with the rows of data.
	 * @param {String} CSV_string - the CSV string you need to parse
	 * @param {String} delimiter - the delimeter used to separate fields of data
	 * @returns {Array} rows - rows of CSV where first row are column headers
	 */
	function CSVToArray (CSV_string, delimiter) {
		delimiter = (delimiter || ","); // user-supplied delimeter or default comma

		var pattern = new RegExp( // regular expression to parse the CSV values.
			( // Delimiters:
				"(\\" + delimiter + "|\\r?\\n|\\r|^)" +
				// Quoted fields.
				"(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
				// Standard fields.
				"([^\"\\" + delimiter + "\\r\\n]*))"
			), "gi"
		);

		var rows = [[]];  // array to hold our data. First row is column headers.
		// array to hold our individual pattern matching groups:
		var matches = false; // false if we don't find any matches
		// Loop until we no longer find a regular expression match
		while (matches = pattern.exec( CSV_string )) {
			var matched_delimiter = matches[1]; // Get the matched delimiter
			// Check if the delimiter has a length (and is not the start of string)
			// and if it matches field delimiter. If not, it is a row delimiter.
			if (matched_delimiter.length && matched_delimiter !== delimiter) {
				// Since this is a new row of data, add an empty row to the array.
				rows.push( [] );
			}
			var matched_value;
			// Once we have eliminated the delimiter, check to see
			// what kind of value was captured (quoted or unquoted):
			if (matches[2]) { // found quoted value. unescape any double quotes.
				matched_value = matches[2].replace(
					new RegExp( "\"\"", "g" ), "\""
				);
			} else { // found a non-quoted value
				matched_value = matches[3];
			}
			// Now that we have our value string, let's add
			// it to the data array.
			rows[rows.length - 1].push(matched_value);
		}
		return rows; // Return the parsed data Array
	}

	// Function to parse a CSV file and return a JSON structure
	// Guesses the format of each column based on the data in it.
	function CSV2JSON(data,start,end){

		// If we haven't sent a start row value we assume there is a header row
		if(typeof start!=="number") start = 1;
		// Split by the end of line characters
		if(typeof data==="string") data = CSVToArray(data);
		// The last row to parse
		if(typeof end!=="number") end = data.length;

		if(end > data.length){
			// Cut down to the maximum length
			end = data.length;
		}


		var line,datum,header,types;
		var newdata = new Array();
		var formats = new Array();
		var req = new Array();

		for(var i = 0, rows = 0 ; i < end; i++){

			// If there is no content on this line we skip it
			if(data[i] == "") continue;

			line = data[i];

			datum = new Array(line.length);
			types = new Array(line.length);

			// Loop over each column in the line
			for(var j=0; j < line.length; j++){

				// Remove any quotes around the column value
				datum[j] = (line[j][0]=='"' && line[j][line[j].length-1]=='"') ? line[j].substring(1,line[j].length-1) : line[j];

				// If the value parses as a float
				if(typeof parseFloat(datum[j])==="number" && parseFloat(datum[j]) == datum[j]){
					types[j] = "float";
					// Check if it is actually an integer
					if(typeof parseInt(datum[j])==="number" && parseInt(datum[j])+"" == datum[j]){
						types[j] = "integer";
						// If it is an integer and in the range 1700-2100 we'll guess it is a year
						if(datum[j] >= 1700 && datum[j] < 2100) types[j] = "year";
					}
				}else if(datum[j].search(/^(true|false)$/i) >= 0){
					// The format is boolean
					types[j] = "boolean";
				}else if(datum[j].search(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/) >= 0){
					// The value looks like a URL
					types[j] = "URL";
				}else if(!isNaN(Date.parse(datum[j]))){
					// The value parses as a date
					types[j] = "datetime";
				}else{
					// Default to a string
					types[j] = "string";
					// If the string value looks like a time we set it as that
					if(datum[j].search(/^[0-2]?[0-9]\:[0-5][0-9]$/) >= 0) types[j] = "time";
				}
			}

			if(i == 0 && start > 0) header = datum;
			if(i >= start){
				newdata[rows] = datum;
				formats[rows] = types;
				rows++;
			}
		}
		
		// Now, for each column, we sum the different formats we've found
		var format = new Array(header.length);
		for(var j = 0; j < header.length; j++){
			var count = {};
			var empty = 0;
			for(var i = 0; i < newdata.length; i++){
				if(!newdata[i][j]) empty++;
			}
			for(var i = 0 ; i < formats.length; i++){
				if(!count[formats[i][j]]) count[formats[i][j]] = 0;
				count[formats[i][j]]++;
			}
			var mx = 0;
			var best = "";
			for(var k in count){
				if(count[k] > mx){
					mx = count[k];
					best = k;
				}
			}
			// Default
			format[j] = "string";

			// If more than 80% (arbitrary) of the values are a specific format we assume that
			if(mx > 0.8*newdata.length) format[j] = best;

			// If we have a few floats in with our integers, we change the format to float
			if(format[j] == "integer" && count['float'] > 0.1*newdata.length) format[j] = "float";

			req.push(header[j] ? true : false);

		}
		

		// Return the structured data
		return { 'fields': {'name':header,'title':clone(header),'format':format,'required':req }, 'rows': newdata };
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}


	String.prototype.regexLastIndexOf = function(regex, startpos) {
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") {
			startpos = this.length;
		} else if(startpos < 0) {
			startpos = 0;
		}
		var stringToWorkWith = this.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = ++nextStop;
		}
		return lastIndexOf;
	}



	// Define a new instance of the FES
	future = new FES();
	
});