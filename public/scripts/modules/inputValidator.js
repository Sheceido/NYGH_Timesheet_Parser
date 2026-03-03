/** @typedef {import('../types.d.ts').InputError} InputError */

import { ErrorFieldsId } from '../data/constants.js';

export class InputValidator {

    /** id references to html elements that display errors */
    errorBox = ErrorFieldsId;

    /** @type {InputError[]} inputErrors */
    inputErrors;

    constructor() {
        this.inputErrors = [];
    }

    validateInputFields() {
        this.validateTextArea();
        this.validateHolidays();
        return this.inputErrors;
    }

    validateTextArea() {
        const textArea = document.querySelector(".pasteArea");
        if (!textArea.value) {
            this.inputErrors.push({
                errorField: this.errorBox.TEXT_AREA,
                message: "[Error] Empty text area.",
            });
        }
    }

    validateHolidays() {
        const holidays = document.querySelectorAll("#holidays");
        const val = parseInt(holidays[0].value);
        if (!val) {
            // update holiday input boxes to be of default value 0
            holidays.forEach(el => el.value = 0);
        }
        else if (val < 0 || val > 14) {
            this.inputErrors.push({
                errorField: this.errorBox.HOLIDAYS,
                message: "[Error] Invalid holiday count, must be greater than 0 and less than or equal to 14.",
            });
        }
    }
}
