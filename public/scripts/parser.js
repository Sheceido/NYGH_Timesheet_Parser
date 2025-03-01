import { Warnings } from './warnings.js';
import { roster } from './roster.js';

/**
 * @typedef {Object} Shift 
 * @property {{row: number, col: number}} coordinate - [row][col] identifier
 * @property {number} weekday - column index of the weekday.
 * @property {string} location - location of the shift.
 * @property {string} shiftTime - time that which the shift takes place at.
 */
/** @typedef {import('./roster.js').Employee} Employee */
/** @typedef {Map<number, Shift>} ShiftMap */

export class ScheduleTimeSheetParser {

    employee;
    schedule;
    shiftTimes;
    warnings;

    /**
     * @param {string} scheduleStr
     * @param {Employee} employee 
    */
    constructor(scheduleStr, employee) {
        this.employee = employee;
        this.schedule = this.parseScheduleToGrid(scheduleStr);
        this.shiftTimes = this.getShiftTimeRows();
        this.warnings = new Warnings();
        this.findUnavailables();
    }

    /**
     * @returns clone of the schedule grid (`string[][]`), indexed by: schedule[[row]][[day]].
     */
    getScheduleGrid() {
        return structuredClone(this.schedule);
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
                    break;
                default:
                    shiftTimeName = row[0].trim();
            }

            shiftMapping.set( i, {
                coordinate: {
                    row: i,
                    col: 0,
                },
                weekday: i,
                location: currLoc,
                shiftTime: shiftTimeName
            });
        }
        return shiftMapping;
    }
    
    /**
     * @param {string} st 
     * @return {number[]} index of each row with the shiftTime name
     */
    findAllShiftTimeRows(st) {
        if (!this.shiftTimes) {
            console.error("shifttimes is not defined for the operation findAllShiftTimeRows()");
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
        if (!this.warnings._unavailableMapping) {
            console.error("warnings.unavailableMapping must be defined prior to calling findShifts().");
            return;
        }
        /** @type {Array<Shift>} */
        const shifts = [];

        for (const [rowNum, row] of this.schedule.entries()) {
            for (const [colNum, name] of row.entries()) {

                const st = this.shiftTimes.get(rowNum);
                const nameTrimmed = name.trim().toUpperCase();

                if (this.matchEmployee(nameTrimmed)) {

                    // Skip over specific shift times that aren't relevant to the timesheet
                    switch (st.shiftTime) {
                        case "AVAILABLE":
                        case "Not Available":
                        case "LIEU TIME":
                            continue;
                    }

                    /** @type {Shift} shiftData */
                    const shiftData = {
                        coordinate: {
                            row: rowNum,
                            col: colNum
                        },
                        weekday: colNum,
                        location: this.isOcscOrConsumer(st.location),
                        shiftTime: st.shiftTime,
                    };

                    // Add valid shift into shifts array
                    shifts.push(shiftData);

                    // Add Unavailable warning if name showeed up in unavailableMapping
                    if (this.warnings.isUnavailable(colNum, nameTrimmed)) {
                        this.warnings.addNotAvailableEntry(shiftData);
                    }
                }

                // Add multiple names warning if cell contains >= 2 names
                const { isMulti, names } = this.multiNameCell(nameTrimmed);
                if (isMulti && this.warnings.hasMultipleNames(this.employee, names)) {
                    /** @type {Shift} shift */
                    const shift = {
                        coordinate: {
                            row: rowNum,
                            col: colNum
                        },
                        weekday: colNum,
                        location: this.isOcscOrConsumer(st.location),
                        shiftTime: st.shiftTime
                    };
                    this.warnings.addMultipleNamesEntry(shift, names);
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
     * @param {string} st 
     */
    getRowByShiftTime(st) {
        const foundRows = [];

        for (const [row, shift] of this.shiftTimes.entries()) {
            if (shift.shiftTime.toUpperCase() === st.toUpperCase()) {
                foundRows.push(row);
            }
        }
        return foundRows;
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
            names[names.length-1].length < 2 // for same first names and only 1st letter of last name is used as the differentiator
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
     * Public method to get the predetermined stand by hours by the day for selected employee.
     * @param {Shift} shifts 
     * @returns {Map<number, number>} standbyHours
     */
    getStandbyHourMap(shifts) {
        /**
         * @type {Map<number, number>} standbyHours
         * @comment
         * key      - weekday index 
         * value    - standby hours
         */
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
     * Identifying the evening rows in the schedule,
     * iterate through these rows and push entries to a Map of dayIndex to Sets of names
     * for each male name found; then finally add warning if any sets have size > 1
     */
    checkEveningShiftGenders() {
        if (!this.schedule || !this.shiftTimes) {
            console.error("parser's schedule and shift time must be defined before calling this checkEveningShiftGenders().");
            return;
        }
        const eveningRows = this.getRowByShiftTime("16:00-24:00");
        /** @type {Map<number, Set<string>>} */
        const eveningHasMaleTech = new Map();

        for (let i = 0; i < eveningRows.length; i++) {
            let currRow = eveningRows[i];

            for (let day = 0; day < this.schedule[currRow].length; day++) {

                let name = this.schedule[currRow][day].trim().toUpperCase();

                const {isMulti, names} = this.multiNameCell(name);
                if (isMulti) {
                    // use last listed name if multiple names in cell
                    name = names[names.length-1].trim();
                }

                const employee = this.matchEmployeeByRoster(name);
                if (!employee) {
                    continue;
                }

                if (employee.gender === "M") {
                    if (!eveningHasMaleTech.has(day)) {
                        eveningHasMaleTech.set(
                            day,
                            new Set([employee.str_alias]),
                        );
                    } else {
                        eveningHasMaleTech
                            .get(day)
                            .add(employee.str_alias);
                    }
                }
            }
        }

        for (const [day, set] of eveningHasMaleTech.entries()) {
            if (set.size > 1) {
                this.warnings.addEveningMaleTechEntry(day, Array.from(set));
            }
        }
    }

    findUnavailables() {
        const unavailableRows = this.findAllShiftTimeRows("Not Available");

        unavailableRows.forEach(row => {
            for (let day = 1; day < this.schedule[row].length; day++) {
                const nameTrimmed = this.schedule[row][day].trim();
                const cell = this.multiNameCell(nameTrimmed);
                
                cell.names.forEach(name => {
                    if (name !== "") {
                        const employee = this.matchEmployeeByRoster(name);
                        if (employee) {
                            this.warnings.populateUnavailableMap(day, employee.str_alias);
                        } else {
                            this.warnings.populateUnavailableMap(day, name);
                        }
                    }
                });
            }
        });

        // Create empty map if no unavailable employees were noted.
        if (!this.warnings.unavailableMapping) {
            this.warnings.unavailableMapping = new Map();
        }
    }

    getWarningsGroup() {
        return this.warnings.warningsGroup;
    }
}
