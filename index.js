const { program } = require('commander');
if(typeof require !== 'undefined') XLSX = require('xlsx');
var jmespath = require('jmespath');

program
	.option('-d, --debug', 'output extra debugging')
	.option('-f, --file-xlsx <type>', 'input excel file path');

program.parse(process.argv);

if (program.fileXlsx) {
	console.log(`xlsx file path: ${program.fileXlsx}`);

	var workbook = XLSX.readFile(program.fileXlsx);

	let json = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1, {header:1, raw:true});

	console.log("JSON output:" + JSON.stringify(json));

} else {
	console.log("Error: Missing file path\n");
	console.log(program.helpInformation());
}
