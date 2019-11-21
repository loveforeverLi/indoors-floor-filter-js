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
  "dojo/_base/declare",
  "./Jsapi",
  "esri/Graphic",
  "esri/geometry/Extent",
  "esri/geometry/geometryEngine",
  "esri/geometry/Polyline",
  "esri/layers/GraphicsLayer",
	"esri/tasks/QueryTask",
  "esri/tasks/support/Query"],
function(declare, Jsapi, Graphic, Extent, geometryEngine, Polyline, GraphicsLayer,
  QueryTask, Query) {

  const Jsapi_v4 = declare([Jsapi], {

    isV4: true,

    _handles: null,
    _highlightGraphicsLayer: null,
    _highlightFacilityId: null,
    _hoverGraphicsLayer: null,
    _hoverFacilityId: null,

    constructor: function(props) {
      Object.assign(this,props);
      this._handles = [];
    },

    addFacilityHighlight: function(task,facility,facilityId) {
      if (!facility || !facility.geometry) {
        this.clearFacilityHighlight(task);
        return;
      }
      if (!this._highlightGraphicsLayer) {
        const util = task.context.util;
        this._highlightGraphicsLayer = new GraphicsLayer({
          id: util.randomId() + "-floorfilter-facility",
          listMode: "hide"
        });
        task.view.map.add(this._highlightGraphicsLayer);
      }
      const symbol = {
        type: "simple-line",
        color: task.context.highlightColor,
        width: "2.4",
        style: "solid"
      };
      const polyline = this._polygonToPolyline(facility.geometry);
      const graphic = new Graphic({
        geometry: polyline,
        attributes: facility.attributes,
        symbol: symbol,
        visible: true
      });
      this.clearFacilityHighlight(task);
      this._highlightGraphicsLayer.add(graphic);
      this._highlightFacilityId = facilityId;
    },

    clearFacilityHighlight: function(task) {
      if (this._highlightGraphicsLayer) {
        this._highlightGraphicsLayer.removeAll();
      }
      this._highlightFacilityId = null;
    },

    clearFacilityHoverHighlight: function(task) {
      if (this._hoverGraphicsLayer) {
        this._hoverGraphicsLayer.removeAll();
      }
      this._hoverFacilityId = null;
    },

    destroy: function() {
      this._clearHandles();
    },

    flattenSubLayers: function(task,mapServiceLayer) {
      if (mapServiceLayer && mapServiceLayer.allSublayers) {
        return mapServiceLayer.allSublayers;
      }
      let subLayers = mapServiceLayer && mapServiceLayer.sublayers;
      if (subLayers) {
        subLayers = subLayers.flatten(item => {
          return item.sublayers;
        });
        return subLayers.toArray();
      }
      return;
    },

    getLayerDefinitionExpression: function(task,layer) {
      return layer.definitionExpression;
    },

    getLayers: function(task) {
      const view = task && task.view;
      if (view) {
        const layers = view.map.layers.flatten(item => {
          return item.layers || item.sublayers;
        });
        return layers.toArray();
      }
      return [];
    },

    is3D: function() {
      const context = this.context;
      return (context.view && context.view.type === "3d");;
    },

    isFeatureLayer: function(task,layer) {
      return (layer && layer.type === "feature");
    },

    isMapServiceLayer: function(task,layer) {
      return (layer && layer.type === "map-image");
    },

    queryLayer: function(task,url,queryProps) {
      const context = this.context;
      const promise = new Promise((resolve,reject) => {
        const query = new Query();
        const task = new QueryTask(url);
        Object.assign(query,queryProps);
        if (context.view && query.returnGeometry) {
          query.outSpatialReference = context.view.spatialReference;
        }
        task.execute(query).then(result => {
          resolve(result);
        }).catch(ex => {
          console.warn("FloorFilter: error querying layer",url);
          reject(ex);
        });
      });
      return promise;
    },

    setLayerDefinitionExpression: function(task,layer,expression) {
      layer.definitionExpression = expression;
    },

    waitForLayer: function(task,layer) {
      const promise = new Promise((resolve,reject) => {
        if (layer && typeof layer.when === "function") {
          layer.when(() => {
            resolve(layer);
          }).catch(ex => {
            const pfx = this.context.msgPrefix;
            console.error(pfx+"Error while waiting for layer:",ex);
            // reject?
            resolve();
          });
        } else {
          resolve();
        }
      });
      return promise;
    },

    waitForMap: function(task) {
      const promise = new Promise((resolve,reject) => {
        let view = task.view;
        if (view && typeof view.when === "function") {
          view.when(() => {
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

    waitForMapService: function(task,layer) {
      const promise = new Promise((resolve,reject) => {
        if (layer && layer.type === "map-image") {
          //console.log("*** mapServiceLayer",layer);
          let mapServiceInfo = {
            mapServiceLayer: null
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
        const subLayers = this.flattenSubLayers(task,mapServiceLayer);
        if (subLayers) {
          subLayers.forEach(subLayer => {
            promises.push(this._createSubFeatureLayer(task,mapServiceInfo,subLayer));
          });
        }
        if (promises.length > 0) {
          Promise.all(promises).then(() => {
            //console.log("Jsapi_v4::waitForSubLayers.all");
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
      const view = context.view;
      const facilities = context.facilities;
      if (view && facilities &&
         (context.watchFacilityClick || context.watchFacilityHover)) {
        if (view.type === "2d") {
          this._watchFacilities2D(view,facilities);
        } else if (view.type === "3d") {
          this._watchFacilities3D(view,facilities);
        };
      }
    },

    zoomToFeature: function(task,feature) {
      const bufferMeters = 10;
      const view = task.view;
      if (!view || !feature || !feature.geometry) return Promise.resolve();

      const addZ = (extent,z) => {
        const ext = new Extent({
          "xmin": extent.xmin,
          "xmax": extent.xmax,
          "ymin": extent.ymin,
          "ymax": extent.ymax,
          "zmin": z,
          "zmax": z,
          spatialReference: extent.spatialReference
        });
        return ext;
      };

      const is3D = (view && view.type === "3d");
      let geometry = null;
      let target = null, options = null, heading = null, tilt = null;
      if (feature.geometry.type === "point") {
        geometry = geometryEngine.geodesicBuffer(feature.geometry,bufferMeters,"meters");
        if (geometry && geometry.extent) {
          geometry = geometry.extent;
          const z = (typeof feature.geometry.z === "number") ? feature.geometry.z : 0;
          geometry = addZ(geometry.extent,z);
          target = {target: geometry};
        }
      } else if (feature.geometry.extent) {
        const ext = feature.geometry.extent.clone();
        geometry = geometryEngine.geodesicBuffer(ext,bufferMeters,"meters");
        if (geometry && geometry.extent) {
          geometry = geometry.extent;
          const z = (typeof ext.zmin === "number") ? ext.zmin : 0;
          geometry = addZ(geometry.extent,z);
          target = {target: geometry};
        }
      } else {
        geometry = feature.geometry;
        target = {target: feature};
      }
      options = {
        duration: 1000,
        easing: "out-back"
      };

      if (is3D) {
        if (view.camera) {
          heading = view.camera.heading;
          tilt = 60;
        }
        if (typeof heading === "number") target.heading = heading;
        if (typeof tilt === "number") target.tilt = tilt;
      }
      if (target) {
        return view.goTo(target,options).then(() => {
          if (!is3D && !view.extent.contains(geometry)) {
            view.zoom -= 1;
          }
        });
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

    _createSubFeatureLayer: function(task,mapServiceInfo,subLayer) {
      const promise = new Promise((resolve,reject) => {
        const mapServiceLayer = mapServiceInfo.mapServiceLayer;
        if (subLayer && subLayer.declaredClass === "esri.layers.support.Sublayer" &&
            typeof subLayer.createFeatureLayer === "function") {
          const promise2 = subLayer.createFeatureLayer();
          promise2.then(featureLayer => {
            if (featureLayer && featureLayer.type === "feature") {
              featureLayer.load();
              return this.waitForLayer(task,featureLayer);
            }
          }).then(featureLayer => {
            if (featureLayer) {
              const subLayerId = subLayer.id;
              if (typeof task.addSubLayerInfo === "function") {
                task.addSubLayerInfo(task,mapServiceInfo,{
                  subLayerId: subLayerId,
                  selectionFeatureLayer: featureLayer
                });
              }
            }
            resolve();
          }).catch(ex => {
            const pfx = this.context.msgPrefix;
            console.error(pfx+"Error creating feature layer for subLayer:",ex);
            // reject?
            resolve();
          });
        } else {
          resolve();
        }
      });
      return promise;
    },

    _facilityHitTest2D: function(view,facilities,evt) {
      let facility;
      const features = facilities.getFeatures() || [];
      if (features && features.length > 0) {
        const point = view.toMap({x: evt.x, y: evt.y});
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

    _getFacilityIdFromGraphic: function(graphic,lenient) {
      const promise = new Promise((resolve,reject) => {
        const context = this.context;
        const util = context.util;
        const facilityIdField = context.aiim.FieldNames.FACILITY_ID;
        const attributes = graphic && graphic.attributes;
        if (util.hasAttribute(attributes,facilityIdField)) {
          let facilityId = util.getAttributeValue(attributes,facilityIdField);
          resolve(facilityId);
        } else {
          let qLayer, objectId;
          const layer = graphic && graphic.layer;
          if (layer.associatedLayer) {
            if (layer.associatedLayer.type === "feature") {
              qLayer = layer.associatedLayer;
              objectId = util.getAttributeValue(attributes,layer.objectIdField);
            }
          }
          if (qLayer && typeof objectId === "number") {
            const url = util.checkMixedContent(qLayer.url) + "/" + qLayer.layerId;
            const task = {context: context};
            const queryProps = {
              outFields: ["*"],
              returnGeometry: false,
              returnZ: false,
              objectIds: [objectId]
            };
            this.queryLayer(task,url,queryProps).then(result => {
              let facilityId;
              const features = result && result.features;
              if (features && features.length === 1) {
                const attr = features[0].attributes
                facilityId = util.getAttributeValue(attr,facilityIdField);
              }
              resolve(facilityId);
            }).catch(ex => {
              console.error(context.msgPrefix+"error querying layer",ex);
              if (lenient) resolve();
              else reject(ex);
            });
          }
        }
      });
      return promise;
    },

    _polygonToPolyline: function(polygon) {
      const polyline = new Polyline({
        hasZ: polygon.hasZ,
        hasM: polygon.hasM,
        paths: polygon.rings,
        spatialReference: polygon.spatialReference
      });
      return polyline;
    },

    _watchFacilities2D: function(view,facilities) {
      const context = this.context;
      const aiim = context.aiim;
      const util = context.util;
      const facilityIdField = aiim.FieldNames.FACILITY_ID;
      const highlightColor = context.highlightColor;
      const handles = this._handles;

      if (!this._hoverGraphicsLayer) {
        this._hoverGraphicsLayer = new GraphicsLayer({
          id: util.randomId() + "-floorfilter-hover",
          listMode: "hide"
        });
        view.map.add(this._hoverGraphicsLayer);
      }
      const gfxLayerId = this._hoverGraphicsLayer.id;

      const highlightSymbol = {
        "type": "simple-fill",
        "color": [255,255,255,0],
        "style": "solid",
        "outline": {
          "color": highlightColor,
          "width": 2.4
        }
      };

      const applyClick = (facility,wait) => {
        if (facility) {
          const status = getStatus(facility,true);
          if (status.facilityId && !status.isActive) {
            this.clearFacilityHoverHighlight();
            if (wait) {
              setTimeout(() => {
                facilities.activate(facility,status.facilityId);
              },100);
            } else {
              facilities.activate(facility,status.facilityId);
            }
          }
        }
      };

      const applyMove = (facility) => {
        if (facility) {
          const status = getStatus(facility);
          if (status.facilityId && !status.isActive) {
            if (this._hoverFacilityId !== status.facilityId) {
              highlight(facility,status.facilityId);
            }
          } else {
            this.clearFacilityHoverHighlight();
          }
        } else {
          this.clearFacilityHoverHighlight();
        }
      };

      const getStatus = (facility,isClick) => {
        if (!facility) return {};
        let id;
        if (facility.xtnFacilityId) {
          id = facility.xtnFacilityId;
        } else if (util.hasAttribute(facility.attributes,facilityIdField)) {
          id = util.getAttributeValue(facility.attributes,facilityIdField);
        } else {
          const objectIdField = facility.layer && facility.layer.objectIdField;
          if (objectIdField) {
            const objectId = util.getAttributeValue(facility.attributes,objectIdField);
            const f = facilities.findFeatureByObjectId(objectId);
            if (f) {
              id = util.getAttributeValue(f.attributes,facilityIdField);
            }
          }
        }
        const isActive = (id && id === context.activeFacilityInfo.facilityId);
        return {
          facilityId: id,
          isActive: isActive
        };
      };

      const highlight = (facility,facilityId) => {
        const graphic = facility.clone();
        graphic.sourceLayer = null;
        graphic.xtnFacilityId = facilityId;
        graphic.symbol = highlightSymbol;
        this.clearFacilityHoverHighlight();
        this._hoverGraphicsLayer.add(graphic);
        this._hoverFacilityId = facilityId;
      };

      const isVisible = (info) => {
        let visible = true;
        const msLayer = view.map.findLayerById(info.mapServiceLayerId);
        const fLayer = info.selectionFeatureLayer;
        if (msLayer) {
          visible = false;
          const scale = view.get("scale");
          if (msLayer.visible && isVisibleAtScale(msLayer,scale)) {
            visible = true;
            msLayer.allSublayers.some(lyr => {
              if (lyr.id === info.subLayerId) {
                visible = lyr.visible && isVisibleAtScale(lyr,scale);
                return true;
              }
              return false;
            });
          }
        }
        return visible;
      };

      const isVisibleAtScale = (layer,scale) => {
        const minOk = layer.minScale === 0 || scale <= layer.minScale;
        const maxOk = layer.maxScale === 0 || scale >= layer.maxScale;
        return minOk && maxOk;
      };

      if (context.watchFacilityHover) {
        handles.push(view.on("pointer-move",evt => {
          const info = aiim.facilitiesLayerInfo;
          if (info && info.isSubLayer) {
            if (isVisible(info)) {
              let facility = this._facilityHitTest2D(view,facilities,evt);
              applyMove(facility);
            }
          } else {
            view.hitTest(evt).then(r => {
              if (r && r.results && r.results.length > 0) {
                let graphic = r.results[0].graphic;
                if (graphic.xtnFacilityId && r.results.length > 1) {
                  graphic = r.results[1].graphic;
                }
                const layer = (graphic && graphic.layer);
                if (layer && (layer.id === info.id)) {
                  applyMove(graphic);
                  return;
                }
              }
              this.clearFacilityHoverHighlight();
            });
          }
        }));
      }

      if (context.watchFacilityClick || context.watchFacilityHover) {
        handles.push(view.on("pointer-leave",evt => {
          this.clearFacilityHoverHighlight();
        }));
      }

      if (context.watchFacilityClick) {
        handles.push(view.on("click",evt => {
          const info = aiim.facilitiesLayerInfo;
          if (info && info.isSubLayer) {
            if (isVisible(info)) {
              let facility = this._facilityHitTest2D(view,facilities,evt);
              applyClick(facility);
            }
          } else {
            view.hitTest(evt).then(r => {
              try {
                if (r && r.results && r.results.length > 0) {
                  let graphic = r.results[0].graphic;
                  if (graphic.xtnFacilityId && r.results.length > 1) {
                    graphic = r.results[1].graphic;
                  }
                  const layer = (graphic && graphic.layer);
                  if (layer && (layer.id === info.id)) {
                    applyClick(graphic,true);
                  }
                }
              } catch(ex) {
                console.error(ex);
              }
            });
          }
        }));
      }

    },

    _watchFacilities3D: function(view,facilities) {
      const context = this.context;
      const aiim = context.aiim;
      const util = context.util;
      const handles = this._handles;
      const facilityIdField = aiim.FieldNames.FACILITY_ID;
      let facilityShellLayer;

      const makeHighlightRenderer = (objectId,objectIdField) => {
        objectId = parseInt(objectId, 10) || 0;
        return {
          type: "unique-value",
          field: objectIdField,
          uniqueValueInfos: [{
            value: objectId,
            label: "Facility Highlight",
            symbol: {
              type: "mesh-3d",
              symbolLayers: [{
                type: "fill",
                material: {
                  color: [230, 230, 230, 0.6],
                  colorMixMode: "replace"
                }
              }]
            }
          }]
        };
      };

      const hitTest = (evt,isClick) => {
        const info = aiim.facilitiesLayerInfo;
        if (info) {
          view.hitTest(evt).then(r => {
            let facilityGraphic;
            if (r && r.results && r.results.length > 0) {
              const graphic = r.results[0].graphic;
              const layer = (graphic && graphic.layer);
              if (layer && (layer.id === info.id)) {
                facilityGraphic = graphic;
              }
            }
            if (facilityGraphic && isClick) {
              this._getFacilityIdFromGraphic(facilityGraphic,true).then(id => {
                const isActive = (id && id === context.activeFacilityInfo.facilityId);
                if (!isActive) {
                  facilities.activate(facilityGraphic,id);
                }
              });
            } else {
              const layer = facilityGraphic && facilityGraphic.layer;
              if (layer && layer.type === "scene" && facilityGraphic.attributes) {
                const objectIdField = layer.objectIdField;
                const objectId = facilityGraphic.attributes[objectIdField];
                const renderer = makeHighlightRenderer(objectId,objectIdField);
                setShellRenderer(layer,renderer);
              } else {
                resetShellRenderer();
              }
            }
          });
        }
      };

      const resetShellRenderer = () => {
        if (facilityShellLayer) {
          facilityShellLayer.renderer = null;
          facilityShellLayer = null;
        }
      };

      const setShellRenderer = (layer,renderer) => {
        if (facilityShellLayer && layer !== facilityShellLayer) {
          resetShellRenderer();
        }
        facilityShellLayer = layer;
        facilityShellLayer.renderer = renderer;
      };

      if (context.watchFacilityHover) {
        handles.push(view.on("pointer-move",evt => {
          hitTest(evt,false);
        }));
      }

      if (context.watchFacilityClick || context.watchFacilityHover) {
        handles.push(view.on("pointer-leave",evt => {
          resetShellRenderer();
        }));
      }

      if (context.watchFacilityClick) {
        handles.push(view.on("click",evt => {
          resetShellRenderer();
          hitTest(evt,true);
        }));
      }
    }

  });

  return Jsapi_v4;
});
