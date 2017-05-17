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
    const restConnect = new commons.RestConnection(this.username, this.password, this.host, this.port, "", false);
    igcrest.setConnection(restConnect);
    igcrest.disableThrowingErrors();
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

        const qToRun = (typeof this.query === 'string' && this.query !== '') ? JSON.parse(this.query) : msg.query;
        igcrest.search(qToRun, function(err, result) {
          _sendResults(node, err, msg, result);
        });

      } else if (node.search === "_id_") {

        const rid = (typeof this.rid === 'string' && this.rid !== '') ? this.rid : msg.rid;
        let properties = [];
        if (typeof this.ridproperties === 'string' && this.ridproperties !== '') {
          properties = this.ridproperties.split(",").map(item=>item.trim());
        } else if (Array.isArray(msg.properties)) {
          properties = msg.properties;
        }

        if (properties.length === 0 || (properties.length === 1 && properties[0] === '')) {
          igcrest.getAssetById(rid, function(err, result) {
            _sendResults(node, err, msg, result);
          });
        } else {
          const type = (typeof msg.type === "string") ? msg.type : this.ridtype;
          igcrest.getAssetPropertiesById(rid, type, properties, 10, true, function(err, result) {
            _sendResults(node, err, msg, result);
          });
        }

      } else if (node.search === "_url_") {

        let callURL = (typeof this.url === 'string' && this.url !== '') ? this.url : msg.url;

        if (callURL.indexOf('https://') !== -1) {
          callURL = callURL.substring(callURL.indexOf('/ibm/iis/igc-rest'));
        }
        igcrest.getOther(callURL, 200, function(err, result) {
          _sendResults(node, err, msg, result);
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

        const type = (typeof this.assettype === 'string' && this.assettype !== '') ? this.assettype : msg.type;
        const detailsJSON = (typeof this.details === 'string' && this.details !== '') ? JSON.parse(this.details) : msg.details;
        igcrest.create(type, detailsJSON, function(err, result) {
          _sendResults(node, err, msg, result);
        });

      } else if (node.operation === "update") {

        const rid = (typeof this.rid === 'string' && this.rid !== '') ? this.rid : msg.rid;
        const detailsJSON = (typeof this.details === 'string' && this.details !== '') ? JSON.parse(this.details) : msg.details;
        igcrest.update(rid, detailsJSON, function(err, result) {
          _sendResults(node, err, msg, result);
        });

      } else if (node.operation === "delete") {

        const rid = (typeof this.rid === 'string' && this.rid !== '') ? this.rid : msg.rid;
        igcrest.deleteAssetById(rid, function(err, result) {
          _sendResults(node, err, msg, result);
        });

      }

    });

  }
  RED.nodes.registerType("IGC out", IGCOutNode);

  function _sendResults(node, err, msg, result) {
    if (!err) {
      node.send(result);
    } else {
      node.error(err, msg);
    }
  }

};
