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
function(declare, req) {

  const Context = declare(null, {

    activeFacilityInfo: {
      facilityId: null,
      levelId: null
    },
    aiim: null,
    autoZoomOnStart: false,
    facilities: null,
    highlightColor: null,
    highlightFacility2D: false,
    i18n: null,
    jsapi: null,
    levels: null,
    map: null, // a v3 map,
    msgPrefix: "",
    selectionUtil: null,
    showAllFloorPlans2D: false,
    toggleFacilityShells: false,
    util: null,
    view: null, // a v4 view,
    watchFacilityClick: false,
    watchFacilityHover: false,

    constructor: function(props) {
      Object.assign(this,props);
    }

  });

  return Context;
});
