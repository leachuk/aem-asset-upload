# aem-asset-upload
For bulk uploading of asset files to AEM using a CSV file

## Sample Commands
Upload of asset via node
```
node bin/run aem:upload -h https://<aem-hostname> -c jh-upload-service-account:<password> -t /content/dam/sample-dev-data/auto-uploaded sample-photo.jpg
```