/**
 * @param {string | null} errElementId
 * @param {string | null} errMsgBoxId
 * @param {string} errorMsg 
 */
export function setElementErrors(errElementId, errMsgBoxId, errorMsg) {
    if (errElementId) {
        document.getElementById(errElementId).classList.add("errorHighlight");
    }
    if (errMsgBoxId) {
        const errorMsgBox = document.getElementById(errMsgBoxId)
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
        document.getElementById(errElementId).classList.remove("errorHighlight");
    }

    if (errMsgBoxId) {
        const errorMsgBox = document.getElementById(errMsgBoxId)
        errorMsgBox.replaceChildren();
    }
}
