import { AppMode, MODE_SELECTION_CHANGE } from "../data/constants.js";

/**
 * Custom HTML element that renders two tab buttons:
 * - Timesheet Maker
 * - Schedule Checker
 * Dispatches a `MODE_SELECTION_CHANGE` event when a tab is clicked,
 * containing the selected mode ID.
 */
export class ModeSelectTab extends HTMLElement {
    constructor() {
        super();
    }

    /**
     * Lifecycle callback – renders the component when added to the DOM.
     */
    connectedCallback(): void {
        this._render();
    }

    /**
     * Renders the tab buttons and attaches click event listeners.
     * Dispatches custom events to notify other components of mode changes.
     * @private
     */
    private _render(): void {
        this.innerHTML = `
            <div class="tabs">
                <button id="timesheetBtn" class="tab active">Timesheet Maker</button>
                <button id="scheduleCheckerBtn" class="tab">Schedule Checker</button>
            </div>
        `;

        const timesheetBtn = this.querySelector("#timesheetBtn") as HTMLButtonElement | null;
        const schedCheckBtn = this.querySelector("#scheduleCheckerBtn") as HTMLButtonElement | null;

        if (!timesheetBtn || !schedCheckBtn) {
            console.error("Unable to select timesheet or schedule checker button.");
            return;
        }

        timesheetBtn.addEventListener("click", () => {
            schedCheckBtn.classList.remove("active");
            timesheetBtn.classList.add("active");

            document.dispatchEvent(new CustomEvent(MODE_SELECTION_CHANGE, {
                detail: { id: AppMode.TIMESHEET },
                bubbles: true,
            }));
        });

        schedCheckBtn.addEventListener("click", () => {
            timesheetBtn.classList.remove("active");
            schedCheckBtn.classList.add("active");

            document.dispatchEvent(new CustomEvent(MODE_SELECTION_CHANGE, {
                detail: { id: AppMode.SCHEDULE_CHECK },
                bubbles: true,
            }));
        });
    }
}

// Register the custom element with the browser
customElements.define("mode-select-tab", ModeSelectTab);
