import { SHIFT_ERROR_CLICKED, WARNING_BOX_CLICKED } from "./data/constants.js";
import { ROSTER } from "./data/roster.js";


/**
 * @param {(string) => void } dispatchSelectEvent
 */
export function initScheduleCheckerEventListeners(dispatchSelectEvent) {
    document.addEventListener(SHIFT_ERROR_CLICKED, e => {
        dispatchSelectEvent(e.detail.rosterName);
    });

    document.addEventListener(WARNING_BOX_CLICKED, e => {
        const nameSize = e.detail.shift.names.length;
        const emittedName = e.detail.shift.names[nameSize - 1];

        for (const [rosterName, employee] of Object.entries(ROSTER)) {
            if (emittedName === employee.str_alias) {
                dispatchSelectEvent(rosterName);
                return;
            }
        }
        console.log(`No ROSTER name by "${emittedName}!"`);
    });
}
