/** @typedef {import('../types.d.ts').ScheduleRenderDataset} ScheduleRenderDataset */
/** @typedef {import('../types.d.ts').Shift} Shift */
/** @typedef {import('../types.d.ts').RowSemantic} RowSemantic */

import { BIWEEKLY, DAYS_OF_THE_WEEK, RowSemanticKind, cellColorSwatch } from '../data/constants.js';
import { ShiftQueryUtils } from '../modules/shiftQueryUtils.js';
import { capitalize } from '../utils.js';

export class ScheduleSpreadsheet extends HTMLElement {

  /** @type {ScheduleRenderDataset} _data */
  _data;

  /** @type {Shift[][]} _shiftGrid */
  _shiftGrid;

  constructor() {
    super();
  }

  /** @param {ScheduleRenderDataset} value */
  set data(value) {
    this._data = value;

    if (!this.querySelector("table")) {
      this.render();
    }

    const table = this.querySelector("table");
    if (!table) {
      console.error("timesheet-table: table element not found!");
      return;
    }

    table.innerHTML = "";
    table.append(...this.generateHeaderRows());

    this._shiftGrid = this.organizeShifts();
    const spreadsheetRows = this.generateSpreadsheetCells(this._data.rowSemantics, this._shiftGrid);
    table.append(...spreadsheetRows);
  }

  /** @returns {HTMLTableRowElement[]} */
  generateHeaderRows() {
    const daysOfWeekRow = document.createElement("tr");
    const weekdate = document.createElement("tr");

    daysOfWeekRow.appendChild(document.createElement("th")); //empty first element

    // First row: Sat => Fri innumeration
    for (let j = 0, th; j < DAYS_OF_THE_WEEK.length; j++) {
      th = document.createElement("th");
      th.textContent = DAYS_OF_THE_WEEK[j];
      daysOfWeekRow.appendChild(th);
    }
    // Second row: <month> <days...> inumeration
    for (let i = 0, tdate; i < this._data.header.length; i++) {
      tdate = document.createElement("th");
      tdate.textContent = this._data.header[i];
      weekdate.appendChild(tdate);
    }

    return [daysOfWeekRow, weekdate];
  }

  /** @returns {Shift[][]} */
  organizeShifts() {
    /** @type {Shift[][]} rows */
    const rows = [];

    /** @type {Map<number, Shift[]>} rowMap */
    const rowMap = new Map();

    const shifts = this._data.shifts;
    const origins = this._data.shiftOrigin;

    shifts.forEach(shift => {

      if (!origins.has(shift.id)) {
        console.error(`Undefined shift id "${shift.id}" when trying to identify shift origin.`);
        return;
      }

      const so = origins.get(shift.id);
      if (rowMap.has(so.row)) {
        rowMap.get(so.row).push(shift);
      } else {
        rowMap.set(so.row, [shift]);
      }
    });

    rowMap.values().forEach(row => {
      const sortedRow = row.sort((a, b) => a.weekday > b.weekday);
      rows.push(sortedRow);
    });

    return rows;
  }

  /**
   * @param {TimesheetColumn[]} columns 
   * @returns {HTMLTableRowElement[]}
   */
  generateTimesheetRows(columns) {
    // initialize first td element as row label
    const row1 = [this.getTDElement(null, "Shift Time")]
    const row2 = [this.getTDElement(null, "Standby")]
    const row3 = [this.getTDElement(null, "Location")];

    // set each column in the three rows of data
    columns.forEach(column => {
      row1.push(this.getTDElement(column.shiftId, column.shiftTime));
      row2.push(this.getTDElement(column.shiftId, column.standby));
      row3.push(this.getTDElement(column.shiftId, column.location));
    });

    return [row1, row2, row3].map(cells => {
      const tr = document.createElement("tr");
      tr.append(...cells);
      return tr;
    });
  }

  /**
   * @param {RowSemantic[]} rowSemantics
   * @param {Shift[][]} shiftGrid 
   * @returns {HTMLTableRowElement[]}
   */
  generateSpreadsheetCells(rowSemantics, shiftGrid) {

    const origins = this._data.shiftOrigin;

    /** @type {Map<number, HTMLTableRowElement>} */
    const rowsMap = new Map();

    rowSemantics.forEach(rs => {
      // skip header rows
      if (rs.kind === RowSemanticKind.HEADER) {
        return;
      }

      const rsBgColor = this.matchCellColorByValues(rs.location, rs.value);

      const tr = document.createElement("tr");
      tr.appendChild(this.getTDElement("", rs.value, rsBgColor));

      // Add 14 placeholder td cells into the table row
      for (let i = 0; i < BIWEEKLY; i++) {
        tr.insertCell();
      }
      rowsMap.set(rs.row, tr);
    });

    // Index into the proper table row, then replace placeholder TD with
    // a new TD that holds values of the shift position
    shiftGrid.forEach(row => {
      row.forEach(shift => {

        const shiftOrigin = origins.get(shift.id);
        if (!shiftOrigin) {
          console.error(`Unable to get row/col origin for shift: `, shift);
          return;
        }

        const matchingTR = rowsMap.get(shiftOrigin.row);
        if (!matchingTR) {
          console.error(`Unable to get row ${shiftOrigin.row} when iterating through shift: `, shift);
          return;
        }

        // Set and format name
        let cellValue = shift.names[shift.names.length - 1];
        if (cellValue && cellValue.length > 2) {
          cellValue = capitalize(cellValue);
        }

        const cellColor = this.matchCellColorByShift(shift);

        // Replace with intended td cell with text content
        matchingTR.cells[shiftOrigin.col].replaceWith(this.getTDElement(shift.id, cellValue, cellColor));
      });
    });

    return [...rowsMap.values()];
  }

  /**
   * @param {string} location 
   * @param {string} shiftTime 
   * @returns {string} color
   */
  matchCellColorByValues(location, shiftTime) {
    let colorDefault = "white";

    /** @type {Object<string, string>} shiftTimeCollection */
    const shiftTimeCollection = cellColorSwatch.get(location);
    if (!shiftTimeCollection) {
      return colorDefault;
    }

    const foundColor = shiftTimeCollection[shiftTime];
    if (!foundColor) {
      return colorDefault;
    }

    return foundColor;
  }

  /** @param {Shift} s  */
  matchCellColorByShift(s) {
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
   * @param {string} shiftId
   * @param {string | null} textContent
   * @param {string | undefined} bgColor 
   */
  getTDElement(shiftId, textContent, bgColor) {
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

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="calendar-wrapper">
        <table class="calendar"></table>
      </div>
    `;
  }
}

customElements.define("schedule-spreadsheet", ScheduleSpreadsheet);
