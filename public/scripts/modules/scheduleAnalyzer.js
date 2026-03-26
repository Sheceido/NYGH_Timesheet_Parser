/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").Employee} Employee */
/** @typedef {import("../types.d.ts").ShiftOrigin} ShiftOrigin */
/** @typedef {import("../types.d.ts").RowSemantic} RowSemantic */
/** @typedef {import("../types.d.ts").ScheduleRenderDataset} ScheduleRenderDataset */

import { DAYS_OF_THE_WEEK, RowSemanticKind, ShiftCategory, categoryMap, locationMap, shiftTimeMap } from "../data/constants.js";
import { CASUAL_ROSTER, ROSTER } from "../data/roster.js";

export class ScheduleAnalyzer {

    /** @type {string[]} weekdayHeader */
    weekdayHeader;
    /** @type {RowSemantic[]} rowSemanticList */
    rowSemanticList;
    /** @type {Shift[]} shiftList */
    shiftList = [];
    /** @type {ShiftOrigin} shiftOrigin */
    shiftOrigin = new Map();

    /** @param {string[][]} scheduleGrid */
    constructor(scheduleGrid) {
        this.weekdayHeader = this.extractWeekdayHeader(scheduleGrid);
        this.rowSemanticList = this.extractRowSemantics(scheduleGrid);

        const { shifts, shiftOrigin } = this.discoverShiftsAndOrigin(scheduleGrid);
        this.shiftList = shifts;
        this.shiftOrigin = shiftOrigin;
    }

    /** @returns {ScheduleRenderDataset} */
    get scheduleRenderDataset() {
        return {
            header: this.weekdayHeader,
            rowSemantics: this.rowSemanticList,
            shifts: this.shiftList,
            shiftOrigin: this.shiftOrigin,
        }
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {string[]}
     */
    extractWeekdayHeader(scheduleGrid) {
        /** @type {string[]} weekdayHeader */
        let weekdayHeader = [];

        // Get headers if user copied the schedule properly from the first cell's known value
        if (scheduleGrid[0][0] === "US - LESLIE") {
            const BIWEEKLY = 14;
            const row = 1;

            // truncate month header by omitting the -YY year ending
            weekdayHeader.push(scheduleGrid[1][0].substring(0, 3));

            for (let i = 1; i <= BIWEEKLY; i++) {
                weekdayHeader.push(scheduleGrid[row][i]);
            }
        }
        return weekdayHeader;
    }

    /**
     * @param {string[][]} scheduleGrid
     * @returns {RowSemantic[]}
     */
    extractRowSemantics(scheduleGrid) {
        /** @type {RowSemantic[]} rowSemanticList */
        const rowSemanticList = [];

        let currLocation = "GENERAL";

        for (let i = 0; i < scheduleGrid.length; i++) {
            let cellValue = scheduleGrid[i][0].trim().toUpperCase();

            // flag to determine if shiftTime will be inherited from prior row
            let shiftTimeInherited = false;

            // extract semantic Location for row
            const foundLocationChange = locationMap.get(cellValue)
            if (foundLocationChange) {
                currLocation = foundLocationChange;
            }

            // extract semantic shiftTime for row
            if (cellValue == "") {
                // if cellValue was empty, shift is considered to inherit a shift time from a preceding row
                shiftTimeInherited = true;

                // find preceding shiftTime
                let j = i - 1;
                while (cellValue == "" && j >= 0) {
                    cellValue = scheduleGrid[j--][0].trim().toUpperCase();
                }
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

        const firstShiftRow = this.rowSemanticList.find(rs => rs.kind === "SHIFT");
        if (!firstShiftRow) {
            console.error("ERROR: unable to identify first shift row to discover shifts and origins!");
            return;
        }
        const firstRow = firstShiftRow.row;

        /** @type {Map<number, RowSemantic>} */
        const rowSemanticMap = new Map();
        this.rowSemanticList.forEach(rs => rowSemanticMap.set(rs.row, rs));

        for (const [rowNum, row] of scheduleGrid.entries()) {
            if (rowNum < firstRow) continue; //ignore checking rows before the first shift time

            for (const [colNum, cell] of row.entries()) {
                if (colNum === 0) continue; // ignore checking first column

                const rowSemantic = rowSemanticMap.get(rowNum);
                if (!rowSemantic) {
                    console.error("ERROR: Expected defined rowSemantic, got undefined in discoverShiftsAndOrigins() method");
                    return;
                }


                const newUUID = crypto.randomUUID();
                const names = this.parseCellToNames(cell);
                let category = categoryMap.get(rowSemantic.value);
                if (!category) {
                    console.warn(`undefined category: "${rowSemantic.value}", defaulting to HEADER category.`);
                    category = ShiftCategory.HEADER;
                }

                const employee = this.matchEmployeeByRoster(names[names.length - 1])

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
                    console.error(`ERROR: duplicate UUID found! ${newUUID}`);
                    return;
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
        names.forEach((name, i) => {

            if (name.length >= 2) {
                finalNames.push(name);
            }
            else if (name.length == 1 && i != 0) {
                finalNames.push(name.concat(" ", names[i - 1]));
            }
            else if (name[0] === "X") { // "X" is used to mark an empty shift to be not-filled
                return [];
            } else {
                console.warn(`name ${name} from ${names} with length ${name.length}, index: ${i} is not a valid/expected state!`)
                return [];
            }
        });

        return finalNames;
    }

    /**
     * @param {string} name 
     * @return {Employee | null}
     */
    matchEmployeeByRoster(name) {
        // try matching FTR roster list
        for (const [_, employee] of Object.entries(ROSTER)) {
            if (
                employee.first_name === name ||
                employee.str_alias === name ||
                employee.abbrev === name
            ) {
                return employee;
            }
        }
        // try matching casual roster list
        for (const [_, employee] of Object.entries(CASUAL_ROSTER)) {
            if (
                employee.first_name === name ||
                employee.str_alias === name ||
                employee.abbrev === name
            ) {
                return employee;
            }
        }
        return null;
    }

    getDate(col) {
        return `${DAYS_OF_THE_WEEK[col - 1]} ${this.weekdayHeader[col]}`
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
                    console.error(`Undefined Gender "${employee.gender}" for ${employee.str_alias}`);
                    return;
            }
        }
    }
}
