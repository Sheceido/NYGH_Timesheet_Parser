/**
 * @typedef {import('./roster.js').Employee} Employee
 */
import { roster } from "./roster.js";
import { sTest } from "./test.js";

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
    * @comments
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
        // Edge case for when multiple names are in a cell
        // naive approach to always match for the ending name in the cell
        const multiNames = name.split(' ');
        if (multiNames.length >= 2) {
            name = multiNames[multiNames.length-1];
        }

        switch(name.toUpperCase()) {
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
    * @param {string} gender 
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
     * @returns {{map: Map<number, Shift>, errors: string[]}}
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
         * @type {string[]} errors
         */
        const errors = [];

        shifts.forEach(s => {
            if (s!== null && s.shiftTime !== "On-Call") {
                // error log for when a name appears more than once on the same day
                if (regularHoursMap.has(s.weekday)) {
                    const clashShift = regularHoursMap.get(s.weekday);
                    errors.push(`<b>Shift Overlapping Error</b>: ${clashShift.shiftTime} at ${clashShift.location} clashes with ${s.shiftTime} at ${s.location} site.`);
                } else {
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
         * key      - weekday numeration
         * value    - standby hours
         */
        const onCallStandby = new Map();
        shifts.forEach(s => {
            if (s !== null && s.shiftTime === "On-Call") {
                switch (s.weekday) {
                    case 7:
                    case 14:
                        // Friday on-call begins 7pm, till 12am, total 5 hours standby
                        onCallStandby.set(s.weekday, 5);
                        break;

                    case 1:
                    case 2:
                    case 8:
                    case 9:
                        // Weekends of biweekly schedule will total 24 hours standby
                        onCallStandby.set(s.weekday, 24);
                        break;
                
                    case 6:
                        // Thurs need to account for:
                        // 12am to 7am, 7 hours
                        // 8pm to 12am, 4 hours
                       // 12am to 7am (of the Friday, not under employee name anymore), 7 hours
                        // carry over the Friday 7 hours to a new entry
                        onCallStandby.set(s.weekday, 11);
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

/**
 * DEBUG
 */
function test() {
    const employeeName = "Justina Yoo";
    const parser = new ScheduleTimeSheetParser(sTest, employeeName);
    console.log(parser.findShifts());
}

function getEmployeeNames() {
    const selOptions = Object.keys(roster).map(name => {
        return `<option value="${name}">${name}</option>`;
    });

    console.log(selOptions);
}
