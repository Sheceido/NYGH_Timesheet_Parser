/** @typedef {import("../types.d.ts").InputError} InputError */
/** @typedef {import("../types.d.ts").ValidationError} ValidationError */
/** @typedef {import("../types.d.ts").AppMode} AppMode */
/** @typedef {import("../types.d.ts").EmployeeMetrics} EmployeeMetrics */
/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */

import { ErrorFieldsId } from "../data/constants.js";

export class Renderer {
    /**
     * @param {string} id 
     * @param {string} header 
     * @param {ValidationError[]} validationErrors 
     */
    static updateElementValidationErrorField(id, header, validationErrors) {
        document.querySelectorAll(id).forEach(el => {
            if (!el) {
                console.error(`Provided id "${id}" does not correspond to a defined DOM element.`);
                return
            }
            const errMsgs = [
                header,
                ...validationErrors.map(err => `${err.code}: ${err.message}`),
            ];
            el.style.whiteSpace = "pre-line";
            el.textContent = errMsgs.join("\n");
        });

    }

    /** @param {InputError[]} inputErrors  */
    static updateAllInputErrorFields(inputErrors) {
        if (inputErrors.length < 1) {
            console.error("Expected non-zero list of input errors");
            return;
        }

        inputErrors.forEach(err => {
            document.querySelectorAll(err.errorField).forEach(errorEl => {
                errorEl.textContent = err.message;
            });
        });
    }

    static clearAllInputErrorFields() {
        for (const [_, id] of Object.entries(ErrorFieldsId)) {
            document.querySelectorAll(id).forEach(el => {
                if (!el) {
                    console.error(`Expected element with id ${v}, found ${el} `);
                    return;
                }
                el.innerHTML = "";
            });
        }
    }

    renderAuditTable() { }

    /**
     * @param {string} elementId 
     * @param {string} icon
     * @param {string} header
     * @param {AuditEntry[]} auditEntries
     */
    static renderAuditEntriesCard(elementId, icon, header, auditEntries) {
        const renderContainer = document.querySelector(elementId);
        if (!renderContainer) {
            console.error(`Undefined parent container query by id "${elementId}" when attempting to render an Audit Entry Card"`);
            return;
        }

        const auditEntryCard = document.createElement("audit-entries-card");
        auditEntryCard.data = {
            icon: icon,
            header: header,
            auditEntries: auditEntries,
        }

        renderContainer.appendChild(auditEntryCard);
    }

    /**
     * @param {string} elementId 
     * @param {string[]} header 
     * @param {EmployeeMetrics} metric 
     */
    static renderTimesheet(elementId, header, metric) {
        const renderContainer = document.querySelector(elementId);
        if (!renderContainer) {
            console.error(`Undefined parent container query by id "${elementId}" when attempting to render Timesheet."`);
            return;
        }

        const timesheetTable = document.createElement("timesheet-table");
        timesheetTable.data = { header: header, metrics: metric };

        renderContainer.appendChild(timesheetTable);
    }

    static highlightTimesheetIssue(shiftId) {
        /** @type {HTMLElement[]} foundCells */
        const foundCells = document.querySelectorAll(`.id-${shiftId}`);
        if (foundCells.length < 1) return;

        foundCells.forEach(el => el.classList.add("conflict-bg-color"));
    }

    /** @param {AppMode} mode */
    static clearStaleContainer(mode) {
        const staleContainer = document.querySelector(mode);
        staleContainer.replaceChildren();
    }
}
