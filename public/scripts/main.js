/** custom web component definition imports for DOM instantiation */
import { ModeSelectTab } from "./webComponents/modeSelectTab.js";
import { PasteArea } from "./webComponents/pasteArea.js";
import { ControlPanel } from "./webComponents/controlPanel.js";
import { AuditEntriesCard } from "./webComponents/auditEntriesCard.js";
import { AuditEmployeeShiftCount } from "./webComponents/auditEmployeeShiftCount.js";
import { AuditAvailability } from "./webComponents/auditAvailability.js";
import { AuditShiftConflict, AuditShiftConflictCard } from "./webComponents/auditShiftConflict.js";

/** @typedef {import('./types.d.ts').ScheduleAuditReport} ScheduleAuditReport */

import { initDocumentEventListeners } from "./initEventListeners.js";
import { ScheduleParser } from "./modules/scheduleParser.js";
import { ScheduleValidator } from "./modules/scheduleValidator.js";
import { ScheduleAnalyzer } from "./modules/scheduleAnalyzer.js";
import { ScheduleMetricsAuditor } from "./modules/scheduleMetrics.js";
import { ScheduleValidationAuditor } from "./modules/scheduleValidation.js";
import { Renderer } from "./modules/renderer.js";
import { CASUAL_ROSTER, ROSTER } from "./data/roster.js";
import { AuditCode } from "./data/constants.js";


// Initialize event listeners for interactivity between web components
initDocumentEventListeners();

// main function trigger when event is triggered to ANALYZE_SCHEDUL
export function auditSchedule() {

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
        employeeMetrics: metrics.calculateScheduleMetrics(analyzer.shiftList, { ...ROSTER, ...CASUAL_ROSTER }),
    }

    console.log(auditReport);

    Renderer.clearAuditEntries();

    Renderer.renderAuditEntriesCard(
        "▲",
        "Too Many Shifts",
        auditReport.validationIssues.filter(ae => ae.code === AuditCode.FTR_OVER_SCHEDULED),
    );

    Renderer.renderAuditEntriesCard(
        "▼",
        "Missing Shifts",
        auditReport.validationIssues.filter(ae => ae.code === AuditCode.FTR_UNDER_SCHEDULED),
    );

    Renderer.renderAuditEntriesCard(
        "⚠️",
        "Duplicate Shifts",
        auditReport.validationIssues.filter(ae => ae.code === AuditCode.DUPLICATE_EMPLOYEE),
    );

    Renderer.renderAuditEntriesCard(
        "♂️",
        "Evening Male Tech Conflicts",
        auditReport.validationIssues.filter(ae => ae.code === AuditCode.MALE_CONFLICT),
    );

    Renderer.renderAuditEntriesCard(
        "🚫",
        "Not Available Conflicts",
        auditReport.validationIssues.filter(ae => ae.code === AuditCode.NOT_AVAILABLE),
    );

}
