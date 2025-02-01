/**
 * @typedef {import('./parser.js').Shift} Shift
 */
import { ScheduleTimeSheetParser } from "./parser.js";

// Timesheet output
const employeeTimesheetTitle = document.querySelector(".timesheetTitle");
const copyBtn = document.querySelector(".copy");
const outputTable = document.querySelector(".output");
const comments = document.querySelector(".comments");

// Dialog elements for tutorial
const dialog = document.querySelector("dialog");
const showBtn = document.querySelector("dialog + button");
const closeBtn = document.querySelector("dialog button");
showBtn.addEventListener("click", () => {
    dialog.showModal();
});
closeBtn.addEventListener("click", () => {
    dialog.close();
});

// Clipboard functionality
let timesheet = ""; // will hold copy of timesheet to be passed to clipboard
copyBtn.addEventListener("click", () => { copyToClipboard(timesheet) });

/**
 * Instantiates a ScheduleTimeSheetParser to generate both a tsv timesheet and an HTML table for the user to review.
 */
export function parse() {
    resetTimesheet();
    /**
     * @type {HTMLTextAreaElement} scheduleStr
     */
    const scheduleTextArea = document.querySelector(".schedule");
    const scheduleStr = scheduleTextArea.value;
    /**
     * @type {HTMLSelectElement}
     */
    const selectEmployee = document.querySelector(".employee");
    const employee = selectEmployee.value;

    const parser = new ScheduleTimeSheetParser(scheduleStr, employee);
    const shifts = parser.findShifts();

    /**
     * @type {string[]} weekdayHeaders
     */
    const weekdayHeaders = parser.getWeekdayHeader();

    /**
     * @type {{map: Map<number, Shift>, errors: Map<number, string[]>}} regularShifts
     */
    const regularShifts = parser.getRegularHoursMap(shifts);

    /**
     * @type {Map<number, number>} onCallStandBy
     */
    const onCallStandBy = parser.getStandbyHourMap(shifts);

    // Generate html timesheet + errors
    employeeTimesheetTitle.innerHTML = (weekdayHeaders.length === 15)
        ?`${employee}'s [${weekdayHeaders[0]} ${weekdayHeaders[1]}-${weekdayHeaders[weekdayHeaders.length-1]}] Timesheet`
        : `${employee}'s Timesheet`;

    copyBtn.style.visibility = "visible";
    outputTable.innerHTML += getTableRows(weekdayHeaders, regularShifts.map, onCallStandBy);
    outputTable.innerHTML += getShiftErrors(regularShifts.errors);
    comments.innerHTML = getErrorComments(employee, regularShifts.map.size);

    // define timesheet variable for clipboard copy
    timesheet = copyableTimesheet(regularShifts.map, onCallStandBy);
}

/**
 * @param {Map<number, Shift>} regularShifts 
 * @param {Map<number, number>} onCallStandBy
 * @returns {string} html rows for a table corresponding to the timesheet
 */
function getTableRows(headers, regularShifts, onCallStandBy) {
    
    const BIWEEKLY = 14;
    let htmlTableStr = `<tr><th></th>`;

    // Include weekday headers
    for (let i = 0; i < 2; i++) {
        htmlTableStr += `<th>Sat</th><th>Sun</th><th>Mon</th><th>Tues</th><th>Wed</th><th>Thurs</th><th>Fri</th>`;
    }
    htmlTableStr += "</tr><tr>";
    for (let i = 0; i < headers.length; i++) {
        htmlTableStr += `<th>${headers[i]}</th>`;
    }
    htmlTableStr += "</tr>";

    // Shift Times for first row
    htmlTableStr += `<tr><td>Shift Time</td>`;
    for (let i = 1; i <= BIWEEKLY; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            htmlTableStr += `<td>${shift.shiftTime}</td>`;
        } else {
            htmlTableStr += `<td> </td>`;
        }
    }

    // On-call standby hours for second row
    htmlTableStr += `</tr>\n<tr><td>Standby Hrs</td>`;
    for (let i = 1; i <= BIWEEKLY; i++) {
        if (onCallStandBy.has(i)) {
            const standByHours = onCallStandBy.get(i);
            htmlTableStr += `<td>${standByHours}</td>`;
        } else {
            htmlTableStr += `<td> </td>`;
        }
    }

    // Location for each shift for third row
    htmlTableStr += `</tr>\n<tr><td>Location</td>`;
    for (let i = 1; i <= BIWEEKLY; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            htmlTableStr += `<td>${shift.location}</td>`;
        } else {
            htmlTableStr += `<td> </td>`;
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
    let htmlErrors = `<tr><td style="color: #FF5050;">CONFLICTS</td>`;
    const BIWEEKLY = 14;

    if (errors.size < 1) {
        return `<td style="background-color:#A1EE39;">No conflicts found.</td>`;
    }

    for (let i = 1; i <= BIWEEKLY; i++) {
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
 * @param {string} employee 
 * @param {number} regularShiftsSize 
 */
function getErrorComments(employee, regularShiftsSize) {
    if (regularShiftsSize > 10) {
        return `<p style="color: red;">[ERROR?] ${employee} appears to have MORE THAN 10 shifts in the biweekly!</p>`;
    }
    else if (regularShiftsSize < 10) {
        return `<p style="color: red;">[ERROR?] ${employee} appears to have LESS THAN 10 shifts in the biweekly!</p>`;
    }
    return "";
}


/**
 * @param {Map<number, Shift>} regularShifts 
 * @param {Map<number, number>} onCallStandBy
 * @returns {string} tsvTimesheet: copyable to Excel 365
 */
function copyableTimesheet(regularShifts, onCallStandBy) {
    let tsvTimesheet = ``;
    const BIWEEKLY = 14;

    for (let i = 1; i <= BIWEEKLY; i++) {
        if (regularShifts.has(i)) {
            const shift = regularShifts.get(i);
            tsvTimesheet += `${shift.shiftTime}\t`;
        } else {
            tsvTimesheet += `\t`;
        }
    }
    tsvTimesheet += `\n`;

    for (let i = 1; i <= BIWEEKLY; i++) {
        if (onCallStandBy.has(i)) {
            const standByHours = onCallStandBy.get(i);
            tsvTimesheet += `${standByHours}\t`;
        } else {
            tsvTimesheet += `\t`;
        }
    }
    tsvTimesheet += `\n`;

    for (let i = 1; i <= BIWEEKLY; i++) {
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

/**
 * Copies the tsv-formatted timesheet string onto browser clipboard if on HTTPS,
 * else display it in an alert box.
 */
function copyToClipboard(tsvTimesheet) {
    if (!navigator.clipboard) {
        // Navigator.clipboard is not available if not using HTTPS,
        // fallback with alert containing the copyable text.
        alert(tsvTimesheet);
    } else {
        navigator.clipboard.writeText(tsvTimesheet).then(
            () => alert("Timesheet copied to your clipboard!")
        );
    }
}

function resetTimesheet() {
    timesheet = "";
    outputTable.innerHTML = "";
}
