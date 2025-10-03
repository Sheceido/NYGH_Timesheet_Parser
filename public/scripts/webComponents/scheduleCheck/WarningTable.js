/** @typedef {import("../../parser.js").Shift} Shift */
import { capitalizeArray, getDateByColumn, alphabetColumn } from "../../utils.js";

export class WarningTable extends HTMLElement {
    #shadowRoot;
    css = `
        * {
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        h4 {
            margin: unset;
            padding-inline-start: 1em;
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
        }
        li {
            margin-bottom: 1.2em;
            font-size: 1.2rem;
            list-style-type: none;
            border-left: 4px solid #ff7f7f;
            padding-left: 1em;
            padding-top: 0.5em;
            box-shadow: 0 0 0.2em #eee;
        }
        .warningBox {
            border-radius: 0.5em;
            display: grid;
            grid-template-rows: auto;
            box-shadow: 0 0 0.5em #eee;
            padding-top: 1em;
            padding-inline: 1em;
        }
        .subInfo {
            margin-top: 0.5em;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(2, 1fr);

            p {
                font-size: 0.9rem;
                min-width: 7em;
                text-align: center;
                padding-inline: 0.5em;
                padding-block: 0.2em;
                margin: 0;
            }
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
        this.warningBox.style.borderTop = `0.2em solid ${color}`;

        const h4 = document.createElement("h4");
        h4.textContent = warningTitle;

        const titleBox = document.createElement("div");
        titleBox.classList.add("titleBox");
        titleBox.appendChild(h4);
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
        const excelSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16"><g fill="none" stroke="#a6da95" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 3.13c0-.77.86-1.63 1.62-1.63h9.76c.76 0 1.62.86 1.62 1.63v9.75c0 .76-.86 1.62-1.62 1.62H4.13c-.77 0-1.63-.86-1.63-1.62M.5 5.5l4 5m0-5l-4 5"/><path d="M7.5 5.5h5v5h-5zm2 0v5m-2-3h5"/></g></svg>`;
        const ul = document.createElement("ul");

        const items = shifts.map(s => {
            let li = document.createElement("li");

            const name = capitalizeArray(s.names[s.names.length - 1].split(" "));
            const location = s.location;
            const shiftTime = s.shiftTime;

            const date = getDateByColumn(s, headers);
            const alphaCol = alphabetColumn(s.coordinate.col);
            const excelRow = s.coordinate.row + 1;

            li.textContent = `${name}`

            const subInfo = document.createElement("div");
            subInfo.classList.add("subInfo");
            subInfo.append(...
                [
                    `📅`,
                    `🕓`,
                    `📍`,
                    `${excelSVG}`,
                    `${date}`,
                    `${shiftTime}`,
                    `${location}`,
                    `[${alphaCol} ${excelRow}]`,
                ].map(str => {
                    const entry = document.createElement("p");
                    entry.innerHTML = str;
                    return entry;
                })
            )
            li.appendChild(subInfo);

            return li;
        });

        ul.append(...items);
        return ul;
    }
}

customElements.define("warning-table", WarningTable);
