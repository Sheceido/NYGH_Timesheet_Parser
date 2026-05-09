import type { Shift } from "../../types.js";
import { capitalize } from "../../utils.js";

/**
 * Single card representing one shift in a conflict comparison.
 * Displays the shift details and a badge (“Existing” or “Conflict”).
 */
export class AuditShiftConflictCard extends HTMLElement {
  private _shift: Shift;
  private _isConflicting: boolean;

  set params({ shift, isConflicting }: { shift: Shift; isConflicting: boolean }) {
    this._shift = shift;
    this._isConflicting = isConflicting;
    this.render();
  }

  private render(): void {
    const [badgeClass, badgeText] = this._isConflicting
      ? ["conflict", "Conflict"]
      : ["existing", "Existing"];

    const gender = this._shift.employee?.gender === "M" ? "👨‍⚕️" : "👩‍⚕️";
    const employeeName = this._shift.employee?.str_alias ?? "Unknown";
    const includedName = `${gender} <b>${capitalize(employeeName)}</b>`;

    this.innerHTML = `
            <div class="conflict-box ${badgeClass}">
                <span class="conflict-box-badge ${badgeClass}">${badgeText}</span>
                <div class="shift-details">
                    <div class="shift-detail-row"><span>${includedName}</span></div>
                    <div class="shift-detail-row"><span>📍 ${this._shift.location}</span></div>
                    <div class="shift-detail-row"><span>📅 ${this._shift.date}</span></div>
                    <div class="shift-detail-row"><span>🕐 ${this._shift.shiftTime}</span></div>
                </div>
            </div>
        `;
  }
}
customElements.define("audit-shift-conflict-card", AuditShiftConflictCard);
