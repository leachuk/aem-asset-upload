const { program } = require('commander');
if(typeof require !== 'undefined') XLSX = require('xlsx');
const AemApi = require('./src/aem-rest-api');

program
	.option('-d, --debug', 'output extra debugging')
	.option('-h, --aem-host <type>', 'aem hostname')
	.option('-c, --credentials <type>', 'aem credentials');

program.parse(process.argv);

if (program.aemHost) {
	console.log(`Axios REST test with AEM Asset integration`);
	(async () => {
		//get folder list
		const username = program.credentials.split(":")[0];
		const password = program.credentials.split(":")[1];
		const aemApi = new AemApi(program.aemHost, username, password);
		aemApi.get('/api/assets/sample-dev-data/auto-uploaded-1.json');

	})();

} else {
	console.log("Error: Missing file path\n");
	console.log(program.helpInformation());
}
