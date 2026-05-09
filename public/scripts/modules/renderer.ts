import type { InputError, ValidationError, AppMode, EmployeeMetrics, AuditEntry } from "../types.js";
import { ErrorFieldsId } from "../data/constants.js";

export class Renderer {
    /**
     * Updates all elements matching `id` with validation error messages.
     * @param id - CSS selector for the target elements.
     * @param header - Heading text displayed before the error list.
     * @param validationErrors - Array of validation errors to display.
     */
    static updateElementValidationErrorField(id: string, header: string, validationErrors: ValidationError[]): void {
        document.querySelectorAll(id).forEach(el => {
            const errMsgs = [
                header,
                ...validationErrors.map(err => `${err.code}: ${err.message}`),
            ];
            (el as HTMLElement).style.whiteSpace = "pre-line";
            (el as HTMLElement).textContent = errMsgs.join("\n");
        });
    }

    /**
     * Displays input validation errors in their corresponding fields.
     * @param inputErrors - List of input errors.
     */
    static updateAllInputErrorFields(inputErrors: InputError[]): void {
        if (inputErrors.length < 1) {
            console.error("Expected non-zero list of input errors");
            return;
        }

        inputErrors.forEach(err => {
            document.querySelectorAll(err.errorField).forEach(errorEl => {
                (errorEl as HTMLElement).textContent = err.message;
            });
        });
    }

    /**
     * Clears all input error fields (resets their HTML content).
     */
    static clearAllInputErrorFields(): void {
        for (const [, id] of Object.entries(ErrorFieldsId)) {
            document.querySelectorAll(id).forEach(el => {
                if (!el) {
                    console.error(`Expected element with id ${id}, found ${el}`);
                    return;
                }
                (el as HTMLElement).innerHTML = "";
            });
        }
    }

    /**
     * Renders an audit entries card inside the specified container.
     * @param elementId - ID of the container element (including `#`).
     * @param icon - Icon text/emoji for the card.
     * @param header - Card header text.
     * @param auditEntries - List of audit entries to display.
     */
    static renderAuditEntriesCard(elementId: string, icon: string, header: string, auditEntries: AuditEntry[]): void {
        const renderContainer = document.querySelector(elementId);
        if (!renderContainer) {
            console.error(`Undefined parent container query by id "${elementId}" when attempting to render an Audit Entry Card"`);
            return;
        }

        const auditEntryCard = document.createElement("audit-entries-card") as HTMLElement & { data: any };
        auditEntryCard.data = {
            icon: icon,
            header: header,
            auditEntries: auditEntries,
        };

        renderContainer.appendChild(auditEntryCard);
    }

    /**
     * Renders a timesheet table for an employee inside the specified container.
     * @param elementId - ID of the container element (including `#`).
     * @param header - Column headers for the timesheet.
     * @param metric - Employee metrics (scheduled shifts, standby hours, etc.).
     */
    static renderTimesheet(elementId: string, header: string[], metric: EmployeeMetrics): void {
        const renderContainer = document.querySelector(elementId);
        if (!renderContainer) {
            console.error(`Undefined parent container query by id "${elementId}" when attempting to render Timesheet."`);
            return;
        }

        const timesheetTable = document.createElement("timesheet-table") as HTMLElement & { data: any };
        timesheetTable.data = { header: header, metrics: metric };

        renderContainer.appendChild(timesheetTable);
    }

    /**
     * Highlights a timesheet cell corresponding to a given shift ID.
     * @param shiftId - ID of the shift to highlight.
     */
    static highlightTimesheetIssue(shiftId: string): void {
        const timesheetTable = document.querySelector("timesheet-table");
        if (!timesheetTable) {
            console.error("timesheet-table element is undefined in DOM!");
            return;
        }

        const foundCells = timesheetTable.querySelectorAll(`[id="${shiftId}"]`) as NodeListOf<HTMLElement>;
        if (foundCells.length < 1) return;

        foundCells.forEach(el => el.classList.add("shift-highlight"));
    }

    /**
     * Clears the contents of a container identified by the current application mode.
     * @param mode - CSS selector of the container (e.g., "#timesheetMakerMode").
     */
    static clearStaleContainer(mode: AppMode): void {
        const staleContainer = document.querySelector(mode);
        if (staleContainer) {
            staleContainer.replaceChildren();
        }
    }

    /**
     * Highlights spreadsheet cells corresponding to the given shift IDs.
     * @param shiftIDs - Array of shift IDs to highlight.
     */
    static highlightSpreadsheetCells(shiftIDs: string[]): void {
        if (shiftIDs.length < 1) {
            console.warn(`No shiftIDs were provided in argument to highlight spreadsheet cells.`);
            return;
        }

        const modalSpreadsheetEl = document.querySelector("schedule-spreadsheet");
        if (!modalSpreadsheetEl) {
            console.error("Modal spreadsheet undefined in DOM!");
            return;
        }

        shiftIDs.forEach(id => {
            const cell = modalSpreadsheetEl.querySelector(`[id="${id}"]`) as HTMLElement | null;
            if (!cell) {
                console.error(`Unable to find cell in spreadsheet with shift id "${id}".`);
                return;
            }

            cell.classList.add("shift-highlight");
        });
    }

    /**
     * Clears all cell highlights in the schedule spreadsheet and fades all but the shift time column.
     */
    static clearSpreadsheetHighlights(): void {
        const modalSpreadsheetEl = document.querySelector("schedule-spreadsheet");
        if (!modalSpreadsheetEl) {
            console.error("Modal spreadsheet undefined in DOM!");
            return;
        }

        const cells = modalSpreadsheetEl.querySelectorAll("td") as NodeListOf<HTMLTableCellElement>;
        if (cells.length < 1) {
            console.error("No cells were found in spreadsheet to clear highlights!");
            return;
        }

        cells.forEach(cell => {
            cell.classList.remove("shift-highlight");

            if (cell.cellIndex !== 0) {
                // fade all cells except the shift time column
                cell.classList.add("shift-faded");
            }
        });
    }
}
