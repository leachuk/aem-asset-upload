# aem-asset-upload
For bulk uploading of asset files to AEM using a CSV file

This is a fork of https://github.com/adobe/aio-cli-plugin-aem
Which is built with https://github.com/adobe/aem-upload

## Sample Commands
### upload-csv. 
AEM Asset Upload via a CSV file

Upload of asset via nodejs
```
node bin/run aem:upload-csv -h https://<aem-hostname> -c jh-upload-service-account:<password> -i /path/to/upload.csv
```
Via compiled binary
```
./aem-asset-upload aem:upload-csv -h https://<aem-hostname> -c jh-upload-service-account:<password> -i /path/to/upload.csv
```

### export-canto-csv. 
Transform the Canto exported XML file to a CSV format for use in the `-i` argument by the above `upload-csv` command

Command flags:
- `--inputxml` or `-i`. Set the path to the Canto exported xml file which contains the asset metadata.
- `--outputcsv` or `-o`. Set the path and filename for the migrated CSV file for use in the `upload-csv` command.
- `--targetfolder` or `-t`. Set the path to the AEM DAM folder which will be added to the `aem_target_folder` column of the CSV file.
- `--log` or `-l`. The path and filename for the debug log file.
```
node bin/run xml:export-canto-csv -i "/Users/stewart.leach/project/john-holland/support/Sample Data/Canto XML Export Amaroo Main Sewer Project 5 Items.xml"
```

## CSV Schema Requirements
The format requires comma separated columns.
For the import to work successfully, the csv file requires some specific column headings. The headings for defining metadata fields are optional.

### Required Headings
- **filepath**
    - The file to upload to AEM. This can be a relative or absolute path.
- **uploaded**
    - This is a required column heading who's values should be left empty. It is automatically set to `true` after successful file upload to AEM. Subsequent program runs will ignore any rows where this is set to `true`
- **aem_target_folder**
    - The AEM location of where the file will be uploaded to. This should be some path under `/content/dam`
    
### Optional Headings
After the required headings have been defined, we can optionally define additional column headings which will be used to create the metadata fields of the heading name, with the value specified in the row. 
If the value is left blank then the metadata field won't be created for that file

These are currently created on the AEM assets `metadata` node.
For example, in the below sample table `file1.jpg` would have its child `jcr:content/metadata` node defined with the property `metadata_field_1` set to the value `value1_a`

### Sample Table
If you were to view an example as a spreadsheet, it would look like:

| filepath                | uploaded | aem_target_folder                | metadata_field_1 | metadata_field_2 |
|-------------------------|----------|----------------------------------|------------------|------------------|
| /path/to/file/file1.jpg |          | /content/dam/jh/example-folder-1 | value1_a         | value2_a         |
| /path/to/file/file2.tif |          | /content/dam/jh/example-folder-2 | value1_b         | value2_b         |
|                         |          |                                  |                  |                  |

Which viewed as a text file would look like:
```
filepath,uploaded,aem_target_folder,metadata_field_1,metadata_field_2
/path/to/file/file1.jpg,,/content/dam/jh/example-folder-1,value1_a,value2_a
/path/to/file/file2.tif,,/content/dam/jh/example-folder-2,value1_b,value2_b
```

### Metadata Mapping
To enable changing the metadata field names from the source value to some other value (for example, if you want to populate a pre-existing AEM metadata field) you can create a `metadata-mapping.csv` file.
This should live at the root of the executable. 

If it exists, the metadata headings (as described above under `Optional Headings`) will be transformed to the value in the `to` column.

If the `metadata-mapping.csv` isn't available at the root, then no mapping will be attempted.

**Note.** Currently, it only maps to the default AEM metadata location of `jcr:content/metadata/<name>`.

The format should look like:
| from             | to               |
|------------------|------------------|
| Approval (Corp.) | approval-corp    |
| Asset Name       | asset-identifier |
|                  |                  |

Which viewed as a text file would look like:
```
from,to
Approval (Corp.),approval-corp
Asset Identifier,asset-identifier
```

## Binary packaging
Packaging the node app to a single binary executable using https://github.com/vercel/pkg

