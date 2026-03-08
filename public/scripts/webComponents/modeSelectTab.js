import { AppMode, MODE_SELECTION_CHANGE } from "../data/constants.js";

export class ModeSelectTab extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this._render();
    }

    _render() {
        this.innerHTML = `
        <div class="tabs">
            <button id="timesheetBtn" class="tab active">Timesheet Maker</button>
            <button id="scheduleCheckerBtn" class="tab">Schedule Checker</button>
        </div>`;

        const timesheetBtn = document.querySelector("#timesheetBtn");
        const schedCheckBtn = document.querySelector("#scheduleCheckerBtn");
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

customElements.define("mode-select-tab", ModeSelectTab);
