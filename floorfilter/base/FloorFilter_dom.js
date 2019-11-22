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

  const FloorFilter_dom = declare(null, {

    context: null,
    domNode: null,

    constructor: function(props) {
      Object.assign(this,props);
    },

    startup: function() {
      this._validateActiveFacilityInfo();
      const context = this.context;
      const facilityId = this._getActiveFacilityId();
      if (facilityId) {
        if (context.autoZoomOnStart) {
          this._zoomToFacility(facilityId);
        }
      }
      this._selectFacilityLevel();
      this._render();
      this._updateClearButton();
      this._scrollIntoView();

      if (context.facilities) {
        context.facilities.activate = (feature,facilityId) => {
          this._setActiveFacilityId(facilityId,true,false);
        };
      }
    },

    /* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

    _clearActiveLevelClass: function(btn) {
      const activeClass = "i-floorfilter-active";
      const nl = this.domNode.querySelectorAll("li > ." + activeClass);
      if (nl) {
        nl.forEach(el => {
          if (el !== btn) {
            el.classList.remove(activeClass);
          }
        })
      }
    },

    _clearLevels: function() {
      const list = this.domNode.querySelector(".i-floorfilter-levels");
      if (list) list.innerHTML = "";
      return list;
    },

    _deactivateFacility: function() {
      const activeFacilityInfo = this._getActiveFacilityInfo();
      if (activeFacilityInfo.facilityId) {
        const context = this.context;
        const task = {
          context: context,
          map: context.map,
          view: context.view
        };
        activeFacilityInfo.facilityId = null;
        activeFacilityInfo.levelId = null;
        this._updateFacilitySelect();
        this._renderLevels();
        context.selectionUtil.clearSelectedFacilityLevel(task);
        context.jsapi.clearFacilityHighlight(task);
        this._onChange({
          facilityId: null,
          levelId: null
        });
      }
      this._updateClearButton();
      this._scrollIntoView();
    },

    _getActiveFacilityId: function() {
      return this._getActiveFacilityInfo().facilityId;
    },

    _getActiveFacilityInfo: function() {
      return this.context.activeFacilityInfo;
    },

    _getActiveLevelId: function() {
      return this._getActiveFacilityInfo().levelId;
    },

    _getFacilityData: function(facilityId) {
      const levels = this.context.levels;
      if (facilityId && levels) {
        return levels.getFacilityData(facilityId);
      }
      return null;
    },

    _hasActiveFacilityData: function() {
      const facilityId = this._getActiveFacilityId();
      const facilityData = this._getFacilityData(facilityId);
      return !!facilityData;
    },

    _highlightFacility: function(facilityId) {
      const context = this.context;
      if (context.highlightFacility2D && context.facilities) {
        const facility = context.facilities.findFeatureById(facilityId);
        const task = {
          context: context,
          map: context.map,
          view: context.view
        };
        if (facility) {
          context.jsapi.addFacilityHighlight(task,facility,facilityId);
        } else {
          context.jsapi.clearFacilityHighlight(task);
        }
      }
    },

    _makeTestLevels: function(facilityId,levels) {
      if (facilityId === "ESRI.RED.MAIN.O") {
        if (this._tmpTestLevels) return this._tmpTestLevels;
        let levels0 = levels.slice().reverse();
        let n = 0, levels2 = [];
        for (let i=1;i<=10;i++) {
          for (let j=1;j<=3;j++) {
            n++;
            let levelData = {
              levelId: levels0[j - 1].levelId,
              shortName: "Level " + n,
              verticalOrder: j - 1
            };
            levels2.push(levelData);
          }
        }
        this._tmpTestLevels = levels2;
        return levels2.reverse();
      }
      return levels;
    },

    _onChange: function(props) {},

    _render: function() {
      const domNode = this.domNode;
      this._renderFacilities(domNode);
      this._renderLevels();
    },

    _renderAll: function(parentNode) {
      const i18n = this.context.i18n;
      const label = i18n.floorFilter.all;
      const btn = document.createElement("button");
      btn.setAttribute("type","button");
      btn.setAttribute("title",label);
      btn.setAttribute("class","i-floorfilter-all");
      btn.onclick = () => {
        this._clearActiveLevelClass();
        const activeFacilityInfo = this._getActiveFacilityInfo();
        activeFacilityInfo.levelId = null;
        this._selectFacilityLevel();
      };
      btn.appendChild(document.createTextNode(label));
      if (parentNode) parentNode.appendChild(btn);
    },

    _renderClear: function(parentNode) {
      const i18n = this.context.i18n;
      const label = i18n.floorFilter.clear;
      const btn = document.createElement("button");
      btn.setAttribute("type","button");
      btn.setAttribute("title",label);
      btn.setAttribute("class","i-floorfilter-clear");
      btn.onclick = () => {
        this._deactivateFacility();
      };
      btn.appendChild(document.createTextNode("X"));
      // const icon = document.createElement("span");
      // icon.setAttribute("class","i-floorfilter-exit");
      // btn.appendChild(icon);
      if (parentNode) parentNode.appendChild(btn);
    },

    _renderExpander: function(parentNode) {
      const i18n = this.context.i18n;
      const label = i18n.floorFilter.facility;
      const hiddenClass = "i-floorfilter-hidden";
      const btn = document.createElement("button");
      btn.setAttribute("type","button");
      btn.setAttribute("title",label);
      btn.setAttribute("class","i-floorfilter-expander");
      btn.onclick = () => {
        const nd = this.domNode.querySelector(".i-floorfilter-facilities-container");
        if (nd) {
          nd.classList.toggle(hiddenClass);
        }
      };
      const icon = document.createElement("span");
      icon.setAttribute("class","i-floorfilter-location");
      btn.appendChild(icon);
      if (parentNode) parentNode.appendChild(btn);
    },

    _renderFacilities: function(parentNode) {
      const context = this.context;
      const i18n = context.i18n;
      const data = context.levels && context.levels.data;
      const facilities = data && data.facilities;
      if (!facilities || facilities.length === 0) return;
      const activeFacilityId = this._getActiveFacilityId();

      this._renderExpander(parentNode);

      const container = document.createElement("div");
      container.setAttribute("class","i-floorfilter-facilities-container");
      if (parentNode) parentNode.appendChild(container);

      const sel = document.createElement("select");
      sel.setAttribute("class","i-floorfilter-facilities");

      const addExpander = () => {
        const option = document.createElement("option");
        option.innerHTML = name;
        option.value = id;
        option.selected = selected;
        sel.appendChild(option);
      };

      const appendOption = (name,id,selected,isPlaceholder) => {
        const option = document.createElement("option");
        option.innerHTML = name;
        option.value = id;
        option.selected = selected;
        if (isPlaceholder) {
          option.setAttribute("class","i-floorfilter-option-placeholder");
        }
        sel.appendChild(option);
      };

      appendOption(i18n.floorFilter.facility,"",false,true);
      facilities.forEach(facility => {
        const name = facility.facilityName;
        const facilityId = facility.facilityId;
        const selected = (facilityId === activeFacilityId);
        appendOption(name,facilityId,selected,false);
      });
      sel.onchange = (e) => {
        const option = sel.options[sel.selectedIndex];
        const facilityId = option && option.value;
        if (facilityId) {
          this._setActiveFacilityId(facilityId,true,true);
        } else {
          this._deactivateFacility();
        }
      };

      container.appendChild(sel);
      this._renderClear(container);
    },

    _renderLevel: function(parentNode,levelData,isLast) {
      const activeClass = "i-floorfilter-active";
      const name = levelData.levelShortName;
      const item = document.createElement("li");
      const btn = document.createElement("button");
      const activeLevelId = this._getActiveLevelId();
      btn.setAttribute("type","button");
      btn.setAttribute("class","i-floorfilter-level");
      if (activeLevelId === levelData.levelId) {
        btn.classList.add(activeClass);
      }
      if (isLast) {
        btn.classList.add("i-floorfilter-bottom");
      }
      btn.onclick = () => {
        this._clearActiveLevelClass(btn);
        const activeFacilityInfo = this._getActiveFacilityInfo();
        activeFacilityInfo.levelId = levelData.levelId;
        btn.classList.add(activeClass);
        this._selectFacilityLevel();
      };
      const txt = document.createTextNode(name);
      btn.appendChild(txt);
      item.appendChild(btn);
      if (parentNode) parentNode.appendChild(item);
    },

    _renderLevels: function() {
      const parentNode = this.domNode;
      const context = this.context;
      const data = context.levels && context.levels.data;
      const facilityId = this._getActiveFacilityId();
      let numLevels = 0;

      let container = this.domNode.querySelector(".i-floorfilter-levels-container");
      if (!container) {
        container = document.createElement("div");
        container.setAttribute("class","i-floorfilter-levels-container");
        if (parentNode) parentNode.appendChild(container);
      }

      let list = this._clearLevels();
      if (!list) {
        list = document.createElement("ul");
        list.setAttribute("class","i-floorfilter-levels");
        container.appendChild(list);
      }
      if (data && data.facilitiesById) {
        if (typeof facilityId === "string" && facilityId.length > 0) {
          const facility = data.facilitiesById[facilityId];
          if (facility && facility.levels && facility.levels.length > 0) {
            let levels = facility.levels.slice().reverse();
            numLevels = levels.length

            // testing only
            //levels = this._makeTestLevels(facilityId,levels);

            levels.forEach((level,index) => {
              hasLevels = true;
              let isLast = (index === (levels.length - 1));
              this._renderLevel(list,level,isLast);
            });
          }
        }
      }

      const is3D = context.jsapi.is3D();
      if (is3D) {
        const ndAll = this.domNode.querySelector(".i-floorfilter-all");
        if (numLevels > 0) {
          if (!ndAll) {
            this._renderAll(parentNode);
          } else {
            ndAll.style.display = "";
          }
        } else {
          if (ndAll) ndAll.style.display = "none";
        }
      }
    },

    _scrollIntoView: function() {
      let node;
      let nl = this.domNode.querySelectorAll("li > .i-floorfilter-active");
      if (nl && nl.length > 0) node = nl[nl.length - 1];
      if (!node) node = this.domNode.querySelector("li > .i-floorfilter-bottom");
      if (node) {
        node.scrollIntoView({block: "end", behavior: "smooth"});
      }
    },

    _selectFacilityLevel: function() {
      const context = this.context;
      const task = {
        context: context,
        map: context.map,
        view: context.view
      };
      const criteria = {
        facilityId: this._getActiveFacilityId(),
        levelId: this._getActiveLevelId()
      };
      context.selectionUtil.selectFacilityLevel(task,criteria);
      this._onChange({
        facilityId: criteria.facilityId,
        levelId: criteria.levelId
      });
    },

    _setActiveFacilityId: function(facilityId,apply,fromFacilitySelect,levelData) {
      let levelId = null;
      if (levelData && levelData.levelId) {
        levelId = levelData.levelId;
      } else if (!this.context.jsapi.is3D()) {
        levelId = this.context.levels.getBaseLevelId(facilityId);
      }
      const activeFacilityInfo = this._getActiveFacilityInfo();
      activeFacilityInfo.facilityId = facilityId;
      activeFacilityInfo.levelId = levelId;
      if (apply) {
        if (!fromFacilitySelect) this._updateFacilitySelect();
        this._zoomToFacility(facilityId);
        this._selectFacilityLevel();
        this._renderLevels();
        this._updateClearButton();
        this._scrollIntoView();
        this._highlightFacility(facilityId);
      }
    },

    _setFacility: function(params) {
      const levels = this.context.levels;
      const facilities = levels && levels.getFacilities();
      if (params && facilities) {
        const facilityId = params.facilityId;
        const facilityName = params.facilityName;
        const levelId = params.levelId;
        const levelName = params.levelName;
        const levelShortName = params.levelShortName;
        const levelNumber = params.levelNumber;
        const verticalOrder = params.verticalOrder;
        const hasFacilityId = (typeof facilityId === "string");
        const hasFacilityName = (typeof facilityName === "string");
        const hasLevelId = (typeof levelId === "string");
        const hasLevelName = (typeof levelName === "string");
        const hasLevelShortName = (typeof levelShortName === "string");
        const hasLevelNumber = (typeof levelNumber === "number");
        const hasVerticalOrder = (typeof verticalOrder === "number");
        let facilityData, levelData;
        facilities.some(data => {
          let matched = false;
          if (hasFacilityId) {
            matched = (facilityId === data.facilityId);
          } else if (hasFacilityName) {
            matched = (facilityName === data.facilityName);
          }
          if (matched) facilityData = data;
          return matched;
        });
        if (facilityData) {
          if (facilityData.levels) {
            facilityData.levels.some(data => {
              let matched = false;
              if (hasLevelId) {
                matched = (levelId === data.levelId);
              } else if (hasLevelName) {
                matched = (levelName === data.levelName);
              } else if (hasLevelShortName) {
                matched = (levelShortName === data.levelShortName);
              } else if (hasLevelNumber) {
                matched = (levelNumber === data.levelNumber);
              } else if (hasVerticalOrder) {
                matched = (verticalOrder === data.verticalOrder);
              }
              if (matched) levelData = data;
              return matched;
            });
          }
          if (!levelData) levelData = levels.getBaseLevel(facilityData.facilityId);
          if (levelData) {
            this._setActiveFacilityId(levelData.facilityId,true,false,levelData);
          }
        }
      }
    },

    _updateClearButton: function() {
      const activeFacilityId = this._getActiveFacilityId();
      const btn = this.domNode.querySelector(".i-floorfilter-clear");
      if (btn) {
        if (activeFacilityId) {
          btn.disabled = false;
        } else {
          btn.disabled = true;
        }
      }
    },

    _updateFacilitySelect: function() {
      let activeFacilityId = this._getActiveFacilityId();
      if (!activeFacilityId) activeFacilityId = "";
      const sel = this.domNode.querySelector("select.i-floorfilter-facilities");
      if (sel && sel.options && sel.options.length > 0) {
        let selectedIndex = 0;
        const options = sel.options;
        const n = options.length;
        for (let i=0; i<n; i++) {
          let option = options[i];
          if (option.value === activeFacilityId) {
            selectedIndex = i;
            break;
          }
        }
        if (selectedIndex >= 0) {
          sel.selectedIndex = selectedIndex;
        }
        if (selectedIndex === 0 && activeFacilityId) {
          const msg = this.context.msgPrefix+"Facility has no levels:";
          console.warn(msg,activeFacilityId);
        }
      }
    },

    _validateActiveFacilityInfo: function() {
      const context = this.context;
      const activeFacilityInfo = this._getActiveFacilityInfo();
      let facilityId  = activeFacilityInfo.facilityId;
      if (facilityId) {
        facilityId = context.levels.validateFacilityId(facilityId);
        if (!facilityId) {
          const msg = context.msgPrefix+"Facility ID no found:";
          console.warn(msg,facilityId);
          activeFacilityInfo.facilityId = null;
          activeFacilityInfo.levelId = null;
        } else {
          let levelId  = activeFacilityInfo.levelId;
          if (levelId) {
            levelId = context.levels.validateLevelId(facilityId,levelId);
            if (!levelId) {
              const msg = context.msgPrefix+"Level ID no found:";
              console.warn(msg,levelId);
              activeFacilityInfo.levelId = null;
            }
          }
          if (!levelId) {
            if (!context.jsapi.is3D()) {
              levelId = this.context.levels.getBaseLevelId(facilityId);
              activeFacilityInfo.levelId = levelId;
            }
          }
        }
      } else {
        activeFacilityInfo.levelId = null;
      }
    },

    _zoomToFacility: function(facilityId) {
      const facilityData = this._getFacilityData(facilityId);
      const facilities = this.context.facilities;
      if (facilities && facilityData) {
        const context = this.context;
        const task = {
          context: context,
          map: context.map,
          view: context.view
        };
        facilities.zoomTo(task,facilityId);
      }
    },

  });

  return FloorFilter_dom;
});
