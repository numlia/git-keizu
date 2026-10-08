import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  isKeyboardActionBlocked,
  markFocusTarget,
  restoreFocus
} from "./keyboardNavigation";
import { escapeHtml, svgIcons } from "./utils";

export const MIN_DROPDOWN_WIDTH = 130;
export const SCROLLBAR_THRESHOLD = 272;
export const SCROLLBAR_WIDTH = 12;
export const MAX_DROPDOWN_HEIGHT = 297;

const SHOW_ALL_OPTION_INDEX = 0;
const MENU_ID_SUFFIX = "Menu";

const KEY_ENTER = "Enter";
const KEY_SPACE = " ";
const KEY_ESCAPE = "Escape";
const KEY_TAB = "Tab";
const KEY_ARROW_DOWN = "ArrowDown";
const KEY_ARROW_UP = "ArrowUp";
const KEY_HOME = "Home";
const KEY_END = "End";

const ATTR_ARIA_EXPANDED = "aria-expanded";
const ATTR_ARIA_SELECTED = "aria-selected";
const ATTR_TRUE = "true";
const ATTR_FALSE = "false";
const CLASS_OPEN = "dropdownOpen";
const OPTION_SELECTOR = ".dropdownOption";
const DISPLAY_NONE = "none";
const REASON_KEYBOARD: FocusCloseReason = "keyboard";
const REASON_OUTSIDE: FocusCloseReason = "outside";
const REASON_TAB: FocusCloseReason = "tab";

interface DropdownOption {
  name: string;
  value: string;
}

export class Dropdown {
  private options: DropdownOption[] = [];
  private selectedOption: number = 0;
  private selectedIndices: Set<number> = new Set();
  private selectionOnOpen: Set<number> = new Set();
  // The option that is the listbox tab stop; kept by value so re-renders resolve it again.
  private focusedValue: string | null = null;
  private focusOrigin: FocusOrigin | null = null;
  private dropdownVisible: boolean = false;
  private showInfo: boolean;
  private multipleAllowed: boolean;
  private label: string;
  private changeCallback: ((value: string) => void) | ((values: string[]) => void);

  private elem: HTMLElement;
  private currentValueElem: HTMLButtonElement;
  private menuElem: HTMLDivElement;
  private scrollWrapperElem: HTMLDivElement | null = null;
  private optionsElem: HTMLDivElement;
  private noResultsElem: HTMLDivElement;
  private filterInput: HTMLInputElement;
  private applyBtn: HTMLButtonElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;

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
    this.label = dropdownType;
    this.changeCallback = changeCallback;
    this.elem = document.getElementById(id)!;

