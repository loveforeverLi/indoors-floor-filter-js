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
    layerIdentifiers: null,
    levelsUrl: null, // required for 3D
    map: null,
    toggleFacilityShells: true,
    watchFacilityClick: true,
    watchFacilityHover: true,
    view: null,

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

    _init: function() {

      //this.activeFacilityId = "ESRI.RED.MAIN.O";
      //this.activeLevelId = "ESRI.RED.MAIN.O2";

      const msgPrefix = "FloorFilter - ";

      const hasV3Map = (this.map && typeof this.map.onLayerAdd === "function");
      const hasV4View2D = (this.view && this.view.type === "2d");
      const hasV4View3D = (this.view && this.view.type === "3d");

      if (!hasV3Map) {
        console.error(msgPrefix+"a version 3.* 'map' is required.");
        return;
      }

      // if (!hasV3Map && !hasV4View2D && !hasV4View3D) {
      //   console.error(msgPrefix+"a version 3.* 'map', or a version 4.* 'view' is required");
      //   return;
      // }

      let context = this._context = new Context({
        aiim: null,
        autoZoomOnStart: this.autoZoomOnStart,
        highlightColor: this.highlightColor,
        i18n: i18n,
        jsapi: null,
        levels: null,
        map: this.map,
        msgPrefix: msgPrefix,
        selectionUtil: selectionUtil,
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

      let floorFilter_dom = new FloorFilter_dom({
        context: context,
        domNode: this.domNode
      });

      let hasFatal = false;
      this._loadContextJsapi(context).then(() => {
        //console.log("Context loaded......");
      }).then(() => {
        context.aiim = new Aiim({
          context: context
        });
        context.aiim.configureLayerIdentifiers(this.layerIdentifiers);
        return context.aiim.load(task);
      }).then(() => {
        //console.log("Aiim loaded......");
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
        //console.log("Levels loaded......");
        let url = (this.facilitiesUrl || context.aiim.getFacilitiesUrl());
        context.facilities = new Facilities({
          context: context,
          url: context.util.checkMixedContent(url)
        });
        if (!url) {
          //console.error(context.msgPrefix+"a 'facilitiesUrl' is required.");
        } else {
          if (context.levels && context.levels.hasData()) {
            return context.facilities.load(task);
          }
        }
      }).then(() => {
        //console.log("Facilities loaded......");
        if (!hasFatal && context.levels) {
          if (context.levels.hasData()) {
            floorFilter_dom.startup();
            //console.log(context.msgPrefix+"started...");
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
        //console.log(req.toUrl("./Jsapi"));
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
            //console.log("context.jsapi.isV4",context.jsapi.isV4);
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
