import { SYNC_PASTE_AREA } from "../data/constants.js";

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

        textarea.addEventListener("input", (e) => {
            this.emitSyncEvent(e.target.value);
        });

        this.appendChild(textarea);
    }

    emitSyncEvent(data) {
        document.dispatchEvent(new CustomEvent(SYNC_PASTE_AREA, {
            detail: data,
            bubbles: true,
        }));

    }
}

customElements.define("paste-area", PasteArea);
