/**
 * @param {string | null} errElementId
 * @param {string | null} errMsgBoxId
 * @param {string} errorMsg 
 */
export function setElementErrors(errElementId, errMsgBoxId, errorMsg) {
    if (errElementId) {
        const el = document.getElementById(errElementId)
        if (!el) {
            console.error(`Expected errElementId ${errElementId} to be a defined element, found ${el}`);
            return
        }
        el.classList.add("errorHighlight");
    }

    if (errMsgBoxId) {
        const errorMsgBox = document.getElementById(errMsgBoxId)
        if (!errorMsgBox) {
            console.error(`Expected errMsgBoxId ${errMsgBoxId} to be a defined element, found ${errorMsgBox}`);
            return
        }

        const p = document.createElement("p");
        p.textContent = errorMsg;
        p.style.color = "red";
        errorMsgBox.appendChild(p);
    }
}

/**
 * @param {string | null} errElementId
 * @param {string | null} errMsgBoxId
 */
export function clearElementErrors(errElementId, errMsgBoxId) {
    if (errElementId) {
        const el = document.getElementById(errElementId)
        if (!el) {
            console.error(`Expected errElementId ${errElementId} to be a defined element, found ${el}`);
            return
        }
        el.classList.remove("errorHighlight");
    }

    if (errMsgBoxId) {
        const errorMsgBox = document.getElementById(errMsgBoxId)
        if (!errorMsgBox) {
            console.error(`Expected errMsgBoxId ${errMsgBoxId} to be a defined element, found ${errorMsgBox}`);
            return
        }
        errorMsgBox.replaceChildren();
    }
}
