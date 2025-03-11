import { WARNING_COLORS } from "../constants.js";

export class WarningPopup extends HTMLElement {
    
    #shadowRoot;
    style;
    css = `
        p {
            font-family: sans-serif;
            font-size: small;
        }
        img {
            position: absolute;
            cursor: pointer;
            top: -1px;
            right: -1px;
        }
        img + div.context {
            display: none;
            visibility: hidden;
            z-index: -999;
            pointer-events: none;
        }
        img:hover + div.context {
            display: flex;
            visibility: visible;
            z-index: 999;
        }
        div.ctxContainer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 1px;
        }
        div.context {
            position:absolute;
            left: -20%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 120px;
            min-width: 150px;
            max-width: fit-content;
            border: 1px solid #bbb;
            border-radius: 3px;
            background-color: white;
            box-shadow: 5px 5px 5px #ccc;
            padding: 1em;
        }
        div.context h3 {
            font-family: sans-serif;
            font-size: medium;
            margin: 0;
            margin-top: 1em;
        }
        .multiNameContainer {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            z-index: 100;
        }
        .multiNameContainer p {
            padding-inline: 1.5em;
            padding-block: 1em;
            margin-inline: 0.5em;
            background-color: #eee;
            border-radius: 3px;
            min-width: 80px;
        }
    `;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);
    }

    createDuplicateWarning(type) {
        const h3 = document.createElement("h3");
        h3.textContent = `?Duplicate Error`;

        const p = document.createElement("p");
        p.textContent = `Another shift in the current column already!`;

        const dupWarning = this.createSymbolWithHoverContext(
            "./images/icons8-error-48.png",
            [h3, p],
            WARNING_COLORS.red,
            "top",
        );
        this.#shadowRoot.appendChild(dupWarning);
        this.classList.add(type);
    }

    createUnavailableWarning(type) {
        const h3 = document.createElement("h3");
        h3.textContent = `Unavailable!`;

        const p = document.createElement("p");
        p.textContent = `Employee was marked as unavailable to work today!`;

        const unavailWarning = this.createSymbolWithHoverContext(
            "./images/icons8-unavailable-30.png",
            [h3, p],
            WARNING_COLORS.lightRed,
            "top",
            {x: 18, y: 18}
        );
        this.#shadowRoot.appendChild(unavailWarning);
        this.classList.add(type);
    }

    createEveningWarning(type) {
        const h3 = document.createElement("h3");
        h3.textContent = `Evening Male Tech!`;

        const p = document.createElement("p");
        p.textContent = `More than 1 evening Male tech was found!`;

        const eveningWarning = this.createSymbolWithHoverContext(
            "./images/icons8-male-24.png",
            [h3, p],
            WARNING_COLORS.lightRed,
            "top",
            {x: 18, y: 18}
        );
        this.#shadowRoot.appendChild(eveningWarning);
        this.classList.add(type);
    }

    createEmptyCellsWarning(type) {
        const h3 = document.createElement("h3");
        h3.textContent = `Empty Cell!`;
        
        const p = document.createElement("p");
        p.textContent = `Expected employee to be scheduled in this cell, found none!`;

        const emptyCellWarning = this.createSymbolWithHoverContext(
            "./images/icons8-where-what-quest-48.png",
            [h3, p],
            WARNING_COLORS.pastelTeal,
            "top",
            {x: 15, y: 15}
        );
        this.#shadowRoot.appendChild(emptyCellWarning);
        this.classList.add(type);
    }

    createMultiNameWarning(names, type) {
        const isMultiNameType = (type === "multiName");

        const h3 = document.createElement("h3");
        h3.textContent = isMultiNameType
            ? `Multiple Names Found!`
            : `Multiple Names in Standby!`
        ;

        const p = document.createElement("p");
        p.style.fontSize = "x-small";
        p.textContent = `Employees should double check their timesheet standby hours if partial coverage occurred.`;

        const img = isMultiNameType
            ? "./images/icons8-question-mark-48.png"
            : "./images/icons8-time-30.png"
        ;

        const color = isMultiNameType
            ? WARNING_COLORS.lightBlue
            : WARNING_COLORS.vibrantYellow
        ;

        const namesContainer = this.generateMultiNameContainer(
            names,
            color
        );

        const ctx = isMultiNameType
            ? [h3, namesContainer]
            : [h3, namesContainer, p]
        ;

        const multiNameWarning = this.createSymbolWithHoverContext(
            img,
            ctx,
            color,
            "top"
        );
        this.#shadowRoot.appendChild(multiNameWarning);
        this.classList.add(type);
    }

    /**
     * @param {string[]} multiNames 
     * @returns {HTMLDivElement} multiNameContainer, holding a list of names in HTMLParagraphElements
     */
    generateMultiNameContainer(multiNames, colorCode) {
        const multiNameContainer = document.createElement("div");
        multiNameContainer.classList.add("multiNameContainer");

        multiNames.forEach(name => {
            const p = document.createElement("p");
            p.textContent = name;
            p.style.backgroundColor = colorCode;
            multiNameContainer.appendChild(p);
        });
        return multiNameContainer;
    }


    /**
     * @param {string} src
     * @param {HTMLElement[]} ctxChildEl 
     * @param {string} colorCode 
     * @param {string} direction 
     * @param {{x: number, y: number}} dimensions 
     * @returns {HTMLDivElement} user-defined symbol with added context on hover
     **/
    createSymbolWithHoverContext(src, ctxChildEl, colorCode, direction, dimensions) {
        const imgCtxContainer = document.createElement("div");
        imgCtxContainer.classList.add("ctxContainer");

        let img;
        if (dimensions) {
            img = new Image(dimensions.x, dimensions.y);
        } else {
            img = new Image(20, 20);
        }
        img.src = src;

        const context = document.createElement("div");
        context.classList.add("context");
        if (colorCode !== "") {
            context.style.borderColor = colorCode;
            context.style.boxShadow = `0px 0px 4px ${colorCode}`;
        }
        switch(direction) {
            case "top":
                context.style.bottom = `5px`;
                break;
            case "bottom":
                context.style.top = `25px`; //TODO: incorrect offset
                break;
            case "right":
                context.style.right = `${context.offsetWidth}px`;
        }

        ctxChildEl.forEach(element => context.appendChild(element));
        imgCtxContainer.appendChild(img);
        imgCtxContainer.append(context);

        return imgCtxContainer;
    }

    /**
    * @param {number} rightOffset 
    */
    offsetRight(rightOffset) {
        const img = this.#shadowRoot.querySelector("img");
        if (img) {
            img.style.right = `${rightOffset}px`;
        }
    }
}

customElements.define("warning-popup", WarningPopup);
