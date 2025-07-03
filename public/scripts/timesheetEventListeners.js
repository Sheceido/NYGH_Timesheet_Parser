import { SelectFTR } from "./webComponents/selectFTR.js";
import { PasteSuccessfulPrompt } from "./webComponents/pasteSuccessPrompt.js";

/**
 * @param {HTMLButtonElement} pasteBtn 
 * @param {HTMLButtonElement} clearBtn
 */
export function textareaEventListener(pasteBtn) {
    /** @type {HTMLTextAreaElement} */
    const txtarea = document.querySelector(".schedule");

    pasteBtn.addEventListener("click", () => {
        if (!navigator.clipboard) {
            // Navigator.clipboard is not available if not using HTTPS,
            // fallback with alert to notify user
            alert("Current site not running HTTPS, use [Ctrl-V] to paste!");
        } else {
            navigator.clipboard
                .readText()
                .then((clipText) => txtarea.value = clipText);

            // clear most recent clipboard textarea data to prevent users from
            // accidentally pasting unintended data into timesheet spreadsheet
            // as they forgot to copy their timesheet data onto clipboard.
            setTimeout(() => navigator.clipboard.writeText(""), 100);
        }

        /** @type {PasteSuccessfulPrompt} prompt */
        const prompt = document.createElement("paste-success");
        pasteBtn.appendChild(prompt);
        setTimeout(() => pasteBtn.removeChild(prompt), 2000);
    });
}

/**
 * @param {HTMLButtonElement} timesheetTab 
 * @param {HTMLButtonElement} scheduleCheckTab
 * @param {() => void} setTab 
 * @param {HTMLDivElement} timesheetContainer 
 * @param {HTMLDivElement} schedCheckContainer 
 */
export function tabEventListener(
    timesheetTab,
    scheduleCheckTab,
    setTab,
    timesheetContainer,
    schedCheckContainer
) {
    // initialize timesheetTab as the default tab selected
    timesheetTab.style.zIndex = 10;
    // show timesheetContainer, hide schedule checker container
    timesheetContainer.style.display = "block";
    schedCheckContainer.style.display = "none";

    timesheetTab.addEventListener("click", () => {
        setTab(timesheetTab.value);

        timesheetTab.style.zIndex = 10;
        scheduleCheckTab.style.zIndex = 0;

        timesheetContainer.style.display = "block";
        schedCheckContainer.style.display = "none";
    });
    scheduleCheckTab.addEventListener("click", () => {
        setTab(scheduleCheckTab.value);

        scheduleCheckTab.style.zIndex = 10;
        timesheetTab.style.zIndex = 0;

        schedCheckContainer.style.display = "block";
        timesheetContainer.style.display = "none";
    });
}

/**
 * @param {HTMLInputElement} toggle 
 * @param {SelectFTR} employeeDropdown 
 * @param {HTMLInputElement} customName 
 * @param {HTMLInputElement} customAbbrev 
 * @param {HTMLSelectElement} customGender 
 */
export function addToggleEventListener(
    toggle,
    employeeDropdown,
    customName,
    customAbbrev,
    customGender
) {
    toggle.addEventListener("click", () => {
        if (toggle.checked) {
            // disable + clear dropdown for predefined employees, enable custom input fields
            employeeDropdown.disableSelect();

            customName.disabled = false;
            customAbbrev.disabled = false;
            customGender.disabled = false;
        } else {
            // disable + clear custom input fields, enable predefined employees dropdown
            employeeDropdown.enableSelect();

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
}

export function addDialogEventListener(dialog, showBtn, closeBtn) {
    // Dialog elements for tutorial
    showBtn.addEventListener("click", () => { dialog.showModal() });
    closeBtn.addEventListener("click", () => { dialog.close() });
}

