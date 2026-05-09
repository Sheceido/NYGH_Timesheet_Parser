import type { AppMode as AppModeType } from "./types.js";
import { auditSchedule } from "./main.js";
import {
    MODE_SELECTION_CHANGE,
    ANALYZE_SCHEDULE,
    MODAL_OPEN,
    MODAL_CLOSE,
    AppMode,
} from "./data/constants.js";
import { InputValidator } from "./modules/inputValidator.js";
import { Renderer } from "./modules/renderer.js";

export function initDocumentEventListeners(): void {
    modeChangeListener();
    analyzeScheduleListener();
    modalScheduleEventsListener();
}

function modeChangeListener(): void {
    document.addEventListener(MODE_SELECTION_CHANGE, (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string }>;
        const selectionId = customEvent.detail.id;
        if (!selectionId) {
            console.error(`Error on event [${MODE_SELECTION_CHANGE}]: selection element ID not provided.`);
            return;
        }

        const otherMode =
            selectionId === "#timesheetMakerMode"
                ? AppMode.SCHEDULE_CHECK
                : AppMode.TIMESHEET;
        const otherElement = document.querySelector(otherMode) as HTMLElement | null;
        if (otherElement) otherElement.classList.add("not-visible");

        const selectedElement = document.querySelector(selectionId) as HTMLElement | null;
        if (selectedElement) selectedElement.classList.remove("not-visible");

        const controlPanel = document.querySelector("control-panel") as HTMLElement & { setAttribute: (attr: string, value: string) => void } | null;
        if (!controlPanel) {
            console.error("control-panel element was undefined during mode-selection-change!");
            return;
        }
        controlPanel.setAttribute("mode", selectionId);
    });
}

function analyzeScheduleListener(): void {
    document.addEventListener(ANALYZE_SCHEDULE, (e: Event) => {
        const mode = (e as CustomEvent<AppModeType>).detail;

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

function modalScheduleEventsListener(): void {
    const modalBackdrop = document.getElementById("backdrop") as HTMLDivElement | null;
    if (!modalBackdrop) {
        console.error("Unexpected undefined modal backdrop element when querying 'backdrop'.");
        return;
    }

    function openModal(shiftIDs: string[]): void {
        modalBackdrop.classList.add("is-open");
        modalBackdrop.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        const container = modalBackdrop.querySelector(".dialog-inner") as HTMLElement | null;
        if (!container) return;

        if (shiftIDs.length < 1) {
            container.scrollTop = 0;
        } else {
            const target = container.querySelector(`[id="${shiftIDs[0]}"]`) as HTMLElement | null;
            if (target) {
                const targetOffset =
                    target.getBoundingClientRect().top -
                    container.getBoundingClientRect().top +
                    container.scrollTop;
                container.scrollTo({ top: targetOffset - 300, behavior: "smooth" });
            }
        }

        Renderer.clearSpreadsheetHighlights();
        Renderer.highlightSpreadsheetCells(shiftIDs);
    }

    function closeModal(): void {
        modalBackdrop.classList.remove("is-open");
        modalBackdrop.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    modalBackdrop.addEventListener("click", (e: MouseEvent) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });

    document.addEventListener(MODAL_OPEN, (e: Event) => {
        const detail = (e as CustomEvent<{ shiftIds: string[] }>).detail;
        openModal(detail.shiftIds);
    });

    document.addEventListener(MODAL_CLOSE, () => closeModal());

    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape" && modalBackdrop.classList.contains("is-open")) {
            closeModal();
        }
    });
}
