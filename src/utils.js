/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const winston = require('winston');

function buildCharRegex(charArray) {
    let regex = '[';

    charArray.forEach(char => {
        if (char === '\\' || char === ']') {
            regex += '\\';
        }
        regex += char;
    });

    regex += ']';

    return regex;
}

/**
 * Removes a given set of characters from the end of a string.
 *
 * @param {string} toTrim The value to be trimmed.
 * @param {Array} charArray An array of single characters to trim.
 */
module.exports.trimRight = function trimRight(toTrim, charArray) {
    if (toTrim && toTrim.replace) {
        return toTrim.replace(new RegExp(`${buildCharRegex(charArray)}*$`, 'g'), '');
    }
    return toTrim;
}

module.exports.getLogger = function getLogger(logFile) {
    const { combine, timestamp, label, printf } = winston.format;
    const myFormat = printf(({ level, message, label, timestamp }) => {
        return `${timestamp} [${label}] ${level}: ${message}`;
    });
    const log = winston.createLogger({
        format: combine(
            label({ label: '' }),
            timestamp(),
            myFormat
        ),
        transports: [
            new winston.transports.Console()
            //new winston.transports.File({ filename: logFile }) // output to file
        ]
    });
    return log;
}

module.exports.groupByKey = function groupByKey(list, key) {
    const omitKey=true;
    return list.reduce((hash, {[key]:value, ...rest}) => ({...hash, [value]:( hash[value] || [] ).concat(omitKey ? {...rest} : {[key]:value, ...rest})} ), {})
}