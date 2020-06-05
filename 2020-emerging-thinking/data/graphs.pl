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



# Create the SVG output
$graph = ODILeeds::LineGraph->new();
$graph->setScenarios(%scenarios);

open(FILE,'>','graphs/graph-test.svg');
print FILE $graph->load('graphs/graph-test.csv')->draw(('width'=>'1080'));
close(FILE);
