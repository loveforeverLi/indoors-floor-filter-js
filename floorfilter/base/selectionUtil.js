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
define([],
function() {

  const selectionUtil = {

    clearSelectedFacilityLevel: function(task) {
      task.context.jsapi.clearFacilityHighlight(task);
      this._applyFacilityLevelExpressions(task,{},true);
    },

    selectFacilityLevel: function(task,criteria) {
      task.context.jsapi.clearFacilityHighlight(task);
      this._applyFacilityLevelExpressions(task,criteria,false);
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _applyFacilityLevelExpressions: function(task,criteria,clear) {
      const is3D = (task.view && task.view.type === "3d");
      const aiim = task.context.aiim;
      const jsapi = task.context.jsapi;
      const layers = jsapi.getLayers(task);
      let aboveFacilities2D = false, found2D = false;

      const makeExpression = (levelAwareInfo) => {
        let exp = "";
        if (is3D) {
          if (!clear) {
            exp = this._makeWhere_3D(task,levelAwareInfo,criteria);
          }
        } else {
          const isFacilities = (levelAwareInfo && levelAwareInfo.isFacilities);
          if (!found2D && isFacilities) found2D = true;
          if (clear) {
            exp = this._makeWhere_2DDefault(task,levelAwareInfo,aboveFacilities2D);
          } else {
            exp = this._makeWhere_2D(task,levelAwareInfo,criteria,aboveFacilities2D);
          }
          if (found2D) aboveFacilities2D = true;
        }
        return exp;
      };

      const setExpression = (levelAwareInfo,layer,expression) => {
        const isFacilities = (levelAwareInfo && levelAwareInfo.isFacilities);
        const isLevelAware = (levelAwareInfo && levelAwareInfo.isLevelAware);
        if (!isFacilities && !isLevelAware) return;
        this._setDefinitionExpression(task,levelAwareInfo,layer,expression);
      };

      const setExpression_v3ms = (levelAwareInfo,expression,subLayerId,definitions) => {
        const isFacilities = (levelAwareInfo && levelAwareInfo.isFacilities);
        const isLevelAware = (levelAwareInfo && levelAwareInfo.isLevelAware);
        if (!isFacilities && !isLevelAware) return;
        this._setDefinitionExpression_v3ms(task,levelAwareInfo,expression,subLayerId,definitions);
      };

      layers.forEach(layer => {
        if (jsapi.isMapServiceLayer(task,layer)) {
          let msInfo = aiim.mapServiceInfoById[layer.id];
          if (msInfo) {
            if (jsapi.isV4) {
              let subLayers = jsapi.flattenSubLayers(task,layer);
              subLayers.forEach(subLayer => {
                let subLayerInfo = msInfo.subLayersById[subLayer.id];
                let levelAwareInfo = subLayerInfo.levelAwareInfo;
                let expression = makeExpression(levelAwareInfo);
                setExpression(levelAwareInfo,subLayer,expression);
              });
            } else if (jsapi.isV3) {
              let hasDefinition = false;
              let definitions = layer.layerDefinitions ? layer.layerDefinitions.slice() : [];
              let subLayerIds = msInfo.subLayerIds.slice().reverse();
              subLayerIds.forEach(subLayerId => {
                let subLayerInfo = msInfo.subLayersById[subLayerId];
                let levelAwareInfo = subLayerInfo.levelAwareInfo;
                let expression = makeExpression(levelAwareInfo);
                if (levelAwareInfo &&
                   (levelAwareInfo.isFacilities || levelAwareInfo.isLevelAware)) {
                  hasDefinition = true;
                  setExpression_v3ms(levelAwareInfo,expression,subLayerId,definitions);
                }
              });
              if (hasDefinition) {
                //console.log("v3ms definitions",definitions);
                layer.setLayerDefinitions(definitions);
              }
            }
          }
        } else {
          let levelAwareInfo = aiim.getLevelAwareInfo(task,layer);
          let expression = makeExpression(levelAwareInfo);
          setExpression(levelAwareInfo,layer,expression);
        }
      });
    },

    _getLayerDefinitionExpression: function(task,levelAwareInfo,layer) {
      const jsapi = task.context.jsapi;
      return jsapi.getLayerDefinitionExpression(task,layer);
    },

    _makeWhere_2D: function(task,levelAwareInfo,criteria,aboveFacilities) {
      let where = "";
      const whereParts = this._makeWhereParts(task,levelAwareInfo,criteria);
      if (whereParts && whereParts.facilityShellNotEquals) {
        where = "(" + whereParts.facilityShellNotEquals + ")";
        return where;
      }
      if (whereParts && levelAwareInfo.facilityIdField && levelAwareInfo.levelIdField) {
        const p1 = whereParts.facilityIdEquals;
        const p2 = whereParts.levelIdEquals;
        const p3 = whereParts.facilityIdNotEquals;
        const p4 = whereParts.locTypeOutdoors;
        if (p1 && p2) {
          where = "(" + p1 + " AND " + p2 + ")";
          if (aboveFacilities) {
            if (!levelAwareInfo.requiresFacilityMode) {
              where = "(" + where + " OR " + p3 + ")";
            }
          }
          if (p4) {
            where = "(" + where + " OR " + p4 + ")";
          }
        } else {
          where = this._makeWhere_2DDefault(task,levelAwareInfo,aboveFacilities);
        }
      }
      return where;
    },

    _makeWhere_2DDefault: function(task,levelAwareInfo,aboveFacilities) {
      let where = "";
      const whereParts = this._makeWhereParts(task,levelAwareInfo,{});
      if (whereParts && levelAwareInfo.facilityIdField && levelAwareInfo.levelIdField) {
        where = "1=2";
        if (aboveFacilities && !levelAwareInfo.requiresFacilityMode) {
          where = "1=1";
        } else {
          if (whereParts.locTypeOutdoors) {
            where = whereParts.locTypeOutdoors;
          }
        }
      }
      return where;
    },

    _makeWhere_3D: function(task,levelAwareInfo,criteria) {
      let where = "";
      const whereParts = this._makeWhereParts(task,levelAwareInfo,criteria);
      if (whereParts && whereParts.facilityShellNotEquals) {
        where = "(" + whereParts.facilityShellNotEquals + ")";
        return where;
      }
      if (whereParts && levelAwareInfo.facilityIdField && levelAwareInfo.levelIdField) {
        const p1 = whereParts.facilityIdEquals;
        const p2 = whereParts.levelIdEquals;
        const p3 = whereParts.facilityIdNotEquals;
        if (p1 && p2) {
          where = "(" + p1 + " AND " + p2 + ")";
          where += " OR " + p3;
        }
      }
      return where;
    },

    _makeWhereParts: function(task,levelAwareInfo,criteria) {
      const isLevelAware = (levelAwareInfo && levelAwareInfo.isLevelAware);
      const isFacilities = (levelAwareInfo && levelAwareInfo.isFacilities);
      const util = task.context.util;
      const parts = {
        facilityShellNotEquals: null,
        facilityIdEquals: null,
        facilityIdNotEquals: null,
        levelIdEquals: null,
        locTypeOutdoors: null
      };
      let field, id;

      if (isFacilities && task.context.toggleFacilityShells) {
        id = criteria && criteria.facilityId;
        field = levelAwareInfo.facilityIdField;
        if (typeof id === "string" && id.length > 0 && field) {
          parts.facilityShellNotEquals = "("+field+" <> '"+util.escSqlQuote(id)+"')";
        }
        return parts;
      }

      if (!isLevelAware) return null;

      id = criteria && criteria.facilityId;
      field = levelAwareInfo.facilityIdField;
      if (typeof id === "string" && id.length > 0 && field) {
        parts.facilityIdEquals = "("+field+" = '"+util.escSqlQuote(id)+"')";
        parts.facilityIdNotEquals = "("+field+" <> '"+util.escSqlQuote(id)+"')";
      }

      id = criteria && criteria.levelId;
      field = levelAwareInfo.levelIdField;
      if (typeof id === "string" && id.length > 0 && field) {
        parts.levelIdEquals = "("+field+" = '"+util.escSqlQuote(id)+"')";
      }

      field = levelAwareInfo.locTypeField;
      if (field) {
        parts.locTypeOutdoors = "("+field+" = 0)";
      }
      return parts;
    },

    _resetDefinitionExpression: function(task,levelAwareInfo,layer) {
      const current = this._getLayerDefinitionExpression(task,levelAwareInfo,layer);
      if (current) {
        let original = levelAwareInfo.originalDefinitionExpression;
        if (original !== current) {
          if (original === undefined) original = null;
          const expression = original;
          this._setLayerDefinitionExpression(task,levelAwareInfo,layer,expression);
        }
      }
    },

    _setDefinitionExpression: function(task,levelAwareInfo,layer,expression) {
      const original = levelAwareInfo.originalDefinitionExpression;
      if (!expression || expression.length === 0 || expression === "1=1") {
        this._resetDefinitionExpression(task,levelAwareInfo,layer);
      } else {
        if (typeof original === "string" && original.length > 0) {
          expression = original + " AND (" + expression + ")";
        }
        this._setLayerDefinitionExpression(task,levelAwareInfo,layer,expression);
      }
    },

    _setDefinitionExpression_v3ms: function(task,levelAwareInfo,expression,subLayerId,definitions) {
      let original = levelAwareInfo.originalDefinitionExpression;
      if (!expression || expression.length === 0 || expression === "1=1") {
        const current = definitions[subLayerId];
        if (current && (original !== current)) {
          if (original === undefined) original = null;
          definitions[subLayerId] = expression;
          //console.log("setDefExpr v3ms ",levelAwareInfo.title,expression);
        }
      } else {
        if (typeof original === "string" && original.length > 0) {
          expression = original + " AND (" + expression + ")";
        }
        definitions[subLayerId] = expression;
        //console.log("setDefExpr v3ms ",levelAwareInfo.title,expression);
      }
    },

    _setLayerDefinitionExpression: function(task,levelAwareInfo,layer,expression) {
      const jsapi = task.context.jsapi;
      jsapi.setLayerDefinitionExpression(task,layer,expression);
      //console.log("setDefExpr",levelAwareInfo.title,expression);
    },

  };

  return selectionUtil;
});
