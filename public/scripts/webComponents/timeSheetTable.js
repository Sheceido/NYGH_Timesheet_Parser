import { DAYS_OF_THE_WEEK, BIWEEKLY, WARNING_COLORS } from "../constants.js";
import { capitalize } from "../utils.js";
import { HeaderWithCopyBtn } from "../webComponents/copyBtn.js";
import { WarningPopup } from "./warningPopup.js";
/** @typedef {import('../parser.js').Shift} Shift */
/** @typedef {import('../parser.js').ShiftMap} ShiftMap */
/** @typedef {import('../parser.js').StandbyHrs} StandbyHrs */
/** @typedef {import('../roster.js').Employee} Employee */
/** @typedef {import("../warnings.js").WarningsGroup} WarningsGroup */
/** @typedef {import("../warnings.js").MultipleNames} MultipleNames */
/** @typedef {import("../warnings.js").ShiftCountError} ShiftCountError */

export class TimesheetTable extends HTMLElement {

    #shadowRoot;
    /** @type {HeaderWithCopyBtn} headerCopyBtn */
    headerCopyBtn;
    /** @type HTMLStyleElement */
    style;
    css = `
        table {
            padding: 0.5em;
            border: 1px solid #ddd;
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
            padding-block: 1.5em;
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
    
    timesheet = "";
    /** @type {ShiftMap} */
    regShifts;
    /** @type {ShiftMap} */
    standbyShifts;

    constructor() {
        super();
        this.#shadowRoot = this.attachShadow({ mode: "closed" });

        this.style = document.createElement("style");
        this.style.textContent = this.css;

        this.headerCopyBtn = document.createElement("header-copybtn");

        this.#shadowRoot.appendChild(this.style);
        this.#shadowRoot.appendChild(this.headerCopyBtn);
    }

    /**
     * Appends the web component's shadow root with a newly generated HTMLTableElement containing provided data.
     * @param {Employee} employee
     * @param {string[]} headers 
     * @param {number} stats 
     * @param {ShiftMap} regShiftsMap 
     * @param {string | number} standbyHrs 
     * @param {ShiftMap} standbyShifts 
     * @param {WarningsGroup} warnings 
     */
    constructTable(employee, headers, stats, regShiftsMap, standbyHrs, standbyShifts, warnings) {
        if (!employee) { console.error("missing employee parameter"); return; }
        if (!headers) { console.error("missing headers parameter"); return; }
        if (!regShiftsMap) { console.error("missing regShiftsMap parameter"); return; }
        if (!standbyHrs) { console.error("missing standbyHrs parameter"); return; }
        if (!standbyShifts) { console.error("missing standbyShifts parameter"); return; }
        if (!warnings) { console.error("missing warnings parameter"); return; }

        this.regShifts = regShiftsMap;
        this.standbyShifts = standbyShifts;

        this.headerCopyBtn.setAttribute('header', this.generateHeader(employee, headers));
        this.headerCopyBtn.setAttribute('timesheet', this.generateTimesheet(regShiftsMap, standbyHrs));
        this.headerCopyBtn.reveal();

        // Create Timesheet Table
        this.#shadowRoot.appendChild(
            this.generateTable(headers, regShiftsMap, standbyHrs)
        );

        // Apply warnings to shift time row
        this.applyShiftTimeWarnings(warnings.duplicate, "duplicate", "shiftTime");
        this.applyShiftTimeWarnings(warnings.regShiftMultiNames, "multiName", "shiftTime");
        this.applyShiftTimeWarnings(warnings.standbyMultiNames, "standbyMultiName", "standbyHrs");
        this.applyShiftTimeWarnings(warnings.notAvailable, "unavailable", "shiftTime");
        this.applyShiftTimeWarnings(warnings.evening, "evening", "shiftTime");

        this.#shadowRoot.appendChild(
            this.generateShiftCountErrorComment(employee, warnings.shiftCount, stats)
        );
    }

    /**
     * @param {Employee} employee 
     * @param {string[]} headers 
     * @returns {string}
     */
    generateHeader(employee, headers) {
        return (headers.length === 15)
            ? `${capitalize(employee.first_name)}'s [${headers[0]} ${headers[1]}-${headers[headers.length-1]}] Timesheet`
            : `${capitalize(employee.first_name)}'s Timesheet`;

    }

    /**
     * @param {string[]} headers 
     * @param {ShiftMap} regShiftsMap 
     * @param {string | number} standbyHrs 
     * @param {WarningsGroup} warnings 
     * @returns {HTMLTableElement} table
     */
    generateTable(headers, regShiftsMap, standbyHrs) {
        const table = document.createElement("table");

        table.appendChild(this.createDaysOfTheWeek());
        table.appendChild(this.createDaysOfTheBiweekly(headers));
        const rows = this.createShiftTimeAndLocationRows(regShiftsMap);
        table.appendChild(rows.st);
        table.appendChild(this.createStandbyHrRow(standbyHrs));
        table.appendChild(rows.loc);

        return table;
    }

    /** 
     * @returns {HTMLTableRowElement}
     */
    createDaysOfTheWeek() {
        // Include name for days of the week in header
        const daysOfWeekRow = document.createElement("tr");
        daysOfWeekRow.appendChild(document.createElement("th")); //empty first element
        for (let i = 0; i < 2; i++) {
            for (let j = 0, th; j < DAYS_OF_THE_WEEK.length; j++) {
                th = document.createElement("th");
                th.textContent = DAYS_OF_THE_WEEK[j];
                daysOfWeekRow.appendChild(th);
            }
        }
        return daysOfWeekRow;
    }

    createDaysOfTheBiweekly(headers) {
        // include weekday numbers in header
        const headerRow = document.createElement("tr");
        for (let i = 0, th; i < headers.length; i++) {
            th = document.createElement("th");
            th.textContent = headers[i];
            headerRow.appendChild(th);
        }
        return headerRow;
    }

    /**
     * @param {ShiftMap} shiftMap 
     * @returns {{ HTMLTableRowElement, HTMLTableRowElement }}
     */
    createShiftTimeAndLocationRows(shiftMap) {
        // Shift Times for first row, generate warning icons if errors found
        const shiftTimeRow = document.createElement("tr");
        const stColumnTitle = document.createElement("td");
        stColumnTitle.textContent = "Shift Time";
        shiftTimeRow.appendChild(stColumnTitle);

        const locationRow = document.createElement("tr");
        const locColumnTitle = document.createElement("td");
        locColumnTitle.textContent = "Location";
        locationRow.appendChild(locColumnTitle);

        for (let i = 1, tdST, tdLOC; i <= BIWEEKLY; i++) {
            tdST = document.createElement("td");
            tdLOC = document.createElement("td");

            if (shiftMap.has(i)) {
                const shift = shiftMap.get(i);
                tdST.textContent = shift.shiftTime;
                tdST.id = `shiftTime-col${shift.coordinate.col}`;
                tdST.setAttribute("row", shift.coordinate.row);
                tdST.setAttribute("col", shift.coordinate.col);

                tdLOC.textContent = shift.location;
                tdLOC.id = `location-col${shift.coordinate.col}`;
                tdLOC.setAttribute("row", shift.coordinate.row);
                tdLOC.setAttribute("col", shift.coordinate.col);
            }
            shiftTimeRow.appendChild(tdST);
            locationRow.appendChild(tdLOC);
        }
        return { st: shiftTimeRow, loc: locationRow };
    }

    /**
     * @param {StandbyHrs} standbyHrs 
     * @returns {HTMLTableRowElement}
     */
    createStandbyHrRow(standbyHrs) {
        // On-call standby hours for second row, generate warning icon if errors found
        const standbyRow = document.createElement("tr");
        const columnTitle = document.createElement("td");

        columnTitle.textContent = "Standby Hrs";
        standbyRow.appendChild(columnTitle);

        for (let i = 1, td, shift; i <= BIWEEKLY; i++) {
            td = document.createElement("td");
            shift = this.standbyShifts.get(i);
            
            if (standbyHrs.has(i) && shift) {
                td.textContent = standbyHrs.get(i);
                td.id = `standbyHrs-col${i}`;
                td.setAttribute("row", shift.coordinate.row);
                td.setAttribute("col", shift.coordinate.col);
            }
            standbyRow.appendChild(td);
        }
        return standbyRow;
    }

    /**
     * @param {Shift[]} warnings 
     * @param {string} type 
     * @param {string} rowName
     */
    applyShiftTimeWarnings(warnings, type, rowName) {

        warnings.forEach(s => {
            const tdId = `${rowName}-col${s.coordinate.col}`;
            const foundCell = this.#shadowRoot.querySelector(`#${tdId}`);
            if (!foundCell) {
                return;
            }
            const cellRowIsShiftRow = Number(foundCell.getAttribute("row")) === s.coordinate.row;
            
            /** @type {WarningPopup} */
            const popup = document.createElement("warning-popup");

            switch(type) {
                case "duplicate":
                    popup.createDuplicateWarning();
                    break;

                case "evening":
                    popup.createEveningWarning();
                    break;

                case "multiName":
                    if(!cellRowIsShiftRow) {
                        return;
                    }
                    popup.createMultiNameWarning(s.names, type);
                    break;

                case "standbyMultiName":
                    if(!cellRowIsShiftRow) {
                        return;
                    }
                    popup.createMultiNameWarning(s.names, type);
                    break;

                case "unavailable":
                    popup.createUnavailableWarning();
                    break;
            }

            foundCell.appendChild(popup);
            popup.offsetRight(this.getIconOffset(foundCell));
        });
    }

    /**
     * @param {Element} cell
     * @returns {number} offset pixels based on number of warnings already populated in element
     * */
    getIconOffset(cell) {
        const WIDTH = 18;
        const priorErrors = cell.querySelectorAll(`warning-popup`);
        if (priorErrors.length > 1) {
            return (WIDTH * priorErrors.length) - WIDTH; // subtract width again for first element to be always top left corner
        }
        return -1;
    }

    /**
     * @param {Employee} employee 
     * @param {ShiftCountError} shiftCount 
     * @param {number} statsCount 
     * @returns {HTMLParagraphElement} p html tag containing prompt regarding the correct/incorrect number of shifts counted in this biweekly for the employee.
     */
    generateShiftCountErrorComment(employee, shiftCount, statsCount) {
        const p = document.createElement("p");
        p.classList.add("comments");
        p.style.width = "fit-content";
        p.style.padding = "1em";
        p.style.borderRadius = "4px";

        const successSpan = document.createElement("span");
        successSpan.textContent = " ✅ ";

        const errorSpan = document.createElement("span");
        errorSpan.textContent = " ❌ ";

        const promptSpan = document.createElement("span");
        promptSpan.style.fontFamily = "sans-serif";
        promptSpan.style.fontSize = "small";
    
        if (shiftCount.found === 0) {
            p.style.backgroundColor = "#CCF3CF";
            p.appendChild(successSpan);
            promptSpan.textContent = `${capitalize(employee.first_name)} has ${shiftCount.expected} shifts in this biweekly schedule (ignoring any duplicate errors), with (${statsCount}) stat holidays noted.`;

        } else if (shiftCount.found > 0) {
            p.style.backgroundColor = WARNING_COLORS.lightRed;
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalize(employee.first_name)} appears to have MORE THAN (${shiftCount.expected}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
        } else {
            p.style.backgroundColor = WARNING_COLORS.lightRed;
            p.appendChild(errorSpan);
            promptSpan.textContent = `${capitalize(employee.first_name)} appears to have LESS THAN (${shiftCount.expected}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
        }
        p.appendChild(promptSpan);

        return p;
    }

    /**
    * @param {ShiftMap} regShiftsMap 
    * @param {string | number} standbyHrs 
    */
    generateTimesheet(regShiftsMap, standbyHrs) {
        let tsvTimesheet = ``;

        for (let i = 1; i <= BIWEEKLY; i++) {
            if (regShiftsMap.has(i)) {
                const shift = regShiftsMap.get(i);
                tsvTimesheet += `${shift.shiftTime}\t`;
            } else {
                tsvTimesheet += `\t`;
            }
        }
        tsvTimesheet += `\n`;

        for (let i = 1; i <= BIWEEKLY; i++) {
            if (standbyHrs.has(i)) {
                const standByHours = standbyHrs.get(i);
                tsvTimesheet += `${standByHours}\t`;
            } else {
                tsvTimesheet += `\t`;
            }
        }
        tsvTimesheet += `\n`;

        for (let i = 1; i <= BIWEEKLY; i++) {
            if (regShiftsMap.has(i)) {
                const shift = regShiftsMap.get(i);
                tsvTimesheet += `${shift.location}\t`;
            } else {
                tsvTimesheet += `\t`;
            }
        }
        tsvTimesheet += `\n`;
        return tsvTimesheet;
    }

    /**
    * Hides header and copy btn, removes old table.
    */
    reset() {
        this.headerCopyBtn.hide();

        const prevTable = this.#shadowRoot.querySelector("table");
        if (prevTable) {
            this.#shadowRoot.removeChild(prevTable);
        }
        const errorComments = this.#shadowRoot.querySelector(".comments");
        if (errorComments) {
            this.#shadowRoot.removeChild(errorComments);
        }
    }
}

customElements.define("timesheet-table", TimesheetTable);
