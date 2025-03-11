import { Warnings } from './warnings.js';
import { roster } from './roster.js';

/**
 * @typedef {Object} Shift 
 * @property {{row: number, col: number}} coordinate - [row][col] identifier
 * @property {string[]} names - list of names within the shift cell
 * @property {number} weekday - column index of the weekday.
 * @property {string} location - location of the shift.
 * @property {string} shiftTime - time that which the shift takes place at.
 * @property {boolean} shiftTimeCascade - row's shiftTime was cascaded from a row above
 */
/** @typedef {import('./roster.js').Employee} Employee */
/** @typedef {Map<number, Shift>} ShiftMap */
/** @typedef {Map<number, number>} StandbyHrs */

export class ScheduleTimeSheetParser {

    employee;
    schedule;
    shiftTimes;

    conflicts= {
            "evening": "16:00-24:00",
            "unavailable": "Not Available",
        };

    warnings;


    /**
     * @param {string} scheduleStr
     * @param {Employee} employee 
     * @param {boolean} parseConflicts 
    */
    constructor(scheduleStr, employee, parseConflictsMap) {
        this.employee = employee;
        this.schedule = this.parseScheduleToGrid(scheduleStr);
        this.shiftTimes = this.getShiftTimeRows();
        this.warnings = new Warnings();
        if (parseConflictsMap) {
            this.mapPossibleConflicts();
        }
    }

    /**
     * @returns clone of the schedule grid (`string[][]`), indexed by: schedule[[row]][[day]].
     */
    get scheduleGrid() {
        return structuredClone(this.schedule);
    }

    get conflictMaps() {
        return this.warnings.conflictsMap;
    }

    /**
    * @param {string} scheduleStr 
    * @returns {string[][]} scheduleGrid
    *
    * @comment
    * Each row contains each day, indexed by: schedule[[row]][[day]].
    * Schedule[[row]][[0]] should always be the shift time column
    */
    parseScheduleToGrid(scheduleStr) {
        const scheduleGrid = this.cleanSchedule(scheduleStr)
            .split("\n")
            .map(s => s.split("\t"));

        return scheduleGrid;
    }

    /**
     * @param {string} scheduleStr 
     * @returns {string} cleanedScheduleStr
     * Cleanses schedule string of abnormal copy and pasting issues from excel
     * where cells that have multiple names within and possibly a user-entered newline
     * between the names results in extra quotations surrounding the cell value
     *
     * - replaces any newlines within quotations as a space
     * - removes quotations
     * - replaces a specific shift time name to something more standard (12:00-8:00pm)
     */
    cleanSchedule(scheduleStr) {
        const schedStrChars = [];

        let insideQuotes = false;
        for (let i = 0; i < scheduleStr.length; i++) {
            const currChar = scheduleStr[i];

            if (currChar === `"`) {
                insideQuotes = !insideQuotes; 
            }
            // replace \n within quotations with \s
            else if (currChar === `\n` && insideQuotes) {
                schedStrChars.push(` `);
            }
            // push all other chars
            else {
                schedStrChars.push(currChar);
            }
        }
        
        return schedStrChars.join("");
    }

    /**
     * Public method to parse headers values of the schedule.
     */
    getWeekdayHeader() {
        /**
         * @type {string[]} weekdayHeader
         */
        let weekdayHeader = [];

        // Get headers if user copied the schedule properly from the first cell's known value
        if (this.schedule[0][0].trim() === "US - LESLIE") {
            const BIWEEKLY = 14;
            const row = 1;

            // truncate month header by omitting the -YY year ending
            weekdayHeader.push(this.schedule[1][0].substring(0, 3));

            for (let i = 1; i <= BIWEEKLY; i++) {
                weekdayHeader.push(this.schedule[row][i]);
            }
        }
        return weekdayHeader;
    }

