export class ScheduleParser {
    schedule: string[][];

    constructor(scheduleData: string) {
        this.schedule = this.parseScheduleToGrid(scheduleData);
    }

    /**
     * Parses the raw schedule string into a 2D grid.
     * Each row contains each day, indexed by schedule[row][col].
     * schedule[row][0] should always be the shift time column.
     * Normalizes values by trimming whitespace and converting to uppercase.
     */
    parseScheduleToGrid(scheduleStr: string): string[][] {
        const scheduleGrid = this.cleanSchedule(scheduleStr)
            .split("\n")
            .map(row => {
                return row.split("\t").map(cell => cell.trim().toUpperCase());
            });
        return scheduleGrid;
    }

    /**
     * Cleans the schedule string of abnormal copy/pasting issues from Excel,
     * where cells that have multiple names and possibly a user‑entered newline
     * between names results in extra quotation marks surrounding the cell value.
     *
     * - Replaces any newlines inside quotes with a space
     * - Removes the quotes
     */
    cleanSchedule(scheduleStr: string): string {
        const schedStrChars: string[] = [];
        let insideQuotes = false;

        for (let i = 0; i < scheduleStr.length; i++) {
            const currChar = scheduleStr[i];

            if (currChar === `"`) {
                insideQuotes = !insideQuotes;
            } else if (currChar === `\n` && insideQuotes) {
                schedStrChars.push(` `);
            } else {
                schedStrChars.push(currChar);
            }
        }
        return schedStrChars.join("");
    }
}
