/**
 * @typedef {import('./parser.js').Shift} Shift
 */
import { ScheduleTimeSheetParser } from "./parser.js";

const outputTable = document.querySelector(".output");
const outputErrors = document.querySelector(".errors");
const copyBtn = document.querySelector(".copy");
let timesheet = "";

copyBtn.addEventListener("click", () => { copyToClipboard(timesheet) });

export function parse() {
    /**
     * @type {HTMLTextAreaElement} scheduleStr
     */
    const scheduleTextArea = document.querySelector(".schedule");
    const scheduleStr = scheduleTextArea.value;
    /**
     * @type {HTMLInputElement}
     */
    const selectEmployee = document.querySelector(".employee");
    const employee = selectEmployee.value;

    const parser = new ScheduleTimeSheetParser(scheduleStr, employee);
    const shifts = parser.findShifts();

    /**
     * @type {{map: Map<number, Shift>, errors: string[]}} regularShifts
     */
    const regularShifts = parser.getRegularHoursMap(shifts);

    /**
     * @type {Map<number, number>} onCallStandBy
     */
    const onCallStandBy = parser.getStandbyHourMap(shifts);

    outputTable.innerHTML = getTableRowsByMapping(regularShifts.map, onCallStandBy);
    outputErrors.innerHTML = getShiftErrors(regularShifts.errors);

    timesheet = copyableTimesheet(regularShifts.map, onCallStandBy);
}

/**
 * @param {Map<number, Shift>} regularShifts 
 * @param {Map<number, number>} onCallStandBy
 * @returns {string} html table corresponding to the timesheet
 */
function getTableRowsByMapping(regularShifts, onCallStandBy) {
    
    let htmlTableStr = `<tr><th></th>`;

    // Include weekday headers
    for (let i = 0; i < 2; i++) {
        htmlTableStr += `<th>Saturday</th><th>Sunday</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th>`;
    }
    htmlTableStr += "</tr>";

    htmlTableStr += `<tr><td>Shift Time</td>`;
    // Find shift times for first row
    for (let i = 1; i <= 14; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            htmlTableStr += `<td>${shift.shiftTime}</td>`;
        } else {
            htmlTableStr += `<td></td>`;
        }
    }

    htmlTableStr += `</tr>\n<tr><td>Standby Hours</td>`;
    // Find any on-call standby hours for second row
    for (let i = 1; i <= 14; i++) {
        if (onCallStandBy.has(i)) {
            const standByHours = onCallStandBy.get(i);
            htmlTableStr += `<td>${standByHours}</td>`;
        } else {
            htmlTableStr += `<td></td>`;
        }
    }

    htmlTableStr += `</tr>\n<tr><td>Location</td>`;
    // Find location corresponding to the shift times of the first row
    for (let i = 1; i <= 14; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            htmlTableStr += `<td>${shift.location}</td>`;
        } else {
            htmlTableStr += `<td></td>`;
        }
    }
    htmlTableStr += `</tr>\n`;

    return htmlTableStr;
}

/**
 * @param {string[]} errors 
 * @returns {string} concatenated string of errors as innerHTML
 */
function getShiftErrors(errors) {
    let htmlErrors = ``;

    if (errors.length < 1) {
        return `No errors found by parser.`;
    }

    for (let i = 0; i < errors.length; i++) {
        htmlErrors += `<p>${errors[i]}</p>\n`;
    }
    return htmlErrors;
}

/**
 * @param {Map<number, Shift>} regularShifts 
 * @param {Map<number, number>} onCallStandBy
 * @returns {string} tsvTimesheet: copyable to Excel 365
 */
function copyableTimesheet(regularShifts, onCallStandBy) {
    let tsvTimesheet = ``;

    for (let i = 1; i <= 14; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            tsvTimesheet += `${shift.shiftTime}\t`;
        } else {
            tsvTimesheet += `\t`;
        }
    }
    tsvTimesheet += `\n`;

    for (let i = 1; i <= 14; i++) {
        if (onCallStandBy.has(i)) {
            const standByHours = onCallStandBy.get(i);
            tsvTimesheet += `${standByHours}\t`;
        } else {
            tsvTimesheet += `\t`;
        }
    }
    tsvTimesheet += `\n`;

    for (let i = 1; i <= 14; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            tsvTimesheet += `${shift.location}\t`;
        } else {
            tsvTimesheet += `\t`;
        }
    }
    tsvTimesheet += `\n`;

    return tsvTimesheet;
}

function copyToClipboard(tsvTimesheet) {
    if (!navigator.clipboard) {
        alert(tsvTimesheet);
    } else {
        navigator.clipboard.writeText(tsvTimesheet).then(
            () => {
                alert("Timesheet copied to your clipboard! You may now copy and paste into excel.");
            },
        );
    }
}
