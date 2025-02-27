import { capitalize } from "../../utils.js";
/** @typedef {import("../../parser.js").ShiftMap} ShiftMap */
/** @typedef {import("../../schedCheck.js").EmployeeShiftsAndWarnings} EmployeeShiftsAndWarnings */

export class ScheduleChecker extends HTMLElement {
    
    #shadowRoot;
    css = `
        table {
            margin-block: 1em;
            padding: 0.5em;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        th {
            position: relative;
            padding-block: 0.5em;
            font-size: 14px;
        }
        tr {
            border: 1px solid #ddd;
        }
        td {
            position: relative;
            text-align: center;
            border: 1px solid #ddd;
            border-width: 1px;
            width: 5em;
            height: 30px; 
            padding-block: 0.5em;
            padding-inline: 1em;
            font-size: 12px;
        }
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
        }
        div.context {
            position:absolute;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            left: -50px;
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
            margin-top: 1.5em;
        }
        .multiNameContainer {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
        }
        .multiNameContainer p {
            padding-inline: 1.5em;
            padding-block: 1em;
            margin-inline: 0.5em;
            background-color: #eee;
            border-radius: 3px;
        }
    `;

    shiftTimes;
    scheduleTable;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });

        const style = document.createElement("style");
        style.textContent = this.css;
        this.#shadowRoot.appendChild(style);
    }
    
    /**
    * @param {string[][]} grid 
    * @param {string[]} headers 
    * @param {ShiftMap} shiftTimes 
    * @param {EmployeeShiftsAndWarnings} employeeShiftsWarnings 
    */
    createScheduleTable(grid, headers, shiftTimes, employeeShiftsWarnings) {
        const DAYS_OF_THE_WEEK = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri"];

        this.shiftTimes = shiftTimes;
        this.scheduleTable = document.createElement("table");

        /** Create first row with days of the week starting on Saturday */
        const daysOfWeekRow = document.createElement("tr");
        //create empty first column cell
        daysOfWeekRow.appendChild(document.createElement("th"));
        
        for (let i = 0; i < 2; i++) {
            for (let j = 0, th; j < DAYS_OF_THE_WEEK.length; j++) {
                th = document.createElement("th");
                th.textContent = DAYS_OF_THE_WEEK[j];
                daysOfWeekRow.appendChild(th);
            }
        }
        this.scheduleTable.append(daysOfWeekRow);

        /** Create second row with day numeration */
        const daysNumRow = document.createElement("tr");

        for (let i = 0, th; i < headers.length; i++) {
            th = document.createElement("th");
            th.textContent = headers[i];
            daysNumRow.appendChild(th);
        }
        this.scheduleTable.append(daysNumRow);

        // Go through all FTR employees and place the shifts parsed into grid
        for (const [name, e] of employeeShiftsWarnings.entries()) {
            e.shifts.forEach(shift => {
                grid[shift.coordinate.row][shift.coordinate.col] = capitalize(name);
            });
        }

        /** Remove all rows above the first row starting at a specified time */
        const firstRow = this.findFirstShiftTimeRow("07:00-15:00", "GENERAL");
        grid.splice(0, firstRow);

        for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
            const tr = document.createElement("tr");

            for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                const name = grid[rowIndex][colIndex];

                const td = document.createElement("td");
                td.id = `row${rowIndex}col${colIndex}`;
                td.textContent = name;
                td.style.backgroundColor = this.applyCellColor(
                    rowIndex + firstRow, // offset from the splice done above
                    colIndex,
                    name
                );

                tr.appendChild(td);
            }
            this.scheduleTable.appendChild(tr);
        }
        
        this.#shadowRoot.appendChild(this.scheduleTable);
    }

    /**
     * @param {EmployeeShiftsAndWarnings} employeeShiftsWarnings 
     */
    applyWarnings(employeeShiftsWarnings) {

        // Constructing table resulted in splicing away rows prior to 7am shift,
        // use firstRow index as offset to find true coordinate
        const firstRow = this.findFirstShiftTimeRow("07:00-15:00", "GENERAL");

        for (const [_, shifts] of employeeShiftsWarnings.entries()) {

            const duplicateIterable = shifts.warnings.duplicate.entries();
            for (const [_, sh] of duplicateIterable) {
                sh.forEach(s => {
                    const row = s.coordinate.row - firstRow;
                    const col = s.coordinate.col;
                    const cell = this.#shadowRoot.querySelector(`#row${row}col${col}`);

                    if (cell) {
                        const h3 = document.createElement("h3");
                        h3.textContent = `?Duplicate Error`;

                        const p = document.createElement("p");
                        p.textContent = `Another shift found in this same column!`;

                        const imgWithCtx = this.addImageSymbolWithContext(
                            "./images/icons8-error-48.png",
                            [h3, p],
                            "red",
                            "top"
                        );
                        imgWithCtx.id = `dupError`;

                        cell.appendChild(imgWithCtx);
                    }
                });
            }

            // Generate "?" and "!" warnings on schedule
            shifts.warnings.multipleNames.forEach(s => {
                const row = s.shift.coordinate.row - firstRow;
                const col = s.shift.coordinate.col;
                const cell = this.#shadowRoot.querySelector(`#row${row}col${col}`);

                if (cell) {
                    const lightBlue = "#72C0FF";
                    const vibrantYellow = "#FFF075";

                    const h3 = document.createElement("h3");
                    h3.textContent = `Multiple Names Found!`;

                    const isOnCall = s.shift.shiftTime === "ON-CALL";
                    const color = isOnCall ? vibrantYellow : lightBlue;
                    const img = isOnCall
                        ? "./images/icons8-warning-48.png"
                        : "./images/icons8-question-mark-48.png"
                    ;

                    const namesContainer = this.generateMultiNameContainer(
                        s.names,
                        color
                    );
                    const imgWithCtx = this.addImageSymbolWithContext(
                        img,
                        [h3, namesContainer],
                        (isOnCall ? vibrantYellow : lightBlue),
                        "top"
                    );

                    // If there is another error img, shift this warning away from right corner
                    console.log(cell.querySelector(`.ctxContainer#dupError`));
                    if (cell.querySelector(`.ctxContainer#dupError`)) {
                        imgWithCtx.querySelector("img").style.right = "15px";
                    }

                    cell.appendChild(imgWithCtx);
                }
            });
                

        }
    }

    /**
     * @param {HTMLElement[]} ctxChildEl 
     * @returns {HTMLDivElement} user-defined symbol with added context on hover
     **/
    addImageSymbolWithContext(src, ctxChildEl, colorCode, direction) {
        const imgCtxContainer = document.createElement("div");
        imgCtxContainer.classList.add("ctxContainer");

        const img = new Image(20, 20);
        img.src = src;
        
        const context = document.createElement("div");
        context.classList.add("context");
        if (colorCode !== "") {
            context.style.borderColor = colorCode;
            context.style.boxShadow = `0px 0px 4px ${colorCode}`;
        }
        switch(direction) {
            case "top":
                context.style.bottom = `${context.offsetHeight + 5}px`;
                break;
            case "bottom":
                context.style.top = `-${context.offsetHeight - 5}px`;
                break;
        }

        ctxChildEl.forEach(element => context.appendChild(element));

        imgCtxContainer.appendChild(img);
        imgCtxContainer.append(context);

        return imgCtxContainer;
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
    * @param {ShiftMap} shiftTimes 
    * @param {string} time 
    * @param {string} location
    * @returns {number} first row found by the provided time and location
    */
    findFirstShiftTimeRow(time, location) {
        for (const [_, shift] of this.shiftTimes.entries()) {
            if (shift.shiftTime === time && shift.location === location) {
                return shift.coordinate.row;
            }
        }
        return 0;
    }

    /**
    * @param {ShiftMap} shiftTimes 
    * @param {string} time 
    * @param {string} location
    * @returns {number[]} list of rows found by the provided time and location
    */
    findAllShiftTimeRow(time, location) {
        const rows = [];

        for (const [_, shift] of this.shiftTimes.entries()) {
            if (shift.shiftTime === time && shift.location === location) {
                rows.push(shift.coordinate.row);
            }
        }
        return rows;
    }



    /**
     * @param {number} rowIndex 
     * @param {number} colIndex 
     * @param {string} name 
    */
    applyCellColor(rowIndex, colIndex, name) {
        let cellColor = "white";

        // Apply colors to rows with names defined within
        if (name !== "") {
            if (this.findAllShiftTimeRow("07:30-15:30", "BDC").includes(rowIndex) ||
                this.findAllShiftTimeRow("08:00-16:00", "BDC").includes(rowIndex) ||
                this.findAllShiftTimeRow("09:00-17:00", "BDC").includes(rowIndex)) {
                cellColor = "#FFD9FF";
            }
            if (this.findAllShiftTimeRow("11:00-19:00", "GENERAL").includes(rowIndex)) {
                cellColor = "#CCFFCC";
            }
            if (this.findAllShiftTimeRow("12:00-20:00", "GENERAL").includes(rowIndex)) {
                cellColor = "#CCFFFF";
            }
            if (this.findAllShiftTimeRow("15:00-23:00", "GENERAL").includes(rowIndex)) {
                cellColor = "#92D050";
            }
            if (this.findAllShiftTimeRow("16:00-24:00", "GENERAL").includes(rowIndex)) {
                cellColor = "#99CCFF";
            }
        }
        // apply colors to all rows with the shiftTime and location
        if (this.findAllShiftTimeRow("AVAILABLE", "GENERAL").includes(rowIndex)) {
                cellColor = "#92D050";
        }
        if (this.findAllShiftTimeRow("VACATION", "GENERAL").includes(rowIndex)) {
                cellColor = "#CCFFCC";
        }
        if (this.findAllShiftTimeRow("FLOAT", "GENERAL").includes(rowIndex)) {
                cellColor = "#FFFF00";
        }
        if (this.findAllShiftTimeRow("LIEU TIME", "GENERAL").includes(rowIndex)) {
                cellColor = "#99CCFF";
        }
        if (this.findAllShiftTimeRow("Absent", "GENERAL").includes(rowIndex)) {
                cellColor = "#FF99CC";
        }
        if (this.findAllShiftTimeRow("Not Available", "GENERAL").includes(rowIndex)) {
                cellColor = "#FF9900";
        }

       // Apply weekend shift color, overrides any other color
        switch(colIndex) {
            case 1:
            case 2:
            case 8:
            case 9:
                if (!(name === "X" || name === "")) {
                    return "#FFFF99";
                }
                break;
        }
        return cellColor;
    }
}

customElements.define("schedule-checker", ScheduleChecker);
