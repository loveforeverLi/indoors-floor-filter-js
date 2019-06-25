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
    i18n: null,
    jsapi: null,
    levels: null,
    map: null, // a v3 map,
    msgPrefix: "",
    selectionUtil: null,
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
