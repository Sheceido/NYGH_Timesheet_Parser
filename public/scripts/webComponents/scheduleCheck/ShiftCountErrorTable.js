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
            display: flex;
            flex-direction: row;
            align-items: start;
            gap: 1em;
            max-inline-size: 1500px;
            margin-block: 1em;
        }
        h4 {
            margin: unset;
            text-transform: capitalize;
        }
        .titleBox {
            width: 100%;
            height: 100%;
            border-top-left-radius: 0.5em;
            border-top-right-radius: 0.5em;
            padding-block: 0.5em;
            font-size: 1.25rem;
        }
        .listBox {
            padding-inline-start: 0.5em;

            ul {
                padding-left: 0.5em;
            }

            p {
                padding-left: 2em;
            }
        }
        li {
            margin-bottom: 1em;
            font-size: 1.2rem;
            list-style-type: none;
            border-left: 4px solid #ff7f7f;
            padding-block: 0.5em;
            padding-left: 1em;
            box-shadow: 0 0 0.2em #eee;

            display: grid;
            grid-template-columns: repeat(2, 1fr);
            align-items: center;
        
            div {
                padding-inline: 1em;
            }

            .shifts {
                font-size: 0.9rem;
            }
        }
        .warningBox {
            padding-left: 1em;
            padding-right: 2em;
            padding-block: 1em;
            border: 1px solid #eee;
            border-top: 0.2em solid #FF5C5C;
            border-radius: 0.5em;
            display: grid;
            grid-row: span 3;
            box-shadow: 0 0 0.5em #eee;
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

        this.CreateListContainer(this.overScheduled, `🔺 Too Many Shifts (expected: ${FTR_HRS - statCount})`, overUl);
        this.CreateListContainer(this.underScheduled, `🔻 Missing Shifts (expected: ${FTR_HRS - statCount})`, underUl);

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
        const h4 = document.createElement("h4");
        h4.textContent = title;

        const titleBox = document.createElement("div");
        titleBox.classList.add("titleBox");
        titleBox.appendChild(h4);

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
                under.push(`<div>${capitalizeArray(name.split(" "))}</div><div class="shifts">0 shifts ❌</div>`);
            }

            if (shiftCount.found > 0) {
                over.push(`<div>${capitalizeArray(name.split(" "))}</div><div class="shifts">${shiftCount.expected + shiftCount.found} shifts ❌</div>`);
            }
            if (shiftCount.found < 0) {
                under.push(`<div>${capitalizeArray(name.split(" "))}</div><div class="shifts">${shiftCount.expected + shiftCount.found} shifts ❌</div>`);
            }
        }

        let overUl = document.createElement("ul");
        over.map(o => {
            let li = document.createElement("li");
            li.innerHTML = o;
            overUl.appendChild(li);
        });

        let underUl = document.createElement("ul");
        under.map(o => {
            let li = document.createElement("li");
            li.innerHTML = o;
            underUl.appendChild(li);
        });

        if (over.length < 1) {
            overUl = document.createElement("p");
            overUl.textContent = "No employee over-scheduled! ✅"
        }

        if (under.length < 1) {
            underUl = document.createElement("p");
            underUl.textContent = "No employee under-scheduled! ✅"
        }

        return { overUl, underUl };
    }
}

customElements.define("shift-count-error-table", ShiftCountErrorTable);
