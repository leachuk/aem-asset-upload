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

module.exports.getLogger = function getLogger(logFile, disable) {
    const { combine, timestamp, label, printf } = winston.format;
    const myFormat = printf(({ level, message, label, timestamp }) => {
        return `${timestamp} [${label}] ${level}: ${message}`;
    });
    const isSilent = (typeof disable !== 'undefined' && disable != false) ? true : false; //default to false if not set

    let logOptions = {
        format: combine(
            label({ label: '' }),
            timestamp(),
            myFormat
        ),
        transports: [
            new winston.transports.Console(),
        ],
        silent: isSilent
    }

    if (!isSilent) {
        // output to file
        logOptions.transports.push(new winston.transports.File({ filename: logFile }));
    }

    const log = winston.createLogger(logOptions);
    return log;
}

module.exports.groupByKey = function groupByKey(list, key) {
    const omitKey=false;
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

module.exports.chunk = function chunk(inputArray, size) {
    return inputArray.reduce((arr, item, idx) => {
        return idx % size === 0
            ? [...arr, [item]]
            : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
    }, []);
};

module.exports.censor = function censor(censor) {
    let i = 0;
    return function(key, value) {
        if(i !== 0 && typeof(censor) === 'object' && typeof(value) == 'object' && censor == value)
            return '[Circular]';
        if(i >= 29) // seems to be a harded maximum of 30 serialized objects?
            return '[Unknown]';
        ++i; // so we know we aren't using the original object anymore
        return value;
    }
}

module.exports.arraymove = function arraymove(arr, fromIndex, toIndex) {
    let element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);

    return arr;
}

module.exports.convertJsonKeysToLowerCase = function convertJsonKeysToLowerCase(json) {
    let newJson = {};
    Object.entries(json).forEach(
        ([key, value]) => {
            let lowerCaseKey = key.toLowerCase();
            newJson[lowerCaseKey] = value;
        }
    );

    return newJson;
}