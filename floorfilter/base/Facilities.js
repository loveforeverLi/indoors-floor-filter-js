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

  const Facilities = declare(null, {

    context: null,
    url: null,

    _features: null,
    _objectIdField: null,

    constructor: function(props) {
      Object.assign(this,props);
    },

    activate: function(feature,facilityId) {},

    findFeatureById: function(facilityId) {
      return this._findFeatureById({},facilityId);
    },

    findFeatureByObjectId: function(objectId) {
      return this._findFeatureByObjectId(objectId);
    },

    getFeatures: function() {
      return this._features;
    },

    hasFacilities: function() {
      return this._features && this._features.length > 0;
    },

    load: function(task) {
      let promise = this._queryAll(task);
      promise.then(() => {
        const context = this.context;
        if (this.hasFacilities()) {
          context.jsapi.watchFacilityShells();
        }
      });
      return promise;
    },

    zoomTo: function(task,facilityId) {
      const promise = new Promise((resolve,reject) => {
        //console.log("Facilities::zoomTo",facilityId);
        const feature = this._findFeatureById(task,facilityId);
        if (feature && feature.geometry) {
          //console.log("found geometry",facilityId,feature.geometry);
          const jsapi = this.context.jsapi;
          jsapi.zoomToFeature(task,feature).then(() => {
            resolve();
          }).catch(ex => {
            const msg = this.context.msgPrefix+"error zooming to facility";
            console.error(msg,ex);
            reject(ex);
          });
        } else {
          resolve();
        }
      });
      return promise;
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _findFeatureById: function(task,facilityId) {
      if (typeof facilityId !== "string" || facilityId.length === 0) {
        return null;
      }
      let feature = null;
      const features = this._features;
      if (features) {
        const util = this.context.util;
        const facilityIdField = this.context.aiim.FieldNames.FACILITY_ID;
        features.some(f => {
          if (f && f.attributes) {
            const id = util.getAttributeValue(f.attributes,facilityIdField);
            if (facilityId === id) {
              feature = f;
              return true;
            }
          }
          return false;
        });
      }
      return feature;
    },

    _findFeatureByObjectId: function(objectId) {
      let feature = null;
      const features = this._features;
      const objectIdField = this._objectIdField;
      if (features && objectIdField && typeof objectId === "number") {
        const util = this.context.util;
        features.some(f => {
          if (f && f.attributes) {
            const id = util.getAttributeValue(f.attributes,objectIdField);
            if (objectId === id) {
              feature = f;
              return true;
            }
          }
          return false;
        });
      }
      return feature;
    },

    _queryAll: function(task) {
      const promise = new Promise((resolve,reject) => {
        const context = this.context;
        const jsapi = context.jsapi;
        const FieldNames = context.aiim.FieldNames;
        const util = context.util;
        const url = this.url;
        const queryProps = {
          outFields: ["*"],
          returnGeometry: true,
          returnZ: true,
          where: "1=1"
        };
        jsapi.queryLayer(task,url,queryProps).then(result => {
          this._features = result && result.features;
          if (result.fields) {
            result.fields.some(field => {
              if (field.type === "oid" || field.type === "esriFieldTypeOID") {
                this._objectIdField = field.name;
                return true;
              }
              return false;
            });
          }
          if (!this._objectIdField) {
            console.warn(context.msgPrefix+"Facilities::load unable to locate objectIdField");
          }
          resolve();
        }).catch(ex => {
          console.error(context.msgPrefix+"Facilities::load error",ex);
          reject(ex);
        });
      });
      return promise;
    }

  });

  return Facilities;
});
