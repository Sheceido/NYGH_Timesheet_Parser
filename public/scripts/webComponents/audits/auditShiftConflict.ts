import type { AuditEntry, Shift } from "../../types.js";
import { MODAL_OPEN } from "../../data/constants.js";

/**
 * Main container for a shift conflict audit.
 * Displays a comparison between the “original” shift and conflicting shifts.
 * Renders a "vs" divider and several conflict cards.
 */
export class AuditShiftConflict extends HTMLElement {
  private _id: string;
  private _data: AuditEntry;

  set data(value: AuditEntry) {
    this._data = value;
    this.render();
    this.populateComparison();
  }

  constructor() {
    super();
    this._id = `conflict-comparison-${crypto.randomUUID()}`;
    // Default placeholder (will be overwritten by setter)
    this._data = {
      code: "MALE_CONFLICT",
      severity: "WARNING",
      employees: [],
      shifts: [],
      message: "",
    };
  }

  private populateComparison(): void {
    const comparisonBox = this.querySelector<HTMLElement>(`#${this._id}`);
    if (!comparisonBox) return;

    const conflictCardList: HTMLElement[] = [];
    const conflictingSet = document.createElement("div");

    this._data.shifts.forEach((shift, index) => {
      const card = document.createElement("audit-shift-conflict-card") as HTMLElement & { params: { shift: Shift; isConflicting: boolean } };
      card.params = { shift, isConflicting: index !== 0 };

      if (index === 0) {
        conflictCardList.push(card);

        const vsDiv = document.createElement("div");
        vsDiv.classList.add("conflict-vs-divider");
        vsDiv.innerHTML = `
                    <div class="conflict-vs-line"></div>
                    <span class="conflict-vs">vs</span>
                    <div class="conflict-vs-line"></div>
                `;
        conflictCardList.push(vsDiv);
      } else {
        conflictingSet.appendChild(card);
      }
    });

    conflictCardList.push(conflictingSet);
    comparisonBox.append(...conflictCardList);
  }

  private render(): void {
    this.innerHTML = `<div id="${this._id}" class="conflict-comparison"></div>`;
    this.onclick = () => {
      document.dispatchEvent(new CustomEvent(MODAL_OPEN, {
        detail: { shiftIds: this._data.shifts.map(s => s.id) },
        bubbles: true,
      }));
    };
  }
}
customElements.define("audit-shift-conflict", AuditShiftConflict);


