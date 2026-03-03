/** @typedef {import("../types.d.ts").InputError} InputError */
/** @typedef {import("../types.d.ts").ValidationError} ValidationError */
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
     * @param {string} icon
     * @param {string} header
     * @param {AuditEntry[]} auditEntries
     */
    static renderAuditEntriesCard(icon, header, auditEntries) {
        const alertContainer = document.querySelector(".alerts");

        const auditEntryCard = document.createElement("audit-entries-card");
        auditEntryCard.data = {
            icon: icon,
            header: header,
            auditEntries: auditEntries,
        }

        alertContainer.appendChild(auditEntryCard);
    }

    static clearAuditEntries() {
        const alertContainer = document.querySelector(".alerts");
        alertContainer.replaceChildren();
    }

    renderSchedule() { }

    filterSchedule() { }

}
