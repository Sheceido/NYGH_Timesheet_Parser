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
     * @param {Shift[]} allShifts
     * @param {Roster} roster
     * @returns {{shiftMap: EmployeeShiftMap, metrics: EmployeeMetrics[]}}
     */
    calculateScheduleMetrics(allShifts, roster) {
        /** @type {EmployeeMetrics[]} employeeMetrics */
        const employeeMetrics = [];

        const employeeShiftMap = ShiftQueryUtils.getEmployeeShiftMap(roster, allShifts);

        employeeShiftMap.forEach((shiftList, employee, _) => {
            employeeMetrics.push({
                employee: employee,
                scheduledShifts: ShiftQueryUtils.getScheduledShifts(shiftList),
                standbyHrs: ShiftQueryUtils.getEmployeeStandbyHours(shiftList),
                allAssociatedShifts: shiftList,
            });
        });

        return { shiftMap: employeeShiftMap, metrics: employeeMetrics };
    }
}
