import type { Shift, Roster, Employee, ShiftOrigin, ScheduleRenderDataset, RowSemantic, RowSemanticKind as RowSemanticKindType } from "../types.js";
import { DAYS_OF_THE_WEEK, RowSemanticKind as RowSemanticKindValue, ShiftCategory as ShiftCategoryValue, categoryMap, locationMap, shiftTimeMap } from "../data/constants.js";
import { FULL_ROSTER } from "../data/roster.js";

export class ScheduleAnalyzer {
    private _weekdayHeader: string[];
    private _rowSemanticList: RowSemantic[];
    private _shiftList: Shift[];
    private _shiftOrigin: ShiftOrigin;

    /** Returns the extracted weekday headers (month abbreviation + dates). */
    get weekdayHeader(): string[] {
        return this._weekdayHeader;
    }

    /** Returns the list of row semantics (location, shift time, kind) for each schedule row. */
    get rowSemanticList(): RowSemantic[] {
        return this._rowSemanticList;
    }

    /** Returns all discovered shifts after analysis. */
    get shiftList(): Shift[] {
        return this._shiftList;
    }

    /** Returns a map from shift UUID to its original (row, column) coordinates. */
    get shiftOrigin(): ShiftOrigin {
        return this._shiftOrigin;
    }

    /** Initializes an empty analyzer. */
    constructor() {
        this._shiftList = [];
        this._shiftOrigin = new Map();
        this._weekdayHeader = [];
        this._rowSemanticList = [];
    }

