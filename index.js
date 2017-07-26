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
	$('.container').append(`${data.features[0].properties.place}`);
}

$(runQuery());