import { DEFINED_SHIFTS_SET, WEEKEND_DAYS } from './constants.js';
/** @typedef {import('./roster.js').Employee} Employee */
/** @typedef {import('./parser.js').Shift} Shift */
/**
 * @typedef {Map<number, Set<string>>} ConflictsMap
 * Represents a mapping of weekday indices to a set of employee str_alias names
 */
/**
 * @typedef {Shift[]} Duplicates
 * Represents a mapping of weekday indices to an array of row indices where duplicates occur.
 * - The key (`number`) corresponds to a weekday column index.
 * - The value (`Shift[]`) is an array of row indices in the grid where duplicates are found
 */
/**
 * @typedef {Shift[]} RegShiftMultipleNames
 * Represents a list of regular shifts paired with a list of multiple name occurrences.
 */
/**
 * @typedef {Shift[]} StandbyMultipleNames
 * Represents a list of standby shifts paired with a list of multiple name occurrences.
 */
/**
 * @typedef {Shift[]} EveningMaleConflicts
 * Represents a mapping of weekday indices to an array of string of names
 */
/**
 * @typedef {Shift[]} NotAvailableConflicts
 * An array of shifts that correspond to an employee that was already marked as not available on that day.
 */
/**
 * @typedef {Shift[]} EmptyCell
 * an array of shifts that appear to be empty that by default may be expected to be filled
 */
/**
 * @typedef {Map<string, Shift[]>} UnknownEmployeeShifts
 * a mapping of unknown employee name, to their found shifts scheduled.
 */
/**
 * @typedef {{expected: number, found: number}} ShiftCountError
 * expected: number of expected shifts for the FTR, taking into account stat holidays
 * found: error value by +/0/- integer value:
 *   (+) is greater than the expected shifts
 *   (0) accounts for the proper number of shifts
 *   (-) less than the expected shifts
 */
/**
 * @typedef {Map<string, {isFTR: boolean, total: number, expected: number, found: number}>} EmployeeShiftCount
 * a mapping of employee name, to their FTR status and found shift count (errors)
 */
/**
 * @typedef {{
 *      duplicate: Duplicates,
 *      regShiftMultiNames: RegShiftMultipleNames,
 *      standbyMultiNames: StandbyMultipleNames,
 *      evening: EveningMaleConflicts,
 *      notAvailable: NotAvailableConflicts,
 *      emptyCells: EmptyCell,
 *      shiftCount: ShiftCountError,
 *      employeeShiftCount: EmployeeShiftCount,
 *      unknownEmployeeShifts: UnknownEmployeeShifts,
 *  }} WarningsGroup
 * */

export class Warnings {
    /** @type {Map<string, ConflictsMap>} */
    _category;
    /** @type {ConflictsMap} */
    _eveningMapping;
    /** @type {ConflictsMap} */
    _unavailableMapping;

    /** @type {Duplicates} */
    _duplicate;

    /** @type {RegShiftMultipleNames} */
    _regShiftMultiNames;
    /** @type {StandbyMultipleNames} */
    _standbyMultiNames;

    /** @type {EveningMaleConflicts} */
    _eveningMaleTechs;
    /** @type {NotAvailableConflicts} */
    _notAvailable;

    /** @type {EmptyCell} */
    _emptyCells;

    /** @type {UnknownEmployeeShifts} */
    _unknownEmployeeShifts;

    /** @type {number} */
    _expectedShiftCount;
    /** @type {number} */
    _shiftCountError;

    /** @type {EmployeeShiftCount} */
    _employeeShiftCount;

    constructor() {
        this._category = {
            "unavailable": new Map(),
            "evening": new Map(),
        }
        this._duplicate = [];
        this._regShiftMultiNames = [];
        this._standbyMultiNames = [];
        this._eveningMaleTechs = [];
        this._notAvailable = [];
        this._emptyCells = [];
        this._unknownEmployeeShifts = new Map();
        this._employeeShiftCount = new Map();
    }

    get conflictsMap() {
        return structuredClone(this._category);
    }

