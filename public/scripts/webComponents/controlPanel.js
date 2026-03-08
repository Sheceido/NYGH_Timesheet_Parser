import { AppMode, ANALYZE_SCHEDULE } from "../data/constants.js";

export class ControlPanel extends HTMLElement {

    buttonTextOpt = {
        [AppMode.TIMESHEET]: "Generate Timesheet",
        [AppMode.SCHEDULE_CHECK]: "Check Schedule",
    }
    buttonText = null;
    mode = null;

    static get observedAttributes() {
        return ["mode"];
    }

    constructor() {
        super();
    }

    attributeChangedCallback(name, _, newValue) {

        switch (name) {
            case "mode":
                this.mode = newValue;
                const newBtnText = this.buttonTextOpt[newValue];
                if (!newBtnText) {
                    console.error(`Expected mode "${newValue}" to be defined, found ${newBtnText}.`);
                    return;
                }
                this.buttonText = newBtnText;

                break;
            default:
                console.error(`"${name}" attribute not defined in control panel change callback.`);
                break;
        }
        // update control panel UI with changes based on mode change
        this.render();
    }

    connectedCallback() {
        if (this.hasAttribute("mode")) {
            this.mode = this.getAttribute("mode");
        }
        this.render();
    }

    emitEventAuditSchedule() {
        document.dispatchEvent(new CustomEvent(ANALYZE_SCHEDULE, {
            detail: this.mode,
            bubbles: true,
        }));
    }

    /** @param {string} type */
    render() {
        if (!this.mode) {
            console.error("Unable to render ControlPanel, undefined mode attribute");
            return;
        }

        const employeeSelect = (this.mode === AppMode.TIMESHEET)
            ? `<employee-selector></employee-selector>` // refer to EmployeeSelector Custom Component Class
            : "";

        this.innerHTML = `
           <input id="holidays" placeholder="Holidays" size="6" maxlength="2"></input>
           ${employeeSelect}
           <button id="auditScheduleBtn" class="btn">${this.buttonText}</button>
        `;

        const auditScheduleBtn = document.getElementById(`auditScheduleBtn`);
        if (!auditScheduleBtn) {
            console.error(`Invalid id query for "#auditScheduleBtn", element did not exist.`);
            return;
        }
        auditScheduleBtn.onclick = () => this.emitEventAuditSchedule();
    }
}

customElements.define("control-panel", ControlPanel);
