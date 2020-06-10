package ODILeeds::NPG;

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

print "$file ".(-e $file)."\n";
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
	$self->{'scenario-props'} = \%scenarios;	
	return $self;
}

sub process {
	my ($self) = @_;
	my(@lines,@header,$c,%headers,$i,@cols,$maxy,$miny,$maxyr,$minyr);

	$minyr = 3000;
	$maxyr = 2000;
	$miny = 1e100;
	$maxy = -1e100;

	@lines = @{$self->{'data'}};
	$self->{'scenarios'} = ();
	$self->{'scenariolookup'} = ();

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
		$lines[$i] =~ s/[\n\r]//g;
		(@cols) = split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/,$lines[$i]);
		for($c = 0; $c < @header; $c++){ $cols[$c] =~ s/(^\"|\"$)//g; }
		$self->{'scenarios'}{$cols[$headers{'Scenario'}]} = {};
		push(@{$self->{'scenariolookup'}},$cols[$headers{'Scenario'}]);
		for($c = 1; $c < @header; $c++){
			$self->{'scenarios'}{$cols[$headers{'Scenario'}]}{$header[$c]} = $cols[$c];
			if($cols[$c] > $maxy){ $maxy = $cols[$c]; }
			if($cols[$c] < $miny){ $miny = $cols[$c]; }
		}
	}
	
	$self->{'xmax'} = $maxyr;
	$self->{'xmin'} = $minyr;
	$self->{'ymax'} = $maxy;
	$self->{'ymin'} = $miny;
	
	return $self;
}