    /** @returns {WarningsGroup} group of deep copied warnings generated by this class */
    get warningsGroup() {
        return {
            duplicate: this.duplicate,
            regShiftMultiNames: this.regShiftMultiNames,
            standbyMultiNames: this.standbyMultiNames,
            evening: this.eveningMalesTechs,
            notAvailable: this.notAvailable,
            emptyCells: this.emptyCells,
            shiftCount: this.shiftCountError, // only used if parsing is of a single employee
            employeeShiftCount: this.employeeShiftCount, // only used if parsing is of multiple employees
            unknownEmployeeShifts: this.unknownEmployeeShifts,
        }
    }
    /** @returns {Duplicates} a deep copy of duplicate warnings */
    get duplicate() {
        return structuredClone(this._duplicate);
    }
    /** @returns {RegShiftMultipleNames} a deep copy of multiple names found in reg shifts */
    get regShiftMultiNames() {
        return structuredClone(this._regShiftMultiNames);
    }
    /** @returns {StandbyMultipleNames} a deep copy of multiple names found in standby shifts */
    get standbyMultiNames() {
        return structuredClone(this._standbyMultiNames);
    }

    /** @returns {ConflictsMap} */
    get eveningMapping() {
        return structuredClone(this._category["evening"]);
    }
    /** @param {ConflictsMap} mapping  */
    set eveningMapping(mapping) {
        this._category["evening"] = mapping;
    }
    /** @returns {ConflictsMap} a deep copy of unavailable techs warning */
    get unavailableMapping() {
        return structuredClone(this._category["unavailable"]);
    }
    /** @param {ConflictsMap} mapping  */
    set unavailableMapping(mapping) {
        this._category["unavailable"] = mapping;
    }

    /** @returns {EveningMaleConflicts} a deep copy of evening male techs warning */
    get eveningMalesTechs() {
        return structuredClone(this._eveningMaleTechs);
    }
    /** @returns {NotAvailableConflicts} */
    get notAvailable() {
        return structuredClone(this._notAvailable);
    }
    get emptyCells() {
        return structuredClone(this._emptyCells);
    }

    get unknownEmployeeShifts() {
        return structuredClone(this._unknownEmployeeShifts);
    }
    /** @param {UnknownEmployeeShifts} mapping  */
    set unknownEmployeeShifts(mapping) {
        this._unknownEmployeeShifts = mapping;
    }

    /** @returns {ShiftCountError} */
    get shiftCountError() {
        return {
            expected: this._expectedShiftCount,
            found: this._shiftCountError,
        };
    }

    get employeeShiftCount() {
        return structuredClone(this._employeeShiftCount);
    }

    /**
     * @param {string} employeeStatus 
     * @param {number} shiftCount 
     * @param {number} statCount
     */
    shiftCountEval(isFTR, shiftCount, statCount) {
        const FTR_HRS = 10;
        this._expectedShiftCount = FTR_HRS - statCount;

        if (!isFTR) {
            this._expectedShiftCount = shiftCount;
            this._shiftCountError = 0;
            return;
        }
        if (shiftCount === this._expectedShiftCount) {
            this._shiftCountError = 0;
        } else {
            this._shiftCountError = shiftCount - this._expectedShiftCount;
        }
    }

    /**
     * @param {string} name
     * @param {boolean} isFTR 
     * @param {number} increment 
     */
    employeeShiftCountIncrement(name, isFTR, increment) {
        if (this._employeeShiftCount.has(name)) {
            const sCount = this._employeeShiftCount.get(name);
            sCount.total += increment;
        } else {
            this._employeeShiftCount.set(
                name,
                {
                    isFTR: isFTR,
                    total: increment,
                    expected: null,
                    found: null,
                }
            );
        }
    }

