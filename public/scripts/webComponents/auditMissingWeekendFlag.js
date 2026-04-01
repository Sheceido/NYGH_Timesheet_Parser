/** @typedef {import('../types.d.ts').AuditEntry} AuditEntry */
import { MODAL_OPEN } from "../data/constants.js";
import { capitalize } from '../utils.js';

export class AuditMissingWeekendFlag extends HTMLElement {

  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value */
  set data(value) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
  }

  render() {
    const weekendShifts = [];
    const flagShifts = [];
    const employeeName = capitalize(this._data.employees[0].str_alias);

    this._data.shifts.forEach(s => {
      if (s.employee === null) {
        flagShifts.push(s);
      } else {
        weekendShifts.push(s);
      }
    });

    let diffCount;
    if (weekendShifts.length > flagShifts.length) {
      const diff = weekendShifts.length - flagShifts.length;
      diffCount = `${diff} missing "w/e" flag${(diff > 1 ? "s" : "")}`
    } else {
      const diff = flagShifts.length - weekendShifts.length;
      diffCount = `${diff} extra "w/e" flag${(diff > 1 ? "s" : "")}`;
    }

    this.innerHTML = `
      <div class="alert-item">
        <span class="alert-name">${employeeName}</span>
        <div class="alert-count">
          <span>${diffCount}</span>
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

customElements.define("audit-missing-weekend-flag", AuditMissingWeekendFlag);
