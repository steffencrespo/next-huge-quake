let START_TIME;
let END_TIME;
let MIN_MAGNITUDE;
let ENDPOINT_URL;

function runQuery(data) {
	// this is the initializer function, it runs everything required to start the site 
	START_TIME = $('#js-start-date').val('01/01/2017');
	END_TIME = $('#js-end-date').val('01/02/2017');
	MIN_MAGNITUDE = $('#js-magnitude').val('5');
	getDataFromAPI(printHomePageData);
	$('#js-quake-form').on('submit', function(event){
		event.preventDefault();
		getDataFromAPI(printHomePageData);
	});

	toggleEarthquakePanelContainer(); // hides empty panel container when initialized
	handleClickOnEarthquakeRow();
	handleBackButton();
}

// sets the date range and the magnitude as well as the endpoint for the initial search
function setDateRangeAndMagnitude() {
	START_TIME = $('#js-start-date').val();
	END_TIME = $('#js-end-date').val();
	MIN_MAGNITUDE = $('#js-magnitude').val();
	ENDPOINT_URL = `https://earthquake.usgs.gov/fdsnws/event/1/query?
		format=geojson&starttime=${START_TIME}&endtime=${END_TIME}&minmagnitude=${MIN_MAGNITUDE}`;
}

function getDataFromAPI(callback) {
	setDateRangeAndMagnitude();
	const settings = {
		url: ENDPOINT_URL,
		type: 'GET',
		success: callback
	};
	$.ajax(settings);
}

function handleClickOnEarthquakeRow() {
	/* 
	This function orchestrates the actions triggered by a click on a results row
		when you click on earthquake row
		it populates the panel with earthquake title
		it displays the back button to show the search results again
		it populates the panel with earthquake details
		it hides the search form
	*/
	$('#js-quake-feed').on('click', 'tr', function(event) {
		let earthquakeId = $(this).attr('id');
		let earthquakeDetailedData = [];
		$.ajax({
			url: `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${earthquakeId}&format=geojson`,
			async: false,
			type: 'GET',
			success: function(data) {
				earthquakeDetailedData.push(data);
			}
		});

		let earthquakeName = $(this)[0].textContent;
		toggleEarthquakePanelContainer(); //display panel container
		toggleEarthquakeSearchForm(); //hides search form
		toggleEarthquakesTable(); // hides table
		$('#js-quake-panel-title').text(`${earthquakeName}`);
		addInfoToEarthquakeDetailsPanel(earthquakeDetailedData[0]);
		addEarthquakeMap(earthquakeId);
	});
}

function handleBackButton() {
	/*
	The back button
		cleans quake details panel and toggles visibility of quakes table
		search form and details
	*/
	$('#js-quake-panel-back-btn').on('click', function(e){
		cleanEarthquakeDetailsPanel();
		toggleEarthquakesTable();
		toggleEarthquakeSearchForm();
		toggleEarthquakePanelContainer();
	});
}

// composes the url to get the earthquake map
function addEarthquakeMap(quakeId) {
	let quakeIdURL = `https://earthquake.usgs.gov/earthquakes/eventpage/${quakeId}#map`;
	$('#js-quake-map').attr('src', quakeIdURL);
}

