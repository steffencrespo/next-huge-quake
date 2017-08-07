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

	_toggleEarthquakePanelContainer(); // hides empty panel container when initialized

	handleClickOnEarthquakeRow();
	handleBackButton();
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
	/* click on earthquake row
		populate panel with earthquake title
		display back button to show form again
		populate panel with earthquake details
		hide search form
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
		_toggleEarthquakePanelContainer(); //display panel container
		_toggleEarthquakeSearchForm(); //hides search form
		_toggleEarthquakesTable(); // hides table
		$('#js-quake-panel-title').text(`${earthquakeName}`);
		_addInfoToEarthquakeDetailsPanel(earthquakeDetailedData[0]);
		_addEarthquakeMap(earthquakeId);
	});
}

function handleBackButton() {
	$('#js-quake-panel-back-btn').on('click', function(e){
		_cleanEarthquakeDetailsPanel();
		_toggleEarthquakesTable();
		_toggleEarthquakeSearchForm();
		_toggleEarthquakePanelContainer();
	});
}

function _addEarthquakeMap(quakeId) {
	let quakeIdURL = `https://earthquake.usgs.gov/earthquakes/eventpage/${quakeId}#map`;
	$('#js-quake-map').attr('src', quakeIdURL);
}

function _addInfoToEarthquakeDetailsPanel(earthquakeDetailedData) {
	let earthquakeChosenInfo = {
		magnitude: ['Magnitude', earthquakeDetailedData.properties.mag],
		severityAlert: ['Severity Alert', earthquakeDetailedData.properties.alert],
		riskOfTsunami: ['Risk of Tsunami', earthquakeDetailedData.properties.products.geoserve[0].properties.tsunamiFlag],
		timeOfEvent: ['Time of Event', earthquakeDetailedData.properties.time],
		country: ['Country', earthquakeDetailedData.properties.place],
		depth: ['Depth', earthquakeDetailedData.properties.products.origin[0].properties.depth]
	} 

	console.log(earthquakeChosenInfo);

	let resultsList = '<li class="list-group-item"><span class="badge">earthquakeChosenInfo[key]</span>key</li>';

	Object.keys(earthquakeChosenInfo).forEach(key => $('#js-quake-panel-list').append(`
		<li class="list-group-item">
			<span class="badge">${earthquakeChosenInfo[key][1]}</span>
			${earthquakeChosenInfo[key][0]}
		</li>`
	));
}

function _cleanEarthquakeDetailsPanel() {
	$('#js-quake-panel-list li').remove();
}
// TODO: This function is intended to call USGS details page, but right now
// the click listener is set to listen for a click on the EQ row, not the correct behavior

function printHomePageData(data) {
	let allQuakes = '';

	for (let i = 0; i < data.features.length; i++) {
		allQuakes += `<tr id=${data.features[i].id}><td>${data.features[i].properties.mag}</td><td>${data.features[i].properties.place}</td></tr>`;
	}

	$('#js-quake-feed').html(`${allQuakes}`);
}

function _toggleEarthquakeSearchForm() {
	let searchQuakeForm = $('#js-quake-form-container');
	searchQuakeForm.is(':hidden') ? searchQuakeForm.show() : searchQuakeForm.hide();	
}

function _toggleEarthquakePanelContainer() {
	let quakePanelContainer = $('#js-quake-panel-container');
	quakePanelContainer.is(':hidden') ? quakePanelContainer.show() : quakePanelContainer.hide();
}

function _toggleEarthquakesTable() {
	let quakeTableContainer = $('#js-quake-table-container');
	quakeTableContainer.is(':hidden') ? quakeTableContainer.show() : quakeTableContainer.hide();
}

$(runQuery());