/** @typedef {import('../types.d.ts').Roster} Roster */

import { ROSTER, CASUAL_ROSTER } from "../data/roster.js";
import { capitalizeArray } from "../utils.js";

export class EmployeeSelector extends HTMLElement {

  value;

  constructor() {
    super();

    this.innerHTML = `
      <div class="select-wrapper">
        <select></select>
      </div>
    `;
  }

  get selected() {
    return this.value;
  }

  /**
   * @param {string} textContent 
   * @param {boolean} selected 
   * @returns {HTMLOptionElement}
   */
  createDisabledOption(textContent, selected) {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.value = "";
    opt.textContent = textContent;
    opt.selected = selected;

    return opt;
  }
  /**
   * @param {string} header 
   * @param {Roster} roster 
   * @returns {HTMLOptionElement[]}
   */
  getRosterOptions(header, roster) {
    /** @type {HTMLOptionElement[]} optionsList */
    const optionsList = [];

    const headerOption = this.createDisabledOption(header, false);
    optionsList.push(headerOption);

    for (const [fullName, employee] of Object.entries(roster)) {
      const option = document.createElement("option");
      option.value = fullName;
      option.textContent = capitalizeArray(employee.str_alias.split(" "));
      optionsList.push(option);
    }

    return optionsList;
  }

  connectedCallback() {
    const selectEl = this.querySelector("select");
    if (!selectEl) {
      console.error("Unexpected undefined select element when querying 'select' tag");
      return;
    }

    const optionsList = [
      this.createDisabledOption("Select an employee...", true),
      this.createDisabledOption("", false),
      ...this.getRosterOptions("Full Time Staff", ROSTER),
      this.createDisabledOption("", false),
      ...this.getRosterOptions("Casual Staff", CASUAL_ROSTER),
    ];

    selectEl.append(...optionsList);

    this.value = optionsList[0].value;
    selectEl.addEventListener("change", (e) => this.value = e.target.value);
  }
}

customElements.define("employee-selector", EmployeeSelector);
