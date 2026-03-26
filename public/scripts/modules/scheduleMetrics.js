/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").Roster} Roster */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").StandbyHoursMap} StandbyHoursMap */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */
/** @typedef {import("../types.d.ts").EmployeeMetrics} EmployeeMetrics */

import { ShiftCategory } from "../data/constants.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

//TODO: ?reduce O(n^2) shift finding with Map and allShift iteration for O(n)
export class ScheduleMetricsAuditor {

    /**
     * @param {Shift[]} allShifts
     * @param {Roster} roster
     * @returns {EmployeeMetrics[]}
     */
    calculateScheduleMetrics(allShifts, roster) {
        /** @type {EmployeeMetrics[]} employeeMetrics */
        const employeeMetrics = [];

        for (const [_, employee] of Object.entries(roster)) {
            const foundShifts = this.getEmployeeScheduledShifts(employee, allShifts);
            const foundStandbyHrs = this.getEmployeeStandbyHours(employee, allShifts);

            employeeMetrics.push({
                employee: employee,
                scheduledShifts: foundShifts,
                standbyHrs: foundStandbyHrs,
            });
        }

        return employeeMetrics;
    }
    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    getEmployeeScheduledShifts(employee, shiftList) {
        return ShiftQueryUtils.findEmployeeShifts(employee, shiftList);
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {StandbyHoursMap | null}
     */
    getEmployeeStandbyHours(employee, shiftList) {
        const onCallShifts = ShiftQueryUtils.findOnCallShifts(employee, shiftList);

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
}
