import { escapeHtml, svgIcons } from "./utils";

export const MIN_DROPDOWN_WIDTH = 130;
export const SCROLLBAR_THRESHOLD = 272;
export const SCROLLBAR_WIDTH = 12;
export const MAX_DROPDOWN_HEIGHT = 297;

interface DropdownOption {
  name: string;
  value: string;
}

export class Dropdown {
  private options: DropdownOption[] = [];
  private selectedOption: number = 0;
  private dropdownVisible: boolean = false;
  private showInfo: boolean;
  private changeCallback: { (value: string): void };

  private elem: HTMLElement;
  private currentValueElem: HTMLDivElement;
  private menuElem: HTMLDivElement;
  private optionsElem: HTMLDivElement;
  private noResultsElem: HTMLDivElement;
  private filterInput: HTMLInputElement;

  constructor(
    id: string,
    showInfo: boolean,
    dropdownType: string,
    changeCallback: { (value: string): void }
  ) {
    this.showInfo = showInfo;
    this.changeCallback = changeCallback;
    this.elem = document.getElementById(id)!;

    let filter = document.createElement("div");
    filter.className = "dropdownFilter";
    this.filterInput = document.createElement("input");
    this.filterInput.className = "dropdownFilterInput";
    this.filterInput.placeholder = `Filter ${dropdownType}...`;
    filter.appendChild(this.filterInput);
    this.menuElem = document.createElement("div");
    this.menuElem.className = "dropdownMenu";
    this.menuElem.appendChild(filter);
    this.optionsElem = document.createElement("div");
    this.optionsElem.className = "dropdownOptions";
    this.menuElem.appendChild(this.optionsElem);
    this.noResultsElem = document.createElement("div");
    this.noResultsElem.className = "dropdownNoResults";
    this.noResultsElem.innerHTML = "No results found.";
    this.menuElem.appendChild(this.noResultsElem);
    this.currentValueElem = document.createElement("div");
    this.currentValueElem.className = "dropdownCurrentValue";
    this.elem.appendChild(this.currentValueElem);
    this.elem.appendChild(this.menuElem);

    document.addEventListener(
      "click",
      (e) => {
        if (!e.target) return;
        if (e.target === this.currentValueElem) {
          this.dropdownVisible = !this.dropdownVisible;
          if (this.dropdownVisible) {
            this.filterInput.value = "";
            this.filter();
          }
          this.elem.classList.toggle("dropdownOpen");
          if (this.dropdownVisible) this.filterInput.focus();
        } else if (this.dropdownVisible) {
          if ((<HTMLElement>e.target).closest(".dropdown") !== this.elem) {
            this.close();
          } else {
            let option = <HTMLElement | null>(<HTMLElement>e.target).closest(".dropdownOption");
            if (
              option !== null &&
              option.parentNode === this.optionsElem &&
              option.dataset.id !== undefined
            ) {
              let selectedOption = parseInt(option.dataset.id!);
              this.close();
              if (this.selectedOption !== selectedOption) {
                this.selectedOption = selectedOption;
                this.render();
                this.changeCallback(this.options[this.selectedOption].value);
              }
            }
          }
        }
      },
      true
    );
    document.addEventListener("contextmenu", () => this.close(), true);
    this.filterInput.addEventListener("keyup", () => this.filter());
  }

  public setOptions(options: DropdownOption[], selected: string) {
    this.options = options;
    let selectedOption = 0;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === selected) {
        selectedOption = i;
      }
    }
    this.selectedOption = selectedOption;
    if (options.length <= 1) this.close();
    this.render();
  }

  public refresh() {
    if (this.options.length > 0) this.render();
  }

  private render() {
    this.elem.classList.add("loaded");
    const currentOption = this.options[this.selectedOption];
    this.currentValueElem.innerHTML = escapeHtml(currentOption.name);
    this.currentValueElem.title = currentOption.name;
    let html = "";
    for (let i = 0; i < this.options.length; i++) {
      const selectedClass = this.selectedOption === i ? " selected" : "";
      const infoHtml = this.showInfo
        ? `<div class="dropdownOptionInfo" title="${escapeHtml(this.options[i].value)}">${svgIcons.info}</div>`
        : "";
      html += `<div class="dropdownOption${selectedClass}" data-id="${i}" title="${escapeHtml(this.options[i].name)}">${escapeHtml(this.options[i].name)}${infoHtml}</div>`;
    }
    this.optionsElem.className = `dropdownOptions${this.showInfo ? " showInfo" : ""}`;
    this.optionsElem.innerHTML = html;
    this.filterInput.style.display = "none";
    this.noResultsElem.style.display = "none";
    this.menuElem.style.cssText = "opacity:0; display:block;";
    this.currentValueElem.style.width = `${Math.max(
      this.menuElem.offsetWidth +
        (this.showInfo && this.menuElem.offsetHeight < SCROLLBAR_THRESHOLD ? 0 : SCROLLBAR_WIDTH),
      MIN_DROPDOWN_WIDTH
    )}px`;
    this.menuElem.style.cssText = `right:0; overflow-y:auto; max-height:${MAX_DROPDOWN_HEIGHT}px;`;
    if (this.dropdownVisible) this.filter();
  }

  private filter() {
    let val = this.filterInput.value.toLowerCase(),
      match,
      matches = false;
    for (let i = 0; i < this.options.length; i++) {
      match = this.options[i].name.toLowerCase().includes(val);
      (<HTMLElement>this.optionsElem.children[i]).style.display = match ? "block" : "none";
      if (match) matches = true;
    }
    this.filterInput.style.display = "block";
    this.noResultsElem.style.display = matches ? "none" : "block";
  }

  public isOpen(): boolean {
    return this.dropdownVisible;
  }

  public close() {
    this.elem.classList.remove("dropdownOpen");
    this.dropdownVisible = false;
  }
}
