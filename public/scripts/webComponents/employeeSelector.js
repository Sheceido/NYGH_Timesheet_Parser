import { ROSTER } from "../data/roster.js";
import { capitalize } from "../utils.js";

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

  connectedCallback() {
    /** @type {HTMLOptionElement[]} optionsList */
    const optionsList = [];

    for (const [fullName, employee] of Object.entries(ROSTER)) {
      const option = document.createElement("option");
      option.value = fullName;
      option.textContent = capitalize(employee.str_alias);
      optionsList.push(option);
    }

    const selectEl = this.querySelector("select");
    if (!selectEl) {
      console.error("Unexpected undefined select element when querying 'select' tag");
      return;
    }

    selectEl.append(...optionsList);

    this.value = optionsList[0].value;
    selectEl.addEventListener("change", (e) => this.value = e.target.value);
  }
}

customElements.define("employee-selector", EmployeeSelector);
