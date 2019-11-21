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

  const Aiim = declare(null, {

    context: null,
    facilitiesUrl: null,
    levelsUrl: null,

    levelAwareIndex: {},
    mapServiceInfoById: {},

    facilitiesLayerInfo: null,
    levelsLayerInfo: null,
    sitesLayerInfo: null,

    layerIdentifiers: {
      "sites": ["Sites"],
      "facilities": ["Facilities", "Facilities Textured"],
      "levels": ["Levels"],
      "units": ["Units"],
      "details": ["Details"],
    },

    layerMappings: null,

    FieldNames: {
      FACILITY_ID: "facility_id",
      FACILITY_NAME: "facility_name",
      LEVEL_ID: "level_id",
      LEVEL_NAME: "level_name",
      LEVEL_NUMBER: "level_number",
      LOCATION_TYPE: "location_type",
      NAME: "name",
      NAME_SHORT: "name_short",
      VERTICAL_ORDER: "vertical_order"
    },

    constructor: function(props) {
      Object.assign(this,props);
    },

    configureLayerIdentifiers: function(configuredIdentifiers) {
      if (configuredIdentifiers && typeof configuredIdentifiers === "object") {
        Object.keys(this.layerIdentifiers).forEach(key => {
          let lc = key.toLowerCase();
          Object.keys(configuredIdentifiers).some(key2 => {
            if (typeof key2 === "string" && lc === key2.toLowerCase()) {
              let info = configuredIdentifiers[key2];
              this.layerIdentifiers[key] = info;
              return true;
            }
            return false;
          });
        });
      }
    },

    configureLayerMappings: function(configuredMappings) {
      if (configuredMappings && Array.isArray(configuredMappings)) {
        this.layerMappings = configuredMappings;
      } else if (configuredMappings && typeof configuredMappings === "object") {
        this.layerMappings = [configuredMappings];
      } else {
        this.layerMappings = [];
      }
    },

    getFacilitiesUrl: function() {
      const info = this.facilitiesLayerInfo;
      if (info && info.url) return info.url;
      return null;
    },

    getLevelAwareInfo: function(task,layer) {
      return this.levelAwareIndex[layer.id];
    },

    getLevelsUrl: function() {
      const info = this.levelsLayerInfo;
      if (info && info.url) return info.url;
      return null;
    },

    getSitesUrl: function() {
      const info = this.sitesLayerInfo;
      if (info && info.url) return info.url;
      return null;
    },

    load: function(task) {
      return this._load(task);
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _addSubLayerInfo: function(task,mapServiceInfo,subLayerInfo) {
      const featureLayer = subLayerInfo.selectionFeatureLayer;
      if (featureLayer) {
        const mapServiceLayerId = mapServiceInfo.mapServiceLayerId;
        let msInfo = task.mapServiceInfoById[mapServiceLayerId];
        if (!msInfo) {
          msInfo = {
            mapServiceLayerId: mapServiceLayerId,
            subLayersById: {},
            subLayerIds: []
          };
          task.mapServiceInfoById[mapServiceLayerId] = msInfo;
        }
        const subLayerId = subLayerInfo.subLayerId;
        const levelAwareInfo = this._makeLevelAwareInfo(task,featureLayer);
        subLayerInfo.levelAwareInfo = levelAwareInfo;
        msInfo.subLayersById[subLayerId] = subLayerInfo;
        msInfo.subLayerIds.push(subLayerId);
        if (subLayerInfo.levelAwareInfo) {
          levelAwareInfo.mapServiceLayerId = mapServiceLayerId;
          levelAwareInfo.subLayerId = subLayerId;
          levelAwareInfo.isSubLayer = true;
          levelAwareInfo.selectionFeatureLayer = subLayerInfo.selectionFeatureLayer;
        }
      }
    },

    _checkLayerIdentifier: function(key,layer,title) {
      let matched = false;
      const lc = title.toLowerCase();
      const check = (v) => {
        if (typeof v === "number") {
          return (layer.layerId === v);
        } else if (typeof v === "string") {
          return (lc === v.toLowerCase());
        }
        return false;
      };
      const info = this.layerIdentifiers[key.toLowerCase()];
      if (info && Array.isArray(info)) {
        info.some(v => {
          if (check(v)) {
            matched = true;
            return true;
          }
          return false;
        });
      } else if (info !== null && info !== undefined) {
        matched = check(info);
      }
      //if (matched) console.log("matched",key,title,matched);
      return matched;
    },

    _executePerLayer: function(task,executor) {
      const promise = new Promise((resolve,reject) => {
        const promises = [];
        const jsapi = this.context.jsapi;
        const layers = jsapi.getLayers(task);
        layers.forEach(layer => {
          let result = executor.call(this,task,layer);
          if (result && result.promise) promises.push(result.promise);
        });
        if (promises.length > 0) {
          Promise.all(promises).then(() => {
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

    _getLayerMappings: function(task,layer) {
      let mappings = null;
      if (Array.isArray(this.layerMappings)) {
        const title = this._getLayerTitle(task,layer);
        if (typeof title === "string" && title.length > 0) {
          const lc = title.toLowerCase();
          this.layerMappings.some(info => {
            let v = (info && info.layerTitle);
            if (typeof v === "string" && lc === v.toLowerCase()) {
              mappings = info.mappings;
              return true;
            }
            return false;
          });
        }
      }
      return mappings;
    },

    _getLayerTitle: function(task,layer) {
      return (layer && (layer.title || layer.name));
    },

    _load: function(task) {
      const promise = new Promise((resolve,reject) => {
        task.levelAwareLayerIds = {};
        task.mapServiceInfoById = {};
        task.facilitiesLayerInfo = null;
        task.levelsLayerInfo = null;
        task.sitesLayerInfo = null;
        task.addSubLayerInfo = (tsk,mapServiceInfo,subLayerInfo) => {
          return this._addSubLayerInfo(tsk,mapServiceInfo,subLayerInfo);
        };

        const jsapi = this.context.jsapi;
        jsapi.waitForMap(task).then(() => {
          //console.log("waitForMap.then <<<<<<<<<<<<<<<<<");
          return this._executePerLayer(task,this._waitForMapService);
        }).then(() => {
          //console.log("_waitForMapServices.then <<<<<<<<<<<<<<<<<");
          return this._executePerLayer(task,this._waitForFeatureLayer);
        }).then(() => {
          //console.log("_waitForFeatureLayers.then <<<<<<<<<<<<<<<<<");
          task.levelAwareIndex = this._makeLevelAwareIndex(task);
        }).then(() => {
          this.levelAwareIndex = task.levelAwareIndex;
          this.mapServiceInfoById = task.mapServiceInfoById;
          this.facilitiesLayerInfo = task.facilitiesLayerInfo;
          this.levelsLayerInfo = task.levelsLayerInfo;
          this.sitesLayerInfo = task.sitesLayerInfo;
          resolve();
        }).catch(ex => {
          const pfx = this.context.msgPrefix;
          console.error(pfx+"Error while processing layers:",ex);
          reject(ex);
        });
      });
      return promise;
    },

    _makeLevelAwareIndex: function(task) {
      const levelAwareIndex = {};
      const jsapi = this.context.jsapi;
      jsapi.getLayers(task).forEach(layer => {
        if ((jsapi.isFeatureLayer(task,layer) || layer.associatedLayer) &&
            !layer._isSelOnly) {
          let info = this._makeLevelAwareInfo(task,layer);
          if (info) {
            levelAwareIndex[info.id] = info;
            if (info.isSites) {
              task.sitesLayerInfo = info;
            } else if (info.isFacilities) {
              task.facilitiesLayerInfo = info;
            } else if (info.isLevels) {
              task.levelsLayerInfo = info;
            }
          }
        }
      });
      jsapi.getLayers(task).forEach(layer => {
        if (jsapi.isMapServiceLayer(task,layer)) {
          let msInfo = task.mapServiceInfoById[layer.id];
          if (msInfo) {
            msInfo.subLayerIds.forEach(subLayerId => {
              let info = msInfo.subLayersById[subLayerId];
              info = (info && info.levelAwareInfo);
              if (info && info.isSites) {
                if (!task.sitesLayerInfo) {
                  task.sitesLayerInfo = info;
                }
              } else if (info && info.isFacilities) {
                if (!task.facilitiesLayerInfo) {
                  task.facilitiesLayerInfo = info;
                }
              } else if (info && info.isLevels) {
                if (!task.levelsLayerInfo) {
                  task.levelsLayerInfo = info;
                }
              }
            });
          }
        }
      });
      return levelAwareIndex;
    },

    _makeLevelAwareInfo: function(task,layer) {
      const context = this.context;
      const jsapi = context.jsapi;
      const util = context.util;
      const FieldNames = this.FieldNames;
      if (jsapi.isFeatureLayer(task,layer) || layer.associatedLayer) {

        let url = util.checkMixedContent(layer.url);
        if (jsapi.isV4) {
          url += "/" + layer.layerId;
        }
        const id = layer.id;
        const title = this._getLayerTitle(task,layer);

        const isSites = this._checkLayerIdentifier("sites",layer,title);
        const isFacilities = this._checkLayerIdentifier("facilities",layer,title);
        const isLevels = this._checkLayerIdentifier("levels",layer,title);
        const isUnits = this._checkLayerIdentifier("units",layer,title);
        const isDetails = this._checkLayerIdentifier("details",layer,title);
        const requiresFacilityMode = (isLevels || isUnits || isDetails);

        const fields = layer.fields;
        const facilityIdField = util.findField(fields,FieldNames.FACILITY_ID);
        const levelIdField = util.findField(fields,FieldNames.LEVEL_ID);
        const locTypeField = util.findField(fields,FieldNames.LOCATION_TYPE);
        const mappings = this._getLayerMappings(task,layer);
        const hasFacilityAndLevel = (util.isStringField(facilityIdField) && util.isStringField(levelIdField));
        const hasMappings = !!mappings;
        if (isSites || isFacilities || hasFacilityAndLevel || hasMappings) {
          const expression = jsapi.getLayerDefinitionExpression(task,layer);
          const info = {
            id: id,
            url: url,
            title: title,
            isSites: isSites,
            isFacilities: isFacilities,
            isLevels: isLevels,
            isLevelAware: (hasFacilityAndLevel || hasMappings),
            originalDefinitionExpression: expression,
            requiresFacilityMode: requiresFacilityMode,
            fields: (fields || []).slice(),
            mappings: mappings,
            facilityIdField: facilityIdField && facilityIdField.name,
            levelIdField: levelIdField && levelIdField.name,
            locTypeField: null
          };
          if (util.isIntegerField(locTypeField)) {
            info.locTypeField = locTypeField.name;
          }
          return info;
        }
      }
      return null;
    },

    _waitForFeatureLayer: function(task,layer) {
      const jsapi = this.context.jsapi;
      const shouldWait = (jsapi.isFeatureLayer(task,layer) || layer.type === "scene");
      if (shouldWait) {
        return {
          promise: jsapi.waitForLayer(task,layer)
        };
      }
    },

    _waitForMapService: function(task,layer) {
      const jsapi = this.context.jsapi;
      if (jsapi.isMapServiceLayer(task,layer)) {
        return {
          promise: jsapi.waitForMapService(task,layer)
        };
      }
    }

  });

  return Aiim;
});
