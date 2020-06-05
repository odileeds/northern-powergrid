package ODILeeds::LineGraph;

use strict;
use warnings;
use Data::Dumper;


sub new {
    my ($class, %args) = @_;
 
    my $self = \%args;
 
    bless $self, $class;
 
    return $self;
}

# Load in a CSV file
sub load {
	my ($self, $file) = @_;
	my ($str,@lines,$i,$c,@header,%headers,%cols,@rows);

	if(-e $file){
		# Get a local file
		open(FILE,$file);
		@lines = <FILE>;
		close(FILE);
	}elsif($file =~ /^https?\:/){
		# Get a remote file
		@lines = `wget -q --no-check-certificate -O- "$file"`;
	}else{
		print "ERROR: No file provided.\n";
		return $self;
	}
	
	$self->{'data'} = \@lines;

	return $self;
}

# Set the properties of the scenarios
sub setScenarios {
	my ($self, %scenarios) = @_;
	$self->{'scenarios'} = \%scenarios;	
	return $self;
}

my $f = 0.5;

# Draw the graph
sub draw {
	my ($self, %props) = @_;
	my ($r,$w,$h,@lines,$svg,@header,%headers,$c,@cols,@rows,$i,%scenarios,$scenario,$minyr,$maxyr,$miny,$maxy,$path,$y,$yrs,$yrange,$xpos,$ypos,$t,@pos);

	$w = $props{'width'};
	$h = $props{'height'};
	$minyr = 3000;
	$maxyr = 2000;
	$miny = 1e100;
	$maxy = -1e100;
	
	if(!$h){ $h = $w*$f; }

	@lines = @{$self->{'data'}};

	# Split the headers and tidy
	$lines[0] =~ s/[\n\r]//g;
	(@header) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[0]);
	for($c = 0; $c < @header; $c++){
		$header[$c] =~ s/(^\"|\"$)//g;
		$headers{$header[$c]} = $c;
		if($c > 0 && $header[$c] > $maxyr){ $maxyr = $header[$c]; }
		if($c > 0 && $header[$c] < $minyr){ $minyr = $header[$c]; }
	}

	# Process the rest of the lines
	for($i = 1 ; $i < @lines; $i++){
		chomp($lines[$i]);
		(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$i]);
		for($c = 0; $c < @header; $c++){ $cols[$c] =~ s/(^\"|\"$)//g; }
		$scenarios{$cols[$headers{'Scenario'}]} = {};
		for($c = 1; $c < @header; $c++){
			$scenarios{$cols[$headers{'Scenario'}]}{$header[$c]} = $cols[$c];
			if($cols[$c] > $maxy){ $maxy = $cols[$c]; }
			if($cols[$c] < $miny){ $miny = $cols[$c]; }
		}
	}
	$miny = 0;

	$yrs = $maxyr-$minyr;
	$yrange = $maxy-$miny;

	print "$miny - $maxy - $yrange ($minyr, $maxyr - $yrs)\n";
	# Build SVG
	$svg = "<svg width=\"".sprintf("%d",$w)."\" height=\"".sprintf("%d",$h)."\" viewBox=\"0 0 1 ".sprintf("%0.3f",$f)."\" xmlns=\"http://www.w3.org/2000/svg\" style=\"overflow:display\" preserveAspectRatio=\"xMinYMin meet\" overflow=\"visible\">\n";
	$svg .= "<defs>";
	$svg .= "<style>path.line { vector-effect: non-scaling-stroke; fill-opacity: 0; } path.line:hover { stroke-width: 6; }</style>\n";
	$svg .= "</defs>";

	foreach $scenario (keys(%scenarios)){
		$t = $scenario;
		$t =~ s/ \(.*\)//g;
		$path = "";
		for($y = $minyr; $y <= $maxyr; $y++){
			@pos = getXY($y,$scenarios{$scenario}{$y},$minyr,$maxyr,$miny,$maxy);
			$xpos = (($y-$minyr)/$yrs);
			$ypos = ($f*(1-($scenarios{$scenario}{$y}-$miny)/$yrange));
$xpos = $pos[0];
$ypos = $pos[1];
			$path .= ($y == $minyr ? "M":"L")." ".$xpos.",".$ypos;
		}
		$svg .= "<path d=\"$path\" class=\"line\" stroke=\"".$self->{'scenarios'}{$t}{'color'}."\" stroke-width=\"3\" stroke-linecap=\"round\"><title>$scenario</title></path>\n";
	}

	$svg .= "</svg>\n";
	
	return $svg;
}


# "Private" functions (they aren't technically private)

sub getXY {
	my($x,$y,$xmin,$xmax,$ymin,$ymax) = @_;
	
	return (($x-$xmin)/($xmax-$xmin),$f*(1-($y-$ymin)/($ymax-$ymin)));
}

1;