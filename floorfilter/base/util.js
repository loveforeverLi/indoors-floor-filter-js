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
define(["dojo/_base/lang"],
function(lang) {

  let COUNTER = 0;

  const util = {

    checkMixedContent: function(uri) {
      if (typeof window.location.href === "string" &&
          window.location.href.indexOf("https://") === 0) {
        if (typeof uri === "string" && uri.indexOf("http://") === 0) {
          uri = "https:" + uri.substring("5");
        }
      }
      return uri;
    },

    escSqlQuote: function(value) {
      if (typeof value === "string" ) {
        return value.replace("'","''");
      }
      return value;
    },

    findField: function(fields, name) {
      let found = null;
      if (fields && fields.length > 0) {
        const lc = name.toLowerCase();
        fields.some(field => {
          if (lc === field.name.toLowerCase()) {
            found = field;
            return true;
          }
        })
      }
      return found;
    },

    getAttributeValue: function(attributes, name) {
      if (!attributes) return;
      if (typeof name !== "string") return;
      if (attributes.hasOwnProperty(name)) return attributes[name];
      const lc = name.toLowerCase();
      let value;
      Object.keys(attributes).some(key => {
        if (key.toLowerCase() === lc) {
          value = attributes[key];
          return true;
        }
      });
      return value;
    },

    hasAttribute: function(attributes, name) {
      if (!attributes) return false;
      if (typeof name !== "string") return false;
      if (attributes.hasOwnProperty(name)) return true;
      const lc = name.toLowerCase();
      return Object.keys(attributes).some(key => {
        if (key.toLowerCase() === lc) return true;
        return false;
      });
    },

    isIntegerField: function(field) {
      return (field && (field.type === "integer" || field.type === "esriFieldTypeInteger"));
    },

    isStringField: function(field) {
      return (field && (field.type === "string" || field.type === "esriFieldTypeString"));
    },

    randomId: function() {
      return "id-" + Date.now() + "-" + COUNTER++;
    },

  };

  return util;
});
