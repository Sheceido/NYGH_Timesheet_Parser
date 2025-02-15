/**
 * Capitalize first letter of a given string
 */
export function capitalize(s) {
    return String(s[0]).toUpperCase() + String(s).slice(1).toLowerCase();
}
