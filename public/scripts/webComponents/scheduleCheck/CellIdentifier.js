/** @typedef {import("../../parser.js").Shift} Shift */

export class CellIdentifier extends HTMLElement {

    #shadowRoot;
    css = `
        :host {
            position: absolute;
            top: 115%;
            left: 110%;
            background-color: white;
            border: 1px solid #CAEAD8;
            border-radius: 5px;
            box-shadow: 0 0 8px black;
        }
        td {
            border: 1px solid #ddd;
            padding: 0.2em;
            min-width: 100px;
        }
        .dayShiftTime {
            font-size: medium;
        }
        .excelCoordinate {
            font-size: medium;
            font-weight: bold;
            background-color: #CAEAD8; 
        }
        img {
            user-select: none;
            rotate: -135deg;
            opacity: 80%;
            position: absolute;
            top: -15px;
            left: -15px;
        }
    `;


    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });
        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);
    }

    /**
    * @param {Shift} shift
    * @param {string} dayStr 
    */
    initCellInfo(shift, dayStr) {
        // WARNING: column likely should never surpass column "Z" on excel
        if (shift.coordinate.col > 25) {
            console.error("Column surpasses Z in table, incorrect labeling for Excel Cell Coordinate may occur.");
        }

        // Represent column in alphabet (A-Z)
        const alphaCol = String.fromCharCode(shift.coordinate.col + 65);
        // row is 1-index on cell, while in this program it is 0 indexed,
        // requiring +1 offset.
        const excelRow = shift.coordinate.row + 1;

        const table = document.createElement("table");

        const tr1 = document.createElement("tr");
        const tr2 = document.createElement("tr");

        // first row
        const locCell = document.createElement("td");
        locCell.style.border = "none";
        locCell.style.position = "relative";
        locCell.textContent = shift.location;

        const img = new Image(20, 20);
        img.src = "./images/icons8-sort-right-24.png";
        locCell.appendChild(img);

        const dayStrCell = document.createElement("td");
        dayStrCell.textContent = dayStr;
        dayStrCell.classList.add("dayShiftTime");

        // second row
        const stCell = document.createElement("td");
        stCell.textContent = shift.shiftTime;
        stCell.classList.add("dayShiftTime");

        const excelCoordinate = document.createElement("td");
        excelCoordinate.textContent = `${alphaCol}${excelRow}`;
        excelCoordinate.classList.add("excelCoordinate");

        tr1.append(locCell, dayStrCell);
        tr2.append(stCell, excelCoordinate);

        table.append(tr1, tr2);

        this.#shadowRoot.appendChild(table);
    }
}

customElements.define("cell-id", CellIdentifier);
