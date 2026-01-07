import { ScheduleParser } from "./parser.js";
import { ScheduleChecker } from "./webComponents/scheduleCheck/ScheduleChecker.js";
import { initScheduleCheckerEventListeners } from "./scheduleCheckerEventListeners.js";
import { setElementErrors, clearElementErrors } from "./elementErrors.js";

/** @typedef {import("./webComponents/selectFTR.js").SelectFTR} SelectFTR */
/** @typedef {import("./parser.js").Shift} Shift */
/** @typedef {import("./warnings.js").WarningsGroup} WarningsGroup */

/** @type {ScheduleChecker} */
const scheduleCheckTable = document.querySelector("schedule-checker");

/** @type {SelectFTR} */
const selectFTR = document.querySelector("#schedCheckSelectFTR");
selectFTR.Init(onSelectChangeCallback);

/* Closure passed into SelectFTR custom element to trigger state changes
 * in scheduleCheckTable */
function onSelectChangeCallback(rosterName) {
    switch (rosterName) {
        case "HIDE":
            scheduleCheckTable.style.display = "none";
            return;

        case "ALL":
            scheduleCheckTable.style.display = "grid";
            scheduleCheckTable.unfadeAllCells();
            scheduleCheckTable.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            break;

        default:
            scheduleCheckTable.style.display = "grid";
            scheduleCheckTable.fadeAllCellsExcept(rosterName);
            scheduleCheckTable.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
            break;
    }
}

/* Elements deeper into the DOM tree may emit a custom event to trigger 
 * the closure in the SelectFTR custom element */
initScheduleCheckerEventListeners(selectFTR.selectByValue.bind(selectFTR));

export function checkSchedule() {
    clearElementErrors(null, "scheduleError");
    clearElementErrors(null, "errorsWarnings");

    // Check input for text area
    const schedTextArea = document.querySelector(".schedule");

    if (schedTextArea.value === "") {
        setElementErrors("schedule", "scheduleError", "[Error]: Empty schedule input!")
        return;
    }
    clearElementErrors("schedule", "scheduleError")

    const scheduleStr = schedTextArea.value;

    // Check input for stats count
    let holidayCount = 0;

    /** @type HTMLInputElement */
    const stats = document.querySelector(".schedCheckHolidays");

    if (stats.value !== "") {
        const numInput = Number(stats.value);

        if (isNaN(numInput) || numInput < 0 || numInput > 14) {
            setElementErrors("holidays", "errorsWarnings", "Error: Invalid holiday input, holiday must be between 0 and 14.");
            return;
        }
        holidayCount = numInput;
    }
    clearElementErrors("holidays", "errorsWarnings");

    // Reset state to beginning
    scheduleCheckTable.reset(); // remove old table
    selectFTR.selectFirstChild();

    // get grid, parse conflicts map set to true
    const { parser, errors } = ScheduleParser.create(scheduleStr, null);
    if (errors.length > 0) {
        errors.forEach(error => {
            setElementErrors("schedule", "scheduleError", error.message);
        });
        return
    }
    clearElementErrors("schedule", "scheduleError");

    const scheduleGrid = parser.scheduleGrid;
    const headers = parser.getWeekdayHeader();
    const shiftTimes = parser.getShiftTimeRows();
    const allShifts = parser.findAllShifts();
    const warnings = parser.getWarningsGroup(holidayCount);

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
    scheduleCheckTable.style.display = "none";
}
