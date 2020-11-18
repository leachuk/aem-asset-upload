if(typeof require !== 'undefined') XLSX = require('xlsx');
const {flags} = require('@oclif/command');
const BaseCommand = require('../../base-command');
const Utils = require('../../utils');
const JHRules = require('../../john-holland-rules');
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
            targetfolder,
            outputcsv,
        } = newFlags;

        // setup logger
        const log = Utils.getLogger(logFile,false);

        const cantoJson = CantoParser.readXml(inputxml);
        log.info(`Parsing the Canto xml file "${inputxml}"`);

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
                // Set the heading array to replace Canto headings with our required schema headings
                if (cantoJson[key][field].name == "OAR") {
                    delete Object.assign(rowJson, {['filepath']: rowJson['OAR'] })['OAR'];
                }
                // Insert aem_target_folder from category JH business rules, or default from arg flag if not managed by the business rules
                if (cantoJson[key][field].name == "Categories") {
                    rowJson['aem_target_folder'] = JHRules.setTargetFolder(cantoJson[key][field].value);
                    if (rowJson['aem_target_folder'] == "") {
                        rowJson['aem_target_folder'] = targetfolder;
                    }
                }
            }
            csvArray.push(rowJson);
        }
        //console.log(csvArray);

        /*
         * John Holland temp rules until we have a better way of abstracting out.
         * Set aem_target_folder according to business rules for priorities of where the asset
         * should be saved in AEM, depending on the canto metadata values
         */
        //csvArray = JHRules.setTargetFolder(csvArray);

        let csvHeaderArray = [];
        for (let field in csvArray[0]) {
            csvHeaderArray.push(field);
        }
        csvHeaderArray = Utils.arraymove(csvHeaderArray,csvHeaderArray.indexOf("filepath"),0);
        csvHeaderArray.splice(1,0,"uploaded"); // Create uploaded flag CSV heading
        csvHeaderArray = Utils.arraymove(csvHeaderArray,csvHeaderArray.indexOf("aem_target_folder"),2);
        log.info(`Setting the following headings in the Canto CSV file`);
        log.info(`    ${csvHeaderArray}`);

        const workbook = XLSX.utils.book_new();
        const cantoCsvWorksheet = XLSX.utils.json_to_sheet(csvArray, { header: csvHeaderArray});
        XLSX.utils.book_append_sheet(workbook, cantoCsvWorksheet, 'canto');
        XLSX.writeFile(workbook,outputcsv);
        log.info(`Exporting converted Canto data to "${outputcsv}"`);
    }
}


ExportCantoCsvCommand.flags = Object.assign({}, BaseCommand.flags, {
    inputxml: flags.string({
        char: 'i',
        description: `Path to the XML file which was exported from Canto with the asset metadata`,
        default: 'sample.xml'
    }),
    outputcsv: flags.string({
        char: 'o',
        description: `Path to the CSV file used for input of files and metadata to upload. 
For example, an absolute path /foo/bar/sample.csv or a relative path sample.csv`,
        default: 'canto-converted.csv'
    }),
    targetfolder: flags.string({
        char: 't',
        description: `Default path for the AEM DAM folder to upload the assets into.`,
        default: '/content/dam/canto-auto-import-${timestamp}'
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
