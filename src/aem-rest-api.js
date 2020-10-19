const axios = require('axios').default;

class AemRestApi {
    constructor(hostname, username, password) {
        this.hostname = hostname;
        this.username = username;
        this.password = password;
    }

    get(url) {
        _request('get', this.hostname+url, this.username, this.password, '').then(function (response) {
            console.log(response.data);
        }).catch(function (error) {
            console.log(error);
        });
    }

    post(url, data) {
        _request('post', this.hostname+url, this.username, this.password, data).then(function (response) {
            //console.log(response.data);
        }).catch(function (error) {
            console.log(error);
        });
    }

    put(url, data) {
        return _request('put', this.hostname+url, this.username, this.password, data).catch(function (error) {
            console.log(error);
        });
    }

}

function _request(method, url, username, password, data) {
    return axios({
        auth: {
            username: username,
            password: password
        },
        method: method,
        url: url,
        data: data
    });
}

module.exports = AemRestApi;