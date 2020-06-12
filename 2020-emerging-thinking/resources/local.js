function getSVG(im){
	var src = im.getAttribute('src');
	var id = im.getAttribute('id');
	var css = im.getAttribute('style');
	fetch(src).then(response => response.text()).then((data) => {

		// Remove the stuff at the front
		data = data.replace(/<\!--\?[^>]*\?-->/g,"");

		// Parse the document
		let parser = new DOMParser();
		doc = parser.parseFromString(data,"application/xml");

		// Get the document
		var svg = doc.activeElement;

		// Set the ID to that of the original <img>
		if(id) svg.setAttribute('id',id);
		if(css) svg.setAttribute('style',css);

		// Add the SVG
		im.insertAdjacentElement('beforebegin', svg);

		// Remove original image
		im.parentNode.removeChild(im);
		loaded++;
		if(loaded==toload) _ready = true;
	})
	return;
}


var blocks = document.getElementsByClassName('jekyll-parse');
var regexp = /(\{\% include_relative .*.html \%\})/g;
var match,matches;
for(var i = 0; i < blocks.length; i++){
	html = blocks[i].innerHTML.replace(/\n/g,"=====");
	html = html.replace(/\{\% if true \%\}.*\{\% else \%\}/g,"");
	html = html.replace(/\{\%[^\}]*\%\}/g,"");
	html = html.replace(/=====/g,"\n");
	
	blocks[i].innerHTML = html;
}
var rs = document.getElementsByClassName('jekyll-remove');
for(var i = 0; i < rs.length; i++) rs[i].parentNode.removeChild(rs[i]);


var ims = document.getElementsByClassName('to-svg');
var toload = ims.length;
if(toload > 0){
	_ready = false;
	var loaded = 0;
	for(var i = 0; i < toload; i++) getSVG(ims[i]);
}