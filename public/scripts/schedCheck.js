import { ScheduleTimeSheetParser } from "./parser.js";
import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
import { initScheduleCheckerEventListeners } from "./scheduleCheckerEventListeners.js";

/** @typedef {import("./webComponents/selectFTR.js").SelectFTR} SelectFTR */
/** @typedef {import("./parser.js").Shift} Shift */
/** @typedef {import("./warnings.js").WarningsGroup} WarningsGroup */

/** @type {ScheduleChecker} */
const scheduleCheckTable = document.querySelector("schedule-checker");

const scheduleCheckContainer = document.querySelector(".scheduleCheckContainer");

/** @type {SelectFTR} */
const selectFTR = document.querySelector("#schedCheckSelectFTR");
selectFTR.Init(onSelectChangeCallback);

/* Closure passed into SelectFTR custom element to trigger state changes
 * in scheduleCheckTable */
function onSelectChangeCallback(rosterName) {
    switch (rosterName) {
        case "HIDE":
            scheduleCheckContainer.style.display = "none";
            return;

        case "ALL":
            scheduleCheckContainer.style.display = "inline-block";
            scheduleCheckTable.unfadeAllCells();
            scheduleCheckTable.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            break;

        default:
            scheduleCheckContainer.style.display = "inline-block";
            scheduleCheckTable.fadeAllCellsExcept(rosterName);
            scheduleCheckTable.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            break;
    }
}

/* Elements deeper into the DOM tree may emit a custom event to trigger 
 * the closure in the SelectFTR custom element */
initScheduleCheckerEventListeners(selectFTR.selectByValue.bind(selectFTR));

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
        selectFTR.selectHideOption.bind(selectFTR)
    );

    // Update dropdown values to have a shift count summary
    selectFTR.showEmployeeAndShiftCount(warnings.employeeShiftCount);
    selectFTR.enableSelect(); // enable for filtering once schedule is generated
    selectFTR.showSelect();
    selectFTR.selectHideOption();
    scheduleCheckContainer.style.display = "none";
}
