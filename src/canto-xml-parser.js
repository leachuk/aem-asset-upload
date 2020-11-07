const Utils = require('./utils');
const log = Utils.getLogger('canto-parser.log');

const Path = require('path');
const fs = require('fs');

const xpath = require('xpath');
const dom = require('xmldom').DOMParser;

module.exports.readXml = function readXml(inputXmlPath) {
    log.info("Starting XML parsing of Canto assets")

    //The uber json result object which will store the structured content for inserting to the CSV metadata
    let assetlist = [];
    let assetjson = {};

    let node = null;
    let xml = fs.readFileSync(inputXmlPath, 'utf8').toString();
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
        assetjson[uid] = field;
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
                let initialisedAssetJson = JSON.parse(JSON.stringify(assetjson)); // Create a deep copy to prevent reference updates
                let fieldValueNodes = Array.from(item.childNodes)
                fieldValueNodes.forEach(fieldvalue => {
                    if (fieldvalue.nodeType == 1) {
                        //console.log("uid:" + item.attributes.getNamedItem("uid").value);
                        //console.log("   value:" + item.firstChild.nodeValue);

                        let uid = fieldvalue.attributes.getNamedItem("uid").value;
                        let value = fieldvalue.firstChild.nodeValue;

                        if (value !== undefined && initialisedAssetJson[uid] !== undefined) {
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
                            /*
                             * Some exported Canto fields, e.g. Keywords, contain a HTML encoded line feed character `&#xa;`
                             * This is translated to a newline character `/n` by the XML parsing library.
                             * We convert it here to a comma ',' here as the newline characters break our CSV format.
                             */
                            if (value.indexOf('\n') > -1){
                                value = value.replaceAll('\n', ',');
                            }
                            initialisedAssetJson[uid].value = value;
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

    return assetlist;
}