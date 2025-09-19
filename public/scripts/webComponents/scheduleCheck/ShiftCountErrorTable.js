/**
 * @typedef {import("../../parser.js").Shift} Shift
 * @typedef {import("../../warnings.js").EmployeeShiftCount} EmployeeShiftCount
 * @typedef {import("../../roster.js").Roster} Roster
 **/
import { capitalizeArray } from "../../utils.js";
import { roster } from "../../roster.js";
import { FTR_HRS } from "../../constants.js";

export class ShiftCountErrorTable extends HTMLElement {
    #shadowRoot;
    css = `
        * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        .tableContainer {
            display: grid;
            gap: 1em;
            grid-template-columns: repeat(3, 1fr);
            max-inline-size: 1500px;
            margin-block: 1em;
        }
        h3 {
            margin: unset;
            padding-inline-start: 2em;
            text-transform: capitalize;
        }
        .titleBox {
            width: 100%;
            height: 100%;
            border-bottom: 1px solid #eee;
            border-top-left-radius: 0.5em;
            border-top-right-radius: 0.5em;
            padding-block: 1em;
            background: linear-gradient(#FF5C5C, white);
        }
        .listBox {
            max-width: 90%;
            padding-inline-start: 2em;

        }
        li {
            margin-bottom: 0.8em;
        }
        .warningBox {
            border: 1px solid #eee;
            border-radius: 0.5em;
            display: grid;
            grid-row: span 3;
            grid-template-rows: subgrid;
            overflow: clip;
            box-shadow: 0 0.1em 0.5em #eee;
        }
    `;

    overScheduled;
    underScheduled;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);
    }

    /**
    * @param {EmployeeShiftCount} employeeShiftCount 
    * @param {*} statCount 
    */
    Render(employeeShiftCount, statCount) {
        this.overScheduled = document.createElement("div");
        this.overScheduled.classList.add("warningBox");

        this.underScheduled = document.createElement("div");
        this.underScheduled.classList.add("warningBox");

        const { overUl, underUl } = this.BuildShiftErrorElement(employeeShiftCount);

        this.CreateListContainer(this.overScheduled, `⬆️ Too Many Shifts (expected: ${FTR_HRS - statCount})`, overUl);
        this.CreateListContainer(this.underScheduled, `⬇️ Missing Shifts (expected: ${FTR_HRS - statCount})`, underUl);

        const tableContainer = document.createElement("div");
        tableContainer.classList.add("tableContainer");
        tableContainer.append(this.overScheduled, this.underScheduled)

        this.#shadowRoot.appendChild(tableContainer);
    }

    /**
     * @param {HTMLElement} parent 
     * @param {string} title 
     * @param {HTMLUListElement} ul 
     */
    CreateListContainer(parent, title, ul) {
        const h3 = document.createElement("h3");
        h3.textContent = title;

        const titleBox = document.createElement("div");
        titleBox.classList.add("titleBox");
        titleBox.appendChild(h3);

        const listBox = document.createElement("div");
        listBox.classList.add("listBox");
        listBox.appendChild(ul);

        parent.append(titleBox, listBox);
    }

    /**
    * @param {EmployeeShiftCount} employeeShiftCount 
    */
    BuildShiftErrorElement(employeeShiftCount) {

        const over = [];
        const under = [];
        for (const [name, employee] of Object.entries(roster)) {
            let shiftCount = employeeShiftCount.get(employee.str_alias);

            if (!shiftCount || !shiftCount.isFTR) continue;

            if (shiftCount.found === 0) continue;

            if (!shiftCount) {
                under.push(`${capitalizeArray(name.split(" "))} (0 shifts) ❌`);
            }

            if (shiftCount.found > 0) {
                over.push(`${capitalizeArray(name.split(" "))} (${shiftCount.expected + shiftCount.found} shifts) ❌`);
            }
            if (shiftCount.found < 0) {
                under.push(`${capitalizeArray(name.split(" "))} (${shiftCount.expected + shiftCount.found} shifts) ❌`);
            }
        }

        let overUl = document.createElement("ul");
        over.map(o => {
            let li = document.createElement("li");
            li.textContent = o;
            overUl.appendChild(li);
        });

        let underUl = document.createElement("ul");
        under.map(o => {
            let li = document.createElement("li");
            li.textContent = o;
            underUl.appendChild(li);
        });

        if (over.length < 1) {
            overUl = document.createElement("p");
            overUl.textContent = "No employee over scheduled! ✅"
        }

        if (under.length < 1) {
            underUl = document.createElement("p");
            underUl.textContent = "No employee under scheduled! ✅"
        }

        return { overUl, underUl };
    }
}

customElements.define("shift-count-error-table", ShiftCountErrorTable);
