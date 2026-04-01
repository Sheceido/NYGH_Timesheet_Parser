/** @typedef {import("../types.d.ts").AuditEntry} AuditEntry */
/** @typedef {import("../types.d.ts").Shift} Shift */
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

export class AuditShiftConflict extends HTMLElement {

  /** @type {string} */
  _id = `conflict-comparison-${crypto.randomUUID()}`;
  /** @type {AuditEntry} _data */
  _data;

  /** @param {AuditEntry} value  */
  set data(value) {
    this._data = value;
    this.render();
    this.populateComparison();
  }

  populateComparison() {
    const comparisonBox = this.querySelector(`#${this._id}`);
    const conflictCardList = [];

    const conflictingSet = document.createElement("div");

    this._data.shifts.forEach((s, i) => {
      const conflictCard = document.createElement("audit-shift-conflict-card");
      conflictCard.params = {
        shift: s,
        isConflicting: (i !== 0),
      };

      if (i === 0) {
        conflictCardList.push(conflictCard);

        const vs = document.createElement("div");
        vs.classList.add("conflict-vs-divider");
        vs.innerHTML = `
          <div class="conflict-vs-line"></div>
          <span class="conflict-vs">vs</span>
          <div class="conflict-vs-line"></div>
        `;
        conflictCardList.push(vs);

      } else {
        conflictingSet.appendChild(conflictCard);
      }
    });

    conflictCardList.push(conflictingSet);
    comparisonBox.append(...conflictCardList);
  }

  render() {
    this.innerHTML = `
      <div id="${this._id}" class="conflict-comparison"></div>
    `;

    this.onclick = () => document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
      detail: { shiftIds: this._data.shifts.map(s => s.id) },
      bubbles: true,
    }));

  }
}
customElements.define("audit-shift-conflict", AuditShiftConflict);

export class AuditShiftConflictCard extends HTMLElement {

  /** @type {Shift} _shift */
  _shift;
  /** @type {boolean} _isConflicting */
  _isConflicting;

  /**
   * @param {{ shift: Shift, isConflicting: boolean }}
   */
  set params({ shift, isConflicting }) {
    this._shift = shift;
    this._isConflicting = isConflicting;
    this.render();
  }

  render() {
    let existingVsConflict;
    if (this._isConflicting) {
      existingVsConflict = ["conflict", "Conflict"];
    } else {
      existingVsConflict = ["existing", "Existing"];
    }

    const gender = this._shift.employee.gender === "M" ? "👨‍⚕️" : "👩‍⚕️";
    const includedName = `${gender} <b>${capitalize(this._shift.employee.str_alias)}</b>`;

    this.innerHTML = `
      <div class="conflict-box ${existingVsConflict[0]}">
        <span class="conflict-box-badge ${existingVsConflict[0]}">${existingVsConflict[1]}</span>
        <div class="shift-details">
          <div class="shift-detail-row">
            <span>${includedName}</span>
          </div>
          <div class="shift-detail-row">
            <span>📍 ${this._shift.location}</span>
          </div>
          <div class="shift-detail-row">
            <span>📅 ${this._shift.date}</span>
          </div>
          <div class="shift-detail-row">
            <span>🕐 ${this._shift.shiftTime}</span>
          </div>
        </div>
      </div>
   `;
  }
}

customElements.define("audit-shift-conflict-card", AuditShiftConflictCard);
