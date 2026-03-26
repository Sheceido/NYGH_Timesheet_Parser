/** @typedef {import("../types.d.ts").EmployeeMetrics} EmployeeMetrics */
/** @typedef {import("../types.d.ts").Shift} Shift */
/** @typedef {import("../types.d.ts").TimesheetColumn} TimesheetColumn */
import { DAYS_OF_THE_WEEK } from "../data/constants.js";

export class TimesheetTable extends HTMLElement {

  /** @type {{header: string[], metrics: EmployeeMetrics}} */
  _data;
  _timesheetColumns;

  constructor() {
    super();
  }

  /** @param {{header: string[], metrics: EmployeeMetrics}} value */
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

    // clear any prior table contents
    table.innerHTML = "";

    table.append(...this.generateHeaderRows());

    this._timesheetColumns = this.processTimesheet();
    table.append(...this.generateTimesheetRows(this._timesheetColumns));
  }

  connectedCallback() {
    if (!this.querySelector("table")) {
      this.render();
    }
  }

  copyToClipboard(columns) {
    if (!columns) {
      console.error("Timesheet columns have not been processed yet!");
      return;
    }

    const tsvTimesheet = this.timesheetColumnsToTSV(columns);

    if (!navigator.clipboard) {
      // Navigator.clipboard is not available if not using HTTPS,
      // fallback with alert containing the copyable text.
      alert(tsvTimesheet);
    } else {
      navigator.clipboard.writeText(tsvTimesheet).then(
        () => alert("Timesheet copied to your clipboard!")
      );
    }
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

  /** @returns {TimesheetColumn[]} */
  processTimesheet() {
    /** @type {TimesheetColumn[]} dataByDay */
    const dataByDay = [];

    /** @type {Map<number, Shift>} */
    const shiftsByDayMap = new Map();
    // organize shifts into a map for easy indexing
    this._data.metrics.scheduledShifts.forEach(s => shiftsByDayMap.set(s.weekday, s));

    const standbyMap = this._data.metrics.standbyHrs;

    for (let i = 1; i <= 14; i++) {
      let shiftId = "";
      let shiftTime = "";
      let standbyHours = "";
      let location = "";

      if (standbyMap) {
        standbyHours = standbyMap.has(i) ? standbyMap.get(i) : "";
      }

      if (shiftsByDayMap.has(i)) {
        const foundShift = shiftsByDayMap.get(i);
        shiftTime = foundShift.shiftTime;
        location = foundShift.location;
        shiftId = `${foundShift.id}`;
      }

      dataByDay.push({
        shiftId: shiftId,
        shiftTime: shiftTime,
        standby: standbyHours,
        location: location,
      });
    }

    return dataByDay;
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
   * @param {string} shiftId
   * @param {string | null} textContent
   */
  getTDElement(shiftId, textContent) {
    const td = document.createElement("td");
    if (shiftId !== "") {
      td.id = shiftId;
    }

    if (textContent !== null) {
      td.textContent = textContent;
    } else {
      td.textContent = "";
    }
    return td;
  }

  /**
   * @param {TimesheetColumn[]} columns
   * @returns {string}
   */
  timesheetColumnsToTSV(columns) {
    if (!columns) {
      console.error("Timesheet columns have not been processed yet!");
      return;
    }

    const row1 = [], row2 = [], row3 = [];
    columns.forEach(c => {
      row1.push(c.shiftTime, "\t");
      row2.push(c.standby, "\t");
      row3.push(c.location, "\t");
    });

    row1.push("\n");
    row2.push("\n");
    row3.push("\n");

    row1.join("");
    row2.join("");
    row3.join("");

    const tsv = row1.concat(row2, row3).join("");
    return tsv;
  }

  render() {
    this.innerHTML = `
      <div class="calendar-wrapper">
        <table class="calendar"></table>
      </div>
      <button class="btn">Copy Timesheet</button>
    `;

    /** @type {HTMLButtonElement} copyBtn */
    const copyBtn = this.querySelector("button.btn");
    if (!copyBtn) {
      console.error("Undefined copy button on query!");
      return;
    }

    copyBtn.onclick = () => this.copyToClipboard(this._timesheetColumns);
  }
}

customElements.define("timesheet-table", TimesheetTable);
