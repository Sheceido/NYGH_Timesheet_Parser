/** custom web component definition imports for DOM instantiation */
import { ModeSelectTab } from "./webComponents/modeSelectTab.js";
import { PasteArea } from "./webComponents/pasteArea.js";
import { EmployeeSelector } from "./webComponents/employeeSelector.js";
import { ControlPanel } from "./webComponents/controlPanel.js";
import { AuditEntriesCard } from "./webComponents/auditEntriesCard.js";
import { AuditEmployeeShiftCount } from "./webComponents/auditEmployeeShiftCount.js";
import { AuditAvailability } from "./webComponents/auditAvailability.js";
import { AuditShiftConflict, AuditShiftConflictCard } from "./webComponents/auditShiftConflict.js";
import { TimesheetTable } from "./webComponents/timesheetTable.js";

/** @typedef {import('./types.d.ts').ScheduleAuditReport} ScheduleAuditReport */
/** @typedef {import('./types.d.ts').AppMode} AppMode */

import { initDocumentEventListeners } from "./initEventListeners.js";
import { ScheduleParser } from "./modules/scheduleParser.js";
import { ScheduleValidator } from "./modules/scheduleValidator.js";
import { ScheduleAnalyzer } from "./modules/scheduleAnalyzer.js";
import { ScheduleMetricsAuditor } from "./modules/scheduleMetrics.js";
import { ScheduleValidationAuditor } from "./modules/scheduleValidation.js";
import { Renderer } from "./modules/renderer.js";
import { FULL_ROSTER, ROSTER } from "./data/roster.js";
import { AppMode, AuditCode, AuditDescriptors } from "./data/constants.js";


// Initialize event listeners for interactivity between web components
initDocumentEventListeners();

/**
 * main function trigger when custom event "ANALYZE_SCHEDULE" is triggere
 * @param {AppMode} mode
 */
export function auditSchedule(mode) {

    const pasteArea = document.querySelector(".pasteArea");
    const holidays = document.querySelector("#holidays");
    if (!pasteArea) {
        console.error(`Expected element paste-area, got ${pasteArea}`);
        return;
    }
    if (!holidays) {
        console.error(`Expected element #holidays, got ${holidays}`);
        return;
    }

    const scheduleStr = pasteArea.value;
    const holidayCount = holidays.value;

    const parser = new ScheduleParser(scheduleStr);
    const validator = new ScheduleValidator(parser.schedule);

    if (validator.validationErrorList.length > 0) {
        Renderer.updateElementValidationErrorField(
            "#textAreaError",
            "Invalid state of schedule grid:",
            validator.validationErrorList,
        );
        return;
    }

    const analyzer = new ScheduleAnalyzer(parser.schedule);
    const metrics = new ScheduleMetricsAuditor();
    const auditor = new ScheduleValidationAuditor();

    /** @type {ScheduleAuditReport} auditReport */
    const auditReport = {
        validationIssues: auditor.auditSchedule(analyzer.shiftList, ROSTER, holidayCount),
        employeeMetrics: metrics.calculateScheduleMetrics(analyzer.shiftList, FULL_ROSTER),
    }

    console.log(auditReport);

    Renderer.clearStaleContainer(mode);

    switch (mode) {
        // Generate a timesheet and flag errors for specific employee
        case AppMode.TIMESHEET:
            const employeeSelector = document.querySelector("employee-selector");
            if (!employeeSelector) {
                console.error("Unexpected 'employee-selector' custom component to be undefined.");
                return;
            }

            const selectedEmployee = ROSTER[employeeSelector.selected];
            if (!selectedEmployee) {
                console.error(`Invalid employee selected: "${employeeSelector.selected}"`);
                return;
            }

            const foundMetric = auditReport.employeeMetrics.find(metric => (
                metric.employee.abbrev === selectedEmployee.abbrev &&
                metric.employee.str_alias === selectedEmployee.str_alias
            ));
            if (!foundMetric) {
                console.error(`No metrics found for employee "${selectedEmployee.str_alias}".`);
                return;
            }

            const foundIssues = auditReport.validationIssues.filter(ae =>
                ae.employees.some(e => (
                    e && // null-check before field check
                    e.abbrev === selectedEmployee.abbrev &&
                    e.str_alias === selectedEmployee.str_alias
                ))
            );

            // render timesheet
            Renderer.renderTimesheet(mode, analyzer.weekdayHeader, foundMetric, foundIssues);

            // render issues found for specific employee
            foundIssues.forEach(audit => {
                // ignore multiple names warning
                if (audit.code === AuditCode.MULTIPLE_NAMES) {
                    return;
                }

                // highlight issues by querying class name based on a shift id 
                if (audit.code !== AuditCode.FTR_OVER_SCHEDULED &&
                    audit.code !== AuditCode.FTR_UNDER_SCHEDULED) {
                    audit.shifts.forEach(s => {
                        Renderer.highlightTimesheetIssue(s.id);
                    });
                }

                // render audit cards
                Renderer.renderAuditEntriesCard(
                    mode,
                    AuditDescriptors[audit.code].icon,
                    AuditDescriptors[audit.code].header,
                    [audit],
                )
            });
            break;

        // Generate errors for any issues found for all employees
        case AppMode.SCHEDULE_CHECK:

            for (const code of Object.values(AuditCode)) {
                if (code === AuditCode.MULTIPLE_NAMES ||
                    code === AuditCode.ON_CALL_MULTIPLE_NAMES ||
                    code === AuditCode.EMPTY_SHIFT) {
                    continue;
                }

                Renderer.renderAuditEntriesCard(
                    mode,
                    AuditDescriptors[code].icon,
                    AuditDescriptors[code].header,
                    auditReport.validationIssues.filter(ae => ae.code === code)
                );
            }
            break;
    }
}
