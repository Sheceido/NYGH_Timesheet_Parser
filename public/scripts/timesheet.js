import { roster } from "./roster.js";
import { ScheduleParser } from "./parser.js";
import { SelectFTR } from "./webComponents/selectFTR.js";
import { TimesheetTable } from "./webComponents/timeSheetTable.js";
import {
    textareaEventListener,
    tabEventListener,
    addToggleEventListener,
    addDialogEventListener,
} from "./timesheetEventListeners.js";
import { clearElementErrors, setElementErrors } from "./elementErrors.js";

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
 * Instantiates a ScheduleParser to generate both a tsv timesheet and an HTML table for the user to review.
 */
export function parseTimesheet() {
    clearElementErrors(null, "scheduleError");
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
        setElementErrors("schedule", "scheduleError", "[Error]: Empty schedule input!")
        return;
    }
    clearElementErrors("schedule", "scheduleError")

    if (!isCustomInput) {
        if (employeeDropdown.value === "") {
            employeeDropdown.addErrorHighlight();
            setElementErrors(null, "timesheetError", "[Error]: Select FTR employee to find in the schedule.");
            return;
        }
        employeeDropdown.removeErrorHighlight();
        clearElementErrors(null, "timesheetError");

        employee = roster[employeeDropdown.value];
    }
    else {
        if (customName.value === "") {
            setElementErrors("customName", "timesheetError", "[Error]: Input custom name to look up.");
            return;
        }
        clearElementErrors("customName", "timesheetError");

        if (customAbbrev.value === "") {
            setElementErrors("customAbbrev", "timesheetError", "[Error]: Input custom abbreviation / initials to look up.");
            return;
        }
        clearElementErrors("customAbbrev", "timesheetError");

        if (customGender.value === "") {
            setElementErrors("customGender", "timesheetError", "[Error]: Select gender option.");
            return;
        }
        clearElementErrors("customGender", "timesheetError");

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
            setElementErrors("holidays", "timesheetError", "[Error]: Invalid input for holidays entered. Holiday count must be between 0 to 14.");
            return;
        }
    }
    clearElementErrors("holidays", "timesheetError");

    const { parser, errors } = ScheduleParser.create(scheduleStr, employee);
    if (errors.length > 0) {
        errors.forEach(error => {
            setElementErrors("schedule", "scheduleError", error.message)
        });
        return
    }
    clearElementErrors("schedule", "scheduleError");

    const shifts = parser.findShifts();
    if (!shifts) {
        setElementErrors(null, "timesheetError", `[Error]: No shifts found for ${employee.first_name}!`)
        console.log(`No shifts found for ${employee.first_name}!`);
        return;
    }
    clearElementErrors(null, "timeSheetError");

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
    const parsedWarnings = parser.getWarningsGroup(statHolidays);

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
