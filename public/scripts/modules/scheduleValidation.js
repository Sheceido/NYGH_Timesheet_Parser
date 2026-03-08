/** @typedef {import("../types.d.ts").RowSemantic} RowSemantic */
/** @typedef {import("../types.d.ts").RowSemanticKind} RowSemanticKind */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").ShiftOrigin} ShiftOrigin */
/** @typedef {import("../types.d.ts").ShiftCategory} ShiftCategory */
/** @typedef {import("../types.d.ts").AuditCode} AuditCode */
/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").Roster} Roster */

import { BIWEEKLY, FTR_HRS, WEEKDAY_SHIFT_TIMES, WEEKEND_DAYS, WEEKEND_LOCATIONS, WEEKEND_SHIFT_TIMES } from "../data/constants.js";
import { RowSemanticKind, ShiftCategory, AuditCode } from "../data/constants.js";
import { ShiftQueryUtils } from "./shiftQueryUtils.js";

export class ScheduleValidationAuditor {

    constructor() { }

    /**
     * @param {Shift[]} allShifts 
     * @param {Roster} roster 
     * @param {number} holidayCount 
     */
    auditSchedule(allShifts, roster, holidayCount) {
        /** @type {AuditEntry[]} auditEntries */
        const auditEntries = [];

        this._addAuditEntry(auditEntries, this.checkEmptyShifts(allShifts));
        this._addAuditEntry(auditEntries, this.checkMaleConflicts(allShifts));
        this._addAuditEntry(auditEntries, this.checkMultiNameShifts(allShifts));
        this._addAuditEntry(auditEntries, this.checkNotAvailableConflicts(allShifts));
        this._addAuditEntry(auditEntries, this.checkOnCallShifts(allShifts));

        for (const [_, employee] of Object.entries(roster)) {
            const employeeShifts = ShiftQueryUtils.findEmployeeShifts(employee, allShifts);

            const dupAuditEntry = this.checkDuplicateShifts(employee, employeeShifts)
            this._addAuditEntry(
                auditEntries,
                dupAuditEntry
            );

            const ftrShiftCountAuditEntries = this.checkFTREmployeeScheduledShifts(
                employee,
                employeeShifts,
                holidayCount,
                dupAuditEntry,
            );
            this._addAuditEntry(
                auditEntries,
                ftrShiftCountAuditEntries
            );
        }
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
     * @param {AuditEntry | null} dupAudit
     * @returns {AuditEntry | null}
     * Takes a list of shifts of FTR employee, and checks for over/underscheduling
     */
    checkFTREmployeeScheduledShifts(employee, employeeShiftList, holidayCount, dupAudit) {
        const expectedCount = FTR_HRS - holidayCount;
        const duplicateCount = (dupAudit === null) ? 0 : (dupAudit.shifts.length - 1);

        if (
            employeeShiftList.length === expectedCount &&
            dupAudit === null
        ) {
            return null;
        }

        const effectiveShiftCount = employeeShiftList.length - duplicateCount;

        let issueCode, issueLabel, effectiveShiftList;
        if (effectiveShiftCount >= expectedCount) {
            issueCode = AuditCode.FTR_OVER_SCHEDULED;
            issueLabel = "Overscheduled";
        } else {
            issueCode = AuditCode.FTR_UNDER_SCHEDULED;
            issueLabel = "Underscheduled";

        }

        if (dupAudit === null) {
            effectiveShiftList = employeeShiftList;
        } else {
            effectiveShiftList = employeeShiftList.filter(s => {
                const foundDup = dupAudit.shifts.find((dupShift, i) => {
                    if (i === 0) return false;
                    return (dupShift.id === s.id);
                });

                return (!foundDup);
            });
        }

        return {
            code: issueCode,
            severity: "ERROR",
            employees: [employee],
            shifts: effectiveShiftList,
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
            employees: this.getUniqueEmployees(foundShifts),
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
            employees: this.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: "More than one male employee found scheduled for night shift.",
        }
    }

    /**
     * @param {Employee} employee 
     * @param {Shift[]} shiftList 
     * @returns {AuditEntry | null}
     */
    checkDuplicateShifts(employee, shiftList) {
        const foundShifts = this.findDuplicateEmployee(employee, shiftList);
        if (foundShifts.length < 1) return null;

        return {
            code: AuditCode.DUPLICATE_EMPLOYEE,
            severity: "ERROR",
            employees: this.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `${employee.str_alias} found to have more than one shift in a weekday.`,
        }
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
            employees: this.getUniqueEmployees(foundShifts),
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
            employees: this.getUniqueEmployees(foundShifts),
            shifts: foundShifts,
            message: `Multiple names found in on-call standby shift cells resulting in ambiguous reasoning for whom is scheduled.`,
        }
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
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    findDuplicateEmployee(employee, shiftList) {
        /** @type {Shift[]} duplicateShifts */
        const duplicateShifts = [];
        /** @type {Map<number, Shift>} weekdayMap */
        const weekdayMap = new Map();

        shiftList.forEach(s => {
            if (s.names.length < 1) return;

            const name = s.names[s.names.length - 1];

            if (
                s.category != ShiftCategory.ONCALL &&
                s.category != ShiftCategory.STATUS &&
                ShiftQueryUtils.nameIsEmployee(name, employee)
            ) {
                if (weekdayMap.has(s.weekday)) {
                    const existingShift = weekdayMap.get(s.weekday);

                    if (duplicateShifts.filter(s => s.id === existingShift.id).length < 1) {
                        duplicateShifts.push(existingShift);
                    }

                    duplicateShifts.push(s);
                } else {
                    weekdayMap.set(s.weekday, s);
                }
            }
        });
        return duplicateShifts;
    }

    /**
     * @param {Shift[]} shiftList 
     * @returns {Shift[]}
     */
    findNotAvailableConflicts(shiftList) {
        /** @type {Shift[]} notAvailableConflicts */
        const notAvailableConflicts = [];
        const notAvailShifts = shiftList.filter(s => s.category === ShiftCategory.NOTAVAILABLE);

        /** @typedef {Set<string>} SetOfNames */
        /** @type {Map<number, SetOfNames>} */
        const weekdaysOfNames = new Map();

        // Populate names of employees marked as not available
        for (let i = 1; i <= BIWEEKLY; i++) {
            const ithWeekdayNotAvailables = notAvailShifts.filter(s => s.weekday === i);

            /** @type SetOfNames */
            const names = new Set();
            ithWeekdayNotAvailables.forEach(nas => {

                if (nas.names.length < 1) { return; }

                names.add(nas.names[nas.names.length - 1]);

                if (nas.employee != null) {
                    names.add(nas.employee.first_name);
                    names.add(nas.employee.str_alias);
                    names.add(nas.employee.abbrev);
                }
            });
            weekdaysOfNames.set(i, names);
        }

        // Check each shift that conflicts with any names marked as not available in their associated column/weekday
        shiftList.forEach(s => {
            if (
                s.category === ShiftCategory.NOTAVAILABLE ||
                s.category === ShiftCategory.HEADER
            ) {
                return;
            }

            const weekdaySet = weekdaysOfNames.get(s.weekday);
            if (!weekdaySet) {
                console.error("ERROR: Expected Set to be initialized within weekday-name mapping, got undefined.");
                return;
            }

            if (
                weekdaySet.has(s.names[s.names.length - 1]) ||
                s.employee != null &&
                (
                    weekdaySet.has(s.employee.first_name) ||
                    weekdaySet.has(s.employee.str_alias) ||
                    weekdaySet.has(s.employee.abbrev)
                )
            ) {
                notAvailableConflicts.push(s);
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
                s.category != ShiftCategory.STATUS &&
                s.category != ShiftCategory.VACATION &&
                s.category != ShiftCategory.NOTAVAILABLE &&
                s.rowKind != RowSemanticKind.INHERITED_SHIFT &&
                (
                    (!isWeekendColumn && isWeekdayShiftTime) ||
                    (isWeekendColumn && isWeekendShiftTime && isWeekendLocation)
                )
            );
        });
    }

    /**
    * @param {Shift[]} shiftList 
    * @returns {Employee[]}
    */
    getUniqueEmployees(shiftList) {
        const employeeSet = new Set();
        shiftList.forEach(s => employeeSet.add(s.employee));
        return [...employeeSet];
    }
}
