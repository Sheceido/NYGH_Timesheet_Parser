export class PasteArea extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        const textarea = document.createElement("textarea");
        textarea.name = "pastedSchedule";
        textarea.classList.add("pasteArea");
        textarea.rows = "5";
        textarea.placeholder = "Copy and Paste schedule grid here!"

        this.appendChild(textarea);
    }
}

customElements.define("paste-area", PasteArea);
