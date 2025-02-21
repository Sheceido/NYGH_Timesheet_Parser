import { capitalize } from "../utils.js";
import { HeaderWithCopyBtn } from "../webComponents/copyBtn.js";
import { Warnings } from "../warnings.js";
/** @typedef {import('../parser.js').Shift} Shift */
/** @typedef {import('../parser.js').ShiftMap} ShiftMap */
/** @typedef {import('../roster.js').Employee} Employee */
/** @typedef {import("../warnings.js").WarningsGroup} WarningsGroup */
/** @typedef {import("../warnings.js").MultipleNames} MultipleNames */

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
        }
        img:hover + div.context {
            display: block;
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
            left: -50px;
            width: 200px;
            border: 1px solid #bbb;
            border-radius: 3px;
            background-color: white;
            box-shadow: 5px 5px 5px #ccc;
            padding: 2em;
        }
        div.context h3 {
            font-family: sans-serif;
            font-size: large;
            margin: 0;
            margin-bottom: 1em;
        }
        div.context p {
            margin-block: 2px;
            padding: 0.5em;
            padding-block: 1.0em;
            font-size: medium;
            background-color: #f1f1f1;
            border-radius: 5px;
        }
    `;
    
    timesheet = "";

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
     * @param {ShiftMap} regShiftsMap 
     * @param {string | number} standbyHrs 
     * @param {WarningsGroup} warnings 
     */
    constructTable(employee, headers, regShiftsMap, standbyHrs, warnings) {
        if (!employee) { console.log("missing employee parameter"); return; }
        if (!headers) { console.log("missing headers parameter"); return; }
        if (!regShiftsMap) { console.log("missing regShiftsMap parameter"); return; }
        if (!standbyHrs) { console.log("missing standbyHrs parameter"); return; }
        if (!warnings) { console.log("missing warnings parameter"); return; }

        this.headerCopyBtn.setAttribute('header', this.generateHeader(employee, headers));
        this.headerCopyBtn.setAttribute('timesheet', this.generateTimesheet(regShiftsMap, standbyHrs));
        this.headerCopyBtn.reveal();

        this.#shadowRoot.appendChild(
            this.generateTable(headers, regShiftsMap, standbyHrs, warnings)
        );
    }

    /**
     * @param {Employee} employee 
     * @param {string[]} headers 
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
    generateTable(headers, regShiftsMap, standbyHrs, warnings) {
        const BIWEEKLY = 14;
        const DAYS_OF_THE_WEEK = ["Sat", "Sun", "Mon", "Tues", "Wed", "Thurs", "Fri"];

        const table = document.createElement("table");

        // Include name for days of the week in header
        const daysOfWeekRow = document.createElement("tr");
        daysOfWeekRow.appendChild(document.createElement("th"));
        for (let i = 0; i < 2; i++) {

            for (let j = 0, th; j < DAYS_OF_THE_WEEK.length; j++) {
                th = document.createElement("th");
                th.textContent = DAYS_OF_THE_WEEK[j];
                daysOfWeekRow.appendChild(th);
            }
            table.appendChild(daysOfWeekRow);
        }

        // include weekday numbers in header
        const headerRow = document.createElement("tr");
        for (let i = 0, th; i < headers.length; i++) {
            th = document.createElement("th");
            th.textContent = headers[i];
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // Shift Times for first row
        const shiftTimeRow = document.createElement("tr");
        const stColumnTitle = document.createElement("td");
        stColumnTitle.textContent = "Shift Time";
        shiftTimeRow.appendChild(stColumnTitle);

        for (let i = 1, td; i <= BIWEEKLY; i++) {
            td = document.createElement("td");

            if (regShiftsMap.has(i)) {
                const shift = regShiftsMap.get(i);
                td.textContent = shift.shiftTime;

                let hasError = false;

                // Add warnings icon with context if duplicate shifts found in day
                if (warnings.duplicate.has(i)) {
                    hasError = true;

                    const headerP = document.createElement("h3");
                    headerP.textContent = `?Duplicate Scheduling`;

                    const pElements = warnings.duplicate.get(i).map(shift => {
                        const p = document.createElement("p");
                        p.textContent = `${shift.location} site @ ${shift.shiftTime}`;
                        return p;
                    });

                    td.appendChild(
                        this.addImageSymbolWithContext(
                            "./images/icons8-error-48.png",
                            "error",
                            [headerP, ...pElements],
                            "red",
                            "top"
                        )
                    );
                }

                // Add question icon with context if multiple names were in cell
                const multiNamed = Warnings.shiftInMultipleNames(
                    warnings.multipleNames, shift
                );
                if (multiNamed) {
                    const h3 = document.createElement("h3");
                    h3.textContent = `Multiple names in Cell`;

                    const p = document.createElement("p");
                    p.textContent = `${multiNamed.names.join(" | ")}`;

                    const imgWithCtx = this.addImageSymbolWithContext(
                        "./images/icons8-question-mark-48.png",
                        "question",
                        [h3, p],
                        "#2196F3", // light blue matching ? icon
                        "top"
                    );

                    if (hasError) {
                        imgWithCtx.querySelector("img").style.right = "15px";
                    }

                    td.appendChild(imgWithCtx);
                }

            }
            shiftTimeRow.appendChild(td);
        }
        table.appendChild(shiftTimeRow);

        // On-call standby hours for second row
        const standbyRow = document.createElement("tr");
        const standbyColumnTitle = document.createElement("td");
        standbyColumnTitle.textContent = "Standby Hrs";
        standbyRow.appendChild(standbyColumnTitle);

        for (let i = 1, td; i <= BIWEEKLY; i++) {
            td = document.createElement("td");

            if (standbyHrs.has(i)) {
                const standByHours = standbyHrs.get(i);
                td.textContent = standByHours;
            }
            standbyRow.appendChild(td);
        }
        table.appendChild(standbyRow);

        // Location for each shift for third row
        const locationRow = document.createElement("tr");
        const locationColumnTitle = document.createElement("td");
        locationColumnTitle.textContent = "Location";
        locationRow.appendChild(locationColumnTitle);

        for (let i = 1, td; i <= BIWEEKLY; i++) {
            td = document.createElement("td");

            if (regShiftsMap.has(i)) {
                const shift = regShiftsMap.get(i);
                td.textContent = shift.location;
            }
            locationRow.appendChild(td);
        }
        table.appendChild(locationRow);
        return table;
    }

    /**
    * @param {ShiftMap} regShiftsMap 
    * @param {string | number} standbyHrs 
    */
    generateTimesheet(regShiftsMap, standbyHrs) {
        let tsvTimesheet = ``;
        const BIWEEKLY = 14;

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
     * @param {HTMLElement[]} ctxChildEl 
     * @returns {HTMLDivElement} user-defined symbol with added context on hover
     **/
    addImageSymbolWithContext(src, className, ctxChildEl, colorCode, direction) {
        const imgCtxContainer = document.createElement("div");
        imgCtxContainer.classList.add("ctxContainer");

        const img = new Image(20, 20);
        img.src = src;
        img.classList.add(className);
        
        const context = document.createElement("div");
        context.classList.add("context");
        if (colorCode !== "") {
            context.style.borderColor = colorCode;
        }
        switch(direction) {
            case "top":
                context.style.bottom = `${context.offsetHeight + 5}px`;
                break;
            case "bottom":
                context.style.top = "-30px";
                break;
        }

        ctxChildEl.forEach(element => context.appendChild(element));

        imgCtxContainer.appendChild(img);
        imgCtxContainer.append(context);

        return imgCtxContainer;
    }

    /**
    * Hides header and copy btn, removes old table.
    */
    reset() {
        this.headerCopyBtn.hide();
        document.querySelector(".comments").textContent = "";

        const prevTable = this.#shadowRoot.querySelector("table");
        if (prevTable) {
            this.#shadowRoot.removeChild(prevTable);
        }
    }
}

customElements.define("timesheet-table", TimesheetTable);
