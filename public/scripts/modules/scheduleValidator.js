/** @typedef {import("../types.d.ts").ValidationError} ValidationError */

export class ScheduleValidator {

    _errorCodes = {
        ROW_COUNT: "ROW_COUNT",
        COLUMN_COUNT: "COLUMN_COUNT",
        MISSING_HEADER: "MISSING_HEADER",
    }

    /** @type {ValidationError[]} _validationErrors */
    _validationErrors = [];

    /** @param {string[][]} scheduleGrid */
    constructor(scheduleGrid) {
        this.validateScheduleGrid(scheduleGrid);
    }

    get validationErrorList() {
        return this._validationErrors;
    }

    /** @param {string[][]} scheduleGrid */
    validateScheduleGrid(scheduleGrid) {
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

        const over = [];
        const under = [];

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
    * @param {number[]} idxArray 
    * @returns {string[]}
    */
    groupIndicesIntoRanges(idxArray) {

        if (idxArray.length === 1) {
            return [`[${idxArray[0] + 1}]`];
        }

        const groupedRanges = [];
        let currPtr = 1;
        let startPtr = 0;
        for (; currPtr < idxArray.length; currPtr++) {
            if (idxArray[currPtr] === idxArray[currPtr - 1] + 1) {
                // current number is prior numbers increment
                continue;
            } else {
                // current number is not an increment from prior number
                // +1 for both values to change from index by 0 to index by 1
                groupedRanges.push(`[${idxArray[startPtr] + 1} - ${idxArray[currPtr - 1] + 1}]`);
                startPtr = currPtr;
            }
        }
        // flush final range if for loop ended on a range that has sequential numbers
        groupedRanges.push(`[${idxArray[startPtr] + 1} - ${idxArray[currPtr - 1] + 1}]`);

        return groupedRanges;
    }
}
