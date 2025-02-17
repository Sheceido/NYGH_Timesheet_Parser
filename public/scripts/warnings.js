/**
 * @typedef {import('./roster.js').Employee} Employee
 */

/**
 * @typedef {import('./parser.js').Shift} Shift
 */

/**
 * @typedef {Map<number, number[]>} Duplicates
 * Represents a mapping of weekday indices to an array of row indices where duplicates occur.
 * - The key (`number`) corresponds to a weekday column index.
 * - The value (`number[]`) is an array of row indices in the grid where duplicates are found
 */

/**
 * @typedef {Array<{shift: Shift, names: Array<string>}>} MultipleNames
 * Represents a list of shifts paired with a list of multiple name occurrences.
 */

/**
 * @typedef {Map<number, string[]>} EveningMaleTechs
 * Represents a mapping of weekday indices to an array of string of names
 * - The key (`number`) corresponds to a weekday column index.
 * - The value (`string[]`) is an array of strings of male names in both evening slots
 */

export class Warnings {

    shiftCount;

    /** @type {Duplicates} */
    duplicate;
    /** @type {MultipleNames} */
    multipleNames;
    /** @type {EveningMaleTechs} */
    eveningMaleTechs;

    /**
     * @param {string[][]} scheduleGrid 
    */
    constructor() {
        this.shiftCount = 0;

        this.duplicate = new Map();
        this.multipleNames = [];
        this.eveningMaleTechs = new Map();
    }

    /**
     * @param {Employee} employee 
     * @param {string[]} names 
     * @returns {boolean} boolean value if employee appears in list of names
     */
    hasMultipleNames(employee, names) {
        const nameCheck = new Set(names.map(n => n.toUpperCase()));

        return nameCheck.has(employee.first_name) ||
               nameCheck.has(employee.str_alias) ||
               nameCheck.has(employee.abbrev);
    }

    /**
    * @param {Shift} shift
    * @param {Array<string>} names
    */
    addMultipleNamesEntry(shift, names) {
        this.multipleNames.push({
            shift: shift,
            names: names
        });
    }
}
