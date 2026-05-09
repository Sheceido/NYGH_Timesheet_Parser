/**
 * Capitalize first letter of a given string
 */
export function capitalize(s: string): string {
    if (s === "") return s;
    return String(s[0]).toUpperCase() + String(s).slice(1).toLowerCase();
}

/**
 * Capitalize an array of strings and join them
 * @param s - Array of strings to capitalize
 * @returns capitalized string of words joined together
 */
export function capitalizeArray(s: string[]): string {
    if (s.length === 0) {
        return "";
    }

    if (s.length === 1) {
        return capitalize(s[0]);
    }

    const newStrArr: string[] = [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] === "") {
            continue;
        }
        newStrArr.push(capitalize(s[i]));
    }
    return newStrArr.join(" ");
}
