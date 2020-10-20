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

class UploadCommand extends BaseCommand {
    async doRun(args) {
        const { flags, argv } = args;

        const newFlags = Object.assign({}, flags);
        const timestamp = new Date().getTime();
        Object.keys(newFlags).forEach(key => {
            if (typeof(newFlags[key]) === 'string') {
                newFlags[key] = newFlags[key].replace('${timestamp}', timestamp)
            }
        });

        const {
            host,
            credential,
            target,
            log: logFile,
            output: htmlResult,
            threads,
            inputcsv,
        } = newFlags;

        // setup logger
        const log = Utils.getLogger(logFile);

        // init AEM API
        const username = credential.split(":")[0];
        const password = credential.split(":")[1];
        const aemApi = new AemApi(host, username, password);

        // upload local folder
        const fileUpload = new FileSystemUpload({ log });
        log.info(`Using input CSV file: ${inputcsv}`);
        const csvData = CsvParser.readCsv(inputcsv, "[?uploaded != 'true']");
        if (csvData <= 0) {
            log.info("No results returned from the CSV file. All items may have been flagged as uploaded");
        }
        const groupData = Utils.groupByKey(csvData, 'aem_target_folder');
        let index=0;

        for (let key in groupData) {
            let targetFolder = key;
            if (groupData.hasOwnProperty(targetFolder)) {
                let uploadOptions = new DirectBinaryUploadOptions()
                    .withUrl(`${Utils.trimRight(host, ['/'])}${targetFolder}`)
                    .withBasicAuth(credential)
                    .withMaxConcurrent(parseInt(threads, 10));

                log.info(targetFolder + " -> " + groupData[targetFolder]);
                let uploadFiles = groupData[targetFolder].map(function(x){
                    return x.filepath;
                })

                //parallel
                const promises = [...Array(1)].map(files => //force 1 call by defining an array of size 1
                    fileUpload.upload(uploadOptions, uploadFiles).then((uploadResult) => {
                        log.info('finished uploading files');
                        let jsonResult = uploadResult.toJSON();
                        jsonResult.index = index;
                        jsonResult.targetFolder = targetFolder;
                        jsonResult.finalSpentHumanTime = Utils.convertMs(jsonResult.finalSpent);
                        uploadReportData.push(jsonResult);

                        //update spreadsheet 'uploaded' cell so it isn't re-uploaded on the next run
                        groupData[targetFolder].map(function(file) {
                            CsvParser.setUploadedCell("sample.csv", file.csvRowNum);

                            //update metadata in AEM on successful upload
                            let filename = Path.basename(file.filepath);
                            let { filepath, uploaded, aem_target_folder, csvRowNum, ...metadata } = file; //remove the non-metadata fields
                            let aemMetadata = {class: 'asset', properties: { metadata: metadata}}; //add required AEM Asset API data
                            let aemApiFileNamePath = targetFolder.replace('/content/dam', '/api/assets') + '/' + filename;
                            log.info("AEM Metadata with CSV extracted data");
                            log.info(aemMetadata)
                            aemApi.put(aemApiFileNamePath, aemMetadata).then(response => {
                            	console.log(response.data);
                            });
                        })

                    })
                    .catch(err => {
                        log.error('unhandled exception attempting to upload files', err);
                    })
                );
                const result = await Promise.all(promises);
                result.forEach(x => {
                    log.info("Completed Upload");
                });

                index++;
            }
        }

        if (uploadReportData.length > 0) {
            this.generateReport(uploadReportData);
        }
        log.info("END!")
        //log.info(`Log file is saved to log file '${logFile}'`);
    }

    generateReport(data) {
        // generate html format result
        let uploadTimestamp = new Date().getTime();
        let htmlResultFilename = `result-${uploadTimestamp}.html`;
        let mstTemplate = fs.readFileSync(Path.join(__dirname, '../../../view/result.mst')).toString();

        let htmlOutput = mustache.render(mstTemplate, data);
        fs.writeFileSync(htmlResultFilename, htmlOutput);
    }
    b(delay) {
        return (new Promise(resolve => {setTimeout(() => resolve(delay), delay)}))
            .then(d => `Waited ${d} seconds`);
    }
    a(args,options) {
        return new Promise(function(resolve) {
            setTimeout(function(args) {
                resolve(args);
            }, 2000)
        }).then(function(){
            return {a: args, b: options};
        });
    }
}

UploadCommand.flags = Object.assign({}, BaseCommand.flags, {
    host: flags.string({
        char: 'h',
        description: `AEM host
The host value of the AEM instance where files will be
uploaded. This should include everything in the host's
URL up until /content/dam.`,
        default: 'http://localhost:4502'
    }),
    credential: flags.string({
        char: 'c',
        description: `AEM credential
The username and password for authenticating with the
target AEM instance. Should be in the format
<username>:<password>.`,
        default: 'admin:admin'
    }),
    target: flags.string({
        char: 't',
        description: `Target AEM folder
The folder in the target AEM instance where asset
binaries should be uploaded. Should always begin with
/content/dam.`,
        default: '/content/dam/aem-upload-${timestamp}'
    }),
    log: flags.string({
        char: 'l',
        description: `Log file path
The local path to where the process's log messages
should be saved.`,
        default: 'upload-${timestamp}.log'
    }),
    output: flags.string({
        char: 'o',
        description: `Result html file path
The local path to where the process's metrics will be
saved in html format.`,
        default: 'result-${timestamp}.html'
    }),
    threads: flags.string({
        char: 'r',
        description: `Maximum threads
Maximum number of files to upload concurrently.`,
        default: 5,
    }),
    inputcsv: flags.string({
        char: 'i',
        description: `Path to the CSV file used for input of files and metadata to upload. 
For example, an absolute path /foo/bar/sample.csv or a relative path sample.csv`,
        default: 'sample.csv'
    }),
})

UploadCommand.strict = false

UploadCommand.args = [{
    name: 'files_folders',
    required: false,
    description: `Space-delimited list of files and folders to upload.`
}];

UploadCommand.description = `Upload asset binaries to AEM
Uploads one or more files to a target AEM instance. The upload process uses the
direct binary access algorithm, so the target instance must have direct binary
access enabled; otherwise the upload will fail.

The process will upload the files or directories (non-recursive) provided in
the command.

Note that the process will only work with AEM instances that use basic
(i.e. non-SSO) authentication.`

UploadCommand.examples = [
    '$ aio aem:upload myimage.jpg',
    '$ aio aem:upload -h http://myaeminstance -c admin:12345 myimage.jpg ',
]

module.exports = {
    upload: UploadCommand
}
