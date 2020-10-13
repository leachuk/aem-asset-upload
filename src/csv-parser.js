if(typeof require !== 'undefined') XLSX = require('xlsx');
const jmespath = require('jmespath');

const Utils = require('./utils');
const log = Utils.getLogger();

module.exports.readCsv = function readCsv(csvPath, jmessearch) {
	if (csvPath) {
		log.info(`csv file path: ${csvPath}`);

		const workbook = XLSX.readFile(csvPath);

		let json = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1, { defval: 'empty' });

		//console.log("JSON output:" + JSON.stringify(json));
		//return json;
		return jmespath.search(json, jmessearch);
	} else {
		log.info("Error: Missing file path\n");
	}
}

module.exports.updateCell = function updateCell(csvPath, col, row, value) {
	if (csvPath) {
		// read from a XLS file
		const workbook = XLSX.readFile(csvPath);

		// get first sheet
		let firstSheetName = workbook.SheetNames[0];
		log.info("sheet name:" + firstSheetName)
		let worksheet = workbook.Sheets[firstSheetName];

		// read value in D4
		let cellId = col + row;
		log.info(`Updating cell id: ${cellId}, with value: ${value}`);

		if (worksheet[cellId]) {
			let cell = worksheet[cellId].v;
			log.info(cell);
		}

		// modify value in D4
		//worksheet[cellId].v = value;
		XLSX.utils.sheet_add_aoa(worksheet, [[value]], {origin: cellId});

		// write to new file
		XLSX.writeFile(workbook, csvPath);

		return true;
	}
}