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
    set value(v) {
        this.select.value = v;
    }

    /**
    * @param {() => void} callback 
    */
    addOnChangeFn(callback) {
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
