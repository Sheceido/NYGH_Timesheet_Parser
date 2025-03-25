import { roster } from "./roster.js";
import { ScheduleTimeSheetParser } from "./parser.js";
import { SelectFTR } from "./webComponents/selectFTR.js";
import { TimesheetTable } from "./webComponents/timeSheetTable.js";
import {
    textareaEventListener,
    tabEventListener,
    addToggleEventListener,
    addDialogEventListener,
} from "./timesheetEventListeners.js";

/** @typedef {import('./roster.js').Employee} Employee */
/** @typedef {import('./parser.js').Shift} Shift */
/** @typedef {import('./parser.js').ShiftMap} ShiftMap */
/** @typedef {import('./parser.js').StandbyHrs} StandbyHrs */
/** @typedef {import('./warnings.js').WarningsGroup} WarningsGroup */
/** @typedef {import('./warnings.js').ShiftCountError} ShiftCountError */

/** @type {HTMLButtonElement} */
const textareaPasteBtn = document.querySelector(".textareaPaste");
textareaEventListener(textareaPasteBtn);

// Tab functionality to change between timesheet | schedule checker
/** @type {HTMLButtonElement} */
const timesheetTab = document.querySelector(".timesheetTab");
/** @type {HTMLDivElement} */
const timesheetContainer = document.querySelector(".timesheetContainer");
/** @type {HTMLButtonElement} */
const scheduleCheckTab = document.querySelector(".scheduleCheckTab");
/** @type {HTMLDivElement} */
const schedCheckContainer = document.querySelector(".scheduleCheckContainer");

let tabSelected = timesheetTab.value;
const setTab = (v) => { tabSelected = v };
// Update screen on tab clicks to show diff containers
tabEventListener(
    timesheetTab,
    scheduleCheckTab,
    setTab,
    timesheetContainer,
    schedCheckContainer
);

// Toggle functionality for choosing FTR vs. custom name input
const toggle = document.querySelector(".toggleSwitch");

/** @type {SelectFTR} employeeDropdown */
const employeeDropdown = document.querySelector("#timesheetSelectFTR");
employeeDropdown.addDisabledOption();
employeeDropdown.showEmployeeOptions();

const customName = document.querySelector(".customName");
const customAbbrev = document.querySelector(".customAbbrev");
const customGender = document.querySelector(".customGender");
const stats = document.querySelector(".holidays");
addToggleEventListener(toggle, employeeDropdown, customName, customAbbrev, customGender);

// // Dialog elements for tutorial
const dialog = document.querySelector("dialog");
const showBtn = document.querySelector("dialog + button");
const closeBtn = document.querySelector("dialog button");
addDialogEventListener(dialog, showBtn, closeBtn);

/** @type {TimesheetTable} timesheetTable */
const timesheetTable = document.querySelector("timesheet-table");

/**
 * Instantiates a ScheduleTimeSheetParser to generate both a tsv timesheet and an HTML table for the user to review.
 */
export function parse() {
    timesheetTable.reset();

    const scheduleTextArea = document.querySelector(".schedule");
    const scheduleStr = scheduleTextArea.value;

    /** @type {boolean} isCustomInput */
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
            employeeDropdown.addErrorHighlight();
            return;
        }
        employeeDropdown.removeErrorHighlight();

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

    const parser = new ScheduleTimeSheetParser(scheduleStr, employee, true);
    const shifts = parser.findShifts();
    if (!shifts) {
        console.log(`No shifts found for ${employee.first_name}!`);
        return;
    }

    /** @type {string[]} weekdayHeaders */
    const weekdayHeaders = parser.getWeekdayHeader();

    /** @type {ShiftMap} regularShifts */
    const regularShifts = parser.getRegularHoursMap(shifts);

    /* @type {StandbyHrs} standbyHours */
    const standbyHours = parser.getStandbyHourMap(shifts);
    const standbyShifts = parser.getStandbyShiftsMap(shifts);

    // evaluate shift count to generate {ShiftCountError} into WarningsGroup
    parser.shiftCountCheck(!isCustomInput, regularShifts.size, statHolidays);

    /* @type {WarningsGroup} parsedWarnings */
    const parsedWarnings = parser.getWarningsGroup();

    timesheetTable.constructTable(
        employee,
        weekdayHeaders,
        statHolidays,
        regularShifts,
        standbyHours,
        standbyShifts,
        parsedWarnings
    );
}
