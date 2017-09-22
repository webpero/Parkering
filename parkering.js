/* (c) webpero 2017
 * Parkeringsapplikasjon
 * 28.04.2017
 */

/************************ Globale variable for kart og bukerdata ****************/

let parkMap;			// Kartet
let parkES;				// SSE kilde for parkeringsdata
const mapCenter = { 	// Senter på kartet
	lat: 59.880789, 
	lng: 10.804627 
};
// Dataobjekter for de ulike parkeringshusene
let parkData = [];
let parkInfo = [
	{
		id: "P1",
		name: "P1 - Karlsrud",
		price: "50 NOK/time", 
		hours: "07-24",
		x: 355,	y: 345,			//Punkt for spissen av markør for infoboble
		x1:0, x2:0, y1:0, y2:0  //Hjørner for infoboblen (settes senere)
	}, 
	{
		id: "P2",
		name:"P2 - Raschs vei",
		price: "50 NOK/time", 
		hours: "07-24",		
		x: 255,	y: 330,			//Punkt for spissen av markør for infoboble
		x1:0, x2:0, y1:0, y2:0  //Hjørner for infoboblen (settes senere)
	}, 
	{
		id: "P3",
		name:"P3 - Brattlikollen",
		price: "100 NOK/time", 
		hours: "00-24",		
		x: 260,	y: 185,			//Punkt for spissen av markør for infoboble
		x1:0, x2:0, y1:0, y2:0  //Hjørner for infoboblen (settes senere)
	}, 
	{
		id: "P4",
		name:"P4 - Lambertseter",
		price: "120 NOK/time", 
		hours: "00-24",
		x: 400, y: 480,			//Punkt for spissen av markør for infoboble
		x1:0, x2:0, y1:0, y2:0  //Hjørner for infoboblen (settes senere)
	}
];
// Delta for posisjoner ut fra kartstørrelse (skal trekkes fra alle x- og y- verdier for plassering av P-hus)
let d = 0;

// Variable som kan settes av bruker (kan lagres)
let userSaveData = false;		//Husk meg: lagrer alle innstillinger
let userDetails = false;		//Vise detaljer om parkering i kartet?
let userShow = false;			//Vise markør for bruker?
let userMinFree = 0;			//Vis bare P-hus som har minst dette antallet ledige plasser;
let userBgColor = "#FFFFFF";	//Bakgrunnsfargen på siden
let userDataRefresh = 10;		//Sekunder mellom hver refresh av parkeringsdata

// Variable fra grafisk visning (kan lagres)
let userStatGraph = false;
let userStatShowP = "P1";
let userStatColorP = ["#e09090","#90e0e0","#90e090","#e0e090"];

//Brukers posisjon (lat,lng)
let userPos = {};			


