import type {
    Shift,
    AuditCode,
    AuditEntry,
    Employee,
    EmployeeShiftMap,
} from "../types.js";
import { FTR_HRS, WEEKDAY_SHIFT_TIMES, WEEKEND_DAYS, WEEKEND_LOCATIONS, WEEKEND_SHIFT_TIMES } from "../data/constants.js";
import {
    RowSemanticKind as RowSemanticKindValue,
    ShiftCategory as ShiftCategoryValue,
    AuditCode as AuditCodeValue
} from "../data/constants.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

export class ScheduleValidationAuditor {
    /**
     * Performs a complete audit of the schedule by running all validation checks.
     * Aggregates audit entries from individual checks (empty shifts, male conflicts,
     * multi‑name shifts, not‑available conflicts, on‑call shifts, weekend flag mismatches,
     * duplicate shifts, and FTR shift counts).
     *
     * @param allShifts - All parsed shifts from the schedule.
     * @param ftrShiftMap - Map of FTR employees to their shifts.
     * @param casShiftMap - Map of casual employees to their shifts.
     * @param holidayCount - Number of holidays (subtracted from expected FTR shifts).
     * @returns Array of audit entries describing all found issues.
     */
    auditSchedule(
        allShifts: Shift[],
        ftrShiftMap: EmployeeShiftMap,
        casShiftMap: EmployeeShiftMap,
        holidayCount: number
    ): AuditEntry[] {
        const auditEntries: AuditEntry[] = [];

        this._addAuditEntry(auditEntries, this.checkEmptyShifts(allShifts));
        this._addAuditEntry(auditEntries, this.checkMaleConflicts(allShifts));
        this._addAuditEntry(auditEntries, this.checkMultiNameShifts(allShifts));
        this._addAuditEntry(auditEntries, this.checkNotAvailableConflicts(allShifts));
        this._addAuditEntry(auditEntries, this.checkOnCallShifts(allShifts));

        const missingFlags = this.checkWeekendFlagsMatchWeekendShifts(ftrShiftMap, allShifts);
        if (missingFlags.length > 0) {
            missingFlags.forEach(a => this._addAuditEntry(auditEntries, a));
        }

        // Check duplicate shifts and shift count for FTR employees
        ftrShiftMap.forEach((shiftList, employee) => {
            const dupAuditEntries = this.checkDuplicateShifts(employee, shiftList);
            if (dupAuditEntries) {
                dupAuditEntries.forEach(d => this._addAuditEntry(auditEntries, d));
            }

            const ftrShiftCountAuditEntries = this.checkFTREmployeeScheduledShifts(
                employee,
                ShiftQueryUtils.getScheduledShifts(shiftList),
                holidayCount,
                dupAuditEntries,
            );
            this._addAuditEntry(auditEntries, ftrShiftCountAuditEntries);
        });

        // Check duplicate shifts for casual employees
        casShiftMap.forEach((shiftList, employee) => {
            const dupAuditEntries = this.checkDuplicateShifts(employee, shiftList);
            if (dupAuditEntries) {
                dupAuditEntries.forEach(d => this._addAuditEntry(auditEntries, d));
            }
        });

        return auditEntries;
    }

    /**
     * Helper to push a non‑null audit entry into an array.
     *
     * @param array - Target audit array.
     * @param entry - Audit entry (nullable).
     */
    private _addAuditEntry(array: AuditEntry[], entry: AuditEntry | null): void {
        if (entry !== null) array.push(entry);
    }

    /**
     * Checks whether a full‑time employee (FTR) is over‑ or under‑scheduled.
     * Compares actual scheduled shifts against the expected number (FTR_HRS minus holidays).
     * Also accounts for duplicate shifts when calculating effective shift count.
     *
     * @param employee - The FTR employee to check.
     * @param employeeShiftList - List of workable shifts (excludes on‑call/status).
     * @param holidayCount - Number of holidays that reduce the expected shift count.
     * @param dupAudits - Duplicate audit entries for the same employee (if any).
     * @returns An audit entry for over‑ or under‑scheduling, or null if correctly scheduled.
     */
    checkFTREmployeeScheduledShifts(
        employee: Employee,
        employeeShiftList: Shift[],
        holidayCount: number,
        dupAudits: AuditEntry[] | null
    ): AuditEntry | null {
        const expectedCount = FTR_HRS - holidayCount;

        if (employeeShiftList.length === expectedCount && dupAudits === null) {
            return null;
        }

        let duplicateCount: number;
        let issueCode: AuditCode;
        let issueLabel: string;

        if (dupAudits === null) {
            duplicateCount = 0;
        } else {
            duplicateCount = dupAudits.reduce((dupCount, audit) => dupCount + (audit.shifts.length - 1), 0);
        }

        const effectiveShiftCount = employeeShiftList.length;

        if (effectiveShiftCount >= expectedCount) {
            issueCode = AuditCodeValue.FTR_OVER_SCHEDULED;
            issueLabel = "Overscheduled";
        } else {
            issueCode = AuditCodeValue.FTR_UNDER_SCHEDULED;
            issueLabel = "Underscheduled";
        }

        return {
            code: issueCode,
            severity: "ERROR",
            employees: [employee],
            shifts: employeeShiftList,
            message: `${issueLabel}: ${employee.str_alias} has ${employeeShiftList.length} shifts with +${duplicateCount} duplicate shift(s), expectedCount ${expectedCount}.`,
            expectedShiftCount: expectedCount,
            duplicateCount: duplicateCount,
        };
    }