# Draw the graph
sub draw {
	my ($self, %props) = @_;
	my ($r,$w,$h,@lines,$svg,@header,%headers,$c,@cols,@rows,$i,@scenariolookup,$s,%scenarios,$scenario,$minyr,$maxyr,$miny,$maxy,$path,$y,$yrs,$yrange,$xpos,$ypos,$t,@pos,$circles,%ticks,@a,@b,$left,$right,$top,$bottom);

	$w = $props{'width'};
	$h = $props{'height'};
	
	$minyr = $self->{'xmin'};
	$maxyr = $self->{'xmax'};
	$miny = $self->{'ymin'};
	$maxy = $self->{'ymax'};

	if(!$h){ $h = $w*0.4; }

	$miny = 0;

	if($props{'xaxis-max'}){ $maxyr = $props{'xaxis-max'}; }
	if($props{'xaxis-min'}){ $minyr = $props{'xaxis-min'}; }

	$yrs = $maxyr-$minyr;
	$yrange = $maxy-$miny;
	
	if(!$props{'tick'} || $props{'tick'} eq ""){ $props{'tick'} = 5; }

	# Build SVG
	$svg = "<svg width=\"".sprintf("%d",$w)."\" height=\"".sprintf("%d",$h)."\" viewBox=\"0 0 $w $h\" xmlns=\"http://www.w3.org/2000/svg\" style=\"overflow:display\" preserveAspectRatio=\"xMinYMin meet\" overflow=\"visible\">\n";
	$svg .= "<defs>";
	$svg .= "<style>";
	$svg .= ".data-series { }";
	$svg .= ".data-series path.line { fill-opacity: 0; }";
	$svg .= ".data-series path.line.dotted { stroke-dasharray: 12 20 }";
	$svg .= ".data-series circle { display: none; }";
	$svg .= ".data-series:hover path.line, .data-series.on path.line { stroke-width: $props{'strokehover'}; }";
	$svg .= ".data-series:hover circle, .data-series.on circle { display: inline; }";
	$svg .= ".data-series circle:hover, .data-series circle.on { r: $props{'pointhover'}px!important; fill: black; }";
	$svg .= ".grid line { stroke: rgb(0,0,0); stroke-width: $props{'line'}; stroke-linecap: round; }";
	$svg .= ".grid.grid-x text { text-anchor: middle; dominant-baseline: hanging; transform: translateY(".($props{'tick'}*2)."px); }";
	$svg .= ".grid.grid-y text { text-anchor: end; dominant-baseline: ".($props{'yaxis-labels-baseline'}||"middle")."; transform: translateX(-".($props{'tick'}*2)."px); }";
	$svg .= "</style>\n";
	$svg .= "</defs>";

	$left = $props{'left'}||100;
	$right = $props{'right'}||10;
	$top = $props{'top'}||10;
	$bottom = $props{'bottom'}||50;

	# Draw grid lines
	$svg .= buildAxis(('axis'=>'y','label'=>$props{'yaxis-label'},'tick'=>5,'ticks'=>$props{'yaxis-ticks'},'line'=>$props{'xaxis-line'},'format'=>$props{'yaxis-format'},'n'=>4,'left'=>$left,'right'=>$right,'bottom'=>$bottom,'top'=>$top,'axis-lines'=>$props{'yaxis-lines'},'width'=>$w,'height'=>$h,'xmin'=>$minyr,'xmax'=>$maxyr,'ymin'=>$miny,'ymax'=>$maxy));
	$svg .= buildAxis(('axis'=>'x','label'=>$props{'xaxis-label'},'tick'=>5,'ticks'=>$props{'xaxis-ticks'},'line'=>$props{'yaxis-line'},'format'=>$props{'xaxis-format'},'left'=>$left,'right'=>$right,'bottom'=>$bottom,'top'=>$top,'spacing'=>10,'axis-lines'=>$props{'xaxis-lines'},'width'=>$w,'height'=>$h,'xmin'=>$minyr,'xmax'=>$maxyr,'ymin'=>$miny,'ymax'=>$maxy));

	for($s = 0; $s < @{$self->{'scenariolookup'}}; $s++){
		$scenario = $self->{'scenariolookup'}[$s];
		$t = $scenario;
		$t =~ s/ \(.*\)//g;
		$t =~ s/ with customer flexibility//g;
		$path = "";
		$svg .= "<g data-scenario=\"".$self->{'scenario-props'}{$t}{'css'}."\" class=\"data-series\">";
		$circles = "";
		for($y = $minyr; $y <= $maxyr; $y++){
			if($self->{'scenarios'}{$scenario}{$y}){
				@pos = getXY(('x'=>$y,'y'=>$self->{'scenarios'}{$scenario}{$y},'width'=>$w,'height'=>$h,'left'=>$left,'right'=>$right,'bottom'=>$bottom,'top'=>$top,'xmin'=>$minyr,'xmax'=>$maxyr,'ymin'=>$miny,'ymax'=>$maxy));
				$xpos = $pos[0];
				$ypos = $pos[1];
				$path .= ($y == $minyr ? "M":"L")." ".$xpos.",".$ypos;
				if($props{'point'} > 0){
					$circles .= "<circle cx=\"$xpos\" cy=\"$ypos\" data-y=\"$self->{'scenarios'}{$scenario}{$y}\" data-x=\"$y\" r=\"$props{'point'}\" fill=\"".($self->{'scenario-props'}{$t}{'color'}||"")."\"><title>$y: $self->{'scenarios'}{$scenario}{$y}</title></circle>";
				}
			}
		}
		$svg .= "<path d=\"$path\" id=\"$scenario\" class=\"line".($scenario =~ "customer flexibility" ? " dotted":"")."\" stroke=\"".$self->{'scenario-props'}{$t}{'color'}."\" stroke-width=\"$props{'stroke'}\" stroke-linecap=\"round\"><title>$scenario</title></path>";
		$svg .= $circles;
		$svg .= "</g>\n";
	}

	$svg .= "</svg>\n";
	
	return $svg;
}

