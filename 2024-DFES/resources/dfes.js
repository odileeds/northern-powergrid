/*!
	Open Innovations Future Energy Scenario viewer
	Changeset:
	1.6.0
	- Remove stuquery dependency
	- There is now a "processData" event so that we can reshape an API return
	1.5.8
	- Can set different map tiles/labels with on.initMap
	1.5.7
	- Send name key to popup
	1.5.6
	- Add error message when missing mapping
	1.5.5
	- Check if drop-downs already exist in DOM
	1.5.4
	- Bug fix for CSV columns with quotation marks
	1.5.3
	- Improve large pips to deal with not including 2020
	1.5.2
	- Allow values in files to be scaled on load
	- Fix minor pips on year slider
	- Add callback for setScale
	1.5.1
	- If the initial parameter key in the config is set to one that doesn't exist we need to fail nicely with an error message.
	1.5.0
	- scenario and parameter config is now in an array (rather than an object) to make sure order is preserved
 */
(function(root){

	var OI = root.OI || {};
	if(!OI.ready){
		OI.ready = function(fn){
			// Version 1.1
			if(document.readyState != 'loading') fn();
			else document.addEventListener('DOMContentLoaded', fn);
		};
	}
	
	var scripts = document.getElementsByTagName('script');
	var path = "";
	for(var i = 0; i < scripts.length; i++){
		if(scripts[i].src.indexOf('dfes.js')>=0) path = scripts[i].src.split('?')[0];	// remove any ?query
	}
	path = path.split('/').slice(0, -2).join('/')+'/';  // remove last filename part of path

	// Main function
	function FES(config){

		this.version = "1.6.0";
		this.title = "FES";
		if(!config) config = {};
		this.options = (config.options||{});
		this.parameters = {};
		this.data = { };
		this.logging = (location.search.indexOf('debug=true') >= 0);
		this.log = function(){
			var a,ext;
			// Version 1.1.1
			if(this.logging || arguments[0]=="ERROR" || arguments[0]=="WARNING" || arguments[0]=="INFO"){
				a = Array.prototype.slice.call(arguments, 0);
				// Build basic result
				ext = ['%c'+this.title+' '+this.version+'%c: '+a[1],'font-weight:bold;',''];
				// If there are extra parameters passed we add them
				if(a.length > 2) ext = ext.concat(a.splice(2));
				if(console && typeof console.log==="function"){
					if(arguments[0] == "ERROR") console.error.apply(null,ext);
					else if(arguments[0] == "WARNING") console.warn.apply(null,ext);
					else if(arguments[0] == "INFO") console.info.apply(null,ext);
					else console.log.apply(null,ext);
				}
			}
			return this;
		};
		this.layers = (config.layers||{});
		this.views = (config.views||{});
		this.mapping = (config.mapping||{});
		this.events = {};
		if(config.on) this.events = config.on;
		if(!this.options.files) this.options.files = {};
		if(!this.options.files.parameters) this.options.files.parameters = path+"data/scenarios/config.json";
		if(!this.options.files.scenarios) this.options.files.scenarios = path+"data/scenarios/index.json";

		this.fetch(this.options.files.parameters,{
			'type':'json',
			'callback': function(d){
				if(d.length){
					this.parameters = {};
					// New style (1.5.0) config is an array to preserve order - convert into object
					for(var i = 0; i < d.length; i++){
						if(d[i].key) this.parameters[d[i].key] = d[i];
					}
				}else this.parameters = d;

				this.fetch(this.options.files.scenarios,{
					'type':'json',
					'callback': function(d){
						this.log('MSG','Got '+this.options.files.scenarios);
						if(d.length){
							this.data.scenarios = {};
							// New style (1.5.0) config is an array to preserve order - convert into object
							for(var i = 0; i < d.length; i++){
								if(d[i].key) this.data.scenarios[d[i].key] = d[i];
							}
						}else this.data.scenarios = d;
						this.init();
					},
					'error':'Unable to load scenarios from '
				});
			},
			'error': 'Unable to load parameters from '
		});

		return this;
	}

	FES.prototype.init = function(){
		var html,s,i,j,l,p,css,g,gorder,groups;
		if(this.options.scale=="absolute"){
			document.querySelector('#scale-holder input').setAttribute('checked','checked');
			document.getElementById('scale-holder').classList.add('checked');
		}

		// Update scenarios drop-down
		if(this.data.scenarios){
			if(!document.getElementById('scenarios')) document.getElementById('scenario-holder').innerHTML = '<select id="scenarios"></select>';
			html = "";
			for(s in this.data.scenarios) html += "<option"+(this.options.scenario == s ? " selected=\"selected\"":"")+" class=\"b1-bg\" value=\""+s+"\">"+s+"</option>";	//  class=\""+this.options.scenarios[s].css+"\"
			document.getElementById('scenarios').innerHTML = html;
			addEv('change',document.getElementById('scenarios'),{'me':this},function(e){
				e.preventDefault();
				e.data.me.setScenario(e.currentTarget.value);
			});
		}

		// Update view drop-down
		if(this.views){
			if(!document.getElementById('view')) document.getElementById('view-holder').innerHTML = '<select id="views">'+html+'</select>';
			html = "";
			for(l in this.views){
				if(!this.views[l].inactive) html += "<option"+(this.options.view == l ? " selected=\"selected\"":"")+" value=\""+l+"\">"+this.views[l].title+"</option>";
			}
			document.getElementById('views').innerHTML = html;
			addEv('change',document.getElementById('views'),{'me':this},function(e){
				e.preventDefault();
				e.data.me.setView(e.currentTarget.value);
			});
		}

		// Update parameters drop-down
		if(this.parameters){
			if(!document.getElementById('parameters')) document.getElementById('parameter-holder').innerHTML = '<select id="parameters">'+html+'</select>';
			html = "";
			if(!this.data.scenarios[this.options.scenario]) this.message('Scenario <em>"'+this.options.scenario+'"</em> is not defined in index.json.',{'id':'scenario','type':'ERROR'});
			css = this.data.scenarios[this.options.scenario].css;
			gorder = [];
			groups = {};
			for(p in this.parameters){
				g = this.parameters[p].optgroup||"all";
				if(!groups[g]){
					groups[g] = [];
					gorder.push(g);
				}
				groups[g].push(p);
			}
			for(i = 0; i < gorder.length; i++){
				g = gorder[i];
				if(g != "all") html += '<optgroup label="'+g+'">';
				for(j = 0; j < groups[g].length; j++){
					p = groups[g][j];
					html += "<option"+(this.options.parameter == p ? " selected=\"selected\"":"")+" value=\""+p+"\">"+this.parameters[p].title+"</option>";
				}
				if(g != "all") html += '</optgroup>';
			}
			if(!this.parameters[this.options.parameter]){
				this.message('No parameter '+this.options.parameter+' exists. Sorry.',{'id':'parameter','type':'ERROR'});
			}
			document.getElementById('parameters').innerHTML = html;
			// Add about section after
			var about = document.createElement('div');
			about.setAttribute('class','about '+css);
			about.innerHTML = this.parameters[this.options.parameter] ? (this.parameters[this.options.parameter].description||'') : '';
			document.getElementById('parameter-holder').appendChild(about);
			addEv('change',document.getElementById('parameters'),{'me':this},function(e){
				e.preventDefault();
				e.data.me.setParameter(e.currentTarget.value);
			});
		}

		// Add events to toggle switch
		addEv('change',document.querySelector('#scale-holder input'),{me:this},function(e){
			e.preventDefault();
			e.data.me.setScale(e.currentTarget.checked);
		});
		addEv('click',document.querySelector('#scale-holder .switch'),{me:this},function(e){
			var el = document.querySelector('#scale-holder input');
			el.checked = !el.checked;
			e.data.me.setScale(el.checked);
		});

		// Create the slider
		this.slider = document.getElementById('slider');
		var pips = [];
		var dy = 10;
		for(var i = Math.ceil(this.options.years.min/10)*10; i <= this.options.years.max; i += dy) pips.push(i);
		noUiSlider.create(this.slider, {
			start: [parseInt(this.options.key)],
			step: 1,
			snap: true,
			connect: true,
			range: this.options.years,
			pips: {
				mode: 'values',
				stepped: true,
				values: pips,
				density: 100/(2050-2020)
			}
		});
		var _obj = this;
		// Bind the changing function to the update event.
		this.slider.noUiSlider.on('update',function(){ _obj.setYear(''+parseInt(this.get())); });

		this.setScenario(this.options.scenario);

		// Trigger the setParameter callback (because we aren't explicity calling it)
		if(typeof this.events.setParameter==="function") this.events.setParameter.call(this);

		// Trigger the setScale callback (because we aren't explicity calling it)
		if(typeof this.events.setScale==="function") this.events.setScale.call(this,this.options.scale);

		addEv('click',document.getElementById('play'),{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			e.data.me.startAnimate();
		});

		addEv('click',document.getElementById('pause'),{me:this},function(e){
			e.preventDefault();
			e.stopPropagation();
			e.data.me.stopAnimate();
		});

		return this;
	};

	FES.prototype.startAnimate = function(){
		//this.slider.noUiSlider.set(this.options.years.min);
		document.getElementById('play').disabled = true;
		document.getElementById('pause').disabled = false;
		var _obj = this;
		// If we are starting at the end, reset first
		if(parseInt(this.slider.noUiSlider.get())==this.options.years.max) this.slider.noUiSlider.set(this.options.years.min);
		this.options.years.interval = setInterval(function(){
			var yy = parseInt(_obj.slider.noUiSlider.get()) + 1;
			if(yy <= _obj.options.years.max) _obj.slider.noUiSlider.set(yy);
			else _obj.stopAnimate();
		},500);
		return this;
	};

	FES.prototype.stopAnimate = function(){
		clearInterval(this.options.years.interval);
		document.getElementById('play').disabled = false;
		document.getElementById('pause').disabled = true;

		return this;
	};

	FES.prototype.loadData = function(callback){
		var url = this.data.scenarios[this.options.scenario].data[this.options.parameter].file;
		if(!url.match(/^https/)) url = path+"data/scenarios/"+this.data.scenarios[this.options.scenario].data[this.options.parameter].file;
		this.log('INFO','Getting data from %c'+url.replace(/\%/g,'\\%')+'%c','font-style:italic;','')
		this.fetch(url,{
			'type':'text',
			'callback': function(d){
				this.log('MSG','Got '+url);
				this.loadedData(d,this.options.scenario,this.options.parameter,callback,url);
			},
			'error':'Unable to load data from '
		});
	};
	
	FES.prototype.setScenarioColours = function(scenario){
		var css = this.data.scenarios[scenario].css;
		var classes = [];
		for(var id in this.data.scenarios) classes.push(this.data.scenarios[id].css);
		if(!document.querySelector('#scenario-holder .about')) appendHTML(document.getElementById('scenario-holder'),'<div class="about"></div>');
		var el = document.querySelector('#scenario-holder .about');
		el.classList.remove(...classes);
		el.classList.add(css); 
		el.innerHTML = (this.data.scenarios[scenario].description||'');
		el = document.querySelector('#parameter-holder .about');
		el.innerHTML = (this.parameters[this.options.parameter] ? (this.parameters[this.options.parameter].description||'') : '');
		el.classList.remove(...classes);
		el.classList.add(css);

		for(var s in this.data.scenarios){
			document.getElementById('scenarios').classList.remove(this.data.scenarios[s].css);
			document.querySelectorAll('.scenario').forEach((i)=>{ i.classList.remove(this.data.scenarios[s].css); });
		}
		document.getElementById('scenarios').classList.add(css);
		document.querySelectorAll('.scenario').forEach((i)=>{ i.classList.add(css); });
		document.querySelectorAll('.noUi-connect').forEach((i)=>{ i.classList.add(css); });
		return this;
	};

	FES.prototype.setScenario = function(scenario){
		this.log('MSG','setScenario');

		// Set the scenario
		this.options.scenario = scenario;

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});

		// Update the CSS class
		this.setScenarioColours(scenario);

		if(!this.data.scenarios[scenario].data[this.options.parameter]){
			this.message('We have no data for '+this.parameters[this.options.parameter].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
		}else{
			this.message('',{'id':'error','type':'ERROR'});
			if(!this.data.scenarios[this.options.scenario].data[this.options.parameter].raw){
				this.loadData(function(){
					// Map the data
					this.mapData();
					this.updateSlider();
				});
			}else{
				this.message('',{'id':'error'});
				// Map the data
				this.mapData();
				this.updateSlider();
			}
		}
		
		// Trigger any event callback
		if(typeof this.events.setScenario==="function") this.events.setScenario.call(this);

		return this;
	};

	FES.prototype.setView = function(v){
		this.log('MSG','setView');

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});

		if(this.views[v]){
			this.options.view = v;
			this.mapData();
		}else{
			this.message('The view '+v+' does not exist!',{'id':'error','type':'ERROR'});
		}
		return this;
	};

	FES.prototype.setParameter = function(v){
		this.log('MSG','setParameter',v);

		// Clear messages
		this.message('',{'id':'warn','type':'WARNING'});
		this.message('',{'id':'error','type':'ERROR'});
		
		if(this.parameters[v]){
			this.options.parameter = v;
			this.message('',{'id':'error','type':'ERROR'});
			
			document.querySelector('#parameter-holder .about').innerHTML = (this.parameters[this.options.parameter].description||'');

			// Have we loaded the parameter/scenario?
			if(!this.data.scenarios[this.options.scenario]) this.message('We have no data for '+this.parameters[v].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
			else{
				if(!this.data.scenarios[this.options.scenario].data[this.options.parameter]){
					this.message('We have no data for '+this.parameters[v].title+' under '+this.options.scenario,{'id':'error','type':'ERROR'});
				}else{
					// We don't have the raw data for this scenario/parameter
					if(!this.data.scenarios[this.options.scenario].data[this.options.parameter].raw){
						// Load the scenario data
						this.loadData(function(){
							// Map the data
							this.mapData();
							this.updateSlider();
						});
					}else{
						// Map the data
						this.mapData();
						this.updateSlider();
					}
				}
			}
		}

		// Trigger any event callback
		if(typeof this.events.setParameter==="function") this.events.setParameter.call(this);

		return this;
	};
	
	FES.prototype.updateSlider = function(){
		this.log('MSG','updateSlider');

		var min,max,y,k,range,years;
		range = clone(this.options.years);

		// Find possible years
		if(this.data.scenarios[this.options.scenario].data[this.options.parameter].raw){
			years = clone(this.data.scenarios[this.options.scenario].data[this.options.parameter].raw.header);

			// Remove first column
			years.shift();
			min = this.options.years.min;
			max = this.options.years.max;
			for(y = 0; y < years.length; y++){
				k = 100*(years[y]-min)/(max-min);
				if(k >= 0){
					range[Math.round(k)+'%'] = years[y];
				}
			}
		}
		// Update the slider range and position
		this.slider.noUiSlider.updateOptions({range:range,start:this.options.key});
		return this;
	};
	
	FES.prototype.setScale = function(checked){
		this.log('MSG','setScale',checked);
		this.options.scale = (checked ? "absolute":"relative");
		if(checked) document.getElementById('scale-holder').classList.add('checked');
		else document.getElementById('scale-holder').classList.remove('checked');
		this.mapData();
		if(typeof this.events.setScale==="function") this.events.setScale.call(this,this.options.scale);
		return this;
	};

	FES.prototype.setYear = function(y){
		this.log('MSG','setYear',y);
		if(this.map){
			this.options.key = y;
			this.mapData();
		}
		document.querySelectorAll('.year').forEach((el)=>{ el.innerHTML = y; });
		return this;
	};

	FES.prototype.mapData = function(){
		this.log('MSG','mapData');

		var s,p,v,data,l,id,a,key,val,pkey,min,max,d,r,c;
		s = this.options.scenario;
		p = this.options.parameter;
		v = this.options.view;
		data = this.data.scenarios[s].data[p];

		// Check we have the raw data
		if(!data.raw){
			this.log('ERROR','No raw data available for '+s+'/'+p+'');
			return this;
		}
		// Check we have columns
		if(typeof data.col==="undefined"){
			this.log('ERROR','No columns in the data',data);
			return this;
		}

		// Have we defined the layers object?
		if(!data.layers) data.layers = {};

		id = "";
		// We need to loop over the view's layers
		for(l = 0; l < this.views[v].layers.length; l++){
			// If this is a heatmap layer we need mapping
			if(this.views[v].layers[l].heatmap) id = this.views[v].layers[l].id;
		}
		
		if(!id){
			this.log('ERROR','No heatmap defined for '+v);
			return this;
		}
		
		
		if(!data.layers[v]){
			// Have we loaded the code mapping for this view's 
			if(!this.mapping[data.dataBy][id]){
				this.message('Unable to load mapping from <em>'+data.dataBy+'</em> to <em>'+id+'</em>',{'id':'error','type':'ERROR'});
				return this;
			}
			if(!this.mapping[data.dataBy][id].data && typeof this.mapping[data.dataBy][id].file==="string"){
				// Load from JSON file
				var url = path+this.mapping[data.dataBy][id].file;
				this.fetch(url,{
					'type':'json',
					'callback': function(d){
						this.log('MSG','Got '+url);
						this.mapping[data.dataBy][id].raw = d;
						if(typeof this.mapping[data.dataBy][id].process==="function") d = this.mapping[data.dataBy][id].process.call(this,d);
						this.mapping[data.dataBy][id].data = d;
						this.mapData();
					},
					'error': 'Unable to load '
				});

				return this;
			}else{
				
				// v = the view type
				if(!data.layers[v]){
					// Default with no mapping needed
					data.layers[v] = {'values':{},'fullrange':{},'processing':{}};

					min = 1e100;
					max = -1e100;
					
					// Get the data source (which may be different to the one we loaded)
					d = this.data.scenarios[s].data[p];

					// Loop over data rows
					for(r = 0; r < d.raw.rows.length; r++){

						// The primary key e.g. an LSOA11CD
						pkey = d.raw.rows[r][data.col];

						if(this.mapping[data.dataBy][id].data){
							if(this.mapping[data.dataBy][id].data[pkey]){
								for(a in this.mapping[data.dataBy][id].data[pkey]){
									if(!data.layers[v].values[a]) data.layers[v].values[a] = {};
									if(!data.layers[v].processing[a]) data.layers[v].processing[a] = {};
									for(c = 0; c < d.raw.header.length; c++){
										// Set values to zero
										key = d.raw.header[c];
										// The column seems to be a year
										if(c != data.col && parseInt(key)==key && !data.layers[v].values[a][key]){
											data.layers[v].values[a][key] = 0;
											data.layers[v].processing[a][key] = [];
										}
									}
								}
							}else{
								this.log('WARNING','No mapping',id,pkey);
							}
						}else{
							if(!data.layers[v].values[pkey]) data.layers[v].values[pkey] = {};
						}
					}
					for(r = 0; r < d.raw.rows.length; r++){

						// The primary key e.g. an LSOA11CD
						pkey = d.raw.rows[r][data.col];

						// Loop over columns in the raw data
						for(c = 0; c < d.raw.header.length; c++){
							// Check if the column seems to be a year (the int version should match the label)
							if(c != data.col && parseInt(d.raw.header[c])==d.raw.header[c]){

								if(d.raw.rows[r][c]=="") d.raw.rows[r][c] = 0;

								val = d.raw.rows[r][c];
								key = d.raw.header[c]+"";

								if(this.mapping[data.dataBy][id].data){
									if(this.mapping[data.dataBy][id].data[pkey]){
										// We need to add a processing step to include everything that makes up this area
										for(a in this.mapping[data.dataBy][id].data[pkey]){
											data.layers[v].processing[a][key].push({'v':val,'src':pkey,'f':this.mapping[data.dataBy][id].data[pkey][a]});
										}
									}
								}else{
									// If this layer uses the current source as "data" we can skip the processing step
									data.layers[v].values[pkey][key] = (typeof val==="number") ? val : d.raw.rows[r][c];
								}
							}
						}

					}
					// If we need to do processing
					for(a in data.layers[v].processing){
						for(key in data.layers[v].processing[a]){
							val = 0;
							if(this.parameters[p]){
								for(i = 0; i < data.layers[v].processing[a][key].length; i++){
									if(this.parameters[p].combine=="sum" || this.parameters[p].combine=="average"){
										// Find the fractional contribution
										val += data.layers[v].processing[a][key][i].v*data.layers[v].processing[a][key][i].f;
									}else if(this.parameters[p].combine=="max"){
										// Find the maximum of any contribution
										val = Math.max(val,data.layers[v].processing[a][key][i].v);
									}
								}
								if(this.parameters[p].combine=="average"){
									val /= data.layers[v].processing[a][key].length;
								}
							}
							data.layers[v].values[a][key] = val;
						}
					}
				}else{
					this.log('MSG','Already processed '+v+' '+id);
				}

				// Find minimum and maximum values
				for(pkey in data.layers[v].values){
					for(key in data.layers[v].values[pkey]){
						if(!isNaN(data.layers[v].values[pkey][key])){
							min = Math.min(min,data.layers[v].values[pkey][key]);
							max = Math.max(max,data.layers[v].values[pkey][key]);
						}else{
							// Ignore fields that aren't years
						}
					}
				}

				data.layers[v].fullrange = {'min':min,'max':max};
			}
		}


		// Save the result
		this.data.scenarios[s].data[p] = data;

		// Update the map
		this.buildMap();
		return this;
	};

	FES.prototype.loadedData = function(d,scenario,parameter,callback,url){

		var r,c,data,i,col,n;
		data = this.data.scenarios[scenario].data[parameter];

		if(!data.dataBy){
			this.log('ERROR','No dataBy property set for '+scenario+' '+parameter);
			return this;
		}
		if(!data.key){
			this.log('ERROR','No key provided for '+scenario+' '+parameter+' '+data.dataBy);
			return this;
		}
		if(!data.layers) data.layers = {};
		if(!data.raw){

			// Trigger any event callback
			if(typeof this.events.processData==="function") data = this.events.processData.call(this,data,d,url);

			// If we haven't set the raw value we'll assume that this is a CSV to be processed
			if(!data.raw){
				this.log('MSG','Falling back to processing CSV.');
				data.raw = CSV2JSON(d,1);

				// Find the column number for the column containing the name
				// And convert year headings to integers
				col = -1;
				for(c = 0; c < data.raw.header.length; c++){
					n = data.raw.header[c];
					if(parseFloat(n) == n) data.raw.header[c] = parseInt(n);
					if(data.raw.header[c] == data.key) col = c;
					if(parseInt(data.raw.header[c])==data.raw.header[c]){
						for(r = 0; r < data.raw.rows.length; r++){
							// Convert to numbers - if the number doesn't parse replace with zero
							data.raw.rows[r][c] = (parseFloat(data.raw.rows[r][c])||0);
							if(typeof this.parameters[parameter].scaleValuesBy==="number") data.raw.rows[r][c] *= this.parameters[parameter].scaleValuesBy;
						}
					}
				}
				if(col >= 0) data.col = col;
			}
		}

		// Set the data
		this.data.scenarios[scenario].data[parameter] = data;

		if(typeof callback==="function") callback.call(this);

		return this;
	};

	FES.prototype.buildMap = function(){
		this.log('MSG','buildMap');

		var _obj,i,mapel,mapid,info,color,ncolor,min,max,v,l,_id,_l,lid,view,bounds;
		bounds = L.latLngBounds(L.latLng(56.01680,2.35107),L.latLng(52.6497,-5.5151));
		if(this.options.map && this.options.map.bounds) bounds = L.latLngBounds(L.latLng(this.options.map.bounds[0][0],this.options.map.bounds[0][1]),L.latLng(this.options.map.bounds[1][0],this.options.map.bounds[1][1]));

		_obj = this;
		if(!this.map){
			mapel = document.getElementById('map');
			mapid = mapel.getAttribute('id');
			this.map = L.map(mapid,{'scrollWheelZoom':true}).fitBounds(bounds);
			this.map.on('popupopen',function(e){
				// Call any attached functions
				if(_obj.views[_obj.options.view].popup && _obj.views[_obj.options.view].popup.open){
					var l,i;
					l = -1;
					for(i = 0; i < _obj.views[_obj.options.view].layers.length; i++){
						if(_obj.views[_obj.options.view].layers[i].heatmap) l = i;
					}
					if(l>=0) _obj.views[_obj.options.view].popup.open.call(_obj,{'el':e.popup._contentNode,'id':e.popup._source.feature.properties[_obj.layers[_obj.views[_obj.options.view].layers[l].id].key]});
				}
			});
			this.map.attributionControl._attributions = {};
			if(this.options.map && this.options.map.attribution) this.map.attributionControl.setPrefix('').addAttribution(this.options.map.attribution);

			if(typeof this.events.initMap==="function") this.events.initMap.call(this);
			else{
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
			}
				
			info = L.control({'position':'topright'});
			info.onAdd = function(map){
				this._div = L.DomUtil.create('div','scenario');
				this._div.innerHTML = '<div class="year padded">'+_obj.options.key+'</div>';
				return this._div;
			};
			info.addTo(this.map);
			this.setScenarioColours(this.options.scenario);
			
		}

		color = (this.data.scenarios[this.options.scenario].color||"#000000");
		ncolor = (this.data.scenarios[this.options.scenario].negativecolor||"#404040");

		if(!this.data.scenarios[this.options.scenario].data[this.options.parameter].raw){
			this.log('ERROR','Scenario '+this.options.scenario+' not loaded',this.data.scenarios[this.options.scenario].data[this.options.parameter]);
			return this;
		}

		min = 0;
		max = 1;
		var _scenario = this.data.scenarios[this.options.scenario].data[this.options.parameter].layers;

		if(_scenario[this.options.view]){
			min = 1e100;
			max = -1e100;
			for(i in _scenario[this.options.view].values){
				v = _scenario[this.options.view].values[i][this.options.key];
				if(typeof v==="number"){
					min = Math.min(v,min);
					max = Math.max(v,max);
				}
			}
		}

		var layer,_geojson,gotlayers,id;

		if(this.map){

			gotlayers = true;

			for(l = 0 ; l < this.views[this.options.view].layers.length; l++){

				layer = this.views[this.options.view].layers[l];

				if(typeof this.layers[layer.id].geojson==="string"){

					// Show the spinner
					document.querySelector('#map .spinner').style.display = '';
					var url = path+this.layers[layer.id].geojson;
					
					this.fetch(url,{
						'type':'json',
						'callback':function(d){
							this.log('MSG','Got '+url);
							this.layers[layer.id].geojson = d;
							this.buildMap();
						},
						'error':'Unable to load GeoJSON '
					});
					return this;
				}
				if(!this.layers[layer.id].geojson) gotlayers = false;

			}

			if(!gotlayers) return this;
			else{
			
				this.message('',{'id':'warn','type':'WARNING'});

				_geojson = [];
				
				var highlightFeature = function(e){
					var layer = e.target;
					layer.setStyle({
						weight: 2,
						color: color,
						opacity: 1,
						stroke: true
					});
					if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) layer.bringToFront();
				};
				var resetHighlight = function(e){
					// Reset all the layer styles
					for(var l = 0; l < _geojson.length; l++) _geojson[l].resetStyle(e.target);
				};

				// Remove existing layers
				for(l in this.layers){
					if(this.layers[l].layer){
						this.layers[l].layer.remove();
						delete this.layers[l].layer;
					}
				}

				// Re-build the layers for this view
				for(l = 0; l < this.views[this.options.view].layers.length; l++){
					this.views[this.options.view].layers[l].geoattr = {
						"style": {
							"color": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.color||color : color),
							"opacity": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.opacity||1 : 1),
							"weight": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.strokeWidth||0.5 : 0.5),
							"fillOpacity": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.fillOpacity||0 : 0),
							"fillColor": (this.views[this.options.view].layers[l].boundary ? this.views[this.options.view].layers[l].boundary.fillColor||color : color)
						}
					};

					_id = this.views[this.options.view].layers[l].id;

					if(this.views[this.options.view].layers[l].heatmap){

						_l = l;
						this.views[this.options.view].layers[l].range = {'min':0,'max':1};
						lid = this.views[this.options.view].layers[l].id;
						view = this.options.view;
						if(_scenario[view]){
							this.views[view].layers[l].range = {'min':1e100,'max':-1e100};
							for(i in _scenario[view].values){
								if(this.options.scale == "absolute"){
									// We have pre-calculated the range

									this.views[view].layers[l].range = this.data.scenarios[this.options.scenario].data[this.options.parameter].layers[view].fullrange;
								}else{
									v = _scenario[view].values[i][this.options.key];
									if(typeof v==="number"){
										this.views[view].layers[l].range.min = Math.min(v,this.views[view].layers[l].range.min);
										this.views[view].layers[l].range.max = Math.max(v,this.views[view].layers[l].range.max);
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

						// If the colourscale for this parameter is diverging we change the scale
						if(this.parameters[this.options.parameter] && this.parameters[this.options.parameter].diverging){
							// Set a text label (not used anywhere yet)
							this.views[this.options.view].layers[l].colourscale = 'DFES-diverging';
							// Set the colour stops from ncolour (opacity 1) to white (opacity 0) to colour (opacity 1)
							this.views[this.options.view].layers[l].colour.addScale(this.views[this.options.view].layers[l].colourscale,getRGBAstr(ncolor,1)+' 0%, rgba(255,255,255,0) 50%, '+getRGBAstr(color,0.8)+' 100%');
							// Update the range to be the same amount either side of zero
							this.views[this.options.view].layers[l].range.max = Math.max(Math.abs(this.views[this.options.view].layers[l].range.min),Math.abs(this.views[this.options.view].layers[l].range.max));
							this.views[this.options.view].layers[l].range.min = -this.views[this.options.view].layers[l].range.max;
						}

						// If the map scale needs to be quantised we now quantise the colour scale
						if(typeof this.options.map.quantised==="number"){
							this.views[this.options.view].layers[l].colour.quantiseScale(this.views[this.options.view].layers[l].colourscale,this.options.map.quantised,'DFES-quantised');
							this.views[this.options.view].layers[l].colourscale = 'DFES-quantised';
						}
							
						// Update the scale bar
						document.getElementById('scale').innerHTML = this.makeScaleBar(this.views[this.options.view].layers[l].colour.getGradient( this.views[this.options.view].layers[l].colourscale ),{
							'min': this.views[this.options.view].layers[l].range.min,
							'max': this.views[this.options.view].layers[l].range.max,
							'color': color,
							'scale': this.views[this.options.view].layers[l].colour,
							'scaleid': this.views[this.options.view].layers[l].colourscale,
							'levels': (typeof this.options.map.quantised==="number" ? this.options.map.quantised : undefined)
						});

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
								var c,key,data;
								c = {'r':0,'g':0,'b':0,'alpha':0};
								data = _scenario[_obj.options.view];
								key = _obj.layers[layer.id].key;
								if(feature.properties[key] && data.values[feature.properties[key]] && !isNaN(layer.range.min) && !isNaN(layer.range.max)){
									c = layer.colour.getColourFromScale(layer.colourscale, data.values[feature.properties[key]][_obj.options.key],layer.range.min,layer.range.max,true);
								}
								props.fillColor = 'rgb('+c.r+','+c.g+','+c.b+')';
								props.weight = (layer.boundary ? layer.boundary.strokeWidth||1 : 1);
								props.opacity = 0.1;
								props.fillOpacity = c.alpha;
							}
							return props;
						};

						this.views[this.options.view].layers[l].geoattr.onEachFeature = function(feature,l){
							var popup = popuptext(feature,{'this':_obj,'layer':_l,'maxWidth': 'auto'});
							var attr = {
								'mouseover':highlightFeature,
								'mouseout': resetHighlight
							};
							if(popup) l.bindPopup('<div class="dfes-popup-content"><div class="dfes-popup-inner">'+popup+'</div></div>');
							l.on(attr);
						};
					}

				}

				for(l = 0; l < this.views[this.options.view].layers.length; l++){

					id = this.views[this.options.view].layers[l].id;
					if(!this.layers[id].layer){
						this.layers[id].layer = L.geoJSON(this.layers[id].geojson,this.views[this.options.view].layers[l].geoattr);
					}
					_geojson.push(this.layers[id].layer);
					if(this.layers[id].layer) this.layers[id].layer.addTo(this.map);
					this.layers[id].layer.setStyle(this.views[this.options.view].layers[l].geoattr.style);
				}
				document.querySelector('#map .spinner').style.display = "none";
			}
		}
		
		// Trigger any event callback
		if(typeof this.events.buildMap==="function") this.events.buildMap.call(this);

		return this;
	};

	FES.prototype.fetch = function(resource, options = {}) {
		var { timeout = 3000 } = options;
		var controller = new AbortController();
		var id = setTimeout(() => controller.abort(), timeout);
		this.log('INFO','Get '+resource);
		var response = fetch(resource,{
			...options,
			signal: controller.signal
		}).then(response=>{
			if(!response.ok) throw new Error('Network response was not OK');
			if(options.type=="json") return response.json();
			else return response.text();
		}).then(d=>{
			if(typeof options.callback==="function") options.callback.call(this,d);
		}).catch(e => {
			this.message((options.error ? options.error : 'Unable to load from ')+resource.replace(/\?.*/,""),{'id':'error','type':'ERROR'})
		});
		clearTimeout(id);
		return this;
	}

	function popuptext(feature,attr){
		// does this feature have a property named popupContent?
		var popup,me,view,key,v,lid;
		popup = '';
		me = attr['this'];
		
		lid = me.views[me.options.view].layers[attr.layer].id;
		if(!me.layers[lid].key || !feature.properties[me.layers[lid].key]){
			me.log('ERROR','No property '+me.layers[lid].key+' in ',feature.properties);
			return "";
		}
		key = feature.properties[me.layers[lid].key];
		v = null;
		view = me.options.view;
		if(me.data.scenarios[me.options.scenario].data[me.options.parameter].layers[view].values && me.data.scenarios[me.options.scenario].data[me.options.parameter].layers[view].values[key]){
			v = me.data.scenarios[me.options.scenario].data[me.options.parameter].layers[view].values[key][me.options.key];
		}
		if(typeof v!=="number"){
			//console.warn('No value for '+key+' '+me.options.scenario+' '+me.options.parameter);
		}
		if(me.views[me.options.view].popup && typeof v!=="undefined"){
			if(typeof me.views[me.options.view].popup.text==="string"){
				popup = me.views[me.options.view].popup.text;
			}else if(typeof me.views[me.options.view].popup.text==="function"){
				popup = me.views[me.options.view].popup.text.call(me,{
					'view':view,
					'id':key,
					'key': (me.layers[lid].key||""),
					'name': (me.layers[lid].name||""),
					'value': v,
					'properties':feature.properties,
					'scenario': me.data.scenarios[me.options.scenario],
					'parameter': me.parameters[me.options.parameter]||{}
				});
			}
		}
		return popup;
	}
	
	FES.prototype.message = function(msg,attr){
		if(!attr) attr = {};
		if(!attr.id) attr.id = 'default';
		if(!attr.type) attr.type = 'message';
		if(msg) this.log(attr.type,msg);
		var css = "b5-bg";
		if(attr.type=="ERROR") css = "error";
		if(attr.type=="WARNING") css = "warning";

		var msgel = document.querySelector('.message');
		if(msgel.length == 0){
			msgel = document.createElement('div');
			msgel.classList.add('message');
			document.getElementById('scenario').before(el);
		}
		var el = msgel.querySelector('#'+attr.id);
		if(!msg){
			// Remove the specific message container
			if(el) el.remove();
		}else if(msg){
			// We make a specific message container
			if(!el) appendHTML(msgel,'<div id="'+attr.id+'"><div class="holder padded"></div></div>');
			el = msgel.querySelector('#'+attr.id);
			el.classList.add(css);
			el.querySelector('.holder').innerHTML = msg;
		}

		return this;
	};
	
	FES.prototype.formatValue = function(v,param){
		if(!param) param = this.options.parameter;
		if(this.parameters[param]){
			var units = this.parameters[param].units;
			var format;
			// Do we need to round it?
			if(typeof this.parameters[param].dp==="number") v = parseFloat(v.toFixed(this.parameters[param].dp));
			if(this.parameters[param].format){
				try {
					format = eval('('+this.parameters[param].format+')');
				}catch(e){ }
				return format.call(this,v,units);
			}else{
				return v.toLocaleString()+(units ? '&thinsp;'+units : '');
			}
		}
		return '?';
	};

	FES.prototype.makeScaleBar = function(grad,attr){
		var gap,i,v,c,str;
		if(!attr) attr = {};
		if(!attr.min) attr.min = 0;
		if(!attr.max) attr.max = 0;
		str = '<div class="bar" style="'+grad+';"><div class="bar-inner" style="border-color: '+attr.color+'"></div></div><div class="range" style="border-color: '+attr.color+'">';
		if(attr.levels){
			gap = (attr.max-attr.min)/attr.levels;
			for(i = 0; i <= attr.levels; i++){
				v = attr.min + i*gap;
				c = attr.scale.getColourFromScale(attr.scaleid, v, attr.min, attr.max);
				this.formatValue(v);
				str += '<span class="lvl'+(i==0 ? ' min' : (i==attr.levels ? ' max':''))+'" style="border-color: '+(i==0 ? attr.color : c)+';left:'+(100*i/attr.levels)+'%;">'+this.formatValue(v)+'</span>';
			}
		}else{
			str += '<span class="lvl min" style="border-color: '+attr.color+';left:0%;">'+this.formatValue(attr.min)+'</span>';
			str += '<span class="lvl max" style="border-color: '+attr.color+';left:100%;">'+this.formatValue(attr.max)+'</span>';
		}
		str += '</div>';
		return str;
	};

	// Useful functions

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
		while (matches = pattern.exec(CSV_string)){
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

	// Simple CSV to JSON parser v3.3
	function CSV2JSON(str){
		// Convert \r\n to \n, remove final newline, and split by newlines
		var lines = str.replace(/[\n\r]{2}/g,"\n").replace(/[\n\r]+$/g,"").split(/\n/);
		var header = [],cols,i,c,data = [],datum,v;
		for(i = 0; i < lines.length; i++){
			cols = lines[i].split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/);
			if(i==0){
				header = cols;
				for(c = 0; c < header.length; c++) header[c] = cols[c].replace(/(^\"|\"$)/g,"");
			}else{
				datum = [];
				for(c = 0; c < header.length; c++){
					v = cols[c].replace(/(^\"|\"$)/g,"");
					if(parseFloat(v)==v) v = parseFloat(v);
					if(v=="True" || v=="true") v = true;
					if(v=="False" || v=="false") v = false;
					datum.push(v);
				}
				data.push(datum);
			}
		}
		// Return the structured data
		return { 'header':header, 'rows': data };
	}

	// Function to clone a hash otherwise we end up using the same one
	function clone(hash) {
		var json = JSON.stringify(hash);
		var object = JSON.parse(json);
		return object;
	}

	String.prototype.regexLastIndexOf = function(regex, startpos) {
		regex = (regex.global) ? regex : new RegExp(regex.source, "g" + (regex.ignoreCase ? "i" : "") + (regex.multiLine ? "m" : ""));
		if(typeof (startpos) == "undefined") startpos = this.length;
		else if(startpos < 0)  startpos = 0;
		var stringToWorkWith = this.substring(0, startpos + 1);
		var lastIndexOf = -1;
		var nextStop = 0;
		var result;
		while((result = regex.exec(stringToWorkWith)) != null) {
			lastIndexOf = result.index;
			regex.lastIndex = ++nextStop;
		}
		return lastIndexOf;
	};

	function getRGBAstr(c,a){
        a = (typeof a==="number" ? a : 1.0);
        var rgb = "rgba(0,0,0,1)";
        if(c.indexOf("rgb")==0) rgb = c.replace(/^rgba?\(([0-9]+),([0-9]+),([0-9]+),?([0-9\.]+)?\)$/,function(m,p1,p2,p3,p4){ return "rgba("+p1+","+p2+","+p3+","+p4+")"; });
        else if(c.indexOf('#')==0) rgb = "rgba("+parseInt(c.substr(1,2),16)+","+parseInt(c.substr(3,2),16)+","+parseInt(c.substr(5,2),16)+","+a+")";
        return rgb;
    }

	function niceRange(mn,mx){

		var dv,log10_dv,base,frac,options,distance,imin,tmin,i,n;
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
			return 'rgb'+(this.alpha < 1 ? 'a':'')+'('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+(this.alpha < 1 ? ','+this.alpha:'')+')';
		};
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
		};
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
		};
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
			if(typeof inParts!=="boolean") inParts = false;
			if(!scales[s]){
				this.log('WARNING','No colour scale '+s+' exists');
				return '';
			}
			if(typeof v!=="number") v = 0;
			if(typeof min!=="number") min = 0;
			if(typeof max!=="number") max = 1;
			cs = scales[s].stops;
			v2 = 100*(v-min)/(max-min);
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

/* Global functions */
function setAttr(el,prop){
	for(var p in prop) el.setAttribute(p,prop[p]);
	return el;
}
function addEv(ev,el,data,fn){
	el.addEventListener(ev,function(e){
		e.data = data;
		fn.call(data.this||this,e);
	});
}
function appendHTML(el,html){
	if(html){
		var d = document.createElement('template');
		d.innerHTML = html;
		var c = (typeof d.content==="undefined" ? d : d.content);
		if(c.childNodes.length > 0) while(c.childNodes.length > 0) el.appendChild(c.childNodes[0]);
		else el.append(html);
	}
	return el;
}
