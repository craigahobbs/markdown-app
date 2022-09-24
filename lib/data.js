// Licensed under the MIT License
// https://github.com/craigahobbs/markdown-up/blob/main/LICENSE

/** @module lib/data */

import {evaluateExpression} from '../calc-script/lib/runtime.js';
import {parseExpression} from '../calc-script/lib/parser.js';
import {parseSchemaMarkdown} from '../schema-markdown/lib/parser.js';
import {validateType} from '../schema-markdown/lib/schema.js';


/**
 * Parse and validate CSV text to a data array
 *
 * @param {string} text - The CSV text
 * @returns {Object[]} The data array
 */
export function parseCSV(text) {
    // Line-split the text
    const lines = [];
    if (typeof text === 'string') {
        lines.push(...text.split(rCSVLineSplit));
    } else {
        for (const textPart of text) {
            lines.push(...textPart.split(rCSVLineSplit));
        }
    }

    // Split lines into rows
    const rows = lines.filter((line) => !line.match(rCSVBlankLine)).map((line) => {
        const row = [];
        let linePart = line;
        while (linePart !== '') {
            // Quoted field?
            const mQuoted = linePart.match(rCSVQuotedField) ?? linePart.match(rCSVQuotedFieldEnd);
            if (mQuoted !== null) {
                row.push(mQuoted[1].replaceAll(rCSVQuoteEscape, '"'));
                linePart = linePart.slice(mQuoted[0].length);
                continue;
            }

            // Non-quoted field
            const ixComma = linePart.indexOf(',');
            row.push(ixComma !== -1 ? linePart.slice(0, ixComma) : linePart);
            linePart = (ixComma !== -1 ? linePart.slice(ixComma + 1) : '');
        }
        return row;
    });

    // Assemble the data rows
    const result = [];
    if (rows.length >= 2) {
        const [fields] = rows;
        for (let ixLine = 1; ixLine < rows.length; ixLine += 1) {
            const row = rows[ixLine];
            result.push(Object.fromEntries(fields.map(
                (field, ixField) => [field, ixField < row.length ? row[ixField] : 'null']
            )));
        }
    }

    return result;
}

const rCSVLineSplit = /\r?\n/;
const rCSVBlankLine = /^\s*$/;
const rCSVQuotedField = /^"((?:""|[^"])*)",/;
const rCSVQuotedFieldEnd = /^"((?:""|[^"])*)"\s*$/;
const rCSVQuoteEscape = /""/g;


/**
 * Determine data field types and parse/validate field values
 *
 * @param {Object[]} data - The data array. Row objects are updated with parsed/validated values.
 * @param {boolean} [csv=false] - If true, parse number and null strings
 * @returns {Object} The map of field name to field type ("datetime", "number", "string")
 * @throws Throws an error if data is invalid
 */
export function validateData(data, csv = false) {
    // Determine field types
    const types = {};
    for (const row of data) {
        for (const [field, value] of Object.entries(row)) {
            if (!(field in types)) {
                if (typeof value === 'number') {
                    types[field] = 'number';
                } else if (value instanceof Date) {
                    types[field] = 'datetime';
                } else if (typeof value === 'string' && (!csv || value !== 'null')) {
                    if (parseDatetime(value) !== null) {
                        types[field] = 'datetime';
                    } else if (csv && parseNumber(value) !== null) {
                        types[field] = 'number';
                    } else {
                        types[field] = 'string';
                    }
                }
            }
        }
    }

    // Validate field values
    const throwFieldError = (field, fieldType, fieldValue) => {
        throw new Error(`Invalid "${field}" field value ${JSON.stringify(fieldValue)}, expected type ${fieldType}`);
    };
    for (const row of data) {
        for (const [field, value] of Object.entries(row)) {
            const fieldType = types[field];

            // Null string?
            if (csv && value === 'null') {
                row[field] = null;

            // Number field
            } else if (fieldType === 'number') {
                if (csv && typeof value === 'string') {
                    const numberValue = parseNumber(value);
                    if (numberValue === null) {
                        throwFieldError(field, fieldType, value);
                    }
                    row[field] = numberValue;
                } else if (value !== null && typeof value !== 'number') {
                    throwFieldError(field, fieldType, value);
                }

            // Datetime field
            } else if (fieldType === 'datetime') {
                if (typeof value === 'string') {
                    const datetimeValue = parseDatetime(value);
                    if (datetimeValue === null) {
                        throwFieldError(field, fieldType, value);
                    }
                    row[field] = datetimeValue;
                } else if (value !== null && !(value instanceof Date)) {
                    throwFieldError(field, fieldType, value);
                }

            // String field
            } else {
                if (value !== null && typeof value !== 'string') {
                    throwFieldError(field, fieldType, value);
                }
            }
        }
    }

    return types;
}


