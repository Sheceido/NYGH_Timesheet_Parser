/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

export class AuditEmployeeShiftCount extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
  }

  render() {
    let shiftCountDisplay = `${this._data.shifts.length} / ${this._data.expectedShiftCount} shifts`;

    if (this._data.duplicateCount > 0) {
      shiftCountDisplay = `~ ${this._data.shifts.length} / ${this._data.expectedShiftCount} shifts (${this._data.duplicateCount} duplicate${this._data.duplicateCount > 1 ? "s" : ""} )`;
    }

    this.innerHTML = `
      <div class="alert-item">
        <span class="alert-name">${capitalize(this._data.employees[0].str_alias)}</span>
        <div class="alert-count">
          <span>${shiftCountDisplay}</span>
          <span class="close-icon">✕</span>
        </div>
      </div>
    `;

    this.onclick = () => document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
      detail: { shiftIds: this._data.shifts.map(s => s.id) },
      bubbles: true,
    }));
  }
}

customElements.define("audit-employee-shift-count", AuditEmployeeShiftCount);
