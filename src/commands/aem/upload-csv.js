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
        let dataArray = [];
        for (let key in groupData) {
            dataArray.push(groupData[key]);
        }

        let promises = [];
        let index=0;
        dataArray.map(async targetBlock => {
            let targetFolder = CsvParser.getTargetFolder(targetBlock[0]);  //all target folders are the same due to previous groupBy, so grab the first one
            let uploadOptions = new DirectBinaryUploadOptions()
                .withUrl(`${Utils.trimRight(host, ['/'])}${targetFolder}`)
                .withBasicAuth(credential)
                .withMaxConcurrent(parseInt(threads, 10))
                .withHttpRetryCount(3);

            log.info(targetFolder + " -> " + targetBlock);
            let uploadFiles = targetBlock.map(function(x){
                return x.filepath;
            })

            let jsonResult = {};
            let filequeue = [];
            //let fileseries = Utils.chunk(uploadFiles,3); //define how many files to upload in parallel
            let fileseries = [uploadFiles]; //testing with one big block to see if its more reliable. I think the config should be handling the concurrent uploads.
            filequeue.push(fileseries);
            filequeue.map(async fileblock => {
                fileblock.map(files => {
                    let promise = fileUpload.upload(uploadOptions, files).then((uploadResult) => {
                        log.info('finished uploading files');

                        jsonResult = uploadResult.toJSON();
                        jsonResult.index = index;
                        jsonResult.targetFolder = targetFolder;
                        jsonResult.finalSpentHumanTime = Utils.convertMs(jsonResult.finalSpent);
                        uploadReportData.push(jsonResult);

                        return jsonResult;
                        // update spreadsheet 'uploaded' cell so it isn't re-uploaded on the next run
                    }).catch(err => {
                        log.error('unhandled exception attempting to upload files', err);
                    })
                    promises.push(promise);
                });
                index++;
            });


        });

        await Promise.all(promises).then(files => {
            //console.log("xxx",files);
            files.forEach(uploadResult => {
                log.info(`Completed Upload of files to ${JSON.stringify(uploadResult)}`);
                let targetFolder = uploadResult.targetFolder;
                uploadResult.detailedResult.forEach(file => {
                    let dataindex = csvData.findIndex(function (o) {
                        let filename = Path.basename(o.filepath);
                        return file.fileName == filename && o.aem_target_folder == targetFolder;
                    })

                    //If an upload failed, retry
                    let filename = file.fileName;
                    let metadata = CsvParser.filterNonMetadata(csvData[dataindex]); //remove the non-metadata fields
                    let aemMetadata = aemApi.getAemApiMetadata(metadata);
                    let aemfileNamePath = targetFolder + '/' + filename;
                    log.info("AEM Metadata with CSV extracted data");
                    log.info(JSON.stringify(aemMetadata));
                    let url = aemApi.getAemApiResourcePath(aemfileNamePath);

                    if (!file.success) {
                        log.info("FAILED! Running a re-upload");
                        let retryTargetFolder = Path.dirname(file.targetPath)
                        let dataindex = csvData.findIndex(function (o) {
                            let filename = Path.basename(o.filepath);
                            return file.fileName == filename && o.aem_target_folder == retryTargetFolder;
                        })
                        let retryUploadOptions = new DirectBinaryUploadOptions()
                            .withUrl(`${Utils.trimRight(host, ['/'])}${retryTargetFolder}`)
                            .withBasicAuth(credential)
                            .withMaxConcurrent(parseInt(threads, 10))
                            .withHttpRetryCount(3);
                        fileUpload.upload(retryUploadOptions, [csvData[dataindex].filepath]).then(retryResult => {
                            log.info("RETRY SUCCESS");
                            log.info(retryResult);
                            CsvParser.setUploadedCell(inputcsv, csvData[dataindex].csvRowNum);
                            log.info(`RETRY Updating metadata on url ${url}`);
                            aemApi.put(url, aemMetadata).then(response => {
                                log.info("Completed AEM Metadata update. Response data:");
                                log.info(JSON.stringify(response, Utils.censor(response)));
                                return "SUCCESS metadata updated";
                            }).catch(err => {
                                log.error('Error on AEM Metadata update:', err);
                            });
                        }).catch(err => {
                            log.error("RE-UPLOAD ERROR", err);
                        });
                    } else { // successfully uploaded
                        CsvParser.setUploadedCell(inputcsv, csvData[dataindex].csvRowNum);

                        // Update metadata in AEM on successful upload
                        log.info(`Updating metadata on url ${url}`);
                        aemApi.put(url, aemMetadata).then(response => {
                            log.info("Completed AEM Metadata update. Response data:");
                            log.info(JSON.stringify(response, Utils.censor(response)));
                            return "SUCCESS metadata updated";
                        }).catch(err => {
                            log.error('Error on AEM Metadata update:', err);
                        });
                    }
                })

                return uploadResult;
            });
        });

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
    testProm(args,options) {
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
