/**
 * @typedef {import('./roster.js').Employee} Employee
 */
import { roster } from "./roster.js";

/**
 * @typedef {Object} Shift 
 * @property {number} weekday - column index of the weekday.
 * @property {string} location - location of the shift.
 * @property {string} shiftTime - time that which the shift takes place at.
 */

export class ScheduleTimeSheetParser {

    employee;
    schedule;
    shiftTimes;

    /**
     * @param {string} scheduleStr
     * @param {string} employee 
    */
    constructor(scheduleStr, employeeName) {
        this.employee = roster[employeeName];
        this.schedule = this.parseScheduleToGrid(scheduleStr);
        this.shiftTimes = this.getShiftTimeRows();
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
        const scheduleGrid = scheduleStr
            .replace(`"12:00-8:00pm\nOn Call Shift"`, `12:00-8:00pm`)
            .split("\n")
            .map(s => s.split("\t"));

        return scheduleGrid;
    }

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
    * @typedef {Map<number, { shiftTime: string, location: string }>} ShiftTimes
    */

    /**
    * @returns {Map<number, {weekday: number, location: string, shiftTime: string}>} rowToShiftTime
    */
    getShiftTimeRows() {
        let currLoc = "GENERAL"; 

        /**
         * @type {ShiftTimes}
         */
        const rowToShiftTime = new Map();

        /**
         * @type {string}
         */
        let shiftTimeName;

        for (let i = 0; i < this.schedule.length; i++) {
            const row = this.schedule[i];

            /**
             * Assuming iteration of schedule is row by row from top to bottom, when a certain
             * row has a specific string, the location will be modified
             */
            switch (row[0]) {
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
             * Cascade shiftTime name from row above if current shift time is an empty value
             */
            if (row[0] !== '') {
                shiftTimeName = row[0];
            }

            rowToShiftTime.set( i, {location: currLoc, shiftTime: shiftTimeName });
        }
        return rowToShiftTime;
    }
    


    /**
     * @returns {Array<Shift | null>}
     */
    findShifts() {
        /**
         * @type {Array<Shift>}
         */
        const shifts = [];

        for (const [rowNum, row] of this.schedule.entries()) {

            for (const [colNum, name] of row.entries()) {

                if (this.matchEmployee(name)) {

                    const st = this.shiftTimes.get(rowNum)

                    // Skip over specific shift times that aren't relevant to the timesheet
                    switch (st.shiftTime) {
                        case "AVAILABLE":
                        case "Not Available":
                        case "LIEU TIME":
                            continue;
                    }

                    // Add valid shift into shifts array
                    shifts.push({
                        weekday: colNum,
                        location: this.isOcscOrConsumer(st.location),
                        shiftTime: st.shiftTime,
                    });
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
        let finalName = name.trim();
        // Edge case for when multiple names are in a cell
        //   - naive always match for the last listed name in the cell
        const multiNames = name.trim().split(/\s+/);
        if (multiNames.length >= 2) {
            finalName = multiNames[multiNames.length-1];
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
        }
    }

    /**
     * @param {Shift} shifts 
     * @returns {{map: Map<number, Shift>, errors: Map<number, string[]>}}
     * @comment
     * Returns both a mapping of shifts to their weekday index, and a mapping of errors to their weekday index
     */
    getRegularHoursMap(shifts) {
         /**
         * @type {Map<number, Shift>} regularHoursMap
         * @comment
         * key      - weekday numeration
         * value    - Shift object
         */
        const regularHoursMap = new Map();

        /**
         * @type {Map<number, string[]>} errors
         * @comment
         * key      - weekday index 
         * value    - array of innerHTML strings
         */
        const errors = new Map();

        shifts.forEach(s => {

            if (s!== null && s.shiftTime !== "On-Call") {
                // error log for when a name appears more than once on the same day
                if (regularHoursMap.has(s.weekday)) {

                    const errorMsg = `<div class="errorsBox"><p>${s.shiftTime}</p><p style="font-size: 10px;">${s.location}</p></div>`;

                    if (errors.has(s.weekday)) {
                        errors.get(s.weekday).push(errorMsg);
                    } else {
                        errors.set(s.weekday, [errorMsg]);
                    }
                }
                else {
                    regularHoursMap.set(s.weekday, s);
                }
            }
        });
        return {map: regularHoursMap, errors: errors};
    }

    /**
     * @param {Shift} shifts 
     */
    getStandbyHourMap(shifts) {
        /**
         * @type {Map<number, number>} onCallStandby
         * @comment
         * key      - weekday index 
         * value    - standby hours
         */
        const onCallStandby = new Map();
        shifts.forEach(s => {
            if (s !== null && s.shiftTime === "On-Call") {
                switch (s.weekday) {
                    case 7:
                    case 14:
                        // Friday on-call begins 7pm, day ends at 12am, total 5 hours standby
                        // Need to account for if employee was also on-call since Thurs evening
                        // sum any previous standby hour entry to the day
                        if (onCallStandby.has(s.weekday)) {
                            onCallStandby.set(s.weekday, (onCallStandby.get(s.weekday) + 5));
                        } else {
                            onCallStandby.set(s.weekday, 5);
                        }
                        break;

                    case 1:
                    case 2:
                    case 8:
                    case 9:
                        // Weekends total 24 hours standby per day
                        onCallStandby.set(s.weekday, 24);
                        break;
                
                    case 6:
                    case 13:
                        // Thursdays (weekday #6 and #13) need to account for:
                        // 12am to 7am, 7 hours
                        // 8pm to 12am, 4 hours  - Thursdays total 11 like other weekdays
                        onCallStandby.set(s.weekday, 11);

                        // 12am to 7am (of the Friday morning), 7 hours
                        const friday = s.weekday+1;
                        if (onCallStandby.has(friday)) {
                            onCallStandby.set(friday, (onCallStandby.get(friday) + 7));
                        } else {
                            onCallStandby.set(friday, 7);
                        }
                        break;

                   default:
                        // all other weekdays that are on-call:
                        // continues from 12am to 7am, 7 hours
                        // continues from 8pm to 12am, 4 hours
                        // total 11 hours standby
                        onCallStandby.set(s.weekday, 11);
                        break;
                }
            }
        });
        return onCallStandby;
    }
}
