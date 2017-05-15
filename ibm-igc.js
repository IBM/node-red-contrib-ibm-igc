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
   * Run a search, using the received payload as the query (or, if not an object, use the 
   * query string defined within the node itself)
   */
  function IGCSearchNode(n) {
    RED.nodes.createNode(this, n);

    this.server = RED.nodes.getNode(n.server);
    const node = this;
    if (!this.server) {
      node.error("No IGC configuration node present", {});
    }

    this.query = n.query;

    node.on("input", function(msg) {

      const receivedQ = (typeof msg.payload === "object") ? msg.payload : this.query;
      igcrest.search(receivedQ, function(err, result) {
        _sendResultsOnPayload(node, err, result);
      });

    });

  }
  RED.nodes.registerType("IGC search", IGCSearchNode);

  /**
   * Get metadata using any arbitrary GET-based REST URL (e.g. next page of results from 'next', full asset details from '_url', etc)
   */
  function IGCGetURL(n) {
    RED.nodes.createNode(this, n);

    this.server = RED.nodes.getNode(n.server);
    const node = this;
    if (!this.server) {
      node.error("No IGC configuration node present", {});
    }

    node.on("input", function(msg) {
      const receivedURL = (typeof msg.url === "string") ? msg.url : "";
      const callURL = receivedURL.substring(receivedURL.indexOf('/ibm/iis/igc-rest'));
      igcrest.makeRequest('GET', callURL, null, null, null, function(res, resSearch) {
        let err = null;
        if (res.statusCode !== 200) {
          err = "Unsuccessful request " + res.statusCode + "\n" + res.headers;
          node.error(err);
          node.error('headers: ', res.headers);
        }
        _sendResultsOnPayload(node, err, resSearch);
      });
    });

  }
  RED.nodes.registerType("IGC get", IGCGetURL);

  /**
   * Update metadata by RID and update JSON
   */
  function IGCUpdate(n) {
    RED.nodes.createNode(this, n);

    this.server = RED.nodes.getNode(n.server);
    const node = this;
    if (!this.server) {
      node.error("No IGC configuration node present", {});
    }

    node.on("input", function(msg) {
      const receivedRID = (typeof msg.rid === "string") ? msg.rid : "";
      const updateJSON  = (typeof msg.update === "object") ? msg.update : {};
      igcrest.update(receivedRID, updateJSON, function(err, result) {
        if (err) {
          node.error(err, err);
        } else {
          node.log("Update result: " + result);
        }
      });
    });

  }
  RED.nodes.registerType("IGC update", IGCUpdate);

  function _sendResultsOnPayload(node, err, result) {
    const msg = {};
    if (!err) {
      msg.payload = result;
    } else {
      msg.payload = null;
      node.error(err, err);
    }
    node.send(msg);
  }

};