    /**
     * Main entry point: analyzes the raw schedule grid and produces a renderable dataset.
     * @param scheduleGrid - 2D array of strings, each cell is a trimmed/uppercased representation of the schedule.
     * @returns Dataset containing headers, row semantics, shifts, and origin map.
     */
    analyze(scheduleGrid: string[][]): ScheduleRenderDataset {
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
        };
    }

    /**
     * Extracts the 14‑day date headers from row 1.
     * Assumes the first cell of row 1 contains month + year (e.g., "Jan-25") – we keep only the month.
     * @param scheduleGrid - The full schedule grid.
     * @returns Array where index 0 is the month abbreviation, indices 1..14 are the date strings.
     */
    extractWeekdayHeader(scheduleGrid: string[][]): string[] {
        const weekdayHeader: string[] = [];
        const BIWEEKLY = 14;
        const row = 1;

        // first cell of row 1 contains month + year, e.g. "Jan-25" – keep only month
        weekdayHeader.push(scheduleGrid[1][0].substring(0, 3));

        for (let i = 1; i <= BIWEEKLY; i++) {
            weekdayHeader.push(scheduleGrid[row][i]);
        }
        return weekdayHeader;
    }

    /**
     * Builds row semantics for every row in the schedule.
     * Determines:
     * - location (e.g., "GENERAL", "BDC") based on the first column value.
     * - shift time (normalized, e.g., "08:00-16:00") or status text.
     * - row kind (SHIFT, INHERITED_SHIFT, HEADER, STATUS).
     * @param scheduleGrid - The full schedule grid.
     * @returns Array of RowSemantic objects.
     */
    extractRowSemantics(scheduleGrid: string[][]): RowSemantic[] {
        const rowSemanticList: RowSemantic[] = [];
        let currLocation = "GENERAL";
        let lastKnownSemanticValue = "";

        for (let i = 0; i < scheduleGrid.length; i++) {
            let cellValue = scheduleGrid[i][0].trim().toUpperCase();
            let shiftTimeInherited = false;

            if (cellValue !== "") {
                lastKnownSemanticValue = cellValue;
            }

            const foundLocationChange = locationMap.get(cellValue);
            if (foundLocationChange) {
                currLocation = foundLocationChange;
            }

            if (cellValue === "") {
                shiftTimeInherited = true;
                cellValue = lastKnownSemanticValue;
            }

            const foundShiftTime = shiftTimeMap.get(cellValue);
            if (foundShiftTime) {
                rowSemanticList.push({
                    row: i,
                    location: currLocation,
                    kind: shiftTimeInherited ? RowSemanticKindValue.INHERITED_SHIFT : RowSemanticKindValue.SHIFT,
                    value: foundShiftTime,
                });
            } else {
                const precedingSemanticRow = rowSemanticList.length > 0
                    ? rowSemanticList[rowSemanticList.length - 1]
                    : null;

                rowSemanticList.push({
                    row: i,
                    location: currLocation,
                    kind: this.classifyRowKind(i, precedingSemanticRow, shiftTimeInherited),
                    value: cellValue,
                });
            }
        }
        return rowSemanticList;
    }

    /**
     * Determines the semantic kind of a row based on its index and inheritance.
     * Rules:
     * - If the row inherits from the previous row, use the previous row's kind.
     * - Otherwise, rows 0‑2 are HEADER, rows ≥3 are STATUS.
     * @param row - Zero‑based row index.
     * @param precedingRowSemantic - Semantic info of the previous row (may be null for first row).
     * @param inheritPreviousRow - True if this row's shift time was inherited (empty first column).
     * @returns Row semantic kind ("HEADER", "STATUS", or inherited value).
     */
    classifyRowKind(row: number, precedingRowSemantic: RowSemantic | null, inheritPreviousRow: boolean): RowSemanticKindType {
        if (precedingRowSemantic && inheritPreviousRow) {
            return precedingRowSemantic.kind;
        }
        if (row < 3) {
            return "HEADER";
        } else {
            return "STATUS";
        }
    }

    /**
     * Iterates over the schedule grid and creates Shift objects for every cell that represents a shift.
     * Also records the original row/column coordinates of each shift.
     * @param scheduleGrid - The full schedule grid.
     * @returns Object containing the array of discovered shifts and a map from shift ID to its origin.
     * @throws Error if no shift row is found or if a duplicate UUID is generated.
     */
    discoverShiftsAndOrigin(scheduleGrid: string[][]): { shifts: Shift[]; shiftOrigin: ShiftOrigin } {
        const shifts: Shift[] = [];
        const shiftOrigin: ShiftOrigin = new Map();

        const firstShiftRow = this._rowSemanticList.find(rs => rs.kind === RowSemanticKindValue.SHIFT);
        if (!firstShiftRow) {
            throw new Error("unable to identify first shift row to discover shifts and origins!");
        }
        const firstRow = firstShiftRow.row;

        const rowSemanticMap = new Map<number, RowSemantic>();
        this._rowSemanticList.forEach(rs => rowSemanticMap.set(rs.row, rs));

        const employeeMap = this.getEmployeeMap(FULL_ROSTER);

        for (const [rowNum, row] of scheduleGrid.entries()) {
            if (rowNum < firstRow) continue;

            for (const [colNum, cell] of row.entries()) {
                if (colNum === 0) continue;

                const rowSemantic = rowSemanticMap.get(rowNum);
                if (!rowSemantic) {
                    throw new Error("Expected defined rowSemantic, got undefined in discoverShiftsAndOrigins() method");
                }

                const newUUID = crypto.randomUUID();
                const names = this.parseCellToNames(cell);
                let category = categoryMap.get(rowSemantic.value);
                if (!category) {
                    console.warn(`undefined category: "${rowSemantic.value}", defaulting to HEADER category.`);
                    category = ShiftCategoryValue.HEADER;
                }

                let employee: Employee | null = null;
                if (employeeMap.has(names[names.length - 1])) {
                    employee = employeeMap.get(names[names.length - 1])!;
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
                shiftOrigin.set(newUUID, { row: rowNum, col: colNum });
            }
        }

        // Sort shifts by weekday (column), and within the same weekday by the row they came from.
        shifts.sort((a, b) => {
            const diff = a.weekday - b.weekday;
            if (diff === 0) {
                const aOrigin = shiftOrigin.get(a.id)!;
                const bOrigin = shiftOrigin.get(b.id)!;
                return aOrigin.row - bOrigin.row;
            }
            return diff;
        });

        return { shifts, shiftOrigin };
    }

    /**
     * Parses a raw cell string into an array of employee name tokens.
     * Handles:
     * - Empty cells → empty array.
     * - Single word, or cells containing "W/E" / "STAT" → return the whole string as one token.
     * - Multi‑word cells: splits by whitespace. Single‑letter parts may be concatenated to the previous part.
     * - "X" in a cell terminates processing.
     * @param name - Raw cell content.
     * @returns Array of name strings (e.g., `["JENNIFER", "JW"]`).
     */
    parseCellToNames(name: string): string[] {
        if (name === "") {
            return [];
        }

        const names = name.split(/\s+/);
        if (names.includes("W/E") || names.includes("STAT") || names.length < 2) {
            return [name];
        }

        const finalNames: string[] = [];
        for (let i = 0; i < names.length; i++) {
            const part = names[i];
            if (part.length >= 2) {
                finalNames.push(part);
            } else if (part.length === 1 && i !== 0) {
                finalNames.push(part + " " + names[i - 1]);
            } else if (part[0] === "X") {
                break;
            } else {
                console.warn(`name ${part} from ${names} with length ${part.length}, index: ${i} is not a valid/expected state!`);
                break;
            }
        }
        return finalNames;
    }

    /**
     * Creates a lookup map from employee alias and abbreviation to the full Employee object.
     * This allows quick matching of name tokens in schedule cells to the roster.
     * @param roster - The full roster (full_name → Employee).
     * @returns Map where keys are `str_alias` and `abbrev`, values are Employee objects.
     */
    getEmployeeMap(roster: Roster): Map<string, Employee> {
        return new Map(
            Object.values(roster).flatMap(emp => [
                [emp.str_alias, emp],
                [emp.abbrev, emp],
            ])
        );
    }

    /**
     * Constructs a formatted date string for a given column.
     * Example: "Sat Jan 15" (where `DAYS_OF_THE_WEEK[col-1]` is the weekday, and `_weekdayHeader[col]` is the date).
     * @param col - Column index (1‑based, from 1 to 14).
     * @returns Date string combining weekday and the header date.
     */
    getDate(col: number): string {
        return `${DAYS_OF_THE_WEEK[col - 1]} ${this._weekdayHeader[col]}`;
    }

    /**
     * Determines the final location for a shift.
     * If the base location is "OCSC / CONSUMER" and an employee exists, splits by gender:
     * - Male → "CONSUMER"
     * - Female → "OCSC"
     * Otherwise returns the original location.
     * @param location - Base location from row semantics.
     * @param employee - Employee assigned to the shift (may be null).
     * @returns Adjusted location string.
     * @throws Error if gender is not "M" or "F" when an employee is provided.
     */
    setLocationByGender(location: string, employee: Employee | null): string {
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
