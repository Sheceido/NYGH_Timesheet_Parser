import { capitalizeArray, getDateByColumn } from "../../utils.js";
import { roster } from "../../roster.js";
import { WarningPopup } from "../warningPopup.js";
import { WARNING_COLORS, DAYS_OF_THE_WEEK, NAMED_WARNING_COLORS } from "../../constants.js";
import { UnrecognizedPanelEntry } from "./UnrecognizedPanelEntry.js";
import { CellIdentifier } from "./CellIdentifier.js";
/** @typedef {import("../../roster.js").Roster} Roster */
/** @typedef {import("../../roster.js").Employee} Employee */
/** @typedef {import("../../parser.js").ShiftMap} ShiftMap */
/** @typedef {import("../../parser.js").Shift} Shift */
/** @typedef {import("../../warnings.js").ShiftCountError} ShiftCountError */
/** @typedef {import("../../warnings.js").EmployeeShiftCount} EmployeeShiftCount */
/** @typedef {import("../../warnings.js").WarningsGroup} WarningsGroup */
/** @typedef {import("../../warnings.js").UnknownEmployeeShifts} UnknownEmployeeShifts */
/**
 * @typedef {Map<number, string>} ColorByRow
 * - Mapping of a color's hex code in relation to the row index key
 */

export class ScheduleChecker extends HTMLElement {

