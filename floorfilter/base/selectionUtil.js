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
      task.context.jsapi.clearFacilityHoverHighlight(task);
      this._applyFacilityLevelExpressions(task,{},true);
    },

    selectFacilityLevel: function(task,criteria) {
      task.context.jsapi.clearFacilityHoverHighlight(task);
      this._applyFacilityLevelExpressions(task,criteria,false);
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _applyFacilityLevelExpressions: function(task,criteria,clear) {
      const is3D = (task.view && task.view.type === "3d");
      const aiim = task.context.aiim;
      const jsapi = task.context.jsapi;
      const layers = jsapi.getLayers(task);
      const levels = task.context.levels;
      if (levels && criteria) {
        const facilityData = levels.getFacilityData(criteria.facilityId);
        if (facilityData) {
          criteria.levelData = facilityData.levelsById[criteria.levelId];
        }
      }

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
      const parts = this._makeWhereParts(task,levelAwareInfo,criteria,true,aboveFacilities);
      if (parts && parts.facilityShellNotEquals) {
        where = "(" + parts.facilityShellNotEquals + ")";
        return where;
      }
      if (parts && parts.hasFacilityField && parts.hasLevelField) {
        const requiresFacilityMode = levelAwareInfo && levelAwareInfo.requiresFacilityMode;
        const p1 = parts.facilityPart;
        const p2 = parts.levelPart;
        const p3 = parts.notFacilityPart;
        const p4 = parts.outdoorsPart;
        const p5 = parts.groundFloorPart;
        if (p1 && p2) {
          where = "(" + p1 + " AND " + p2 + ")";
          if (aboveFacilities && !requiresFacilityMode) {
            where = "(" + where + " OR " + p3 + ")";
          } else {
            if (p5) {
              const v = "(" + p3 + " AND " + p5 + ")";
              where = "(" + where + " OR " + v + ")";
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
      const parts = this._makeWhereParts(task,levelAwareInfo,{},true,aboveFacilities);
      if (parts && parts.hasFacilityField && parts.hasLevelField) {
        const requiresFacilityMode = levelAwareInfo && levelAwareInfo.requiresFacilityMode;
        if (requiresFacilityMode) {
          where = "1=2";
          if (parts.groundFloorPart) {
            where = parts.groundFloorPart;
          }
        } else if (!aboveFacilities && parts.groundFloorPart) {
          where = parts.groundFloorPart;
          if (parts.outdoorsPart) {
            where = "(" + where + " OR " + parts.outdoorsPart + ")";
          }
        } else if (!aboveFacilities && parts.outdoorsPart) {
          where = parts.outdoorsPart;
        } else {
          where = "";
        }
      }
      return where;
    },

    _makeWhere_3D: function(task,levelAwareInfo,criteria) {
      let where = "";
      const parts = this._makeWhereParts(task,levelAwareInfo,criteria,false);
      if (parts && parts.facilityShellNotEquals) {
        where = "(" + parts.facilityShellNotEquals + ")";
        return where;
      }
      if (parts && parts.hasFacilityField && parts.hasLevelField) {
        const p1 = parts.facilityPart;
        const p2 = parts.levelPart;
        const p3 = parts.notFacilityPart;
        if (p1 && p2) {
          where = "(" + p1 + " AND " + p2 + ") OR " + p3;
        } else {
          where = "";
        }
      }
      return where;
    },

    _makeWhereParts: function(task,levelAwareInfo,criteria,is2D,aboveFacilities2D) {
      const isFacilities = (levelAwareInfo && levelAwareInfo.isFacilities);
      const mappings = (levelAwareInfo && levelAwareInfo.mappings); // TODO
      const fields = (levelAwareInfo && levelAwareInfo.fields);
      const util = task.context.util;
      const levels = task.context.levels;
      const aiim = task.context.aiim;
      const FieldNames = ((aiim && aiim.FieldNames) || {});

      const chkNum = (v) => {
        return (typeof v === "number" && isFinite(v));
      };

      const chkStr = (v) => {
        return (typeof v === "string" && v.length > 0);
      };

      const getField = (name,defaultValue) => {
        let fieldName = defaultValue;
        if (mappings && mappings.hasOwnProperty(name)) {
          fieldName = mappings[name];
        }
        if (chkStr(fieldName)) return util.findField(fields,fieldName);
        return;
      };

      const hasField = (pairs) => {
        return pairs.some(pair => {
          return !!pair.field;
        });
      };

      const makePart = (field,operator,value) => {
        if (util.isStringField(field)) {
          if (typeof value === "string" ) {
            value = "'" + util.escSqlQuote(value) + "'";
          }
        }
        return "(" + field.name + " " + operator + " " + value + ")";
      };

      const evaluatePairs = (pairs,operator) => {
        let part = null;
        pairs.some(pair => {
          const field = pair.field;
          let value = pair.value;
          let ok = false;
          if (field) {
            if (util.isStringField(field)) {
              if (chkNum(value)) value = "" + value;
              ok = chkStr(value);
            } else {
              ok = chkNum(value);
            }
          }
          //console.log(levelAwareInfo.title,ok,field && field.name,value);
          if (ok) {
            part = makePart(field,operator,value);
            return true;
          }
          return false;
        });
        return part;
      };

      const makeFacilityPairs = (levelData) => {
        let pairs = [{
          field: getField("facilityIdField",FieldNames.FACILITY_ID),
          value: levelData && levelData.facilityId
        }, {
          field: getField("facilityNameField",FieldNames.FACILITY_NAME),
          value: levelData && levelData.facilityName
        }];
        return pairs;
      };

      const makeLevelPairs = (levelData) => {
        let pairs = [{
          field: getField("levelNumberField",FieldNames.LEVEL_NUMBER),
          value: levelData && levelData.levelNumber
        }, {
          field: getField("levelIdField",FieldNames.LEVEL_ID),
          value: levelData && levelData.levelId
        }, {
          field: getField("levelNameField",FieldNames.LEVEL_NAME),
          value: levelData && levelData.levelName,
        }, {
          field: getField("verticalOrderField",FieldNames.VERTICAL_ORDER),
          value: levelData && levelData.verticalOrder,
        }, {
          field: getField("levelShortNameField",null),
          value: levelData && levelData.levelShortName
        }];
        return pairs;
      };

      // const parts = {
      //   facilityShellNotEquals: null,
      //   facilityIdEquals: null,
      //   facilityIdNotEquals: null,
      //   levelIdEquals: null,
      //   locTypeOutdoors: null,
      // };

      const parts = {
        facilityShellNotEquals: null,
        hasFacilityField: false,
        hasLevelField: false,
        facilityPart: null,
        levelPart: null,
        notFacilityPart: null,
        groundFloorPart: null,
        outdoorsPart: null
      };

      let pairs;
      let facilityId = criteria.facilityId;
      let levelData = criteria.levelData;

      if (!levelData && chkStr(facilityId) && is2D) {
        if (levels) levelData = levels.getBaseLevel(facilityId);
      }

      if (isFacilities && chkStr(facilityId) && task.context.toggleFacilityShells) {
        let id = criteria && criteria.facilityId;
        let field = levelAwareInfo.facilityIdField;
        if (typeof id === "string" && id.length > 0 && field) {
          parts.facilityShellNotEquals = "("+field+" <> '"+util.escSqlQuote(id)+"')";
        }
        return parts;
      }

      pairs = makeFacilityPairs(levelData);
      parts.hasFacilityField = hasField(pairs);
      if (levelData) {
        parts.facilityPart = evaluatePairs(pairs,"=");
        parts.notFacilityPart = evaluatePairs(pairs,"<>");
      }

      pairs = makeLevelPairs(levelData);
      parts.hasLevelField = hasField(pairs);
      if (levelData) {
        parts.levelPart = evaluatePairs(pairs,"=");
      }

      pairs = [{
        field: getField("locTypeField",FieldNames.LOCATION_TYPE),
        value: 0
      }];
      parts.outdoorsPart = evaluatePairs(pairs,"=");

      if (is2D && task.context.showAllFloorPlans2D) {
        const groundVO = 0;
        pairs = [{
          field: getField("verticalOrderField",FieldNames.VERTICAL_ORDER),
          value: groundVO
        }];
        parts.groundFloorPart = evaluatePairs(pairs,"=");
        if (!parts.groundFloorPart) {
          if (parts.hasFacilityField && parts.hasLevelField) {
            if (!aboveFacilities2D) {
              parts.groundFloorPart = "(1=2)";
              const considerAllFacilities = true;
              const exp = [];
              const facilities = levels && levels.getFacilities();
              if (considerAllFacilities && facilities) {
                facilities.forEach(facilityData => {
                  let data = facilityData.levelsByVO[groundVO];
                  let ok = !!data;
                  if (data && levelData && data.facilityId === levelData.facilityId) {
                    ok = false;
                  }
                  if (data && ok) {
                    let pairs1 = makeFacilityPairs(data);
                    let pairs2 = makeLevelPairs(data);
                    let part1 = evaluatePairs(pairs1,"=");
                    let part2 = evaluatePairs(pairs2,"=");
                    if (part1 && part2) {
                      let p = "(" + part1 + " AND " + part2 + ")";
                      exp.push(p);
                    }
                  }
                });
              }
              if (exp.length > 0) {
                let p = "(" + exp.join(" OR ") + ")";
                parts.groundFloorPart = p;
              }
            }
          }
        }
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
      //console.log("setDefExpr",levelAwareInfo && levelAwareInfo.title,expression);
    },

  };

  return selectionUtil;
});
