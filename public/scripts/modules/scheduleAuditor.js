/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("../types.d.ts").ScheduleAuditReport} ScheduleAuditReport */

import { ScheduleMetricsAuditor } from "./scheduleMetrics.js";
import { ScheduleValidationAuditor } from "./scheduleValidation.js";

export class ScheduleAuditor {

    #validationAuditor;
    #metricsAuditor;

    constructor() {
        this.#validationAuditor = new ScheduleValidationAuditor();
        this.#metricsAuditor = new ScheduleMetricsAuditor();
    }

    /**
    * @param {Shift[]} allShifts 
    * @param {Roster} roster 
    * @param {number} holidayCount 
    * @returns {ScheduleAuditReport}
    */
    auditSchedule(allShifts, roster, holidayCount) {
        return {
            validationIssues: this.#validationAuditor.auditSchedule(allShifts, roster, holidayCount),
            metrics: this.#metricsAuditor.calculateScheduleMetrics(allShifts, roster),
        }
    }
}
