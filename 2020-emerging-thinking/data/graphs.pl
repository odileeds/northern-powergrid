#!/usr/bin/perl

use Data::Dumper;
use POSIX qw(strftime);
use JSON::XS;
use lib "./lib/";
use ODILeeds::NPG;

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
$graph = ODILeeds::NPG->new();
$graph->setScenarios(%scenarios);


for($i = 0; $i < (@graphs); $i++){
	
	$graph->load('graphs/'.$graphs[$i]{'csv'})->process();
	
	open(FILE,'>','graphs/'.$graphs[$i]{'svg'});
	print FILE $graph->draw(('yaxis-label'=>$graphs[$i]{'yaxis-label'},'width'=>'640','xaxis-max'=>2051,'xaxis-line'=>1,'stroke'=>3,'strokehover'=>5,'point'=>4,'pointhover'=>6,'line'=>2,'yaxis-format'=>"commify",'yaxis-labels-baseline'=>'middle','xaxis-ticks'=>1,'left'=>$graphs[$i]{'left'}));
	close(FILE);
	
	open(FILE,'>','graphs/'.$graphs[$i]{'table'});
	print FILE $graph->table(());
	close(FILE);
}







