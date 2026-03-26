/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").Period} Period */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */

import { FRIDAYS, ShiftCategory, THURSDAYS, WEEKEND_DAYS } from "../data/constants.js";

export class ShiftQueryUtils {
    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    static findEmployeeShifts(employee, shiftList) {
        return shiftList.filter(s => {
            return (
                this.isEmployeeFoundInShift(employee, s) &&
                s.category != ShiftCategory.ONCALL &&
                s.category != ShiftCategory.NOTAVAILABLE &&
                s.category != ShiftCategory.STATUS
            );
        });
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    static findOnCallShifts(employee, shiftList) {
        return shiftList.filter(s => {
            return (
                this.isEmployeeFoundInShift(employee, s) &&
                s.category === ShiftCategory.ONCALL
            );
        });
    }

    /**
     * @param {Shift} shift 
     * @return {Period[]}
     */
    static getShiftStandbyHours(shift) {
        /** @type {Period[]} periods */
        const periods = [];
        const day = shift.weekday;
        const isWeekend = this.dayIsWeekend(day);
        const isFriday = FRIDAYS.includes(day);
        const isThursday = THURSDAYS.includes(day);

        if (isWeekend) {
            periods.push({ weekday: day, hours: 24 });      // Standard weekend
        }
        else if (isThursday) {
            periods.push({ weekday: day, hours: 11 });      // Thu 12am-7am + 8pm-12am
            periods.push({ weekday: day + 1, hours: 7 });   // Fri 12am-7am carry over into Friday
        }
        else if (isFriday) {
            periods.push({ weekday: day, hours: 5 });       // Fri 7pm-12am
        }
        else {
            periods.push({ weekday: day, hours: 11 });      // Standard weekday
        }

        return periods;
    }

    /**
     * @param {number} biweeklyDay
     * @returns {boolean}
     */
    static dayIsWeekend(biweeklyDay) {
        return WEEKEND_DAYS.includes(biweeklyDay);
    }

    /**
     * @param {Employee} employee 
     * @param {Shift} s 
     * @returns {boolean}
     */
    static isEmployeeFoundInShift(employee, s) {
        if (!s.employee) return false;

        return (
            s.employee.first_name === employee.first_name &&
            s.employee.str_alias === employee.str_alias &&
            s.employee.abbrev === employee.abbrev
        );
    }

    /**
    * @param {string[]} names
    * @param {Employee | null} employee 
    * @returns {boolean}
    */
    static nameIsEmployee(names, employee) {
        if (names.length < 1 || employee === null) {
            return false;
        }
        const name = names[names.length - 1];
        return (
            name === employee.first_name ||
            name === employee.str_alias ||
            name === employee.abbrev
        );
    }

    /**
    * @param {Shift} s
    * @returns {boolean}
    */
    static isWorkableShift(s) {
        return (
            s.category != ShiftCategory.ONCALL &&
            s.category != ShiftCategory.NOTAVAILABLE &&
            s.category != ShiftCategory.STATUS
        );
    }
}
