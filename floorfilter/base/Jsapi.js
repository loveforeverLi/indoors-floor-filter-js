/* Copyright 2019 Esri
 *
 * Licensed under the Apache License Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define(["dojo/_base/declare"],
function(declare) {

  const Jsapi = declare(null, {

    context: null,
    isV3: false,
    isV4: false,

    addFacilityHighlight: function(task,facility,facilityId) {
      throw new Error("Jsapi::addFacilityHighlight must be inplemented by sub-class.");
    },

    clearFacilityHighlight: function(task) {
      throw new Error("Jsapi::clearFacilityHighlight must be inplemented by sub-class.");
    },

    clearFacilityHoverHighlight: function(task) {
      throw new Error("Jsapi::clearFacilityHoverHighlight must be inplemented by sub-class.");
    },

    destroy: function() {
    },

    flattenSubLayers: function(task,mapServiceLayer) {
      throw new Error("Jsapi::flattenSubLayers must be inplemented by sub-class.");
    },

    getLayerDefinitionExpression: function(task,layer) {
      throw new Error("Jsapi::getLayerDefinitionExpression must be inplemented by sub-class.");
    },

    getLayers: function(task) {
      throw new Error("Jsapi::getLayers must be inplemented by sub-class.");
    },

    is3D: function() {
      return false;
    },

    isFeatureLayer: function(task,layer) {
      throw new Error("Jsapi::isFeatureLayer must be inplemented by sub-class.");
    },

    isMapServiceLayer: function(task,layer) {
      throw new Error("Jsapi::isMapServiceLayer must be inplemented by sub-class.");
    },

    queryLayer: function(task,url,queryProps) {
      throw new Error("Jsapi::queryLayer must be inplemented by sub-class.");
    },

    setLayerDefinitionExpression: function(task,layer,expression) {
      throw new Error("Jsapi::setLayerDefinitionExpression must be inplemented by sub-class.");
    },

    waitForLayer: function(task,layer) {
      throw new Error("Jsapi::waitForLayer must be inplemented by sub-class.");
    },

    waitForMap: function(task) {
      throw new Error("Jsapi::waitForMap must be inplemented by sub-class.");
    },

    waitForMapService: function(task,layer) {
      throw new Error("Jsapi::waitForMapService must be inplemented by sub-class.");
    },

    waitForSubLayers: function(task,mapServiceInfo) {
      throw new Error("Jsapi::waitForSubLayers must be inplemented by sub-class.");
    },

    watchFacilityShells: function() {
      throw new Error("Jsapi::watchFacilityShells must be inplemented by sub-class.");
    },

    zoomToFeature: function(task,feature) {
      throw new Error("Jsapi::zoomToFacility must be inplemented by sub-class.");
    }

  });

  return Jsapi;
});
