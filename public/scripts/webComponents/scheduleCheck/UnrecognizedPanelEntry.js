import { capitalizeArray } from "../../utils.js";
import { WARNING_COLORS } from "../../constants.js";
/** @typedef {import("../../parser.js").Shift} Shift */

export class UnrecognizedPanelEntry extends HTMLElement {

    #shadowRoot;
    css = `
        button {
            width: 150px;
            padding-inline: 1em;
            padding-block: 0.5em;
            margin: 0.2em;
            font-family: sans-serif;
            background-color: white;
            border: 1px solid #ddd;
            border-radius: 3px;
        }
        button:hover {
            cursor: pointer;
            background-color: ${WARNING_COLORS.lightRed};
        }
        button:focus {
            background-color: ${WARNING_COLORS.lightRed};
        }
    `;
    panelEntry;
    _name;
    _shifts;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);

        this.panelEntry = document.createElement("button");
        this.#shadowRoot.appendChild(this.panelEntry);
    }

    /**
    * @param {string} name 
    * @param {Shift[]} shifts 
    * @param {() => void} searchCells
    * @param {() => void} changeSelectState
    */
    initEntry(name, shifts, searchCells, changeSelectState) {
        this._name = name;
        this.panelEntry.textContent = capitalizeArray(name.split(" ")) + " " + `(${shifts.length})`;
        this._shifts = shifts;
        this.addOnClickFn(searchCells, changeSelectState);
    }

    /**
    * @param {() => void} searchCells
    * @param {() => void} changeSelectState
    */
    addOnClickFn(searchCells, changeSelectState) {
        this.panelEntry.onclick = () => {
            searchCells(this._shifts);
            changeSelectState();
        }
    }
}

customElements.define("unrecognized-panel-entry", UnrecognizedPanelEntry);
