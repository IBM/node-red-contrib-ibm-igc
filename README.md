# node-red-contrib-ibm-igc

This module provides a set of nodes in Node-RED for integrating with IBM Information Governance Catalog ("IGC").

## Pre-requisites

In addition to Node-RED, the module relies on two other NPM packages: `ibm-iis-commons` and `ibm-igc-rest`.

## Install

To install the stable version run the following command in your Node-RED user directory (typically `~/.node-red`):

`npm i node-red-contrib-ibm-igc`

Open your Node-RED instance and you should have IGC nodes available in the palette (under `storage`) and a new config node available once you drag one into a flow.

## IGC in

Input can be drawn from Information Governance Catalog in the following ways.  This uses both GET- and POST-based Information Governance Catalog REST APIs to retrieve metadata using the most efficient means possible.

In general, the set of results for the retrieval will have a structure of `{ items: [], paging: {} }`, where only the first 10 items retrieved will be included in the initial payload.  The `paging` property provides sufficient detail to retrieve the subsequent page of results each time, and can be passed-on using the URL Passthrough option described below.  When only a single (or very few) assets are retrieved, of course, the `paging` portion may be absent -- so it is worth checking for it via a Function node if you plan on making use of it.

### Complex Query

Using the Complex Query option, you can run an arbitrary search.  For example, you can pass a **Query** like this:

```
{
  "properties": ["name"],
  "types": ["term"],
  "where":
  {
    "operator": "and",
    "conditions": [
      {
        "property": "modified_on",
        "operator": ">=",
        "value": "1483232400"
      }
    ]
  }
}
```

to get a listing of the names of all business terms that were modified on or after January 1, 2017 (value provided as UNIX time).

More detailed options on query constructs can be found in the attachments linked to the following tech-notes:

* [Tips, Tricks & Time-Savers Guide](http://www.ibm.com/support/docview.wss?uid=swg27047054)
* [Sample REST API Calls and Use Case Descriptions Guide](http://www.ibm.com/support/docview.wss?uid=swg27047059)

If **Query** is empty, will look for a query as a JSON object in `msg.query`.

### URL Passthrough

Using the URL Passthrough mode allows you to invoke any arbitrary GET-based Information Governance Catalog REST API URL.  For example, you can pass any **URL** returned by a previous query's `next` property (for pagination), or the `_url` property (to get more details on that particular asset).

If **URL** is empty, will look for a URL as a string in `msg.url`.

(Note: if specific host details are supplied in the URL they will be overridden by the Server selected via the config node for IGC -- this is necessary to ensure credentials are passed appropriately).

### RID

Using the RID option you can retrieve a single asset's details by its unique Information Governance Catalog ID (RID).  You can also (optionally) provide a list of specific **Properties** to retrieve for the asset: in general this is a good practice, as it is more efficient than retrieving all properties.  Note that when doing so, specifying the **Type** of the asset then also becomes mandatory.

If **RID** is empty, will look for a RID as a string in `msg.rid`; if **Properties** is empty, will look for properties as an array in `msg.properties`; if **Type** is empty, will look for the type as a string in `msg.type`.

## IGC out

Output can be stored into Information Governance Catalog in the following ways.  This uses the appropriate Information Governance Catalog REST API to make updates to metadata, whether creating new assets, updating existing assets, or deleting existing assets.  All operations will push their results out to the output port for optional consumption; if any error has occured, an error will be raised with the details -- use a Catch node to capture these.

### Create

The Create operation should only be used when an asset does not already exist in IGC with the details that need to be stored.  If the asset already exists, and you simply wish to set some additional properties on the asset (or replace existing ones), use the Update operation instead.  If you attempt to Create an asset that already exists, an error will result.

Using the Create operation, you need to provide both the **Type** of the asset to create and the **Details** of the property values to set within it.  Note that different assets have different required properties as part of their creation; in general this will require at least the _name_ property.

The output link will contain the RID of the created asset, as a string.

For example, use a **Type** of _category_ and provide **Details** like this:

```
{
  "name": "Test Category"
}
```

to create a new top-level category named _"Test Category"_.

If **Type** is empty, will look for the type as a string in `msg.type`; if **Details** is empty, will look for the detailed properties as a JSON object in `msg.details`.

### Update

The Update operation expects a unique IGC identifier (**RID**) to specify which specific piece of metadata to update.  **Details** are also needed to define what on that piece of metadata should be updated.  This second parameter is expected to be a JSON object, and should contain only the properties that need to change on the asset.

The output link will be the changed properties of the asset (typically matching the provided **Details**), as a JSON object.

For example, you can use the following **Details**:

```
{
  "short_description": "a new short description",
  "labels": {
    "items": [ "6662c0f2.22257cc4.p864keo17.vbbgrpe.26j4m1.mgcmn0lh4fb2ggdjb7ujo", "6662c0f2.22257cc4.p864keo18.0o97qi8.f1ar57.dmjlsjtjghbifmi6p2tc4" ],
    "mode": "add"
  }
}
```

to update the short description of the piece of metadata, and also add (append) two new labels.

Note:
* related items must be specified by their **RID**
* using `replace` as the _mode_ will overwrite any existing relationships
* (if you use `replace` as the _mode_ and provide an empty array, all of those relationships will be removed from that asset)

If **RID** is empty, will look for the RID as a string in `msg.rid`; if **Details** is empty, will look for the detailed properties as a JSON object in `msg.details`.

### Delete

Like the Update operation, the Delete operation requires a unique IGC identifier (**RID**) to specify which specific piece of metadata to delete.  No Details object is needed as the entire asset (and all of its properties) will be deleted.

On successful deletion, the standard output will be empty (just a payload containing only Node-RED's *_msgid*).

If **RID** is empty, will look for the RID as a string in `msg.rid`.

## Example flow

The example flow pasted below retrieves key term details (ID, name, short description, long description, and related assets) for all terms published in IGC, iterating through multiple pages of results:

```
[
  {
    "id": "8dd27fec.9c3dc",
    "type": "tab",
    "label": "Get Terms and Related Assets"
  },
  {
    "id": "8ed2d18a.14748",
    "type": "ibm-igc",
    "z": "",
    "host": "yourHostForIGC",
    "port": "9445",
    "name": "IGC_HOST"
  },
  {
    "id": "e5403847.44885",
    "type": "IGC in",
    "z": "8dd27fec.9c3dc",
    "name": "Search IGC",
    "server": "8ed2d18a.14748",
    "search": "_query_",
    "query": "",
    "url": "",
    "rid": "",
    "ridtype": "",
    "ridproperties": "",
    "x": 157,
    "y": 156,
    "wires": [
      [
        "1adade39.6d3afa"
      ]
    ]
  },
  {
    "id": "f9394507.c723c",
    "type": "inject",
    "z": "8dd27fec.9c3dc",
    "name": "Query",
    "topic": "",
    "payload": "{     \"properties\": [       \"name\",       \"short_description\",       \"long_description\",       \"assigned_assets\"     ],     \"types\": [       \"term\"     ],        }",
    "payloadType": "json",
    "repeat": "",
    "crontab": "",
    "once": false,
    "x": 91,
    "y": 65,
    "wires": [
      [
        "cf38780b.47dd28"
      ]
    ]
  },
  {
    "id": "1adade39.6d3afa",
    "type": "function",
    "z": "8dd27fec.9c3dc",
    "name": "Split Results",
    "func": "return [ msg.items, msg.paging ];",
    "outputs": "2",
    "noerr": 0,
    "x": 284,
    "y": 203,
    "wires": [
      [
        "ec20d121.4fd68"
      ],
      [
        "809e88cc.d933f8"
      ]
    ]
  },
  {
    "id": "809e88cc.d933f8",
    "type": "function",
    "z": "8dd27fec.9c3dc",
    "name": "Next page?",
    "func": "if (msg.hasOwnProperty('next')) {\n    const payload = {};\n    payload.url = msg.next;\n    node.send(payload);\n}\n",
    "outputs": 1,
    "noerr": 0,
    "x": 459,
    "y": 223,
    "wires": [
      [
        "235b3e32.ac6d22"
      ]
    ]
  },
  {
    "id": "ec20d121.4fd68",
    "type": "function",
    "z": "8dd27fec.9c3dc",
    "name": "Parse details",
    "func": "const payload = {};\n\npayload.id = msg._id;\npayload.name = msg.name;\npayload.short_desc = msg.hasOwnProperty('short_description') ? msg.short_description : \"\";\npayload.long_desc  = msg.hasOwnProperty('long_description') ? msg.long_description : \"\";\npayload.assigned_assets = [];\n\nif (msg.hasOwnProperty('assigned_assets')) {\n    for (let i = 0; i < msg.assigned_assets.items.length; i++) {\n        const itm = msg.assigned_assets.items[i];\n        payload.assigned_assets.push({ \"type\": itm._type, \"name\": itm._name, \"id\": itm._id });\n    }\n}\n\nreturn { payload: payload };",
    "outputs": 1,
    "noerr": 0,
    "x": 460,
    "y": 179,
    "wires": [
      [
        "df84cb0.eb09038"
      ]
    ]
  },
  {
    "id": "df84cb0.eb09038",
    "type": "file",
    "z": "8dd27fec.9c3dc",
    "name": "",
    "filename": "TermsAndRelationships.json",
    "appendNewline": true,
    "createDir": false,
    "overwriteFile": "false",
    "x": 682,
    "y": 179,
    "wires": []
  },
  {
    "id": "235b3e32.ac6d22",
    "type": "IGC in",
    "z": "8dd27fec.9c3dc",
    "name": "Get next page",
    "server": "8ed2d18a.14748",
    "search": "_url_",
    "query": "",
    "url": "",
    "rid": "",
    "ridtype": "",
    "ridproperties": "",
    "x": 352,
    "y": 298,
    "wires": [
      [
        "1adade39.6d3afa"
      ]
    ]
  },
  {
    "id": "cf38780b.47dd28",
    "type": "change",
    "z": "8dd27fec.9c3dc",
    "name": "",
    "rules": [
      {
        "t": "set",
        "p": "query",
        "pt": "msg",
        "to": "payload",
        "tot": "msg"
      }
    ],
    "action": "",
    "property": "",
    "from": "",
    "to": "",
    "reg": false,
    "x": 157,
    "y": 109,
    "wires": [
      [
        "e5403847.44885"
      ]
    ]
  }
]
```

Note that you'll need to open the "Configuration nodes" from Node-RED's UI menu and double-click the "IGC_HOST" configuration under "On all flows" to change the details to your own -- hostname, port, username and password.  There will need to be some form of network connectivity from where Node-RED is running to the host and port you define there in order for the nodes to work.

## Other potentially useful resources

For exploring the REST APIs offered by IBM Information Governance Catalog, you might also want to explore the [ibm-igc-postman](https://github.com/cmgrote/ibm-igc-postman) project containing collections for [Postman](https://www.getpostman.com), to experiment further with the various REST API end-points.  And as indicated earlier (linking again for convenience):
* [Tips, Tricks & Time-Savers Guide](http://www.ibm.com/support/docview.wss?uid=swg27047054)
* [Sample REST API Calls and Use Case Descriptions Guide](http://www.ibm.com/support/docview.wss?uid=swg27047059)