/************************* Init ved oppstart av siden *************************/
$(function() 
{
	const noCanvasTxt = " [krever støtte for canvas]";
	
	// Sjekk om canvas-funksjoner er tilgjengelige: statusvariabel canvasOK settes
	if ( !checkForCanvas() )
	{
		//Ingen støtte for canvas, ta vekk brukerinstillinger for funskjoner som krever dette
		$("#uiDetails").prop( "disabled", true );
		$("label[for='uiDetails']").css( "color", "#bbb" ).append(noCanvasTxt);
		$("#uiNumP").prop( "disabled", true );
		$("label[for='uiNumP']").css( "color", "#bbb" ).append(noCanvasTxt);
		//Erstatt input-form for grafisk visnig med en feilmelding
		$("#statistics form").html("<p class='error'>Ingen grafisk visning" + noCanvasTxt + "</p>");
	}

	// Hent opp brukers innstillinger hvis disse er lagret
	getUserData();
	if ( userSaveData )
	{
		//Brukerdata er funnet og hentet: Sett opp brukers valg
		$("#uiSaveData").prop( "checked", userSaveData );
		$("#uiDetails").prop( "checked", userDetails );
		$("#uiUserShow").prop( "checked", userShow );
		$("#uiNumPVal").text( userMinFree );
		$("#uiNumP").val( userMinFree );
		$("#uiBgColor").val( userBgColor );
		$("#uiDataRefresh").val( userDataRefresh );
		if ( canvasOK )
		{
			$("#statGraph").prop( "checked", userStatGraph );
			for ( let i=0; i<4; i++ ) {
				$("#statP"+(i+1)).prop( "checked", (parseInt(userStatShowP.slice(-1)) === i) );
				$("#statColorP"+(i+1)).val( userStatColorP[i] );
			}
			if ( userStatGraph ) {
				//Bruker har valgt grafisk visning, tegn opp akser m.m.
				$("#statistics input[type='color']").prop("disabled", false );
				initStatGraph();
			}
		}
	}
	
	// UI-funksjoner: Sett opp funksjoner for brukerinnstillinger
	$("#uiSaveData").click( function() {
		userSaveData = $(this).prop("checked");
		if( userSaveData ) {
			saveUserData();
		} else {
			deleteUserData();
		}
	});
	if ( canvasOK )
	{
		$("#uiDetails").click( function() {
			userDetails = $(this).prop("checked");
			saveUserData();
			updateParking();
		});
	}
	$("#uiUserShow").click( function() {
		userShow = $(this).prop("checked");
		saveUserData();
		initMap();
		updateParking();
	});
	if ( canvasOK )
	{
		$("#uiNumP").change( function() {
			userMinFree = parseInt($(this).val());
			$("#uiNumPVal").text( userMinFree );
			saveUserData();
			updateParking();
		});
	}
	$("#uiDataRefresh").change( function() {
		userDataRefresh = parseInt($(this).val());
		$("#dataRefresh").text( userDataRefresh );
		saveUserData();
		initData();
		updateParking();
	});
	$("#uiBgColor").change( function() {
		userBgColor = $(this).val();
		$("body").css("background",userBgColor);
		saveUserData();
	});		
	if ( canvasOK ) 
	{
		// Sett opp input-funksjoner for statistikk
		$("#statGraph").click( function() {
			clearCanvas(statCanvas);
			userStatGraph = $(this).prop("checked");
			$("#statistics input[type='color']").prop("disabled", !userStatGraph );
			if ( userStatGraph ) {
				//Tegn opp akser m.m.
				initStatGraph();
			}
			saveUserData();
		});
		$("#statColorP1, #statColorP2, #statColorP3, #statColorP4").change( function() {
			//Sett verdien av color-picker til riktig element i tabellen over farger
			userStatColorP[parseInt($(this).attr("id").slice(-1))-1] = $(this).val();
			saveUserData();
		});		
	}
	
	//Klikk for å starte/stoppe datastrømmen
	$("#uiPause").click( function(e) {
		if ( pauseES ) {
			initData();
		} else {
			pauseData();
		}
		e.preventDefault();
	});
	
	//Sett opp handler for endring av vindusstørrelse
	$(window).resize( function() {
		//Tegn opp kartet på nytt
		initMap();	
		updateParking();
	});
	
	if ( canvasOK )
	{
		//Klikk på kartet
		$('#mapOverlay').click( function (e) {
			let rect = mapCanvas.getBoundingClientRect();
			let clickedX = e.clientX - rect.left;
			let clickedY = e.clientY - rect.top;

			for ( i = 0; i < parkInfo.length; i++ ) {
				if ( clickedX >= parkInfo[i].x1 && clickedX <= parkInfo[i].x2 && clickedY >= parkInfo[i].y1 && clickedY <= parkInfo[i].y2 ) {
					showAllData(i);
					return;
				}
			}
			//Klikket utenfor bokser, starte datastrømmen igjen (kan være stoppet hvis man har klikket på en boks)
			initData();
		});
		//Musebevegelse på kartet 
		$('#mapOverlay').mousemove( function (e) {
			let mousePos = getMousePos(mapCanvas, e);
			
			$(this).css("cursor","auto");
			for ( i = 0; i < parkInfo.length; i++ ) {
				if ( mousePos.x >= parkInfo[i].x1 && mousePos.x <= parkInfo[i].x2 && mousePos.y >= parkInfo[i].y1 && mousePos.y <= parkInfo[i].y2 ) {
					$(this).css("cursor","pointer");
					return;
				}
			}
		});
	}
	
	//Start henting av data
	initData();
	
	// Sett opp kartet
	initMap(); 
});


