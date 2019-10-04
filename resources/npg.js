/*!
 * ODI Leeds FES viewer
 */
var future;

S(document).ready(function(){

	// Main function
	function FES(file){

		this.scenario = "Community renewables";
		this.view = "LAD";
		this.key = (new Date()).getFullYear()+'';
		this.parameter = "ev";
		this.parameters = {
			'ev':{ 'title': 'Electric vehicles' }
		};
		this.logging = true;
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
						this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
					}
				});
			},
			'error': function(e,attr){
				this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
			}
		});

		return this;
	}

	FES.prototype.init = function(){

		if(this.scenarios && S('#scenarios').length==0){
			var html = "";
			for(var s in this.scenarios) html += "<option"+(this.scenario == s ? " selected=\"selected\"":"")+" class=\""+this.scenarios[s].css+"\" value=\""+s+"\">"+s+"</option>";
			S('#scenario-holder').html('<select id="scenarios">'+html+'</select>');
			S('#scenarios').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setScenario(e.currentTarget.value);
			})
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
		

		// Create the slider
		this.slider = document.getElementById('slider');
		noUiSlider.create(this.slider, {
			start: [parseInt(this.key)],
			step: 1,
			connect: true,
			range: {
				'min': 2017,
				'max': 2050
			},
			pips: {
				mode: 'values',
				stepped: true,
				values: [2020,2030,2040,2050],
				density: 3
			}
		});
		var _obj = this;
		// Bind the changing function to the update event.
		this.slider.noUiSlider.on('update', function () {
			_obj.setYear(''+parseInt(slider.noUiSlider.get()));
		});

		
		this.setScenario(this.scenario);
		
		return this;
	}
	
	FES.prototype.setScenario = function(scenario){
		console.log('setScenario',scenario,this.parameter)
		// Set the scenario
		this.scenario = scenario;

		// Update the CSS class
		css = this.scenarios[scenario].css;
		S('header .title').attr('class','title '+css);
		S('#scenario .about').html(this.scenarios[scenario].description||'').attr('class','about padded '+css.replace(/-bg/,"-text"));
		S('#scenarios').attr('class',css)
		S('.scenario').attr('class','scenario '+css);
		S('header img').attr('src','https://odileeds.org/resources/images/odileeds-'+(css.replace(/[cs]([0-9]+)-bg/,function(m,p1){ return p1; }))+'.svg')
		S('.noUi-connect').attr('class','noUi-connect '+css);


		if(!this.scenarios[this.scenario].data[this.parameter].raw){
			// Load the file
			S().ajax("data/scenarios/"+this.scenarios[this.scenario].data[this.parameter].file,{
				'this':this,
				'cache':false,
				'dataType':'text',
				'scenario': this.scenario,
				'parameter': this.parameter,
				'success': function(d,attr){
					this.loadedData(d,attr.scenario,attr.parameter);
					this.buildMap();
				},
				'error': function(e,attr){
					this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
				}
			});
		}else{
			this.message('',{'id':'error'});
			// Re-draw the map
			this.buildMap();
		}

		return this;
	}

	FES.prototype.setYear = function(y){
		if(this.map){
			this.key = y;
			this.buildMap();
		}
		return this;
	}

	FES.prototype.loadedData = function(d,scenario,parameter){
	
		this.scenarios[scenario].data[parameter].raw = CSV2JSON(d,1);
		this.scenarios[scenario].data[parameter].primaries = {};
		this.scenarios[scenario].data[parameter].LAD = {};
		var r,c,v,p,lad;
		var key = "Primary";
		
		// Find the column number for the column containing the Primary name
		var col = -1;
		for(i = 0; i < this.scenarios[scenario].data[parameter].raw.fields.name.length; i++){
			if(this.scenarios[scenario].data[parameter].raw.fields.name[i] == key) col = i;
		}
		if(col >= 0){
			for(r = 0; r < this.scenarios[scenario].data[parameter].raw.rows.length; r++){
				// The primary key
				pkey = this.scenarios[scenario].data[parameter].raw.rows[r][col];
				this.scenarios[scenario].data[parameter].primaries[pkey] = {};
				for(c = 0; c < this.scenarios[scenario].data[parameter].raw.fields.name.length; c++){
					if(c != col){
						v = parseFloat(this.scenarios[scenario].data[parameter].raw.rows[r][c]);
						this.scenarios[scenario].data[parameter].primaries[pkey][this.scenarios[scenario].data[parameter].raw.fields.name[c]] = (typeof v==="number") ? v : this.scenarios[scenario].data[parameter].raw.rows[r][c];
					}
				}
			}
			// Convert to LADs
			// For each primary
			for(p in this.scenarios[scenario].data[parameter].primaries){
				if(this.primary2lad[p]){
					// Loop over the LADs for this primary
					for(lad in this.primary2lad[p]){
						// Loop over each key
						for(key in this.scenarios[scenario].data[parameter].primaries[p]){
							// Zero the variable if necessary
							if(!this.scenarios[scenario].data[parameter].LAD[lad]) this.scenarios[scenario].data[parameter].LAD[lad] = {};
							if(!this.scenarios[scenario].data[parameter].LAD[lad][key]) this.scenarios[scenario].data[parameter].LAD[lad][key] = 0;
							// Sum the fractional amount for this LAD/Primary
							this.scenarios[scenario].data[parameter].LAD[lad][key] += this.primary2lad[p][lad]*this.scenarios[scenario].data[parameter].primaries[p][key];
						}
					}
				}
			}
			
		}
		
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
			this.map.attributionControl._attributions = {};
			this.map.attributionControl.addAttribution('Vis: <a href="https://odileeds.org/projects/">ODI Leeds</a>, Data: <a href="https://cms.npproductionadmin.net/generation-availability-map">Northern Powergrid</a>');
			
			// CartoDB map
			L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			}).addTo(this.map);
		}

		var _obj = this;
		var color = (this.scenarios[this.scenario].color||"#000000");
		var geoattr = {
			"style": {
				"color": color,
				"weight": 0.5,
				"opacity": 0.65
			},
			'onEachFeature': function(feature, layer){
				var popup = popuptext(feature,{'this':_obj});
				if(popup) layer.bindPopup(popup);
			}
		};
		
		if(!this.scenarios[this.scenario].data[this.parameter].raw){
			console.error('Scenario '+this.scenario+' not loaded');
			return this;
		}
		
		var min = 0;
		var max = 1;
		var _obj = this;
		var _scenario = this.scenarios[this.scenario].data[this.parameter];

		if(_scenario[this.view]){
			var min = 1e100;
			var max = -1e100;
			for(i in _scenario[this.view]){
				v = _scenario[this.view][i][this.key];
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
					if(data[lad19cd]) v = (data[lad19cd][_obj.key]-min)/(max-min);
				}else if(_obj.view == "primaries"){
					f = (data[feature.properties.Primary][_obj.key]-min)/(max-min);
					v = f;//v = (f*0.6 + 0.2);
				}
				return { "color": color, "weight": 0.5, "opacity": 0.65,"fillOpacity": v };
			}else return { "color": color };
		};

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
						this.buildMap();
					},
					'error': function(e,attr){
						this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
					}
				});
				return this;
			}

			for(v in this.views){
				if(this.views[v].layer){
					this.views[v].layer.remove();
					delete this.views[v].layer;
				}
			}

			this.views[this.view].layer = L.geoJSON(this.views[this.view].data, geoattr);

			if(this.views[this.view].layer){
				this.views[this.view].layer.addTo(this.map);
				S('#map .spinner').css({'display':'none'});
			}
		}
		

		function popuptext(feature,attr){
			// does this feature have a property named popupContent?
			popup = '';
			me = attr['this'];
			key = feature.properties[(me.view=="LAD" ? "lad19cd" : "Primary")];
			v = 0;
			if(me.scenarios[me.scenario].data[me.parameter][me.view] && me.scenarios[me.scenario].data[me.parameter][me.view][key]){
				v = me.scenarios[me.scenario].data[me.parameter][me.view][key][me.key];
			}
			title = '?';
			added = 0;
			if(feature.properties){
				if(feature.properties.Primary || feature.properties.lad19nm) title = (feature.properties.Primary || feature.properties.lad19nm);
				if(feature.properties.lad19cd){
					popup += (added > 0 ? '<br />':'')+'<strong>Code:</strong> '+feature.properties.lad19cd;
					added++;
				}
			}
			popup += (added > 0 ? '<br />':'')+'<strong>'+me.parameters[me.parameter].title+' '+me.key+':</strong> '+v.toFixed(2);
			if(title) popup = '<h3>'+(title)+'</h3>'+popup;
			return popup;
		}
		
		/*
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
	
	FES.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else if(arguments[0] == "WARNING") console.warning('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else console.log('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
			}
		}
		return this;
	};

	FES.prototype.message = function(msg,attr){
		if(!attr) attr = {};
		if(!attr.id) attr.id = 'default';
		if(!attr['type']) attr['type'] = 'message';
		if(msg) this.log(attr['type'],msg);
		var css = "b5-bg";
		if(attr['type']=="ERROR") css = "c12-bg";
		if(attr['type']=="WARNING") css = "c14-bg";

		var msgel = S('.message');
		if(msgel.length == 0){
			S('#scenario').before('<div class="message"></div>');
			msgel = S('.message');
		}
	
		if(!msg){
			if(msgel.length > 0){
				// Remove the specific message container
				if(msgel.find('#'+attr.id).length > 0) msgel.find('#'+attr.id).remove();
				//msgel.find('#'+attr.id).parent().removeClass('padded');
			}
		}else if(msg){
			// Pad the container
			//msgel.parent().addClass('padded');
			// We make a specific message container
			if(msgel.find('#'+attr.id).length==0) msgel.append('<div id="'+attr.id+'"><div class="holder padded"></div></div>');
			msgel = msgel.find('#'+attr.id);
			msgel.attr('class',css).find('.holder').html(msg);
		}

		return this;
	};


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