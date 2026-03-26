/** @typedef {import('../types.d.ts').ScheduleRenderDataset} ScheduleRenderDataset */

import { MODAL_CLOSE, MODAL_OPEN } from "../data/constants.js";

export class ModalSchedule extends HTMLElement {

  _data;

  constructor() {
    super();
  }

  /** @param {ScheduleRenderDataset} value */
  set data(value) {
    this._data = value;
    let ss = this.querySelector("schedule-spreadsheet");

    if (!ss) {
      this.render();
      ss = this.querySelector("schedule-spreadsheet");
    }

    ss.data = value;
  }

  connectedCallback() {
    this.render();
  }

  open() {
    document.dispatchEvent(new CustomEvent(MODAL_OPEN, { bubbles: true, }));
  }

  close() {
    document.dispatchEvent(new CustomEvent(MODAL_CLOSE, { bubbles: true, }));
  }

  render() {
    this.innerHTML = `
     <div class="backdrop" id="backdrop" role="presentation" aria-hidden="true">
        <dialog
          id="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialogTitle"
          aria-describedby="dialogDesc"
        >
          <div class="dialog-inner">
            <header class="dialog-header">
              <button class="btn-close" id="closeModal" aria-label="Close dialog">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"> <line x1="1" y1="1" x2="13" y2="13"/> <line x1="13" y1="1" x2="1" y2="13"/> </svg>
              </button>
            </header>
            <div class="dialog-body" id="dialogDesc">
              <schedule-spreadsheet></schedule-spreadsheet>
            </div>
          </div>
        </dialog>
      </div>
    `;

    const close = this.querySelector("#closeModal");
    if (!close) {
      console.error("Unexpected undefined close button element when querying 'btn-close'.");
      return;
    }
    close.onclick = () => this.close();
  }
}

customElements.define("modal-schedule", ModalSchedule);