/************************* Lagring/henting av brukerdata (innstillinger) *************************/
function getUserData()
{
	// Sjekk om lokal lagring er mulig
	if ( typeof(Storage) !== "undefined" )
	{
		if ( localStorage.parkSaveData !== "undefined" && localStorage.parkSaveData )
		{
			// Bruker har lagret data, hent disse
			userSaveData = true;
			userDetails = (localStorage.parkUserDetails ==="true");	
			userShow = (localStorage.parkUserShow ==="true");
			userBgColor = localStorage.parkUserBgColor;
			userMinFree = parseInt(localStorage.parkUserMinFree);
			userDataRefresh = parseInt(localStorage.parkUserDataRefresh);
			userStatGraph = (localStorage.parkUserStatGraph === "true");
			userStatShowP = localStorage.parkUserStatShowP;
			for ( let i=0; i<4; i++ ) {
				userStatColorP[i] = localStorage.getItem( "parkUserStatColorP"+(i+1) );
			}
			// Sett bakgrunnsfarge etter brukers valg
			$("body").css("background",userBgColor);
		}
		else
		{
			// Bruker har ikke lagrede data
			userSaveData = false;
		}
	}
	else
	{
		//Kan ikke lagre lokale data
		userSaveData = false;
		$("#uiSaveData").hide();
	}
}
function saveUserData()
{
	if ( typeof(Storage) !== "undefined" && userSaveData )
	{
		localStorage.parkSaveData = "true";
		localStorage.parkUserDetails = userDetails.toString();	
		localStorage.parkUserShow = userShow.toString();
		localStorage.parkUserBgColor = userBgColor;
		localStorage.parkUserMinFree = userMinFree.toString();
		localStorage.parkUserDataRefresh = userDataRefresh.toString();
		localStorage.parkUserStatGraph = userStatGraph.toString();
		localStorage.parkUserStatShowP = userStatShowP;
		for ( let i=0; i<4; i++ ) {
			localStorage.setItem( "parkUserStatColorP"+(i+1), userStatColorP[i] );
		}
	}
}
function deleteUserData()
{
	if ( typeof(Storage) !== "undefined")
	{
		localStorage.removeItem("parkSaveData");
		localStorage.removeItem("parkUserDetails");	
		localStorage.removeItem("parkUserShow");
		localStorage.removeItem("parkUserBgColor");
		localStorage.removeItem("parkUserMinFree");
		localStorage.removeItem("parkUserDataRefresh");
		localStorage.removeItem("parkUserStatGraph");
		localStorage.removeItem("parkUserStatShowP");
		for ( let i=0; i<4; i++ ) {
			localStorage.removeItem( "parkUserStatColorP"+(i+1) );
		}
	}
}


/************************* Henting av oppdaterte parkeringsplassdata *************************/

let numSets = 0;			//antall datasett som er hentet til nå
let avgNum = [0,0,0,0];		//gjennomsnitt opptatte plasser per parkering
let avgFree = [0,0,0,0];	//gjennomsnitt ledige plasser per parkering
let prcTaken = [0,0,0,0];	//belegg i prosent per parkering
let pauseES = false;		//status for om datastrømmen er på pause eller ikke

// Init av henting av parkeringsdata
function initData()
{
	//Stopp eventuell pågående datastrøm	
	parkES && parkES.close();						
	
	//Opprett ny datastrøm
	pauseES = false;
	parkES = new EventSource('hent-status.php?t='+userDataRefresh);
	parkES.onmessage = function(e) {
		let tmpData = e.data.split(';');							//Dataene fra source, splitt opp i ett sett for hver parkering
		let graphId = $("input[name='statP']:checked").attr("id");  //Eventuell parkering valgt av bruker for grafisk visning ("P1"/"P2"/"P3"/"P4")
		let timeStr = new Date();									//Timestamp
		timeStr = timeStr.toTimeString().slice(0,8);
		numSets++;
		
		//Gå igjennom dataene for hver parkering
		$.each(tmpData, function(i,v) { 
			let tmp = v.split(',');
			let num = parseInt(tmp[1]);
			let maxnum = parseInt(tmp[2]);
			let free = maxnum - num;
			let percent = Math.round((num/maxnum)*100);
			avgNum[i] = Math.round( ((avgNum[i]*(numSets-1))+num) / numSets );
			avgFree[i] = Math.round( ((avgFree[i]*(numSets-1))+free) / numSets );
			
			//Oppdater objektet for aktuell parkering
			parkData[i] = {
				id: tmp[0],
				num: num,
				free: free,
				maxnum: maxnum,
				timestamp: timeStr
			};
			
			//Vis data: Tall
			$("#maxnumP"+(i+1)).text(maxnum);
			$("#numP"+(i+1)).text(num);
			$("#freeP"+(i+1)).text(free);			
			$("#prcP"+(i+1)).text(percent);
			
			//Vis data: Gjennomsnittstall
			$("#avgNumP"+(i+1)).text(avgNum[i]);
			$("#avgFreeP"+(i+1)).text(avgFree[i]);			
			$("#avgPrcP"+(i+1)).text( Math.round((avgNum[i]/maxnum)*100) );		
			
			//Vis eventuelt statistikk grafisk (hvis det er aktuell parkering som skal vises)
			if ( $("#statGraph").prop("checked") && graphId != undefined && parseInt(graphId.slice(-1)) === (i+1) ) {
				// Tegn søyle for dette datasettet
				drawGraph( parkData[i].timestamp, percent, userStatColorP[i]);
			}
		});
		
		//Vis timestamp i tabellen - fading ut og inn for å vise at noe skjer
		$("#timeStamp").fadeOut( function() { 
			$("#timeStamp").text(timeStr).fadeIn();
		});
		
		// Vis oppdaterte parkeringsdata på kartet
		updateParking();	
	};

	//Oppdater status i overskrift og på pause-knappen
	$("#waitIcon").fadeIn();
	$("#pauseIcon").html("pause");
}
function pauseData()
{
	//Stopp pågående datastrøm	
	pauseES = true;
	parkES && parkES.close();	
	
	//Oppdater status i overskrift og på pause-knappen
	$("#waitIcon").hide();
	$("#pauseIcon").html("play_arrow");
}


