export class PasteSuccessfulPrompt extends HTMLElement {
    
    #shadowRoot;
    /** @type {HTMLDivElement} */
    prompt;
    css = `
        div {
            position: absolute;
            top: -100%;
            left: -120%;
            width: 100px;
            padding-inline: 1em;
            background-color: #6BFA91;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0px 0px 3px #6BFA91;
            opacity: 1;
            transform: translateY(0px);
            animation-name: fadeOut;
            animation-duration: 1s;
            animation-delay: 0.5s;
            animation-timing-function: ease-in;
            animation-iteration-count: 1;
            animation-fill-mode: forwards;
        }
        @keyframes fadeOut {
            from {
                opacity: 1;
                transform: translateY(0px);
            }
            to {
                opacity: 0;
                transform: translateY(-75px);
            }
        }
    `;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });

        const styleElement  = document.createElement("style");
        styleElement.textContent = this.css;
        this.#shadowRoot.appendChild(styleElement);

        this.prompt = document.createElement("div");

        const p = document.createElement("p");
        p.textContent = "Paste Succesful!";

        this.prompt.appendChild(p);
        this.#shadowRoot.appendChild(this.prompt);

    }
}

customElements.define("paste-success", PasteSuccessfulPrompt);
