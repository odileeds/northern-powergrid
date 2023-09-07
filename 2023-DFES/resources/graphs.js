function highlightScenario(scenario){
	svgs = document.querySelectorAll('svg');
	trs = document.getElementsByTagName('tr');

	if(scenario){
		for(s = 0; s < svgs.length; s++){
			lines = svgs[s].querySelectorAll('.data-series');
			var match = -1;
			for(i = 0; i < lines.length; i++){
				if(lines[i].getAttribute('data-scenario')==scenario){ lines[i].classList.add('on'); match = i; }
				else lines[i].classList.remove('on');
			}
			// Move series to top
			if(match >= 0){
				lines[match].closest('svg').appendChild(lines[match])
			}
		}
		for(i = 0; i < trs.length; i++){
			if(trs[i].getAttribute('data-scenario')==scenario) trs[i].classList.add('on');
			else trs[i].classList.remove('on');
		}
	}
	
}

function ready(){
	var trs,r,i,lines,scenario;
	// Add hover events to table rows
	trs = document.getElementsByTagName('tr');
	for(r = 0; r < trs.length; r++){
		trs[r].addEventListener('mouseover', function(e){
			var tr = e.target.closest('tr');
			var scenario = tr.getAttribute('data-scenario');
			highlightScenario(scenario);
		}, false);
	}
	// Add hover events to lines
}

function getResource(res){
	var src = res.getAttribute('data');
	fetch(src).then(response => response.text()).then((data) => {

		// Remove the comments
		data = data.replace(/<\!--\?[^>]*\?-->/g,"");
		
		if(src.indexOf('html') >= 0){
			res.innerHTML = data;
		}else{

			// Parse the document
			let parser = new DOMParser();
			doc = parser.parseFromString(data,"application/xml");

			// Get the document
			var dom = doc.activeElement;

			// Add the XML
			res.insertAdjacentElement('beforebegin', dom);

			// Remove original image
			res.parentNode.removeChild(res);
		}
		loaded++;
		if(loaded==toload) ready();
	})
	return;
}


var blocks = document.getElementsByClassName('jekyll-parse');
for(var i = 0; i < blocks.length; i++){
	html = blocks[i].innerHTML;
	html = html.replace(/\{\% include_relative (.*\.[a-zA-Z]*) \%\}/g,function(m,p1){ return "<div class=\"jekyll-resource\" data=\""+p1+"\"></div>"; });
	blocks[i].innerHTML = html;
}
var rs = document.getElementsByClassName('jekyll-remove');
for(var i = 0; i < rs.length; i++) rs[i].parentNode.removeChild(rs[i]);

var res = document.getElementsByClassName('jekyll-resource');
var toload = res.length;
var loaded = 0;
if(toload == 0) ready();
else{
	for(var i = 0; i < toload; i++) getResource(res[i]);
}