/************************* Kartfunksjoner *************************/

// Hent kartet, sett markør for brukers posisjon hvis denne definert
// Bruker statisk Google API (kunne valgt Javascript API og marker objektene via dette istedenfor på canvas)
function showMap(width,height)
{
	$("#map").attr("src", 
		"https://maps.googleapis.com/maps/api/staticmap?center=" + mapCenter.lat + "," + mapCenter.lng +
		"&zoom=14&key=AIzaSyAL58Of35Vjc2CeUAbSPXc1zd1ugUmYL4Q" +
		"&size=" + width + "x" + height +
		( userShow ? "&markers=color:blue%7C" + userPos.lat + "," + userPos.lng : "" )
	);
}

// Posisjon ikke kan vises
function geoError()
{
	userShow = false;
	$("#msg").text("Geodata er ikke tilgjengelig");
	$("#uiUserShow").prop( "disabled", true );
}

// Hent kartet og legg på canvas overlay
function initMap()  
{
	let mapWidth, mapHeight;

	$("#map").css("height", $("#map").css("width"));
	mapWidth = parseInt($("#map").css("width"));
	mapHeight = parseInt($("#map").css("height"));
	
	if( userShow ) {
		if ( navigator.geolocation ) {
			// Hvis geolokasjone er tilgjengelig, hent denne
			navigator.geolocation.getCurrentPosition( function(pos) {
				userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				if ( userPos.lat == undefined || userPos.lng == undefined ) {
					geoError();
				}
				//Må kalle denne her, fordi kallet på geolokasjon er asykront
				showMap(mapWidth,mapHeight);					
			});
		} else {
			geoError();
			showMap(mapWidth,mapHeight);
		}
	} else {
		//Uten brukers posisjon (ikke valgt)
		showMap(mapWidth,mapHeight);
	}
	
	//Press ut høyden på kolonnen (for at kolonne 2 skal komme pent under på små skjermer
	$("#col1").css("height", $("#col1 header").outerHeight(true) + $("#map").outerHeight(true) + "px" );

	// Sett canvas til å overlappe kartet
	mapCanvas.width = mapWidth;
	mapCanvas.height = mapHeight;
	$("#mapOverlay").css("width", mapCanvas.width );		// Må sette css-bredde lik canvas-bredde, eller blir proposjonene på canvas feil.
	$("#mapOverlay").css("height", mapCanvas.height );		// Må sette css-høyde lik canvas-høyde, eller blir proposjonene på canvas feil.
	
	// Sett opp delta for punktberegning etter kartstørrelsen
	d = (640-mapCanvas.width)/2;  
}


/*********************** Visning av parkeringsdata ************************/
let canvasOK = false;
let mapCanvas = $("#mapOverlay")[0];
const colNorm = '#015fa9';
const colDanger = '#dabd4b';
const colFull = '#ee1010';

// Sjekk støtte for canvas i nettleser
function checkForCanvas()
{
	let canvas = document.createElement('canvas');
	canvasOK = canvas.getContext;
	return canvasOK;
}

/* stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing */
function clearCanvas( canvas )
{
	let ctx = canvas.getContext("2d");
	ctx.save();
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.restore();	
}
/* http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object 
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) 
{
  if (typeof stroke == 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}
//Function to get mouse position relative to given canvas
function getMousePos (canvas, e) {
	let rect = canvas.getBoundingClientRect();
	return {
	  x: e.clientX - rect.left,
	  y: e.clientY - rect.top
	};
  }			
  
// Vis alle data om ett P-hus
function showAllData( num )
{
	if ( canvasOK ) 
	{
		//Finn hjørnene til infoboksen
		let ctx = mapCanvas.getContext("2d");
		let x1 = parkInfo[i].x1;
		let y1 = parkInfo[i].y1-62;
		let x2 = x1 + 150;
		let y2 = parkInfo[i].y2;
		
		//Fjern eksisterende infoboks
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect( parkInfo[i].x1, parkInfo[i].y1, parkInfo[i].x2-parkInfo[i].x1, parkInfo[i].y2-parkInfo[i].y1 );
		ctx.restore();	
		
		//Tegn opp en ny og større infoboks
		ctx.beginPath();
		ctx.fillStyle = ( (parkData[num].free==0) ? colFull : (parkData[num].free/parkData[num].maxnum<0.2) ? colDanger : colNorm );	//farge på skiltet (rød/gul/blå)
		ctx.strokeStyle = 'white';
		ctx.lineWidth = 1;
		roundRect( ctx, x1, y1, x2-x1, y2-y1, 10, true, true );
		ctx.lineWidth = 2;
		roundRect( ctx, x1+4, y1+4, x2-x1-8, y2-y1-8, 5, true, true );
		ctx.font = 'bold 14px Arial';
		ctx.fillStyle = 'white';	
		ctx.fillText( parkInfo[i].name, x1+10, y1+20 );
		ctx.font = '13px Arial';
		ctx.fillText( "Ledig: " + parkData[i].free, x1+10, y1+35 );	
		ctx.fillText( "Kapasitet: " + parkData[i].maxnum, x1+10, y1+50 );	
		ctx.fillText( "Pris: " + parkInfo[i].price, x1+10, y1+65 );	
		ctx.fillText( "Åpent: " + parkInfo[i].hours, x1+10, y1+80 );	
		
		// Stopp datastrømmen
		pauseData();
	}
}

// Oppdater data for alle parkeringshusene
function updateParking()
{
	if ( canvasOK ) 
	{
		let ctx = mapCanvas.getContext("2d");
		clearCanvas(mapCanvas);
		
		// Tegn opp parkeringshusene
		for ( i=0; i<parkInfo.length; i++ ) {
			if ( parkData[i].free >= userMinFree )
			{
				//Sett koordinater til rektangel (brukes også til å fange mus og klikk)
				parkInfo[i].x1 = parkInfo[i].x-d-15;
				parkInfo[i].x2 = parkInfo[i].x1+(userDetails?91:38);
				parkInfo[i].y1 = parkInfo[i].y-d-(userDetails?56:40);
				parkInfo[i].y2 = parkInfo[i].y-d-10;
				
				//Rektangel med utseende som et P-skilt - fargen settes etter om belegg er < eller > enn 80%, eller fullt
				ctx.beginPath();
				ctx.fillStyle = ( (parkData[i].free==0) ? colFull : (parkData[i].free/parkData[i].maxnum<0.2) ? colDanger : colNorm );	//farge på skiltet (rød/gul/blå)
				ctx.strokeStyle = 'white';
				ctx.lineWidth = 1;
				roundRect( ctx, parkInfo[i].x1, parkInfo[i].y1, parkInfo[i].x2-parkInfo[i].x1, parkInfo[i].y2-parkInfo[i].y1, 10, true, true );
				ctx.lineWidth = 2;
				roundRect( ctx, parkInfo[i].x1+4, parkInfo[i].y1+4, parkInfo[i].x2-parkInfo[i].x1-8, parkInfo[i].y2-parkInfo[i].y1-8, 5, true, true );
				
				//Peker til posisjon		
				ctx.beginPath();
				ctx.moveTo( parkInfo[i].x-d-5, parkInfo[i].y-d-11 );
				ctx.lineTo( parkInfo[i].x-d, parkInfo[i].y-d );  //Posisjonen til P-huset
				ctx.lineTo( parkInfo[i].x-d+5, parkInfo[i].y-d-11 );
				ctx.fill();
				
				//Tekst inne i boblen (avhengig av brukes valg)
				ctx.font = 'bold 14px Arial';
				ctx.fillStyle = 'white';
				ctx.fillText( parkInfo[i].id, parkInfo[i].x1+10, parkInfo[i].y1+20 );
				if ( userDetails ) {
					ctx.font = '13px Arial';
					ctx.fillText( "("+parkData[i].maxnum+")", parkInfo[i].x1+30, parkInfo[i].y1+20 );
					ctx.fillText( "Ledig: " + parkData[i].free, parkInfo[i].x1+10, parkInfo[i].y2-11 );	
				}
			}
		}
	}
}


/************************* Grafisk framstilling av statistikk *************************/

