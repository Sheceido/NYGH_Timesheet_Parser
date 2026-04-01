/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").Roster} Roster */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").StandbyHoursMap} StandbyHoursMap */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */
/** @typedef {import("../types.d.ts").EmployeeShiftMap} EmployeeShiftMap */
/** @typedef {import("../types.d.ts").EmployeeMetrics} EmployeeMetrics */

import { ShiftCategory } from "../data/constants.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

export class ScheduleMetricsAuditor {

    /**
     * @param {EmployeeShiftMap} shiftMap
     * @returns EmployeeMetrics[]
     */
    calculateScheduleMetrics(shiftMap) {
        /** @type {EmployeeMetrics[]} employeeMetrics */
        const employeeMetrics = [];

        shiftMap.forEach((shiftList, employee, _) => {
            employeeMetrics.push({
                employee: employee,
                scheduledShifts: ShiftQueryUtils.getScheduledShifts(shiftList),
                standbyHrs: ShiftQueryUtils.getEmployeeStandbyHours(shiftList),
                allAssociatedShifts: shiftList,
            });
        });

        return employeeMetrics;
    }
}
