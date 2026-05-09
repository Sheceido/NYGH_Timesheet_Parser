import type { InputError } from '../types.js';
import { ErrorFieldsId } from '../data/constants.js';

export class InputValidator {
    /** References to HTML elements that display errors. */
    errorBox = ErrorFieldsId;

    /** Accumulated input validation errors. */
    inputErrors: InputError[];

    constructor() {
        this.inputErrors = [];
    }

    /**
     * Runs all input validations and returns the list of errors.
     * @returns Array of input errors found.
     */
    validateInputFields(): InputError[] {
        this.validateTextArea();
        this.validateHolidays();
        return this.inputErrors;
    }

    /**
     * Validates that the text area (schedule paste area) is not empty.
     * Adds an error if empty.
     */
    validateTextArea(): void {
        const textArea = document.querySelector(".pasteArea") as HTMLTextAreaElement | null;
        if (!textArea) {
            this.inputErrors.push({
                errorField: this.errorBox.TEXT_AREA,
                message: "[Error] Text area element not found!",
            });
            return;
        }
        if (!textArea.value) {
            this.inputErrors.push({
                errorField: this.errorBox.TEXT_AREA,
                message: "[Error] Empty text area.",
            });
        }
    }

    /**
     * Validates the holidays input field.
     * - If empty or non‑numeric, defaults to 0.
     * - If value is outside 0–14, adds an error.
     */
    validateHolidays(): void {
        const holidays = document.getElementById("holidays") as HTMLInputElement | null;
        if (!holidays) return;

        const val = parseInt(holidays.value, 10);
        if (isNaN(val)) {
            holidays.value = "0";
        } else if (val < 0 || val > 14) {
            this.inputErrors.push({
                errorField: this.errorBox.HOLIDAYS,
                message: "[Error] Invalid holiday count, must be greater than 0 and less than or equal to 14.",
            });
        }
    }
}
