import type { EmployeeMetrics, Shift, TimesheetColumn } from "../types.js";
import { DAYS_OF_THE_WEEK } from "../data/constants.js";

/**
 * Custom HTML element that renders a timesheet table for a specific employee.
 * Displays shift times, standby hours, and locations for a 14‑day period.
 * Provides a button to copy the timesheet as TSV.
 */
export class TimesheetTable extends HTMLElement {
  /** Stores the header (dates) and employee metrics. */
  private _data: { header: string[]; metrics: EmployeeMetrics };
  /** Processed timesheet columns (one per day) ready for rendering. */
  private _timesheetColumns: TimesheetColumn[];

  constructor() {
    super();
    this._data = { header: [], metrics: {} as EmployeeMetrics };
    this._timesheetColumns = [];
  }

  /**
   * Sets the data for the timesheet and triggers a full re‑render.
   * @param value - Object containing the date headers and employee metrics.
   */
  set data(value: { header: string[]; metrics: EmployeeMetrics }) {
    this._data = value;

    if (!this.querySelector("table")) {
      this.render();
    }

    const table = this.querySelector("table");
    if (!table) {
      console.error("timesheet-table: table element not found!");
      return;
    }

    table.innerHTML = ""; // clear any prior table contents
    table.append(...this.generateHeaderRows());

    this._timesheetColumns = this.processTimesheet();
    table.append(...this.generateTimesheetRows(this._timesheetColumns));
  }

  /**
   * Lifecycle callback – runs when the element is added to the DOM.
   * Ensures the table is rendered if not already present.
   */
  connectedCallback(): void {
    if (!this.querySelector("table")) {
      this.render();
    }
  }

  /**
   * Copies the current timesheet data (as TSV) to the system clipboard.
   * Shows an alert on success or fallback alert if clipboard API is unavailable.
   * @param columns - Processed timesheet columns (optional, defaults to internal state).
   */
  copyToClipboard(columns?: TimesheetColumn[]): void {
    if (!columns) {
      console.error("Timesheet columns have not been processed yet!");
      return;
    }

    const tsvTimesheet = this.timesheetColumnsToTSV(columns);

    if (!navigator.clipboard) {
      alert(tsvTimesheet); // fallback for non‑HTTPS
    } else {
      navigator.clipboard.writeText(tsvTimesheet).then(() =>
        alert("Timesheet copied to your clipboard!")
      );
    }
  }

  /**
   * Creates the two header rows of the table:
   * - Row 1: Day‑of‑week names (Sat … Fri).
   * - Row 2: Date strings (e.g., "Jan 15").
   * @returns Array of two `<tr>` elements.
   */
  generateHeaderRows(): HTMLTableRowElement[] {
    const daysOfWeekRow = document.createElement("tr");
    const weekdate = document.createElement("tr");

    daysOfWeekRow.appendChild(document.createElement("th")); // empty first cell

    for (let j = 0; j < DAYS_OF_THE_WEEK.length; j++) {
      const th = document.createElement("th");
      th.textContent = DAYS_OF_THE_WEEK[j];
      daysOfWeekRow.appendChild(th);
    }

    for (let i = 0; i < this._data.header.length; i++) {
      const tdate = document.createElement("th");
      tdate.textContent = this._data.header[i];
      weekdate.appendChild(tdate);
    }

    return [daysOfWeekRow, weekdate];
  }

