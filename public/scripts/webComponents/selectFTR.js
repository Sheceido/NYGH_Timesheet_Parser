import { roster } from "../roster.js";
import { capitalize } from "../utils.js";
/**
 * @typedef {import("../warnings.js").ShiftCountError} ShiftCountError 
 * @typedef {import("../warnings.js").EmployeeShiftCount} EmployeeShiftCount 
 * @typedef {import("../warnings.js").WarningsGroup} WarningsGroup
 **/

export class SelectFTR extends HTMLElement {

    #shadowRoot;
    css = `
        select {
            padding: 4px;
            width: 250px;
            cursor: pointer;
            margin-inline: 0.5em;
        }
        option {
            font-family: monospace;
            font-size: 1.1em;
        }
    `
    select;
    DUD_VALUE = "---";

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });

        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);

        this.select = document.createElement("select");
        this.#shadowRoot.appendChild(this.select);
    }

    get value() {
        return this.select.value;
    }
    set value(v) {
        this.select.value = v;
    }

    showEmployeeOptions() {
        for (const [fullName, employee] of Object.entries(roster)) {
            const option = document.createElement("option");
            option.value = fullName;
            option.textContent = capitalize(employee.str_alias);
            this.select.appendChild(option);
        }
    }

    /**
     * @param {EmployeeShiftCount} employeeSC 
     */
    showEmployeeAndShiftCount(employeeSC) {
        for (const [fullName, employee] of Object.entries(roster)) {

            // remove prior stale employee option entry
            const staleOption = this.select.querySelector(`option[value="${fullName}"]`);
            if (staleOption) {
                staleOption.remove();
            }
            // create new option with updated shift counts
            const option = document.createElement("option");
            option.value = fullName;

            let employeeShiftCount = employeeSC.get(employee.str_alias);

            const successSpan = document.createElement("span");
            const errorSpan = document.createElement("span");
            successSpan.textContent = " ✅ ";
            errorSpan.textContent = " ❌ ";

            const sp1 = document.createElement("span");
            const sp2 = document.createElement("span");

            sp1.textContent = `${capitalize(employee.str_alias.padEnd(15, '\u00A0'))}`;
            option.append(sp1);

            // When ftr employee does not appear on schedule, flag error
            if (!employeeShiftCount) {
                sp2.textContent = `0 Shifts.`.padStart(10, '\u00A0');
                option.appendChild(errorSpan);
                option.appendChild(sp2);

            } // Display found employee's shift count and success/error indicator
            else {
                sp2.textContent = `${employeeShiftCount.expected + employeeShiftCount.found} Shifts.`.padStart(10, '\u00A0');

                if (employeeShiftCount.found === 0) {
                    option.appendChild(successSpan);
                } else {
                    option.appendChild(errorSpan);
                }
                option.appendChild(sp2);
            }
            this.select.appendChild(option);
        }
    }

    /**
    * @param {() => void} callback 
    */
    addOnChangeFn(callback) {
        if (this.select.value === this.DUD_VALUE) return;
        this.select.onchange = () => callback(this.select.value);
    }

    addDisabledOption() {
        const disabledPrompt = document.createElement("option");
        disabledPrompt.id = "disabledOption";
        disabledPrompt.value = "";
        disabledPrompt.disabled = true;
        disabledPrompt.selected = true;
        disabledPrompt.textContent = "Choose FTR...";

        this.select.prepend(disabledPrompt);
    }

    addShowAllOption() {
        const showAllOption = document.createElement("option");
        showAllOption.value = "ALL";
        showAllOption.selected = true;
        showAllOption.textContent = "View All Employees";

        this.select.prepend(showAllOption);
    }

    addDudOption() {
        const dudOption = document.createElement("option");
        dudOption.value = this.DUD_VALUE;
        dudOption.textContent = this.DUD_VALUE;

        this.select.appendChild(dudOption);
    }

    selectDudOption() {
        this.select.value = this.DUD_VALUE;
    }

    addErrorHighlight() {
        this.select.style.outline = "1px red solid";
    }

    removeErrorHighlight() {
        this.select.style.outline = "";
    }

    hideSelect() {
        this.select.style.display = "none";
    }

    showSelect() {
        this.select.style.display = "block";
    }

    disableSelect() {
        this.select.disabled = true;
        this.removeErrorHighlight();
        this.select.style.cursor = "default";
        this.select.value = "";
    }

    enableSelect() {
        this.select.disabled = false;
        this.select.style.cursor = "pointer";
    }

    selectFirstChild() {
        this.select.value = this.select.firstChild.value;
    }
}

customElements.define("select-ftr", SelectFTR);