# Draw the graph
sub table {
	my ($self, %props) = @_;
	my ($html,$minyr,$maxyr,$miny,%ticks,$s,$t,$y,$scenario);

	
	$minyr = $self->{'xmin'};
	$maxyr = $self->{'xmax'};

	%ticks = makeTicks($minyr,$maxyr,('spacing'=>10));

	# Build HTML
	$html = "<table>\n";

	$html .= "<tr><th></th>";
	for($y = $ticks{'data-0'}; $y <= $maxyr; $y += 10){
		$html .= "<th>$y</th>";
	}
	$html .= "</tr>\n";
	for($s = 0; $s < @{$self->{'scenariolookup'}}; $s++){
		$scenario = $self->{'scenariolookup'}[$s];
		$t = $scenario;
		$t =~ s/ \(.*\)//g;
		$t =~ s/ with customer flexibility//g;

		$html .= "<tr><td class=\"".$self->{'scenario-props'}{$t}{'css'}."\">".$scenario."</td>";
		
#		$svg .= "<g data-scenario=\"".$self->{'scenario-props'}{$t}{'css'}."\" class=\"data-series\">";

		for($y = $ticks{'data-0'}; $y <= $maxyr; $y += 10){
			$html .= "<td>$self->{'scenarios'}{$scenario}{$y}</td>";
		}
#		$svg .= "<path d=\"$path\" id=\"$scenario\" class=\"line".($scenario =~ "customer flexibility" ? " dotted":"")."\" stroke=\"".$self->{'scenario-props'}{$t}{'color'}."\" stroke-width=\"$props{'stroke'}\" stroke-linecap=\"round\"><title>$scenario</title></path>";
		$html .= "</tr>\n";
	}
	$html .= "</table>";
	
	return $html;
}

sub buildAxis {
	my (%props) = @_;
	my (%ticks,$svg,$t,@a,@b,$axis,$label,$temp,$tick);
	$axis = $props{'axis'}."axis";
	$tick = ($props{'tick'}||5);
	
	%ticks = makeTicks($props{($axis eq "yaxis" ? "ymin":"xmin")},$props{($axis eq "yaxis" ? "ymax":"xmax")},%props);

	$svg = "<g class=\"grid grid-$props{'axis'}\">";
	for($t = 0; $t < $ticks{'length'}; $t++){

		if($props{'axis'} eq "x"){
			$props{'x'} = $ticks{'data-'.$t};
			$props{'y'} = $props{'ymin'};
		}else{
			$props{'x'} = $props{'xmin'};
			$props{'y'} = $ticks{'data-'.$t};		
		}
		@a = getXY(%props);

		if($props{'axis'} eq "x"){
			$props{'x'} = $ticks{'data-'.$t};
			$props{'y'} = $props{'ymax'};
		}else{
			$props{'x'} = $props{'xmax'};
			$props{'y'} = $ticks{'data-'.$t};		
		}
		@b = getXY(%props);
		if($a[1] >= 0 && $a[0] >= $props{'left'}){
			if(($t == 0 && $props{'line'}) || $props{'axis-lines'}){
				$svg .= "<line x1=\"$a[0]\" y1=\"$a[1]\" x2=\"$b[0]\" y2=\"$b[1]\" data-left=\"$props{'left'}\"></line>";
			}
			if($a[0] < $props{'width'}){

				if($props{'ticks'}){
					$svg .= "<line class=\"tick\" x1=\"$a[0]\" y1=\"$a[1]\" x2=\"".($a[0]-($axis eq "yaxis" ? $tick : 0))."\" y2=\"".($a[1]+($axis eq "yaxis" ? 0 : $tick))."\"></line>";
				}
				$label = $ticks{'data-'.$t};
				if($props{'format'} && $props{'format'} eq "commify"){ $label = commify($label); }
				$svg .= "<text x=\"$a[0]\" y=\"$a[1]\" text-anchor=\"".($axis eq "yaxis" ? "end":"middle")."\">".$label."</text>";
			}
		}
	}
	$svg .= "<text style=\"text-anchor:middle;dominant-baseline:hanging;font-weight:bold;transform: translateY(".($props{'top'} + ($props{'height'}-$props{'top'}-$props{'bottom'})/2)."px) rotate(-90deg);\">".($props{'label'}||"")."</text>";

	$svg .= "</g>";
	return $svg;
}


