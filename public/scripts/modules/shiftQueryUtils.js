/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").Roster} Roster */
/** @typedef {import("../types.d.ts").Period} Period */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */
/** @typedef {import("../types.d.ts").StandbyHoursMap} StandbyHoursMap */
/** @typedef {import("../types.d.ts").EmployeeShiftMap} EmployeeShiftMap */

import { FRIDAYS, RowSemanticKind, ShiftCategory, THURSDAYS, WEEKEND_DAYS } from "../data/constants.js";

export class ShiftQueryUtils {
    /**
     * @param {Roster} roster 
     * @param {Shift[]} shifts 
     * @returns {EmployeeShiftMap}
     *
     * Sort shifts into a list associated with each employee in roster
     */
    static getEmployeeShiftMap(roster, shifts) {
        const employeeShiftMap = new Map();
        for (const [_, employee] of Object.entries(roster)) {
            employeeShiftMap.set(employee, []);
        }

        shifts.forEach(shift => {
            if (!shift.employee) {
                return;
            }
            if (!employeeShiftMap.has(shift.employee)) {
                // console.warn(`Employee in shift ${shift.id} "${shift.employee.str_alias}" not defined in roster list: `, shift);
                return;
            }
            let shiftList = employeeShiftMap.get(shift.employee);
            shiftList.push(shift);
        });

        return employeeShiftMap;
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     * Filters employee's shift list to just shifts that isn't an on-call or a status row
     */
    static getScheduledShifts(shiftList) {
        return shiftList.filter(s => this.isWorkableShift(s));
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {StandbyHoursMap | null}
     * Filters employee shifts to just on-call, then find the associated standby hours
     * for each day/column to which they are on standby, or null if they are not on-call
     */
    static getEmployeeStandbyHours(shiftList) {
        const onCallShifts = ShiftQueryUtils.findOnCallShifts(shiftList);

        if (onCallShifts.length < 1) {
            return null;
        }

        /** @type {StandbyHoursMap} standbyHoursMap */
        const standbyHoursMap = new Map();

        onCallShifts.forEach(s => {
            const periods = ShiftQueryUtils.getShiftStandbyHours(s);

            periods.forEach(p => {
                if (standbyHoursMap.has(p.weekday)) {
                    standbyHoursMap.set(p.weekday, standbyHoursMap.get(p.weekday) + p.hours);
                } else {
                    standbyHoursMap.set(p.weekday, p.hours);
                }
            });
        });

        return standbyHoursMap;
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    static findOnCallShifts(shiftList) {
        return shiftList.filter(s => s.category === ShiftCategory.ONCALL);
    }

    /**
     * @param {Shift} shift 
     * @return {Period[]}
     * Periods can have >1 in length, for the edge case on a Thursday
     * when we must take into account standby hours through to Friday morning.
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
    * @param {Shift} s
    * @returns {boolean}
    */
    static isWorkableShift(s) {
        return (
            s.category !== ShiftCategory.ONCALL &&
            s.category !== ShiftCategory.NOTAVAILABLE &&
            s.category !== ShiftCategory.STATUS
        );
    }

    /**
    * @param {Shift[]} shiftList 
    * @returns {Employee[]}
    */
    static getUniqueEmployees(shiftList) {
        const employeeSet = new Set();
        shiftList.forEach(s => employeeSet.add(s.employee));
        return [...employeeSet];
    }

    /**
     * @param {Shift} s 
     * @returns {string[]}
     */
    static getShiftNameTokens(s) {
        const tokens = [];

        if (s.names.length > 0) {
            tokens.push(s.names[s.names.length - 1]);
        }
        if (s.employee !== null) {
            tokens.push(s.employee.first_name, s.employee.str_alias, s.employee.abbrev);
        }
        return tokens;
    }

    /**
    * @param {EmployeeShiftMap} ftrShiftMap 
    * @param {Shift[]} shiftList 
    * @returns {{weekendShifts: Shift[], workedWeekendFlags: Shift[]}}
    */
    static getFTRWeekendsAndWeekdayFlags(ftrShiftMap, shiftList) {
        const ftrWeekendShifts = [];
        const workedWeekendFlags = [];

        shiftList.forEach(s => {
            if (this.dayIsWeekend(s.weekday)) {
                if (
                    s.employee &&
                    this.isWeekendWorkableShift(s) &&
                    ftrShiftMap.has(s.employee)
                ) {
                    ftrWeekendShifts.push(s);
                }
            } else {
                if (s.category === ShiftCategory.VACATION &&
                    s.names.some(name => name.includes("W/E"))
                ) {
                    workedWeekendFlags.push(s);
                }
            }
        });

        return { weekendShifts: ftrWeekendShifts, workedWeekendFlags: workedWeekendFlags };
    }

    /**
    * @param {Shift} s 
    * @returns {boolean}
    */
    static isWeekendWorkableShift(s) {
        return (
            s.category !== ShiftCategory.ONCALL &&
            (
                s.rowKind === RowSemanticKind.SHIFT ||
                s.rowKind === RowSemanticKind.INHERITED_SHIFT
            )
        )
    }
    //TODO: validation audit for when FTR staff on weekend dont have a "<name> W/E" marked
    // in the vacation section.
}
