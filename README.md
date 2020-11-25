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