    employeeShiftCountCheck(statCount) {
        const FTR_BIWEEKLY_SHIFT_TOTAL = 10;

        for (const [_, sCount] of this._employeeShiftCount) {
            if (sCount.isFTR) {
                sCount.expected = FTR_BIWEEKLY_SHIFT_TOTAL - statCount;
                sCount.found = sCount.total - sCount.expected;
            }
        }
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
    */
    addMultipleNamesEntry(shift) {
        if (shift.shiftTime !== "ON-CALL") {
            if (!this._regShiftMultiNames) {
                this._regShiftMultipleNames = [];
            }
            this._regShiftMultiNames.push(shift);
        } else {
            if (!this._standbyMultiNames) {
                this._standbyMultiNames = [];
            }
            this._standbyMultiNames.push(shift);
        }
    }

    /**
    * @param {Shift} shift
    */
    addDuplicateNamesEntry(shift) {
        if (!this._duplicate) {
            this._duplicate = [];
        }
        this._duplicate.push(shift);
    }

    /**
    * @param {number} dayIndex 
    * @param {string} name 
    */
    isUnavailable(dayIndex, name) {
        if (this._category["unavailable"].has(dayIndex)) {
            return this._category["unavailable"].get(dayIndex).has(name);
        }
        return false;
    }

    /**
     * @param {Shift} shift 
     */
    addNotAvailableEntry(shift) {
        if (!this._notAvailable) {
            this._notAvailable = [];
        }
        this._notAvailable.push(shift);
    }

    /**
     * @param {Shift} shift 
     */
    isEmptyCell(shift) {
        return (
            (
                shift.location === "GENERAL" ||
                shift.location === "OCSC" ||
                shift.location === "CONSUMER" ||
                shift.location === "OCSC / CONSUMER" ||
                (shift.location === "BDC" && !WEEKEND_DAYS.includes(shift.weekday))
            ) &&
            DEFINED_SHIFTS_SET.has(shift.shiftTime) &&
            shift.names.length === 1 &&
            shift.names[0] === "" &&
            shift.shiftTimeCascade === false
        );
    }

    addEmptyCellEntry(shift) {
        if (!this._emptyCells) {
            this._emptyCells = [];
        }
        this._emptyCells.push(shift);
    }

    /**
     * Makes sure that the current employee is male first, then checks that the evening mapping has the day provided, and finally Iterate through each name in the set (usually < 3 names) of evening employees:
     * - skip names that are of the provided employee
     * - flag true if another found employee is also male
     *
     * @param {number} dayIndex 
     * @param {Employee} employee 
     * @param {(name: string) => Employee | null} matchEmployeeByRoster 
     * @returns {boolean}
     */
    isAnotherMaleEmployee(dayIndex, employee, matchEmployeeByRoster) {
        if (employee.gender !== "M") {
            return false;
        }
        if (!this._category["evening"].has(dayIndex)) {
            return false;
        }

        const eveningEmployee = this._category["evening"].get(dayIndex);
        let isAnotherMale = false;

        eveningEmployee.values().forEach(name => {
            if (name === employee.str_alias) {
                return; // continue next iteration
            }
            const otherEmployee = matchEmployeeByRoster(name);
            if (otherEmployee) {
                isAnotherMale = (otherEmployee.gender === "M");
            }
        });

        return isAnotherMale;
    }

    /**
     * @param {Shift} shift 
     */
    addEveningMaleEntry(shift) {
        if (!this._eveningMaleTechs) {
            this._eveningMaleTechs = [];
        }
        this._eveningMaleTechs.push(shift);
    }

    /**
     * @param {string} key 
     * @param {Shift} shift 
     */
    addUnknownEmployeeShiftsEntry(key, shift) {
        if (this._unknownEmployeeShifts.has(key)) {
            this._unknownEmployeeShifts.get(key).push(shift);
        } else {
            this._unknownEmployeeShifts.set(key, [shift]);
        }
    }

    /**
    * @param {string} type 
    * Creates an empty `ConflictsMap` if the indexed category has yet to be defined
    */
    createEmptyMappingByCategory(type) {
        if (!this._category[type]) {
            this._category[type] = new Map();
        }
    }
    /**
     * Adds an employee's name to the specified category mapping for a given day index.
     * If the category does not exist, it initializes a new mapping.
     * If the day index does not exist within the category, it initializes a new set.
     * 
     * @param {string} type - The category type (e.g., "unavailable", "evening", etc).
     * @param {number} dayIndex - The index of the day (typically a weekday index).
     * @param {string} name - The employee's name or alias to be added to the mapping.
     */
    populateMapByCategory(type, dayIndex, name) {
        if (!this._category[type]) {
            this._category[type] = new Map();
        }
        const mapping = this._category[type];

        if (mapping.has(dayIndex)) {
            mapping.get(dayIndex).add(name);
        } else {
            mapping.set(dayIndex, new Set([name]));
        }
    }
}
