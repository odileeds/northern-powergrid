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
	$scenarios{$cols[0]} = ();
	$scenarios{$cols[0]}{'color'} = $cols[1];
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
}







