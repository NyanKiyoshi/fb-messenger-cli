const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class Crypt {
    constructor() {
        this.algorithm = 'aes-256-ctr';
        this.filename = '.kryptonite';
        this.data = undefined;
        this.password = 'password';
    }

    setPassword(pw) {
        this.password = pw;
    }

    encrypt(text, password=null) {
        password = password || this.password;
        
        const cipher = crypto.createCipher(this.algorithm, password);

        let crypted = cipher.update(text, 'utf8','hex');
        crypted += cipher.final('hex');

        return crypted;
    }

    decrypt(text, callback, password=null) {
        password = password || this.password;

        try {
            const decipher = crypto.createDecipher(this.algorithm, password);
            let dec = decipher.update(text, 'hex', 'utf8');
            dec += decipher.final('utf8');
            callback(null, dec);
        } catch (err) {
            callback(err);
        }
    }

    save(data, filename=null, password=null) {
        filename = filename || this.filename;

        const encrypted = this.encrypt(data, password);
        const savePath = path.resolve(__dirname, '../', filename);
        fs.writeFileSync(savePath, encrypted);
    }

    static_load(callback, filename=null, password=null) {
        filename = filename || this.filename;

        console.log("Now loading");

        fs.readFile(path.resolve(__dirname, '../', filename), (err, data) => {
            if(err) {
                callback('No saved profile, please login');
            } else {
                this.decrypt(data.toString(), (err, dec) => {
                    if (err)
                        callback(err);
                    else {
                        callback(null, dec);
                    }
                }, password);
            }
        });
    }

    load(callback, filename=null, password=null) {
        filename = filename || this.filename;

        if (!this.data) {
            this.static_load(
                (err, data) => {
                    if (!err) {
                        // if successfully loaded: save the data
                        this.data = data;
                    }

                    // call the passed callback
                    callback(err, data);
                },

                filename, password
            );
        } else {
            callback(null, this.data);
        }
    }

    flush(filename=null) {
        filename = filename || this.filename;

        this.data = undefined;
        fs.unlink(path.resolve(__dirname, '../', filename));
    }
}

module.exports = new Crypt();
