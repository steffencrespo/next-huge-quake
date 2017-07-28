let START_TIME;
let END_TIME;
let MIN_MAGNITUDE;
let ENDPOINT_URL;

function runQuery(data) {
	START_TIME = $('#js-start-date').val('01/01/2017');
	END_TIME = $('#js-end-date').val('01/02/2017');
	MIN_MAGNITUDE = $('#js-magnitude').val('5');
	getDataFromAPI(printHomePageData);
	$('#js-quake-form').on('submit', function(event){
		event.preventDefault();
		getDataFromAPI(printHomePageData);
	});
	handleClickOnEarthquakeRow();
}

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
	// https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=us2000a1jq&format=geojson
	// https://earthquake.usgs.gov/earthquakes/eventpage/us2000a1jq#executive
	$('#js-quake-feed').on('click', 'tr', function(event) {
		let earthquakeId = $(this).attr('id');
		earthQuakeDetailsPage = `https://earthquake.usgs.gov/earthquakes/eventpage/${earthquakeId}#executive`;
		window.open(earthQuakeDetailsPage, '_blank');
	});
}

function printHomePageData(data) {
	let allQuakes = '';

	for (let i = 0; i < data.features.length; i++) {
		allQuakes += `<tr id=${data.features[i].id}><td>${data.features[i].properties.mag}</td><td>${data.features[i].properties.place}</td></tr>`;
	}

	$('#js-quake-feed').html(`${allQuakes}`);
}

$(runQuery());