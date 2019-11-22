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
define([
  "require",
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",
  "dojo/i18n!./nls/resources",
  "./base/Aiim",
  "./base/Context",
  "./base/Facilities",
  "./base/FloorFilter_dom",
  "./base/Levels",
  "./base/selectionUtil",
  "./base/util"
],
function(req, declare, lang, _WidgetBase, _TemplatedMixin,
  i18n, Aiim, Context, Facilities, FloorFilter_dom, Levels,
  selectionUtil, util) {

  const FloorFilter = declare([_WidgetBase, _TemplatedMixin], {

    activeFacilityId: null,
    activeLevelId: null,
    autoZoomOnStart: true,
    facilitiesUrl: null, // required for 3D
    highlightColor: "#005e95", // or this format [0, 255, 255, 0.66]
    highlightFacility2D: true,
    layerIdentifiers: null,
    layerMappings: null,
    levelsUrl: null, // required for 3D
    map: null,
    showAllFloorPlans2D: true,
    toggleFacilityShells: true,
    watchFacilityClick: true,
    watchFacilityHover: null,
    view: null,

    _context: null,
    _floorFilter_dom: null,

    templateString: "<div class='i-floorfilter'></div>",

    postCreate: function() {
      this.inherited(arguments);
      this._init();
    },

    destroy: function() {
      try {
        if (this._context && this._context.jsapi) {
          this._context.jsapi.destroy();
        }
      } catch(ex) {
        console.error(ex);
      }
      this.inherited(arguments);
    },

    onChange: function(props) {},

    setFacility: function(params) {
      if (this._floorFilter_dom) {
        this._floorFilter_dom._setFacility(params);
      }
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _init: function() {

      //this.activeFacilityId = "ESRI.RED.MAIN.O";
      //this.activeLevelId = "ESRI.RED.MAIN.O2";

      const msgPrefix = "FloorFilter - ";

      const hasV3Map = (this.map && typeof this.map.onLayerAdd === "function");
      const hasV4View2D = (this.view && this.view.type === "2d");
      const hasV4View3D = (this.view && this.view.type === "3d");

      if (!hasV3Map && !hasV4View2D && !hasV4View3D) {
        console.error(msgPrefix+"a version 3.* 'map', or a version 4.* 'view' is required");
        return;
      }

      if (typeof this.watchFacilityHover !== "boolean") {
        if (hasV4View3D) this.watchFacilityHover = true;
        else this.watchFacilityHover = false;
      }

      let context = this._context = new Context({
        aiim: null,
        autoZoomOnStart: this.autoZoomOnStart,
        highlightColor: this.highlightColor,
        highlightFacility2D: this.highlightFacility2D,
        i18n: i18n,
        jsapi: null,
        levels: null,
        map: this.map,
        msgPrefix: msgPrefix,
        selectionUtil: selectionUtil,
        showAllFloorPlans2D: this.showAllFloorPlans2D,
        toggleFacilityShells: this.toggleFacilityShells,
        util: util,
        view: this.view,
        watchFacilityClick: this.watchFacilityClick,
        watchFacilityHover: this.watchFacilityHover,
      });
      context.activeFacilityInfo.facilityId = this.activeFacilityId;
      context.activeFacilityInfo.levelId = this.activeLevelId;

      const task = {
        context: context,
        map: context.map,
        view: context.view,
      };

      let floorFilter_dom = this._floorFilter_dom = new FloorFilter_dom({
        context: context,
        domNode: this.domNode
      });
      floorFilter_dom._onChange = (props) => {
        this.onChange(props);
      };

      let hasFatal = false;
      this._loadContextJsapi(context).then(() => {
        //console.log("Context loaded......");
      }).then(() => {
        context.aiim = new Aiim({
          context: context
        });
        context.aiim.configureLayerIdentifiers(this.layerIdentifiers);
        context.aiim.configureLayerMappings(this.layerMappings) ;
        return context.aiim.load(task);
      }).then(() => {
        let url = (this.levelsUrl || context.aiim.getLevelsUrl());
        context.levels = new Levels({
          context: context,
          url: context.util.checkMixedContent(url)
        });
        if (!url) {
          hasFatal = true;
          console.error(context.msgPrefix+"a 'levelsUrl' is required.");
        } else {
          return context.levels.load(task);
        }
      }).then(() => {
        let url = (this.facilitiesUrl || context.aiim.getFacilitiesUrl());
        context.facilities = new Facilities({
          context: context,
          url: context.util.checkMixedContent(url)
        });
        if (url) {
          if (context.levels && context.levels.hasData()) {
            return context.facilities.load(task);
          }
        }
      }).then(() => {
        if (!hasFatal && context.levels) {
          if (context.levels.hasData()) {
            floorFilter_dom.startup();
          } else {
            console.error(context.msgPrefix+"no levels were found");
          }
        }
      }).catch(ex => {
        console.warn(msgPrefix+"error loading widget");
        console.error(ex);
        return;
      });
    },

    _loadContextJsapi: function(context) {
      const promise = new Promise((resolve,reject) => {
        const {map, view} = context;
        let jsapiPath = null;
        if (map && map.declaredClass === "esri.Map") {
          jsapiPath = "./base/Jsapi_v3";
        } else if (view &&
            (view.declaredClass === "esri.views.MapView" ||
             view.declaredClass === "esri.views.SceneView")) {
          jsapiPath = "./base/Jsapi_v4";
        }
        if (jsapiPath) {
          req([jsapiPath],(Jsapi) => {
            context.jsapi = new Jsapi({
              context: context
            });
            resolve();
          });
        } else {
          const msg = context.msgPrefix + "Unable to determine JSAPI context.";
          reject(new Error(msg));
        }
      });
      return promise;
    }

  });

  return FloorFilter;
});