    /**
    * @returns {ShiftMap} shiftMapping, where the key is the day index
    */
    getShiftTimeRows() {
        let currLoc = "GENERAL"; 

        /** @type {ShiftMap} */
        const shiftMapping = new Map();
        /** @type {string} */
        let shiftTimeName;


        for (let i = 0; i < this.schedule.length; i++) {

            let shiftTimeCascade = false;
            const row = this.schedule[i];
            /**
             * Assuming iteration of schedule is row by row from top to bottom, when a certain
             * row has a specific string, the location will be modified
             */
            switch (row[0].trim()) {
                case "BDC / Breast":
                    currLoc = "BDC";
                    break;
                case "1100-7:00pm":
                    currLoc = "GENERAL";
                    break;
                case "Consumers":
                    currLoc = "OCSC / CONSUMER";
                    break;
                case "AVAILABLE":
                    currLoc = "GENERAL";
                    break;
            }

            /**
             * Modify shift time to be 24 hour clock based on specific string
             *  WARNING: any changes to shift time names must also be reflected for DEFINED_SHIFTS_SET in constants.js file.
             */
            switch (row[0].trim()) {
                case "0700-1500":
                    shiftTimeName = "07:00-15:00";
                    break;
                case "0730-1530":
                case "7:30-3:30":
                    shiftTimeName = "07:30-15:30";
                    break;
                case "0800-1600":
                case "8:00-4:00":
                    shiftTimeName = "08:00-16:00";
                    break;
                case "0830-1630":
                    shiftTimeName = "08:30-16:30";
                    break;
                case "0900-1700":
                case "9:00-5:00":
                case "9:00- 5:00":
                    shiftTimeName = "09:00-17:00";
                    break;
                case "10:00-6:00pm":
                    shiftTimeName = "10:00-18:00";
                    break;
                case "1100-7:00pm":
                    shiftTimeName = "11:00-19:00";
                    break;
                case "12:00-8:00pm":
                case `12:00-8:00pm On Call Shift`:
                    shiftTimeName = "12:00-20:00";
                    break;
                case "3:00-11:00pm":
                    shiftTimeName = "15:00-23:00";
                    break;
                case "4:00-12:00am":
                    shiftTimeName = "16:00-24:00";
                    break;
                case "On-Call":
                    shiftTimeName = row[0].trim().toUpperCase();
                    break;
                case "":
                    // stays the same if row is empty, cascading from row above it
                    shiftTimeCascade = true;
                    break;
                default:
                    shiftTimeName = row[0].trim(); //TODO: ?standardize this
            }

            shiftMapping.set( i, {
                coordinate: {
                    row: i,
                    col: 0,
                },
                names: [],
                weekday: i,
                location: currLoc,
                shiftTime: shiftTimeName,
                shiftTimeCascade: shiftTimeCascade
            });
        }
        return shiftMapping;
    }

    /**
    * @param {ShiftMap} shiftTimes 
    * @param {string} time 
    * @param {string} location
    * @returns {number | null} first row found by the provided time and location
    */
    findFirstShiftTimeRow(time, location) {
        for (const [_, shift] of this.shiftTimes.entries()) {
            if (shift.shiftTime === time && shift.location === location) {
                return shift.coordinate.row;
            }
        }
        return null;
    }

    /**
     * @param {string} st 
     * @return {number[]} index of each row with the shiftTime name
     */
    findAllShiftTimeRows(st) {
        if (!this.shiftTimes) {
            console.error("shifttimes is not defined for the operation findAllShiftTimeRows()");
            return;
        }
        const rows = [];
        this.shiftTimes.forEach((s, i) => {
            if (s.shiftTime === st) {
                rows.push(i);
            }
        });
        return rows;
    }