    let filter = document.createElement("div");
    filter.className = "dropdownFilter";
    this.filterInput = document.createElement("input");
    this.filterInput.className = "dropdownFilterInput";
    this.filterInput.placeholder = t("dropdown.filter", dropdownType);
    filter.appendChild(this.filterInput);
    this.menuElem = document.createElement("div");
    this.menuElem.id = `${id}${MENU_ID_SUFFIX}`;
    this.menuElem.className = this.multipleAllowed
      ? "dropdownMenu dropdownMenuMulti"
      : "dropdownMenu";
    this.optionsElem = document.createElement("div");
    this.optionsElem.className = "dropdownOptions";
    this.optionsElem.setAttribute("role", "listbox");
    this.optionsElem.setAttribute("aria-label", dropdownType);
    if (this.multipleAllowed) this.optionsElem.setAttribute("aria-multiselectable", ATTR_TRUE);
    this.noResultsElem = document.createElement("div");
    this.noResultsElem.className = "dropdownNoResults";
    this.noResultsElem.setAttribute("role", "status");
    this.noResultsElem.innerHTML = t("dropdown.noResults");
    if (this.multipleAllowed) {
      this.scrollWrapperElem = document.createElement("div");
      this.scrollWrapperElem.className = "dropdownScrollWrapper";
      this.scrollWrapperElem.appendChild(filter);
      this.scrollWrapperElem.appendChild(this.optionsElem);
      this.scrollWrapperElem.appendChild(this.noResultsElem);
      this.menuElem.appendChild(this.scrollWrapperElem);
      const hintElem = document.createElement("div");
      hintElem.className = "dropdownHint";
      this.applyBtn = this.createHintButton(KEY_ENTER, t("dropdown.apply"));
      this.applyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.close(REASON_KEYBOARD);
      });
      this.cancelBtn = this.createHintButton("Esc", t("dropdown.cancel"));
      this.cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.cancelAndClose(REASON_KEYBOARD);
      });
      hintElem.appendChild(this.applyBtn);
      hintElem.appendChild(this.cancelBtn);
      this.menuElem.appendChild(hintElem);
    } else {
      this.menuElem.appendChild(filter);
      this.menuElem.appendChild(this.optionsElem);
      this.menuElem.appendChild(this.noResultsElem);
    }
    this.currentValueElem = document.createElement("button");
    this.currentValueElem.type = "button";
    this.currentValueElem.className = "dropdownCurrentValue";
    this.currentValueElem.setAttribute("aria-haspopup", "listbox");
    this.currentValueElem.setAttribute(ATTR_ARIA_EXPANDED, ATTR_FALSE);
    this.currentValueElem.setAttribute("aria-controls", this.menuElem.id);
    this.currentValueElem.disabled = true;
    markFocusTarget(this.currentValueElem, { kind: "control", id });
    this.elem.appendChild(this.currentValueElem);
    this.elem.appendChild(this.menuElem);

    this.currentValueElem.addEventListener("click", () => this.toggleFromTrigger());
    this.optionsElem.addEventListener("click", (e) => {
      const index = this.optionIndexOf(e.target);
      if (index === null || !this.dropdownVisible) return;
      if (this.multipleAllowed) {
        this.focusedValue = this.options[index].value;
        this.toggleMultiSelectOption(index);
      } else {
        this.confirmSingleOption(index);
      }
    });
    this.elem.addEventListener("keydown", (e) => this.handleKeydown(e));
    document.addEventListener(
      "click",
      (e) => {
        if (!e.target || !this.dropdownVisible) return;
        if ((<HTMLElement>e.target).closest(".dropdown") !== this.elem) {
          this.leave(REASON_OUTSIDE);
        }
      },
      true
    );
    document.addEventListener("contextmenu", () => this.close(), true);
    this.filterInput.addEventListener("keyup", () => this.filter());
  }

  private createHintButton(keyHint: string, name: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dropdownHintBtn";
    button.setAttribute("aria-label", name);
    button.innerHTML = `<span class="dropdownHintKey" aria-hidden="true">${keyHint}</span> ${name}`;
    return button;
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

  private confirmSingleOption(index: number) {
    if (this.options[index] === undefined) return;
    this.close(REASON_KEYBOARD);
    if (this.selectedOption !== index) {
      this.selectedOption = index;
      this.render();
      (this.changeCallback as (value: string) => void)(this.options[this.selectedOption].value);
    }
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
    this.currentValueElem.disabled = options.length === 0;
    if (options.length <= 1) {
      // Only a close triggered while the user is inside the menu returns focus to the trigger.
      const focusInside = this.dropdownVisible && this.elem.contains(document.activeElement);
      this.close(focusInside ? REASON_KEYBOARD : undefined);
    }
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
    this.currentValueElem.setAttribute(
      "aria-label",
      this.options.length === 0 ? this.label : `${this.label}: ${label.name}`
    );
    let html = "";
    for (let i = 0; i < this.options.length; i++) {
      const isSelected = this.multipleAllowed
        ? i === SHOW_ALL_OPTION_INDEX
          ? this.selectedIndices.size === 0
          : this.selectedIndices.has(i)
        : this.selectedOption === i;
      const selectedClass = isSelected ? " selected" : "";
      const infoHtml = this.showInfo
        ? `<div class="dropdownOptionInfo" aria-hidden="true" title="${escapeHtml(this.options[i].value)}">${svgIcons.info}</div>`
        : "";
      const checkboxHtml = this.multipleAllowed
        ? `<span class="dropdownCheckbox" aria-hidden="true"><span class="customCheckbox"></span></span>`
        : "";
      html += `<div class="dropdownOption${selectedClass}" role="option" aria-selected="${isSelected ? ATTR_TRUE : ATTR_FALSE}" tabindex="-1" data-id="${i}" title="${escapeHtml(this.options[i].name)}">${checkboxHtml}${escapeHtml(this.options[i].name)}${infoHtml}</div>`;
    }
    const focusWasInOptions = this.optionsElem.contains(document.activeElement);
    this.optionsElem.className = `dropdownOptions${this.showInfo ? " showInfo" : ""}`;
    this.optionsElem.innerHTML = html;
    this.filterInput.style.display = DISPLAY_NONE;
    this.noResultsElem.style.display = DISPLAY_NONE;
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
    if (this.dropdownVisible) {
      this.filter();
      // The re-render replaced the focused option; moving focus back is not a leave.
      if (focusWasInOptions) this.focusOption(this.focusedOptionElement());
    }
  }

  private getDisplayLabel(): { name: string; title: string } {
    if (this.options.length === 0) {
      return { name: this.label, title: this.label };
    }
    if (!this.multipleAllowed) {
      const opt = this.options[this.selectedOption] ?? this.options[0];
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
    return { name: t("dropdown.selected", this.selectedIndices.size), title: names.join(", ") };
  }

  private filter() {
    let val = this.filterInput.value.toLowerCase(),
      match,
      matches = false;
    for (let i = 0; i < this.options.length; i++) {
      match = this.options[i].name.toLowerCase().includes(val);
      (<HTMLElement>this.optionsElem.children[i]).style.display = match ? "block" : DISPLAY_NONE;
      if (match) matches = true;
    }
    this.filterInput.style.display = "block";
    this.noResultsElem.style.display = matches ? DISPLAY_NONE : "block";
    this.resolveFocusedOption();
  }

  /* Option focus resolution */

  private optionElements(): HTMLElement[] {
    return Array.from(this.optionsElem.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement
    );
  }

  private visibleOptionElements(): HTMLElement[] {
    return this.optionElements().filter((option) => option.style.display !== DISPLAY_NONE);
  }

  private optionIndexOf(target: EventTarget | null): number | null {
    if (!(target instanceof Element)) return null;
    const option = target.closest<HTMLElement>(OPTION_SELECTOR);
    if (option === null || option.parentNode !== this.optionsElem) return null;
    const index = Number.parseInt(option.dataset.id ?? "", 10);
    return Number.isNaN(index) || this.options[index] === undefined ? null : index;
  }

  private optionValueOf(option: HTMLElement): string | null {
    const index = this.optionIndexOf(option);
    return index === null ? null : this.options[index].value;
  }

  // Visible option keeping the focused value, else the first selected visible, else the first.
  private resolveFocusedOption(): void {
    const visible = this.visibleOptionElements();
    const resolved =
      visible.find((option) => this.optionValueOf(option) === this.focusedValue) ??
      visible.find((option) => option.getAttribute(ATTR_ARIA_SELECTED) === ATTR_TRUE) ??
      visible[0] ??
      null;
    this.focusedValue = resolved === null ? null : this.optionValueOf(resolved);
    for (const option of this.optionElements()) {
      option.tabIndex = option === resolved ? 0 : -1;
    }
  }

  private focusedOptionElement(): HTMLElement | null {
    return (
      this.visibleOptionElements().find(
        (option) => this.optionValueOf(option) === this.focusedValue
      ) ?? null
    );
  }

  private focusOption(option: HTMLElement | null): void {
    if (option === null) return;
    this.focusedValue = this.optionValueOf(option);
    for (const other of this.optionElements()) {
      other.tabIndex = other === option ? 0 : -1;
    }
    option.focus();
  }

  /* Keyboard handling */

  private handleKeydown(e: KeyboardEvent): void {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target === this.currentValueElem) {
      this.handleTriggerKeydown(e);
      return;
    }
    if (!this.dropdownVisible || isKeyboardActionBlocked(e)) return;
    if (e.key === KEY_TAB) {
      this.handleTab(e, target);
    } else if (e.key === KEY_ESCAPE) {
      this.consume(e);
      this.cancelAndClose(REASON_KEYBOARD);
    } else if (target === this.filterInput) {
      this.handleFilterKeydown(e);
    } else if (this.optionIndexOf(target) !== null) {
      this.handleOptionKeydown(e, target);
    }
  }

  private handleTriggerKeydown(e: KeyboardEvent): void {
    if (e.key === KEY_TAB) {
      if (this.dropdownVisible) this.leave(REASON_TAB);
      return;
    }
    if (e.key === KEY_ESCAPE) {
      if (!this.dropdownVisible || isKeyboardActionBlocked(e)) return;
      this.consume(e);
      this.cancelAndClose(REASON_KEYBOARD);
      return;
    }
    if (e.key !== KEY_ENTER && e.key !== KEY_SPACE && e.key !== KEY_ARROW_DOWN) return;
    // preventDefault also suppresses the button's own click, so the toggle runs once.
    this.consume(e);
    if (isKeyboardActionBlocked(e)) return;
    if (!this.dropdownVisible) {
      this.open();
    } else if (e.key === KEY_ARROW_DOWN) {
      this.filterInput.focus();
    } else {
      this.leave(REASON_KEYBOARD);
    }
  }

  private handleFilterKeydown(e: KeyboardEvent): void {
    const visible = this.visibleOptionElements();
    if (e.key === KEY_ARROW_DOWN || e.key === KEY_ARROW_UP) {
      this.consume(e);
      this.focusOption(e.key === KEY_ARROW_DOWN ? (visible[0] ?? null) : this.lastOf(visible));
    } else if (e.key === KEY_ENTER) {
      this.consume(e);
      if (this.multipleAllowed) {
        this.close(REASON_KEYBOARD);
      } else {
        const first = visible.length > 0 ? this.optionIndexOf(visible[0]) : null;
        if (first !== null) this.confirmSingleOption(first);
      }
    }
  }

  private handleOptionKeydown(e: KeyboardEvent, option: HTMLElement): void {
    const visible = this.visibleOptionElements();
    const position = visible.indexOf(option);
    switch (e.key) {
      case KEY_ARROW_DOWN:
        this.consume(e);
        this.focusOption(position < visible.length - 1 ? visible[position + 1] : null);
        break;
      case KEY_ARROW_UP:
        this.consume(e);
        this.focusOption(position > 0 ? visible[position - 1] : null);
        break;
      case KEY_HOME:
        this.consume(e);
        this.focusOption(visible[0] ?? null);
        break;
      case KEY_END:
        this.consume(e);
        this.focusOption(this.lastOf(visible));
        break;
      case KEY_ENTER:
      case KEY_SPACE:
        this.consume(e);
        this.activateOption(option, e.key);
        break;
    }
  }

  private activateOption(option: HTMLElement, key: string): void {
    const index = this.optionIndexOf(option);
    if (index === null) return;
    if (!this.multipleAllowed) {
      this.confirmSingleOption(index);
    } else if (key === KEY_SPACE) {
      this.focusedValue = this.options[index].value;
      this.toggleMultiSelectOption(index);
    } else {
      this.close(REASON_KEYBOARD);
    }
  }

  // Internal order: filter input → the listbox tab stop → apply → cancel. Past either end the
  // component closes and the native Tab continues from the (now hidden) element.
  private handleTab(e: KeyboardEvent, target: HTMLElement): void {
    const option = this.focusedOptionElement();
    const stops: HTMLElement[] = [
      this.filterInput,
      ...(option === null ? [] : [option]),
      ...(this.applyBtn === null || this.cancelBtn === null ? [] : [this.applyBtn, this.cancelBtn])
    ];
    const anchor = this.optionIndexOf(target) === null ? target : option;
    const index = anchor === null ? -1 : stops.indexOf(anchor);
    const next = index === -1 ? -1 : index + (e.shiftKey ? -1 : 1);
    if (next >= 0 && next < stops.length) {
      this.consume(e);
      stops[next].focus();
      return;
    }
    this.leave(REASON_TAB);
  }

  private lastOf(elements: readonly HTMLElement[]): HTMLElement | null {
    return elements.length > 0 ? elements[elements.length - 1] : null;
  }

  private consume(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  /* Open / close */

  private toggleFromTrigger(): void {
    if (this.dropdownVisible) {
      this.leave(REASON_KEYBOARD);
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.options.length === 0) return;
    this.focusOrigin = captureFocusOrigin(this.currentValueElem);
    this.dropdownVisible = true;
    this.filterInput.value = "";
    this.focusedValue = null;
    this.filter();
    if (this.multipleAllowed) {
      this.selectionOnOpen = new Set(this.selectedIndices);
    }
    this.elem.classList.add(CLASS_OPEN);
    this.currentValueElem.setAttribute(ATTR_ARIA_EXPANDED, ATTR_TRUE);
    this.filterInput.focus();
  }

  // Leaving without an explicit apply / cancel: multi-select applies, single-select discards.
  private leave(reason: FocusCloseReason): void {
    if (this.multipleAllowed) {
      this.close(reason);
    } else {
      this.cancelAndClose(reason);
    }
  }

  public isOpen(): boolean {
    return this.dropdownVisible;
  }

  /** Applies the current selection and closes. Without `reason` focus is left where it is. */
  public close(reason?: FocusCloseReason) {
    if (this.dropdownVisible && this.multipleAllowed) {
      this.fireMultiSelectCallbackIfChanged();
    }
    this.hideMenu(reason);
  }

  /** Reverts to the selection received at open / last `setOptions` and closes. */
  public cancelAndClose(reason?: FocusCloseReason) {
    if (this.dropdownVisible && this.multipleAllowed) {
      this.selectedIndices = new Set(this.selectionOnOpen);
      this.render();
    }
    this.hideMenu(reason);
  }

  private hideMenu(reason: FocusCloseReason | undefined): void {
    const wasOpen = this.dropdownVisible;
    this.elem.classList.remove(CLASS_OPEN);
    this.dropdownVisible = false;
    this.currentValueElem.setAttribute(ATTR_ARIA_EXPANDED, ATTR_FALSE);
    if (wasOpen && reason === REASON_KEYBOARD && !restoreFocus(this.focusOrigin, reason)) {
      this.currentValueElem.focus();
    }
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
