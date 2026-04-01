/** @typedef {import("../types.d.ts").AuditEntriesSet } AuditEntriesSet */

import { AuditEntryElementRefs } from "../../data/constants.js";

export class AuditEntriesCard extends HTMLElement {

  /** @type {AuditEntriesSet} _data */
  _data;
  _id = `auditEntriesCard-${crypto.randomUUID()}`;
  _entries;

  /** @param {AuditEntriesSet} value  */
  set data(value) {
    this._data = value;
    this.render();
    this.populateEntries();
  }

  populateEntries() {
    const entryContainer = this.querySelector(`#${this._id}`);
    const issueCountEl = this.querySelector(".issue-count");

    if (!entryContainer) {
      console.error("Unable to query entry container for auditEntriesCard web component.");
      return;
    }

    if (!issueCountEl) {
      console.error("Unable to query issue count element for auditEntriesCard web component.");
      return;
    }

    // Handle empty case
    if (!this._data.auditEntries || this._data.auditEntries.length < 1) {
      const innerText = document.createElement("div");
      innerText.classList.add("midline-centered", "success");
      innerText.textContent = "No issues found. ✅";

      entryContainer.appendChild(innerText);
      issueCountEl.textContent = `0 issues detected.`;
      issueCountEl.classList.add("zero");

      return;
    }

    issueCountEl.textContent = `${this._data.auditEntries.length} issues detected.`;

    // Create and append entry elements
    this._entries = this._data.auditEntries
      .sort((a, b) => b.shifts.length - a.shifts.length)
      .map((ae) => {
        const rowEl = document.createElement(AuditEntryElementRefs[ae.code]);
        rowEl.data = ae;
        return rowEl;
      });

    entryContainer.append(...this._entries);
  }

  render() {
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

customElements.define("audit-entries-card", AuditEntriesCard);
