const axios = require('axios').default;

class AemRestApi {
    constructor(hostname, username, password) {
        this.hostname = hostname;
        this.username = username;
        this.password = password;
    }

    get(url) {
        axios.get(`${this.hostname}${url}`, {
            auth: {
                username: this.username,
                password: this.password
            }
        }).then(function (response) {
            console.log(response.data);
        }).catch(function (error) {
            console.log(error);
        })
    }
}



module.exports = AemRestApi;