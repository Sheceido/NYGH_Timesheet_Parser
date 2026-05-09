// Side-effect only imports (custom element registration)
import "./webComponents/modeSelectTab.js";
import "./webComponents/pasteArea.js";
import "./webComponents/employeeSelector.js";
import "./webComponents/controlPanel.js";
import "./webComponents/audits/auditEntriesCard.js";
import "./webComponents/audits/auditEmployeeShiftCount.js";
import "./webComponents/audits/auditAvailability.js";
import "./webComponents/audits/auditMissingWeekendFlag.js";
import "./webComponents/audits/auditEmptyShifts.js";
import "./webComponents/audits/auditShiftConflict.js";
import "./webComponents/timesheetTable.js";
import "./webComponents/modalSchedule.js";
import "./webComponents/scheduleSpreadsheet.js";

import type { ScheduleAuditReport, AppMode as AppModeType, ScheduleRenderDataset } from "./types.js";
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
 * Main function triggered when custom event "ANALYZE_SCHEDULE" is fired.
 * @param mode - The current application mode (timesheet or schedule checker).
 */
export function auditSchedule(mode: AppModeType): void {
    const pasteArea = document.querySelector(".pasteArea") as HTMLTextAreaElement | null;
    if (!pasteArea) {
        console.error(`Expected element .pasteArea, got ${pasteArea}`);
        return;
    }
    const holidays = document.querySelector("#holidays") as HTMLInputElement | null;
    if (!holidays) {
        console.error(`Expected element #holidays, got ${holidays}`);
        return;
    }
    const scheduleSpreadsheet = document.querySelector("schedule-spreadsheet") as HTMLElement & { data?: ScheduleRenderDataset } | null;
    if (!scheduleSpreadsheet) {
        console.error("schedule-spreadsheet element is undefined!");
        return;
    }

    const scheduleStr = pasteArea.value;
    const holidayCount = parseInt(holidays.value, 10);

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

        const auditReport: ScheduleAuditReport = {
            employeeMetrics: [...ftrMetrics, ...casMetrics],
            validationIssues: auditor.auditSchedule(dataset.shifts, ftrShiftMap, casShiftMap, holidayCount),
        };
        console.log(auditReport);

        // Begin rendering pipeline
        Renderer.clearStaleContainer(mode);

        // Set schedule data to modal custom web component reactive rendering
        scheduleSpreadsheet.data = dataset;

        switch (mode) {
            case AppMode.TIMESHEET:
                generateTimesheet(mode, dataset.header, auditReport);
                break;
            case AppMode.SCHEDULE_CHECK:
                generateAudit(mode, auditReport);
                break;
            default:
                console.error(`Unknown AppMode: ${mode}`);
                return;
        }
    } catch (e) {
        console.error(`auditSchedule failed: ${(e as Error).message || e}`);
        return;
    }
}

/**
 * Generates the timesheet view and renders issues for a specific employee.
 * @param mode - Application mode (must be TIMESHEET).
 * @param weekdayHeader - Array of date headers.
 * @param auditReport - Complete audit report.
 */
function generateTimesheet(mode: AppModeType, weekdayHeader: string[], auditReport: ScheduleAuditReport): void {
    const employeeSelector = document.querySelector("employee-selector") as HTMLElement & { selected: string } | null;
    if (!employeeSelector) {
        console.error("Unexpected 'employee-selector' custom component to be undefined.");
        return;
    }

    const selectedEmployee = FULL_ROSTER[employeeSelector.selected];
    if (!selectedEmployee) {
        console.error(`Invalid employee selected: "${employeeSelector.selected}"`);
        return;
    }

    const foundMetric = auditReport.employeeMetrics.find(metric =>
        metric.employee.abbrev === selectedEmployee.abbrev &&
        metric.employee.str_alias === selectedEmployee.str_alias
    );
    if (!foundMetric) {
        console.error(`No metrics found for employee "${selectedEmployee.str_alias}".`);
        return;
    }

    const foundIssues = auditReport.validationIssues.filter(ae =>
        ae.employees.some(e =>
            e && // null-check before field check
            e.abbrev === selectedEmployee.abbrev &&
            e.str_alias === selectedEmployee.str_alias
        )
    );

    // Render timesheet
    Renderer.renderTimesheet(mode, weekdayHeader, foundMetric);

    // Render issues found for this employee
    foundIssues.forEach(audit => {
        if (audit.code === AuditCode.MULTIPLE_NAMES) return;

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
        );
    });
}

/**
 * Generates the audit view (schedule checker) showing all validation issues.
 * @param mode - Application mode (must be SCHEDULE_CHECK).
 * @param auditReport - Complete audit report.
 */
function generateAudit(mode: AppModeType, auditReport: ScheduleAuditReport): void {
    for (const code of Object.values(AuditCode)) {
        if (code === AuditCode.MULTIPLE_NAMES || code === AuditCode.ON_CALL_MULTIPLE_NAMES) {
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

/** Programmatically updates footer to have current year. */
function footerDate(): void {
    const footer = document.querySelector("footer");
    if (!footer) {
        console.error("Footer not in DOM!");
        return;
    }
    footer.textContent = `© ${new Date().getFullYear()} Leon Poon. All Rights Reserved.`;
}
footerDate();
