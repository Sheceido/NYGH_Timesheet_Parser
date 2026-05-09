import type { AuditEntry } from "../../types.js";
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

/**
 * Custom HTML element that displays an alert for employee shift count (over/under scheduling).
 * Shows the actual vs expected shift count, accounting for duplicates.
 * Clicking the element dispatches a MODAL_OPEN event with the affected shift IDs.
 */
export class AuditEmployeeShiftCount extends HTMLElement {
  /** The audit entry containing shift count information. */
  private _data: AuditEntry;

  /**
   * Sets the audit data and triggers a re-render.
   * @param value - The audit entry (should have shifts, expectedShiftCount, duplicateCount).
   */
  set data(value: AuditEntry) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
    // Provide a minimal placeholder – will be overwritten by setter.
    this._data = {
      code: "FTR_OVER_SCHEDULED",
      severity: "ERROR",
      employees: [],
      shifts: [],
      message: "",
      expectedShiftCount: 0,
      duplicateCount: 0,
    };
  }

  /**
   * Renders the shift count alert and attaches the click handler.
   * Displays employee name and a formatted shift count string.
   * If there are duplicates, appends the duplicate count.
   */
  render(): void {
    let shiftCountDisplay = `${this._data.shifts.length} / ${this._data.expectedShiftCount ?? 0} shifts`;

    const duplicateCount = this._data.duplicateCount ?? 0;
    if (duplicateCount > 0) {
      shiftCountDisplay = `~ ${this._data.shifts.length} / ${this._data.expectedShiftCount ?? 0} shifts (${duplicateCount} duplicate${duplicateCount > 1 ? "s" : ""})`;
    }

    // safety for employees[0]
    const employeeName = this._data.employees[0]?.str_alias ?? "Unknown";

    this.innerHTML = `
            <div class="alert-item">
                <span class="alert-name">${capitalize(employeeName)}</span>
                <div class="alert-count">
                    <span>${shiftCountDisplay}</span>
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
customElements.define("audit-employee-shift-count", AuditEmployeeShiftCount);
