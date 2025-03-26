import { capitalize, capitalizeArray } from "../../utils.js";
import { roster } from "../../roster.js";
import { WarningPopup } from "../warningPopup.js";
import { WARNING_COLORS } from "../../constants.js";
import { UnrecognizedPanelEntry } from "./UnrecognizedPanelEntry.js";
/** @typedef {import("../../parser.js").ShiftMap} ShiftMap */
/** @typedef {import("../../parser.js").Shift} Shift */
/** @typedef {import("../../warnings.js").ShiftCountError} ShiftCountError */
/** @typedef {import("../../warnings.js").WarningsGroup} WarningsGroup */
/** @typedef {import("../../warnings.js").UnknownEmployeeShifts} UnknownEmployeeShifts */
/** @typedef {import("../../schedCheck.js").EmployeeShiftsAndWarnings} EmployeeShiftsAndWarnings */
/**
 * @typedef {Map<number, string>} ColorByRow
 * - Mapping of a color's hex code in relation to the row index key
 */

export class ScheduleChecker extends HTMLElement {

    #shadowRoot;
    css = `
        :host {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: start;
        }
        table {
            position: relative;
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
        .unrecognizedPanel {
            z-index: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            margin-block: 1em;
            margin-inline: 0.5em;
            padding-bottom: 2em;
            padding-inline: 0.5em;
            border: 1px solid #eee;
            border-radius: 5px;
            text-align: center;

            opacity: 0;
            animation-name: fadeIn;
            animation-duration: 0.5s;
            animation-timing-function: ease-in;
            animation-iteration-count: 1;
            animation-fill-mode: forwards;
        }
    `;

    shiftTimes;
    /** @type {HTMLTableElement} */
    scheduleTable;
    /** @type {HTMLDivElement} */
    unrecognizedPanel;
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
        for (const [fullName, employee] of Object.entries(roster)) {

            employeeShiftsWarnings.get(fullName).shifts.forEach(shift => {
                grid[shift.coordinate.row][shift.coordinate.col] = capitalize(employee.str_alias);
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
                    td.id = `shiftTime`; // important for querySelector for warnings
                } else {
                    td.id = `row${rowIndex}col${colIndex}`; // important for qs'ing for warnings
                }
                // True row and col in the Excel schedule
                td.setAttribute("row", rowIndex + firstRow);
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
        p.style.maxWidth = "70vw";
        p.style.padding = "1em";
        p.style.borderRadius = "5px";
        p.style.backgroundColor = WARNING_COLORS.lightRed;

        const successSpan = document.createElement("span");
        successSpan.textContent = " ✅ ";

        const errorSpan = document.createElement("span");
        errorSpan.textContent = " ❌ ";

        const promptSpan = document.createElement("span");
        promptSpan.style.fontFamily = "sans-serif";
        promptSpan.style.fontSize = "1.1em";

        if (shiftCount.found === 0) {
            return null;
        } else if (shiftCount.found > 0) {
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalizeArray(employeeName.split(" "))} appears to have MORE THAN (${shiftCount.expected}) shifts in the biweekly, (${shiftCount.expected + shiftCount.found}) shifts scheduled, (${statsCount}) of which would be stat holiday(s).`;
        } else {
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalizeArray(employeeName.split(" "))} appears to have LESS THAN (${shiftCount.expected}) shifts in the biweekly, (${shiftCount.expected + shiftCount.found}) shifts scheduled, (${statsCount}) of which would be stat holiday(s).`;
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
        let appliedEmptyCells = false;

        // Go through all FTR employees and render any warnings for the shift
        for (const [fullName, shifts] of employeeShiftsWarnings.entries()) {

            // Shift Count Errors Comments below table
            this.createShiftCountErrorDisplay(fullName, shifts.warnings.shiftCount, statCount);

            this.applyShiftWarnings(shifts.warnings.duplicate, "duplicate", firstRow);
            this.applyShiftWarnings(shifts.warnings.regShiftMultiNames, "multiName", firstRow);
            this.applyShiftWarnings(shifts.warnings.standbyMultiNames, "standbyMultiName", firstRow);
            this.applyShiftWarnings(shifts.warnings.notAvailable, "unavailable", firstRow);
            this.applyShiftWarnings(shifts.warnings.evening, "evening", firstRow);

            if (!appliedEmptyCells) {
                this.applyShiftWarnings(shifts.warnings.emptyCells, "emptyCells", firstRow);
                appliedEmptyCells = true;
            }
        }
    }

    /**
     * @param {Shift[]} warnings 
     * @param {string} type 
     */
    applyShiftWarnings(warnings, type, rowOffset) {
        warnings.forEach(s => {
            /** @type {HTMLElement} foundCell */
            const foundCell = this.#shadowRoot.querySelector(
                `#row${s.coordinate.row - rowOffset}col${s.coordinate.col}`
            );

            if (!foundCell) { return; } // continue to next iteration 
            if (this.warningAlreadyRendered(foundCell, type)) { return; }

            /** @type {WarningPopup} */
            const popup = document.createElement("warning-popup");

            switch (type) {
                case "duplicate":
                    popup.createDuplicateWarning(type);
                    break;

                case "evening":
                    popup.createEveningWarning(type);
                    break;

                case "multiName":
                    popup.createMultiNameWarning(s.names, type);
                    break;

                case "standbyMultiName":
                    popup.createMultiNameWarning(s.names, type);
                    break;

                case "unavailable":
                    popup.createUnavailableWarning(type);
                    break;

                case "emptyCells":
                    foundCell.style.backgroundColor = WARNING_COLORS.pastelTeal;
                    popup.createEmptyCellsWarning(type);
            }

            foundCell.appendChild(popup);
            popup.offsetRight(this.getIconOffset(foundCell));
        });
    }

