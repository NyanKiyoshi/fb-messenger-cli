const fs = require('fs');
const crypt = require('./crypt.js');
const readlineSync = require('readline-sync');
const phantomjs = require('phantomjs-prebuilt');
const path = require('path');

let phantom;
const DEBUG = true;

const CREDS_FILENAME = ".credentials.json";

Login = function() { };


function get_credentials(callback) {
    var master_password = readlineSync.question(
        'Current master password (empty to recreate data): ',
    
        {hideEchoBack: true}
    );

    // if no master password passed: just call the callback
    if (!master_password) {
        callback();
        return;
    }
    
    // otherwise: decipher
    crypt.static_load(
        // callback
        (err, data) => {
            var email, password;

            // only handle if there is no error
            // otherwise: ignore.
            if (!err) {
                data = JSON.parse(data);

                email = data.email;
                password = data.password;
            }
            else {
                console.log(err);
            }

            callback(email, password);
        },
        
        // filename to load
        CREDS_FILENAME,

        // master password to decipher the file
        master_password
    );
}


Login.prototype._login = function(callback, email=null, password=null) {
    const login = this;

    // if there is no email or password set
    if (!(email && password)) {
        email = readlineSync.question('Email: ');
        password = readlineSync.question('Password: ', {hideEchoBack: true});

        var master_password = readlineSync.question('Master password: ', {hideEchoBack: true});
        crypt.save(
            JSON.stringify({
                email: email,
                password: password
            }),

            CREDS_FILENAME, master_password
        );
    }

    console.log("Attempting login...");

    // This needs to stay "var" for phantomJS
    // TODO: change phantomJS to pupeteer
    var arguments = [path.resolve(__dirname, 'phantom.js'), email, password];

    phantom = new login.run_cmd( phantomjs.path, arguments, (err) => {
        if (err) return callback(err);

        if (phantom.data){
            let objData;
            try {
                objData = JSON.parse(phantom.data);
            } catch (parseErr) {
                console.log('Warning: Errors caught in return data'.yellow);
                if (phantom.data.indexOf('{') !== -1) {
                    const trimmed = phantom.data.substring(phantom.data.indexOf('{'));
                    try {
                        objData = JSON.parse(trimmed);
                    } catch (err2) {
                        return callback(err2);
                    }
                } else {
                    return callback(new Error('Invalid phantomJS data'));
                }
            }

            // Add save time to data
            objData.saveTime = new Date().getTime();

            // Save user data to file for next login
            crypt.save(JSON.stringify(objData));
            return callback();

        } else {
            return callback(new Error('Bad Facebook credentials'));
        }
    });
}


Login.prototype.execute = function(callback) {
    get_credentials((email, password) => { this._login(callback, email, password) });
};

Login.prototype.run_cmd = function(cmd, args, cb) {
    const spawn = require('child_process').spawn;
    const child = spawn(cmd, args);
    const me = this;

    if (DEBUG) child.stdout.pipe(process.stdout);

    child.stderr.pipe(process.stderr);
    child.stdout.on('data', (buffer) => {
        if (me.data === undefined) {
            me.data = buffer.toString();
        } else {
            me.data += buffer.toString();
        }
    });
    child.stdout.on('end', cb);
};

module.exports = Login;