    /**
     * Public method for traversing schedule to find all shifts by selected name.
     * @returns {Array<Shift | null>}
     */
    findShifts() {
        if (!this.warnings.unavailableMapping) {
            console.error("warnings.unavailableMapping must be defined prior to calling findShifts().");
            return;
        }
        if (!this.warnings.eveningMapping) {
            console.error("warnings.eveningMapping must be defined prior to calling findShifts().");
            return;
        }
        if (!this.employee) {
            console.error("employee must be defined in the parser before calling findShifts().");
            return;
        }
        /** @type {Array<Shift>} */
        const shifts = [];

        for (const [rowNum, row] of this.schedule.entries()) {
            for (const [colNum, name] of row.entries()) {

                const st = this.shiftTimes.get(rowNum);
                const nameTrimmed = name.trim().toUpperCase();
                const { isMulti, names } = this.multiNameCell(nameTrimmed);

                /** @type {Shift} shiftData */
                const shiftData = {
                    coordinate: {
                        row: rowNum,
                        col: colNum
                    },
                    names: names,
                    weekday: colNum,
                    location: this.isOcscOrConsumer(st.location),
                    shiftTime: st.shiftTime,
                    shiftTimeCascade: st.shiftTimeCascade
                };

                // Add multiple names warning if cell contains >= 2 names
                if (isMulti && this.warnings.hasMultipleNames(this.employee, names)) {
                    this.warnings.addMultipleNamesEntry(shiftData);
                }
                else if (this.warnings.isEmptyCell(shiftData)) {
                    this.warnings.addEmptyCellEntry(shiftData);
                }

                if (this.matchEmployee(nameTrimmed)) {

                    // Skip over specific shift times that aren't relevant to the timesheet
                    switch (st.shiftTime) {
                        case "AVAILABLE":
                        case "Not Available":
                        case "LIEU TIME":
                            continue;
                    }

                    // Add valid shift into shifts array
                    shifts.push(shiftData);

                    // Add Unavailable warning if name showed up in unavailableMapping
                    if (this.warnings.isUnavailable(colNum, nameTrimmed)) {
                        this.warnings.addNotAvailableEntry(shiftData);
                    }
                    // Add Evening Male Tech warning if this.employee is male and another male tech is identified in the set of evening shifts for that column/day
                    if (st.shiftTime === "16:00-24:00" &&
                        this.warnings.isAnotherMaleEmployee(colNum, this.employee, this.matchEmployeeByRoster))
                    {
                        this.warnings.addEveningMaleEntry(shiftData);
                    }
                }
            }
        }
        return shifts.sort((a, b) => a.weekday - b.weekday);
    }

    /**
    * @param {string} name 
    * @returns boolean
    */
    matchEmployee(name) {
        if (!this.employee) {
            console.error("employee must be defined before calling matchEmployee().");
            return;
        }
        let finalName = name;
        // Edge case for when multiple names are in a cell
        //   - naive always match for the last listed name in the cell
        const multiNames = this.multiNameCell(finalName);

        if (multiNames.isMulti) {
            finalName = multiNames.names[multiNames.names.length-1];
        }

        switch(finalName.toUpperCase()) {
            case this.employee.first_name:
            case this.employee.str_alias:
            case this.employee.abbrev:
                return true;
            default:
                return false;
        }
    }

    /**
     * @param {string} name 
     * @returns {Employee | null}
     */
    matchEmployeeByRoster(name) {
        for (const [_, employee] of Object.entries(roster)) {
            if (employee.first_name === name ||
                employee.str_alias === name ||
                employee.abbrev === name
            ) {
                return employee;
            }
        }
        return null;
    }

    /**
    * @param {string} name 
    * @returns {{ isMulti: boolean, names: string[] }} An object containing:
    * - `isMulti`: A boolean indicating whether the name has multiple names.
    * - `names`: An array of individual words from the name
    */
    multiNameCell(name) {
        const names = name.trim().toUpperCase().split(/\s+/);

        if (names.includes("W/E") ||
            names.includes("STAT") ||
            names[names.length-1].length < 2 // for same first names and only 1st letter of last name is used as the differentiator, e.g.~ "Jennifer J" and "Jennifer W"
        ) {
            return { isMulti: false, names: [name.trim().toUpperCase()] };
        }
        return {
            isMulti: (name.trim().split(/\s+/).length >= 2),
            names: names
        };
    }

    /**
    * @param {string} location
    * @returns {string} differentiated location based on employee gender
    */
    isOcscOrConsumer(location) {
        if (!this.employee) {
            console.error("employee must be defined before calling matchEmployee().");
            return;
        }
        if (location !== "OCSC / CONSUMER") {
            return location;
        }

        if (this.employee.gender === "M") {
            return "CONSUMER";
        } else if (this.employee.gender === "F") {
            return "OCSC";
        } else {
            return location;
        }
    }

    /**
     * Public method to get a mapping of shifts by their weekdays.
     * @param {Shift[]} shifts 
     * @returns {ShiftMap} a mapping of shifts to their weekday index
     * Any duplicates found are logged in the parsers warning property.
     */
    getRegularHoursMap(shifts) {
         /**
         * @type {ShiftMap} regularHoursMap
         * @comment
         * key      - weekday numeration
         * value    - Shift object
         */
        const regularHoursMap = new Map();

        shifts.forEach(s => {
            if (s!== null && s.shiftTime !== "ON-CALL") {
                // add duplicate warning entry for any duplicate names found on same day
                if (regularHoursMap.has(s.weekday)) {
                    this.warnings.addDuplicateNamesEntry(s);
                } else {
                    regularHoursMap.set(s.weekday, s);
                }
            }
        });
        return regularHoursMap;
    }

