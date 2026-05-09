import type { AuditEntry, Shift } from "../../types.js";
import { MODAL_OPEN } from "../../data/constants.js";

/**
 * Custom HTML element that displays a card for empty shift audits.
 * Shows the number of empty shifts, a clickable summary, and individual shift details.
 * Clicking on any shift detail or the "View Empty Shifts" button dispatches a MODAL_OPEN event.
 */
export class AuditEmptyShifts extends HTMLElement {
  /** The audit entry containing the empty shifts. */
  private _data: AuditEntry;

  /**
   * Sets the audit data and triggers a re-render.
   * @param value - The audit entry (should contain shifts, code, severity, message).
   */
  set data(value: AuditEntry) {
    this._data = value;
    this.render();
  }

  constructor() {
    super();
    // Provide a placeholder – will be overwritten by setter.
    this._data = {
      code: "EMPTY_SHIFT",
      severity: "WARNING",
      employees: [],
      shifts: [],
      message: "",
    };
  }

  /**
   * Creates a visual card for a single empty shift.
   * @param s - The empty shift object.
   * @returns A `div` element with shift details (location, date, shift time).
   */
  private createEmptyShiftEntries(s: Shift): HTMLDivElement {
    const container = document.createElement("div");
    container.classList.add("shift-details", "grid-col-3", "boxed-grid-item");
    container.innerHTML = `
            <div class="shift-detail-row flex-col">
                <span>📍</span>
                <span class="detail-label">Location</span>
                <span>${s.location}</span>
            </div>
            <div class="shift-detail-row flex-col">
                <span>📅</span>
                <span class="detail-label">Date</span>
                <span>${s.date}</span>
            </div>
            <div class="shift-detail-row flex-col">
                <span>🕐</span>
                <span class="detail-label">Shift Time</span>
                <span>${s.shiftTime}</span>
            </div>
        `;

    container.onclick = () => {
      document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
        detail: { shiftIds: [s.id] },
        bubbles: true,
      }));
    };

    return container;
  }

  /**
   * Renders the main audit card:
   * - Badge with the number of empty shifts.
   * - An expandable `<details>` section.
   * - Click summary toggles open/close.
   * - "View Empty Shifts" button dispatches modal with all empty shift IDs.
   * - Appends individual shift cards inside `<details>`.
   */
  render(): void {
    const emptyShiftEntries = this._data.shifts.map(s => this.createEmptyShiftEntries(s));

    this.innerHTML = `
            <div class="conflict-box clickable">
                <span class="conflict-box-badge conflict">${this._data.shifts.length} Empty Shifts Detected</span>
                <details class="clickable">
                    <div id="seeAllEmpty" class="shift-details boxed-grid-item">
                        View Empty Shifts <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20px" height="20px"> <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <summary>Click to Expand</summary>
                </details>
            </div>
        `;

    const details = this.querySelector("details");
    const summary = this.querySelector("summary");

    if (details && summary) {
      details.addEventListener("toggle", () => {
        summary.textContent = details.open ? "Click to Collapse" : "Click to Expand";
      });
    }

    const seeAllEmpty = this.querySelector("#seeAllEmpty");
    if (seeAllEmpty) {
      seeAllEmpty.addEventListener("click", () => {
        document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
          detail: { shiftIds: this._data.shifts.map(s => s.id) },
          bubbles: true,
        }));
      });
    }

    if (details) {
      details.append(...emptyShiftEntries);
    }
  }
}

// Register the custom element with the browser
customElements.define("audit-empty-shifts", AuditEmptyShifts);
