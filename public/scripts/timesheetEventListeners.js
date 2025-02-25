import { SelectFTR } from "./webComponents/selectFTR.js";

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

