import { roster } from "../roster.js";

export class SelectFTR extends HTMLElement {
    
    #shadowRoot;
    css = `
        select {
            padding: 4px;
            cursor: pointer;
            margin-inline: 0.5em;
        }
    `

    select;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);

        this.select = document.createElement("select");
        this.select.name = "employeeFTR";
        this.select.id = "employeeFTR";
        
        const disabledPrompt = document.createElement("option");
        disabledPrompt.value = "";
        disabledPrompt.disabled = true;
        disabledPrompt.selected = true;
        disabledPrompt.textContent = "Choose FTR...";
        
        this.select.appendChild(disabledPrompt);

        for (const [key, _] of Object.entries(roster)) {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = key;
            this.select.appendChild(option);
        }

        this.#shadowRoot.appendChild(this.select);
    }

    get value() {
        return this.select.value;
    }

    addErrorHighlight() {
        this.select.style.outline = "1px red solid";
    }

    removeErrorHighlight() {
        this.select.style.outline = "";
    }

    disableSelect() {
        this.select.disabled = true;
        this.removeErrorHighlight();
        this.select.value = "";
    }

    enableSelect() {
        this.select.disabled = false;
    }
}

customElements.define("select-ftr", SelectFTR);
