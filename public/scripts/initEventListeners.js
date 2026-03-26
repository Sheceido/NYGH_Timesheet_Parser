/** @typedef {import("./types.js").AppMode} AppMode */
import { auditSchedule } from "./main.js";
import { MODE_SELECTION_CHANGE, ANALYZE_SCHEDULE, MODAL_OPEN, MODAL_CLOSE, AppMode } from "./data/constants.js";
import { InputValidator } from "./modules/inputValidator.js";
import { Renderer } from "./modules/renderer.js";

export function initDocumentEventListeners() {
    modeChangeListener();
    analyzeScheduleListener();
    modalScheduleEventsListener();
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

function modalScheduleEventsListener() {
    const modalBackdrop = document.getElementById("backdrop");
    if (!modalBackdrop) {
        console.error("Unexpected undefined modal backdrop element when querying 'backdrop'.");
        return;
    }

    /** @param {string[]} shiftIDs  */
    function openModal(shiftIDs) {
        modalBackdrop.classList.add("is-open");
        backdrop.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const container = modalBackdrop.querySelector(".dialog-inner");

        if (shiftIDs.length < 1) {
            container.scrollTop = 0;

        } else {
            const target = container.querySelector(`[id="${shiftIDs[0]}"]`);
            const targetOffset = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
            // scroll to first affected shift into view
            container.scrollTo({ top: (targetOffset - 300), behavior: 'smooth' });
        }


        Renderer.clearSpreadsheetHighlights();
        Renderer.highlightSpreadsheetCells(shiftIDs);
    }

    function closeModal() {
        modalBackdrop.classList.remove("is-open");
        backdrop.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });

    document.addEventListener(MODAL_OPEN, (e) => openModal(e.detail.shiftIds));
    document.addEventListener(MODAL_CLOSE, (_) => closeModal());
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && backdrop.classList.contains("is-open")) {
            closeModal();
        }
    });
}
