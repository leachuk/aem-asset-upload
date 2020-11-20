if(typeof require !== 'undefined') XLSX = require('xlsx');
const jmespath = require('jmespath');

const Utils = require('./utils');
const log = Utils.getLogger('csv-parser.log');

module.exports.readCsv = function readCsv(csvPath, jmessearch) {
	if (csvPath) {
		const workbook = XLSX.readFile(csvPath);

		let json = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1, { defval: 'empty' });

		Object.entries(json).forEach(function([key,value],index) {
			//console.log(value)
			value.csvRowNum = value.__rowNum__;
		})

		return jmespath.search(json, jmessearch);
	} else {
		log.info("Error: Missing file path\n");
	}
}

//hardcoded utility function for dealing with the specific format of our csv
module.exports.setUploadedCell = function setUploadedCell(csvPath, row) {
	if (csvPath) {
		this.updateCell(csvPath, "B", row + 1, "true"); //row + 1 so offset from the heading row
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

		// read value
		let cellId = col + row;
		log.info(`Updating cell id: ${cellId}, with value: ${value}`);

		if (worksheet[cellId]) {
			let cell = worksheet[cellId].v;
			//log.info(cell);
		}

		XLSX.utils.sheet_add_aoa(worksheet, [[value]], {origin: cellId});

		// write to file
		XLSX.writeFile(workbook, csvPath);

		return true;
	}
}

module.exports.filterEmpty = function filterEmpty(object) {
	const obj = {};
	for (const key in object) {
		if (object[key] && object[key] !== "empty") {
			obj[key] = object[key];
		}
	}
	return obj;
}

module.exports.filterNonMetadata = function filterNonMetadata(jsonObject) {
	let {filepath, uploaded, aem_target_folder, csvRowNum, ...aemMetadata} = jsonObject;
	return aemMetadata;
}

module.exports.getTargetFolder = function getTargetFolder(jsonObject) {
	return jsonObject.aem_target_folder;
}

module.exports.getFilePath = function getFilePath(jsonObject) {
	return jsonObject.filepath;
}

/*
 * Map the metadata headings from their data source values to AEM friendly values
 * The input CSV file takes the format `from,to`. The value in the `from` column is replaced by the value in `to`
 */
module.exports.metadataJsonMapper = function metadataJsonMapper(csvPath, metadataObj, defaultLowerCaseMatch) {
	if (csvPath) {
		const workbook = XLSX.readFile(csvPath);
		let json = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1, { defval: 'empty' });

		Object.entries(json).forEach(function([key,value],index) {
			value.csvRowNum = value.__rowNum__;
		})

		json.forEach( row => {
			let from = row.from;
			let to = row.to;

			console.log(metadataObj);
			if (defaultLowerCaseMatch) {
				if (metadataObj.hasOwnProperty(from.toLowerCase())) {
					metadataObj[to] = metadataObj[from.toLowerCase()];
					delete metadataObj[from.toLowerCase()];
				}
			} else {
				if (metadataObj.hasOwnProperty(from)) {
					metadataObj[to] = metadataObj[from];
					delete metadataObj[from];
				}
			}
		})
	} else {
		log.info("Error: Missing file path or invalid input Array\n");
	}
}