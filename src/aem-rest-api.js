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
            console.log(error);
        });
    }

    post(url, data) {
        return _request('post', this.hostname+url, this.username, this.password, data).catch(function (error) {
            console.log(error);
        });
    }

    put(url, data) {
        return _request('put', this.hostname+url, this.username, this.password, data).catch(function (error) {
            console.log(error);
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