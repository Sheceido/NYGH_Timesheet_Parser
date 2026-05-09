import type { ScheduleRenderDataset } from "../types.js";
import { MODAL_CLOSE, MODAL_OPEN } from "../data/constants.js";

/**
 * Custom HTML element that renders a modal dialog containing a schedule spreadsheet.
 * Provides methods to open/close the modal and passes data to the inner spreadsheet.
 */
export class ModalSchedule extends HTMLElement {
  /** The dataset to be passed to the inner `<schedule-spreadsheet>` element. */
  private _data: ScheduleRenderDataset;

  constructor() {
    super();
    this._data = { header: [], rowSemantics: [], shifts: [], shiftOrigin: new Map() };
  }

  /**
   * Sets the data for the modal and updates the inner spreadsheet.
   * @param value - The schedule render dataset.
   */
  set data(value: ScheduleRenderDataset) {
    this._data = value;
    let ss = this.querySelector("schedule-spreadsheet") as HTMLElement & { data: ScheduleRenderDataset } | null;

    if (!ss) {
      this.render();
      ss = this.querySelector("schedule-spreadsheet");
    }

    if (ss) {
      ss.data = value;
    }
  }

  /**
   * Lifecycle callback – renders the component when added to the DOM.
   */
  connectedCallback(): void {
    this.render();
  }

  /**
   * Dispatches a custom event to open the modal.
   */
  open(): void {
    document.dispatchEvent(new CustomEvent(MODAL_OPEN, { bubbles: true }));
  }

  /**
   * Dispatches a custom event to close the modal.
   */
  close(): void {
    document.dispatchEvent(new CustomEvent(MODAL_CLOSE, { bubbles: true }));
  }

  /**
   * Renders the modal HTML structure and attaches the close button handler.
   */
  render(): void {
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
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                                    <line x1="1" y1="1" x2="13" y2="13"/>
                                    <line x1="13" y1="1" x2="1" y2="13"/>
                                </svg>
                            </button>
                        </header>
                        <div class="dialog-body" id="dialogDesc">
                            <schedule-spreadsheet></schedule-spreadsheet>
                        </div>
                    </div>
                </dialog>
            </div>
        `;

    const close = this.querySelector("#closeModal") as HTMLButtonElement | null;
    if (!close) {
      console.error("Unexpected undefined close button element when querying 'btn-close'.");
      return;
    }
    close.onclick = () => this.close();
  }
}

// Register the custom element with the browser
customElements.define("modal-schedule", ModalSchedule);
