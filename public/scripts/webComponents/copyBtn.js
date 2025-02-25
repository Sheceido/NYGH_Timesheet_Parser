export class HeaderWithCopyBtn extends HTMLElement {

    #shadowRoot;
    css = `
        div {
            display: flex; 
            flex-direction: row;
            margin-top: 3em;
            margin-bottom: 1em;
            visiblity: hidden;
        }
        h3 {
            font-family: sans-serif;
            font-weight: 500;
            margin: 0;
            text-align: center;
        }
        button {
            padding: 0;
            margin-inline: 0.5em;
            color: #aaa;
            background-color: white;
            border: none;
            transition: 300ms;
            visibility: hidden;
        }
        button:hover {
            color: #111;
            cursor: pointer;
        }
    `;

    /** @type {HTMLHeadingElement} */
    header;
    svg = `<svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
          >
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm4 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h12v14z"/>
          </svg>
    `;
    timesheetStr = "";
    
    static get observedAttributes() {
        return ['header', 'timesheet']; // watch for changes in these attributes
    }

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });

        const style = document.createElement("style");
        style.textContent = this.css;

        this.container = document.createElement("div");
        this.header = document.createElement("h3");
        this.copyBtn = document.createElement("button");
        this.copyBtn.innerHTML = this.svg;

        this.container.appendChild(this.header);
        this.container.appendChild(this.copyBtn);

        this.#shadowRoot.appendChild(style);
        this.#shadowRoot.appendChild(this.container);
    }

    connectedCallback() {
        this.copyBtn.addEventListener("click", () => { this.copyToClipboard() });
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch(name) {
            case "header":
                this.header.textContent = newValue;
                break;
            case "timesheet":
                this.timesheetStr = newValue;
                break;
        }
    }

    reveal() {
        this.#shadowRoot.querySelector("div").style.visibility = "visible";
        this.#shadowRoot.querySelector("button").style.visibility = "visible";
    }

    hide() {
        this.#shadowRoot.querySelector("div").style.visibility = "hidden";
        this.#shadowRoot.querySelector("button").style.visibility = "hidden";
    }

    /**
     * Copies the tsv-formatted timesheet string onto browser clipboard if on HTTPS,
     * else display it in an alert box.
     */
    copyToClipboard() {
        if (!navigator.clipboard) {
            // Navigator.clipboard is not available if not using HTTPS,
            // fallback with alert containing the copyable text.
            alert(this.timesheetStr);
        } else {
            navigator.clipboard.writeText(this.timesheetStr).then(
                () => alert("Timesheet copied to your clipboard!")
            );
        }
    }
}

customElements.define("header-copybtn", HeaderWithCopyBtn);
