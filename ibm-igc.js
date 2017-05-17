/**
 * Copyright 2017 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

module.exports = function(RED) {

  const igcrest = require('ibm-igc-rest');
  const commons = require('ibm-iis-commons');

  /**
   * Create and register configuration nodes
   */
  function IGCNode(n) {
    RED.nodes.createNode(this, n);
    this.name = n.name;
    this.host = n.host;
    this.port = n.port;
    const credentials = this.credentials;
    if ((credentials) && (credentials.hasOwnProperty("username"))) { this.username = credentials.username; }
    if ((credentials) && (credentials.hasOwnProperty("pass"))) { this.password = credentials.pass; }
    const restConnect = new commons.RestConnection(this.username, this.password, this.host, this.port);
    igcrest.setConnection(restConnect);
  }
  RED.nodes.registerType("ibm-igc", IGCNode, {
    credentials: {
      pass: { type: "password" },
      username: { type: "text" }
    }
  });

  /**
   * Retrieve metadata from IGC based on the retrieval option selected
   */
  function IGCInNode(n) {
    RED.nodes.createNode(this, n);

    this.server = RED.nodes.getNode(n.server);
    this.search = n.search;
    this.query  = n.query;
    this.url    = n.url;
    this.rid    = n.rid;
    this.ridtype = n.ridtype;
    this.ridproperties = n.ridproperties;

    const node = this;
    if (!this.server) {
      node.error("No IGC configuration node present", {});
    }

    node.on("input", function(msg) {

      if (node.search === "_query_") {

        const receivedQ = (typeof msg.query === "object") ? msg.query : this.query;
        igcrest.search(receivedQ, function(err, result) {
          _sendResultsOnPayload(node, err, result);
        });

      } else if (node.search === "_id_") {

        const rid        = (typeof msg.rid === "string") ? msg.rid : this.rid;
        const properties = Array.isArray(msg.properties) ? msg.properties : this.ridproperties.split(",");

        if (properties.length === 0) {
          igcrest.getAssetById(rid, function(err, result) {
            _sendResultsOnPayload(node, err, result);
          });
        } else {
          const type = (typeof msg.type === "string") ? msg.type : this.ridtype;
          igcrest.getAssetPropertiesById(rid, type, properties, 10, true, function(err, result) {
            _sendResultsOnPayload(node, err, result);
          });
        }

      } else if (node.search === "_url_") {

        const receivedURL = (typeof msg.url === "string") ? msg.url : this.url;
        let callURL = receivedURL;
        if (receivedURL.indexOf('https://') !== -1) {
          callURL = receivedURL.substring(receivedURL.indexOf('/ibm/iis/igc-rest'));
        }
        igcrest.makeRequest('GET', callURL, null, null, null, function(res, resSearch) {
          let err = null;
          if (res.statusCode !== 200) {
            err = "Unsuccessful request " + res.statusCode + "\n" + res.headers;
            node.error(err);
            node.error('headers: ', res.headers);
          }
          _sendResultsOnPayload(node, err, resSearch);
        });

      }

    });

  }
  RED.nodes.registerType("IGC in", IGCInNode);

  /**
   * Retrieve metadata from IGC based on the retrieval option selected
   */
  function IGCOutNode(n) {
    RED.nodes.createNode(this, n);

    this.server = RED.nodes.getNode(n.server);

    this.operation = n.operation;
    this.rid       = n.rid;
    this.assettype = n.assettype;
    this.details   = n.details;

    const node = this;
    if (!this.server) {
      node.error("No IGC configuration node present", {});
    }

    node.on("input", function(msg) {

      if (node.operation === "create") {

        const type        = (typeof msg.type === "string") ? msg.type : this.assettype;
        const detailsJSON = (typeof msg.details === "object") ? msg.details : {};
        igcrest.create(type, detailsJSON, function(err, result) {
          _logResultsOnCompletion(node, err, "Create result", result);
        });

      } else if (node.search === "update") {

        const receivedRID = (typeof msg.rid === "string") ? msg.rid : "";
        const detailsJSON = (typeof msg.details === "object") ? msg.details : {};
        igcrest.update(receivedRID, detailsJSON, function(err, result) {
          _logResultsOnCompletion(node, err, "Update result", result);
        });

      } else if (node.search === "delete") {

        const rid = (typeof msg.rid === "string") ? msg.rid : this.rid;
        igcrest.deleteAssetById(rid, function(err, result) {
          _logResultsOnCompletion(node, err, "Delete result", result);
        });

      }

    });

  }
  RED.nodes.registerType("IGC out", IGCOutNode);

  function _sendResultsOnPayload(node, err, result) {
    let results = null;
    if (!err) {
      results = result;
    } else {
      node.error(err, err);
    }
    node.send(results);
  }

  function _logResultsOnCompletion(node, err, msg, result) {
    if (err) {
      node.error(err, err);
    } else {
      node.log(msg + ": " + result);
    }
  }

};
