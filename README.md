# indoors-floor-filter-js

This is an ArcGIS API for JavaScript widget that lets you filter ArcGIS Indoors data to view a selected facility (building) and level (floor). Learn about ArcGIS Indoors and the ArcGIS Indoors Information Model (AIIM) [here](https://pro.arcgis.com/en/pro-app/help/data/indoors/get-started-with-arcgis-indoors.htm).

![demo video](./indoors-floorfilter-js-doc-video-demo02.gif "demo video")

## Features
* Automatically detects and reads ArcGIS Indoors map layers
* Provides intuitive way to pick and view data for a particular level
* Select a facility (building) via map click or dropdown list
* Configurable style and behaviors

## Requirements
* An existing ArcGIS API for JavaScript 3.x mapping application. *(Support for the 4.x API coming soon)*
* A map containing layers that conform to the [ArcGIS Indoors Information Model (AIIM) feature classes](https://pro.arcgis.com/en/pro-app/help/data/indoors/arcgis-indoors-information-model.htm#ESRI_SECTION1_E6F8CE6530DE4D0B94CA289D3A4CFA52).
    * Sample ArcGIS Indoors data is available for download from [My Esri](https://my.esri.com/). For more information, see the ArcGIS Pro Help: [Download and install ArcGIS Indoors](https://pro.arcgis.com/en/pro-app/help/data/indoors/download-and-install-arcgis-indoors.htm)
    * At minimum, the widget requires a layer that conforms to the [AIIM Levels feature class](https://pro.arcgis.com/en/pro-app/help/data/indoors/arcgis-indoors-information-model.htm#ESRI_SECTION2_31525AA777E54CDD884C7F2B31F7D51B).
    * Certain widget functions require a layer that conforms to the [AIIM Facilities feature class](https://pro.arcgis.com/en/pro-app/help/data/indoors/arcgis-indoors-information-model.htm#ESRI_SECTION2_B7500B49156641338AADC25F6113607D). Such functions include highlighting when hovering over a facility polygon, or clicking on a facility polygon to activate it in the widget.

## Instructions
1. Download and unzip the .zip file.
1. Copy/paste the `floorfilter` folder into your own project folder.
1. In your app:
    1. Below the existing `<link>` tag that references `esri.css`, add a `<link>` to reference the `floorfilter/style/main.css` file.
    1. Above the existing `<script>` tag that references the ArcGIS API for JavaScript, add a `<script>` to reference the `floorfilter` folder.
1. Add and style a `<div>` in which to display the widget.
1. Add the `floorfilter/FloorFilter` module and alias to your `require()`.
1. Construct a new instance of FloorFilter with a `map` and other options as desired.

For additional details, see the Constructor and Code Examples sections, below.

## Constructor
```
new FloorFilter(properties);
```
The `properties` object must include a `map`; other properties are optional.

| Name                   | Type        | Summary                                                                                                                                                                                                                                                                                                                                                           |
|------------------------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `activeFacilityId`     | `String`    | *(optional)* Activates the specified facility when the widget starts. Value must be found in the Facility layer's `facility_id` field. *default=null*                                                                                                                                                                                                             |
| `activeLevelId`        | `String`    | *(optional)* Activates the specified level when the widget starts. Has no effect if `activeFacilityId` is `null`. Value must be found in the Level layer's `level_id` field. *default=null*                                                                                                                                                                       |
| `autoZoomOnStart`      | `Boolean`   | *(optional)* Zoom the map to the extent of the activated facility when the widget starts. Has no effect if `activeFacilityId` is `null`. *default=true*                                                                                                                                                                                                           |
| `facilitiesUrl`        | `String`    | *(optional)* REST service endpoint URL of a Facilities layer. If `null`, widget looks for the layer in the `Map`. *default=null*                                                                                                                                                                                                                                  |
| `highlightColor`       | `String`    | *(optional)* The outline color used to highlight a facility on mouseover. Value can be a hex string ("#C0C0C0") or a named string ("blue"). *default="#005e95"*                                                                                                                                                                                                   |
| `layerIdentifiers`     | `Object`    | *(optional)* Maps [ArcGIS Indoors Information Model](https://pro.arcgis.com/en/pro-app/help/data/indoors/arcgis-indoors-information-model.htm) feature classes to layers in your map. *default=* ``` {   "sites": ["Sites"],   "facilities": ["Facilities", "Facilities Textured"],   "levels": ["Levels"],   "units": ["Units"],   "details": ["Details"], } ``` |
| `levelsUrl`            | `String`    | *(optional)* REST service endpoint URL of a Levels layer. If `null`, widget looks for the layer in the `Map`. *default=null*                                                                                                                                                                                                                                      |
| `map`                  | `Map` (3.x) | The ArcGIS API for JavaScript 3.x `Map` the widget is associated with.                                                                                                                                                                                                                                                                                            |
| `toggleFacilityShells` | `Boolean`   | *(optional)* Turn off/on a facility's footprint when the facility is activated/deactivated. *default=true*                                                                                                                                                                                                                                                        |
| `watchFacilityClick`   | `Boolean`   | *(optional)* Activate a facility when the user clicks on its footprint. *default=true*                                                                                                                                                                                                                                                                            |
| `watchFacilityHover`   | `Boolean`   | *(optional)* Highlight a facility when the user hovers over its footprint. *default=true*                                                                                                                                                                                                                                                                         |

## Code Examples

#### JavaScript 3.x API
```javascript
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="initial-scale=1, maximum-scale=1,user-scalable=no" />
    <title>ArcGIS Indoors - Floorfilter - JSAPI3</title>
    <link rel="stylesheet" href="https://js.arcgis.com/3.28/dijit/themes/claro/claro.css">
    <link rel="stylesheet" href="https://js.arcgis.com/3.28/esri/css/esri.css">
    <link rel="stylesheet" href="./floorfilter/style/main.css">
    <style>
        html,
        body,
        #map {
            height: 100%;
            margin: 0;
            padding: 0;
        }

        #floorfilter {
            position: absolute;
            top: 20px;
            left: 100px;
        }
    </style>
    <script>
        var dojoConfig = {
            async: true,
            packages: [
                {
                    name: "floorfilter",
                    location: location.pathname.replace(/\/[^/]*$/, "") + "/floorfilter"
                }
            ]
        };
    </script>
    <script src="https://js.arcgis.com/3.28/"></script>
    <script>
        var map;
        require([
            "esri/map",
            "esri/arcgis/utils",
            "floorfilter/FloorFilter",
            "dojo/domReady!"
        ], function (
            Map,
            arcgisUtils,
            FloorFilter) {

                // Your ArcGIS Indoors web map 
                var portalUrl = "https://indoorsportal2.esri.com/portal"; // the web map's hosting portal URL; example: https://myPortal/portal 
                var webmapId = "18f0da0feaa14a68a4a55605a63c8799"; // the web map's item id

                arcgisUtils.arcgisUrl = portalUrl + "/sharing/rest/content/items/";
                arcgisUtils.createMap(webmapId, "map").then(function (response) {
                    var map = response.map;
                    window.map = map;

                    var floorFilter = new FloorFilter({
                        map: map
                    }, "floorfilter");
                });
            });
    </script>
</head>
<body class="claro esri">
    <div id="map"></div>
    <div id="floorfilter"></div>
</body>
</html>
```

#### JavaScript 4.x API
*Support for ArcGIS API for JavaScript 4.x is coming soon.*

## Resources

* [Get Started with ArcGIS Indoors](https://pro.arcgis.com/en/pro-app/help/data/indoors/get-started-with-arcgis-indoors.htm)
* [ArcGIS Indoors Information Model](https://pro.arcgis.com/en/pro-app/help/data/indoors/arcgis-indoors-information-model.htm#ESRI_SECTION1_E6F8CE6530DE4D0B94CA289D3A4CFA52)
* [ArcGIS API for JavaScript 3.x - API Reference](https://developers.arcgis.com/javascript/3/jsapi/)

## Issues
Find a bug or want to request a new feature? Please let us know by submitting an issue.

## Contributing
Anyone and everyone is welcome to contribute.

## Licensing
Copyright 2019 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [LICENSE.txt](https://github.com/Esri/indoors-floor-filter-js/blob/master/LICENSE.txt) file.
