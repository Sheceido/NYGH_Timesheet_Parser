import { capitalize } from "../../utils.js";
import { roster } from "../../roster.js";
/** @typedef {import("../../parser.js").ShiftMap} ShiftMap */
/** @typedef {import("../../warnings.js").ShiftCountError} ShiftCountError */
/** @typedef {import("../../warnings.js").WarningsGroup} WarningsGroup */
/** @typedef {import("../../schedCheck.js").EmployeeShiftsAndWarnings} EmployeeShiftsAndWarnings */
/**
 * @typedef {Map<number, string>} ColorByRow
 * - Mapping of a color's hex code in relation to the row index key
 */

export class ScheduleChecker extends HTMLElement {
    
    #shadowRoot;
    css = `
        table {
            margin-block: 1em;
            padding: 0.5em;
            border: 1px solid #ddd;
            border-radius: 5px;
            opacity: 0;
            animation-name: fadeIn;
            animation-duration: 0.5s;
            animation-timing-function: ease-in;
            animation-iteration-count: 1;
            animation-fill-mode: forwards;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        th {
            position: relative;
            border: 1px solid #ddd;
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
            height: 15px; 
            padding-block: 0.5em;
            padding-inline: 1em;
            font-size: 12px;
            font-family: sans-serif;
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
            height: 1px;
        }
        div.context {
            position:absolute;
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
            margin-top: 1.5em;
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

    shiftTimes;
    /** @type {HTMLTableElement} */
    scheduleTable;
    /** @type {ColorByRow} */
    rowColorSwatch;

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
    * @param {WarningsGroup} globalWarnings 
    * @param {EmployeeShiftsAndWarnings} employeeShiftsWarnings 
    */
    createScheduleTable(grid, headers, shiftTimes, employeeShiftsWarnings) {
        const DAYS_OF_THE_WEEK = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri"];

        this.shiftTimes = shiftTimes;
        this.rowColorSwatch = this.generateCellColorSwatch();

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

        // Go through all FTR employees and place the corrected names into grid
        for (const [name, e] of employeeShiftsWarnings.entries()) {
            e.shifts.forEach(shift => {
                grid[shift.coordinate.row][shift.coordinate.col] = capitalize(name);
            });
        }
        /** Remove all rows above the first row starting at a specified time */
        const firstRow = this.findFirstShiftTimeRow("07:00-15:00", "GENERAL");
        grid.splice(0, firstRow);
        
        // Create table from grid of data
        for (let rowIndex = 0; rowIndex < grid.length; rowIndex++) {
            const tr = document.createElement("tr");

            for (let colIndex = 0; colIndex < grid[rowIndex].length; colIndex++) {
                const name = grid[rowIndex][colIndex];

                const td = document.createElement("td");
                if (colIndex === 0) {
                    td.id = `shiftTime`; // important for qs'ing for warnings
                } else {
                    td.id = `row${rowIndex}col${colIndex}`; // important for qs'ing for warnings
                }
                td.setAttribute("row", rowIndex);
                td.setAttribute("col", colIndex);

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
     * Temp for showing shift counts if error
     * @param {string} employeeName
     * @param {ShiftCountError} shiftCount 
     * @param {number} statsCount 
     * @returns {HTMLParagraphElement | null} p html tag containing prompt regarding the correct/incorrect number of shifts counted in this biweekly for the employee.
     */
    //TODO: create better way to make this, within this web component
    createShiftCountErrorDisplay(employeeName, shiftCount, statsCount) {
        const p = document.createElement("p");
        p.classList.add("comments");

        const successSpan = document.createElement("span");
        successSpan.textContent = " ✅ ";

        const errorSpan = document.createElement("span");
        errorSpan.textContent = " ❌ ";

        const promptSpan = document.createElement("span");
        promptSpan.style.fontFamily = "sans-serif";
        promptSpan.style.fontSize = "small";
    
        if (shiftCount.found === 0) {
            return null;
        } else if (shiftCount.found > 0) {
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalize(employeeName)} appears to have MORE THAN (${shiftCount.expected}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
        } else {
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalize(employeeName)} appears to have LESS THAN (${shiftCount.expected}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
        }
        p.appendChild(promptSpan);

        document.querySelector(".shiftCountErrors").appendChild(p);
    }

    /**
     * @param {EmployeeShiftsAndWarnings} employeeShiftsWarnings 
     */
    applyEmployeeWarnings(employeeShiftsWarnings, statCount) {
        // Constructed table resulted in splicing away rows prior to 7am shift,
        // use firstRow index as offset to find true coordinate
        const firstRow = this.findFirstShiftTimeRow("07:00-15:00", "GENERAL");

        const colors = {
            "red": "#FF0000",
            "lightRed": "#F78F8F",
            "vibrantYellow": "#FFF075",
            "lightBlue": "#72C0FF",
        };

        // Go through all FTR employees and render any warnings for the shift
        for (const [str_alias, shifts] of employeeShiftsWarnings.entries()) {

            // Shift Count Errors Comments below table
            this.createShiftCountErrorDisplay(str_alias, shifts.warnings.shiftCount, statCount);

            // Apply duplicate warning
            const duplicateIterable = shifts.warnings.duplicate.entries();
            for (const [_, sh] of duplicateIterable) {

                sh.forEach(s => {
                    const row = s.coordinate.row - firstRow; //offset for row index post-splice
                    const col = s.coordinate.col;

                    const h3 = document.createElement("h3");
                    h3.textContent = `?Duplicate Error`;

                    const p = document.createElement("p");
                    p.textContent = `${capitalize(str_alias)} has another shift in the current column!`;

                    this.applyWarningToCell(
                        row,
                        col,
                        "warningDup",
                        "./images/icons8-error-48.png",
                        [h3, p],
                        colors["red"],
                        "top"
                    );
                });
            }

            // Apply "?" and "!" multi-name warnings on schedule
            shifts.warnings.multipleNames.forEach(s => {
                const row = s.shift.coordinate.row - firstRow;
                const col = s.shift.coordinate.col;
                const onCall = (s.shift.shiftTime === "ON-CALL");

                const color = onCall ? colors["vibrantYellow"] : colors["lightBlue"];

                const h3 = document.createElement("h3");
                h3.textContent = `Multiple Names Found!`;

                const namesContainer = this.generateMultiNameContainer(
                    s.names,
                    color
                );

                const p = document.createElement("p");
                p.style.fontSize = "x-small";
                p.textContent = `Employees should double check their timesheet standby hours if partial coverage occurred.`;

                this.applyWarningToCell(
                    row,
                    col,
                    "warningMulti",
                    (onCall ? "./images/icons8-time-30.png" : "./images/icons8-question-mark-48.png"),
                    (onCall ? [h3, namesContainer, p]  : [h3, namesContainer]),
                    color,
                    "top",
                    (onCall && {x: 18, y: 18})
                );
            });
            
            // Apply Not Available warning
            for (let i = 0; i < shifts.warnings.notAvailable.length; i++) { //TODO: ?Generalize ops with below
                const s = shifts.warnings.notAvailable[i];
                const row = s.coordinate.row - firstRow;
                const col = s.coordinate.col;

                const h3 = document.createElement("h3");
                h3.textContent = `Unavailable!`;

                const p = document.createElement("p");
                p.textContent = `Employee was marked as unavailable to work today!`;

                this.applyWarningToCell(
                    row,
                    col,
                    "warningNotAvail",
                    "./images/icons8-unavailable-30.png",
                    [h3, p],
                    colors["lightRed"],
                    "top",
                    {x: 18, y: 18}
                );
            }

            // Apply Evening Male Tech warning
            for (let i = 0; i < shifts.warnings.evening.length; i++) {
                const s = shifts.warnings.evening[i];
                const row = s.coordinate.row - firstRow;
                const col = s.coordinate.col;

                const h3 = document.createElement("h3");
                h3.textContent = `Evening Male Tech!`;

                const p = document.createElement("p");
                p.textContent = `More than 1 evening Male tech was found!`;

                this.applyWarningToCell(
                    row,
                    col,
                    "warningEvening",
                    "./images/icons8-male-24.png",
                    [h3, p],
                    colors["lightRed"],
                    "top",
                    {x: 18, y: 18}
                );

            }
        }
    }

    /**
     * @param {number} row 
     * @param {number} col 
     * @param {string} id 
     * @param {string} imgPath 
     * @param {HTMLElement[]} elements 
     * @param {string} color 
     * @param {string} direction 
     * @param {{x: number, y: number} | undefined} dimensions 
     */
    applyWarningToCell(row, col, id, imgPath, elements, color, direction, dimensions) {
        const cell = this.#shadowRoot.querySelector(`#row${row}col${col}`);
        const priorWarnings = cell.querySelectorAll(`#${id}`);

