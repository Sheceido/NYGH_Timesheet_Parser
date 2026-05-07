/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").Roster} Roster */
/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").ShiftOrigin} ShiftOrigin */
/** @typedef {import("../types.d.ts").RowSemantic} RowSemantic */
/** @typedef {import("../types.d.ts").ScheduleRenderDataset} ScheduleRenderDataset */

import { DAYS_OF_THE_WEEK, RowSemanticKind, ShiftCategory, categoryMap, locationMap, shiftTimeMap } from "../data/constants.js";
import { FULL_ROSTER } from "../data/roster.js";

export class ScheduleAnalyzer {

    /** @type {string[]} _weekdayHeader */
    _weekdayHeader;
    /** @type {RowSemantic[]} _rowSemanticList */
    _rowSemanticList;
    /** @type {Shift[]} shiftList */
    _shiftList;
    /** @type {ShiftOrigin} shiftOrigin */
    _shiftOrigin;

    /** @type {string[]} _weekdayHeader */
    get weekdayHeader() {
        return this._weekdayHeader;
    }
    /** @type {RowSemantic[]} _rowSemanticList} */
    get rowSemanticList() {
        return this._rowSemanticList;
    }
    /** @type {Shift[]} shiftList */
    get shiftList() {
        return this._shiftList;
    }
    /** @type {ShiftOrigin} shiftOrigin */
    get shiftOrigin() {
        return this._shiftOrigin;
    }