    /**
     * @param {UnknownEmployeeShifts} unknowns
     * @param {() => void} changeSelectState
     */
    renderUnrecognizedPanel(unknowns, changeSelectState) {
        this.unrecognizedPanel = document.createElement("div");
        this.unrecognizedPanel.classList.add("unrecognizedPanel");

        const title = document.createElement("h3");
        title.style.fontFamily = "sans-serif";
        title.style.position = "relative";

        const sp1 = document.createElement("span");
        sp1.textContent = "Other Staff";
        const sp2 = document.createElement("span");
        sp2.style.position = "absolute";
        sp2.style.top = 0;
        sp2.style.left = "-5px";

        const ctxHeader = document.createElement("h3");
        ctxHeader.textContent = "Double Check!";

        const ctxInfo = document.createElement("p");
        ctxInfo.style.fontWeight = "300";
        ctxInfo.style.textAlign = "start";
        ctxInfo.textContent = "Check spelling as listed names may be:"

        const checkmarkEmoji = "&#x2714;";
        const errorEmoji = "&#x274C;";
        const items = [
            `Part-Time ${checkmarkEmoji}`,
            `Casual ${checkmarkEmoji}`,
            `Mispelled FTR ${errorEmoji}`,
            `Invalid Name! ${errorEmoji}`,
            `Irrelevant Notes ${errorEmoji}`,
        ];
        const ul = document.createElement("ul");
        ul.style.fontSize = "small";
        ul.style.fontWeight = "300";
        ul.style.textAlign = "start";
        ul.style.paddingInline = "1em";
        ul.style.paddingBottom = "1em";
        ul.style.margin = 0;

        items.forEach(item => {
            let li = document.createElement("li");
            li.innerHTML = item;
            ul.appendChild(li);
        });

        const ctxInfo2 = document.createElement("p");
        ctxInfo2.style.fontWeight = "300";
        ctxInfo2.style.textAlign = "start";
        ctxInfo2.textContent = "Click a name to filter the schedule. Click the trashcan to hide them in this panel.";

        /** @type {WarningPopup} popupInfo */
        const popupInfo = document.createElement("warning-popup");
        popupInfo.generateSpecifiedIcon(
            "./images/icons8-question-mark-48.png",
            [ctxHeader, ctxInfo, ul, ctxInfo2],
            WARNING_COLORS.lightBlue,
            "top"
        );

        sp2.appendChild(popupInfo);

        title.append(sp1, sp2);
        this.unrecognizedPanel.appendChild(title);

        for (const [name, shifts] of unknowns) {
            /** @type {UnrecognizedPanelEntry} */
            let panelEntry = document.createElement("unrecognized-panel-entry");

            // ignore name values containing numbers at beginning or end, as these are likely
            // accessory info placed in empty cells to note down events occurring in the day;
            // note foolproof as any purely alphabetical notes would not be ignored
            if (!isNaN(parseInt(name[0])) || !isNaN(parseInt(name[name.length - 1]))) {
                continue;
            }

            panelEntry.initEntry(
                name,
                shifts,
                this.fadeAllCellsByShifts.bind(this),
                changeSelectState
            );

            this.unrecognizedPanel.appendChild(panelEntry);
        }
        this.#shadowRoot.appendChild(this.unrecognizedPanel);
    }

    /**
     * @param {HTMLElement} cell
     * @param {string} type 
     */
    warningAlreadyRendered(cell, type) {
        const popups = cell.querySelectorAll(`warning-popup`);

        for (let i = 0; i < popups.length; i++) {
            if (popups[i].classList.contains(type)) {
                return true;
            }
        }
        return false;
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
        const priorErrors = cell.querySelectorAll(`warning-popup`);
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

        switch (colIndex) {
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
     * @param {Shift[]} shifts 
     */
    fadeAllCellsByShifts(shifts) {
        const allCells = this.scheduleTable.querySelectorAll("td");
        for (let i = 0, cell; i < allCells.length; i++) {
            cell = allCells[i];

            if (cell.id === "shiftTime") {
                continue;
            }

            const row = parseInt(cell.getAttribute("row"));
            const col = parseInt(cell.getAttribute("col"));

            if (!row || !col) {
                continue;
            }

            let found = false;
            for (let j = 0; j < shifts.length; j++) {
                let s = shifts[j];

                if (s.coordinate.row === row && s.coordinate.col === col) {
                    found = true;
                    this.applyOpacity(cell, 1);
                    this.highlightBorders(cell, "#4FC174"); // emerald green
                    break;
                }
            }
            if (!found) {
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
            this.#shadowRoot.removeChild(this.unrecognizedPanel);
        }
    }
}

customElements.define("schedule-checker", ScheduleChecker);
