import type { AppMode as AppModeType } from "../types.js";
import { AppMode, ANALYZE_SCHEDULE } from "../data/constants.js";

/**
 * Custom HTML element that provides a control panel.
 * Listens to a `mode` attribute to switch between TIMESHEET and SCHEDULE_CHECK.
 */
export class ControlPanel extends HTMLElement {
    buttonTextOpt: Record<AppModeType, string> = {
        [AppMode.TIMESHEET]: "Generate Timesheet",
        [AppMode.SCHEDULE_CHECK]: "Check Schedule",
    };

    buttonText: string | null = null;
    mode: AppModeType | null = null;

    static get observedAttributes(): string[] {
        return ["mode"];
    }

    constructor() {
        super();
    }

    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
        switch (name) {
            case "mode":
                if (newValue === null) return;
                // Validate that the attribute value is one of the allowed modes
                if (newValue !== AppMode.TIMESHEET && newValue !== AppMode.SCHEDULE_CHECK) {
                    console.error(`Invalid mode value: "${newValue}"`);
                    return;
                }

                this.mode = newValue as AppModeType;
                const newBtnText = this.buttonTextOpt[this.mode];
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
        this.render();
    }

    connectedCallback(): void {
        if (this.hasAttribute("mode")) {
            const modeAttr = this.getAttribute("mode");
            if (modeAttr === AppMode.TIMESHEET || modeAttr === AppMode.SCHEDULE_CHECK) {
                this.mode = modeAttr;
            }
        }
        this.render();
    }

    emitEventAuditSchedule(): void {
        document.dispatchEvent(new CustomEvent(ANALYZE_SCHEDULE, {
            detail: this.mode,
            bubbles: true,
        }));
    }

    render(): void {
        if (!this.mode) {
            console.error("Unable to render ControlPanel, undefined mode attribute");
            return;
        }

        const employeeSelect = (this.mode === AppMode.TIMESHEET)
            ? `<employee-selector></employee-selector>`
            : "";

        this.innerHTML = `
            <input id="holidays" placeholder="Holidays" size="6" maxlength="2" />
            ${employeeSelect}
            <button id="auditScheduleBtn" class="btn">${this.buttonText}</button>
        `;

        const auditScheduleBtn = document.getElementById("auditScheduleBtn");
        if (!auditScheduleBtn) {
            console.error(`Invalid id query for "#auditScheduleBtn", element did not exist.`);
            return;
        }
        auditScheduleBtn.onclick = () => this.emitEventAuditSchedule();
    }
}

customElements.define("control-panel", ControlPanel);
