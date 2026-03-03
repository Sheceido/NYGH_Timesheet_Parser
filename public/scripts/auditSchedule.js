import { ScheduleParser } from "./modules/scheduleParser.js";
import { ScheduleValidator } from "./modules/scheduleValidator.js";
import { ScheduleAnalyzer } from "./modules/scheduleAnalyzer.js";
import { ScheduleValidationAuditor } from "./modules/scheduleAuditor.js";

import { ROSTER, CASUAL_ROSTER } from "./data/roster.js";

import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
import { initScheduleCheckerEventListeners } from "./scheduleCheckerEventListeners.js";
import { setElementErrors, clearElementErrors } from "./elementErrors.js";
import { DAYS_OF_THE_WEEK } from "./data/constants.js";


/** @typedef {import("./types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("./types.d.ts").StandbyHoursMap} StandbyHoursMap */

export function auditSchedule() {
    clearElementErrors(null, "scheduleError");
    clearElementErrors(null, "errorsWarnings");

    // Check input for text area
    const schedTextArea = document.querySelector(".schedule");

    if (schedTextArea.value === "") {
        setElementErrors("schedule", "scheduleError", "[Error]: Empty schedule input!")
        return;
    }
    clearElementErrors("schedule", "scheduleError")

    /** @type {string} scheduleStr */
    const scheduleStr = schedTextArea.value;

    // Check input for stats count
    let holidayCount = 0;

    /** @type HTMLInputElement */
    const stats = document.querySelector(".schedCheckHolidays");

    if (stats.value !== "") {
        const numInput = Number(stats.value);

        if (isNaN(numInput) || numInput < 0 || numInput > 14) {
            setElementErrors("holidays", "errorsWarnings", "Error: Invalid holiday input, holiday must be between 0 and 14.");
            return;
        }
        holidayCount = numInput;
    }
    clearElementErrors("holidays", "errorsWarnings");

    // Reset state to beginning
    scheduleCheckTable.reset(); // remove old table
    selectFTR.selectFirstChild();

    const parser = new ScheduleParser(scheduleStr);
    const validator = new ScheduleValidator(parser.schedule);

    if (validator.validationErrorList.length > 0) {
        console.error("ERROR: Invalid state of schedule grid:");
        validator.validationErrorList.forEach(err => {
            console.error(`${err.code}: ${err.message}`);
        });
        return;
    }

    const analyzer = new ScheduleAnalyzer(parser.schedule);
    const metrics = new ScheduleMetricsAuditor();
    const auditor = new ScheduleValidationAuditor();

    // Check over/underscheduled employees
    /** @type {AuditEntry[]} fullTimeIncorrectShiftCount */
    const fullTimeIncorrectShiftCount = [];
    for (const [_, employee] of Object.entries(ROSTER)) {
        const employeeShiftList = metrics.getEmployeeScheduledShifts(employee, analyzer.shiftList);

        const ftrError = auditor.checkFTREmployeeScheduledShifts(employee, employeeShiftList, holidayCount);
        if (ftrError) {
            fullTimeIncorrectShiftCount.push(ftrError);
        }
    }
    fullTimeIncorrectShiftCount.forEach(e => console.log(e));

    for (const [_, employee] of Object.entries(CASUAL_ROSTER)) {
        const employeeShiftList = metrics.getEmployeeScheduledShifts(employee, analyzer.shiftList);
        console.log(`CASUAL: ${employee.str_alias} scheduled for ${employeeShiftList.length} shifts in this biweekly.`);
    }

    // Check empty cells
    const emptyError = auditor.checkEmptyShifts(analyzer.shiftList);
    if (emptyError) {
        console.log(`${emptyError.shifts.length} shifts found to be empty!`)

        emptyError.shifts.forEach(s => {
            const so = analyzer.shiftOrigin.get(s.id);
            if (!so) {
                console.error(`ERROR: shiftOrigin could not identify shift with id: ${s.id}`)
                return;
            }
            console.log(DAYS_OF_THE_WEEK[(s.weekday - 1) % 7], `row: ${so.row}`, `col: ${so.col}`, s.location, s.shiftTime, s.employee);
        });
    }

    // Check multiple names found in cells
    const multiNamesExists = auditor.checkMultiNameShifts(analyzer.shiftList);
    if (multiNamesExists) {
        console.log(multiNamesExists);
    }

    // Check Male Conflicts in night (4pm-12am) cells
    const maleConflictExists = auditor.checkMaleConflicts(analyzer.shiftList);
    if (maleConflictExists) {
        console.log(maleConflictExists);
    }

    // Duplicate Shifts
    /** @type {AuditEntry[]} employeesWithDuplicates */
    const employeesWithDuplicates = [];
    for (const [_, employee] of Object.entries(ROSTER)) {
        const duplicateShiftsExist = auditor.checkDuplicateShifts(employee, analyzer.shiftList)
        if (duplicateShiftsExist) {
            employeesWithDuplicates.push(duplicateShiftsExist);
        }
    }
    employeesWithDuplicates.forEach(dup => console.log(dup));

    // Check not-available conflicts
    const notAvailConfExists = auditor.checkNotAvailableConflicts(analyzer.shiftList);
    if (notAvailConfExists) {
        console.log(notAvailConfExists);
    }

    // Need to make an audit on on-call standby hours
    for (const [_, employee] of Object.entries(ROSTER)) {
        const standbyHoursMap = metrics.getEmployeeStandbyHours(employee, analyzer.shiftList);

        if (standbyHoursMap == null) continue;

        standbyHoursMap.forEach((hrs, weekday) => {
            console.log(`${employee.str_alias} standby hours: ${weekday}: ${hrs} hours`)
        });
    }
}
