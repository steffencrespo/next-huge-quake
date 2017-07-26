const ENDPOINT_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2014-01-01&endtime=2014-01-02&minmagnitude=5';

function runQuery(data) {
	getDataFromAPI(printData);
}

function getDataFromAPI(callback) {	
	const settings = {
		url: ENDPOINT_URL,
		type: 'GET',
		success: callback
	};
	$.ajax(settings);
}

function printData(data) {
	// data.features[0].properties.place
	$('#js-location-feed').append(`${data.features[0].properties.place} earthquakes`);
	$('#js-quake-counter').append(`There has been ${data.features.length}`);
}

$(runQuery());