        if (cell && priorWarnings.length === 0) {
            const imgWithCtx = this.addImageSymbolWithContext(
                imgPath,
                [...elements],
                color,
                direction,
                dimensions
            );
            imgWithCtx.id = id;
            
            cell.appendChild(imgWithCtx);
            imgWithCtx.querySelector("img").style.right = `${this.getIconOffset(cell)}px`;
        }
    }

    /**
     * @param {string} src
     * @param {HTMLElement[]} ctxChildEl 
     * @param {string} colorCode 
     * @param {string} direction 
     * @param {{x: number, y: number}} dimensions 
     * @returns {HTMLDivElement} user-defined symbol with added context on hover
     **/
    addImageSymbolWithContext(src, ctxChildEl, colorCode, direction, dimensions) {
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
    * Finds all row indices which match the provided shift time and location.
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
     * @param {Element} cell
     * @returns {number} offset pixels based on number of warnings already populated in element
     * */
    getIconOffset(cell) {
        const WIDTH = 18;
        const priorErrors = cell.querySelectorAll(`#warningDup, #warningMulti, #warningNotAvail, #warningEvening`);
        if (priorErrors.length > 0) {
            return (WIDTH * priorErrors.length) - WIDTH; // subtract width again for first element to be always top left corner
        }
        return -1;
    }

    /**
     * Find relevant shiftTime + location which require a color reference, mapping rows to the color code.
     */
    generateCellColorSwatch() {
        if (!this.shiftTimes) {
            console.error("schedule checker's shiftTime property must be defined before generating the color swatch.");
            return;
        }
        /** @type {ColorByRow} */
        const cellColorSwatch = new Map();

        this.findAllShiftTimeRow("07:30-15:30", "BDC").forEach(row => cellColorSwatch.set(row, "#FFD9FF"));
        this.findAllShiftTimeRow("08:00-16:00", "BDC").forEach(row => cellColorSwatch.set(row, "#FFD9FF"));
        this.findAllShiftTimeRow("09:00-17:00", "BDC").forEach(row => cellColorSwatch.set(row, "#FFD9FF"));

        this.findAllShiftTimeRow("11:00-19:00", "GENERAL").forEach(row => cellColorSwatch.set(row, "#CCFFCC"));
        this.findAllShiftTimeRow("12:00-20:00", "GENERAL").forEach(row => cellColorSwatch.set(row, "#CCFFFF"));
        this.findAllShiftTimeRow("15:00-23:00", "GENERAL").forEach(row => cellColorSwatch.set(row, "#92D050"));
        this.findAllShiftTimeRow("16:00-24:00", "GENERAL").forEach(row => cellColorSwatch.set(row, "#99CCFF"));

        this.findAllShiftTimeRow("AVAILABLE", "GENERAL").forEach(row => cellColorSwatch.set(row, "#92D050"));
        this.findAllShiftTimeRow("VACATION", "GENERAL").forEach(row => cellColorSwatch.set(row, "#CCFFCC"));
        this.findAllShiftTimeRow("FLOAT", "GENERAL").forEach(row => cellColorSwatch.set(row, "#FFFF00"));
        this.findAllShiftTimeRow("LIEU TIME", "GENERAL").forEach(row => cellColorSwatch.set(row, "#99CCFF"));
        this.findAllShiftTimeRow("Absent", "GENERAL").forEach(row => cellColorSwatch.set(row, "#FF99CC"));
        this.findAllShiftTimeRow("Not Available", "GENERAL").forEach(row => cellColorSwatch.set(row, "#FF9900"));

        return cellColorSwatch;
    }


    /**
     * Find the color hex-code by the row index; override color if column index is on a weekend
     */
    applyCellColor(rowIndex, colIndex, name) {
        const color = this.rowColorSwatch.get(rowIndex);

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
        if (!color) {
            return "#FFFFFF";
        }
        return color;
    }

    fadeAllCellsExcept(name) {
        const employee = roster[name];
        if (!employee) {
            console.error(`${name} was not found in roster!`);
            return;
        }

        const allCells = this.scheduleTable.querySelectorAll("td");
        for (let i = 0, cell; i < allCells.length; i++) {
            cell = allCells[i];

            if (cell.id === "shiftTime") {
                continue;
            }

            if (cell.innerText.toUpperCase() === employee.str_alias ||
                cell.innerText.toUpperCase() === employee.abbrev) {
                this.applyOpacity(cell, 1);
                this.highlightBorders(cell, "#4FC174"); // emerald green
            } else {
                this.applyOpacity(cell, 0.05);
            }
        }
    }

    /**
     * @param {HTMLTableCellElement} cell
     */
    highlightBorders(cell, color) {
        cell.style.boxShadow = `0px 0px 4px ${color}`;
    }

    /**
     * @param {HTMLTableCellElement} cell
     */
    unhighlightBorders(cell) {
        cell.style.boxShadow = ``;
    }

    unfadeAllCells() {
        const allCells = this.scheduleTable.querySelectorAll("td");
        allCells.forEach(cell => {
            this.applyOpacity(cell, 1);
            this.unhighlightBorders(cell);
        });
    }

    /**
     * @param {HTMLElement} el 
     * @param {number} fp 
     */
    applyOpacity(el, fp) {
        el.style.opacity = fp;
    }

    reset() {
        if (this.scheduleTable) {
            this.#shadowRoot.removeChild(this.scheduleTable);
        }
    }
}

customElements.define("schedule-checker", ScheduleChecker);
