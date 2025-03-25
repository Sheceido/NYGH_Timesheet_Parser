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
selectFTR.addDudOption();
selectFTR.addOnChangeFn(onSelectChangeCallback);
selectFTR.hideSelect();
selectFTR.disableSelect();

export function checkSchedule() {
    // Check input for text area
    const schedTextArea = document.querySelector(".schedule");

    if (schedTextArea.value === "") {
        schedTextArea.classList.add("errorHighlight");
        return;
    }
    schedTextArea.classList.remove("errorHighlight");

    const scheduleStr = schedTextArea.value;

    // Check input for stats count
    let holidayCount = 0;

    /** @type HTMLInputElement */
    const stats = document.querySelector(".schedCheckHolidays");

    if (stats.value !== "") {
        const numInput = Number(stats.value);

        if (isNaN(numInput) || numInput < 0 || numInput > 14) {
            stats.classList.add("errorHighlight");
            return;
        }
        holidayCount = numInput;
    }
    stats.classList.remove("errorHighlight");

    // Reset state to beginning
    scheduleCheckTable.reset(); // remove old table
    document.querySelector(".shiftCountErrors").textContent = "";
    selectFTR.selectFirstChild();

    // get grid, parse conflicts map set to true, maps then assigned to individual employee parser
    const schedParse = new ScheduleTimeSheetParser(scheduleStr, null, true);
    const scheduleGrid = schedParse.scheduleGrid;
    const headers = schedParse.getWeekdayHeader();
    const shiftTimes = schedParse.getShiftTimeRows();

    // these only get parsed if paramater optionalParsing is set to true as above
    const conflictMaps = schedParse.conflictMaps;
    const unknownEmployeeShifts = schedParse.unknownEmployeeShiftsWarning;

    /** @type {EmployeeShiftsAndWarnings} */
    const ftrEmployeeShiftsWarnings = new Map();

    for (const [fullName, employee] of Object.entries(roster)) {
        const parser = new ScheduleTimeSheetParser(scheduleStr, employee, false);
        // set from outer scope predefined conflicts mapping
        parser.warnings.eveningMapping = conflictMaps["evening"];
        parser.warnings.unavailableMapping = conflictMaps["unavailable"];

        const shifts = parser.findShifts();

        const regularShifts = parser.getRegularHoursMap(shifts);
        parser.shiftCountCheck(true, regularShifts.size, holidayCount);

        // get warnings specific to each employee
        const warnings = parser.getWarningsGroup();
        ftrEmployeeShiftsWarnings.set(fullName, {
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

    // Render panel showing all non-FTR / unrecognized employee names and shift count
    // with functionality to filter schedule by these names
    scheduleCheckTable.renderUnrecognizedPanel(unknownEmployeeShifts, selectFTR.selectDudOption.bind(selectFTR));

    scheduleCheckTable.applyEmployeeWarnings(ftrEmployeeShiftsWarnings, holidayCount);
    selectFTR.showEmployeeAndShiftCount(ftrEmployeeShiftsWarnings);

    selectFTR.enableSelect(); // enable for filtering once schedule is generated
    selectFTR.showSelect();
}
