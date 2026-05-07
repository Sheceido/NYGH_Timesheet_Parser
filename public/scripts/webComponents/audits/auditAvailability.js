/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

export class AuditAvailability extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
  }

  render() {
    const shiftRef = this._data.shifts[0];
    const gender = shiftRef.employee.gender === "M" ? "👨‍⚕️" : "👩‍⚕️";
    const includedName = `<b>${capitalize(shiftRef.employee.str_alias)}</b>`;

    this.innerHTML = `
      <div class="conflict-box conflict clickable">
        <span class="conflict-box-badge conflict">Unavailable</span>
        <div class="shift-details flex-row">
          <div class="shift-detail-row flex-col">
            <span>${gender}</span>
            <span>${includedName}</span>
          </div>
          <div class="shift-detail-row flex-col">
            <span>📍</span>
            <span class="detail-label">Location</span>
            <span>${shiftRef.location}</span>
          </div>
          <div class="shift-detail-row flex-col">
            <span>📅</span>
            <span class="detail-label">Date</span>
            <span>${shiftRef.date}</span>
          </div>
          <div class="shift-detail-row flex-col">
            <span>🕐</span>
            <span class="detail-label">Shift Time</span>
            <span>${shiftRef.shiftTime}</span>
          </div>
        </div>
      </div>
    `;

    this.onclick = () => document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
      detail: { shiftIds: this._data.shifts.map(s => s.id) },
      bubbles: true,
    }));
  }
}

customElements.define("audit-availability", AuditAvailability);
