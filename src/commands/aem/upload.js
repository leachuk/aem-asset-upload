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

let test1 = [];

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
        } = newFlags;

        // setup logger
        const log = Utils.getLogger(logFile);


        // upload local folder
        const fileUpload = new FileSystemUpload({ log });
        //log.info("Parsing CSV:")
        const csvData = CsvParser.readCsv("sample.csv", "[?uploaded != 'true']"); //todo: replace `sample.csv` with argument variable
        const groupData = Utils.groupByKey(csvData, 'aem_target_folder');
        let index=0;

        // const promises = groupData.map(function(file){
        //     console.log(file);
        // });



        //serial
        // for (const x of bar) {
        //     await this.a(x);
        // }
        //output:
        // a:4000
        // a:1000
        // a:1000
        // END!!

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
                //log.info(uploadFiles);

                // await this.a().then(function (result) {
                //     console.log("A COMPLETED:" + result + index);
                //     test1.push({sdfsdf: result + index});
                //     index++;
                // });

                //parallel
                const promises = [...Array(1)].map(files =>
                    fileUpload.upload(uploadOptions, uploadFiles).then((uploadResult) => {
                        log.info('finished uploading files');
                        let jsonResult = uploadResult.toJSON();
                        jsonResult.index = index;
                        jsonResult.targetFolder = targetFolder;
                        jsonResult.finalSpentHumanTime = Utils.convertMs(jsonResult.finalSpent);
                        test1.push(jsonResult);

                        //update spreadsheet 'uploaded' cell so it isn't re-uploaded on the next run
                        // groupData[targetFolder].map(function(file){
                        //     CsvParser.setUploadedCell("sample.csv", file.csvRowNum);
                        // })

                    })
                    .catch(err => {
                        log.error('unhandled exception attempting to upload files', err);
                    })
                );
                const result = await Promise.all(promises);
                let testReturn = [];
                result.forEach(x => {
                    console.log("returning: "+ JSON.stringify(x));
                    testReturn.push(x);
                });

                // await fileUpload.upload(uploadOptions, uploadFiles).then((uploadResult) => {
                //     log.info('finished uploading files');
                //     let jsonResult = uploadResult.toJSON();
                //     jsonResult.index = index;
                //     jsonResult.targetFolder = targetFolder;
                //     jsonResult.finalSpentHumanTime = Utils.convertMs(jsonResult.finalSpent);
                //     test1.push(jsonResult);
                //
                //     //update spreadsheet 'uploaded' cell so it isn't re-uploaded on the next run
                //     groupData[targetFolder].map(function(file){
                //         CsvParser.setUploadedCell("sample.csv", file.csvRowNum);
                //     })
                //
                // })
                // .catch(err => {
                //     log.error('unhandled exception attempting to upload files', err);
                // });

                index++;

            }
        }

        //this.foo(testReturn);
        console.log("END!!")

        // console.log("get filepath test:");
        // let object = csvData;
        // let result = object.map(function(x){
        //     return x.filepath;
        // })
        // console.log(result);

        // const csvWriteSuccess = CsvParser.updateCell("sample.csv","B","2","New Value")
        // log.info(`CSV write success: ${csvWriteSuccess}`)
        //
        // log.info(`Outputting argv: ${argv}`);

        // todo: Extract all filenames, that aren't marked as currently uploaded, into an array for passing into the upload method.
        //       Then, see if we can parse the returned `allUploadResult` for a list of successfully uploaded filenames,
        //       then sort the results into buckets of common target paths where they should be uploaded to, this will need to be added to `uploadOptions`,
        //       and then update the csv file to mark these as successfully uploaded after the upload method.
        //       Then test with a high volume of files!


        log.info(`Log file is saved to log file '${logFile}'`);
    }

    foo(args) {
        //let test1 = [{host: "foo"},{host: "bar"}]
        console.log("FOOOOO!:");
        //console.log(JSON.stringify(test1));
        console.log(args);
        // generate html format result
        // let uploadTimestamp = new Date().getTime();
        // let htmlResultFilename = `result-${uploadTimestamp}.html`;
        // let mstTemplate = fs.readFileSync(Path.join(__dirname, '../../../view/result.mst')).toString();
        //
        // let htmlOutput = mustache.render(mstTemplate, test1);
        // fs.writeFileSync(htmlResultFilename, htmlOutput);
        // log.info(`Uploading result is saved to html file '${htmlResultFilename}'`);
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
    })
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