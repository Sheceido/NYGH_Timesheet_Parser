/** @typedef {import("../../parser.js").Shift} Shift */
import { capitalizeArray, getDateByColumn, alphabetColumn } from "../../utils.js";

export class WarningTable extends HTMLElement {
    #shadowRoot;
    css = `
        * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
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
            grid-template-rows: auto;
            overflow: clip;
            box-shadow: 0 0.1em 0.5em #eee;
        }
    `;

    warningBox;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);
    }

    /**
    * @param {Shift[]} shifts 
    * @param {string} warningTitle
    * @param {string[]} headers 
    */
    Render(shifts, warningTitle, headers, color) {
        if (shifts.length < 1) return;

        this.warningBox = document.createElement("div");
        this.warningBox.classList.add("warningBox");
        this.warningBox.style.boxShadow = `0em 0.1em 0.5em #eee`;

        const h3 = document.createElement("h3");
        h3.textContent = warningTitle;

        const titleBox = document.createElement("div");
        titleBox.classList.add("titleBox");
        titleBox.style.background = `linear-gradient(${color}, white)`;
        titleBox.appendChild(h3);
        this.warningBox.appendChild(titleBox);

        const listBox = document.createElement("div");
        listBox.classList.add("listBox");

        const errorListEl = this.BuildShiftErrorElement(shifts, headers);
        listBox.appendChild(errorListEl);

        this.warningBox.appendChild(listBox);
        this.#shadowRoot.appendChild(this.warningBox);
    }

    /**
    * @param {Shift[]} shifts 
    * @param {string[]} headers 
    * @returns {HTMLUListElement}
    */
    BuildShiftErrorElement(shifts, headers) {
        const ul = document.createElement("ul");

        const items = shifts.map(s => {
            let li = document.createElement("li");

            const name = capitalizeArray(s.names[s.names.length - 1].split(" "));
            const location = s.location;
            const shiftTime = s.shiftTime;

            const date = getDateByColumn(s, headers);
            const alphaCol = alphabetColumn(s.coordinate.col);
            const excelRow = s.coordinate.row + 1;

            li.textContent = `${name}: [${alphaCol}${excelRow}] on ${date}, ${shiftTime} @ ${location} ❌`;
            return li;
        });

        ul.append(...items);
        return ul;
    }
}

customElements.define("warning-table", WarningTable);
