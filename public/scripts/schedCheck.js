import { roster } from "./roster.js";
import { ScheduleTimeSheetParser } from "./parser.js";
import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
/** @typedef {import("./webComponents/selectFTR.js").SelectFTR} SelectFTR */
/** @typedef {import("./timesheet.js").Shift} Shift */
/** @typedef {import("./warnings.js").WarningsGroup} WarningsGroup */

/** @typedef {Map<string, {shifts: Shift[], warnings: WarningsGroup}>} EmployeeShiftsAndWarnings */

/** @type {SelectFTR} */
const selectFTR = document.querySelector("#schedCheckSelectFTR");
selectFTR.addShowAllOption();

/** @type {ScheduleChecker} */
const scheduleCheckTable = document.querySelector("schedule-checker");


export function checkSchedule() {
    const schedTextArea = document.querySelector(".schedule");
    const scheduleStr = schedTextArea.value;

    let holidayCount = 0;
    const stats = document.querySelector(".schedCheckHolidays");

    if (scheduleStr === "") {
        schedTextArea.classList.add("errorHighlight");
        return;
    }
    schedTextArea.classList.remove("errorHighlight");

    if (stats.value !== "") {
        const numInput = Number(stats.value);
        if (!isNaN(numInput) || numInput >= 0 && numInput <= 14) {
            holidayCount = numInput;
        } else {
            stats.classList.add("errorHighlight");
            return;
        }
    }
    stats.classList.remove("errorHighlight");

    // get grid
    const schedParse = new ScheduleTimeSheetParser(scheduleStr, null);
    const scheduleGrid = schedParse.getScheduleGrid();
    const headers = schedParse.getWeekdayHeader();
    const shiftTimes = schedParse.getShiftTimeRows();

    /** @type {EmployeeShiftsAndWarnings} */
    const ftrEmployeeShiftsWarnings = new Map();
    
    for (const [name, employee] of Object.entries(roster)) {
        const parser = new ScheduleTimeSheetParser(scheduleStr, employee);
        const shifts = parser.findShifts();

        const regularShifts = parser.getRegularHoursMap(shifts);
        parser.shiftCountCheck(true, regularShifts.size, holidayCount);
        const warnings = parser.getWarningsGroup();

        ftrEmployeeShiftsWarnings.set(employee.first_name, {
            shifts: shifts,
            warnings: warnings,
        });
    }

    scheduleCheckTable.createScheduleTable(
        scheduleGrid,
        headers,
        shiftTimes,
        ftrEmployeeShiftsWarnings
    );

    scheduleCheckTable.applyWarnings(ftrEmployeeShiftsWarnings);
}
