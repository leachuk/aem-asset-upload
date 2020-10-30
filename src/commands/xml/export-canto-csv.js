/*
Copyright 2018 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const Path = require('path');
const fs = require('fs');

const mustache = require('mustache');

const {flags} = require('@oclif/command');
const {
    DirectBinaryUploadOptions,
    FileSystemUpload,
} = require('@adobe/aem-upload');

const BaseCommand = require('../../base-command');
const Utils = require('../../utils');
const CsvParser = require('../../csv-parser');
const AemApi = require('../../aem-rest-api');

let uploadReportData = [];

class ExportCantoCsvCommand extends BaseCommand {
    async doRun(args) {
        const {flags, argv} = args;

        const newFlags = Object.assign({}, flags);
        const timestamp = new Date().getTime();
        Object.keys(newFlags).forEach(key => {
            if (typeof (newFlags[key]) === 'string') {
                newFlags[key] = newFlags[key].replace('${timestamp}', timestamp)
            }
        });

        const {
            log: logFile,
            output: htmlResult,
            inputxml,
        } = newFlags;

        // setup logger
        const log = Utils.getLogger(logFile);

        log.info("Starting XML parsing of Canto assets")

        const xpath = require('xpath');
        const dom = require('xmldom').DOMParser;

        //The uber json result object which will store the structured content for inserting to the CSV metadata
        let assetlist = [];
        let assetjson = { metadata: {} };

        let node = null;
        let xml = fs.readFileSync(inputxml, 'utf8').toString();
        let doc = new dom().parseFromString(xml)

        // Parse the xml field name list using xmldom
        let result = xpath.evaluate(
            "//*[local-name(.)='Field']", // xpathExpression
            doc,                                    // contextNode
            null,                           // namespaceResolver
            xpath.XPathResult.ANY_TYPE,             // resultType
            null                              // result
        )
        node = result.iterateNext();
        while (node) {
            let field = {};
            let uid = node.attributes.getNamedItem("uid").value;
            console.log("Node: " + node.toString());
            console.log("uid:" + node.attributes.getNamedItem("uid").value);
            let childnodes = Array.from(node.childNodes)
            childnodes.forEach(item => {
                if (item.nodeType == 1) {
                    field.name = item.firstChild.nodeValue;
                    console.log("name:" + item.firstChild.nodeValue);
                }
            })
            assetjson.metadata[uid] = field;
            node = result.iterateNext();
        }


        // Populate with metadata from the Canto Asset XML
        let metadataresult = xpath.evaluate(
            "//*[local-name(.)='Items']", // xpathExpression
            doc,                                   // contextNode
            null,                          // namespaceResolver
            xpath.XPathResult.ANY_TYPE,            // resultType
            null                             // result
        )
        node = metadataresult.iterateNext();
        while (node) {
            let field = {};
            //console.log("Node: " + node.toString());
            //console.log("uid:" + node.attributes.getNamedItem("uid").value);
            let childnodes = Array.from(node.childNodes)
            childnodes.forEach(item => {
                if (item.nodeType == 1) {
                    let initialisedAssetJson = assetjson;
                    let fieldValueNodes = Array.from(item.childNodes)
                    fieldValueNodes.forEach(fieldvalue => {
                        if (fieldvalue.nodeType == 1) {
                            //console.log("uid:" + item.attributes.getNamedItem("uid").value);
                            //console.log("   value:" + item.firstChild.nodeValue);

                            let uid = fieldvalue.attributes.getNamedItem("uid").value;
                            let value = fieldvalue.firstChild.nodeValue;

                            if (value !== undefined && initialisedAssetJson.metadata[uid] !== undefined) {
                                let itemchildnodes = Array.from(fieldvalue.childNodes)

                                if (itemchildnodes.length > 3) { // manage fields with more than one value
                                    //console.log(itemchildnodes)
                                    let multiValues = [];
                                    itemchildnodes.forEach(item => {
                                        if (item.nodeType == 1) {
                                            multiValues.push(item.firstChild.nodeValue);
                                            //console.log("name:" + item.firstChild.nodeValue);
                                        }
                                    });
                                    value = multiValues;
                                } else {
                                    itemchildnodes.forEach(item => {
                                        if (item.nodeType == 1) {
                                            value = item.firstChild.nodeValue;
                                            //console.log("name:" + item.firstChild.nodeValue);
                                        }
                                    })
                                }
                                initialisedAssetJson.metadata[uid].value = value;
                            }
                        }
                    });
                    // The most succinct approach for creating a deep copy I could fine.
                    // This is required to prevent all objs in the arrays being updated to the same value due to references
                    const deepCopy = JSON.parse(JSON.stringify(initialisedAssetJson));
                    assetlist.push(deepCopy);
                }
            })
            node = metadataresult.iterateNext();
        }

        console.log(assetlist);
        // node.forEach(parent => {
        //     console.log(parent);
        // })
    }
}

ExportCantoCsvCommand.flags = Object.assign({}, BaseCommand.flags, {
    inputxml: flags.string({
        char: 'i',
        description: `Path to the CSV file used for input of files and metadata to upload. 
For example, an absolute path /foo/bar/sample.csv or a relative path sample.csv`,
        default: 'sample.xml'
    }),
    log: flags.string({
        char: 'l',
        description: `Log file path
The local path to where the process's log messages
should be saved.`,
        default: 'xml-transform-canto-${timestamp}.log'
    })
})

ExportCantoCsvCommand.strict = false

ExportCantoCsvCommand.args = [{
    name: 'files_folders',
    required: false,
    description: `Space-delimited list of files and folders to upload.`
}];

ExportCantoCsvCommand.description = `Upload asset binaries to AEM
Uploads one or more files to a target AEM instance. The upload process uses the
direct binary access algorithm, so the target instance must have direct binary
access enabled; otherwise the upload will fail.

The process will upload the files or directories (non-recursive) provided in
the command.

Note that the process will only work with AEM instances that use basic
(i.e. non-SSO) authentication.`

ExportCantoCsvCommand.examples = [
    '$ aio aem:upload myimage.jpg',
    '$ aio aem:upload -h http://myaeminstance -c admin:12345 myimage.jpg ',
]

module.exports = {
    upload: ExportCantoCsvCommand
}