let statCanvas = $("#parkStat")[0];			//Canvas for søyler
let statBgCanvas = $("#parkStatBg")[0];		//Canvas for støttelinjer (bakgrunn)
const graphOffsetY = 5;

// Tegn opp støttelinjer (bruker eget canvas)
function initStatGraph()
{
	if ( canvasOK ) 
	{
		let ctx = statBgCanvas.getContext("2d");
		let width = ctx.canvas.width;
		ctx.font = '11px Arial';
		ctx.fillStyle = 'black';
		ctx.beginPath();
		ctx.moveTo( 0, 100+graphOffsetY );
		ctx.lineTo( width, 100+graphOffsetY );
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'black';
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo( 0, 80+graphOffsetY );
		ctx.lineTo( width, 80+graphOffsetY );
		ctx.strokeStyle = colNorm;
		ctx.stroke();
		ctx.fillStyle = colNorm;
		ctx.fillText( "20%", 240, 80+graphOffsetY+4 )
		ctx.beginPath();	
		ctx.moveTo( 0, 60+graphOffsetY );
		ctx.lineTo( width, 60+graphOffsetY );
		ctx.stroke();
		ctx.fillText( "40%", 240, 60+graphOffsetY+4 )
		ctx.beginPath();
		ctx.moveTo( 0, 40+graphOffsetY );
		ctx.lineTo( width, 40+graphOffsetY );
		ctx.stroke();
		ctx.fillText( "60%", 240, 40+graphOffsetY+4 )
		ctx.beginPath();
		ctx.moveTo( 0, 20+graphOffsetY );
		ctx.lineTo( width,20+graphOffsetY );
		ctx.strokeStyle = colDanger;
		ctx.stroke();
		ctx.fillStyle = colDanger;
		ctx.fillText( "80%", 240, 20+graphOffsetY+4 )
		ctx.beginPath();
		ctx.moveTo( 0, 0+graphOffsetY );
		ctx.lineTo( width,0+graphOffsetY );
		ctx.strokeStyle = colFull;
		ctx.stroke();
		ctx.fillStyle = colFull;
		ctx.fillText( "100%", 236, 0+graphOffsetY+4 )
	}
}

// Tegn opp en søyle (percent) i fargen (color) og vis timestamp (time) under y-aksen
function drawGraph( time, percent, color )
{
	if ( canvasOK ) 
	{
		let barWidth = 18;
		let ctx = statCanvas.getContext("2d");
		let width = ctx.canvas.width;
		let height = ctx.canvas.height;
		let x = (numSets-1)*barWidth;
		
		// Sjekk om vi er kommet til enden av canvas
		if ( x >= width ) {
			//Flytt hele innholdet en søyle mot venstre
			let imageData = ctx.getImageData(barWidth, 0, width-barWidth, height);
			ctx.putImageData(imageData, 0, 0);
			ctx.clearRect(width-barWidth, 0, barWidth, height);
			x = width-barWidth;
		}
		// Tegn søylen
		ctx.beginPath();
		ctx.rect( x, (100-percent+graphOffsetY), barWidth, percent );
		ctx.fillStyle = color;
		ctx.fill();
		// Vis klokkeslett under søylen
		ctx.font = '11px Arial';
		ctx.fillStyle = 'black';
		ctx.translate( x+4, 100+graphOffsetY+5 ); 	//posisjon for tekst
		ctx.rotate(Math.PI/2); 						//180 grader
		ctx.fillText( time, 0, 0 );					//vis tiden
		ctx.setTransform(1, 0, 0, 1, 0, 0); 		//tilbakestill context
	}
}
/*********************************************************************************/