    /**
     * Identifies shifts that contain more than one employee name in the cell.
     * This can cause ambiguity about who is actually scheduled.
     *
     * @param shiftList - List of shifts to scan.
     * @returns An audit entry for multi‑name shifts, or null if none found.
     */
    checkMultiNameShifts(shiftList: Shift[]): AuditEntry | null {
        const foundShifts = this.findMultiNameShifts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCodeValue.MULTIPLE_NAMES,
            severity: "INFO",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `Multiple names found in shift cells resulting in ambiguous reasoning for whom is scheduled.`,
        };
    }

    /**
     * Detects conflicts where more than one male employee is scheduled on a night shift
     * on the same weekday. This is treated as a violation of scheduling rules.
     *
     * @param shiftList - List of shifts to check.
     * @returns An audit entry for male conflicts, or null if none exist.
     */
    checkMaleConflicts(shiftList: Shift[]): AuditEntry | null {
        const foundShifts = this.findMaleEmployeeConflicts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCodeValue.MALE_CONFLICT,
            severity: "WARNING",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: "More than one male employee found scheduled for night shift.",
        };
    }

    /**
     * Checks if an employee appears more than once in workable shifts on the same weekday.
     * Returns an array of audit entries, one for each duplicated day.
     *
     * @param employee - The employee whose shifts are examined.
     * @param shiftList - All shifts for that employee.
     * @returns Array of duplicate audit entries, or null if no duplicates.
     */
    checkDuplicateShifts(employee: Employee, shiftList: Shift[]): AuditEntry[] | null {
        const audits = this.findDuplicateEmployeeByDay(employee, shiftList);
        if (audits.length < 1) return null;
        return audits;
    }

    /**
     * Finds shifts that conflict with a "NOT AVAILABLE" entry on the same weekday.
     * Compares name tokens (first name, alias, abbreviation) from shifts with tokens
     * found in NOT AVAILABLE cells.
     *
     * @param shiftList - All shifts to inspect.
     * @returns An audit entry for availability conflicts, or null if none.
     */
    checkNotAvailableConflicts(shiftList: Shift[]): AuditEntry | null {
        const foundShifts = this.findNotAvailableConflicts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCodeValue.NOT_AVAILABLE,
            severity: "ERROR",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `${foundShifts.length} shift(s) found to be in conflict with previously scheduled as "Not Available".`,
        };
    }

    /**
     * Identifies shift cells that are completely empty (no employee names)
     * but are expected to be filled based on shift time, location, and row kind.
     * Excludes status rows, vacations, inherited shifts, and irrelevant time/location combinations.
     *
     * @param shiftList - List of all shifts.
     * @returns An audit entry listing empty shifts, or null if none.
     */
    checkEmptyShifts(shiftList: Shift[]): AuditEntry | null {
        const foundShifts = this.findEmptyShifts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCodeValue.EMPTY_SHIFT,
            severity: "WARNING",
            employees: [],
            shifts: foundShifts,
            message: `${foundShifts.length} shift(s) found to be empty.`,
        };
    }

    /**
     * Checks on‑call standby shifts for multiple names in a single cell.
     * Multiple names on an on‑call row lead to ambiguity about who is actually on standby.
     *
     * @param shiftList - All shifts.
     * @returns An audit entry for multi‑name on‑call shifts, or null if none.
     */
    checkOnCallShifts(shiftList: Shift[]): AuditEntry | null {
        const onCallShifts = shiftList.filter(s => s.category === ShiftCategoryValue.ONCALL);
        const foundShifts = this.findMultiNameShifts(onCallShifts);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCodeValue.ON_CALL_MULTIPLE_NAMES,
            severity: "WARNING",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `Multiple names found in on-call standby shift cells resulting in ambiguous reasoning for whom is scheduled.`,
        };
    }

    /**
     * Validates that for every weekend shift worked by an FTR employee,
     * there is a corresponding "W/E" flag in the vacation section, and vice versa.
     *
     * @param ftrShiftMap - Map of FTR employees to their shifts.
     * @param shiftList - All shifts (used to find “W/E” flags).
     * @returns Array of audit entries for weekend flag mismatches.
     */
    checkWeekendFlagsMatchWeekendShifts(ftrShiftMap: EmployeeShiftMap, shiftList: Shift[]): AuditEntry[] {
        const audits: AuditEntry[] = [];
        const tally = this.findWorkedWeekendFlaggedAsOffTally(ftrShiftMap, shiftList);

        tally.forEach((t, employee) => {
            if (t.weekendsWorked.length === t.flagsFounds.length) {
                return;
            }

            audits.push({
                code: AuditCodeValue.MISSING_WORKED_WEEKEND_FLAG,
                severity: "WARNING",
                employees: [employee],
                shifts: [...t.weekendsWorked, ...t.flagsFounds],
                message: `${employee.str_alias} has ${t.weekendsWorked.length} weekend shifts, but ${t.flagsFounds.length} off days flagged with "W/E"`,
            });
        });

        return audits;
    }

    /**
     * Filters shifts that contain more than one name in the `names` array.
     *
     * @param shiftList - List of shifts.
     * @returns Shifts with multiple names.
     */
    findMultiNameShifts(shiftList: Shift[]): Shift[] {
        return shiftList.filter(s => s.names.length > 1);
    }

    /**
     * Finds night shifts where two different male employees are scheduled on the same weekday.
     * Returns all conflicting shifts (both occurrences of the conflict).
     *
     * @param shiftList - List of shifts.
     * @returns Array of shifts that form male conflicts.
     */
    findMaleEmployeeConflicts(shiftList: Shift[]): Shift[] {
        const maleConflicts: Shift[] = [];

        const nightShifts = shiftList.filter(s => {
            return (
                s.category === ShiftCategoryValue.NIGHT &&
                s.employee != null &&
                s.employee.gender === "M"
            );
        });

        if (nightShifts.length < 2) return [];

        const maleAtNight = new Map<number, Shift>();

        nightShifts.forEach(es => {
            if (maleAtNight.has(es.weekday)) {
                maleConflicts.push(es, maleAtNight.get(es.weekday)!);
            } else {
                maleAtNight.set(es.weekday, es);
            }
        });

        return maleConflicts;
    }

    /**
     * For a single employee, identifies weekdays where they have more than one workable shift.
     * Returns an audit entry per duplicated weekday.
     *
     * @param employee - The employee.
     * @param employeeShifts - All shifts belonging to that employee.
     * @returns Array of duplicate audit entries.
     */
    findDuplicateEmployeeByDay(employee: Employee, employeeShifts: Shift[]): AuditEntry[] {
        const weekdayMap = new Map<number, Shift[]>();

        employeeShifts.forEach(s => {
            if (s.category === ShiftCategoryValue.ONCALL || s.category === ShiftCategoryValue.STATUS) {
                return;
            }

            if (!weekdayMap.has(s.weekday)) {
                weekdayMap.set(s.weekday, [s]);
            } else {
                const existingShifts = weekdayMap.get(s.weekday)!;
                existingShifts.push(s);
            }
        });

        const auditEntries: AuditEntry[] = [];

        weekdayMap.forEach((shifts, day) => {
            if (shifts.length <= 1) {
                return;
            }
            auditEntries.push({
                code: AuditCodeValue.DUPLICATE_EMPLOYEE,
                severity: "ERROR",
                employees: [employee],
                shifts: shifts,
                message: `${employee.str_alias} found to have more than one shift on weekday #${day}.`,
            });
        });

        return auditEntries;
    }

    /**
     * Finds shifts that conflict with a "NOT AVAILABLE" entry on the same weekday.
     * Uses name tokens (first name, alias, abbreviation) for comparison.
     *
     * @param shiftList - List of all shifts.
     * @returns Shifts that conflict with a NOT AVAILABLE entry.
     */
    findNotAvailableConflicts(shiftList: Shift[]): Shift[] {
        const notAvailableConflicts: Shift[] = [];
        const notAvailShifts = shiftList.filter(s => s.category === ShiftCategoryValue.NOTAVAILABLE);

        const notAvailNamesByDay = new Map<number, Set<string>>();

        for (const shift of notAvailShifts) {
            const tokens = ShiftQueryUtils.getShiftNameTokens(shift);
            if (tokens.length === 0) continue;

            if (!notAvailNamesByDay.has(shift.weekday)) {
                notAvailNamesByDay.set(shift.weekday, new Set());
            }
            tokens.forEach(t => notAvailNamesByDay.get(shift.weekday)!.add(t));
        }

        shiftList.forEach(s => {
            if (
                s.category === ShiftCategoryValue.HEADER ||
                s.category === ShiftCategoryValue.NOTAVAILABLE ||
                !notAvailNamesByDay.has(s.weekday)
            ) {
                return;
            }
            const weekdaySet = notAvailNamesByDay.get(s.weekday)!;

            const tokens = ShiftQueryUtils.getShiftNameTokens(s);

            for (let i = 0; i < tokens.length; i++) {
                if (weekdaySet.has(tokens[i])) {
                    notAvailableConflicts.push(s);
                    break;
                }
            }
        });
        return notAvailableConflicts;
    }

    /**
     * Finds empty shift cells that ought to be filled.
     * A shift is considered “empty” if it has no names, is not a status/vacation/not‑available row,
     * not an inherited shift row, and occurs on a valid weekday with an appropriate shift time
     * (weekday shift times on weekdays, weekend shift times in weekend locations on weekend days).
     *
     * @param shiftList - List of all shifts.
     * @returns Shifts that are unexpectedly empty.
     */
    findEmptyShifts(shiftList: Shift[]): Shift[] {
        return shiftList.filter(s => {
            const isWeekendLocation = WEEKEND_LOCATIONS.includes(s.location);
            const isWeekendShiftTime = WEEKEND_SHIFT_TIMES.includes(s.shiftTime);
            const isWeekendColumn = WEEKEND_DAYS.includes(s.weekday);
            const isWeekdayShiftTime = WEEKDAY_SHIFT_TIMES.includes(s.shiftTime);

            return (
                s.names.length < 1 &&
                s.category !== ShiftCategoryValue.STATUS &&
                s.category !== ShiftCategoryValue.VACATION &&
                s.category !== ShiftCategoryValue.NOTAVAILABLE &&
                s.rowKind !== RowSemanticKindValue.INHERITED_SHIFT &&
                (
                    (!isWeekendColumn && isWeekdayShiftTime) ||
                    (isWeekendColumn && isWeekendShiftTime && isWeekendLocation)
                )
            );
        });
    }

    /**
     * Builds a map that, for each FTR employee, records:
     * - `weekendsWorked`: shifts on weekend days that are workable (not on‑call, and of kind SHIFT/INHERITED_SHIFT).
     * - `flagsFounds`: vacation shifts that contain a "W/E" flag for that employee.
     *
     * This tally is later used to verify that weekend flags match worked weekends.
     *
     * @param ftrShiftMap - Map of FTR employees to all their shifts.
     * @param shiftList - List of all shifts (used to locate "W/E" flags).
     * @returns Map from employee to an object containing weekend shifts and corresponding flags.
     */
    findWorkedWeekendFlaggedAsOffTally(
        ftrShiftMap: EmployeeShiftMap,
        shiftList: Shift[]
    ): Map<Employee, { weekendsWorked: Shift[]; flagsFounds: Shift[] }> {
        const { weekendShifts, workedWeekendFlags } = ShiftQueryUtils.getFTRWeekendsAndWeekdayFlags(ftrShiftMap, shiftList);

        const employeeMatcher = new Map<string, Employee>();
        ftrShiftMap.forEach((_, e) => {
            employeeMatcher.set(e.str_alias, e);
            employeeMatcher.set(e.abbrev, e);
        });

        const tally = new Map<Employee, { weekendsWorked: Shift[]; flagsFounds: Shift[] }>();
        weekendShifts.forEach(s => {
            if (tally.has(s.employee!)) {
                tally.get(s.employee!)!.weekendsWorked.push(s);
            } else {
                tally.set(s.employee!, { weekendsWorked: [s], flagsFounds: [] });
            }
        });

        workedWeekendFlags.forEach(s => {
            if (s.names.length > 1) {
                console.error("Unexpected state: number of names should be 1 for <name> W/E name fields");
                return;
            }

            const foundFlaggedName = s.names[0].split(" ")[0];
            if (!employeeMatcher.has(foundFlaggedName)) {
                console.error(`Undefined named flagged as working the weekend: ${foundFlaggedName}`);
                return;
            }

            const foundEmployee = employeeMatcher.get(foundFlaggedName)!;

            if (!tally.has(foundEmployee)) {
                tally.set(foundEmployee, { weekendsWorked: [], flagsFounds: [s] });
            } else {
                tally.get(foundEmployee)!.flagsFounds.push(s);
            }
        });

        return tally;
    }
}
