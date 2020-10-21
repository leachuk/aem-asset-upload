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
            new winston.transports.Console(),
            new winston.transports.File({ filename: logFile }) // output to file
        ]
    });
    return log;
}

module.exports.groupByKey = function groupByKey(list, key) {
    const omitKey=true;
    return list.reduce((hash, {[key]:value, ...rest}) => ({...hash, [value]:( hash[value] || [] ).concat(omitKey ? {...rest} : {[key]:value, ...rest})} ), {})
}

module.exports.convertMs = function convertMs(milliseconds, format) {
    let days, hours, minutes, seconds, total_hours, total_minutes, total_seconds;

    total_seconds = parseInt(Math.floor(milliseconds / 1000));
    total_minutes = parseInt(Math.floor(total_seconds / 60));
    total_hours = parseInt(Math.floor(total_minutes / 60));
    days = parseInt(Math.floor(total_hours / 24));

    seconds = parseInt(total_seconds % 60);
    minutes = parseInt(total_minutes % 60);
    hours = parseInt(total_hours % 24);

    switch(format) {
        case 's':
            return total_seconds;
        case 'm':
            return total_minutes;
        case 'h':
            return total_hours;
        case 'd':
            return days;
        default:
            return `h: ${total_hours}, m: ${total_minutes}, s: ${total_seconds} `;
    }
};

module.exports.pathToJson = function pathToJson(data) {
    const output = {};
    let current;

    for (const path of data) {
        current = output;
        for (const segment of path.split('/')) {
            if (segment !== '') {
                if (!(segment in current)) {
                    current[segment] = {};
                }
                current = current[segment];
            }
        }
    }

    return output;
}