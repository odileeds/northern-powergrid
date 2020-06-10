#!/usr/bin/perl

use Data::Dumper;
use POSIX qw(strftime);
use JSON::XS;
use lib "./lib/";
use ODILeeds::LineGraph;

# Get directory
$dir = $0;
if($dir =~ /\//){ $dir =~ s/^(.*)\/([^\/]*)/$1/g; }
else{ $dir = "./"; }


# Get the scenario config
open(FILE,$dir."scenarios/index.json");
@lines = <FILE>;
close(FILE);
%scenarios = %{JSON::XS->new->utf8->decode(join("\n",@lines))};
foreach $scenario (keys(%scenarios)){
	print "$scenario - $scenarios{$scenario}{'color'} - $scenarios{$scenario}{'css'}\n";
}


# Get the graph config
open(FILE,$dir."graphs/index.json");
@lines = <FILE>;
close(FILE);
@graphs = @{JSON::XS->new->utf8->decode(join("\n",@lines))};



# Create the SVG output
$graph = ODILeeds::LineGraph->new();
$graph->setScenarios(%scenarios);


for($i = 0; $i < (@graphs); $i++){
	
	open(FILE,'>','graphs/'.$graphs[$i]{'svg'});
	print FILE $graph->load('graphs/'.$graphs[$i]{'csv'})->draw(('yaxis-label'=>$graphs[$i]{'yaxis-label'},'width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>$graphs[$i]{'left'}));
	close(FILE);
}


#open(FILE,'>','graphs/graph-evs-test.svg');
#print FILE $graph->load('graphs/EVs test (#).csv')->draw(('yaxis-label'=>'Number','width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>120));
#close(FILE);


#open(FILE,'>','graphs/graph-annual-co2-emissions-test.svg');
#print FILE $graph->load('graphs/Annual carbon emissions test (MTco2e).csv')->draw(('yaxis-label'=>'Mt CO2(e)','width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>65));
#close(FILE);

#open(FILE,'>','graphs/graph-heatpumps-test.svg');
#print FILE $graph->load('graphs/heatpumps test (number).csv')->draw(('yaxis-label'=>'Mt CO2(e)','width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>120));
#close(FILE);