    /**
     * Public method to get a mapping of standby shifts by their weekdays.
     * @param {Shift[]} shifts 
     * @returns {ShiftMap} a mapping of shifts to their weekday index
     */
    getStandbyShiftsMap(shifts) {
        const standbyHoursMap = new Map();

        shifts.forEach(s => {
            if (s !== null && s.shiftTime === "ON-CALL") {
                standbyHoursMap.set(s.weekday, s);
            }
        });
        return standbyHoursMap;
    }

    /**
     * Public method to get the predetermined stand by hours by the day for selected employee.
     * @param {Shift} shifts 
     * @returns {StandbyHrs} standbyHours
     */
    getStandbyHourMap(shifts) {
        
        /** @type {StandbyHrs} */
        const standbyHours = new Map();
        shifts.forEach(s => {
            if (s !== null && s.shiftTime === "ON-CALL") {
                switch (s.weekday) {
                    case 7:
                    case 14:
                        // Friday on-call begins 7pm, day ends at 12am, total 5 hours standby
                        // Need to account for if employee was also on-call since Thurs evening
                        // sum any previous standby hour entry to the day
                        if (standbyHours.has(s.weekday)) {
                            standbyHours.set(s.weekday, (standbyHours.get(s.weekday) + 5));
                        } else {
                            standbyHours.set(s.weekday, 5);
                        }
                        break;

                    case 1:
                    case 2:
                    case 8:
                    case 9:
                        // Weekends total 24 hours standby per day
                        standbyHours.set(s.weekday, 24);
                        break;
                
                    case 6:
                    case 13:
                        // Thursdays (weekday #6 and #13) need to account for:
                        // 12am to 7am, 7 hours
                        // 8pm to 12am, 4 hours  - Thursdays total 11 like other weekdays
                        standbyHours.set(s.weekday, 11);

                        // 12am to 7am (of the Friday morning), 7 hours
                        const friday = s.weekday+1;
                        if (standbyHours.has(friday)) {
                            standbyHours.set(friday, (standbyHours.get(friday) + 7));
                        } else {
                            standbyHours.set(friday, 7);
                        }
                        break;

                   default:
                        // all other weekdays that are on-call:
                        // continues from 12am to 7am, 7 hours
                        // continues from 8pm to 12am, 4 hours
                        // total 11 hours standby
                        standbyHours.set(s.weekday, 11);
                        break;
                }
            }
        });
        return standbyHours;
    }

    /**
    * @param {boolean} isFTR 
    * @param {number} shiftCount 
    * @param {number} statCount 
    */
    shiftCountCheck(isFTR, shiftCount, statCount) {
        this.warnings.shiftCountEval(isFTR, shiftCount, statCount);
    }

    /**
    * Parser calls this function at instantiation provided if parseConflictsMap is set to true:
    *   (reduces redundant calls to this function for each employee that uses a new parser)
    *   Creates a map object:
    *       key: day index
    *       value: a Set of names found in the shiftTimes/rows for that day
    *   Map is stored into its relevant field in the warning class instantiation
    */
    mapPossibleConflicts() {
        for (const [type, rowName] of Object.entries(this.conflicts)) {
            const foundRows = this.findAllShiftTimeRows(rowName);

            foundRows.forEach(row => {
                for (let day = 1; day < this.schedule[row].length; day++) {
                    const nameTrimmed = this.schedule[row][day].trim();
                    const cell = this.multiNameCell(nameTrimmed);

                    cell.names.forEach(name => {
                        if (name === "") {
                            return;
                        }
                        const employee = this.matchEmployeeByRoster(name);
                        if (employee) {
                            this.warnings.populateMapByCategory(type, day, employee.str_alias);
                        } else {
                            this.warnings.populateMapByCategory(type, day, name);
                        }
                    });
                }
            });
            // Create empty map if no employees are in the rows with possible conflicts
            this.warnings.createEmptyMappingByCategory(type);
        }
    }

    getWarningsGroup() {
        return this.warnings.warningsGroup;
    }
}
