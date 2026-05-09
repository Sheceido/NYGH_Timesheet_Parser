/**
 * Custom HTML element that provides a textarea for pasting schedule data.
 * Creates a styled textarea with appropriate attributes and placeholder.
 */
export class PasteArea extends HTMLElement {
    constructor() {
        super();
    }

    /**
     * Lifecycle callback – runs when the element is added to the DOM.
     * Creates and appends a textarea element with the "pasteArea" class.
     */
    connectedCallback(): void {
        const textarea = document.createElement("textarea");
        textarea.name = "pastedSchedule";
        textarea.classList.add("pasteArea");
        textarea.rows = 5;
        textarea.placeholder = "Copy and Paste schedule grid here!";

        this.appendChild(textarea);
    }
}

// Register the custom element with the browser
customElements.define("paste-area", PasteArea);
