import type { ValidationError } from "../types.js";

/**
 * Validates the structure of a parsed schedule grid.
 * Checks row count, header presence/content, and column uniformity.
 */
export class ScheduleValidator {
    /** Error code constants for different validation failures. */
    private _errorCodes = {
        ROW_COUNT: "ROW_COUNT",
        COLUMN_COUNT: "COLUMN_COUNT",
        MISSING_HEADER: "MISSING_HEADER",
    };

    /** Accumulated validation errors from the schedule grid check. */
    private _validationErrors: ValidationError[] = [];

    /**
     * Creates a new ScheduleValidator and immediately validates the given grid.
     * @param scheduleGrid - 2D array of strings representing the parsed schedule.
     */
    constructor(scheduleGrid: string[][]) {
        this.validateScheduleGrid(scheduleGrid);
    }

    /**
     * Returns the list of validation errors found during validation.
     * @returns Array of validation error objects.
     */
    get validationErrorList(): ValidationError[] {
        return this._validationErrors;
    }

    /**
     * Performs structural validation on the schedule grid.
     * Checks:
     * - Total row count (expects at least 45 rows)
     * - First cell (header) exists and equals "US - LESLIE"
     * - Each row has exactly 15 columns (records rows with more or fewer columns)
     *
     * @param scheduleGrid - The schedule grid to validate.
     */
    validateScheduleGrid(scheduleGrid: string[][]): void {
        if (scheduleGrid.length < 45) {
            this._validationErrors.push({
                code: this._errorCodes.ROW_COUNT,
                message: `[Error]: < 45 rows detected, may not have included certain rows.`,
            });
        }

        if (!scheduleGrid[0][0]) {
            this._validationErrors.push({
                code: this._errorCodes.MISSING_HEADER,
                message: `[Error]: Missing required header data.`,
            });
        }

        if (scheduleGrid[0][0] !== "US - LESLIE") {
            this._validationErrors.push({
                code: this._errorCodes.MISSING_HEADER,
                message: `[Error]: Missing required header data "US - LESLIE" in the first cell`,
            });
        }

        const over: number[] = [];
        const under: number[] = [];

        for (let i = 0; i < scheduleGrid.length; i++) {
            if (scheduleGrid[i].length > 15) {
                over.push(i);
            }
            if (scheduleGrid[i].length < 15) {
                under.push(i);
            }
        }

        if (over.length > 0) {
            const overRanges = this.groupIndicesIntoRanges(over);
            this._validationErrors.push({
                code: this._errorCodes.COLUMN_COUNT,
                message: `[Error] ${this._errorCodes.COLUMN_COUNT}: Expected 15 columns each row, found row(s) ${overRanges.join(", ")} with > 15 columns.`,
            });
        }

        if (under.length > 0) {
            const underRanges = this.groupIndicesIntoRanges(under);
            this._validationErrors.push({
                code: this._errorCodes.COLUMN_COUNT,
                message: `[Error] ${this._errorCodes.COLUMN_COUNT}: Expected 15 columns each row, found row(s) ${underRanges.join(", ")} with < 15 columns.`,
            });
        }
    }

    /**
     * Converts an array of row indices into human‑readable range strings.
     * Consecutive indices are grouped as "A - B", single indices as "[index]".
     *
     * @param idxArray - Sorted array of zero‑based row indices that failed column count.
     * @returns Array of range strings, e.g., `["[2 - 4]", "[6]"]`.
     *
     * @example
     * groupIndicesIntoRanges([1,2,3,5]) -> ["[2 - 4]", "[6]"]   // (indices +1 for 1‑based display)
     */
    groupIndicesIntoRanges(idxArray: number[]): string[] {
        if (idxArray.length === 1) {
            return [`[${idxArray[0] + 1}]`];
        }

        const groupedRanges: string[] = [];
        let currPtr = 1;
        let startPtr = 0;
        for (; currPtr < idxArray.length; currPtr++) {
            if (idxArray[currPtr] === idxArray[currPtr - 1] + 1) {
                // current number is prior numbers increment – continue the range
                continue;
            } else {
                // break in sequence – close current range and start a new one
                // +1 to convert from zero‑based index to 1‑based row number
                groupedRanges.push(`[${idxArray[startPtr] + 1} - ${idxArray[currPtr - 1] + 1}]`);
                startPtr = currPtr;
            }
        }
        // flush the final range (whether single or multi‑index)
        groupedRanges.push(`[${idxArray[startPtr] + 1} - ${idxArray[currPtr - 1] + 1}]`);

        return groupedRanges;
    }
}