  /**
   * Processes the employee metrics into an array of `TimesheetColumn` objects,
   * one for each day (day 1 … 14). Associates shift times, standby hours, etc.
   * @returns Array of 14 `TimesheetColumn` entries.
   */
  processTimesheet(): TimesheetColumn[] {
    const dataByDay: TimesheetColumn[] = [];
    const shiftsByDayMap = new Map<number, Shift>();

    this._data.metrics.scheduledShifts.forEach(s => shiftsByDayMap.set(s.weekday, s));

    const standbyMap = this._data.metrics.standbyHrs;

    for (let i = 1; i <= 14; i++) {
      let shiftId = "";
      let shiftTime = "";
      let standbyHours = 0;          // default to 0 (means no standby)
      let location = "";

      if (standbyMap && standbyMap.has(i)) {
        standbyHours = standbyMap.get(i)!;
      }

      if (shiftsByDayMap.has(i)) {
        const foundShift = shiftsByDayMap.get(i)!;
        shiftTime = foundShift.shiftTime;
        location = foundShift.location;
        shiftId = foundShift.id;
      }

      dataByDay.push({
        shiftId,
        shiftTime,
        standby: standbyHours,
        location,
      });
    }

    return dataByDay;
  }

  /**
   * Builds the three data rows of the timesheet table:
   * - Row 1: Shift times.
   * - Row 2: Standby hours (empty cell for 0).
   * - Row 3: Locations.
   * @param columns - Processed timesheet columns.
   * @returns Array of three `<tr>` elements.
   */
  generateTimesheetRows(columns: TimesheetColumn[]): HTMLTableRowElement[] {
    const row1: HTMLTableCellElement[] = [this.getTDElement(null, "Shift Time")];
    const row2: HTMLTableCellElement[] = [this.getTDElement(null, "Standby")];
    const row3: HTMLTableCellElement[] = [this.getTDElement(null, "Location")];

    columns.forEach(column => {
      row1.push(this.getTDElement(column.shiftId, column.shiftTime));
      const standbyText = column.standby === 0 ? "" : column.standby.toString();
      row2.push(this.getTDElement(column.shiftId, standbyText));
      row3.push(this.getTDElement(column.shiftId, column.location));
    });

    return [row1, row2, row3].map(cells => {
      const tr = document.createElement("tr");
      tr.append(...cells);
      return tr;
    });
  }

  /**
   * Creates a `<td>` element, optionally setting its `id` and text content.
   * @param shiftId - Shift identifier (used as element id, may be null/empty).
   * @param textContent - Text to place inside the cell (null/empty becomes empty string).
   * @returns A configured `<td>` element.
   */
  getTDElement(shiftId: string | null, textContent: string | null): HTMLTableCellElement {
    const td = document.createElement("td");
    if (shiftId && shiftId !== "") {
      td.id = shiftId;
    }
    td.textContent = textContent ?? "";
    return td;
  }

  /**
   * Converts the timesheet columns to a tab‑separated values (TSV) string.
   * @param columns - Processed timesheet columns.
   * @returns TSV string with three rows (shift time, standby, location) and columns separated by tabs.
   */
  timesheetColumnsToTSV(columns: TimesheetColumn[]): string {
    if (!columns) {
      console.error("Timesheet columns have not been processed yet!");
      return "";
    }

    const row1: string[] = [];
    const row2: string[] = [];
    const row3: string[] = [];

    columns.forEach(c => {
      row1.push(c.shiftTime, "\t");
      const standbyStr = c.standby === 0 ? "" : c.standby.toString();
      row2.push(standbyStr, "\t");
      row3.push(c.location, "\t");
    });

    row1.push("\n");
    row2.push("\n");
    row3.push("\n");

    return row1.join("") + row2.join("") + row3.join("");
  }

  /**
   * Renders the initial static structure of the component:
   * a wrapper div, an empty table, and a copy button.
   * Attaches the click handler to the button.
   */
  render(): void {
    this.innerHTML = `
            <div class="calendar-wrapper">
                <table class="calendar"></table>
            </div>
            <button class="btn">Copy Timesheet</button>
        `;

    const copyBtn = this.querySelector("button.btn") as HTMLButtonElement | null;
    if (!copyBtn) {
      console.error("Undefined copy button on query!");
      return;
    }

    copyBtn.onclick = () => this.copyToClipboard(this._timesheetColumns);
  }
}

// Register the custom element with the browser
customElements.define("timesheet-table", TimesheetTable);
