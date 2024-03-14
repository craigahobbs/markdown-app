// Licensed under the MIT License
// https://github.com/craigahobbs/bare-script/blob/main/LICENSE

/** @module lib/data */

import {valueBoolean, valueCompare, valueJSON, valueParseDatetime, valueParseNumber} from './value.js';
import {evaluateExpression} from './runtime.js';
import {parseExpression} from './parser.js';
import {parseSchemaMarkdown} from '../../schema-markdown/lib/parser.js';
import {validateType} from '../../schema-markdown/lib/schema.js';


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
        while (linePart !== null) {
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
            linePart = (ixComma !== -1 ? linePart.slice(ixComma + 1) : null);
        }
        return row;
    });

    // Assemble the data rows
    const result = [];
    if (rows.length >= 2) {
        const fields = rows[0].map((field) => field.trim());
        for (let ixLine = 1; ixLine < rows.length; ixLine += 1) {
            const row = rows[ixLine];
            result.push(Object.fromEntries(fields.map(
                (field, ixField) => [field, ixField < row.length ? row[ixField] : null]
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
 * @param {boolean} [csv=false] - If true, parse value strings
 * @returns {Object} The map of field name to field type ("datetime", "number", "string")
 * @throws Throws an error if data is invalid
 */
export function validateData(data, csv = false) {
    // Determine field types
    const types = {};
    for (const row of data) {
        for (const [field, value] of Object.entries(row)) {
            if ((types[field] ?? null) === null) {
                if (typeof value === 'boolean') {
                    types[field] = 'boolean';
                } if (typeof value === 'number') {
                    types[field] = 'number';
                } else if (value instanceof Date) {
                    types[field] = 'datetime';
                } else if (typeof value === 'string') {
                    // If we aren't parsing CSV strings, its just a string
                    if (!csv) {
                        types[field] = 'string';

                    // If its the null string we can't determine the type yet
                    } else if (value === '' || value === 'null') {
                        types[field] = null;

                    // Can the string be parsed into another type?
                    } else if (valueParseDatetime(value) !== null) {
                        types[field] = 'datetime';
                    } else if (value === 'true' || value === 'false') {
                        types[field] = 'boolean';
                    } else if (valueParseNumber(value) !== null) {
                        types[field] = 'number';
                    } else {
                        types[field] = 'string';
                    }
                }
            }
        }
    }

    // Set the type for fields with undetermined type
    for (const [field, fieldType] of Object.entries(types)) {
        if (fieldType === null) {
            types[field] = 'string';
        }
    }

    // Helper to format and raise validation errors
    const throwFieldError = (field, fieldType, fieldValue) => {
        throw new Error(`Invalid "${field}" field value ${valueJSON(fieldValue)}, expected type ${fieldType}`);
    };

    // Validate field values
    for (const row of data) {
        for (const [field, value] of Object.entries(row)) {
            const fieldType = types[field] ?? null;
            if (fieldType === null) {
                continue;
            }

            // Null string?
            if (csv && value === 'null') {
                row[field] = null;

            // Number field
            } else if (fieldType === 'number') {
                if (csv && typeof value === 'string') {
                    let numberValue;
                    if (value === '') {
                        numberValue = null;
                    } else {
                        numberValue = valueParseNumber(value);
                        if (numberValue === null) {
                            throwFieldError(field, fieldType, value);
                        }
                    }
                    row[field] = numberValue;
                } else if (value !== null && typeof value !== 'number') {
                    throwFieldError(field, fieldType, value);
                }

            // Datetime field
            } else if (fieldType === 'datetime') {
                if (csv && typeof value === 'string') {
                    let datetimeValue;
                    if (value === '') {
                        datetimeValue = null;
                    } else {
                        datetimeValue = valueParseDatetime(value);
                        if (datetimeValue === null) {
                            throwFieldError(field, fieldType, value);
                        }
                    }
                    row[field] = datetimeValue;
                } else if (value !== null && !(value instanceof Date)) {
                    throwFieldError(field, fieldType, value);
                }

            // Boolean field
            } else if (fieldType === 'boolean') {
                if (csv && typeof value === 'string') {
                    let booleanValue;
                    if (value === '') {
                        booleanValue = null;
                    } else {
                        booleanValue = (value === 'true' ? true : (value === 'false' ? false : null));
                        if (booleanValue === null) {
                            throwFieldError(field, fieldType, value);
                        }
                    }
                    row[field] = booleanValue;
                } else if (value !== null && typeof value !== 'boolean') {
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


/**
 * Join two data arrays
 *
 * @param {Object} leftData - The left data array
 * @param {Object} rightData - The left data array
 * @param {string} joinExpr - The join [expression](./language/#expressions)
 * @param {?string} [rightExpr = null] - The right join [expression](./language/#expressions)
 * @param {boolean} [isLeftJoin = false] - If true, perform a left join (always include left row)
 * @param {?Object} [variables = null] - Additional variables for expression evaluation
 * @param {?Object} [options = null] - The [script execution options]{@link module:lib/options~ExecuteScriptOptions}
 * @returns {Object[]} The joined data array
 */
export function joinData(leftData, rightData, joinExpr, rightExpr = null, isLeftJoin = false, variables = null, options = null) {
    // Compute the map of row field name to joined row field name
    const leftNames = {};
    const rightNamesRaw = {};
    const rightNames = {};
    for (const row of leftData) {
        for (const fieldName of Object.keys(row)) {
            if (!(fieldName in leftNames)) {
                leftNames[fieldName] = fieldName;
            }
        }
    }
    for (const row of rightData) {
        for (const fieldName of Object.keys(row)) {
            if (!(fieldName in rightNames)) {
                rightNamesRaw[fieldName] = fieldName;
            }
        }
    }
    for (const fieldName of Object.keys(rightNamesRaw)) {
        if (!(fieldName in leftNames)) {
            rightNames[fieldName] = fieldName;
        } else {
            let ixUnique = 2;
            let uniqueName = `${fieldName}${ixUnique}`;
            while (uniqueName in leftNames || uniqueName in rightNames || uniqueName in rightNamesRaw) {
                ixUnique += 1;
                uniqueName = `${fieldName}${ixUnique}`;
            }
            rightNames[fieldName] = uniqueName;
        }
    }

    // Create the evaluation options object
    let evalOptions = options;
    if (variables !== null) {
        evalOptions = (options !== null ? {...options} : {});
        if ('globals' in evalOptions) {
            evalOptions.globals = {...evalOptions.globals, ...variables};
        } else {
            evalOptions.globals = variables;
        }
    }

    // Parse the left and right expressions
    const leftExpression = parseExpression(joinExpr);
    const rightExpression = (rightExpr !== null ? parseExpression(rightExpr) : leftExpression);

    // Bucket the right rows by the right expression value
    const rightCategoryRows = {};
    for (const rightRow of rightData) {
        const categoryKey = valueJSON(evaluateExpression(rightExpression, evalOptions, rightRow));
        if (!(categoryKey in rightCategoryRows)) {
            rightCategoryRows[categoryKey] = [];
        }
        rightCategoryRows[categoryKey].push(rightRow);
    }

    // Join the left with the right
    const data = [];
    for (const leftRow of leftData) {
        const categoryKey = valueJSON(evaluateExpression(leftExpression, evalOptions, leftRow));
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
 * @param {?Object} [options = null] - The [script execution options]{@link module:lib/options~ExecuteScriptOptions}
 * @returns {Object[]} The updated data array
 */
export function addCalculatedField(data, fieldName, expr, variables = null, options = null) {
    // Parse the calculation expression
    const calcExpr = parseExpression(expr);

    // Create the evaluation options object
    let evalOptions = options;
    if (variables !== null) {
        evalOptions = (options !== null ? {...options} : {});
        if ('globals' in evalOptions) {
            evalOptions.globals = {...evalOptions.globals, ...variables};
        } else {
            evalOptions.globals = variables;
        }
    }

    // Compute the calculated field for each row
    for (const row of data) {
        row[fieldName] = evaluateExpression(calcExpr, evalOptions, row);
    }

    return data;
}


/**
 * Filter data rows
 *
 * @param {Object[]} data - The data array
 * @param {string} expr - The boolean filter [expression](./language/#expressions)
 * @param {?Object} [variables = null] -  Additional variables for expression evaluation
 * @param {?Object} [options = null] - The [script execution options]{@link module:lib/options~ExecuteScriptOptions}
 * @returns {Object[]} The filtered data array
 */
export function filterData(data, expr, variables = null, options = null) {
    const result = [];

    // Parse the filter expression
    const filterExpr = parseExpression(expr);

    // Create the evaluation options object
    let evalOptions = options;
    if (variables !== null) {
        evalOptions = (options !== null ? {...options} : {});
        if ('globals' in evalOptions) {
            evalOptions.globals = {...evalOptions.globals, ...variables};
        } else {
            evalOptions.globals = variables;
        }
    }

    // Filter the data
    for (const row of data) {
        if (valueBoolean(evaluateExpression(filterExpr, evalOptions, row))) {
            result.push(row);
        }
    }

    return result;
}


/**
 * Aggregate data rows
 *
 * @param {Object[]} data - The data array
 * @param {Object} aggregation - The [aggregation model](./library/model.html#var.vName='Aggregation')
 * @returns {Object[]} The aggregated data array
 */
export function aggregateData(data, aggregation) {
    // Validate the aggregation model
    validateType(aggregationTypes, 'Aggregation', aggregation);
    const categories = aggregation.categories ?? null;

    // Create the aggregate rows
    const categoryRows = {};
    for (const row of data) {
        // Compute the category values
        const categoryValues = (categories !== null ? categories.map((categoryField) => row[categoryField]) : null);

        // Get or create the aggregate row
        let aggregateRow;
        const rowKey = (categoryValues !== null ? valueJSON(categoryValues) : '');
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
            if (value !== null) {
                aggregateRow[field].push(value);
            }
        }
    }

    // Compute the measure values aggregate function value
    const aggregateRows = Object.values(categoryRows);
    for (const aggregateRow of aggregateRows) {
        for (const measure of aggregation.measures) {
            const field = measure.name ?? measure.field;
            const func = measure.function;
            const measureValues = aggregateRow[field];
            if (!measureValues.length) {
                aggregateRow[field] = null;
            } else if (func === 'count') {
                aggregateRow[field] = measureValues.length;
            } else if (func === 'max') {
                aggregateRow[field] = measureValues.reduce((max, val) => (val > max ? val : max));
            } else if (func === 'min') {
                aggregateRow[field] = measureValues.reduce((min, val) => (val < min ? val : min));
            } else if (func === 'sum') {
                aggregateRow[field] = measureValues.reduce((sum, val) => sum + val, 0);
            } else if (func === 'stddev') {
                const average = measureValues.reduce((sum, val) => sum + val, 0) / measureValues.length;
                aggregateRow[field] = Math.sqrt(measureValues.reduce((sum, val) => sum + (val - average) ** 2, 0) / measureValues.length);
            } else {
                // func === 'average'
                aggregateRow[field] = measureValues.reduce((sum, val) => sum + val, 0) / measureValues.length;
            }
        }
    }

    return aggregateRows;
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

    # The standard deviation of the measure's values
    stddev

    # The sum of the measure's values
    sum
`);


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
        const compare = valueCompare(value1, value2);
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
            : valueJSON(categoryFields.map((field) => (field in row ? row[field] : null)));
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
