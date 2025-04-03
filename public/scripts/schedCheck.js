import { ScheduleTimeSheetParser } from "./parser.js";
import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
/** @typedef {import("./webComponents/selectFTR.js").SelectFTR} SelectFTR */
/** @typedef {import("./parser.js").Shift} Shift */
/** @typedef {import("./warnings.js").WarningsGroup} WarningsGroup */

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

    // get grid, parse conflicts map set to true
    const schedParse = new ScheduleTimeSheetParser(scheduleStr, null);

    const scheduleGrid = schedParse.scheduleGrid;
    const headers = schedParse.getWeekdayHeader();
    const shiftTimes = schedParse.getShiftTimeRows();
    const allShifts = schedParse.findAllShifts();
    const warnings = schedParse.getWarningsGroup(holidayCount);

    // Generate Schedule Table with the above data
    scheduleCheckTable.createScheduleTable(
        scheduleGrid,
        headers,
        shiftTimes,
        allShifts,
    );

    // Apply warnings
    scheduleCheckTable.applyEmployeeWarnings(warnings, holidayCount);

    // Render panel showing all non-FTR / unrecognized employee names and shift count
    // with functionality to filter schedule by these names
    scheduleCheckTable.renderUnrecognizedPanel(
        warnings.unknownEmployeeShifts,
        selectFTR.selectDudOption.bind(selectFTR)
    );

    // Update dropdown values to have a shift count summary
    selectFTR.showEmployeeAndShiftCount(warnings.employeeShiftCount);
    selectFTR.enableSelect(); // enable for filtering once schedule is generated
    selectFTR.showSelect();
}
