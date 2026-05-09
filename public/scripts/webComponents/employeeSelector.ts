import type { Roster } from "../types.js";
import { ROSTER, CASUAL_ROSTER } from "../data/roster.js";
import { capitalizeArray } from "../utils.js";

/**
 * Custom HTML element that provides a dropdown `<select>` for choosing an employee.
 * The dropdown groups full‑time and casual staff with disabled header options.
 */
export class EmployeeSelector extends HTMLElement {
  /** The currently selected value (full employee name). */
  private value: string;

  constructor() {
    super();
    // Initial static HTML – the select box will be populated in connectedCallback
    this.innerHTML = `
            <div class="select-wrapper">
                <select></select>
            </div>
        `;
    this.value = "";
  }

  /**
   * Returns the currently selected employee full name.
   * (Note: we keep the property name `value` for consistency with native form elements,
   *  rather than renaming to `data` which is used for complex datasets in other components.)
   */
  get selected(): string {
    return this.value;
  }

  /**
   * Creates a disabled `<option>` element, optionally selected.
   * @param textContent - The visible text of the option.
   * @param selected - Whether the option should be selected.
   * @returns The configured `<option>` element.
   */
  private createDisabledOption(textContent: string, selected: boolean): HTMLOptionElement {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.value = "";
    opt.textContent = textContent;
    opt.selected = selected;
    return opt;
  }

  /**
   * Generates an array of `<option>` elements for a given roster section.
   * @param header - The disabled header text (e.g., "Full Time Staff").
   * @param roster - The roster object (full_name → Employee).
   * @returns Array of `HTMLOptionElement` starting with a disabled header.
   */
  private getRosterOptions(header: string, roster: Roster): HTMLOptionElement[] {
    const optionsList: HTMLOptionElement[] = [];
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

  /**
   * Lifecycle callback – runs when the element is added to the DOM.
   * Populates the `<select>` with grouped options and sets up the change listener.
   */
  connectedCallback(): void {
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

    this.value = optionsList[0].value; // This is "" because the placeholder has value=""
    selectEl.addEventListener("change", (e: Event) => {
      this.value = (e.target as HTMLSelectElement).value;
    });
  }
}

customElements.define("employee-selector", EmployeeSelector);
