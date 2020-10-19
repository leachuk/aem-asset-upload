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
		aemApi.get('/api/assets/sample-dev-data/auto-uploaded-1.json').then(response => {
			console.log("GET RESULT:");
			console.log(response);
		});

		let metadata = {class: 'asset', properties: {'jcr:title': 'updated title by API 2', metadata: {purpose: ['fly-through','animation'], custom: 'foo'} }};
		aemApi.put('/api/assets/sample-dev-data/auto-uploaded-1/sample-photo.jpg', metadata).then(response => {
			console.log("PUT RESULT:");
			console.log(response.data);
		});
	})();

} else {
	console.log("Error: Missing file path\n");
	console.log(program.helpInformation());
}
