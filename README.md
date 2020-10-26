# aem-asset-upload
For bulk uploading of asset files to AEM using a CSV file

## Sample Commands
Upload of asset via node
```
node bin/run aem:upload-csv -h https://<aem-hostname> -c jh-upload-service-account:<password> -i /path/to/upload.csv
```

## Binary packaging
Packaging the node app to a single binary executable using https://github.com/vercel/pkg
```
pkg . --targets node14-macos-x64
```
Note: In the `--targets` command used to create the executable we can specify the target architecture according to:
- nodeRange `node${n}` or latest → In our case was `node14`
- platform `freebsd`, `linux`, `alpine`, `macos`, `win` → In our case `macos`
- arch `x64`, `x86`, `armv6`, `armv7` → In our case `x64`

Then run the binary version like:
```
./aem-asset-upload aem:upload-csv -h https://<aem-hostname> -c jh-upload-service-account:<password> -i /path/to/upload.csv
```