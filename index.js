/**
 * @typedef {import('./parser.js').Shift} Shift
 */
import { ScheduleTimeSheetParser } from "./parser.js";

const outputTable = document.querySelector(".output");
const copyBtn = document.querySelector(".copy");
const employeeTimesheetTitle = document.querySelector(".timesheetTitle");
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
     * @type {{map: Map<number, Shift>, errors: Map<number, string[]>}} regularShifts
     */
    const regularShifts = parser.getRegularHoursMap(shifts);

    /**
     * @type {Map<number, number>} onCallStandBy
     */
    const onCallStandBy = parser.getStandbyHourMap(shifts);

    employeeTimesheetTitle.innerHTML = `${employee}'s Timesheet`;
    copyBtn.style.visibility = "visible";
    outputTable.innerHTML = getTableRowsByMapping(regularShifts.map, onCallStandBy);
    outputTable.innerHTML += getShiftErrors(regularShifts.errors);

    timesheet = copyableTimesheet(regularShifts.map, onCallStandBy);
}

/**
 * @param {Map<number, Shift>} regularShifts 
 * @param {Map<number, number>} onCallStandBy
const employeeTimesheetTitle = document.querySelector(".timesheetTitle");
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
 * @param {Map<number, string[]>} errors 
 * @returns {string} HTML string that indicates any errors for a weekday column
 */
function getShiftErrors(errors) {
    let htmlErrors = `<tr><td style="color:#DC143C;">ERRORS:</td>`;

    if (errors.size < 1) {
        return `<td style="background-color:#A1EE39;">No errors found by parser.</td>`;
    }

    for (let i = 1; i <= 14; i++) {
        if (errors.has(i)) {
            const concatErrors = errors.get(i).reduce((prev, curr) => prev += curr + '\n');
            htmlErrors += `<td>${concatErrors}</td>`;
        } else {
            htmlErrors += `<td></td>`;
        }
    }
    htmlErrors += `</tr>`;

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
                alert("Timesheet copied to your clipboard! You may now paste into your timesheet row!");
            },
        );
    }
}
