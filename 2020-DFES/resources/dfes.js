/*!
 * ODI Leeds Future Energy Scenario viewer
 */
(function(root){
	
	var scripts = document.getElementsByTagName('script');
	var path = "";
	for(var i = 0; i < scripts.length; i++){
		if(scripts[i].src.indexOf('dfes.js')>=0) path = scripts[i].src.split('?')[0];	// remove any ?query
	}
	path = path.split('/').slice(0, -2).join('/')+'/';  // remove last filename part of path

	// Main function
	function FES(config){

		this.version = "1.2.4";
		if(!config) config = {};
		this.options = (config.options||{});
		this.parameters = {};
		this.data = { };
		this.logging = true;		
		this.layers = (config.layers||{});
		this.views = (config.views||{});
		this.events = {};
		if(config.on) this.events = config.on;

		S().ajax(path+"data/scenarios/config.json",{
			'this':this,
			'cache':false,
			'dataType':'json',
			'success': function(d){
				this.parameters = d;
				S().ajax(path+"data/scenarios/index.json",{
					'this':this,
					'cache':false,
					'dataType':'json',
					'success': function(d,attr){
						console.info('Got '+attr.url);
						this.data.scenarios = d;
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

		if(this.options.scale=="absolute"){
			S('#scale-holder input').attr('checked','checked');
			S('#scale-holder').addClass('checked');
		}

		if(this.data.scenarios && S('#scenarios').length==0){
			var html = "";
			for(var s in this.data.scenarios) html += "<option"+(this.options.scenario == s ? " selected=\"selected\"":"")+" class=\"b1-bg\" value=\""+s+"\">"+s+"</option>";	//  class=\""+this.options.scenarios[s].css+"\"
			S('#scenario-holder').html('<select id="scenarios">'+html+'</select>');
			S('#scenarios').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setScenario(e.currentTarget.value);
			});
		}
		if(this.views && S('#view').length==0){
			var html = "";
			for(var l in this.views){
				if(!this.views[l].inactive) html += "<option"+(this.options.view == l ? " selected=\"selected\"":"")+" value=\""+l+"\">"+this.views[l].title+"</option>";
			}
			S('#view-holder').html('<select id="views">'+html+'</select>');
			S('#views').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setView(e.currentTarget.value);
			});
		}
		if(this.parameters && S('#parameters').length==0){
			var html = "";
			if(!this.data.scenarios[this.options.scenario]) this.message('Scenario <em>"'+this.options.scenario+'"</em> is not defined in index.json.',{'id':'scenario','type':'ERROR'});
			var css = this.data.scenarios[this.options.scenario].css;
			for(var p in this.parameters) html += "<option"+(this.options.parameter == p ? " selected=\"selected\"":"")+" value=\""+p+"\">"+this.parameters[p].title+"</option>";
			S('#parameter-holder').html('<select id="parameters">'+html+'</select><div class="about"></div>');
			S('#parameter-holder .about').html(this.parameters[this.options.parameter].description||'').attr('class','about '+css+"-text");
			S('#parameters').on('change',{'me':this},function(e){
				e.preventDefault();
				e.data.me.setParameter(e.currentTarget.value);
			});
		}

		// Add events to toggle switch		
		S('#scale-holder input').on('change',{me:this},function(e){
			e.preventDefault();
			e.data.me.setScale(e.currentTarget.checked);
		})
		S('#scale-holder .switch').on('click',{me:this},function(e){
			var el = S('#scale-holder input');
			el[0].checked = !el[0].checked;
			e.data.me.setScale(el[0].checked);
		})

		// Create the slider
		this.slider = document.getElementById('slider');
		noUiSlider.create(this.slider, {
			start: [parseInt(this.options.key)],
			step: 1,
			connect: true,
			range: {
				'min': this.options.years.min,
				'max': this.options.years.max
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
		
		this.setScenario(this.options.scenario);
		

		S('#play').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			e.data.me.startAnimate();
		})

		S('#pause').on('click',{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			e.data.me.stopAnimate();
		})
		
		return this;
	}
	
	FES.prototype.startAnimate = function(){
		//this.slider.noUiSlider.set(this.options.years.min);
		S('#play')[0].disabled = true;
		S('#pause')[0].disabled = false;
		var _obj = this;
		// If we are starting at the end, reset first
		if(parseInt(this.slider.noUiSlider.get())==this.options.years.max) this.slider.noUiSlider.set(this.options.years.min);
		this.options.years.interval = setInterval(function(){
			var yy = parseInt(_obj.slider.noUiSlider.get()) + 1;
			if(yy <= _obj.options.years.max) _obj.slider.noUiSlider.set(yy);
			else _obj.stopAnimate();
		},500);
		return this;
	}
	
	FES.prototype.stopAnimate = function(){
		clearInterval(this.options.years.interval);
		S('#play')[0].disabled = false;
		S('#pause')[0].disabled = true;

		return this;
	}
	
	FES.prototype.loadScenarioData = function(callback){

		S().ajax(path+"data/scenarios/"+this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].file,{
			'this':this,
			'cache':false,
			'dataType':'text',
			'scenario': this.options.scenario,
			'parameter': this.options.parameter,
			'callback': callback,
			'success': function(d,attr){
				console.info('Got '+attr.url);
				this.loadedData(d,attr.scenario,attr.parameter,attr.callback);
			},
			'error': function(e,attr){
				this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
			}
		});
	
	}
	
	FES.prototype.setScenarioColours = function(scenario){
		var css = this.data.scenarios[scenario].css;
		if(S('#scenario-holder .about').length==0) S('#scenario-holder').append('<div class="about"></div>');
		S('#scenario-holder .about').html(this.data.scenarios[scenario].description||'').attr('class','about '+css+'-text');
		S('#parameter-holder .about').html(this.parameters[this.options.parameter].description||'').attr('class','about '+css+'-text');

		for(var s in this.data.scenarios){
			S('#scenarios').removeClass(this.data.scenarios[s].css);
			S('.scenario').removeClass(this.data.scenarios[s].css);
		}
		S('#scenarios').addClass(css);
		S('.scenario').addClass(css);
		//S('header .ODIlogo img').attr('src','https://odileeds.org/resources/images/odileeds-'+(css.replace(/[cs]([0-9]+)-bg/,function(m,p1){ return p1; }))+'.svg');
		S('.noUi-connect').attr('class','noUi-connect '+css);
		return this;
	}

	FES.prototype.setScenario = function(scenario){

		// Set the scenario
		this.options.scenario = scenario;

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});
				
				
		// Update the CSS class
		this.setScenarioColours(scenario);

		this.options.source = this.views[this.options.view].source;
		if(!this.data.scenarios[scenario].data[this.options.parameter]){
			this.message('We have no data for '+this.parameters[this.options.parameter].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
		}else{
			this.message('',{'id':'error','type':'ERROR'});
			if(!this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].raw){
				this.loadScenarioData(function(){
					this.buildMap();
				});
			}else{
				this.message('',{'id':'error'});
				// Re-draw the map
				this.buildMap();
			}
		}

		return this;
	}

	FES.prototype.setView = function(v){

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});

		if(this.views[v]){
			this.options.view = v;
			this.options.source = this.views[this.options.view].source;
			this.buildMap();
		}else{
			this.message('The view '+v+' does not exist!',{'id':'error','type':'ERROR'});
		}
		return this;
	}

	FES.prototype.setParameter = function(v){

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});

		if(this.parameters[v]){
			this.options.parameter = v;
			this.message('',{'id':'error','type':'ERROR'});
			
			S('#parameter-holder .about').html(this.parameters[this.options.parameter].description||'');

			// Have we loaded the parameter/scenario?
			if(!this.data.scenarios[this.options.scenario]) this.message('We have no data for '+this.parameters[v].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
			else{
				if(!this.data.scenarios[this.options.scenario].data[this.options.parameter]){
					this.message('We have no data for '+this.parameters[v].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
				}else{
					if(!this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].raw){
						// Load the scenario data
						this.loadScenarioData(function(){ this.buildMap(); });
					}else{
						this.buildMap();
					}
				}
			}
		}
		return this;
	}
	
	FES.prototype.setScale = function(checked){
		this.options.scale = (checked ? "absolute":"relative");
		if(checked) S('#scale-holder').addClass('checked');
		else S('#scale-holder').removeClass('checked');
		this.buildMap();
	}

	FES.prototype.setYear = function(y){
		if(this.map){
			this.options.key = y;
			this.buildMap();
		}
		S('.year').html(y);
		return this;
	}

	FES.prototype.loadedData = function(d,scenario,parameter,callback){
	
		var r,c,v,p,a,l,key,min,max,source;
		var data = this.data.scenarios[scenario].data[parameter][this.options.source];

		if(!data.key){
			this.log('ERROR','No key provided for '+scenario+' '+parameter+' '+this.options.source);
			return this;
		}

		if(!data.layers) data.layers = {};
		if(!data.raw){
			data.raw = CSV2JSON(d,1);

			// Find the column number for the column containing the name
			// And convert year headings to integers
			var col = -1;
			for(i = 0; i < data.raw.fields.name.length; i++){
				n = data.raw.fields.name[i];
				if(parseFloat(n) == n) data.raw.fields.name[i] = parseInt(n);
				if(data.raw.fields.name[i] == data.key) col = i;
				// Loop over columns
				for(c = 0; c < data.raw.fields.name.length; c++){
					if(parseInt(data.raw.fields.name[c])==data.raw.fields.name[c]){
						for(r = 0; r < data.raw.rows.length; r++){
							// Convert to numbers - if the number doesn't parse replace with zero
							data.raw.rows[r][c] = (parseFloat(data.raw.rows[r][c])||0);
						}
					}
				}
			}
			if(col >= 0) data.col = col;
		}

		if(data.col >= 0){
			
			// Loop over the layers
			for(l in this.layers){

				// If this layer hasn't already been defined we try to make it
				if(!data.layers[l]){

					if(this.layers[l].data){

						if(this.layers[l].data.mapping && !this.layers[l].data.mapping.data && typeof this.layers[l].data.mapping.src==="string"){
							// Process data layers that need a mapping

							// Load from JSON file
							S().ajax(path+this.layers[l].data.mapping.src,{
								'this':this,
								'cache':false,
								'dataType':'json',
								'layer':l,
								'scenario':scenario,
								'parameter':parameter,
								'source':this.options.source,
								'callback':callback,
								'complete': function(d,attr){
									console.info('Got '+attr.url);
									this.layers[attr.layer].data.mapping.raw = d;
									if(typeof this.layers[attr.layer].data.mapping.process==="function"){
										d = this.layers[attr.layer].data.mapping.process.call(this,d);
									}
									this.layers[attr.layer].data.mapping.data = d;
									this.loadedData('',attr.scenario,attr.parameter,attr.callback);
								},
								'error': function(e,attr){
									this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
								}
							});
							return this;

						}else{
							
							source = this.layers[l].data.src;
							if(source && this.data.scenarios[scenario].data[parameter][source]){

								// No mapping needed
								data.layers[l] = {'values':{},'fullrange':{}};

								min = 1e100;
								max = -1e100;
								
								// Get the data source (which may be different to the one we loaded)
								d = this.data.scenarios[scenario].data[parameter][source];

								// Loop over data rows
								for(r = 0; r < d.raw.rows.length; r++){

									// The primary key
									pkey = d.raw.rows[r][data.col];
									if(this.layers[l].data.mapping && this.layers[l].data.mapping.data){
										if(this.layers[l].data.mapping.data[pkey]){
											for(a in this.layers[l].data.mapping.data[pkey]){
												if(!data.layers[l].values[a]) data.layers[l].values[a] = {};
												for(c = 0; c < d.raw.fields.name.length; c++){
													// Set values to zero
													key = d.raw.fields.name[c];
													if(c != col && parseInt(key)==key && !data.layers[l].values[a][key]){
														data.layers[l].values[a][key] = 0;
													}
												}
											}
										}
									}else{
										if(!data.layers[l].values[pkey]) data.layers[l].values[pkey] = {};
									}

									// Loop over columns in the raw data
									for(c = 0; c < d.raw.fields.name.length; c++){
										if(c != col && parseInt(d.raw.fields.name[c])==d.raw.fields.name[c]){

											if(d.raw.rows[r][c]=="") d.raw.rows[r][c] = 0;

											v = d.raw.rows[r][c];

											if(this.layers[l].data.mapping && this.layers[l].data.mapping.data){
												if(this.layers[l].data.mapping.data[pkey]){

													key = d.raw.fields.name[c]+"";

													for(a in this.layers[l].data.mapping.data[pkey]){

														if(this.parameters[parameter].combine=="sum"){

															// Sum the fractional amount for this mapped area
															data.layers[l].values[a][key] += (v*this.layers[l].data.mapping.data[pkey][a]);

														}else if(this.parameters[parameter].combine=="max"){

															// Find the maximum value for mapped areas
															data.layers[l].values[a][key] = Math.max(v,data.layers[l].values[a][key]);

														}
													}
												}

											}else{
												// If this layer uses the current source as "data" we can set it
												data.layers[l].values[pkey][d.raw.fields.name[c]] = (typeof v==="number") ? v : d.raw.rows[r][c];
											}
										}
									}
								}

								// Find minimum and maximum values
								for(pkey in data.layers[l].values){
									for(key in data.layers[l].values[pkey]){
										if(!isNaN(data.layers[l].values[pkey][key])){
											min = Math.min(min,data.layers[l].values[pkey][key]);
											max = Math.max(max,data.layers[l].values[pkey][key]);
										}else{
											// Ignore fields that aren't years
										}
									}
								}

								data.layers[l].fullrange = {'min':min,'max':max};
							}else{
								this.log('ERROR','No source data loaded for '+source);
								return this;
							}
						}
					}else{
						this.log('ERROR','No data attribute provided for layer '+l);
						return this;
					}
				}

			}	// End loop over layers

		}

		this.data.scenarios[scenario].data[parameter][this.options.source] = data;

		if(typeof callback==="function") callback.call(this);

		return this;
	}

	FES.prototype.buildMap = function(){

		var bounds = L.latLngBounds(L.latLng(56.01680,2.35107),L.latLng(52.6497,-5.5151));
		if(this.options.map && this.options.map.bounds) bounds = L.latLngBounds(L.latLng(this.options.map.bounds[0][0],this.options.map.bounds[0][1]),L.latLng(this.options.map.bounds[1][0],this.options.map.bounds[1][1]));
		
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

		var _obj = this;
		if(!this.map){
			var mapel = S('#map');
			var mapid = mapel.attr('id');
			this.map = L.map(mapid,{'scrollWheelZoom':true}).fitBounds(bounds);
			
			this.map.on('popupopen',function(e){
				// Call any attached functions
				if(_obj.views[_obj.options.view].popup && _obj.views[_obj.options.view].popup['open']){
					_obj.views[_obj.options.view].popup['open'].call(_obj,{'el':e.popup._contentNode,'id':e.popup._source.feature.properties[_obj.layers[_obj.views[_obj.options.view].layers[0].id].key]});
				}
			});
			this.map.attributionControl._attributions = {};
			if(this.options.map && this.options.map.attribution) this.map.attributionControl.setPrefix('').addAttribution(this.options.map.attribution);

			// Create a map label pane so labels can sit above polygons
			this.map.createPane('labels');
			this.map.getPane('labels').style.zIndex = 650;
			this.map.getPane('labels').style.pointerEvents = 'none';

			L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
				attribution: '',
				pane: 'labels'
			}).addTo(this.map);
			
			// CartoDB map
			L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
				attribution: 'Tiles: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
				subdomains: 'abcd',
				maxZoom: 19
			}).addTo(this.map);
			
			var info = L.control({'position':'topright'});
			info.onAdd = function(map){
				this._div = L.DomUtil.create('div','scenario');
				this._div.innerHTML = '<div class="year padded">'+_obj.options.key+'</div>';
				return this._div;
			}
			info.addTo(this.map);
			this.setScenarioColours(this.options.scenario);
			
		}

		var color = (this.data.scenarios[this.options.scenario].color||"#000000");

		if(!this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].raw){
			this.log('ERROR','Scenario '+this.options.scenario+' not loaded',this.data.scenarios[this.options.scenario].data[this.options.parameter]);
			return this;
		}

		var min = 0;
		var max = 1;
		var _obj = this;
		var _scenario = this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].layers;

		if(_scenario[this.options.view]){
			var min = 1e100;
			var max = -1e100;
			for(i in _scenario[this.options.view].values){
				v = _scenario[this.options.view].values[i][this.options.key];
				if(typeof v==="number"){
					min = Math.min(v,min);
					max = Math.max(v,max);
				}
			}
		}

		if(this.map){

			var gotlayers = true;

			for(var l = 0 ; l < this.views[this.options.view].layers.length; l++){

				layer = this.views[this.options.view].layers[l];

				if(typeof this.layers[layer.id].geojson==="string"){

					// Show the spinner
					S('#map .spinner').css({'display':''});
					S().ajax(path+this.layers[layer.id].geojson,{
						'this':this,
						'cache':false,
						'dataType':'json',
						'view': this.options.view,
						'id': layer.id,
						'complete': function(d,attr){
							console.info('Got '+attr.url);
							this.layers[attr.id].geojson = d;
							this.buildMap();
						},
						'error': function(e,attr){
							this.message('Unable to load '+attr.url.replace(/\?.*/,""),{'id':'error','type':'ERROR'});
						}
					});
					return this;
				}
				if(!this.layers[layer.id].geojson) gotlayers = false;

			}

			if(!gotlayers){
				return this;
			}else{
			
				this.message('',{'id':'warn','type':'WARNING'});

				_geojson = [];


				// Remove existing layers
				for(var l in this.layers){
					if(this.layers[l].layer){
						this.layers[l].layer.remove();
						delete this.layers[l].layer;
					}
				}

				// Make copies of variables we'll use inside functions
				//_scenario = this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].layers;


				// Re-build the layers for this view
				for(var l = 0; l < this.views[this.options.view].layers.length; l++){
					
					var highlightFeature = function(e){
						var layer = e.target;
						layer.setStyle({
							weight: 2,
							color: color,
							opacity: 1,
							stroke: true
						});
						if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
					}

					var resetHighlight = function(e){
						for(var l = 0; l < _geojson.length; l++) _geojson[l].resetStyle(e.target);
					}
					
					this.views[this.options.view].layers[l].geoattr = {
						"style": {
							"color": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.color||color : color),
							"opacity": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.opacity||1 : 1),
							"weight": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.strokeWidth||0.5 : 0.5),
							"fillOpacity": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.fillOpacity||0 : 0),
							"fillColor": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.fillColor||color : color)
						}
					};


					var _id = this.views[this.options.view].layers[l].id;

					if(this.views[this.options.view].layers[l].heatmap){

						var _l = l;
						this.views[this.options.view].layers[l].range = {'min':0,'max':1};
						view = this.views[this.options.view].layers[l].id;
						if(_scenario[view]){
							this.views[this.options.view].layers[l].range = {'min':1e100,'max':-1e100};
							for(i in _scenario[view].values){
								if(this.options.scale == "absolute"){
									// We have pre-calculated the range

									this.views[this.options.view].layers[l].range = this.data.scenarios[this.options.scenario].data[this.options.parameter][this.options.source].layers[view].fullrange;
								}else{
									v = _scenario[view].values[i][this.options.key];
									if(typeof v==="number"){
										this.views[this.options.view].layers[l].range.min = Math.min(v,this.views[this.options.view].layers[l].range.min);
										this.views[this.options.view].layers[l].range.max = Math.max(v,this.views[this.options.view].layers[l].range.max);
									}
								}
							}
						}
						
						// Get a nicer range
						this.views[this.options.view].layers[l].range = niceRange(this.views[this.options.view].layers[l].range.min,this.views[this.options.view].layers[l].range.max);
						if(!this.views[this.options.view].layers[l].colour){
							this.views[this.options.view].layers[l].colour = new Colours();
						}
						// Add/update a continuous colour scale
						this.views[this.options.view].layers[l].colourscale = 'DFES-continuous';
						this.views[this.options.view].layers[l].colour.addScale(this.views[this.options.view].layers[l].colourscale,getRGBAstr(color,0.0)+' 0%, '+getRGBAstr(color,0.8)+' 100%');
						if(typeof this.options.map.quantised==="number"){
							// Add/update a quantised colour scale
							this.views[this.options.view].layers[l].colour.quantiseScale(this.views[this.options.view].layers[l].colourscale,this.options.map.quantised,'DFES-quantised');
							this.views[this.options.view].layers[l].colourscale = 'DFES-quantised';
						}
							
						// Update the scale bar
						S('#scale').html(makeScaleBar(this.views[this.options.view].layers[l].colour.getGradient( this.views[this.options.view].layers[l].colourscale ),{
							'min': this.views[this.options.view].layers[l].range.min,
							'max': this.views[this.options.view].layers[l].range.max,
							'color': color,
							'units': this.parameters[this.options.parameter].units,
							'scale': this.views[this.options.view].layers[l].colour,
							'scaleid': this.views[this.options.view].layers[l].colourscale,
							'levels': (typeof this.options.map.quantised==="number" ? this.options.map.quantised : undefined)
						}));
						
						// Define the GeoJSON attributes for this layer
						this.views[this.options.view].layers[l].geoattr.style = function(feature){
							var layer = _obj.views[_obj.options.view].layers[_l];
							var props = {
								"opacity": 0.1,
								"fillOpacity": 0.8,
								"color": (layer.boundary ? layer.boundary.color||color : color),
								"fillColor": (layer.boundary ? layer.boundary.fillColor||color : color)
							};
							if(layer.boundary && typeof layer.boundary.stroke==="boolean") props.stroke = layer.boundary.stroke;
							if(feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon"){
								var c = {'r':0,'g':0,'b':0,'alpha':0};
								var data = _scenario[layer.id];
								var key = _obj.layers[layer.id].key;
								if(feature.properties[key] && data.values[feature.properties[key]]){
									c = layer.colour.getColourFromScale( layer.colourscale, data.values[feature.properties[key]][_obj.options.key],layer.range.min,layer.range.max,true);
								}else{
									console.warn('Unable to find '+key,feature.properties)
								}
								props.fillColor = 'rgb('+c.r+','+c.g+','+c.b+')';
								props.weight = (layer.boundary ? layer.boundary.strokeWidth||1 : 1);
								props.opacity = 0.1;
								props.fillOpacity = c.alpha;
							}
							return props;
						};

						this.views[this.options.view].layers[l].geoattr.onEachFeature = function(feature, layer){
							var popup = popuptext(feature,{'this':_obj,'layer':_l,'maxWidth': 'auto'});
							attr = {
								'mouseover':highlightFeature,
								'mouseout': resetHighlight
							}
							if(popup) layer.bindPopup('<div class="dfes-popup-content"><div class="dfes-popup-inner">'+popup+'</div></div>');
							layer.on(attr);
						}
					}

				}


				for(var l = 0; l < this.views[this.options.view].layers.length; l++){

					id = this.views[this.options.view].layers[l].id
					this.layers[id].layer = L.geoJSON(this.layers[id].geojson,this.views[this.options.view].layers[l].geoattr);
					_geojson.push(this.layers[id].layer);

					if(this.layers[id].layer){
						this.layers[id].layer.addTo(this.map);
						S('#map .spinner').css({'display':'none'});
					}
					this.layers[id].layer.setStyle(this.views[this.options.view].layers[l].geoattr.style);
				}
			}
		}
		

		function popuptext(feature,attr){
			// does this feature have a property named popupContent?
			var popup,me,view,key,v;
			popup = '';
			me = attr['this'];
			
			view = me.views[me.options.view].layers[attr.layer].id;
			if(!me.layers[view].key || !feature.properties[me.layers[view].key]){
				me.log('ERROR','No property '+me.layers[view].key+' in ',feature.properties);
				return "";
			}
			key = feature.properties[me.layers[view].key];
			v = null;
			if(me.data.scenarios[me.options.scenario].data[me.options.parameter][me.options.source].layers[view].values && me.data.scenarios[me.options.scenario].data[me.options.parameter][me.options.source].layers[view].values[key]){
				v = me.data.scenarios[me.options.scenario].data[me.options.parameter][me.options.source].layers[view].values[key][me.options.key];
			}
			if(typeof v!=="number"){
				console.warn('No value for '+key+' '+me.options.scenario+' '+me.options.parameter);
			}

			if(me.views[me.options.view].popup){
				if(typeof me.views[me.options.view].popup['text']==="string"){
					popup = me.views[me.options.view].popup['text'];
				}else if(typeof me.views[me.options.view].popup['text']==="function"){
					popup = me.views[me.options.view].popup['text'].call(me,{
						'view':view,
						'id':key,
						'key': (me.layers[view].key||""),
						'value': v,
						'properties':feature.properties,
						'scenario': me.data.scenarios[me.options.scenario],
						'parameter': me.parameters[me.options.parameter]
					});
				}
			}
			return popup;
		}
		
		// Trigger any event callback
		if(typeof this.events.buildMap==="function") this.events.buildMap.call(this);

		return this;

	}
	
	FES.prototype.log = function(){
		if(this.logging || arguments[0]=="ERROR"){
			var args = Array.prototype.slice.call(arguments, 0);
			if(console && typeof console.log==="function"){
				if(arguments[0] == "ERROR") console.error('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
				else if(arguments[0] == "WARNING") console.warn('%cFES%c: '+args[1],'font-weight:bold;','',(args.splice(2).length > 0 ? args.splice(2):""));
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

	function makeScaleBar(grad,attr){
		if(!attr) attr = {};
		if(!attr.min) attr.min = 0;
		if(!attr.max) attr.max = 0;
		if(!attr.units) attr.units = "";
		if(attr.units) attr.units = "&thinsp;"+attr.units;
		var str = '<div class="bar" style="'+grad+';"><div class="bar-inner" style="border-color: '+attr.color+'"></div></div><div class="range" style="border-color: '+attr.color+'">';
		if(attr.levels){
			var gap,i,v;
			gap = (attr.max-attr.min)/attr.levels;
			for(i = 0; i <= attr.levels; i++){
				v = attr.min + i*gap;
				c = attr.scale.getColourFromScale(attr.scaleid, v, attr.min, attr.max);
				str += '<span class="lvl'+(i==0 ? ' min' : (i==attr.levels ? ' max':''))+'" style="border-color: '+(i==0 ? attr.color : c)+';left:'+(100*i/attr.levels)+'%;">'+v.toLocaleString()+attr.units+'</span>'
			}
		}else{
				str += '<span class="lvl min" style="border-color: '+attr.color+';left:0%;">'+attr.min.toLocaleString()+attr.units+'</span>';
				str += '<span class="lvl max" style="border-color: '+attr.color+';left:100%;">'+attr.max.toLocaleString()+attr.units+'</span>';
		}
		str += '</div>';
		return str;
	}

	function getRGBAstr(c,a){
        a = (typeof a==="number" ? a : 1.0);
        var rgb = "rgba(0,0,0,1)";
        if(c.indexOf("rgb")==0) rgb = c.replace(/^rgba?\(([0-9]+),([0-9]+),([0-9]+),?([0-9\.]+)?\)$/,function(m,p1,p2,p3,p4){ return "rgba("+p1+","+p2+","+p3+","+p4+")"; });
        else if(c.indexOf('#')==0) rgb = "rgba("+parseInt(c.substr(1,2),16)+","+parseInt(c.substr(3,2),16)+","+parseInt(c.substr(5,2),16)+","+a+")";
        return rgb;
    }

	function niceRange(mn,mx){

		var dv,log10_dv,base,frac,options,distance,imin,tmin,i;
		n = 20;

		// Start off by finding the exact spacing
		dv = (mx - mn)/n;

		// In any given order of magnitude interval, we allow the spacing to be
		// 1, 2, 5, or 10 (since all divide 10 evenly). We start off by finding the
		// log of the spacing value, then splitting this into the integer and
		// fractional part (note that for negative values, we consider the base to
		// be the next value 'down' where down is more negative, so -3.6 would be
		// split into -4 and 0.4).
		log10_dv = Math.log10(dv);
		base = Math.floor(log10_dv);
		frac = log10_dv - base;

		// We now want to check whether frac falls closest to 1, 2, 5, or 10 (in log
		// space). There are more efficient ways of doing this but this is just for clarity.
		options = [1,2,5,10];
		distance = new Array(options.length);
		imin = -1;
		tmin = 1e100;
		for(i = 0; i < options.length; i++){
			distance[i] = Math.abs(frac - Math.log10(options[i]));
			if(distance[i] < tmin){
				tmin = distance[i];
				imin = i;
			}
		}

		// Now determine the actual spacing
		var inc = Math.pow(10,base) * options[imin];

		return {'min': Math.floor(mn/inc) * inc, 'max': Math.ceil(mx/inc) * inc};
	}

	root.FES = function(config){ return new FES(config); };
	

	/* ============== */
	/* Colours v0.3.2 */
	// Define colour routines
	function Colour(c,n){
		if(!c) return {};
		function d2h(d) { return ((d < 16) ? "0" : "")+d.toString(16);}
		function h2d(h) {return parseInt(h,16);}
		/**
		 * Converts an RGB color value to HSV. Conversion formula
		 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
		 * Assumes r, g, and b are contained in the set [0, 255] and
		 * returns h, s, and v in the set [0, 1].
		 *
		 * @param	Number  r		 The red color value
		 * @param	Number  g		 The green color value
		 * @param	Number  b		 The blue color value
		 * @return  Array			  The HSV representation
		 */
		function rgb2hsv(r, g, b){
			r = r/255;
			g = g/255;
			b = b/255;
			var max = Math.max(r, g, b), min = Math.min(r, g, b);
			var h, s, v = max;
			var d = max - min;
			s = max == 0 ? 0 : d / max;
			if(max == min) h = 0; // achromatic
			else{
				switch(max){
					case r: h = (g - b) / d + (g < b ? 6 : 0); break;
					case g: h = (b - r) / d + 2; break;
					case b: h = (r - g) / d + 4; break;
				}
				h /= 6;
			}
			return [h, s, v];
		}

		this.alpha = 1;

		// Let's deal with a variety of input
		if(c.indexOf('#')==0){
			this.hex = c;
			this.rgb = [h2d(c.substring(1,3)),h2d(c.substring(3,5)),h2d(c.substring(5,7))];
		}else if(c.indexOf('rgb')==0){
			var bits = c.match(/[0-9\.]+/g);
			if(bits.length == 4) this.alpha = parseFloat(bits[3]);
			this.rgb = [parseInt(bits[0]),parseInt(bits[1]),parseInt(bits[2])];
			this.hex = "#"+d2h(this.rgb[0])+d2h(this.rgb[1])+d2h(this.rgb[2]);
		}else return {};
		this.hsv = rgb2hsv(this.rgb[0],this.rgb[1],this.rgb[2]);
		this.name = (n || "Name");
		var r,sat;
		for(r = 0, sat = 0; r < this.rgb.length ; r++){
			if(this.rgb[r] > 200) sat++;
		}
		this.toString = function(){
			return 'rgb'+(this.alpha < 1 ? 'a':'')+'('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+(this.alpha < 1 ? ','+this.alpha:'')+')'
		}
		this.text = (this.rgb[0]*0.299 + this.rgb[1]*0.587 + this.rgb[2]*0.114 > 186 ? "black":"white");
		return this;
	}
	function Colours(){
		var scales = {
			'Viridis': 'rgb(68,1,84) 0%, rgb(72,35,116) 10%, rgb(64,67,135) 20%, rgb(52,94,141) 30%, rgb(41,120,142) 40%, rgb(32,143,140) 50%, rgb(34,167,132) 60%, rgb(66,190,113) 70%, rgb(121,209,81) 80%, rgb(186,222,39) 90%, rgb(253,231,36) 100%'
		};
		function col(a){
			if(typeof a==="string") return new Colour(a);
			else return a;
		}
		this.getColourPercent = function(pc,a,b,inParts){
			var c;
			pc /= 100;
			a = col(a);
			b = col(b);
			c = {'r':parseInt(a.rgb[0] + (b.rgb[0]-a.rgb[0])*pc),'g':parseInt(a.rgb[1] + (b.rgb[1]-a.rgb[1])*pc),'b':parseInt(a.rgb[2] + (b.rgb[2]-a.rgb[2])*pc)};
			if(a.alpha<1 || b.alpha<1) c.alpha = ((b.alpha-a.alpha)*pc + a.alpha);
			if(inParts) return c;
			else return 'rgb'+(c.alpha && c.alpha<1 ? 'a':'')+'('+c.r+','+c.g+','+c.b+(c.alpha && c.alpha<1 ? ','+c.alpha:'')+')';
		};
		this.makeGradient = function(a,b){
			a = col(a);
			b = col(b);
			var grad = a.toString()+' 0%, '+b.toString()+' 100%';
			if(b) return 'background: '+a.toString()+'; background: -moz-linear-gradient(left, '+grad+');background: -webkit-linear-gradient(left, '+grad+');background: linear-gradient(to right, '+grad+');';
			else return 'background: '+a.toString()+';';
		};
		this.getGradient = function(id){
			return 'background: -moz-linear-gradient(left, '+scales[id].str+');background: -webkit-linear-gradient(left, '+scales[id].str+');background: linear-gradient(to right, '+scales[id].str+');';
		};
		this.addScale = function(id,str){
			scales[id] = str;
			processScale(id,str);
			return this;
		}
		this.quantiseScale = function(id,n,id2){
			var cs,m,pc,step,i;
			cs = [];
			m = n-1;
			pc = 0;
			step = 100/n;
			for(i = 0; i < m; i++){
				cs.push(this.getColourFromScale(id,i,0,m)+' '+(pc)+'%');
				cs.push(this.getColourFromScale(id,i,0,m)+' '+(pc+step)+'%');
				pc += step;
			}
			cs.push(this.getColourFromScale(id,1,0,1)+' '+(pc)+'%');
			cs.push(this.getColourFromScale(id,1,0,1)+' 100%');
			this.addScale(id2,cs.join(", "));
			return this;
		}
		function processScale(id,str){
			if(scales[id] && scales[id].str){
				console.warn('Colour scale '+id+' already exists. Bailing out.');
				return this;
			}
			scales[id] = {'str':str};
			scales[id].stops = extractColours(str);
			return this;
		}
		function extractColours(str){
			var stops,cs,i,c;
			stops = str.replace(/^\s+/g,"").replace(/\s+$/g,"").replace(/\s\s/g," ").split(', ');
			cs = [];
			for(i = 0; i < stops.length; i++){
				var bits = stops[i].split(/ /);
				if(bits.length==2) cs.push({'v':bits[1],'c':new Colour(bits[0])});
				else if(bits.length==1) cs.push({'c':new Colour(bits[0])});
			}
			
			for(c=0; c < cs.length;c++){
				if(cs[c].v){
					// If a colour-stop has a percentage value provided, 
					if(cs[c].v.indexOf('%')>=0) cs[c].aspercent = true;
					cs[c].v = parseFloat(cs[c].v);
				}
			}
			return cs;
		}

		// Process existing scales
		for(var id in scales){
			if(scales[id]) processScale(id,scales[id]);
		}
		
		// Return a Colour object for a string
		this.getColour = function(str){
			return new Colour(str);
		};
		// Return the colour scale string
		this.getColourScale = function(id){
			return scales[id].str;
		};
		// Return the colour string for this scale, value and min/max
		this.getColourFromScale = function(s,v,min,max,inParts){
			var cs,v2,pc,c,cfinal;
			var colour = "";
			if(typeof inParts!=="boolean") inParts = false;
			if(!scales[s]){
				console.warn('No colour scale '+s+' exists');
				return '';
			}
			if(typeof min!=="number") min = 0;
			if(typeof max!=="number") max = 1;
			cs = scales[s].stops;
			v2 = 100*(v-min)/(max-min);
			var match = -1;
			cfinal = {};
			if(v==max){
				cfinal = {'r':cs[cs.length-1].c.rgb[0],'g':cs[cs.length-1].c.rgb[1],'b':cs[cs.length-1].c.rgb[2],'alpha':cs[cs.length-1].c.alpha};
			}else{
				if(cs.length == 1){
					cfinal = {'r':cs[0].c.rgb[0],'g':cs[0].c.rgb[1],'b':cs[0].c.rgb[2],'alpha':(v2/100).toFixed(3)};
				}else{
					for(c = 0; c < cs.length-1; c++){
						if(v2 >= cs[c].v && v2 <= cs[c+1].v){
							// On this colour stop
							pc = 100*(v2 - cs[c].v)/(cs[c+1].v-cs[c].v);
							if(pc > 100) pc = 100;	// Don't go above colour range
							cfinal = this.getColourPercent(pc,cs[c].c,cs[c+1].c,true);
							continue;
						}
					}
				}
			}
			if(inParts) return cfinal;
			else return 'rgba(' + cfinal.r + ',' + cfinal.g + ',' + cfinal.b + ',' + cfinal.alpha + ")";
		};
		
		return this;
	}

})(window || this);