// Licensed under the MIT License
// https://github.com/craigahobbs/bare-script/blob/main/LICENSE

import {
    addCalculatedField, aggregateData, filterData, joinData, parseCSV, parseDatetime, sortData, topData, validateAggregation, validateData
} from './data.js';
import {validateType, validateTypeModel} from '../../schema-markdown/lib/schema.js';
import {jsonStringifySortKeys} from '../../schema-markdown/lib/encode.js';
import {parseSchemaMarkdown} from '../../schema-markdown/lib/parser.js';
import {typeModel} from '../../schema-markdown/lib/typeModel.js';


/* eslint-disable id-length */


// The default maximum statements for executeScript
export const defaultMaxStatements = 1e9;


// The built-in script functions
export const scriptFunctions = {
    //
    // Array functions
    //

    // $function: arrayCopy
    // $group: Array
    // $doc: Create a copy of an array
    // $arg array: The array to copy
    // $return: The array copy
    'arrayCopy': ([array]) => (Array.isArray(array) ? [...array] : []),

    // $function: arrayExtend
    // $group: Array
    // $doc: Extend one array with another
    // $arg array: The array to extend
    // $arg array2: The array to extend with
    // $return: The extended array
    'arrayExtend': ([array, array2]) => {
        if (Array.isArray(array) && Array.isArray(array2)) {
            array.push(...array2);
        }
        return array;
    },

    // $function: arrayGet
    // $group: Array
    // $doc: Get an array element
    // $arg array: The array
    // $arg index: The array element's index
    // $return: The array element
    'arrayGet': ([array, index]) => (Array.isArray(array) ? array[index] ?? null : null),

    // $function: arrayIndexOf
    // $group: Array
    // $doc: Find the index of a value in an array
    // $arg array: The array
    // $arg value: The value to find in the array
    // $arg index: Optional (default is 0). The index at which to start the search.
    // $return: The first index of the value in the array; -1 if not found.
    'arrayIndexOf': ([array, value, index = 0]) => (Array.isArray(array) ? array.indexOf(value, index) : -1),

    // $function: arrayJoin
    // $group: Array
    // $doc: Join an array with a separator string
    // $arg array: The array
    // $arg separator: The separator string
    // $return: The joined string
    'arrayJoin': ([array, separator]) => (Array.isArray(array) ? array.join(separator) : ''),

    // $function: arrayLastIndexOf
    // $group: Array
    // $doc: Find the last index of a value in an array
    // $arg array: The array
    // $arg value: The value to find in the array
    // $arg index: Optional (default is the end of the array). The index at which to start the search.
    // $return: The last index of the value in the array; -1 if not found.
    'arrayLastIndexOf': ([array, value, index = null]) => (
        Array.isArray(array) ? (index === null ? array.lastIndexOf(value) : array.lastIndexOf(value, index)) : -1
    ),

    // $function: arrayLength
    // $group: Array
    // $doc: Get the length of an array
    // $arg array: The array
    // $return: The array's length; null if not an array
    'arrayLength': ([array]) => (Array.isArray(array) ? array.length : null),

    // $function: arrayNew
    // $group: Array
    // $doc: Create a new array
    // $arg values...: The new array's values
    // $return: The new array
    'arrayNew': (values) => values,

    // $function: arrayNewSize
    // $group: Array
    // $doc: Create a new array of a specific size
    // $arg size: Optional (default is 0). The new array's size.
    // $arg value: Optional (default is 0). The value with which to fill the new array.
    // $return: The new array
    'arrayNewSize': ([size = 0, value = 0]) => new Array(size).fill(value),

    // $function: arrayPop
    // $group: Array
    // $doc: Remove the last element of the array and return it
    // $arg array: The array
    // $return: The last element of the array; null if the array is empty.
    'arrayPop': ([array]) => (Array.isArray(array) ? array.pop() ?? null : null),

    // $function: arrayPush
    // $group: Array
    // $doc: Add one or more values to the end of the array
    // $arg array: The array
    // $arg values...: The values to add to the end of the array
    // $return: The array
    'arrayPush': ([array, ...values]) => {
        if (Array.isArray(array)) {
            array.push(...values);
        }
        return array;
    },

    // $function: arraySet
    // $group: Array
    // $doc: Set an array element value
    // $arg array: The array
    // $arg index: The index of the element to set
    // $arg value: The value to set
    // $return: The value
    'arraySet': ([array, index, value]) => {
        if (Array.isArray(array)) {
            array[index] = value;
        }
        return value;
    },

    // $function: arrayShift
    // $group: Array
    // $doc: Remove the first element of the array and return it
    // $arg array: The array
    // $return: The first element of the array; null if the array is empty.
    'arrayShift': ([array]) => (Array.isArray(array) ? array.shift() ?? null : null),

    // $function: arraySlice
    // $group: Array
    // $doc: Copy a portion of an array
    // $arg array: The array
    // $arg start: Optional (default is 0). The start index of the slice.
    // $arg end: Optional (default is the end of the array). The end index of the slice.
    // $return: The new array slice
    'arraySlice': ([array, start, end]) => (Array.isArray(array) ? array.slice(start, end) : null),

    // $function: arraySort
    // $group: Array
    // $doc: Sort an array
    // $arg array: The array
    // $arg compareFn: Optional (default is null). The comparison function.
    // $return: The sorted array
    'arraySort': ([array, compareFn = null], options) => (
        Array.isArray(array) ? (compareFn === null ? array.sort() : array.sort((...args) => compareFn(args, options))) : null
    ),


    //
    // Data functions
    //

    // $function: dataAggregate
    // $group: Data
    // $doc: Aggregate a data array
    // $arg data: The data array
    // $arg aggregation: The [aggregation model](https://craigahobbs.github.io/bare-script/library/model.html#var.vName='Aggregation')
    // $return: The aggregated data array
    'dataAggregate': ([data, aggregation]) => aggregateData(data, validateAggregation(aggregation)),

    // $function: dataCalculatedField
    // $group: Data
    // $doc: Add a calculated field to a data array
    // $arg data: The data array
    // $arg fieldName: The calculated field name
    // $arg expr: The calculated field expression
    // $arg variables: Optional (default is null). A variables object the expression evaluation.
    // $return: The updated data array
    'dataCalculatedField': ([data, fieldName, expr, variables = null], options) => (
        addCalculatedField(data, fieldName, expr, variables, options)
    ),

    // $function: dataFilter
    // $group: Data
    // $doc: Filter a data array
    // $arg data: The data array
    // $arg expr: The filter expression
    // $arg variables: Optional (default is null). A variables object the expression evaluation.
    // $return: The filtered data array
    'dataFilter': ([data, expr, variables = null], options) => filterData(data, expr, variables, options),

    // $function: dataJoin
    // $group: Data
    // $doc: Join two data arrays
    // $arg leftData: The left data array
    // $arg rightData: The right data array
    // $arg joinExpr: The [join expression](https://craigahobbs.github.io/bare-script/language/#expressions)
    // $arg rightExpr: Optional (default is null).
    // $arg rightExpr:     The right [join expression](https://craigahobbs.github.io/bare-script/language/#expressions)
    // $arg isLeftJoin: Optional (default is false). If true, perform a left join (always include left row).
    // $arg variables: Optional (default is null). A variables object for join expression evaluation.
    // $return: The joined data array
    'dataJoin': ([leftData, rightData, joinExpr, rightExpr = null, isLeftJoin = false, variables = null], options) => (
        joinData(leftData, rightData, joinExpr, rightExpr, isLeftJoin, variables, options)
    ),

    // $function: dataParseCSV
    // $group: Data
    // $doc: Parse CSV text to a data array
    // $arg text...: The CSV text
    // $return: The data array
    'dataParseCSV': (text) => {
        const data = parseCSV(text);
        validateData(data, true);
        return data;
    },

    // $function: dataSort
    // $group: Data
    // $doc: Sort a data array
    // $arg data: The data array
    // $arg sorts: The sort field-name/descending-sort tuples
    // $return: The sorted data array
    'dataSort': ([data, sorts]) => sortData(data, sorts),

    // $function: dataTop
    // $group: Data
    // $doc: Keep the top rows for each category
    // $arg data: The data array
    // $arg count: The number of rows to keep
    // $arg categoryFields: Optional (default is null). The category fields.
    // $return: The top data array
    'dataTop': ([data, count, categoryFields = null]) => topData(data, count, categoryFields),

    // $function: dataValidate
    // $group: Data
    // $doc: Validate a data array
    // $arg data: The data array
    // $return: The validated data array
    'dataValidate': ([data]) => {
        validateData(data);
        return data;
    },


    //
    // Datetime functions
    //

    // $function: datetimeDay
    // $group: Datetime
    // $doc: Get the day of the month of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC day of the month.
    // $return: The day of the month
    'datetimeDay': ([datetime, utc = false]) => (datetime instanceof Date ? (utc ? datetime.getUTCDate() : datetime.getDate()) : null),

    // $function: datetimeHour
    // $group: Datetime
    // $doc: Get the hour of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC hour.
    // $return: The hour
    'datetimeHour': ([datetime, utc = false]) => (datetime instanceof Date ? (utc ? datetime.getUTCHours() : datetime.getHours()) : null),

    // $function: datetimeISOFormat
    // $group: Datetime
    // $doc: Format the datetime as an ISO date/time string
    // $arg datetime: The datetime
    // $arg isDate: If true, format the datetime as an ISO date
    // $return: The formatted datetime string
    'datetimeISOFormat': ([datetime, isDate = false]) => {
        let result = null;
        if (datetime instanceof Date) {
            if (isDate) {
                const year = datetime.getFullYear();
                const month = datetime.getMonth() + 1;
                const day = datetime.getDate();
                result = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
            } else {
                result = datetime.toISOString();
            }
        }
        return result;
    },

    // $function: datetimeISOParse
    // $group: Datetime
    // $doc: Parse an ISO date/time string
    // $arg str: The ISO date/time string
    // $return: The datetime, or null if parsing fails
    'datetimeISOParse': ([str]) => parseDatetime(str),

    // $function: datetimeMinute
    // $group: Datetime
    // $doc: Get the number of minutes of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC minutes.
    // $return: The number of minutes
    'datetimeMinute': ([datetime, utc = false]) => (
        datetime instanceof Date ? (utc ? datetime.getUTCMinutes() : datetime.getMinutes()) : null
    ),

    // $function: datetimeMonth
    // $group: Datetime
    // $doc: Get the number of the month (1-12) of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC month.
    // $return: The number of the month
    'datetimeMonth': ([datetime, utc = false]) => (
        datetime instanceof Date ? (utc ? datetime.getUTCMonth() + 1 : datetime.getMonth() + 1) : null
    ),

    // $function: datetimeNew
    // $group: Datetime
    // $doc: Create a new datetime
    // $arg year: The full year
    // $arg month: The month (1-12)
    // $arg day: The day of the month
    // $arg hours: Optional (default is 0). The hour (0-23)
    // $arg minutes: Optional (default is 0). The number of minutes.
    // $arg seconds: Optional (default is 0). The number of seconds.
    // $arg milliseconds: Optional (default is 0). The number of milliseconds.
    // $return: The new datetime
    'datetimeNew': ([year, month, day, hours = 0, minutes = 0, seconds = 0, milliseconds = 0]) => (
        new Date(year, month - 1, day, hours, minutes, seconds, milliseconds)
    ),

    // $function: datetimeNewUTC
    // $group: Datetime
    // $doc: Create a new UTC datetime
    // $arg year: The full year
    // $arg month: The month (1-12)
    // $arg day: The day of the month
    // $arg hours: Optional (default is 0). The hour (0-23)
    // $arg minutes: Optional (default is 0). The number of minutes.
    // $arg seconds: Optional (default is 0). The number of seconds.
    // $arg milliseconds: Optional (default is 0). The number of milliseconds.
    // $return: The new UTC datetime
    'datetimeNewUTC': ([year, month, day, hours = 0, minutes = 0, seconds = 0, milliseconds = 0]) => (
        new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds))
    ),

    // $function: datetimeNow
    // $group: Datetime
    // $doc: Get the current datetime
    // $return: The current datetime
    'datetimeNow': () => new Date(),

    // $function: datetimeSecond
    // $group: Datetime
    // $doc: Get the number of seconds of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC seconds.
    // $return: The number of seconds
    'datetimeSecond': ([datetime, utc = false]) => (
        datetime instanceof Date ? (utc ? datetime.getUTCSeconds() : datetime.getSeconds()) : null
    ),

    // $function: datetimeToday
    // $group: Datetime
    // $doc: Get today's datetime
    // $return: Today's datetime
    'datetimeToday': () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    },

    // $function: datetimeYear
    // $group: Datetime
    // $doc: Get the full year of a datetime
    // $arg datetime: The datetime
    // $arg utc: Optional (default is false). If true, return the UTC year.
    // $return: The full year
    'datetimeYear': ([datetime, utc = false]) => (
        datetime instanceof Date ? (utc ? datetime.getUTCFullYear() : datetime.getFullYear()) : null
    ),


    //
    // JSON functions
    //

    // $function: jsonParse
    // $group: JSON
    // $doc: Convert a JSON string to an object
    // $arg string: The JSON string
    // $return: The object
    'jsonParse': ([string]) => JSON.parse(string),

    // $function: jsonStringify
    // $group: JSON
    // $doc: Convert an object to a JSON string
    // $arg value: The object
    // $arg space: Optional (default is null). The indentation string or number.
    // $return: The JSON string
    'jsonStringify': ([value, space]) => jsonStringifySortKeys(value, space),


    //
    // Math functions
    //

    // $function: mathAbs
    // $group: Math
    // $doc: Compute the absolute value of a number
    // $arg x: The number
    // $return: The absolute value of the number
    'mathAbs': ([x]) => Math.abs(x),

    // $function: mathAcos
    // $group: Math
    // $doc: Compute the arccosine, in radians, of a number
    // $arg x: The number
    // $return: The arccosine, in radians, of the number
    'mathAcos': ([x]) => Math.acos(x),

    // $function: mathAsin
    // $group: Math
    // $doc: Compute the arcsine, in radians, of a number
    // $arg x: The number
    // $return: The arcsine, in radians, of the number
    'mathAsin': ([x]) => Math.asin(x),

    // $function: mathAtan
    // $group: Math
    // $doc: Compute the arctangent, in radians, of a number
    // $arg x: The number
    // $return: The arctangent, in radians, of the number
    'mathAtan': ([x]) => Math.atan(x),

    // $function: mathAtan2
    // $group: Math
    // $doc: Compute the angle, in radians, between (0, 0) and a point
    // $arg y: The Y-coordinate of the point
    // $arg x: The X-coordinate of the point
    // $return: The angle, in radians
    'mathAtan2': ([y, x]) => Math.atan2(y, x),

    // $function: mathCeil
    // $group: Math
    // $doc: Compute the ceiling of a number (round up to the next highest integer)
    // $arg x: The number
    // $return: The ceiling of the number
    'mathCeil': ([x]) => Math.ceil(x),

    // $function: mathCos
    // $group: Math
    // $doc: Compute the cosine of an angle, in radians
    // $arg x: The angle, in radians
    // $return: The cosine of the angle
    'mathCos': ([x]) => Math.cos(x),

    // $function: mathFloor
    // $group: Math
    // $doc: Compute the floor of a number (round down to the next lowest integer)
    // $arg x: The number
    // $return: The floor of the number
    'mathFloor': ([x]) => Math.floor(x),

    // $function: mathLn
    // $group: Math
    // $doc: Compute the natural logarithm (base e) of a number
    // $arg x: The number
    // $return: The natural logarithm of the number
    'mathLn': ([x]) => Math.log(x),

    // $function: mathLog
    // $group: Math
    // $doc: Compute the logarithm (base 10) of a number
    // $arg x: The number
    // $arg base: Optional (default is 10). The logarithm base.
    // $return: The logarithm of the number
    'mathLog': ([x, base = 10]) => Math.log(x) / Math.log(base),

    // $function: mathMax
    // $group: Math
    // $doc: Compute the maximum value
    // $arg values...: The values
    // $return: The maximum value
    'mathMax': (values) => Math.max(...values),

    // $function: mathMin
    // $group: Math
    // $doc: Compute the minimum value
    // $arg values...: The values
    // $return: The minimum value
    'mathMin': (values) => Math.min(...values),

    // $function: mathPi
    // $group: Math
    // $doc: Return the number pi
    // $return: The number pi
    'mathPi': () => Math.PI,

    // $function: mathRandom
    // $group: Math
    // $doc: Compute a random number between 0 and 1, inclusive
    // $return: A random number
    'mathRandom': () => Math.random(),

    // $function: mathRound
    // $group: Math
    // $doc: Round a number to a certain number of decimal places
    // $arg x: The number
    // $arg digits: Optional (default is 0). The number of decimal digits to round to.
    // $return: The rounded number
    'mathRound': ([x, digits = 0]) => {
        const multiplier = 10 ** digits;
        return Math.round(x * multiplier) / multiplier;
    },

    // $function: mathSign
    // $group: Math
    // $doc: Compute the sign of a number
    // $arg x: The number
    // $return: -1 for a negative number, 1 for a positive number, and 0 for zero
    'mathSign': ([x]) => Math.sign(x),

    // $function: mathSin
    // $group: Math
    // $doc: Compute the sine of an angle, in radians
    // $arg x: The angle, in radians
    // $return: The sine of the angle
    'mathSin': ([x]) => Math.sin(x),

    // $function: mathSqrt
    // $group: Math
    // $doc: Compute the square root of a number
    // $arg x: The number
    // $return: The square root of the number
    'mathSqrt': ([x]) => Math.sqrt(x),

    // $function: mathTan
    // $group: Math
    // $doc: Compute the tangent of an angle, in radians
    // $arg x: The angle, in radians
    // $return: The tangent of the angle
    'mathTan': ([x]) => Math.tan(x),


    //
    // Number functions
    //

    // $function: numberParseFloat
    // $group: Number
    // $doc: Parse a string as a floating point number
    // $arg string: The string
    // $return: The number
    'numberParseFloat': ([string]) => Number.parseFloat(string),

    // $function: numberParseInt
    // $group: Number
    // $doc: Parse a string as an integer
    // $arg string: The string
    // $arg radix: Optional (default is 10). The number base.
    // $return: The integer
    'numberParseInt': ([string, radix = 10]) => Number.parseInt(string, radix),

    // $function: numberToFixed
    // $group: Number
    // $doc: Format a number using fixed-point notation
    // $arg x: The number
    // $arg digits: Optional (default is 2). The number of digits to appear after the decimal point.
    // $arg trim: Optional (default is false). If true, trim trailing zeroes and decimal point.
    // $return: The fixed-point notation string
    'numberToFixed': ([x, digits = 2, trim = false]) => {
        let result = null;
        if (typeof x === 'number') {
            result = x.toFixed(digits);
            if (trim) {
                result = result.replace(rNumberCleanup, '');
            }
        }
        return result;
    },


    //
    // Object functions
    //

    // $function: objectAssign
    // $group: Object
    // $doc: Assign the keys/values of one object to another
    // $arg object: The object to assign to
    // $arg object2: The object to assign
    // $return: The updated object
    'objectAssign': ([object, object2]) => {
        if (object !== null && typeof object === 'object' && !Array.isArray(object) &&
            object2 !== null && typeof object2 === 'object' && !Array.isArray(object2)) {
            Object.assign(object, object2);
        }
        return object;
    },

    // $function: objectCopy
    // $group: Object
    // $doc: Create a copy of an object
    // $arg object: The object to copy
    // $return: The object copy
    'objectCopy': ([object]) => (object !== null && typeof object === 'object' && !Array.isArray(object) ? {...object} : {}),

    // $function: objectDelete
    // $group: Object
    // $doc: Delete an object key
    // $arg object: The object
    // $arg key: The key to delete
    'objectDelete': ([object, key]) => {
        if (object !== null && typeof object === 'object' && !Array.isArray(object)) {
            delete object[key];
        }
    },

    // $function: objectGet
    // $group: Object
    // $doc: Get an object key's value
    // $arg object: The object
    // $arg key: The key
    // $arg defaultValue: The default value (optional)
    // $return: The value or null if the key does not exist
    'objectGet': ([object, key, defaultValue = null]) => (
        object !== null && typeof object === 'object' ? (Object.hasOwn(object, key) ? object[key] : defaultValue) : defaultValue
    ),

    // $function: objectHas
    // $group: Object
    // $doc: Test if an object contains a key
    // $arg object: The object
    // $arg key: The key
    // $return: true if the object contains the key, false otherwise
    'objectHas': ([object, key]) => (object !== null && typeof object === 'object' && Object.hasOwn(object, key)),

    // $function: objectKeys
    // $group: Object
    // $doc: Get an object's keys
    // $arg object: The object
    // $return: The array of keys; null if not an object
    'objectKeys': ([object]) => (object !== null && typeof object === 'object' && !Array.isArray(object) ? Object.keys(object) : null),

    // $function: objectNew
    // $group: Object
    // $doc: Create a new object
    // $arg keyValues...: The object's initial key and value pairs
    // $return: The new object
    'objectNew': (keyValues) => {
        const object = {};
        for (let ix = 0; ix < keyValues.length; ix += 2) {
            object[keyValues[ix]] = (ix + 1 < keyValues.length ? keyValues[ix + 1] : null);
        }
        return object;
    },

    // $function: objectSet
    // $group: Object
    // $doc: Set an object key's value
    // $arg object: The object
    // $arg key: The key
    // $arg value: The value to set
    // $return: The value to set
    'objectSet': ([object, key, value]) => {
        if (object !== null && typeof object === 'object' && !Array.isArray(object)) {
            object[key] = value;
        }
        return value;
    },


    //
    // Regular expression functions
    //

    // $function: regexEscape
    // $group: Regex
    // $doc: Escape a string for use in a regular expression
    // $arg string: The string to escape
    // $return: The escaped string
    'regexEscape': ([string]) => (typeof string === 'string' ? string.replace(reRegexEscape, '\\$&') : null),

    // $function: regexMatch
    // $group: Regex
    // $doc: Find the first match of a regular expression in a string
    // $arg regex: The regular expression
    // $arg string: The string
    // $return: The [match object
    // $return: ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match#return_value)
    // $return: or null if no matches are found
    'regexMatch': ([regex, string]) => (typeof string === 'string' ? string.match(regex) : null),

    // $function: regexMatchAll
    // $group: Regex
    // $doc: Find all matches of regular expression in a string
    // $arg regex: The regular expression
    // $arg string: The string
    // $return: The [match object
    // $return: ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match#return_value)
    // $return: array or null if no matches are found
    'regexMatchAll': ([regex, string]) => (typeof string === 'string' ? Array.from(string.matchAll(regex)) : null),

    // $function: regexNew
    // $group: Regex
    // $doc: Create a regular expression
    // $arg pattern: The regular expression pattern string
    // $arg flags: The [regular expression flags
    // $arg flags: ](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#advanced_searching_with_flags)
    // $return: The regular expression or null if the pattern is invalid
    'regexNew': ([pattern, flags]) => new RegExp(pattern, flags),

    // $function: regexTest
    // $group: Regex
    // $doc: Test if a regular expression matches a string
    // $arg regex: The regular expression
    // $arg string: The string
    // $return: true if the regular expression matches, false otherwise
    'regexTest': ([regex, string]) => (regex instanceof RegExp ? regex.test(string) : null),


    //
    // Schema functions
    //

    // $function: schemaParse
    // $group: Schema
    // $doc: Parse the [Schema Markdown](https://craigahobbs.github.io/schema-markdown-js/language/) text
    // $arg lines...: The [Schema Markdown](https://craigahobbs.github.io/schema-markdown-js/language/)
    // $arg lines...: text lines (may contain nested arrays of un-split lines)
    // $return: The schema's [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    'schemaParse': (lines) => parseSchemaMarkdown(lines),

    // $function: schemaParseEx
    // $group: Schema
    // $doc: Parse the [Schema Markdown](https://craigahobbs.github.io/schema-markdown-js/language/) text with options
    // $arg lines: The array of [Schema Markdown](https://craigahobbs.github.io/schema-markdown-js/language/)
    // $arg lines: text lines (may contain nested arrays of un-split lines)
    // $arg types: Optional. The [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types').
    // $arg filename: Optional (default is ""). The file name.
    // $return: The schema's [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    'schemaParseEx': ([lines, types = {}, filename = '']) => parseSchemaMarkdown(lines, {types, filename}),

    // $function: schemaTypeModel
    // $group: Schema
    // $doc: Get the [Schema Markdown Type Model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    // $return: The [Schema Markdown Type Model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    'schemaTypeModel': () => typeModel,

    // $function: schemaValidate
    // $group: Schema
    // $doc: Validate an object to a schema type
    // $arg types: The [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    // $arg typeName: The type name
    // $arg value: The object to validate
    // $return: The validated object or null if validation fails
    'schemaValidate': ([types, typeName, value]) => validateType(types, typeName, value),

    // $function: schemaValidateTypeModel
    // $group: Schema
    // $doc: Validate a [Schema Markdown Type Model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    // $arg types: The [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types') to validate
    // $return: The validated [type model](https://craigahobbs.github.io/schema-markdown-doc/doc/#var.vName='Types')
    'schemaValidateTypeModel': ([types]) => validateTypeModel(types),


    //
    // String functions
    //

    // $function: stringCharCodeAt
    // $group: String
    // $doc: Get a string index's character code
    // $arg string: The string
    // $arg index: The character index
    // $return: The character code
    'stringCharCodeAt': ([string, index]) => (typeof string === 'string' ? string.charCodeAt(index) : null),

    // $function: stringEndsWith
    // $group: String
    // $doc: Determine if a string ends with a search string
    // $arg string: The string
    // $arg searchString: The search string
    // $return: true if the string ends with the search string, false otherwise
    'stringEndsWith': ([string, searchString]) => (typeof string === 'string' ? string.endsWith(searchString) : null),

    // $function: stringFromCharCode
    // $group: String
    // $doc: Create a string of characters from character codes
    // $arg charCodes...: The character codes
    // $return: The string of characters
    'stringFromCharCode': (charCodes) => String.fromCharCode(...charCodes),

    // $function: stringIndexOf
    // $group: String
    // $doc: Find the first index of a search string in a string
    // $arg string: The string
    // $arg searchString: The search string
    // $arg index: Optional (default is 0). The index at which to start the search.
    // $return: The first index of the search string; -1 if not found.
    'stringIndexOf': ([string, searchString, index]) => (typeof string === 'string' ? string.indexOf(searchString, index) : -1),

    // $function: stringLastIndexOf
    // $group: String
    // $doc: Find the last index of a search string in a string
    // $arg string: The string
    // $arg searchString: The search string
    // $arg index: Optional (default is the end of the string). The index at which to start the search.
    // $return: The last index of the search string; -1 if not found.
    'stringLastIndexOf': ([string, searchString, index]) => (typeof string === 'string' ? string.lastIndexOf(searchString, index) : -1),

    // $function: stringLength
    // $group: String
    // $doc: Get the length of a string
    // $arg string: The string
    // $return: The string's length; null if not a string
    'stringLength': ([string]) => (typeof string === 'string' ? string.length : null),

    // $function: stringLower
    // $group: String
    // $doc: Convert a string to lower-case
    // $arg string: The string
    // $return: The lower-case string
    'stringLower': ([string]) => (typeof string === 'string' ? string.toLowerCase() : null),

    // $function: stringNew
    // $group: String
    // $doc: Create a new string from a value
    // $arg value: The value
    // $return: The new string
    'stringNew': ([value]) => `${value}`,

    // $function: stringRepeat
    // $group: String
    // $doc: Repeat a string
    // $arg string: The string to repeat
    // $arg count: The number of times to repeat the string
    // $return: The repeated string
    'stringRepeat': ([string, count]) => (typeof string === 'string' ? string.repeat(count) : null),

    // $function: stringReplace
    // $group: String
    // $doc: Replace all instances of a string with another string
    // $arg string: The string to update
    // $arg substr: The string to replace
    // $arg newSubstr: The replacement string
    // $return: The updated string
    'stringReplace': ([string, substr, newSubstr], options) => {
        if (typeof string !== 'string') {
            return null;
        }
        if (typeof newSubstr === 'function') {
            const replacerFunction = (...args) => newSubstr(args, options);
            return string.replaceAll(substr, replacerFunction);
        }
        return string.replaceAll(substr, newSubstr);
    },

    // $function: stringSlice
    // $group: String
    // $doc: Copy a portion of a string
    // $arg string: The string
    // $arg start: Optional (default is 0). The start index of the slice.
    // $arg end: Optional (default is the end of the string). The end index of the slice.
    // $return: The new string slice
    'stringSlice': ([string, beginIndex, endIndex]) => (typeof string === 'string' ? string.slice(beginIndex, endIndex) : null),

    // $function: stringSplit
    // $group: String
    // $doc: Split a string
    // $arg string: The string to split
    // $arg separator: The separator string or regular expression
    // $arg limit: The maximum number of strings to split into
    // $return: The array of split-out strings
    'stringSplit': ([string, separator, limit]) => (typeof string === 'string' ? string.split(separator, limit) : null),

    // $function: stringStartsWith
    // $group: String
    // $doc: Determine if a string starts with a search string
    // $arg string: The string
    // $arg searchString: The search string
    // $return: true if the string starts with the search string, false otherwise
    'stringStartsWith': ([string, searchString]) => (typeof string === 'string' ? string.startsWith(searchString) : null),

    // $function: stringTrim
    // $group: String
    // $doc: Trim the whitespace from the beginning and end of a string
    // $arg string: The string
    // $return: The trimmed string
    'stringTrim': ([string]) => (typeof string === 'string' ? string.trim() : null),

    // $function: stringUpper
    // $group: String
    // $doc: Convert a string to upper-case
    // $arg string: The string
    // $return: The upper-case string
    'stringUpper': ([string]) => (typeof string === 'string' ? string.toUpperCase() : null),


    //
    // System functions
    //

    // $function: systemFetch
    // $group: System
    // $doc: Retrieve a remote JSON or text resource
    // $arg url: The resource URL or array of URLs
    // $arg options: Optional (default is null). The [fetch options](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters).
    // $arg isText: Optional (default is false). If true, retrieve the resource as text.
    // $return: The resource object/string or array of objects/strings; null if an error occurred.
    'systemFetch': async ([url, fetchOptions = null, isText = false], options) => {
        const isArray = Array.isArray(url);
        const urls = (isArray ? url : [url]).map((mURL) => (options !== null && 'urlFn' in options ? options.urlFn(mURL) : mURL));
        const responses = await Promise.all(urls.map(async (fURL) => {
            try {
                return 'fetchFn' in options ? await (fetchOptions ? options.fetchFn(fURL, fetchOptions) : options.fetchFn(fURL)) : null;
            } catch {
                return null;
            }
        }));
        const values = await Promise.all(responses.map(async (response) => {
            try {
                return response !== null && response.ok ? await (isText ? response.text() : response.json()) : null;
            } catch {
                return null;
            }
        }));

        // Log failures
        for (const [ixValue, value] of values.entries()) {
            if (value === null && options !== null && 'logFn' in options && options.debug) {
                const errorURL = urls[ixValue];
                options.logFn(`BareScript: Function "systemFetch" failed for ${isText ? 'text' : 'JSON'} resource "${errorURL}"`);
            }
        }

        return isArray ? values : values[0];
    },

    // $function: systemGlobalGet
    // $group: System
    // $doc: Get a global variable value
    // $arg name: The global variable name
    // $return: The global variable's value or null if it does not exist
    'systemGlobalGet': ([name], options) => {
        const globals = (options !== null ? (options.globals ?? null) : null);
        return (globals !== null ? (globals[name] ?? null) : null);
    },

    // $function: systemGlobalSet
    // $group: System
    // $doc: Set a global variable value
    // $arg name: The global variable name
    // $arg value: The global variable's value
    // $return: The global variable's value
    'systemGlobalSet': ([name, value], options) => {
        if (options !== null) {
            const globals = options.globals ?? null;
            if (globals !== null) {
                globals[name] = value;
            }
        }
        return value;
    },

    // $function: systemLog
    // $group: System
    // $doc: Log a message to the console
    // $arg string: The message
    'systemLog': ([string], options) => {
        if (options !== null && 'logFn' in options) {
            options.logFn(string);
        }
    },

    // $function: systemLogDebug
    // $group: System
    // $doc: Log a message to the console, if in debug mode
    // $arg string: The message
    'systemLogDebug': ([string], options) => {
        if (options !== null && 'logFn' in options && options.debug) {
            options.logFn(string);
        }
    },

    // $function: systemPartial
    // $group: System
    // $doc: Return a new function which behaves like "func" called with "args".
    // $doc: If additional arguments are passed to the returned function, they are appended to "args".
    // $arg func: The function
    // $arg args...: The function arguments
    // $return: The new function called with "args"
    'systemPartial': ([func, ...args]) => (argsExtra, options) => func([...args, ...argsExtra], options),

    // $function: systemType
    // $group: System
    // $doc: Get a value's type string
    // $arg value: The value
    // $return: The type string of the value.
    // $return: Valid values are: 'array', 'boolean', 'datetime', 'function', 'null', 'number', 'object', 'regex', 'string'.
    'systemType': ([value]) => {
        const type = typeof value;
        if (type === 'object') {
            if (value === null) {
                return 'null';
            } else if (Array.isArray(value)) {
                return 'array';
            } else if (value instanceof Date) {
                return 'datetime';
            } else if (value instanceof RegExp) {
                return 'regex';
            }
        }
        return type;
    },


    //
    // URL functions
    //

    // $function: urlEncode
    // $group: URL
    // $doc: Encode a URL
    // $arg url: The URL string
    // $arg extra: Optional (default is true). If true, encode extra characters for wider compatibility.
    // $return: The encoded URL string
    'urlEncode': ([url, extra = true]) => {
        let urlEncoded = encodeURI(url);
        if (extra) {
            // Replace ')' with '%29' for Markdown links
            urlEncoded = urlEncoded.replaceAll(')', '%29');
        }
        return urlEncoded;
    },

    // $function: urlEncodeComponent
    // $group: URL
    // $doc: Encode a URL component
    // $arg url: The URL component string
    // $arg extra: Optional (default is true). If true, encode extra characters for wider compatibility.
    // $return: The encoded URL component string
    'urlEncodeComponent': ([urlComponent, extra = true]) => {
        let urlComponentEncoded = encodeURIComponent(urlComponent);
        if (extra) {
            // Replace ')' with '%29' for Markdown links
            urlComponentEncoded = urlComponentEncoded.replaceAll(')', '%29');
        }
        return urlComponentEncoded;
    }
};


