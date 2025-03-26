import { capitalizeArray } from "../../utils.js";
import { WARNING_COLORS } from "../../constants.js";
/** @typedef {import("../../parser.js").Shift} Shift */

export class UnrecognizedPanelEntry extends HTMLElement {

    #shadowRoot;
    css = `
        .btnBox {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
        }
        button {
            display: flex;
            justify-content: center;
            align-items: center;
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
            background-color: ${WARNING_COLORS.pastelTeal};
        }
        button:focus {
            background-color: ${WARNING_COLORS.pastelTeal};
        }
    `;
    panelEntry;
    deleteBtn;
    parentContainer;
    _name;
    _shifts;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);

        const btnBox = document.createElement("div");
        btnBox.classList.add("btnBox");
        this.panelEntry = document.createElement("button");
        btnBox.appendChild(this.panelEntry);

        this.deleteBtn = document.createElement("button");
        this.deleteBtn.style.width = "fit-content";
        this.deleteBtn.style.height = "fit-content";
        this.deleteBtn.style.padding = "0.2em";
        this.deleteBtn.style.margin = 0;
        this.deleteBtn.style.border = "none";

        const img = new Image(20, 20);
        img.src = "./images/icons8-delete-48.png";
        this.deleteBtn.appendChild(img);

        btnBox.appendChild(this.deleteBtn);

        this.#shadowRoot.appendChild(btnBox);
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
        this.deleteBtn.onclick = () => {
            this.parentNode.removeChild(this);
        }
    }
}

customElements.define("unrecognized-panel-entry", UnrecognizedPanelEntry);
