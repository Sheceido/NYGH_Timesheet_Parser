/** @typedef {import("../types.d.ts").RowSemantic} RowSemantic */
/** @typedef {import("../types.d.ts").RowSemanticKind} RowSemanticKind */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").ShiftOrigin} ShiftOrigin */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */
/** @typedef {import("../types.d.ts").AuditCode} AuditCode */
/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").EmployeeShiftMap} EmployeeShiftMap */
/** @typedef {import("../types.d.ts").EmployeeMetrics} EmployeeMetrics */
/** @typedef {import("../types.d.ts").Roster} Roster */

import { FTR_HRS, WEEKDAY_SHIFT_TIMES, WEEKEND_DAYS, WEEKEND_LOCATIONS, WEEKEND_SHIFT_TIMES } from "../data/constants.js";
import { RowSemanticKind, ShiftCategory, AuditCode } from "../data/constants.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

export class ScheduleValidationAuditor {

    /**
     * @param {Shift[]} allShifts 
     * @param {EmployeeShiftMap} ftrMetrics 
     * @param {EmployeeShiftMap} casMetrics 
     * @param {number} holidayCount 
     */
    auditSchedule(allShifts, ftrShiftMap, casShiftMap, holidayCount) {
        /** @type {AuditEntry[]} auditEntries */
        const auditEntries = [];

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
        ftrShiftMap.forEach((shiftList, employee, _) => {
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
        casShiftMap.forEach((shiftList, employee, _) => {
            const dupAuditEntries = this.checkDuplicateShifts(employee, shiftList);
            if (dupAuditEntries) {
                dupAuditEntries.forEach(d => this._addAuditEntry(auditEntries, d));
            }
        });

        return auditEntries;
    }

    /**
     * @private
     * @param {AuditEntry[]} array 
     * @param {AuditEntry} entry
     */
    _addAuditEntry(array, entry) {
        if (entry !== null) array.push(entry);
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} employeeShiftList 
     * @param {number} holidayCount 
     * @param {AuditEntry[] | null} dupAudits
     * @returns {AuditEntry | null}
     * Takes a list of shifts of FTR employee, and checks for over/underscheduling
     */
    checkFTREmployeeScheduledShifts(employee, employeeShiftList, holidayCount, dupAudits) {

        const expectedCount = FTR_HRS - holidayCount;

        if (employeeShiftList.length === expectedCount && dupAudits === null) {
            return null;
        }

        let duplicateCount, issueCode, issueLabel;

        if (dupAudits === null) {
            duplicateCount = 0;
        } else {
            // -1 for each dup set found, as that is the existing shift while the rest are dups
            duplicateCount = dupAudits.reduce((dupCount, audit) => dupCount + (audit.shifts.length - 1), 0);
        }

        const effectiveShiftCount = employeeShiftList.length;

        if (effectiveShiftCount >= expectedCount) {
            issueCode = AuditCode.FTR_OVER_SCHEDULED;
            issueLabel = "Overscheduled";

        } else {
            issueCode = AuditCode.FTR_UNDER_SCHEDULED;
            issueLabel = "Underscheduled";
        }

        return {
            code: issueCode,
            severity: "ERROR",
            employees: [employee],
            shifts: employeeShiftList,
            message: `${issueLabel}: ${employee.str_alias} has ${employeeShiftList.length} shifts with +${duplicateCount} duplicate shift(s), expectedCount ${expectedCount}.`,
            expectedShiftCount: expectedCount, // specifically for over/under scheduled UI
            duplicateCount: duplicateCount, // specifically for over/under scheduled UI
        }
    }

    /**
    * @param {Shift[]} shiftList
    * @returns {AuditEntry | null}
    */
    checkMultiNameShifts(shiftList) {
        const foundShifts = this.findMultiNameShifts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.MULTIPLE_NAMES,
            severity: "INFO",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `Multiple names found in shift cells resulting in ambiguous reasoning for whom is scheduled.`,
        }
    }

    /**
    * @param {Shift[]} shiftList
    * @returns {AuditEntry | null}
    */
    checkMaleConflicts(shiftList) {
        const foundShifts = this.findMaleEmployeeConflicts(shiftList)
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.MALE_CONFLICT,
            severity: "WARNING",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: "More than one male employee found scheduled for night shift.",
        }
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry[] | null}
     */
    checkDuplicateShifts(employee, shiftList) {
        const audits = this.findDuplicateEmployeeByDay(employee, shiftList);
        if (audits.length < 1) return null;

        return audits;
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry | null}
     */
    checkNotAvailableConflicts(shiftList) {
        const foundShifts = this.findNotAvailableConflicts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.NOT_AVAILABLE,
            severity: "ERROR",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `${foundShifts.length} shift(s) found to be in conflict with previously scheduled as "Not Available".`,
        }
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry | null}
     */
    checkEmptyShifts(shiftList) {
        const foundShifts = this.findEmptyShifts(shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.EMPTY_SHIFT,
            severity: "WARNING",
            employees: [],
            shifts: foundShifts,
            message: `${foundShifts.length} shift(s) found to be empty.`,
        }
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry | null}
     */
    checkOnCallShifts(shiftList) {
        const onCallShifts = shiftList.filter(s => s.category === ShiftCategory.ONCALL);
        const foundShifts = this.findMultiNameShifts(onCallShifts);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.ON_CALL_MULTIPLE_NAMES,
            severity: "WARNING",
            employees: ShiftQueryUtils.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `Multiple names found in on-call standby shift cells resulting in ambiguous reasoning for whom is scheduled.`,
        }
    }

    /**
     * @param {EmployeeShiftMap} ftrShiftMap 
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry[]}
     */
    checkWeekendFlagsMatchWeekendShifts(ftrShiftMap, shiftList) {
        const audits = [];
        const tally = this.findWorkedWeekendFlaggedAsOffTally(ftrShiftMap, shiftList);

        tally.forEach((t, employee, _) => {
            if (t.weekendsWorked.length === t.flagsFounds.length) {
                return;
            }

            audits.push({
                code: AuditCode.MISSING_WORKED_WEEKEND_FLAG,
                severity: "WARNING",
                employees: [employee],
                shifts: [...t.weekendsWorked, ...t.flagsFounds],
                message: `${employee.str_alias} has ${t.weekendsWorked.length} weekend shifts, but ${t.flagsFounds.length} off days flagged with "W/E"`,
            });
        });

        return audits;
    }

    /**
    * @param {Shift[]} shiftList
    * @returns {Shift[]}
    */
    findMultiNameShifts(shiftList) {
        return shiftList.filter(s => s.names.length > 1);
    }

    /**
    * @param {RowSemantic[]} rowSemanticList 
    * @param {Shift[]} shiftList
    * @returns {Shift[]}
    */
    findMaleEmployeeConflicts(shiftList) {
        /** @type {Shift[]} eveningMaleConflicts */
        const maleConflicts = [];

        const nightShifts = shiftList.filter(s => {
            return (
                s.category === ShiftCategory.NIGHT &&
                s.employee != null &&
                s.employee.gender === "M"
            )
        });

        if (nightShifts.length < 2) return [];

        /** @type {Map<number, Shift>} */
        const maleAtNight = new Map();

        nightShifts.forEach(es => {
            if (maleAtNight.has(es.weekday)) {
                maleConflicts.push(es, maleAtNight.get(es.weekday));
            }
            else {
                maleAtNight.set(es.weekday, es);
            }
        });

        return maleConflicts;
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} employeeShifts 
     * @returns {AuditEntry[]}
     */
    findDuplicateEmployeeByDay(employee, employeeShifts) {
        /** @type {Map<number, Shift[]>} weekdayMap */
        const weekdayMap = new Map();

        employeeShifts.forEach(s => {
            if (s.category === ShiftCategory.ONCALL || s.category === ShiftCategory.STATUS) {
                return;
            }

            if (!weekdayMap.has(s.weekday)) {
                weekdayMap.set(s.weekday, [s]);

            } else {
                const existingShifts = weekdayMap.get(s.weekday);
                existingShifts.push(s);
            }
        });

        /** @type {AuditEntry[]} auditEntries */
        const auditEntries = [];

        weekdayMap.forEach((shifts, day, _) => {
            if (shifts.length <= 1) {
                return;
            }
            // push only when we have >1 shift per day/column
            auditEntries.push({
                code: AuditCode.DUPLICATE_EMPLOYEE,
                severity: "ERROR",
                employees: [employee],
                shifts: shifts,
                message: `${employee.str_alias} found to have more than one shift on weekday #${day}.`,
            });
        });

        return auditEntries;
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    findNotAvailableConflicts(shiftList) {
        /** @type {Shift[]} notAvailableConflicts */
        const notAvailableConflicts = [];
        const notAvailShifts = shiftList.filter(s => s.category === ShiftCategory.NOTAVAILABLE);

        /** @type {Map<number, Set<string>>} */
        const notAvailNamesByDay = new Map();

        // Build a map of day -> set of unavailable name tokens
        for (const shift of notAvailShifts) {
            const tokens = ShiftQueryUtils.getShiftNameTokens(shift);
            if (tokens.length === 0) continue;

            if (!notAvailNamesByDay.has(shift.weekday)) {
                notAvailNamesByDay.set(shift.weekday, new Set());
            }
            tokens.forEach(t => notAvailNamesByDay.get(shift.weekday).add(t));
        }

        // Check each shift for conflicts with name tokens found on the same day
        shiftList.forEach(s => {
            if (s.category === ShiftCategory.HEADER ||
                s.category === ShiftCategory.NOTAVAILABLE ||
                !notAvailNamesByDay.has(s.weekday)) {
                return;
            }
            const weekdaySet = notAvailNamesByDay.get(s.weekday);

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
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    findEmptyShifts(shiftList) {
        return shiftList.filter(s => {

            const isWeekendLocation = WEEKEND_LOCATIONS.includes(s.location);
            const isWeekendShiftTime = WEEKEND_SHIFT_TIMES.includes(s.shiftTime);
            const isWeekendColumn = WEEKEND_DAYS.includes(s.weekday);
            const isWeekdayShiftTime = WEEKDAY_SHIFT_TIMES.includes(s.shiftTime);

            return (
                s.names.length < 1 &&
                s.category !== ShiftCategory.STATUS &&
                s.category !== ShiftCategory.VACATION &&
                s.category !== ShiftCategory.NOTAVAILABLE &&
                s.rowKind !== RowSemanticKind.INHERITED_SHIFT &&
                (
                    (!isWeekendColumn && isWeekdayShiftTime) ||
                    (isWeekendColumn && isWeekendShiftTime && isWeekendLocation)
                )
            );
        });
    }

    /**
     * @param {EmployeeShiftMap} ftrShiftMap 
     * @param {Shift[]} shiftList 
     * @returns {Map<Employee, { weekendsWorked: Shift[], flaggedShifts: Shift[] }>}
     */
    findWorkedWeekendFlaggedAsOffTally(ftrShiftMap, shiftList) {
        const { weekendShifts, workedWeekendFlags } = ShiftQueryUtils.getFTRWeekendsAndWeekdayFlags(ftrShiftMap, shiftList);

        /** @type {Map<string, Employee>} employeeMatcher */
        const employeeMatcher = new Map();
        ftrShiftMap.forEach((v, e, _) => {
            employeeMatcher.set(e.first_name, e);
            employeeMatcher.set(e.str_alias, e);
            employeeMatcher.set(e.abbrev, e);
        });

        /** @type {Map<Employee, { weekendsWorked: Shift[], flagsFounds: Shift[] }>} tally */
        const tally = new Map();
        weekendShifts.forEach(s => {
            if (tally.has(s.employee)) {
                tally.get(s.employee).weekendsWorked.push(s);
            } else {
                tally.set(s.employee, { weekendsWorked: [s], flagsFounds: [] });
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

            const foundEmployee = employeeMatcher.get(foundFlaggedName);

            // If employee wasn't scheduled on weekend but was flagged as having worked the weekend
            if (!tally.has(foundEmployee)) {
                tally.set(foundEmployee, { weekendsWorked: [], flagsFounds: [s] });
            } else {
                tally.get(foundEmployee).flagsFounds.push(s);
            }
        });

        return tally;
    }
}