    /** @param {string[][]} scheduleGrid */
    constructor() {
        this._shiftList = null;
        this._shiftOrigin = new Map();
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {ScheduleRenderDataset}
     */
    analyze(scheduleGrid) {
        this._weekdayHeader = this.extractWeekdayHeader(scheduleGrid);
        this._rowSemanticList = this.extractRowSemantics(scheduleGrid);

        const { shifts, shiftOrigin } = this.discoverShiftsAndOrigin(scheduleGrid);
        this._shiftList = shifts;
        this._shiftOrigin = shiftOrigin;

        return {
            header: this._weekdayHeader,
            rowSemantics: this._rowSemanticList,
            shifts: this._shiftList,
            shiftOrigin: this._shiftOrigin,
        }
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {string[]}
     */
    extractWeekdayHeader(scheduleGrid) {
        /** @type {string[]} _weekdayHeader */
        let weekdayHeader = [];

        // Get headers if user copied the schedule properly from the first cell's known value
        const BIWEEKLY = 14;
        const row = 1;

        // truncate month header by omitting the -YY year ending
        weekdayHeader.push(scheduleGrid[1][0].substring(0, 3));

        for (let i = 1; i <= BIWEEKLY; i++) {
            weekdayHeader.push(scheduleGrid[row][i]);
        }
        return weekdayHeader;
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {RowSemantic[]}
     */
    extractRowSemantics(scheduleGrid) {
        /** @type {RowSemantic[]} _rowSemanticList */
        const rowSemanticList = [];

        let currLocation = "GENERAL";

        let lastKnownSemanticValue = "";

        for (let i = 0; i < scheduleGrid.length; i++) {
            let cellValue = scheduleGrid[i][0].trim().toUpperCase();
            // flag to determine if shiftTime will be inherited from prior row
            let shiftTimeInherited = false;

            if (cellValue !== "") {
                lastKnownSemanticValue = cellValue;
            }

            // extract semantic Location for row
            const foundLocationChange = locationMap.get(cellValue)
            if (foundLocationChange) {
                currLocation = foundLocationChange;
            }

            // extract semantic shiftTime for row
            if (cellValue == "") {
                // if cellValue was empty, shift is considered to inherit a shift time from a preceding row
                shiftTimeInherited = true;
                cellValue = lastKnownSemanticValue; // Update last known value for current and subsequent empty rows
            }

            const foundShiftTime = shiftTimeMap.get(cellValue)
            if (foundShiftTime) {
                rowSemanticList.push({
                    row: i,
                    location: currLocation,
                    kind: shiftTimeInherited ? RowSemanticKind.INHERITED_SHIFT : RowSemanticKind.SHIFT,
                    value: foundShiftTime
                });
            } else {
                const precedingSemanticRow = rowSemanticList.length > 0
                    ? rowSemanticList[rowSemanticList.length - 1]
                    : null;

                rowSemanticList.push({
                    row: i,
                    location: currLocation,
                    kind: this.classifyRowKind(i, precedingSemanticRow, shiftTimeInherited),
                    value: cellValue
                });
            }
        }
        return rowSemanticList;
    }

    /**
     * @param {number} row 
     * @param {RowSemantic | null} precedingRowSemantic
     * @param {boolean} inheritPreviousRow 
     * @return {string}
     */
    classifyRowKind(row, precedingRowSemantic, inheritPreviousRow) {
        // if first row, precedingRowSemantic will be null, moving to next if case
        // if flagged as an empty cell, default to inheriting the previous row's kind
        if (precedingRowSemantic && inheritPreviousRow) {
            const priorRowKind = precedingRowSemantic.kind;
            return priorRowKind;
        }
        // default assume first 3 rows can be headers
        if (row < 3) {
            return "HEADER";
        } else {
            return "STATUS";
        }
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {shifts: Shift[], origins: ShiftOrigin}
     **/
    discoverShiftsAndOrigin(scheduleGrid) {
        /** @type {Shift[]} shifts */
        const shifts = [];
        /** @type {ShiftOrigin} shiftOrigin */
        const shiftOrigin = new Map();

        const firstShiftRow = this._rowSemanticList.find(rs => rs.kind === "SHIFT");
        if (!firstShiftRow) {
            throw new Error("unable to identify first shift row to discover shifts and origins!");
        }
        const firstRow = firstShiftRow.row;

        /** @type {Map<number, RowSemantic>} */
        const rowSemanticMap = new Map();
        this._rowSemanticList.forEach(rs => rowSemanticMap.set(rs.row, rs));

        const employeeMap = this.getEmployeeMap(FULL_ROSTER);

        for (const [rowNum, row] of scheduleGrid.entries()) {
            if (rowNum < firstRow) continue; //ignore checking rows before the first shift time

            for (const [colNum, cell] of row.entries()) {
                if (colNum === 0) continue; // ignore checking first column

                const rowSemantic = rowSemanticMap.get(rowNum);
                if (!rowSemantic) {
                    throw new Error("Expected defined rowSemantic, got undefined in discoverShiftsAndOrigins() method");
                }


                const newUUID = crypto.randomUUID();
                const names = this.parseCellToNames(cell);
                let category = categoryMap.get(rowSemantic.value);
                if (!category) {
                    console.warn(`undefined category: "${rowSemantic.value}", defaulting to HEADER category.`);
                    category = ShiftCategory.HEADER;
                }

                let employee = null;
                if (employeeMap.has(names[names.length - 1])) {
                    employee = employeeMap.get(names[names.length - 1]);
                }

                shifts.push({
                    id: newUUID,
                    names: names,
                    employee: employee,
                    weekday: colNum,
                    date: this.getDate(colNum),
                    location: this.setLocationByGender(rowSemantic.location, employee),
                    shiftTime: rowSemantic.value,
                    rowKind: rowSemantic.kind,
                    category: category,
                });

                if (shiftOrigin.has(newUUID)) {
                    throw new Error(`ERROR: duplicate UUID found! ${newUUID}`);
                }
                shiftOrigin.set(newUUID, { row: rowNum, col: colNum, });
            }
        }

        // Sort shifts by column - if same column, sort by row
        shifts.sort((a, b) => {
            const diff = a.weekday - b.weekday;
            if (diff === 0) {
                const aOrigin = shiftOrigin.get(a.id);
                const bOrigin = shiftOrigin.get(b.id);

                return (aOrigin.row - bOrigin.row)
            }
            return diff;
        });

        return { shifts, shiftOrigin };
    }

    /**
     * @param {string} name 
     * @return {string[]}
     */
    parseCellToNames(name) {
        // Empty cell
        if (name === "") {
            return [];
        }

        // Cell with multiple words not qualifying as multiple names
        const names = name.split(/\s+/);
        if (names.includes("W/E") ||
            names.includes("STAT") ||
            names.length < 2
        ) {
            return [name];
        }

        /** @type {string[]} finalNames */
        const finalNames = [];

        // single letters are concat with prior name, e.g.~ ["Tom", "B"] => ["Tom B"]
        // two or more letters are treated as a name, e.g.~ ["Bo", "Peter"] => ["Bo", "Peter"]
        // single letter as first found value is undefined semantic, e.g.~ ["R", "ob"] => [] with warning
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (name.length >= 2) {
                finalNames.push(name);
            }
            else if (name.length == 1 && i != 0) {
                finalNames.push(name.concat(" ", names[i - 1]));
            }
            else if (name[0] === "X") {
                // If we hit 'X', we might want to break entirely if it signifies an empty shift
                break;
            } else {
                console.warn(`name ${name} from ${names} with length ${name.length}, index: ${i} is not a valid/expected state!`);
                // If we break here, we skip processing the rest of the names array.
                break;
            }
        }
        return finalNames;
    }

    /** @param {Roster} roster  */
    getEmployeeMap(roster) {
        // Create a look up table that matches first_name/str_alias/abbrev to their respective employee
        const employeeMap = new Map(
            [...Object.values(roster)]
                .flatMap(emp =>
                    [
                        [emp.str_alias, emp],
                        [emp.abbrev, emp],
                    ]
                )
        );
        return employeeMap;
    }

    getDate(col) {
        return `${DAYS_OF_THE_WEEK[col - 1]} ${this._weekdayHeader[col]}`
    }

    /**
     * @param {Employee | null} employee
     * @returns {string}
     */
    setLocationByGender(location, employee) {
        if (location !== "OCSC / CONSUMER" || employee === null) {
            return location;

        } else {
            switch (employee.gender) {
                case "M":
                    return "CONSUMER";
                case "F":
                    return "OCSC";
                default:
                    throw new Error(`Undefined Gender "${employee.gender}" for ${employee.str_alias}`);
            }
        }
    }
}
