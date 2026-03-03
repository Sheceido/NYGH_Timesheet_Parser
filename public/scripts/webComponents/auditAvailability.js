/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
import { capitalize } from "../utils.js";

export class AuditAvailability extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
  }

  render() {
    const shiftRef = this._data.shifts[0];
    const gender = shiftRef.employee.gender === "M" ? "👨‍⚕️" : "👩‍⚕️";
    const includedName = `${gender} - <b>${capitalize(shiftRef.employee.str_alias)}</b>`;

    this.innerHTML = `
      <div class="conflict-box conflict clickable">
        <span class="conflict-box-badge conflict">Conflict</span>
        <div class="shift-details flex-row">
          <div class="shift-detail-row">
            <span>${includedName}</span>
          </div>
          <div class="shift-detail-row">
            <span>📍 ${shiftRef.location}</span>
          </div>
          <div class="shift-detail-row">
            <span>📅 ${shiftRef.date}</span>
          </div>
          <div class="shift-detail-row">
            <span>🕐 ${shiftRef.shiftTime}</span>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define("audit-availability", AuditAvailability);
