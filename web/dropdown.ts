import { escapeHtml, svgIcons } from "./utils";

export const MIN_DROPDOWN_WIDTH = 130;
export const SCROLLBAR_THRESHOLD = 272;
export const SCROLLBAR_WIDTH = 12;
export const MAX_DROPDOWN_HEIGHT = 297;

const SHOW_ALL_OPTION_INDEX = 0;

interface DropdownOption {
  name: string;
  value: string;
}

export class Dropdown {
  private options: DropdownOption[] = [];
  private selectedOption: number = 0;
  private selectedIndices: Set<number> = new Set();
  private selectionOnOpen: Set<number> = new Set();
  private dropdownVisible: boolean = false;
  private showInfo: boolean;
  private multipleAllowed: boolean;
  private changeCallback: ((value: string) => void) | ((values: string[]) => void);

  private elem: HTMLElement;
  private currentValueElem: HTMLDivElement;
  private menuElem: HTMLDivElement;
  private scrollWrapperElem: HTMLDivElement | null = null;
  private optionsElem: HTMLDivElement;
  private noResultsElem: HTMLDivElement;
  private filterInput: HTMLInputElement;

  constructor(
    id: string,
    showInfo: boolean,
    dropdownType: string,
    changeCallback: (value: string) => void
  );
  constructor(
    id: string,
    showInfo: boolean,
    dropdownType: string,
    changeCallback: (values: string[]) => void,
    multipleAllowed: true
  );
  constructor(
    id: string,
    showInfo: boolean,
    dropdownType: string,
    changeCallback: ((value: string) => void) | ((values: string[]) => void),
    multipleAllowed?: boolean
  ) {
    this.showInfo = showInfo;
    this.multipleAllowed = multipleAllowed ?? false;
    this.changeCallback = changeCallback;
    this.elem = document.getElementById(id)!;

    let filter = document.createElement("div");
    filter.className = "dropdownFilter";
    this.filterInput = document.createElement("input");
    this.filterInput.className = "dropdownFilterInput";
    this.filterInput.placeholder = `Filter ${dropdownType}...`;
    filter.appendChild(this.filterInput);
    this.menuElem = document.createElement("div");
    this.menuElem.className = this.multipleAllowed
      ? "dropdownMenu dropdownMenuMulti"
      : "dropdownMenu";
    this.optionsElem = document.createElement("div");
    this.optionsElem.className = "dropdownOptions";
    this.noResultsElem = document.createElement("div");
    this.noResultsElem.className = "dropdownNoResults";
    this.noResultsElem.innerHTML = "No results found.";
    if (this.multipleAllowed) {
      this.scrollWrapperElem = document.createElement("div");
      this.scrollWrapperElem.className = "dropdownScrollWrapper";
      this.scrollWrapperElem.appendChild(filter);
      this.scrollWrapperElem.appendChild(this.optionsElem);
      this.scrollWrapperElem.appendChild(this.noResultsElem);
      this.menuElem.appendChild(this.scrollWrapperElem);
      const hintElem = document.createElement("div");
      hintElem.className = "dropdownHint";
      const applyBtn = document.createElement("span");
      applyBtn.className = "dropdownHintBtn";
      applyBtn.innerHTML = `<span class="dropdownHintKey">Enter</span> Apply`;
      applyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close();
      });
      const cancelBtn = document.createElement("span");
      cancelBtn.className = "dropdownHintBtn";
      cancelBtn.innerHTML = `<span class="dropdownHintKey">Esc</span> Cancel`;
      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.cancelAndClose();
      });
      hintElem.appendChild(applyBtn);
      hintElem.appendChild(cancelBtn);
      this.menuElem.appendChild(hintElem);
    } else {
      this.menuElem.appendChild(filter);
      this.menuElem.appendChild(this.optionsElem);
      this.menuElem.appendChild(this.noResultsElem);
    }
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
            if (this.multipleAllowed) {
              this.selectionOnOpen = new Set(this.selectedIndices);
            }
          } else if (this.multipleAllowed) {
            this.fireMultiSelectCallbackIfChanged();
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
              let optionIndex = parseInt(option.dataset.id!);
              if (this.multipleAllowed) {
                e.stopPropagation();
                e.preventDefault();
                this.toggleMultiSelectOption(optionIndex);
              } else {
                this.close();
                if (this.selectedOption !== optionIndex) {
                  this.selectedOption = optionIndex;
                  this.render();
                  (this.changeCallback as (value: string) => void)(
                    this.options[this.selectedOption].value
                  );
                }
              }
            }
          }
        }
      },
      true
    );
    document.addEventListener("contextmenu", () => this.close(), true);
    if (this.multipleAllowed) {
      document.addEventListener(
        "keydown",
        (e) => {
          if (!this.dropdownVisible) return;
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            this.close();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            this.cancelAndClose();
          }
        },
        true
      );
    }
    this.filterInput.addEventListener("keyup", () => this.filter());
  }

  private toggleMultiSelectOption(index: number) {
    if (index === SHOW_ALL_OPTION_INDEX) {
      this.selectedIndices.clear();
    } else if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index);
    } else {
      this.selectedIndices.add(index);
    }
    this.render();
  }

  public setOptions(options: DropdownOption[], selected: string): void;
  public setOptions(options: DropdownOption[], selected: string[]): void;
  public setOptions(options: DropdownOption[], selected: string | string[]): void {
    this.options = options;
    if (this.multipleAllowed) {
      this.selectedIndices = new Set();
      const selectedArr = Array.isArray(selected) ? selected : selected ? [selected] : [];
      for (let i = 1; i < options.length; i++) {
        if (selectedArr.includes(options[i].value)) {
          this.selectedIndices.add(i);
        }
      }
      if (this.dropdownVisible) {
        this.selectionOnOpen = new Set(this.selectedIndices);
      }
    } else {
      let selectedOption = 0;
      const selectedStr = Array.isArray(selected) ? (selected[0] ?? "") : selected;
      for (let i = 0; i < options.length; i++) {
        if (options[i].value === selectedStr) {
          selectedOption = i;
        }
      }
      this.selectedOption = selectedOption;
    }
    if (options.length <= 1) this.close();
    this.render();
  }

  public refresh() {
    if (this.options.length > 0) this.render();
  }

  private render() {
    this.elem.classList.add("loaded");
    const label = this.getDisplayLabel();
    this.currentValueElem.innerHTML = escapeHtml(label.name);
    this.currentValueElem.title = label.title;
    let html = "";
    for (let i = 0; i < this.options.length; i++) {
      const isSelected = this.multipleAllowed
        ? i === SHOW_ALL_OPTION_INDEX
          ? this.selectedIndices.size === 0
          : this.selectedIndices.has(i)
        : this.selectedOption === i;
      const selectedClass = isSelected ? " selected" : "";
      const infoHtml = this.showInfo
        ? `<div class="dropdownOptionInfo" title="${escapeHtml(this.options[i].value)}">${svgIcons.info}</div>`
        : "";
      const checkboxHtml = this.multipleAllowed
        ? `<label class="dropdownCheckbox"><input type="checkbox"${isSelected ? " checked" : ""}/><span class="customCheckbox"></span></label>`
        : "";
      html += `<div class="dropdownOption${selectedClass}" data-id="${i}" title="${escapeHtml(this.options[i].name)}">${checkboxHtml}${escapeHtml(this.options[i].name)}${infoHtml}</div>`;
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
    if (this.multipleAllowed) {
      this.menuElem.style.cssText = `right:0; max-height:${MAX_DROPDOWN_HEIGHT}px;`;
    } else {
      this.menuElem.style.cssText = `right:0; overflow-y:auto; max-height:${MAX_DROPDOWN_HEIGHT}px;`;
    }
    if (this.dropdownVisible) this.filter();
  }

  private getDisplayLabel(): { name: string; title: string } {
    if (!this.multipleAllowed) {
      const opt = this.options[this.selectedOption];
      return { name: opt.name, title: opt.name };
    }
    if (this.selectedIndices.size === 0) {
      const opt = this.options[SHOW_ALL_OPTION_INDEX];
      return { name: opt.name, title: opt.name };
    }
    if (this.selectedIndices.size === 1) {
      const idx = [...this.selectedIndices][0];
      return { name: this.options[idx].name, title: this.options[idx].name };
    }
    const names = [...this.selectedIndices].sort((a, b) => a - b).map((i) => this.options[i].name);
    return { name: `${this.selectedIndices.size} selected`, title: names.join(", ") };
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
    if (this.dropdownVisible && this.multipleAllowed) {
      this.fireMultiSelectCallbackIfChanged();
    }
    this.elem.classList.remove("dropdownOpen");
    this.dropdownVisible = false;
  }

  private cancelAndClose() {
    if (this.dropdownVisible && this.multipleAllowed) {
      this.selectedIndices = new Set(this.selectionOnOpen);
      this.render();
    }
    this.elem.classList.remove("dropdownOpen");
    this.dropdownVisible = false;
  }

  private fireMultiSelectCallbackIfChanged() {
    if (!this.setsEqual(this.selectedIndices, this.selectionOnOpen)) {
      const values = [...this.selectedIndices]
        .sort((a, b) => a - b)
        .map((i) => this.options[i].value);
      (this.changeCallback as (values: string[]) => void)(values);
    }
  }

  private setsEqual(a: Set<number>, b: Set<number>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
