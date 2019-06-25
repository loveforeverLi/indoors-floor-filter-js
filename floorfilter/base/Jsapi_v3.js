define([
  "dojo/_base/declare",
  "./Jsapi",
  "esri/Color",
  "esri/geometry/geometryEngine",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
	"esri/tasks/QueryTask",
  "esri/tasks/query"
 ],
function(declare, Jsapi, Color, geometryEngine, FeatureLayer, GraphicsLayer,
  SimpleLineSymbol,SimpleFillSymbol, QueryTask, Query) {

  const Jsapi_v3 = declare([Jsapi], {

    isV3: true,

    _handles: null,
    _highlightGraphicsLayer: null,
    _highlightedFacilityId: null,

    constructor: function(props) {
      Object.assign(this,props);
      this._handles = [];
    },

    clearFacilityHighlight: function(task) {
      if (this._highlightGraphicsLayer) {
        this._highlightGraphicsLayer.clear();
      }
      this._highlightedFacilityId = null;
    },

    destroy: function() {
      this._clearHandles();
    },

    getLayerDefinitionExpression: function(task,layer) {
      if (typeof layer.getDefinitionExpression === "function") {
        return layer.getDefinitionExpression();
      }
    },

    getLayers: function(task) {
      const map = task && task.map;
      if (map) {
        const ids = [], layers = [];
        const layerIds = map.layerIds;
        const graphicsLayerIds = map.graphicsLayerIds;
        // bottom to top
        if (layerIds) {
          layerIds.forEach(id => ids.push(id));
        }
        if (graphicsLayerIds) {
          graphicsLayerIds.forEach(id => ids.push(id));
        }
        ids.forEach(id => {
          let layer = map.getLayer(id);
          if (layer) layers.push(layer);
        });
        return layers;
      }
      return [];
    },

    is3D: function() {
      return false;
    },

    isFeatureLayer: function(task,layer) {
      return (layer && layer.declaredClass === "esri.layers.FeatureLayer");
    },

    isMapServiceLayer: function(task,layer) {
      return (layer && layer.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer");
    },

    queryLayer: function(task,url,queryProps) {
      const context = this.context;
      const promise = new Promise((resolve,reject) => {
        const query = new Query();
        const task = new QueryTask(url);
        Object.assign(query,queryProps);
        if (context.map && query.returnGeometry) {
          query.outSpatialReference = context.map.spatialReference;
        }
        task.execute(query).then(result => {
          resolve(result);
        }).otherwise(ex => {
          console.warn("FloorFilter: error querying layer",url);
          reject(ex);
        });
      });
      return promise;
    },

    setLayerDefinitionExpression: function(task,layer,expression) {
      if (typeof layer.setDefinitionExpression === "function") {
        layer.setDefinitionExpression(expression);
      }
    },

    waitForLayer: function(task,layer) {
      const promise = new Promise((resolve,reject) => {
        if (layer.loaded) {
          resolve(layer);
        } else if (layer.loadError) {
          // reject?
          resolve();
        } else {
          this._handles.push(layer.on("load",(info) => {
            //console.log("********** waitForLayer.info",info);
            resolve(info && info.layer);
          }));
          this._handles.push(layer.on("error",() => {
            // reject?
            resolve();
          }));
        }
      });
      return promise;
    },

    waitForMap: function(task) {
      const promise = new Promise((resolve,reject) => {
        if (task.map && !task.map.loaded) {
          this._handles.push(task.map.on("load",() => {
            resolve();
          }));
        } else {
          resolve();
        }
      });
      return promise;
    },

    waitForMapService: function(task,layer,callback) {
      const promise = new Promise((resolve,reject) => {
        if (layer && layer.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer") {
          let mapServiceInfo = {
            mapServiceLayer: null,
          };
          this.waitForLayer(task,layer).then(lyr => {
            if (lyr) {
              mapServiceInfo.mapServiceLayer = lyr;
              mapServiceInfo.mapServiceLayerId = lyr.id
            }
          }).then(() => {
            if (mapServiceInfo.mapServiceLayer) {
              return this.waitForSubLayers(task,mapServiceInfo);
            }
          }).then(() => {
            //console.log("waitForMapService.waitForSubLayers",mapServiceInfo);
            if (callback) callback(mapServiceInfo);
            resolve(mapServiceInfo);
          }).catch(ex => {
            reject(ex);
          });
        } else {
          resolve();
        }
      });
      return promise;
    },

    waitForSubLayers: function(task,mapServiceInfo) {
      const promise = new Promise((resolve,reject) => {
        const promises = [];
        const mapServiceLayer = mapServiceInfo.mapServiceLayer;
        // mapServiceLayer.dynamicLayerInfos ??
        //const layerInfos = mapServiceLayer.dynamicLayerInfos || mapServiceLayer.layerInfos;
        const layerInfos = mapServiceLayer.layerInfos;
        if (layerInfos) {
          layerInfos.forEach(layerInfo => {
            if (!layerInfo.subLayerIds && layerInfo.type === "Feature Layer") {
              // skip group layers and non feature layers
              promises.push(this._createSubFeatureLayer(task,mapServiceInfo,layerInfo));
            }
          });
        }
        if (promises.length > 0) {
          Promise.all(promises).then(() => {
            //console.log("Jsapi_v3::waitForSubLayers.all");
            resolve();
          }).catch(ex => {
            reject(ex);
          });
        } else {
          resolve();
        }
      });
      return promise;
    },

    watchFacilityShells: function() {
      const context = this.context;
      const map = this.context.map;
      const facilities = context.facilities;
      if (map && facilities &&
         (context.watchFacilityClick || context.watchFacilityHover)) {
        this._watchFacilities(map,facilities);
      }
    },

    zoomToFeature: function(task,feature) {
      const bufferMeters = 10;
      const map = task.map;
      if (!map || !feature || !feature.geometry) return Promise.resolve();

      let extent = null, geometry, type = feature.geometry.type;
      if (type === "point" || type === "extent") {
        geometry = geometryEngine.geodesicBuffer(feature.geometry,bufferMeters,"meters");
      } else if (typeof feature.geometry.getExtent === "function") {
        const ext = feature.geometry.getExtent();
        geometry = geometryEngine.geodesicBuffer(ext,bufferMeters,"meters");
      }
      if (geometry && typeof geometry.getExtent === "function") {
        extent = geometry.getExtent();
      }
      if (extent) {
        const fit = true;
        map.setExtent(extent,fit);
        return Promise.resolve();
      } else {
        return Promise.resolve();
      }
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _clearHandles() {
      if (this._handles) {
        this._handles.forEach((h) => {
          try {
            h.remove();
          } catch(ex) {
            console.error(ex);
          }
        });
      }
      this._handles = [];
    },

    _createSubFeatureLayer: function(task,mapServiceInfo,layerInfo) {
      const promise = new Promise((resolve,reject) => {
        const mapServiceLayer = mapServiceInfo.mapServiceLayer;
        if (layerInfo.subLayerIds || layerInfo.type !== "Feature Layer") {
          // skip group layers and non feature layers
          resolve();
        } else {
          const subLayerId = layerInfo.id;
          const id = this.context.util.randomId() + "-sublayer";
          const url = mapServiceLayer.url + "/" + subLayerId; // ? /dynamicLayer
          const featureLayer = new FeatureLayer(url, {
            parentLayer: mapServiceLayer,
            id: id,
            outFields: ["*"],
            mode: FeatureLayer.MODE_SELECTION,
            drawMode: false,
            visible: mapServiceLayer.visible,
            autoGeneralize: true
          });
          this.waitForLayer(task,featureLayer).then(lyr => {
            if (lyr) {
              if (typeof task.addSubLayerInfo === "function") {
                task.addSubLayerInfo(task,mapServiceInfo,{
                  subLayerId: subLayerId,
                  selectionFeatureLayer: featureLayer
                });
              }
            }
            resolve();
          }).catch(ex => {
            console.log("Error Jsapi_v3::createSubFeatureLayer",layerInfo.name,layerInfo.id);
            console.error(ex);
            // reject??
            resolve();
          });
        }
      });
      return promise;
    },

    _facilityHitTest: function(map,facilities,evt) {
      let facility;
      const features = facilities.getFeatures() || [];
      if (features && features.length > 0) {
        const point = evt.mapPoint;
        if (point) {
          features.some(f => {
            if (f && f.geometry && f.geometry.type === "polygon" &&
                f.geometry.contains(point)) {
              facility = f;
              return true;
            }
            return false
          });
        }
      }
      return facility;
    },

    _watchFacilities: function(map,facilities) {
      const context = this.context;
      const aiim = context.aiim;
      const util = context.util;
      const facilityIdField = context.aiim.FieldNames.FACILITY_ID;
      const highlightColor = context.highlightColor;
      const handles = this._handles;

      if (!this._highlightGraphicsLayer) {
        this._highlightGraphicsLayer = new GraphicsLayer({
          id: util.randomId() + "-floorfilter"
        });
        map.addLayer(this._highlightGraphicsLayer);
      }

      const clearPopupFeature = (facility) => {
        // for FeatureLayers the popup highlight graphic sometimes needs to be cleared
        try {
          const info = aiim.facilitiesLayerInfo;
          if (info && !info.isSubLayer) {
            const fl = map.getLayer(info.id);
            if (fl && typeof fl.clearSelection === "function" && fl._selectedFeatures) {
              const keys = Object.keys(fl._selectedFeatures);
              if (keys && keys.length === 1) {
                const graphic = fl._selectedFeatures[keys[0]];
                if (graphic && graphic === facility) {
                  fl.clearSelection();
                }
              }
            }
          }
        } catch(ex) {
          console.error(ex);
        }
      };

      const highlightSymbol = new SimpleFillSymbol(
        SimpleFillSymbol.STYLE_NULL,
        new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color(highlightColor),
          2.4
        )
      );

      const getFacility = (evt) => {
        let facility;
        const info = aiim.facilitiesLayerInfo;
        if (info && info.isSubLayer) {
          if (isVisible(info)) {
            facility = this._facilityHitTest(map,facilities,evt);
          }
        } else if (info) {
          const graphic = evt.graphic;
          const layer = (graphic && graphic._layer);
          if (layer && (layer.id === info.id)) {
            facility = graphic;
          }
        }
        return facility;
      };

      const getStatus = (facility) => {
        if (!facility) return {};
        const id = util.getAttributeValue(facility.attributes,facilityIdField);
        const isActive = (id && id === context.activeFacilityInfo.facilityId);
        return {
          facilityId: id,
          isActive: isActive
        };
      };

      const highlight = (facility,facilityId) => {
        const graphic = facility.clone();
        graphic.symbol = highlightSymbol;
        this.clearFacilityHighlight();
        this._highlightGraphicsLayer.add(graphic);
        this._highlightedFacilityId = facilityId;
      };

      const isVisible = (info) => {
        let visible = true;
        const msLayer = map.getLayer(info.mapServiceLayerId);
        const fLayer = info.selectionFeatureLayer;
        if (msLayer) {
          visible = false;
          const scale = map.getScale();
          if (msLayer.visible && isVisibleAtScale(msLayer,scale)) {
            const vis = msLayer.visibleLayers;
            if (vis && vis.indexOf(info.subLayerId) !== -1) {
              visible = isVisibleAtScale(fLayer,scale)
            }
          }
        }
        return visible;
      };

      const isVisibleAtScale = (layer,scale) => {
        if (layer && typeof layer.isVisibleAtScale === "function") {
          return layer.isVisibleAtScale(scale);
        }
        return true;
      };

      if (context.watchFacilityHover) {
        handles.push(map.on("mouse-move",evt => {
          const facility = getFacility(evt);
          if (facility) {
            const status = getStatus(facility);
            if (status.facilityId && !status.isActive) {
              if (this._highlightedFacilityId !== status.facilityId) {
                highlight(facility,status.facilityId);
              }
            } else {
              this.clearFacilityHighlight();
            }
          } else {
            this.clearFacilityHighlight();
          }
        }));
      }

      if (context.watchFacilityClick || context.watchFacilityHover) {
        handles.push(map.on("mouse-out",evt => {
          this.clearFacilityHighlight();
        }));
      }

      if (context.watchFacilityClick) {
        handles.push(map.on("click",evt => {
          const facility = getFacility(evt);
          if (facility) {
            const status = getStatus(facility);
            if (status.facilityId && !status.isActive) {
              facilities.activate(facility,status.facilityId);
              this.clearFacilityHighlight();
              clearPopupFeature(facility);
            }
          }
        }));
      }

    }

  });

  return Jsapi_v3;
});
