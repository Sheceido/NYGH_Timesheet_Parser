import { ANALYZE_SCHEDULE, SYNC_HOLIDAYS_INPUT } from "../data/constants.js";

export class ControlPanel extends HTMLElement {

    buttonText = null;

    static get observedAttributes() {
        return ["textcontent"];
    }

    constructor() {
        super();
    }

    attributeChangedCallback(name, _, newValue) {
        switch (name) {
            case "textcontent":
                this.buttonText = newValue;
                break;
        }
    }

    connectedCallback() {
        if (this.hasAttribute("textcontent")) {
            this.buttonText = this.getAttribute("textcontent");
        }
        this.render();
    }

    syncHolidaysInput(data) {
        document.dispatchEvent(new CustomEvent(SYNC_HOLIDAYS_INPUT, {
            detail: data,
            bubbles: true,
        }));
    }

    emitEventAuditSchedule() {
        document.dispatchEvent(new CustomEvent(ANALYZE_SCHEDULE, {
            bubbles: true,
        }));
    }

    /** @param {string} type */
    render() {
        if (!this.buttonText) {
            console.error("Unable to render ControlPanel, undefined textcontent attribute");
            return;
        }

        this.innerHTML = `
           <input id="holidays" placeholder="Holidays" size="6" maxlength="2"></input>
           <button id="auditScheduleBtn" class="btn" onclick="${this.emitEventAuditSchedule}">${this.buttonText}</button>
           <!-- <div class="select-wrapper"> -->
           <!--   <select> -->
           <!--     <option>Jenny</option> -->
           <!--     <option>Esther</option> -->
           <!--     <option>Erica</option> -->
           <!--   </select> -->
           <!-- </div> -->
           `;

        document.querySelectorAll("#holidays").forEach(input => {
            input.addEventListener("input", (e) => this.syncHolidaysInput(e.target.value));
        });

        document.querySelectorAll("#auditScheduleBtn").forEach(btn => {
            btn.onclick = () => this.emitEventAuditSchedule();
        });
    }
}

customElements.define("control-panel", ControlPanel);
