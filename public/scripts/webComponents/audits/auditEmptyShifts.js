/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("../types.d.ts").Shift} Shift */

import { MODAL_OPEN } from "../../data/constants.js";

export class AuditEmptyShifts extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
  }

  /**
   * @param {Shift} s
  * @returns {HTMLDivElement}
  */
  createEmptyShiftEntries(s) {
    const container = document.createElement("div");
    container.classList.add("shift-details", "grid-col-3", "boxed-grid-item");
    container.innerHTML = `
      <div class="shift-detail-row flex-col">
        <span>📍</span>
        <span>${s.location}</span>
      </div>
      <div class="shift-detail-row flex-col">
         <span>📅</span>
         <span>${s.date}</span>
      </div>
      <div class="shift-detail-row flex-col">
         <span>🕐</span>
         <span>${s.shiftTime}</span>
      </div>
    `;

    container.onclick = () => document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
      detail: { shiftIds: [s.id] },
      bubbles: true,
    }));

    return container;
  }

  render() {
    const emptyShiftEntries = this._data.shifts.map(s => this.createEmptyShiftEntries(s));

    this.innerHTML = `
      <div class="conflict-box existing clickable">
        <span class="conflict-box-badge conflict">${this._data.shifts.length} Empty Shifts Detected</span>
        <details class="clickable">
          <div id="seeAllEmpty" class="shift-details">
            See all empty shifts ➡️
          </div>
          <summary>Click to Expand</summary>
        </details>
      </div>
    `;

    const details = this.querySelector("details");
    const summary = this.querySelector("summary");

    details.addEventListener('toggle', () => {
      summary.textContent = details.open
        ? 'Click to Collapse'
        : 'Click to Expand';
    });

    this.querySelector("#seeAllEmpty").onclick = () => {
      document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
        detail: { shiftIds: this._data.shifts.map(s => s.id) },
        bubbles: true,
      }));
    }

    this.querySelector("details").append(...emptyShiftEntries);
  }
}

customElements.define("audit-empty-shifts", AuditEmptyShifts);
