<?php
header("Content-Type: text/event-stream");
header("Cache-Control: no-cache");

function sendMelding($id, $beskjed, $frekvens){
	echo "retry: $frekvens" . PHP_EOL;
	echo "id: $id" . PHP_EOL;
	echo "data: $beskjed" . PHP_EOL;
	echo PHP_EOL;
	ob_flush();
	flush();	
}

$serverTime = time();
$beskjed = hentTidspunkt($serverTime);
if (isset($_GET['t'])){
	$frekvens = $_GET['t'];
}
else {
	$frekvens = 5;
}
sendMelding($serverTime, $beskjed, $frekvens*1000);

function hentTidspunkt(){
	$data = array(   //husk at første har nøkkel 0
				"P1,35,50;P2,10,10;P3,25,150;P4,75,250", 
				"P1,38,50;P2,9,10;P3,30,150;P4,89,250", 
				"P1,39,50;P2,10,10;P3,35,150;P4,95,250", 
				"P1,34,50;P2,8,10;P3,45,150;P4,109,250", 
				"P1,33,50;P2,6,10;P3,55,150;P4,150,250", 
				"P1,30,50;P2,4,10;P3,65,150;P4,175,250", 
				"P1,23,50;P2,3,10;P3,65,150;P4,175,250", 
				"P1,43,50;P2,2,10;P3,65,150;P4,225,250", 
				"P1,12,50;P2,5,10;P3,50,150;P4,225,250", 
				"P1,15,50;P2,6,10;P3,80,150;P4,225,250", 
				"P1,16,50;P2,6,10;P3,100,150;P4,225,250", 
				"P1,25,50;P2,7,10;P3,150,150;P4,200,250", 
				"P1,24,50;P2,7,10;P3,149,150;P4,225,250", 
				"P1,18,50;P2,4,10;P3,149,150;P4,250,250", 
				"P1,11,50;P2,3,10;P3,115,150;P4,245,250", 
				"P1,45,50;P2,7,10;P3,70,150;P4,244,250", 
				"P1,45,50;P2,5,10;P3,60,150;P4,244,250", 
				"P1,45,50;P2,5,10;P3,50,150;P4,200,250", 
				"P1,45,50;P2,7,10;P3,40,150;P4,200,250", 
				"P1,50,50;P2,10,10;P3,140,150;P4,200,250"
			);
	$tilfeldig = rand(0,count($data)-1);
	return $data[$tilfeldig];
}
?>