import type { AuditEntriesSet } from "../../types.js";
import { AuditEntryElementRefs } from "../../data/constants.js";

/**
 * Custom HTML element that renders a card for a group of audit entries.
 * Displays an icon, header, issue count, and dynamically creates a list of entry components
 * based on the audit code (e.g., <audit-employee-shift-count>, <audit-availability>, etc.).
 */
export class AuditEntriesCard extends HTMLElement {
  /** The dataset containing icon, header, and a list of audit entries. */
  private _data: AuditEntriesSet;
  /** Unique ID for the container element inside the card. */
  private _id: string;
  /** Array of dynamically created child custom elements. */
  private _entries: HTMLElement[];

  /**
   * Sets the data for the audit card and triggers a full render.
   * @param value - The audit entries set.
   */
  set data(value: AuditEntriesSet) {
    this._data = value;
    this.render();
    this.populateEntries();
  }

  constructor() {
    super();
    // Provide a default fallback _data (will be overwritten by setter)
    this._data = { icon: "", header: "", auditEntries: [] };
    this._id = `auditEntriesCard-${crypto.randomUUID()}`;
    this._entries = [];
  }

  /**
   * Populates the card with the list of audit entries.
   * If there are no entries, shows a "No issues found" message.
   * Otherwise, creates appropriate custom elements for each audit entry
   * (based on the audit code) and appends them to the container.
   */
  private populateEntries(): void {
    const entryContainer = this.querySelector<HTMLElement>(`#${this._id}`);
    const issueCountEl = this.querySelector<HTMLElement>(".issue-count");

    if (!entryContainer) {
      console.error("Unable to query entry container for auditEntriesCard web component.");
      return;
    }
    if (!issueCountEl) {
      console.error("Unable to query issue count element for auditEntriesCard web component.");
      return;
    }

    // Handle case with no actual issues
    if (!this._data.auditEntries || this._data.auditEntries.length === 0) {
      const innerText = document.createElement("div");
      innerText.classList.add("midline-centered", "success");
      innerText.textContent = "No issues found. ✅";

      entryContainer.appendChild(innerText);
      issueCountEl.textContent = "0 issues detected.";
      issueCountEl.classList.add("zero");
      return;
    }

    issueCountEl.textContent = `${this._data.auditEntries.length} issues detected.`;

    // Create child elements sorted by the number of affected shifts (largest first)
    this._entries = this._data.auditEntries
      .sort((a, b) => b.shifts.length - a.shifts.length)
      .map((ae) => {
        // Look up the custom element tag name for this audit code
        const tagName = AuditEntryElementRefs[ae.code];
        if (!tagName) {
          console.warn(`No custom element mapping found for audit code: ${ae.code}`);
          // Fallback to a generic div
          const fallback = document.createElement("div");
          fallback.textContent = `${ae.code}: ${ae.message}`;
          return fallback;
        }
        const rowEl = document.createElement(tagName) as HTMLElement & { data: unknown };
        rowEl.data = ae;
        return rowEl;
      });

    entryContainer.append(...this._entries);
  }

  /**
   * Renders the static structure of the audit card:
   * - Header with icon
   * - Issue count placeholder
   * - Container for the list of entries
   */
  private render(): void {
    this.innerHTML = `
            <div class="alert error">
                <div class="alert-header">
                    <span class="alert-icon">${this._data.icon}</span>
                    ${this._data.header}
                </div>
                <div class="issue-count"></div>
                <div id="${this._id}" class="fill-height-80"></div>
            </div>
        `;
  }
}

// Register the custom element with the browser
customElements.define("audit-entries-card", AuditEntriesCard);
