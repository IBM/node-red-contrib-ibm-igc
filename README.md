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
    "id": "13a03a0d.38d08e",
    "type": "tab",
    "label": "Get All Terms and Related Assets"
  },
  {
    "id": "8747d52d.80cfe",
    "type": "ibm-igc",
    "z": "",
    "host": "cgroteDL",
    "port": "9445",
    "name": "cgroteDL"
  },
  {
    "id": "988f0c55.a11a88",
    "type": "inject",
    "z": "13a03a0d.38d08e",
    "name": "Query",
    "topic": "",
    "payload": "{       \"properties\": [\"name\", \"short_description\", \"long_description\", \"assigned_assets\"],       \"types\": [\"term\"],       \"where\":       {         \"operator\": \"and\",         \"conditions\": [           {             \"property\": \"modified_on\",             \"operator\": \">=\",             \"value\": \"1483232400\"           }         ]       }     }",
    "payloadType": "json",
    "repeat": "",
    "crontab": "",
    "once": false,
    "x": 84,
    "y": 177,
    "wires": [
      [
        "f6a6970f.8a814"
      ]
    ]
  },
  {
    "id": "f216a1c1.072f9",
    "type": "function",
    "z": "13a03a0d.38d08e",
    "name": "Split Results",
    "func": "return [ msg.items, msg.paging ];",
    "outputs": "2",
    "noerr": 0,
    "x": 320,
    "y": 313,
    "wires": [
      [
        "8bfeda72.05efc"
      ],
      [
        "2873f469.e8f63c"
      ]
    ]
  },
  {
    "id": "2873f469.e8f63c",
    "type": "function",
    "z": "13a03a0d.38d08e",
    "name": "Next page?",
    "func": "if (msg.hasOwnProperty('next')) {\n    const payload = {};\n    payload.url = msg.next;\n    node.send(payload);\n}\n",
    "outputs": 1,
    "noerr": 0,
    "x": 496,
    "y": 349,
    "wires": [
      [
        "df5716f.c4d9368"
      ]
    ]
  },
  {
    "id": "8bfeda72.05efc",
    "type": "function",
    "z": "13a03a0d.38d08e",
    "name": "Parse details",
    "func": "const payload = {};\n\npayload.id = msg._id;\npayload.name = msg.name;\npayload.short_desc = msg.hasOwnProperty('short_description') ? msg.short_description : \"\";\npayload.long_desc  = msg.hasOwnProperty('long_description') ? msg.long_description : \"\";\npayload.assigned_assets = [];\n\nif (msg.hasOwnProperty('assigned_assets')) {\n    for (let i = 0; i < msg.assigned_assets.items.length; i++) {\n        const itm = msg.assigned_assets.items[i];\n        payload.assigned_assets.push({ \"type\": itm._type, \"name\": itm._name, \"id\": itm._id });\n    }\n}\n\nnode.log(payload.id + \",\" + payload.name + \",\" + payload.short_desc + \",\" + payload.long_desc + \",\" + JSON.stringify(payload.assigned_assets));\n\nreturn { payload: payload };",
    "outputs": 1,
    "noerr": 0,
    "x": 496,
    "y": 271,
    "wires": [
      [
        "9d746456.6eb31"
      ]
    ]
  },
  {
    "id": "9d746456.6eb31",
    "type": "file",
    "z": "13a03a0d.38d08e",
    "name": "",
    "filename": "TermsAndRelationships.json",
    "appendNewline": true,
    "createDir": false,
    "overwriteFile": "false",
    "x": 717,
    "y": 271,
    "wires": []
  },
  {
    "id": "f6a6970f.8a814",
    "type": "IGC search",
    "z": "13a03a0d.38d08e",
    "name": "Search IGC",
    "server": "8747d52d.80cfe",
    "query": "",
    "x": 153,
    "y": 261,
    "wires": [
      [
        "f216a1c1.072f9"
      ]
    ]
  },
  {
    "id": "df5716f.c4d9368",
    "type": "IGC get",
    "z": "13a03a0d.38d08e",
    "name": "Get next page",
    "server": "8747d52d.80cfe",
    "url": "",
    "x": 361,
    "y": 447,
    "wires": [
      [
        "f216a1c1.072f9"
      ]
    ]
  }
]
```

(Note that you'll need to open the "Configuration nodes" from NodeRED's UI menu and double-click the "cgroteDL" configuration under "On all flows" to change the details to your own host -- hostname, port, username and password.  As long as you can remotely access the server (VPN or otherwise) you should still be able to run the nodes and NodeRED from your local machine.)
