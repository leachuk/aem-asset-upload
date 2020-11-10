const axios = require('axios').default;

class AemRestApi {
    constructor(hostname, username, password) {
        this.hostname = hostname;
        this.username = username;
        this.password = password;
    }

    get(url) {
        return _request('get', this.hostname+url, this.username, this.password, '').catch(function (error) {
            console.log(error);
        });
    }

    head(url) {
        return _request('head', this.hostname+url, this.username, this.password, '').catch(function (error) {
            if (error.response) {
                throw error;
                //return error.response; //return response
            } else {
                console.log("Error in HEAD calling: " + url);
                console.log(error);
            }
        });
    }

    post(url, data) {
        return _request('post', this.hostname+url, this.username, this.password, data).catch(function (error) {
            console.log(error);
        });
    }

    put(url, data) {
        return _request('put', this.hostname + url, this.username, this.password, data).catch(function (error) {
            console.log(error => {
                if (error.response && error.response.status == 404) {
                    console.log(`PUT 404 NOT FOUND at ${url}`);
                    throw new Error(error);
                } else {
                    console.log(`PUT error when checking url ${url}`, error);
                    throw new Error(error);
                }
            });
        });
    }

    getAemApiResourcePath(contentPath) {
        return contentPath.replace('/content/dam', '/api/assets');
    }

    getAemApiMetadata(metadataObj) {
        let metadata = metadataObj;
        let aemMetadata = {};

        if (!_isEmptyObject(metadata)) {
            let filteredMetadata = _filterEmptyMetadata(metadata);
            if (!_isEmptyObject(filteredMetadata)) { // if metadata is not empty, massage it to fit the AEM Asset api and submit
                aemMetadata = {class: 'asset', properties: {metadata: filteredMetadata}}; //add required AEM Asset API data
            }
        }
        return aemMetadata;
    }

    /*
     * For managing AEM specific data transformations.
     * E.g. Convert comma separated values into a string array
     */
    formatAemData(dataObj) {
        let aemFormatedObj = {};
        Object.keys(dataObj).forEach(key => {
            console.log(key + ' - ' + dataObj[key]) // key - value
            let value = dataObj[key];
            if (typeof value !== undefined && value.toString().indexOf(',') > -1) {
                value = value.split(',');
            }
            aemFormatedObj[key] = value;
        })

        return aemFormatedObj
    }

}

function _request(method, url, username, password, data) {
    let filteredData = _filterEmptyMetadata(data);
    return axios({
        auth: {
            username: username,
            password: password
        },
        method: method,
        url: url,
        data: filteredData
    });
}

function _filterEmptyMetadata(object) {
    const obj = {};
    for (const key in object) {
        if (object[key] && object[key] !== "empty") {
            obj[key] = object[key];
        }
    }
    return obj;
}

function _isEmptyObject(jsonObject) {
    let isEmpty = true;
    if (Object.keys(jsonObject).length !== 0 && jsonObject.constructor === Object) {
        isEmpty = false;
    }

    return isEmpty;
}

module.exports = AemRestApi;