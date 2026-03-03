/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
import { capitalize } from "../utils.js";
import { FTR_HRS } from "../data/constants.js";

export class AuditEmployeeShiftCount extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
  }

  render() {
    const shiftCountDisplay = this._data.shifts.length === this._data.expectedShiftCount
      ? `~ ${this._data.shifts.length} / ${this._data.expectedShiftCount} shifts ( +${this._data.duplicateCount} duplicate${this._data.duplicateCount > 1 ? "s" : ""} )`
      : `${this._data.shifts.length} / ${this._data.expectedShiftCount} shifts`;

    this.innerHTML = `
      <div class="alert-item">
        <span class="alert-name">${capitalize(this._data.employees[0].str_alias)}</span>
        <div class="alert-count">
          <span>${shiftCountDisplay}</span>
          <span class="close-icon">✕</span>
        </div>
      </div>
    `;
  }
}

customElements.define("audit-employee-shift-count", AuditEmployeeShiftCount);
