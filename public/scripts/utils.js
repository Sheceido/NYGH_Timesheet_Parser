/** @typedef {import("./parser.js").Shift} Shift */
import { DAYS_OF_THE_WEEK } from "./constants.js";

/**
 * Capitalize first letter of a given string
 */
export function capitalize(s) {
    if (s === "") return s;
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

/**
 * @param {number} colCoordinate 
 * @returns {string}
 */
export function alphabetColumn(colCoordinate) {
    return String.fromCharCode(colCoordinate + 65);
}

/**
 * @param {Shift} shift 
 * @param {string[]} headers 
 * col index starts at 1 in table, offset by -1 to properly ref DAYS_OF_THE_WEEK
 */
export function getDateByColumn(shift, headers) {
    return `${DAYS_OF_THE_WEEK[(shift.coordinate.col - 1) % 7]} ${headers[shift.weekday]}`;
}
