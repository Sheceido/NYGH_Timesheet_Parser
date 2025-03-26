/**
 * Capitalize first letter of a given string
 */
export function capitalize(s) {
    return String(s[0]).toUpperCase() + String(s).slice(1).toLowerCase();
}

/**
 * @param {string[]} s 
 * @returns {string} capitalized string of words joined together
 */
export function capitalizeArray(s) {
    const newStrArr = [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] === "") {
            continue;
        }
        newStrArr.push(capitalize(s[i]));
    }
    return newStrArr.join(" ");
}
