let START_TIME;
let END_TIME;
let MIN_MAGNITUDE;
let ENDPOINT_URL;

function runQuery(data) {
	START_TIME = $('#js-start-date').val('01/01/2017');
	END_TIME = $('#js-end-date').val('01/02/2017');
	MIN_MAGNITUDE = $('#js-magnitude').val('5');
	getDataFromAPI(printData);
	$('#js-quake-form').on('submit', function(event){
		event.preventDefault();
		getDataFromAPI(printData);
	});
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

function printData(data) {
	// data.features[0].properties.place
	let allQuakes = '';

	for (let i = 0; i < data.features.length; i++) {
		allQuakes += `<tr id='js-row-${i}'><td>${data.features[i].properties.mag}</td><td>${data.features[i].properties.place}</td></tr>`
		// allQuakes.push(data.features[i].properties.place);
	}

	// $('#js-location-feed').append(`${data.features[0].properties.place}`);
	$('#js-quake-feed').html(`${allQuakes}`);
	// $('#js-quake-counter').append(`There has been ${data.features.length} earthquakes of magnitude ${MIN_MAGNITUDE}+`);
}

$(runQuery());