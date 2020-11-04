if(typeof require !== 'undefined') XLSX = require('xlsx');
const {flags} = require('@oclif/command');
const BaseCommand = require('../../base-command');
const Utils = require('../../utils');
const CantoParser = require('../../canto-xml-parser');

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

        const cantoJson = CantoParser.readXml(inputxml);
        console.log(cantoJson);

        // Convert to XSLX friendly format so it can be saved as CSV
        let csvArray = [];

        for (let key in cantoJson) {
            let rowJson = {}
            for (let field in cantoJson[key]) {
                if (cantoJson[key][field].value !== undefined) {
                    rowJson[cantoJson[key][field].name] = cantoJson[key][field].value;
                } else {
                    rowJson[cantoJson[key][field].name] = "";
                }
            }
            csvArray.push(rowJson);
        }
        console.log(csvArray);

        let csvHeaderArray = [];
        for (let field in cantoJson[0]) {
            // Set the heading array
            if (cantoJson[0][field].name == "OAR") {
                cantoJson[0][field].name = "filepath"
            }
            csvHeaderArray.push(cantoJson[0][field].name);
        }
        csvHeaderArray = Utils.arraymove(csvHeaderArray,csvHeaderArray.indexOf("filepath"),0);
        console.log(csvHeaderArray);

        //XLSX.writeFile(cantoCsv, 'out.csv');
        const testData = [
            { S:1, h:2, e:3, e_1:4, t:5, J:6, S_1:7 },
            { S:2, h:3, e:4, e_1:5, t:6, J:7, S_1:8 }
        ];
        const workbook = XLSX.utils.book_new();
        const cantoCsvWorksheet = XLSX.utils.json_to_sheet(csvArray);
        XLSX.utils.book_append_sheet(workbook, cantoCsvWorksheet, 'canto');
        XLSX.writeFile(workbook,'outtest.csv');


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