Requires the `pkg` module to be installed globally with `npm install -g pkg`
```
pkg . --targets node14-win-x64
```
Note: In the `--targets` command used to create the executable we can specify the target architecture according to:
- nodeRange `node${n}` or latest → In our case was `node14`
- platform `freebsd`, `linux`, `alpine`, `macos`, `win` → In our case `macos`
- arch `x64`, `x86`, `armv6`, `armv7` → In our case `x64`

Then run the binary version like:
```
./aem-asset-upload aem:upload-csv -h https://<aem-hostname> -c jh-upload-service-account:<password> -i /path/to/upload.csv
./aem-asset-upload xml:export-canto-csv -i "/path/to/canto xml export.xml"
```

## Manual Steps
When dealing with AEM Assets, there may be some additional configurations or manual steps that will help resolve bugs or prevent issues. 
These are captured here until a more programmatic fix can be provided.

### Asset metadata title syncing 
You will probably want to update the assets title as part of the metadata mapping. By default AEM will display the value of `dc:title` as the title.

Attempting to set this directly via the Assets Api (which this tool uses), for some reason I'm sure Adobe understand, causes the `jcr:title` to be updated instead.

This results in an unchanged title being displayed for the asset. 
This behaviour is documented at https://experienceleague.adobe.com/docs/experience-manager-64/assets/extending/mac-api-assets.html?lang=en#update-asset-metadata

Follow these steps to create a workflow which syncs the `jcr:title` to `dc:title` to resolve this issue.

1. Create a workflow script, can have the extension .js, or .ecma (which appears to be the AEM standard, but either work)
  1. Save it in crx/de as a file under `/etc/workflow/scripts`. It can also probably be saved under `/apps/<project>/workflow/scripts` when added to a code repo, but I haven't tried this yet. Details from https://helpx.adobe.com/au/experience-manager/6-2/sites/developing/using/wf-customizing-extending.html
```
# This is a fixed version of the script provided by the Adobe documentation
# https://experienceleague.adobe.com/docs/experience-manager-64/assets/extending/mac-api-assets.html?lang=en#update-asset-metadata
#
var workflowData = workItem.getWorkflowData();
log.info("JH Content Sync executing script now...");
if (workflowData.getPayloadType() == "JCR_PATH") {
  var path = workflowData.getPayload().toString();
  log.info("JH Path at:" + path);
  var node = workflowSession.getSession().getItem(path);
  var metadataNode = node.getNode("metadata");
      if (metadataNode.hasProperty("jcr:title")) {
          var jcrTitle = metadataNode.getProperty("jcr:title");
          log.info("JH jcrTitle 2:" + jcrTitle.getString());
          metadataNode.setProperty("dc:title", jcrTitle.getString());
          metadataNode.save();
      }
}
```
2. Create a new Workflow Model
  1. Add a new `Process Step` (filter with "process step" and it will show up) component.
  2. Edit the Process Step component. Set a title and description in the Common tab (leave everything else) and in the Process tab select our custom workflow from the dropdown (this was previously added). Select the `Handler Advance` checkbox. Select Done.
  3. Select the `Sync` button on the model.
3. Create a new Workflow Launcher so the model is automatically processed when an Asset is modified (in our case, it's metadata is updated).
  1. Select Create > Add Launcher. Populate the following, all other fields can be left blank/default
    1. Event Type = Modified
    2. Nodetype = dam:AssetContent
    3. Path = /content/dam(/.*)/jcr:content
    4. Workflow = <Our new Workflow Model from above>
    5. Description = <Some description>
    6. Active = selected/checked

Our custom script should then activate each time we update the asset metatdata
E.g.
```
curl -X PUT -u admin:admin -H "Content-Type: application/json;" -d '{"class":"asset", "properties": {"metadata":{"jcr:title":"Also Working Title"}}}' http://localhost:4502/api/assets/wknd/en/activities/hiking/hiker-anapurna.jpg
```

Tail the `error.log` and you'll see our `log.info(...)` output from the .ecma script.

### Clear ecma workflow scripts from cache
When working with custom ecma scripts which we've added to a workflow step, you'll need to clear it from this cache each time it's updated in crx/de

`http://localhost:4502/system/console/scriptcache`

Not doing this means any updates to the script aren't executed.