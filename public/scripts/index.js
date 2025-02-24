import { roster } from "./roster.js";
import { ScheduleTimeSheetParser } from "./parser.js";
import { TimesheetTable } from "./webComponents/timeSheetTable.js";
import { capitalize } from "./utils.js";
/** @typedef {import('./roster.js').Employee} Employee */
/** @typedef {import('./parser.js').Shift} Shift */
/** @typedef {import('./parser.js').ShiftMap} ShiftMap */
/** @typedef {import('./warnings.js').WarningsGroup} WarningsGroup */

// Toggle User Input functionality
const toggle = document.querySelector(".toggleSwitch");
const employeeDropdown = document.querySelector(".employee");
const customName = document.querySelector(".customName");
const customAbbrev = document.querySelector(".customAbbrev");
const customGender = document.querySelector(".customGender");
const stats = document.querySelector(".holidays");

toggle.addEventListener("click", () => {
    if (toggle.checked) {
        // disable + clear dropdown for predefined employees, enable custom input fields
        employeeDropdown.disabled = true;
        employeeDropdown.classList.remove("errorHighlight");
        employeeDropdown.value = "";

        customName.disabled = false;
        customAbbrev.disabled = false;
        customGender.disabled = false;
    } else {
        // disable + clear custom input fields, enable predefined employees dropdown
        employeeDropdown.disabled = false;

        customName.disabled = true;
        customName.value = "";
        customName.classList.remove("errorHighlight");

        customAbbrev.value = ""; 
        customAbbrev.disabled = true;
        customAbbrev.classList.remove("errorHighlight");

        customGender.value = "";
        customGender.disabled = true;
        customGender.classList.remove("errorHighlight");
    }
});

/** @type {TimesheetTable} timesheetTable */
const timesheetTable = document.querySelector("timesheet-table");

// Dialog elements for tutorial
const dialog = document.querySelector("dialog");
const showBtn = document.querySelector("dialog + button");
const closeBtn = document.querySelector("dialog button");
showBtn.addEventListener("click", () => { dialog.showModal() });
closeBtn.addEventListener("click", () => { dialog.close() });

/**
 * Instantiates a ScheduleTimeSheetParser to generate both a tsv timesheet and an HTML table for the user to review.
 */
export function parse() {
    timesheetTable.reset();

    const scheduleTextArea = document.querySelector(".schedule");
    const scheduleStr = scheduleTextArea.value;
    const isCustomInput = toggle.checked;

    let employee = {
        first_name: "",
        last_name: "",
        str_alias: "",
        abbrev: "",
        gender: "",
    };
    let statHolidays = 0;
    
    if (scheduleStr === "") {
        scheduleTextArea.classList.add("errorHighlight");
        return;
    }
    scheduleTextArea.classList.remove("errorHighlight");

    if (!isCustomInput) {
        if (employeeDropdown.value === "") {
            employeeDropdown.classList.add("errorHighlight");
            return;
        }
        employeeDropdown.classList.remove("errorHighlight");

        employee = roster[employeeDropdown.value];
    }
    else {
        if (customName.value === "") {
            customName.classList.add("errorHighlight");
            return;
        }
        customName.classList.remove("errorHighlight");

        if (customAbbrev.value === "") {
            customAbbrev.classList.add("errorHighlight");
            return;
        }
        customAbbrev.classList.remove("errorHighlight");

        if (customGender.value === "") {
            customGender.classList.add("errorHighlight");
            return;
        }
        customGender.classList.remove("errorHighlight");

        employee.first_name = customName.value.trim().toUpperCase();
        employee.str_alias = customName.value.trim().toUpperCase(); 
        employee.abbrev = customAbbrev.value.trim().toUpperCase();
        employee.gender = customGender.value.trim().toUpperCase();
    }

    if (stats.value !== "") {
        const numInput = Number(stats.value);
        if (!isNaN(numInput) || numInput >= 0 && numInput <= 14) {
            statHolidays = numInput;
        } else {
            stats.classList.add("errorHighlight");
            return;
        }
    }
    stats.classList.remove("errorHighlight");

    const parser = new ScheduleTimeSheetParser(scheduleStr, employee);
    const shifts = parser.findShifts();
    if (!shifts) {
        console.log(`No shifts found for ${employee.first_name}!`);
        return;
    }

    /** @type {string[]} weekdayHeaders */
    const weekdayHeaders = parser.getWeekdayHeader();

    /** @type {ShiftMap} regularShifts */
    const regularShifts = parser.getRegularHoursMap(shifts);

    /* @type {Map<number, number>} standbyHours */
    const standbyHours = parser.getStandbyHourMap(shifts);

    /* @type {WarningsGroup} parsedWarnings */
    const parsedWarnings = parser.getWarningsGroup();

    timesheetTable.constructTable(
        employee,
        weekdayHeaders,
        regularShifts,
        standbyHours,
        parsedWarnings
    );

    const comments = document.querySelector(".comments");
    comments.appendChild(getShiftCountError(employee, regularShifts.size, statHolidays, !isCustomInput));
}

/**
 * @param {Employee} employee 
 * @param {number} regularShiftsSize 
 * @returns {HTMLParagraphElement} p
 */
function getShiftCountError(employee, regularShiftsSize, statsCount, isFTR) {
    const p = document.createElement("p");

    const successSpan = document.createElement("span");
    successSpan.textContent = " ✅ ";

    const errorSpan = document.createElement("span");
    errorSpan.textContent = " ❌ ";

    const promptSpan = document.createElement("span");
    promptSpan.style.fontFamily = "sans-serif";
    promptSpan.style.fontSize = "small";

    const expectedShiftCount = 10 - statsCount;
    
    if (!isFTR || regularShiftsSize === expectedShiftCount) {
        p.appendChild(successSpan);
        promptSpan.textContent = `${capitalize(employee.first_name)} has ${regularShiftsSize} shifts in this biweekly schedule (ignoring any duplicate errors), with (${statsCount}) stat holidays noted.`;
    }
    else if (regularShiftsSize > expectedShiftCount) {
        p.appendChild(errorSpan);
        promptSpan.textContent = `${capitalize(employee.first_name)} appears to have MORE THAN (${expectedShiftCount}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
    }
    else if (regularShiftsSize < expectedShiftCount) {
        p.appendChild(errorSpan);
        promptSpan.textContent = `${capitalize(employee.first_name)} appears to have LESS THAN (${expectedShiftCount}) shifts in the biweekly, (${statsCount}) of which would be stat holiday(s).`;
    }
    p.appendChild(promptSpan);

    return p;
}