function parseNumber(text) {
    const value = Number.parseFloat(text);
    if (Number.isNaN(value) || !Number.isFinite(value)) {
        return null;
    }
    return value;
}


function parseDatetime(text) {
    if (rDate.test(text)) {
        const localDate = new Date(text);
        return new Date(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
    } else if (rDatetime.test(text)) {
        return new Date(text);
    }
    return null;
}

const rDate = /^\d{4}-\d{2}-\d{2}$/;
const rDatetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;


/**
 * Join two data arrays
 *
 * @param {Object} leftData - The left data array
 * @param {Object} rightData - The left data array
 * @param {string} joinExpr - The join [expression]{@link https://craigahobbs.github.io/calc-script/language/#expressions}
 * @param {?string} [rightExpr = null] - The right join [expression]{@link https://craigahobbs.github.io/calc-script/language/#expressions}
 * @param {boolean} [isLeftJoin = false] - If true, perform a left join (always include left row)
 * @param {?Object} [variables = null] - Additional variables for expression evaluation
 * @returns {Object[]} The joined data array
 */
export function joinData(leftData, rightData, joinExpr, rightExpr = null, isLeftJoin = false, variables = null) {
    // Compute the map of row field name to joined row field name
    const leftNames = {};
    for (const row of leftData) {
        for (const fieldName of Object.keys(row)) {
            if (!(fieldName in leftNames)) {
                leftNames[fieldName] = fieldName;
            }
        }
    }
    const rightNames = {};
    for (const row of rightData) {
        for (const fieldName of Object.keys(row)) {
            if (!(fieldName in rightNames)) {
                if (!(fieldName in leftNames)) {
                    rightNames[fieldName] = fieldName;
                } else {
                    let uniqueName = fieldName;
                    let ixUnique = 2;
                    do {
                        uniqueName = `${fieldName}${ixUnique}`;
                        ixUnique += 1;
                    } while (uniqueName in leftNames || uniqueName in rightNames);
                    rightNames[fieldName] = uniqueName;
                }
            }
        }
    }

    // Parse the left and right expressions
    const evalOptions = (variables !== null ? {'globals': variables} : null);
    const leftExpression = parseExpression(joinExpr);
    const rightExpression = (rightExpr !== null ? parseExpression(rightExpr) : leftExpression);

    // Bucket the right rows by the right expression value
    const rightCategoryRows = {};
    for (const rightRow of rightData) {
        const categoryKey = JSON.stringify(evaluateExpression(rightExpression, evalOptions, rightRow));
        if (!(categoryKey in rightCategoryRows)) {
            rightCategoryRows[categoryKey] = [];
        }
        rightCategoryRows[categoryKey].push(rightRow);
    }

    // Join the left with the right
    const data = [];
    for (const leftRow of leftData) {
        const categoryKey = JSON.stringify(evaluateExpression(leftExpression, evalOptions, leftRow));
        if (categoryKey in rightCategoryRows) {
            for (const rightRow of rightCategoryRows[categoryKey]) {
                const joinRow = {...leftRow};
                for (const [rightName, rightValue] of Object.entries(rightRow)) {
                    joinRow[rightNames[rightName]] = rightValue;
                }
                data.push(joinRow);
            }
        } else if (!isLeftJoin) {
            data.push({...leftRow});
        }
    }

    return data;
}


/**
 * Add a calculated field to each row of a data array
 *
 * @param {Object[]} data - The data array. Row objects are updated with the calculated field values.
 * @param {string} fieldName - The calculated field name
 * @param {string} expr - The calculated field expression
 * @param {?Object} [variables = null] -  Additional variables for expression evaluation
 * @returns {Object[]} The updated data array
 */
export function addCalculatedField(data, fieldName, expr, variables = null) {
    // Parse the calculation expression
    const calcExpr = parseExpression(expr);

    // Compute the calculated field for each row
    const evalOptions = (variables !== null ? {'globals': variables} : null);
    for (const row of data) {
        row[fieldName] = evaluateExpression(calcExpr, evalOptions, row);
    }
    return data;
}


/**
 * Filter data rows
 *
 * @param {Object[]} data - The data array
 * @param {string} expr - The boolean filter [expression]{@link https://craigahobbs.github.io/calc-script/language/#expressions}
 * @param {?Object} [variables = null] -  Additional variables for expression evaluation
 * @returns {Object[]} The filtered data array
 */
export function filterData(data, expr, variables = null) {
    const result = [];

    // Parse the filter expression
    const filterExpr = parseExpression(expr);

    // Filter the data
    const evalOptions = (variables !== null ? {'globals': variables} : null);
    for (const row of data) {
        if (evaluateExpression(filterExpr, evalOptions, row)) {
            result.push(row);
        }
    }

    return result;
}


// The aggregation model
export const aggregationTypes = parseSchemaMarkdown(`\
group "Aggregation"


# A data aggregation specification
struct Aggregation

    # The aggregation category fields
    optional string[len > 0] categories

    # The aggregation measures
    AggregationMeasure[len > 0] measures


# An aggregation measure specification
struct AggregationMeasure

    # The aggregation measure field
    string field

    # The aggregation function
    AggregationFunction function

    # The aggregated-measure field name
    optional string name


# An aggregation function
enum AggregationFunction

    # The average of the measure's values
    average

    # The count of the measure's values
    count

    # The greatest of the measure's values
    max

    # The least of the measure's values
    min

    # The sum of the measure's values
    sum
`);


/**
 * Validate an aggregation model
 *
 * @param {Object} aggregation - The
 *     [aggregation model]{@link https://craigahobbs.github.io/markdown-up/library/model.html#var.vName='Aggregation'}
 * @returns {Object} The validated
 *     [aggregation model]{@link https://craigahobbs.github.io/markdown-up/library/model.html#var.vName='Aggregation'}
 * @throws [ValidationError]{@link https://craigahobbs.github.io/schema-markdown-js/module-lib_schema.ValidationError.html}
 */
export function validateAggregation(aggregation) {
    return validateType(aggregationTypes, 'Aggregation', aggregation);
}


/**
 * Aggregate data rows
 *
 * @param {Object[]} data - The data array
 * @param {Object} aggregation - The
 *     [aggregation model]{@link https://craigahobbs.github.io/markdown-up/library/model.html#var.vName='Aggregation'}
 * @returns {Object[]} The aggregated data array
 */
export function aggregateData(data, aggregation) {
    const categories = aggregation.categories ?? null;

    // Create the aggregate rows
    const categoryRows = {};
    for (const row of data) {
        // Compute the category values
        const categoryValues = (categories !== null ? categories.map((categoryField) => row[categoryField]) : null);

        // Get or create the aggregate row
        let aggregateRow;
        const rowKey = (categoryValues !== null ? JSON.stringify(categoryValues) : '');
        if (rowKey in categoryRows) {
            aggregateRow = categoryRows[rowKey];
        } else {
            aggregateRow = {};
            categoryRows[rowKey] = aggregateRow;
            if (categories !== null) {
                for (let ixCategoryField = 0; ixCategoryField < categories.length; ixCategoryField++) {
                    aggregateRow[categories[ixCategoryField]] = categoryValues[ixCategoryField];
                }
            }
        }

        // Add to the aggregate measure values
        for (const measure of aggregation.measures) {
            const field = measure.name ?? measure.field;
            const value = row[measure.field] ?? null;
            if (!(field in aggregateRow)) {
                aggregateRow[field] = [];
            }
            aggregateRow[field].push(value);
        }
    }

    // Compute the measure values aggregate function value
    const aggregateRows = Object.values(categoryRows);
    for (const aggregateRow of aggregateRows) {
        for (const measure of aggregation.measures) {
            const field = measure.name ?? measure.field;
            const func = measure.function;
            const measureValues = aggregateRow[field];
            if (func === 'count') {
                aggregateRow[field] = measureValues.length;
            } else if (func === 'max') {
                aggregateRow[field] = measureValues.reduce((max, val) => (val > max ? val : max));
            } else if (func === 'min') {
                aggregateRow[field] = measureValues.reduce((min, val) => (val < min ? val : min));
            } else if (func === 'sum') {
                aggregateRow[field] = measureValues.reduce((sum, val) => sum + val, 0);
            } else {
                aggregateRow[field] = measureValues.reduce((sum, val) => sum + val, 0) / measureValues.length;
            }
        }
    }

    return aggregateRows;
}


/**
 * Sort data rows
 *
 * @param {Object[]} data - The data array
 * @param {Object[]} sorts - The sort field-name/descending-sort tuples
 * @returns {Object[]} The sorted data array
 */
export function sortData(data, sorts) {
    return data.sort((row1, row2) => sorts.reduce((result, sort) => {
        if (result !== 0) {
            return result;
        }
        const [field, desc = false] = sort;
        const value1 = row1[field] ?? null;
        const value2 = row2[field] ?? null;
        const compare = compareValues(value1, value2);
        return desc ? -compare : compare;
    }, 0));
}


/**
 * Top data rows
 *
 * @param {Object[]} data - The data array
 * @param {number} count - The number of rows to keep
 * @param {?string[]} [categoryFields = null] - The category fields
 * @returns {Object[]} The top data array
 */
export function topData(data, count, categoryFields = null) {
    // Bucket rows by category
    const categoryRows = {};
    const categoryOrder = [];
    for (const row of data) {
        const categoryKey = categoryFields === null ? ''
            : JSON.stringify(categoryFields.map((field) => (field in row ? row[field] : null)));
        if (!(categoryKey in categoryRows)) {
            categoryRows[categoryKey] = [];
            categoryOrder.push(categoryKey);
        }
        categoryRows[categoryKey].push(row);
    }
    // Take only the top rows
    const dataTop = [];
    const topCount = count;
    for (const categoryKey of categoryOrder) {
        const categoryKeyRows = categoryRows[categoryKey];
        const categoryKeyLength = categoryKeyRows.length;
        for (let ixRow = 0; ixRow < topCount && ixRow < categoryKeyLength; ixRow++) {
            dataTop.push(categoryKeyRows[ixRow]);
        }
    }
    return dataTop;
}


// Helper function to format labels
export function formatValue(value, precision = null, datetime = null) {
    if (value instanceof Date) {
        if (datetime === 'year') {
            // Round to nearest year
            let valueRounded = value;
            if (value.getUTCMonth() > 5) {
                valueRounded = new Date(value);
                valueRounded.setUTCFullYear(value.getUTCFullYear() + 1);
            }

            const isoFormat = valueRounded.toISOString();
            return isoFormat.slice(0, isoFormat.indexOf('T') - 6);
        } else if (datetime === 'month') {
            // Round to the nearest month
            let valueRounded = value;
            if (value.getUTCDate() > 15) {
                valueRounded = new Date(value);
                valueRounded.setMonth(value.getUTCMonth() + 1);
            }

            const isoFormat = valueRounded.toISOString();
            return isoFormat.slice(0, isoFormat.indexOf('T') - 3);
        } else if (datetime === 'day') {
            const isoFormat = value.toISOString();
            return isoFormat.slice(0, isoFormat.indexOf('T'));
        }
        return value.toISOString().replace(rDateCleanup, '');
    } else if (typeof value === 'number') {
        const numberFormat = value.toFixed(precision ?? defaultPrecision);
        return numberFormat.replace(rNumberCleanup, '');
    }
    return `${value}`;
}

const defaultPrecision = 2;
const rNumberCleanup = /\.0*$/;
const rDateCleanup = /(?:(?:(?:-01)?T00:00)?:00)?\.\d\d\dZ$/;


// Helper function to compare values
export function compareValues(value1, value2) {
    if (value1 === null) {
        return value2 === null ? 0 : -1;
    } else if (value2 === null) {
        return 1;
    } else if (value1 instanceof Date) {
        const time1 = value1.getTime();
        const time2 = value2.getTime();
        return time1 < time2 ? -1 : (time1 === time2 ? 0 : 1);
    }
    return value1 < value2 ? -1 : (value1 === value2 ? 0 : 1);
}


// Helper function to compute a value's parameter
export function valueParameter(value, minValue, maxValue) {
    if (minValue === maxValue) {
        return 0;
    }

    if (minValue instanceof Date) {
        const minDateValue = minValue.valueOf();
        return (value.valueOf() - minDateValue) / (maxValue.valueOf() - minDateValue);
    }

    return (value - minValue) / (maxValue - minValue);
}


// Helper function to compute a value from a parameter
export function parameterValue(param, minValue, maxValue) {
    if (minValue instanceof Date) {
        const minDateValue = minValue.valueOf();
        return new Date(minDateValue + param * (maxValue.valueOf() - minDateValue));
    }

    return minValue + param * (maxValue - minValue);
}
