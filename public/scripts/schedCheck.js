import { roster } from "./roster.js";
import { ScheduleTimeSheetParser } from "./parser.js";
import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
/** @typedef {import("./webComponents/selectFTR.js").SelectFTR} SelectFTR */
/** @typedef {import("./timesheet.js").Shift} Shift */
/** @typedef {import("./warnings.js").WarningsGroup} WarningsGroup */

/** @typedef {Map<string, {shifts: Shift[], warnings: WarningsGroup}>} EmployeeShiftsAndWarnings */

/** @type {ScheduleChecker} */
const scheduleCheckTable = document.querySelector("schedule-checker");

function onSelectChangeCallback(rosterName) {
    if (rosterName === "ALL") {
        scheduleCheckTable.unfadeAllCells();
    } else {
        scheduleCheckTable.fadeAllCellsExcept(rosterName);
    }
}
/** @type {SelectFTR} */
const selectFTR = document.querySelector("#schedCheckSelectFTR");
selectFTR.addShowAllOption();
selectFTR.addOnChangeFn(onSelectChangeCallback);
selectFTR.hideSelect();
selectFTR.disableSelect();

export function checkSchedule() {
    scheduleCheckTable.reset(); // remove old table
    selectFTR.selectFirstChild();

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
    const scheduleGrid = schedParse.scheduleGrid;
    const headers = schedParse.getWeekdayHeader();
    const shiftTimes = schedParse.getShiftTimeRows();
    const conflictMaps = schedParse.conflictMaps;

    /** @type {EmployeeShiftsAndWarnings} */
    const ftrEmployeeShiftsWarnings = new Map();
    
    for (const [_, employee] of Object.entries(roster)) {
        const parser = new ScheduleTimeSheetParser(scheduleStr, employee);
        // set from outer scope predefined schedule conflicts name mapping
        parser.warnings.eveningMapping = conflictMaps["evening"];
        parser.warnings.unavailableMapping = conflictMaps["unavailable"];

        const shifts = parser.findShifts();

        const regularShifts = parser.getRegularHoursMap(shifts);
        parser.shiftCountCheck(true, regularShifts.size, holidayCount);

        // get warnings specific to each employee
        const warnings = parser.getWarningsGroup();
        ftrEmployeeShiftsWarnings.set(employee.str_alias, {
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

    scheduleCheckTable.applyEmployeeWarnings(ftrEmployeeShiftsWarnings);
    selectFTR.enableSelect(); // enable for filtering once schedule is generated
    selectFTR.showSelect();
}
