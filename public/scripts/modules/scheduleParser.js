export class ScheduleParser {

    schedule;

    /** @param {string} scheduleData  */
    constructor(scheduleData) {
        this.schedule = this.parseScheduleToGrid(scheduleData)
    }

    /**
    * @param {string} scheduleStr 
    * @returns {string[][]} scheduleGrid
    *
    * Each row contains each day, indexed by: schedule[[row]][[col]].
    * Schedule[[row]][[0]] should always be the shift time column
    * This method normalizes values by all-caps and remove leading/trailing whitespaces
    */
    parseScheduleToGrid(scheduleStr) {
        const scheduleGrid = this.cleanSchedule(scheduleStr)
            .split("\n")                                // split rows
            .map(s => {                                 // for each row:
                const v = s.split("\t")                     // > split cells
                    .map(c => c.trim().toUpperCase())       // > clean each cell's whitespaces, normalize to all caps
                return v;
            });
        return scheduleGrid;
    }

    /**
     * @param {string} scheduleStr 
     * @returns {string} cleanedScheduleStr
     * Cleanses schedule string of abnormal copy and pasting issues from excel,
     * where cells that have multiple names and possibly a user-entered newline
     * between names results in extra quotations " surrounding the cell value
     *
     * - replaces any newlines within quotations as a space
     * - removes quotations
     */
    cleanSchedule(scheduleStr) {
        const schedStrChars = [];

        let insideQuotes = false;
        for (let i = 0; i < scheduleStr.length; i++) {
            const currChar = scheduleStr[i];

            if (currChar === `"`) {
                insideQuotes = !insideQuotes;
            }
            // replace \n within quotations with \s
            else if (currChar === `\n` && insideQuotes) {
                schedStrChars.push(` `);
            }
            // push all other chars
            else {
                schedStrChars.push(currChar);
            }
        }
        return schedStrChars.join("");
    }
}