    #shadowRoot;
    css = `
        :host {
            display: grid;
            grid-template-columns: 9fr 1fr;
            align-items: start;
        }
        table {
            position: relative;
            z-index: 10;
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
        td:hover {
            outline: dashed ${WARNING_COLORS.lightBlue};
        }
        td cell-id {
            display: none;
        }
        td:hover cell-id {
            display: inline;
            z-index: 9999;
        }
        .unrecognizedPanel {
            z-index: 0;
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

    headers;

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
    * @param {Shift[]} shifts 
    */
    createScheduleTable(grid, headers, shiftTimes, shifts) {
        this.shiftTimes = shiftTimes;
        this.headers = headers;
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

        /** First row is defined by the a specified shift time */
        const firstRow = this.findFirstShiftTimeRow("07:00-15:00", "GENERAL");

        // Create rows and add original col[row][0] cell names into scheduleTable
        for (let i = 0; i < grid.length; i++) {
            if (i < firstRow) continue; // ignore rows prior to "first row" as above

            const tr = document.createElement("tr");
            tr.id = `row${i}`;

            const td = document.createElement("td");
            td.id = `shiftTime-${i}`;
            td.textContent = grid[i][0];
            td.style.backgroundColor = this.applyCellColor(i, 0, grid[i][0]);

            tr.appendChild(td);
            this.scheduleTable.appendChild(tr);
        }

        // Format names for rendering, then add into a table data cell to its row
        for (let i = 0; i < shifts.length; i++) {
            const s = shifts[i];

            // all rows before the "first" row starting at the specified shift time
            if (s.coordinate.row < firstRow) continue;
            // omit shiftTime column as rendering occurred in prior loop
            if (s.coordinate.col === 0) continue;

            const name = s.names[s.names.length - 1];
            let nameToRender = "";

            if (name.length > 2) {
                nameToRender = capitalizeArray(name.split(" "));
            } else {
                nameToRender = name.toUpperCase();
            }

            // col index starts at 1 in table, offset by -1 to properly ref DAYS_OF_THE_WEEK
            const dayStr = getDateByColumn(s, this.headers);

            /** @type {HTMLTableRowElement} */
            let tr = this.scheduleTable.querySelector(`#row${s.coordinate.row}`);
            // tr row should likely always be defined, create it if not
            if (!tr) {
                tr = document.createElement("tr");
                tr.id = `row${s.coordinate.row}`;
                this.scheduleTable.appendChild(tr);
            }
            tr.appendChild(
                this.createTableData(s, nameToRender, dayStr)
            );
        }

        this.#shadowRoot.appendChild(this.scheduleTable);
    }


    /**
     * @param {Shift} shift 
     * @param {string} name 
     * @param {string} dayStr <Weekday> <weekdate> e.g.~ Wed 21
     */
    createTableData(shift, name, dayStr) {
        const td = document.createElement("td");

        // td id important for querySelector for warnings
        if (shift.coordinate.col === 0) {
            td.id = `shiftTime`;
        } else {
            td.id = `row${shift.coordinate.row}col${shift.coordinate.col}`;
        }

        // True row and col in the Excel schedule
        td.setAttribute("row", shift.coordinate.row);
        td.setAttribute("col", shift.coordinate.col);

        td.textContent = name;
        td.style.backgroundColor = this.applyCellColor(
            shift.coordinate.row,
            shift.coordinate.col,
            name
        );

        /** @type CellIdentifier */
        const cellId = document.createElement("cell-id");
        cellId.initCellInfo(shift, dayStr);

        td.appendChild(cellId);

        return td;
    }

    /**
     * @param {WarningsGroup} warnings 
     * @param {number} statCount 
     */
    applyEmployeeWarnings(warnings, statCount) {
        const warningsToRender = [
            { shifts: warnings.duplicate, type: "duplicate", title: "⚠️ Duplicate Shifts" },
            { shifts: warnings.notAvailable, type: "unavailable", title: "🚫 Scheduled Unavailable Tech" },
            { shifts: warnings.evening, type: "evening", title: "♂️ >1 Evening Male Tech" },
        ];

        const cellWarningsToRender = [
            ...warningsToRender,
            { shifts: warnings.regShiftMultiNames, type: "multiName", title: "Multiple Names in Cell" },
            { shifts: warnings.standbyMultiNames, type: "standbyMultiName", title: "On-Call Standby Multiple Names in Cell" },
            { shifts: warnings.emptyCells, type: "emptyCells", title: "Empty Shift Cells" },
        ];

        this.createShiftCountErrorDisplay(warnings.employeeShiftCount, statCount);
        this.createWarningsDisplay(warningsToRender);

        // highlight shift cells with warnings found
        warningsToRender.forEach(w => this.applyShiftWarnings(w.shifts, w.type));
        cellWarningsToRender.forEach(w => this.applyShiftWarnings(w.shifts, w.type));
    }

    /**
     * @param {EmployeeShiftCount} employeeShiftCount
     * @param {number} statCount 
     */
    createShiftCountErrorDisplay(employeeShiftCount, statCount) {
        const warningsContainer = document.createElement("div");
        warningsContainer.classList.add("shiftCountErrors");


        const shiftCountErrorTable = document.createElement("shift-count-error-table");
        shiftCountErrorTable.Render(employeeShiftCount, statCount);

        warningsContainer.appendChild(shiftCountErrorTable);

        const warningDOMBox = document.querySelector(".errorsWarnings");
        warningDOMBox.append(warningsContainer);
    }

    /**
     * @param {{shifts: Shift[]; type: string; title: string;}[]} warningsToRender
     */
    createWarningsDisplay(warningsToRender) {
        const warningsContainer = document.createElement("div");
        warningsContainer.classList.add("warnings");

        warningsToRender.forEach(w => {
            if (w.shifts.length === 0) return;

            /* @typedef {WarningTable} warningTable */
            const warningTable = document.createElement("warning-table");
            warningTable.Render(
                w.shifts.filter(s => s.shiftTime.toUpperCase() !== "AVAILABLE"),
                w.title,
                this.headers,
                NAMED_WARNING_COLORS[w.type]
            );
            warningsContainer.appendChild(warningTable);
        });

        const warningDOMBox = document.querySelector(".errorsWarnings");
        warningDOMBox.append(warningsContainer);
    }

    /**
     * @param {Shift[]} warnings 
     * @param {string} type 
     */
    applyShiftWarnings(warnings, type) {
        warnings.forEach(s => {
            /** @type {HTMLElement} foundCell */
            const foundCell = this.#shadowRoot.querySelector(
                `#row${s.coordinate.row}col${s.coordinate.col}`
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
            // not foolproof as any purely alphabetical notes would not be ignored
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

        // flags that is checked when a new row is reached
        let rowId = null;
        let rowContainsEmployee = false;

        const allCells = this.scheduleTable.querySelectorAll("td");
        for (let i = 0, cell; i < allCells.length; i++) {
            cell = allCells[i];

            if (cell.id.includes("shiftTime")) {
                if (rowId !== null) {
                    this.hideRowWithoutEmployee(rowId, rowContainsEmployee);
                }
                // set flags for next row
                rowId = cell.id;
                rowContainsEmployee = false;
                continue;
            }

            if (cell.innerText.toUpperCase() === employee.str_alias ||
                cell.innerText.toUpperCase() === employee.abbrev) {
                this.applyOpacity(cell, 1);
                this.highlightBorders(cell, "#4FC174"); // emerald green
                rowContainsEmployee = true;
            } else {
                this.applyOpacity(cell, 0.05);
            }
        }
        // Check final row as loop only checks n-1 rows
        this.hideRowWithoutEmployee(rowId, rowContainsEmployee);
    }

    /**
     * @param {Shift[]} shifts 
     */
    fadeAllCellsByShifts(shifts) {
        const allCells = this.scheduleTable.querySelectorAll("td");
        // fade all cells
        for (let i = 0; i < allCells.length; i++) {
            let cell = allCells[i];

            if (cell.id === "shiftTime") {
                continue;
            }
            const row = parseInt(cell.getAttribute("row"));
            const col = parseInt(cell.getAttribute("col"));
            if (!row || !col) {
                continue;
            }
            this.applyOpacity(cell, 0.05);
        }
        // set all rows to not display
        const allRows = this.scheduleTable.querySelectorAll("tr");
        allRows.forEach((row, i) => {
            if (i < 3) return; // continue showing first two header rows
            row.style.display = "none";
        });

        // query relevant shifts and highlight cell
        shifts.forEach(s => {
            const queryStr = `#row${s.coordinate.row}col${s.coordinate.col}`;
            const cell = this.scheduleTable.querySelector(queryStr);
            if (!cell) {
                return; // continue next iteration
            }
            this.applyOpacity(cell, 1);
            this.highlightBorders(cell, "#4FC174"); // emerald green

            // set row to visible if it was not displayed
            cell.parentNode.style.display = "";
        });
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
        // reset hidden rows previously set to display "none"
        const allRows = this.scheduleTable.querySelectorAll("tr");
        allRows.forEach(row => row.style.display = "");

        // reset all cells to non-faded appearance
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

    hideRowWithoutEmployee(rowId, containsEmployee) {
        const shiftTimeCell = this.scheduleTable.querySelector(`#${rowId}`);
        if (!shiftTimeCell) { console.error(`Could not find tr with row id: "${rowId}."`); }

        /** @type {HTMLTableRowElement} parentRow */
        const parentRow = shiftTimeCell.parentNode;
        if (!parentRow) { console.error(`Could not find parent node for cell with id ${rowId}.`); }

        if (!containsEmployee) {
            // Hide row that does not contain the employee
            parentRow.style.display = "none";
        } else {
            // Unhide row that does have the relevant employee
            parentRow.style.display = "";
        }
    }

    reset() {
        if (this.scheduleTable) {
            this.#shadowRoot.removeChild(this.scheduleTable);
            if (this.unrecognizedPanel.parentNode) {
                this.#shadowRoot.removeChild(this.unrecognizedPanel);
            }
        }

        const warningBox = document.querySelector(".errorsWarnings");
        if (warningBox) {
            warningBox.replaceChildren();
        }
    }
}

customElements.define("schedule-checker", ScheduleChecker);
