Next Huge Quake
===============
> # next-huge-quake - You can't predict when the next big earthquake will happen. Can you?

Summary - What is it for?
---------------

This app offers a simplified search of earthquakes by date and magnitude. 
While this information is all public and can be found on [USGS web site](https://earthquake.usgs.gov/), USGS does not offer a personalized search, it only offers the latest information. It gets harder when you want to research historical data - you have to dig around the web site to find the information.

By using [USGS Earthquake Catalog API](https://earthquake.usgs.gov/fdsnws/event/1/) and [USGS Geoserve map interface](https://earthquake.usgs.gov/ws/geoserve/), Next Huge Quake allows you to find earthquakes by a given date range and magnitude and navigate in the details of the results such as the map of where the quake epicenter was, what was the exact Richter Scale magnitude, where it happened, what was the Earthquake Impact Alert scale, it's depth and even more parameters to come soon.

How to use this app
-------------------
1. Enter the minimum magnitude of the earthquakes you want to search
2. Enter the date range within which you want results from in the format MM/DD/YYYY
	![Enter minimum magnitude and date range](/images/search-parameters.png "Search Parameters")
3. When the results list is displayed, click on the earthquake you want to know more about
	![Results list](/images/results-list.png "Results list")
	As part of the results you also see a brief summary of the amount of quakes found within your parameters ![Brief summary](/images/search-summary.png "Summary")
4. The details are displayed 
	You can zoom in and out and move the map ![Zoom map](/images/map-zoom.png "Zoom map")
	or close the map to see USGS report page ![Close map](/images/close-map.png "Close map") ![See the official page](/images/usgs-page.png "USGS page")
5. To go back to the search, press the Back button

What to expect for the short term future of this app
----------------------------------------------------

I am working on a methodology to predict when the next earthquake will happen based on historical data. This is the real fun that is planned for this app, but due to database and server constraints given the limitation of the USGS API, I decided to postpone it until I get the backend properly functioning.

Technologies Used
-----------------
* HTML
* CSS
* Bootstrap
* JavaScript
* jQuery