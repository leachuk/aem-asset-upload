const { program } = require('commander');
if(typeof require !== 'undefined') XLSX = require('xlsx');
const AemApi = require('./src/aem-rest-api');
const Utils = require('./src/utils');

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
		// aemApi.get('/api/assets/sample-dev-data/auto-uploaded-1.json').then(response => {
		// 	console.log("GET RESULT:");
		// 	console.log(response);
		// });
		//
		let metadata = aemApi.getAemApiMetadata({xxx1: ['fly-through','animation'], xxx2: 'foo'});
		let url = aemApi.getAemApiResourcePath("/content/dam/sample-dev-data/auto-uploaded-1/DSC_0034.NEF");
		await aemApi.put(url, metadata).then(response => {
			console.log("PUT RESULT:");
			console.log(response);
		}).catch(err => {
			console.log(err);
		});

		//test path to node structure converter to enable nested metadata to be defined in the csv
		// const data = [
		// 	"/org/openbmc/examples/path0/PythonObj",
		// 	"/org/openbmc/UserManager/Group",
		// 	"/org/openbmc/HostIpmi/1",
		// 	"/org/openbmc/HostServices",
		// 	"/org/openbmc/UserManager/Users",
		// 	"/org/openbmc/records/events",
		// 	"/org/openbmc/examples/path1/SDBusObj",
		// 	"/org/openbmc/UserManager/User",
		// 	"/org/openbmc/examples/path0/SDBusObj",
		// 	"/org/openbmc/examples/path1/PythonObj",
		// 	"/org/openbmc/UserManager/Groups",
		// 	"/org/openbmc/NetworkManager/Interface"
		// ];
		//
		// console.log(JSON.stringify(Utils.pathToJson(data)));
		// console.log(Utils.pathToJson(data).org.openbmc.examples)
	})();

} else {
	console.log("Error: Missing file path\n");
	console.log(program.helpInformation());
}
