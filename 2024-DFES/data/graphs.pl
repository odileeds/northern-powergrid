#!/usr/bin/perl

# Get directory
my $dir;
BEGIN {
	$dir = $0;
	$dir =~ s/[^\/]*$//g;
	if(!$dir){ $dir = "./"; }
	$lib = $dir."lib/";
}
use lib $lib;
use Data::Dumper;
use POSIX qw(strftime);
use JSON::XS;
use ODILeeds::NPG;

# Get the scenario config
open(FILE,$dir."scenarios/index.json");
@lines = <FILE>;
close(FILE);
%scenarios = %{JSON::XS->new->utf8->decode(join("\n",@lines))};
foreach $scenario (keys(%scenarios)){
	print "$scenario - $scenarios{$scenario}{'color'} - $scenarios{$scenario}{'css'}\n";
}

# Load in the extra colour definitions
open(FILE,$dir."colours.csv");
@lines = <FILE>;
close(FILE);
foreach $line  (@lines){
	$line =~ s/[\n\r]//g;
	(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$line);
	if($cols[0]){
		$scenarios{$cols[0]} = ();
		$scenarios{$cols[0]}{'color'} = $cols[1];
	}
}

$indexfile = $dir."graphs/index.json";

if(-e $indexfile){
	# Get the graph config
	open(FILE,$indexfile);
	@lines = <FILE>;
	close(FILE);
	@graphs = @{JSON::XS->new->utf8->decode(join("\n",@lines))};



	# Create the SVG output
	$graph = ODILeeds::NPG->new();
	$graph->setScenarios(%scenarios);

	$html = "";
	for($i = 0; $i < (@graphs); $i++){
		print "Processing ".$dir."graphs/$graphs[$i]{'csv'}\n";
		$graph->load($dir.'graphs/'.$graphs[$i]{'csv'})->process();
		
		# If we have a y-axis scaling we scale the values
		if($graphs[$i]{'yscale'}){
			$graph->scaleY($graphs[$i]{'yscale'});
		}
		
		# Output the SVG
		open(FILE,'>',$dir.'graphs/'.$graphs[$i]{'svg'});
		print FILE $graph->draw(('yaxis-label'=>$graphs[$i]{'yaxis-label'},'yscale'=>$graphs[$i]{'yscale'},'yaxis-max'=>$graphs[$i]{'yaxis-max'},'width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>$graphs[$i]{'left'}));
		close(FILE);
		
		# Output the HTML table
		open(FILE,'>',$dir.'graphs/'.$graphs[$i]{'table'});
		print FILE $graph->table(());
		close(FILE);
		
		$html .= "\t\t\t<figure class=\"jekyll-parse\">\n";
		$html .= "\t\t\t\t<figcaption><strong>Figure ".($i+1).":</strong> $graphs[$i]{'title'}</figcaption>\n";
		$html .= "\t\t\t\t<div class=\"table-holder\">{% include_relative data/graphs/$graphs[$i]{'table'} %}</div>\n";
		$html .= "\t\t\t\t{% include_relative data/graphs/$graphs[$i]{'svg'} %}\n";
		$html .= "\t\t\t\t<div class=\"download\">\n";
		$html .= "\t\t\t\t\t<a href=\"data/graphs/$graphs[$i]{'svg'}\"><img src=\"resources/download.svg\" alt=\"download\" title=\"Download graph from Figure ".($i+1)."\" /> SVG</a>\n";
		$html .= "\t\t\t\t\t<a href=\"data/graphs/$graphs[$i]{'csv'}\"><img src=\"resources/download.svg\" alt=\"download\" title=\"Download data from Figure ".($i+1)."\" /> CSV</a>\n";
		$html .= "\t\t\t\t</div>\n";
		$html .= "\t\t\t</figure>\n\n";
	}

	open(FILE,">",$dir."graphs.txt");
	print FILE $html;
	close(FILE);
}





