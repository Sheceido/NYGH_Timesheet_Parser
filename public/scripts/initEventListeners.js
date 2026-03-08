/** @typedef {import("./types.js").AppMode} AppMode */

import { auditSchedule } from "./main.js";
import { MODE_SELECTION_CHANGE, SYNC_PASTE_AREA, ANALYZE_SCHEDULE, AppMode } from "./data/constants.js";
import { InputValidator } from "./modules/inputValidator.js";
import { Renderer } from "./modules/renderer.js";

export function initDocumentEventListeners() {
    modeChangeListener();
    textAreaSyncListener();
    analyzeScheduleListener();
}

function modeChangeListener() {
    document.addEventListener(MODE_SELECTION_CHANGE, (e) => {
        /** @type {string} selectionId */
        const selectionId = e.detail.id;
        if (!selectionId) {
            console.error(`Error on event [${MODE_SELECTION_CHANGE}]: selection element ID not provided.`);
            return;
        }

        const otherMode = (selectionId === "#timesheetMakerMode")
            ? AppMode.SCHEDULE_CHECK
            : AppMode.TIMESHEET;
        document.querySelector(otherMode).classList.add("not-visible");

        // Show selected mode
        document.querySelector(selectionId).classList.remove("not-visible");

        // update mode change in control-panel attribute
        const controlPanel = document.querySelector("control-panel");
        if (!controlPanel) {
            console.error("control-panel element was undefined during mode-selection-change!");
            return;
        }
        controlPanel.setAttribute("mode", selectionId);
    });

}

function textAreaSyncListener() {
    document.addEventListener(SYNC_PASTE_AREA, (e) => {
        document.querySelectorAll(".pasteArea").forEach(el => {
            if (el.value !== e.detail) {
                el.value = e.detail
            }
        });
    });
}

function analyzeScheduleListener() {
    document.addEventListener(ANALYZE_SCHEDULE, (e) => {
        /** @type {AppMode} mode */
        const mode = e.detail;

        Renderer.clearAllInputErrorFields();
        const inputVal = new InputValidator();

        const errors = inputVal.validateInputFields();
        if (errors.length > 0) {
            Renderer.updateAllInputErrorFields(errors);
            return;
        }

        Renderer.clearAllInputErrorFields();
        auditSchedule(mode);
    });
}
