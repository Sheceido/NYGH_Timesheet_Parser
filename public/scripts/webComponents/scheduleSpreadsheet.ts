import type { ScheduleRenderDataset, Shift, RowSemantic } from "../types.js";
import { BIWEEKLY, DAYS_OF_THE_WEEK, RowSemanticKind, cellColorSwatch } from "../data/constants.js";
import { ShiftQueryUtils } from "../modules/shiftQueryUtils.js";
import { capitalize } from "../utils.js";

/**
 * Custom HTML element that renders a full sche:ule spreadsheet.
 * Displays a bi‑weekly grid of shifts with row semantics, colors, and shift data.
 */
export class ScheduleSpreadsheet extends HTMLElement {
  /** The dataset containing headers, row semantics, shifts, and origin map. */
  private _data: ScheduleRenderDataset;

  /** 2D grid of shifts, organized by row (original schedule row) and column (weekday). */
  private _shiftGrid: Shift[][];

  constructor() {
    super();
    this._data = { header: [], rowSemantics: [], shifts: [], shiftOrigin: new Map() };
    this._shiftGrid = [];
  }

  /**
   * Sets the dataset and triggers a full re‑render of the spreadsheet.
   * @param value - The complete schedule render dataset.
   */
  set data(value: ScheduleRenderDataset) {
    this._data = value;

    if (!this.querySelector("table")) {
      this.render();
    }

    const table = this.querySelector("table");
    if (!table) {
      console.error("schedule-spreadsheet: table element not found!");
      return;
    }

    table.innerHTML = "";
    table.append(...this.generateHeaderRows());

    this._shiftGrid = this.organizeShifts();
    const spreadsheetRows = this.generateSpreadsheetCells(this._data.rowSemantics, this._shiftGrid);
    table.append(...spreadsheetRows);
  }

  /**
   * Generates the two header rows:
   * - First row: day‑of‑week names (Sat … Fri).
   * - Second row: date strings (e.g., "Jan 15").
   * @returns Array of two `</tr>` elements.
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
   * Organises shifts into a 2D grid keyed by row (original schedule row).
   * Uses the shift origin map to place each shift in the correct row.
   * @returns Array of rows, each containing an array of shifts sorted by weekday.
   */
  organizeShifts(): Shift[][] {
    const rows: Shift[][] = [];
    const rowMap = new Map<number, Shift[]>();

    const shifts = this._data.shifts;
    const origins = this._data.shiftOrigin;

    shifts.forEach(shift => {
      if (!origins.has(shift.id)) {
        console.error(`Undefined shift id "${shift.id}" when trying to identify shift origin.`);
        return;
      }
      const so = origins.get(shift.id)!;
      if (rowMap.has(so.row)) {
        rowMap.get(so.row)!.push(shift);
      } else {
        rowMap.set(so.row, [shift]);
      }
    });

    rowMap.forEach(rowShifts => {
      const sortedRow = rowShifts.sort((a, b) => a.weekday - b.weekday);
      rows.push(sortedRow);
    });

    return rows;
  }

  /**
   * Creates the body of the spreadsheet by filling in shift cells.
   * @param rowSemantics - Semantic information for each row (location, shift time, kind).
   * @param shiftGrid - 2D grid of shifts (row → array of shifts).
   * @returns Array of `<tr>` elements representing the spreadsheet rows.
   */
  generateSpreadsheetCells(rowSemantics: RowSemantic[], shiftGrid: Shift[][]): HTMLTableRowElement[] {
    const origins = this._data.shiftOrigin;
    const rowsMap = new Map<number, HTMLTableRowElement>();

    // Create placeholder rows (one per non‑header row)
    rowSemantics.forEach(rs => {
      if (rs.kind === RowSemanticKind.HEADER) return;

      const rsBgColor = this.matchCellColorByValues(rs.location, rs.value);
      const tr = document.createElement("tr");
      tr.appendChild(this.getTDElement("", rs.value, rsBgColor));

      // Add 14 empty placeholder cells (one per weekday)
      for (let i = 0; i < BIWEEKLY; i++) {
        tr.insertCell();
      }
      rowsMap.set(rs.row, tr);
    });

    // Populate placeholder cells with actual shift data
    shiftGrid.forEach(row => {
      row.forEach(shift => {
        const shiftOrigin = origins.get(shift.id);
        if (!shiftOrigin) {
          console.error(`Unable to get row/col origin for shift:`, shift);
          return;
        }

        const matchingTR = rowsMap.get(shiftOrigin.row);
        if (!matchingTR) {
          console.error(`Unable to get row ${shiftOrigin.row} when iterating through shift:`, shift);
          return;
        }

        let cellValue = shift.names[shift.names.length - 1];
        if (cellValue && cellValue.length > 2) {
          cellValue = capitalize(cellValue);
        }

        const cellColor = this.matchCellColorByShift(shift);
        matchingTR.cells[shiftOrigin.col].replaceWith(
          this.getTDElement(shift.id, cellValue, cellColor)
        );
      });
    });

    return [...rowsMap.values()];
  }

  /**
   * Looks up the background colour for a cell based on location and shift time.
   * @param location - Row location (e.g., "GENERAL", "BDC").
   * @param shiftTime - Normalised shift time (e.g., "08:00-16:00").
   * @returns CSS colour string or `"white"` if no match.
   */
  matchCellColorByValues(location: string, shiftTime: string): string {
    let colorDefault = "white";
    const shiftTimeCollection = cellColorSwatch.get(location);
    if (!shiftTimeCollection) return colorDefault;
    const foundColor = shiftTimeCollection[shiftTime];
    return foundColor || colorDefault;
  }

  /**
   * Determines the background colour for a shift cell.
   * Weekday‑end shifts that are workable get a special yellow highlight.
   * Otherwise delegates to `matchCellColorByValues`.
   * @param s - The shift object.
   * @returns CSS colour string.
   */
  matchCellColorByShift(s: Shift): string {
    if (
      ShiftQueryUtils.dayIsWeekend(s.weekday) &&
      s.rowKind !== RowSemanticKind.STATUS &&
      s.employee
    ) {
      return "#FFFF99";
    }
    return this.matchCellColorByValues(s.location, s.shiftTime);
  }

  /**
   * Creates a `<td>` element, optionally with an id, text content, and background colour.
   * The text is wrapped in a `<span>` to allow further styling.
   * @param shiftId - Shift identifier (used as `id` attribute, may be empty).
   * @param textContent - Text to display (may be `null` or empty).
   * @param bgColor - Optional background colour.
   * @returns Configured `</td>` element.
   */
  getTDElement(shiftId: string, textContent: string | null, bgColor?: string): HTMLTableCellElement {
    const td = document.createElement("td");
    const innerText = document.createElement("span");

    if (shiftId !== "") {
      td.id = shiftId;
    }

    if (textContent !== null) {
      innerText.textContent = textContent;
      td.appendChild(innerText);
    } else {
      td.textContent = "";
    }

    if (bgColor) {
      td.style.backgroundColor = bgColor;
    }

    return td;
  }

  /** Lifecycle callback – renders the initial empty table when added to the DOM. */
  connectedCallback(): void {
    this.render();
  }

  /** Renders the initial static structure: a wrapper div with an empty table. */
  render(): void {
    this.innerHTML = `
            <div class="calendar-wrapper">
                <table class="calendar"></table>
            </div>
        `;
  }
}

// Register the custom element with the browser
customElements.define("schedule-spreadsheet", ScheduleSpreadsheet);
