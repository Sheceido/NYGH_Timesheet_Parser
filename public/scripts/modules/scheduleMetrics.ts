import type { EmployeeShiftMap, EmployeeMetrics } from "../types.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

export class ScheduleMetricsAuditor {
    /**
     * Creates an array of employee metrics from a shift map.
     * For each employee, extracts scheduled shifts, standby hours, and all associated shifts.
     *
     * @param shiftMap - Map of employees to their shift lists.
     * @returns Array of employee metrics objects.
     */
    calculateScheduleMetrics(shiftMap: EmployeeShiftMap): EmployeeMetrics[] {
        const employeeMetrics: EmployeeMetrics[] = [];

        shiftMap.forEach((shiftList, employee) => {
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