// puts together the details of an earthquake and forms the html for display
function addInfoToEarthquakeDetailsPanel(earthquakeDetailedData) {
	let detailedTimeOfEvent = convertIntoPSTFromUTC(earthquakeDetailedData.properties.time);
	let riskOfTsunami = earthquakeDetailedData.properties.products.geoserve[0].properties.tsunamiFlag ? 'yes' : 'no';

	let earthquakeChosenInfo = {
		timeOfEvent: ['Time of Event - UTC', detailedTimeOfEvent, 'time'],
		country: ['Country', earthquakeDetailedData.properties.place, 'globe'],
		severityAlert: ['<a href="https://earthquake.usgs.gov/data/pager/" target="_blank" text-decoration="none">PAGER Earthquake Impact Alert</a>', detailSeverityAlert(earthquakeDetailedData.properties.alert), 'flash'],
		magnitude: ['<a href="https://earthquake.usgs.gov/learn/topics/measure.php" target="_blank" text-decoration="none">Magnitude - Richter</a>', earthquakeDetailedData.properties.mag, 'scale'],
		riskOfTsunami: ['Risk of Tsunami', riskOfTsunami, 'picture'],
		depth: ['Depth - km', earthquakeDetailedData.properties.products.origin[0].properties.depth, 'sort-by-attributes']
	} 

	let resultsList = '<li class="list-group-item"><span class="badge">earthquakeChosenInfo[key]</span>key</li>';

	Object.keys(earthquakeChosenInfo).forEach(key => $('#js-quake-panel-list').append(`
		<li class="list-group-item">
			<span class="glyphicon glyphicon-${earthquakeChosenInfo[key][2]}" aria-hidden="true"></span>
			<span class="badge">${earthquakeChosenInfo[key][1]}</span>
			${earthquakeChosenInfo[key][0]}
		</li>`
	));
}

// adds a more human understandable definition to the severity alert
function detailSeverityAlert(severity) {
	if (severity == 'green') {
		return 'little to no danger';

	} else if (severity == 'yellow') {
		return 'moderate danger';
	} else if (severity == 'red') {
		return 'high danger';
	} else if (severity == 'orange') {
		return 'significant danger';
	} else if (severity == 'maroon') {
		return 'very high danger';
	} else {
		return 'severity could not be determined';
	}
}

function convertIntoPSTFromUTC(utcTime) {
	return (new Date(utcTime)).toUTCString();
}

function cleanEarthquakeDetailsPanel() {
	$('#js-quake-panel-list li').remove();
}
// TODO: This function is intended to call USGS details page, but right now
// the click listener is set to listen for a click on the EQ row, not the correct behavior

function printHomePageData(data) {
	let allQuakes = '';
	let quakesCounter = data.features.length;
	let dateTimeSum = 0;

	if (quakesCounter < 1) {
		handleNoQuakesFound();
		return;
	}

	for (let i = 0; i < quakesCounter; i++) {
		dateTimeSum += data.features[i].properties.time;
		allQuakes += `
			<tr role="button" id=${data.features[i].id}>
				<td>${data.features[i].properties.mag}</td>
				<td>${data.features[i].properties.place}</td>
				<td>${convertIntoPSTFromUTC(data.features[i].properties.time)}</td> 
			</tr>`;
	}

	generateNextQuakeEstimate(dateTimeSum,quakesCounter);

	$('#js-quake-counter').text(quakesCounter);
	$('#js-quake-search-range').text(`${START_TIME} - ${END_TIME}`);
	$('#js-quake-magnitude').text(MIN_MAGNITUDE);

	$('#js-quake-feed').html(`${allQuakes}`);

	handleSearchWithResults();
}

function generateNextQuakeEstimate(quakeTotalTimeSum, quakeCount) {
	console.log(convertIntoPSTFromUTC(quakeTotalTimeSum/quakeCount));
}

function handleNoQuakesFound() {
	$('#js-quake-table-container').hide(); //hides quake table
	$('#js-no-quake-found-alert').show();
}

function handleSearchWithResults() {
	$('#js-quake-table-container').show(); //shows quake table
	$('#js-no-quake-found-alert').hide();
}

function toggleEarthquakeSearchForm() {
	let searchQuakeForm = $('#js-quake-form-container');
	searchQuakeForm.is(':hidden') ? searchQuakeForm.show() : searchQuakeForm.hide();	
}

function toggleEarthquakePanelContainer() {
	let quakePanelContainer = $('#js-quake-panel-container');
	quakePanelContainer.is(':hidden') ? quakePanelContainer.show() : quakePanelContainer.hide();
}

function toggleEarthquakesTable() {
	let quakeTableContainer = $('#js-quake-table-container');
	quakeTableContainer.is(':hidden') ? quakeTableContainer.show() : quakeTableContainer.hide();
}

$(runQuery());