# "Private" functions (they aren't technically private)

sub getXY {
	my (%props) = @_;
	my ($x,$y,$xf,$yf);
	if(!$props{'left'}){ $props{'left'} = 0; }
	if(!$props{'top'}){ $props{'top'} = 0; }
	if(!$props{'right'}){ $props{'right'} = 0; }
	if(!$props{'bottom'}){ $props{'bottom'} = 0; }
	$x = $props{'left'} + (($props{'x'}-$props{'xmin'})/($props{'xmax'}-$props{'xmin'}))*($props{'width'}-$props{'left'}-$props{'right'});
	$y = $props{'top'} + (1-($props{'y'}-$props{'ymin'})/($props{'ymax'}-$props{'ymin'}))*($props{'height'}-$props{'bottom'}-$props{'top'});
	return ($x,$y);
}


##########################
# Make the tick marks.
# @param {number} mn - the minimum value
# @param {number} mx - the maximum value
sub makeTicks(){
	my ($mn,$mx,%opts) = @_;
	my ($v,$l,$i,$d,$vmx,%ticks);

	# If the range is negative we cowardly quit
	if($mn > $mx){ return (); }
	# If the min or max are not numbers we quit
	#if(isNaN(mn) || isNaN(mx)) return ticks;

	%ticks = ('length'=>0);
	if($opts{'spacing'}){ $ticks{'inc'} = $opts{'spacing'}; }
	else{ $ticks{'inc'} = defaultSpacing($mn,$mx,$opts{'n'}||5); }
	
	$vmx = $mx + $ticks{'inc'};
	for($v = ($ticks{'inc'}*int($mn/$ticks{'inc'})), $i = 0; $v <= $vmx; $v += $ticks{'inc'}, $i++){
		# If formatLabel is set we use that to format the label
		$ticks{'data-'.$i} = $v;
		$ticks{'length'}++;
	}

	if($ticks{'length'} == 0){
		print "No ticks";
		return %ticks;
	}

	$ticks{'range'} = $ticks{'data-'.($ticks{'length'}-1)} - $ticks{'data-'.0};

	return %ticks;
}

sub log10 {
	my $n = shift;
	return log($n)/log(10);
}

####################################
# Get some spacing given a minimum and maximum value
# @param {number} mn - the minimum value
# @param {number} mx - the maximum value
# @param {number} n - the minimum number of steps
sub defaultSpacing { 
	my ($mn, $mx, $n) = @_;

	my ($dv, $log10_dv, $base, $frac, @options, @distance, $imin, $tmin, $i);

	# Start off by finding the exact spacing
	$dv = abs($mx - $mn) / $n;
	
	# In any given order of magnitude interval, we allow the spacing to be
	# 1, 2, 5, or 10 (since all divide 10 evenly). We start off by finding the
	# log of the spacing value, then splitting this into the integer and
	# fractional part (note that for negative values, we consider the base to
	# be the next value 'down' where down is more negative, so -3.6 would be
	# split into -4 and 0.4).
	$log10_dv = log10($dv);
	$base = int($log10_dv);
	$frac = $log10_dv - $base;

	# We now want to check whether frac falls closest to 1, 2, 5, or 10 (in log
	# space). There are more efficient ways of doing this but this is just for clarity.
	@options = (1, 2, 5, 10);
	@distance = ();
	$imin = -1;
	$tmin = 1e100;
	for($i = 0; $i < @options; $i++) {
		if(!$distance[$i]){ push(@distance,""); }
		$distance[$i] = abs($frac - log10($options[$i]));
		if($distance[$i] < $tmin) {
			$tmin = $distance[$i];
			$imin = $i;
		}
	}

	# Now determine the actual spacing
	return (10 ** $base) * $options[$imin];
}

sub commify {
	my $text = reverse $_[0];
	$text =~ s/(\d\d\d)(?=\d)(?!\d*\.)/$1,/g;
	return scalar reverse $text;
}

1;