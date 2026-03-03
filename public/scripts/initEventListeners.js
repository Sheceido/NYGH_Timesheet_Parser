import { auditSchedule } from "./main.js";
import { MODE_SELECTION_CHANGE, SYNC_PASTE_AREA, SYNC_HOLIDAYS_INPUT, ANALYZE_SCHEDULE } from "./data/constants.js";
import { InputValidator } from "./modules/inputValidator.js";
import { Renderer } from "./modules/renderer.js";

export function initDocumentEventListeners() {
    modeChangeListener();
    textAreaSyncListener();
    holidaysSyncListener();
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

        const otherMode = selectionId === "#timesheetMakerMode"
            ? "#scheduleCheckerMode"
            : "#timesheetMakerMode";
        document.querySelector(otherMode).classList.add("not-visible");

        // Show selected mode
        document.querySelector(selectionId).classList.remove("not-visible");
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

function holidaysSyncListener() {
    document.addEventListener(SYNC_HOLIDAYS_INPUT, (e) => {
        document.querySelectorAll("#holidays").forEach(el => {
            if (el.value !== e.detail) {
                el.value = e.detail;
            }
        });
    });
}

function analyzeScheduleListener() {
    document.addEventListener(ANALYZE_SCHEDULE, (_) => {

        Renderer.clearAllInputErrorFields();
        const inputVal = new InputValidator();

        const errors = inputVal.validateInputFields();
        if (errors.length > 0) {
            Renderer.updateAllInputErrorFields(errors);
            return;
        }

        Renderer.clearAllInputErrorFields();
        auditSchedule();
    });
}
