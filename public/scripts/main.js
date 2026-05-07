/** custom web component definition imports for DOM instantiation */
import { ModeSelectTab } from "./webComponents/modeSelectTab.js";
import { PasteArea } from "./webComponents/pasteArea.js";
import { EmployeeSelector } from "./webComponents/employeeSelector.js";
import { ControlPanel } from "./webComponents/controlPanel.js";
import { AuditEntriesCard } from "./webComponents/audits/auditEntriesCard.js";
import { AuditEmployeeShiftCount } from "./webComponents/audits/auditEmployeeShiftCount.js";
import { AuditAvailability } from "./webComponents/audits/auditAvailability.js";
import { AuditMissingWeekendFlag } from "./webComponents/audits/auditMissingWeekendFlag.js";
import { AuditEmptyShifts } from "./webComponents/audits/auditEmptyShifts.js";
import { AuditShiftConflict, AuditShiftConflictCard } from "./webComponents/audits/auditShiftConflict.js";
import { TimesheetTable } from "./webComponents/timesheetTable.js";
import { ModalSchedule } from "./webComponents/modalSchedule.js";
import { ScheduleSpreadsheet } from "./webComponents/scheduleSpreadsheet.js";

/** @typedef {import('./types.d.ts').ScheduleAuditReport} ScheduleAuditReport */
/** @typedef {import('./types.d.ts').AppMode} AppMode */
/** @typedef {import('./types.d.ts').ScheduleRenderDataset} ScheduleRenderDataset */

import { initDocumentEventListeners } from "./initEventListeners.js";
import { ScheduleParser } from "./modules/scheduleParser.js";
import { ScheduleValidator } from "./modules/scheduleValidator.js";
import { ScheduleAnalyzer } from "./modules/scheduleAnalyzer.js";
import { ScheduleMetricsAuditor } from "./modules/scheduleMetrics.js";
import { ScheduleValidationAuditor } from "./modules/scheduleValidation.js";
import { Renderer } from "./modules/renderer.js";
import { FULL_ROSTER, ROSTER, CASUAL_ROSTER } from "./data/roster.js";
import { AppMode, AuditCode, AuditDescriptors } from "./data/constants.js";
import { ShiftQueryUtils } from "./modules/shiftQueryUtils.js";


// Initialize event listeners for interactivity between web components
initDocumentEventListeners();

/**
 * main function trigger when custom event "ANALYZE_SCHEDULE" is triggere
 * @param {AppMode} mode
 */
export function auditSchedule(mode) {

    const pasteArea = document.querySelector(".pasteArea");
    if (!pasteArea) {
        console.error(`Expected element paste-area, got ${pasteArea}`);
        return;
    }
    const holidays = document.querySelector("#holidays");
    if (!holidays) {
        console.error(`Expected element #holidays, got ${holidays}`);
        return;
    }
    const scheduleSpreadsheet = document.querySelector("schedule-spreadsheet");
    if (!scheduleSpreadsheet) {
        console.error("schedule-spreadsheet element is undefined!");
        return;
    }

    const scheduleStr = pasteArea.value;
    const holidayCount = holidays.value;

    try {
        // Parse and validate schedule string
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

        // Analyze -> scheduleMetrics -> scheduleValidation
        const analyzer = new ScheduleAnalyzer();
        const dataset = analyzer.analyze(parser.schedule);

        const metrics = new ScheduleMetricsAuditor();
        const auditor = new ScheduleValidationAuditor();

        const ftrShiftMap = ShiftQueryUtils.getEmployeeShiftMap(ROSTER, dataset.shifts);
        const casShiftMap = ShiftQueryUtils.getEmployeeShiftMap(CASUAL_ROSTER, dataset.shifts);

        const ftrMetrics = metrics.calculateScheduleMetrics(ftrShiftMap);
        const casMetrics = metrics.calculateScheduleMetrics(casShiftMap);

        /** @type {ScheduleAuditReport} auditReport */
        const auditReport = {
            employeeMetrics: [...ftrMetrics, ...casMetrics],
            validationIssues: auditor.auditSchedule(dataset.shifts, ftrShiftMap, casShiftMap, holidayCount),
        }
        console.log(auditReport);

        // Begin rendering pipeline
        Renderer.clearStaleContainer(mode);

        // set schedule data to modal custom web component reactive rendering
        scheduleSpreadsheet.data = dataset;

        switch (mode) {
            // Generate a timesheet and flag errors for specific employee
            case AppMode.TIMESHEET:
                generateTimesheet(mode, dataset.header, auditReport);
                break;

            // Generate Audit Entry containers on issues found for all employees
            case AppMode.SCHEDULE_CHECK:
                generateAudit(mode, auditReport);
                break;

            default:
                console.error(`Unknown AppMode: ${mode}`);
                return;
        }
    } catch (e) {
        console.error(`auditSchedule failed: ${e.message || e}`);
        return;
    }
}

/**
 * @param {AppMode} mode 
 * @param {string[]} weekdayHeader 
 * @param {ScheduleAuditReport} auditReport 
 * @returns {void}
 */
function generateTimesheet(mode, weekdayHeader, auditReport) {

    const employeeSelector = document.querySelector("employee-selector");
    if (!employeeSelector) {
        console.error("Unexpected 'employee-selector' custom component to be undefined.");
        return;
    }

    const selectedEmployee = FULL_ROSTER[employeeSelector.selected];
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
    Renderer.renderTimesheet(mode, weekdayHeader, foundMetric, foundIssues);

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

        Renderer.renderAuditEntriesCard(
            mode,
            AuditDescriptors[audit.code].icon,
            AuditDescriptors[audit.code].header,
            [audit],
        )
    });
}

/**
 * @param {AppMode} mode 
 * @param {ScheduleAuditReport} auditReport 
 */
function generateAudit(mode, auditReport) {

    for (const code of Object.values(AuditCode)) {
        // Skip these for audit display
        if (code === AuditCode.MULTIPLE_NAMES ||
            code === AuditCode.ON_CALL_MULTIPLE_NAMES
        ) {
            continue;
        }

        Renderer.renderAuditEntriesCard(
            mode,
            AuditDescriptors[code].icon,
            AuditDescriptors[code].header,
            auditReport.validationIssues.filter(ae => ae.code === code)
        );
    }
}

/** Programmatically updates footer to have current year */
function footerDate() {
    const footer = document.querySelector("footer");
    if (!footer) {
        console.error("Footer not in DOM!");
        return;
    }

    footer.textContent = `© ${(new Date()).getFullYear()} Leon Poon. All Rights Reserved.`;
}
footerDate();
