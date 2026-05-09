import type { AuditEntry } from "../../types.js";
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

/**
 * Custom HTML element that displays a summary of mismatched weekend flags for an employee.
 * Shows the difference between weekend shifts worked and "W/E" flags found.
 * Clicking the element opens a modal with the affected shifts.
 */
export class AuditMissingWeekendFlag extends HTMLElement {
  /** The audit entry containing the employee and shifts (weekend shifts + flag shifts). */
  private _data: AuditEntry;

  /**
   * Sets the audit data and re-renders the component.
   * @param value - The audit entry for missing weekend flags.
   */
  set data(value: AuditEntry) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
    // Provide a minimal placeholder – will be overwritten by setter.
    this._data = {
      code: "MISSING_WORKED_WEEKEND_FLAG",
      severity: "WARNING",
      employees: [],
      shifts: [],
      message: "",
    };
  }

  /**
   * Renders the alert item showing the employee name and the difference count.
   * Distinguishes between weekend shifts (employee present) and flag shifts (employee null).
   */
  render(): void {
    const weekendShifts: AuditEntry["shifts"] = [];
    const flagShifts: AuditEntry["shifts"] = [];

    // Safety fallback for employees[0]
    const employeeName = this._data.employees[0]?.str_alias ?? "Unknown";

    this._data.shifts.forEach(s => {
      if (s.employee === null) {
        flagShifts.push(s);
      } else {
        weekendShifts.push(s);
      }
    });

    let diffCount: string;
    if (weekendShifts.length > flagShifts.length) {
      const diff = weekendShifts.length - flagShifts.length;
      diffCount = `${diff} missing "w/e" flag${diff > 1 ? "s" : ""}`;
    } else {
      const diff = flagShifts.length - weekendShifts.length;
      diffCount = `${diff} extra "w/e" flag${diff > 1 ? "s" : ""}`;
    }

    this.innerHTML = `
            <div class="alert-item">
                <span class="alert-name">${capitalize(employeeName)}</span>
                <div class="alert-count">
                    <span>${diffCount}</span>
                    <span class="close-icon">✕</span>
                </div>
            </div>
        `;

    this.onclick = () => {
      document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
        detail: { shiftIds: this._data.shifts.map(s => s.id) },
        bubbles: true,
      }));
    };
  }
}

// Register the custom element with the browser
customElements.define("audit-missing-weekend-flag", AuditMissingWeekendFlag);