// Regex escape regular expression
const reRegexEscape = /[.*+?^${}()|[\]\\]/g;


// Fixed-number trim regular expression
const rNumberCleanup = /\.0*$/;


// The built-in expression function name script function name map
export const expressionFunctionMap = {
    'abs': 'mathAbs',
    'acos': 'mathAcos',
    'asin': 'mathAsin',
    'atan': 'mathAtan',
    'atan2': 'mathAtan2',
    'ceil': 'mathCeil',
    'charCodeAt': 'stringCharCodeAt',
    'cos': 'mathCos',
    'date': 'datetimeNew',
    'day': 'datetimeDay',
    'endsWith': 'stringEndsWith',
    'indexOf': 'stringIndexOf',
    'fixed': 'numberToFixed',
    'floor': 'mathFloor',
    'fromCharCode': 'stringFromCharCode',
    'hour': 'datetimeHour',
    'lastIndexOf': 'stringLastIndexOf',
    'len': 'stringLength',
    'lower': 'stringLower',
    'ln': 'mathLn',
    'log': 'mathLog',
    'max': 'mathMax',
    'min': 'mathMin',
    'minute': 'datetimeMinute',
    'month': 'datetimeMonth',
    'now': 'datetimeNow',
    'parseInt': 'numberParseInt',
    'parseFloat': 'numberParseFloat',
    'pi': 'mathPi',
    'rand': 'mathRandom',
    'replace': 'stringReplace',
    'rept': 'stringRepeat',
    'round': 'mathRound',
    'second': 'datetimeSecond',
    'sign': 'mathSign',
    'sin': 'mathSin',
    'slice': 'stringSlice',
    'sqrt': 'mathSqrt',
    'startsWith': 'stringStartsWith',
    'text': 'stringNew',
    'tan': 'mathTan',
    'today': 'datetimeToday',
    'trim': 'stringTrim',
    'upper': 'stringUpper',
    'urlEncode': 'urlEncode',
    'urlEncodeComponent': 'urlEncodeComponent',
    'year': 'datetimeYear'
};


// The built-in expression functions
export const expressionFunctions = Object.fromEntries(Object.entries(expressionFunctionMap).map(
    ([exprFnName, scriptFnName]) => [exprFnName, scriptFunctions[scriptFnName]]
).filter(([, exprFn]) => exprFn !== null));
