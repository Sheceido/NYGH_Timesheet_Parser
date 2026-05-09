import type { Employee, Shift, Roster, Period, StandbyHoursMap, EmployeeShiftMap } from "../types.js";
import { FRIDAYS, RowSemanticKind, ShiftCategory, THURSDAYS, WEEKEND_DAYS } from "../data/constants.js";

export class ShiftQueryUtils {
    /**
     * Sort shifts into a list associated with each employee in roster
     */
    static getEmployeeShiftMap(roster: Roster, shifts: Shift[]): EmployeeShiftMap {
        const employeeShiftMap = new Map<Employee, Shift[]>();
        for (const [, employee] of Object.entries(roster)) {
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
            const shiftList = employeeShiftMap.get(shift.employee)!;
            shiftList.push(shift);
        });

        return employeeShiftMap;
    }

    /**
     * Filters employee's shift list to just shifts that aren't on‑call or a status row
     */
    static getScheduledShifts(shiftList: Shift[]): Shift[] {
        return shiftList.filter(s => this.isWorkableShift(s));
    }

    /**
     * Filters employee shifts to just on‑call, then finds the associated standby hours
     * for each day/column to which they are on standby, or null if they are not on‑call
     */
    static getEmployeeStandbyHours(shiftList: Shift[]): StandbyHoursMap | null {
        const onCallShifts = ShiftQueryUtils.findOnCallShifts(shiftList);

        if (onCallShifts.length < 1) {
            return null;
        }

        const standbyHoursMap: StandbyHoursMap = new Map();

        onCallShifts.forEach(s => {
            const periods = ShiftQueryUtils.getShiftStandbyHours(s);

            periods.forEach(p => {
                if (standbyHoursMap.has(p.weekday)) {
                    standbyHoursMap.set(p.weekday, standbyHoursMap.get(p.weekday)! + p.hours);
                } else {
                    standbyHoursMap.set(p.weekday, p.hours);
                }
            });
        });

        return standbyHoursMap;
    }

    static findOnCallShifts(shiftList: Shift[]): Shift[] {
        return shiftList.filter(s => s.category === ShiftCategory.ONCALL);
    }

    /**
     * Periods can have length >1 for the edge case on a Thursday
     * when we must take into account standby hours through to Friday morning.
     */
    static getShiftStandbyHours(shift: Shift): Period[] {
        const periods: Period[] = [];
        const day = shift.weekday;
        const isWeekend = this.dayIsWeekend(day);
        const isFriday = FRIDAYS.includes(day);
        const isThursday = THURSDAYS.includes(day);

        if (isWeekend) {
            periods.push({ weekday: day, hours: 24 });      // Standard weekend
        }
        else if (isThursday) {
            periods.push({ weekday: day, hours: 11 });      // Thu 12am‑7am + 8pm‑12am
            periods.push({ weekday: day + 1, hours: 7 });   // Fri 12am‑7am carry over into Friday
        }
        else if (isFriday) {
            periods.push({ weekday: day, hours: 5 });       // Fri 7pm‑12am
        }
        else {
            periods.push({ weekday: day, hours: 11 });      // Standard weekday
        }

        return periods;
    }

    static dayIsWeekend(biweeklyDay: number): boolean {
        return WEEKEND_DAYS.includes(biweeklyDay);
    }

    static isWorkableShift(s: Shift): boolean {
        return (
            s.category !== ShiftCategory.ONCALL &&
            s.category !== ShiftCategory.NOTAVAILABLE &&
            s.category !== ShiftCategory.STATUS
        );
    }

    static getUniqueEmployees(shiftList: Shift[]): Employee[] {
        const employeeSet = new Set<Employee>();
        shiftList.forEach(s => {
            if (s.employee) employeeSet.add(s.employee);
        });
        return [...employeeSet];
    }

    static getShiftNameTokens(s: Shift): string[] {
        const tokens: string[] = [];

        if (s.names.length > 0) {
            tokens.push(s.names[s.names.length - 1]);
        }
        if (s.employee !== null) {
            tokens.push(s.employee.first_name, s.employee.str_alias, s.employee.abbrev);
        }
        return tokens;
    }

    static getFTRWeekendsAndWeekdayFlags(ftrShiftMap: EmployeeShiftMap, shiftList: Shift[]): { weekendShifts: Shift[]; workedWeekendFlags: Shift[] } {
        const ftrWeekendShifts: Shift[] = [];
        const workedWeekendFlags: Shift[] = [];

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

    static isWeekendWorkableShift(s: Shift): boolean {
        return (
            s.category !== ShiftCategory.ONCALL &&
            (
                s.rowKind === RowSemanticKind.SHIFT ||
                s.rowKind === RowSemanticKind.INHERITED_SHIFT
            )
        );
    }
    // TODO: validation audit for when FTR staff on weekend dont have a "<name> W/E" marked in the vacation section.
}
