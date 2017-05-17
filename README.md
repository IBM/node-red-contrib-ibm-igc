# README
NodeRED nodes for integrating with IBM Information Governance Catalog

## Testing locally

To test locally (before we commit into the open), do the following:

### Prerequisites

You'll need NodeJS (and NPM) installed already.  Download from https://nodejs.org, or use your favourite package manager (i.e. [Homebrew](https://brew.sh)).

NodeRED must also be installed locally -- simplest way to do this is to install it globally by running:

```sudo npm install -g node-red```

### Adding the IGC integration

1. Clone this repository to your local machine
2. Run the command `sudo npm link` from within the cloned directory
3. Navigate into your local NodeRED directory (by default, it's `~/.node-red`)
4. Run `npm link node-red-contrib-ibm-igc` from within the directory of (3)
5. Startup NodeRED (i.e. `node-red`)
6. Navigate to the UI (by default, http://localhost:1880/)

You should find a number of nodes under the "storage" category related to IGC.

## Example flow

The example flow pasted below retrieves key term details (ID, name, short description, long description, and related assets) for all terms that have been modified since January 1, 2017:

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
    "host": "cgroteDL",
    "port": "9445",
    "name": ""
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
    "payload": "{     \"properties\": [       \"name\",       \"short_description\",       \"long_description\",       \"assigned_assets\"     ],     \"types\": [       \"term\"     ],     \"where\": {       \"operator\": \"and\",       \"conditions\": [         {           \"property\": \"modified_on\",           \"operator\": \">=\",           \"value\": \"1483232400\"         }       ]     }   }",
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

(Note that you'll need to open the "Configuration nodes" from NodeRED's UI menu and double-click the "cgroteDL" configuration under "On all flows" to change the details to your own host -- hostname, port, username and password.  As long as you can remotely access the server (VPN or otherwise) you should still be able to run the nodes and NodeRED from your local machine.)
