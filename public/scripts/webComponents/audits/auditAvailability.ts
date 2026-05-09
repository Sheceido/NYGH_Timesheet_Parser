import type { AuditEntry } from "../../types.js";
import { MODAL_OPEN } from "../../data/constants.js";
import { capitalize } from "../../utils.js";

/**
 * Custom HTML element that renders an "availability conflict" audit card.
 * Displays employee gender, name, location, date, and shift time.
 * Clicking the card dispatches a MODAL_OPEN event with the affected shift IDs.
 */
export class AuditAvailability extends HTMLElement {
  /** The audit entry containing shift(s) that conflict with "Not Available" status. */
  private _data: AuditEntry;

  /**
   * Sets the audit data and triggers a re-render.
   * @param value - The audit entry for this availability conflict.
   */
  set data(value: AuditEntry) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
    // Initialise _data with a minimal placeholder (will be overwritten by setter)
    this._data = { code: "NOT_AVAILABLE", severity: "ERROR", employees: [], shifts: [], message: "" };
  }

  /**
   * Renders the HTML structure of the audit card and attaches the click handler.
   * The card displays gender icon, employee name, location, date, and shift time.
   */
  render(): void {
    const shiftRef = this._data.shifts[0];
    // Safety check in case the shift has no employee (though for NOT_AVAILABLE it should)
    const gender = shiftRef.employee?.gender === "M" ? "👨‍⚕️" : "👩‍⚕️";
    const includedName = `<b>${capitalize(shiftRef.employee?.str_alias ?? "Unknown")}</b>`;

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

    this.onclick = () => {
      document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
        detail: { shiftIds: this._data.shifts.map(s => s.id) },
        bubbles: true,
      }));
    };
  }
}

// Register the custom element with the browser
customElements.define("audit-availability", AuditAvailability);
