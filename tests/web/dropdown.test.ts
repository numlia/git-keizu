/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  Dropdown,
  MAX_DROPDOWN_HEIGHT,
  MIN_DROPDOWN_WIDTH,
  SCROLLBAR_THRESHOLD,
  SCROLLBAR_WIDTH
} from "../../web/dropdown";

function createDropdownElement(id: string): HTMLElement {
  const elem = document.createElement("div");
  elem.id = id;
  elem.className = "dropdown";
  document.body.appendChild(elem);
  return elem;
}

function openDropdown(dropdown: Dropdown, elem: HTMLElement): void {
  const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
  currentValueElem.click();
}

describe("isOpen", () => {
  let dropdown: Dropdown;
  let elem: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    elem = createDropdownElement("testDropdown");
    dropdown = new Dropdown("testDropdown", false, "branches", () => {});
    dropdown.setOptions(
      [
        { name: "main", value: "main" },
        { name: "develop", value: "develop" }
      ],
      "main"
    );
  });

  it("returns false when dropdown is in initial closed state (TC-001)", () => {
    // Given: a newly created dropdown (initial state)
    // When: isOpen() is called
    const result = dropdown.isOpen();
    // Then: it returns false
    expect(result).toBe(false);
  });

  it("returns true after dropdown is opened (TC-002)", () => {
    // Given: a closed dropdown
    // When: the dropdown is opened by clicking the current value element
    openDropdown(dropdown, elem);
    // Then: isOpen() returns true
    expect(dropdown.isOpen()).toBe(true);
  });

  it("returns false after open then close (TC-003)", () => {
    // Given: an opened dropdown
    openDropdown(dropdown, elem);
    expect(dropdown.isOpen()).toBe(true);
    // When: close() is called
    dropdown.close();
    // Then: isOpen() returns false
    expect(dropdown.isOpen()).toBe(false);
  });
});

describe("close", () => {
  let dropdown: Dropdown;
  let elem: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    elem = createDropdownElement("testDropdown");
    dropdown = new Dropdown("testDropdown", false, "branches", () => {});
    dropdown.setOptions(
      [
        { name: "main", value: "main" },
        { name: "develop", value: "develop" }
      ],
      "main"
    );
  });

  it("closes an open dropdown and sets isOpen to false (TC-004)", () => {
    // Given: an opened dropdown
    openDropdown(dropdown, elem);
    expect(dropdown.isOpen()).toBe(true);
    expect(elem.classList.contains("dropdownOpen")).toBe(true);
    // When: close() is called
    dropdown.close();
    // Then: dropdown is closed, CSS class is removed, isOpen() returns false
    expect(dropdown.isOpen()).toBe(false);
    expect(elem.classList.contains("dropdownOpen")).toBe(false);
  });

  it("is idempotent when called on already closed dropdown (TC-005)", () => {
    // Given: a closed dropdown
    expect(dropdown.isOpen()).toBe(false);
    // When: close() is called on an already closed dropdown
    dropdown.close();
    // Then: no error occurs, isOpen() remains false
    expect(dropdown.isOpen()).toBe(false);
    expect(elem.classList.contains("dropdownOpen")).toBe(false);
  });
});

describe("escapeHtml XSS fix", () => {
  let dropdown: Dropdown;
  let elem: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    elem = createDropdownElement("testDropdown");
    dropdown = new Dropdown("testDropdown", false, "branches", () => {});
  });

  it("escapes HTML special characters in selected value display (TC-006)", () => {
    // Given: options containing XSS attempt in the name
    const xssPayload = "<script>alert(1)</script>";
    dropdown.setOptions([{ name: xssPayload, value: "xss" }], "xss");
    // When: the dropdown renders
    const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: innerHTML contains escaped text, not raw HTML tags
    expect(currentValueElem.innerHTML).not.toContain("<script>");
    expect(currentValueElem.innerHTML).toContain("&lt;script&gt;");
  });

  it("displays normal text unchanged (TC-007)", () => {
    // Given: options with plain text name
    dropdown.setOptions([{ name: "main", value: "main" }], "main");
    // When: the dropdown renders
    const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: text is displayed as-is
    expect(currentValueElem.innerHTML).toBe("main");
  });

  it("escapes all HTML entities: &, <, >, quotes (TC-008)", () => {
    // Given: option name containing all HTML special characters
    const specialChars = "&<>\"'";
    dropdown.setOptions([{ name: specialChars, value: "special" }], "special");
    // When: the dropdown renders
    const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: dangerous characters (&, <, >) are escaped in innerHTML
    expect(currentValueElem.innerHTML).toContain("&amp;");
    expect(currentValueElem.innerHTML).toContain("&lt;");
    expect(currentValueElem.innerHTML).toContain("&gt;");
    // Then: textContent round-trips correctly (DOM parsed the escaped values back)
    expect(currentValueElem.textContent).toBe(specialChars);
    // Then: innerHTML differs from the raw input (escaping was applied)
    expect(currentValueElem.innerHTML).not.toBe(specialChars);
  });
});

describe("title attribute", () => {
  let dropdown: Dropdown;
  let elem: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = "";
    elem = createDropdownElement("testDropdown");
    dropdown = new Dropdown("testDropdown", false, "branches", () => {});
  });

  it("sets title attribute on selected value element with raw text (TC-009)", () => {
    // Given: a dropdown with options
    dropdown.setOptions(
      [
        { name: "main", value: "main" },
        { name: "develop", value: "develop" }
      ],
      "main"
    );
    // When: the dropdown renders
    const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: title attribute contains raw (unescaped) option name
    expect(currentValueElem.title).toBe("main");
  });

  it("sets title attribute on each dropdown option div (TC-010)", () => {
    // Given: a dropdown with multiple options
    const options = [
      { name: "main", value: "main" },
      { name: "feature/test", value: "feature/test" }
    ];
    dropdown.setOptions(options, "main");
    // When: the options are rendered
    const optionElems = elem.querySelectorAll(".dropdownOption");
    // Then: each option div has a title attribute with its name
    expect(optionElems.length).toBe(2);
    expect((optionElems[0] as HTMLElement).title).toContain("main");
    expect((optionElems[1] as HTMLElement).title).toContain("feature");
  });

  it("sets full text in title for long option names over 100 chars (TC-011)", () => {
    // Given: an option with a very long name (100+ characters)
    const longName = "a".repeat(150);
    dropdown.setOptions([{ name: longName, value: "long" }], "long");
    // When: the dropdown renders
    const currentValueElem = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: title contains the full untruncated text
    expect(currentValueElem.title).toBe(longName);
    expect(currentValueElem.title.length).toBe(150);
  });
});

describe("magic number constants", () => {
  it("MIN_DROPDOWN_WIDTH equals 130 (TC-012)", () => {
    // Given: the MIN_DROPDOWN_WIDTH constant is exported
    // When: its value is checked
    // Then: it equals 130
    expect(MIN_DROPDOWN_WIDTH).toBe(130);
  });

  it("SCROLLBAR_THRESHOLD equals 272 (TC-013)", () => {
    // Given: the SCROLLBAR_THRESHOLD constant is exported
    // When: its value is checked
    // Then: it equals 272
    expect(SCROLLBAR_THRESHOLD).toBe(272);
  });

  it("SCROLLBAR_WIDTH equals 12 (TC-014)", () => {
    // Given: the SCROLLBAR_WIDTH constant is exported
    // When: its value is checked
    // Then: it equals 12
    expect(SCROLLBAR_WIDTH).toBe(12);
  });

  it("MAX_DROPDOWN_HEIGHT equals 297 (TC-015)", () => {
    // Given: the MAX_DROPDOWN_HEIGHT constant is exported
    // When: its value is checked
    // Then: it equals 297
    expect(MAX_DROPDOWN_HEIGHT).toBe(297);
  });
});

/* ======================================================================
 * S6–S10: Multi-select mode tests (Feature 012 ui-enhancements)
 * ====================================================================== */

const MULTI_SELECT_OPTIONS = [
  { name: "Show All", value: "" },
  { name: "main", value: "main" },
  { name: "develop", value: "develop" },
  { name: "feature-a", value: "feature-a" },
  { name: "feature-b", value: "feature-b" },
  { name: "feature-c", value: "feature-c" }
];

function createMultiDropdown(selected: string[] = []): {
  dropdown: Dropdown;
  elem: HTMLElement;
  callback: ReturnType<typeof vi.fn>;
} {
  const elem = createDropdownElement("multiDropdown");
  const callback = vi.fn();
  const dropdown = new Dropdown("multiDropdown", false, "Branches", callback, true);
  dropdown.setOptions([...MULTI_SELECT_OPTIONS], selected);
  return { dropdown, elem, callback };
}

function clickOption(elem: HTMLElement, index: number): void {
  const options = elem.querySelectorAll(".dropdownOption");
  (options[index] as HTMLElement).click();
}

function clickOutside(): void {
  const outside = document.createElement("div");
  document.body.appendChild(outside);
  outside.click();
}

describe("S6 (superseded by S11): Multi-select mode initialization", () => {
  // @see docs/testing/perspectives/web/dropdown-test.md S11 TC-044 (S6 TC-018 contract replaced)
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("enables multi-select mode with multipleAllowed=true (TC-016)", () => {
    // Given: Dropdown created with multipleAllowed=true
    const { elem } = createMultiDropdown();
    // When: options are rendered
    const listbox = elem.querySelector(".dropdownOptions") as HTMLElement;
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: the listbox is multi-selectable and each option carries a decorative checkbox
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    expect(options.length).toBe(MULTI_SELECT_OPTIONS.length);
    expect(options[0].querySelector(".customCheckbox")).not.toBeNull();
  });

  it("maintains single-select mode with multipleAllowed=false (TC-017)", () => {
    // Given: Dropdown created without multipleAllowed (defaults to false)
    const elem = createDropdownElement("singleDropdown");
    const dropdown = new Dropdown("singleDropdown", false, "Branches", () => {});
    dropdown.setOptions([...MULTI_SELECT_OPTIONS], "");
    // When: options are rendered
    const listbox = elem.querySelector(".dropdownOptions") as HTMLElement;
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: no checkboxes are present and the listbox is not multi-selectable
    expect(listbox.hasAttribute("aria-multiselectable")).toBe(false);
    for (let i = 0; i < options.length; i++) {
      expect(options[i].querySelector(".customCheckbox")).toBeNull();
    }
  });

  it("renders decorative checkboxes without focusable inputs in multi-select mode (TC-018)", () => {
    // Given: Multi-select dropdown with options set
    const { elem } = createMultiDropdown();
    // When: render() was called via setOptions
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: every option has a hidden decorative checkbox and no input element
    for (let i = 0; i < options.length; i++) {
      const decoration = options[i].querySelector(".dropdownCheckbox");
      expect(decoration).not.toBeNull();
      expect(decoration!.getAttribute("aria-hidden")).toBe("true");
      expect(decoration!.querySelector(".customCheckbox")).not.toBeNull();
      expect(options[i].querySelector("input")).toBeNull();
    }
  });

  it("does not render checkboxes in single-select mode (TC-019)", () => {
    // Given: Single-select dropdown
    const elem = createDropdownElement("noCheckbox");
    const dropdown = new Dropdown("noCheckbox", false, "Branches", () => {});
    dropdown.setOptions([...MULTI_SELECT_OPTIONS], "main");
    // When: render() was called via setOptions
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: no option contains a checkbox decoration or input
    for (let i = 0; i < options.length; i++) {
      expect(options[i].querySelector(".dropdownCheckbox")).toBeNull();
      expect(options[i].querySelector("input")).toBeNull();
    }
  });
});

describe("S7: Show All exclusive control", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("clears all individual selections when Show All is clicked (TC-020)", () => {
    // Given: Dropdown with individual options selected
    const { dropdown, elem } = createMultiDropdown(["main", "develop"]);
    openDropdown(dropdown, elem);
    // When: "Show All" (index 0) is clicked
    clickOption(elem, 0);
    // Then: "Show All" is selected, individual options are not
    const options = elem.querySelectorAll(".dropdownOption");
    expect(options[0].classList.contains("selected")).toBe(true);
    expect(options[1].classList.contains("selected")).toBe(false);
    expect(options[2].classList.contains("selected")).toBe(false);
  });

  it("unchecks Show All and toggles individual option on click (TC-021)", () => {
    // Given: Dropdown with "Show All" selected (default)
    const { dropdown, elem } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: Individual option "main" (index 1) is clicked
    clickOption(elem, 1);
    // Then: "Show All" is unchecked, "main" is checked
    const options = elem.querySelectorAll(".dropdownOption");
    expect(options[0].classList.contains("selected")).toBe(false);
    expect(options[1].classList.contains("selected")).toBe(true);
  });

  it("auto-reverts to Show All when all individuals are deselected (TC-022)", () => {
    // Given: Dropdown with one individual option selected
    const { dropdown, elem } = createMultiDropdown(["main"]);
    openDropdown(dropdown, elem);
    // When: The selected option is toggled off
    clickOption(elem, 1);
    // Then: "Show All" is automatically selected
    const options = elem.querySelectorAll(".dropdownOption");
    expect(options[0].classList.contains("selected")).toBe(true);
    expect(options[1].classList.contains("selected")).toBe(false);
  });

  it("switches from Show All to individual on click (TC-023)", () => {
    // Given: Dropdown with "Show All" selected
    const { dropdown, elem } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: "develop" (index 2) is clicked
    clickOption(elem, 2);
    // Then: "Show All" is unchecked, "develop" is checked
    const options = elem.querySelectorAll(".dropdownOption");
    expect(options[0].classList.contains("selected")).toBe(false);
    expect(options[2].classList.contains("selected")).toBe(true);
  });

  it("resets all individual selections when Show All is clicked (TC-024)", () => {
    // Given: Dropdown with multiple individual options selected
    const { dropdown, elem } = createMultiDropdown(["main", "develop", "feature-a"]);
    openDropdown(dropdown, elem);
    // When: "Show All" is clicked
    clickOption(elem, 0);
    // Then: Only "Show All" is selected, all individuals are cleared
    const options = elem.querySelectorAll(".dropdownOption");
    expect(options[0].classList.contains("selected")).toBe(true);
    for (let i = 1; i < options.length; i++) {
      expect(options[i].classList.contains("selected")).toBe(false);
    }
  });
});

describe("S8: Close and callback behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("fires callback with values array when selection changed on close (TC-025)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem, callback } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: "main" is selected and dropdown is closed
    clickOption(elem, 1);
    clickOutside();
    // Then: Callback fires with ["main"]
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(["main"]);
  });

  it("does not fire callback when no selection change on close (TC-026)", () => {
    // Given: Multi-select dropdown opened with "Show All" selected
    const { dropdown, elem, callback } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: No changes made, dropdown is closed
    clickOutside();
    // Then: Callback is not fired
    expect(callback).not.toHaveBeenCalled();
  });

  it("passes empty array when Show All is selected on close (TC-027)", () => {
    // Given: Dropdown with individual selection
    const { dropdown, elem, callback } = createMultiDropdown(["main"]);
    openDropdown(dropdown, elem);
    // When: "Show All" is clicked (clears individual) and dropdown closes
    clickOption(elem, 0);
    clickOutside();
    // Then: Callback fires with empty array
    expect(callback).toHaveBeenCalledWith([]);
  });

  it("passes single-element array for one selected item (TC-028)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem, callback } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: One option selected and dropdown closed
    clickOption(elem, 3);
    clickOutside();
    // Then: Callback fires with ["feature-a"]
    expect(callback).toHaveBeenCalledWith(["feature-a"]);
  });

  it("passes three-element array for three selected items (TC-029)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem, callback } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: Three options selected and dropdown closed
    clickOption(elem, 1);
    clickOption(elem, 2);
    clickOption(elem, 3);
    clickOutside();
    // Then: Callback fires with values sorted by option index
    expect(callback).toHaveBeenCalledWith(["main", "develop", "feature-a"]);
  });

  it("does not fire callback when selection reverted to original (TC-030)", () => {
    // Given: Dropdown with "main" selected
    const { dropdown, elem, callback } = createMultiDropdown(["main"]);
    openDropdown(dropdown, elem);
    // When: Toggle "main" off then back on
    clickOption(elem, 1);
    clickOption(elem, 1);
    clickOutside();
    // Then: No net change, callback is not fired
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("S9: Display label", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows Show All name when Show All is selected (TC-031)", () => {
    // Given: Multi-select dropdown with "Show All" selected (empty array)
    const { elem } = createMultiDropdown();
    // When: Display label is rendered
    const currentValue = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: Label shows "Show All"
    expect(currentValue.textContent).toBe("Show All");
  });

  it("shows option name when one item is selected (TC-032)", () => {
    // Given: Multi-select dropdown with one item selected
    const { elem } = createMultiDropdown(["develop"]);
    // When: Display label is rendered
    const currentValue = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: Label shows the selected option name
    expect(currentValue.textContent).toBe("develop");
  });

  it("shows count when two items are selected (TC-033)", () => {
    // Given: Multi-select dropdown with two items selected
    const { elem } = createMultiDropdown(["main", "develop"]);
    // When: Display label is rendered
    const currentValue = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: Label shows count
    expect(currentValue.textContent).toBe("2 selected");
  });

  it("shows count when five items are selected (TC-034)", () => {
    // Given: Multi-select dropdown with all five individual items selected
    const { elem } = createMultiDropdown([
      "main",
      "develop",
      "feature-a",
      "feature-b",
      "feature-c"
    ]);
    // When: Display label is rendered
    const currentValue = elem.querySelector(".dropdownCurrentValue") as HTMLElement;
    // Then: Label shows count
    expect(currentValue.textContent).toBe("5 selected");
  });
});

describe("S10: Event handling", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("does not close dropdown on option click in multi-select (TC-035)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem } = createMultiDropdown();
    openDropdown(dropdown, elem);
    expect(dropdown.isOpen()).toBe(true);
    // When: An option is clicked
    clickOption(elem, 1);
    // Then: Dropdown remains open
    expect(dropdown.isOpen()).toBe(true);
  });

  it("closes dropdown on option click in single-select (TC-036)", () => {
    // Given: Single-select dropdown opened
    const elem = createDropdownElement("singleSelect");
    const dropdown = new Dropdown("singleSelect", false, "Branches", () => {});
    dropdown.setOptions([...MULTI_SELECT_OPTIONS], "");
    openDropdown(dropdown, elem);
    expect(dropdown.isOpen()).toBe(true);
    // When: An option is clicked
    clickOption(elem, 1);
    // Then: Dropdown closes
    expect(dropdown.isOpen()).toBe(false);
  });

  it("filters options by text input in multi-select mode (TC-037)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: Filter text "feature" is entered
    const filterInput = elem.querySelector(".dropdownFilterInput") as HTMLInputElement;
    filterInput.value = "feature";
    filterInput.dispatchEvent(new Event("keyup"));
    // Then: Only matching options are visible
    const options = elem.querySelectorAll(".dropdownOption");
    expect((options[0] as HTMLElement).style.display).toBe("none");
    expect((options[1] as HTMLElement).style.display).toBe("none");
    expect((options[2] as HTMLElement).style.display).toBe("none");
    expect((options[3] as HTMLElement).style.display).toBe("block");
    expect((options[4] as HTMLElement).style.display).toBe("block");
    expect((options[5] as HTMLElement).style.display).toBe("block");
  });

  it("shows no results when filter matches nothing in multi-select (TC-038)", () => {
    // Given: Multi-select dropdown opened
    const { dropdown, elem } = createMultiDropdown();
    openDropdown(dropdown, elem);
    // When: Filter text that matches nothing is entered
    const filterInput = elem.querySelector(".dropdownFilterInput") as HTMLInputElement;
    filterInput.value = "zzzzzzz";
    filterInput.dispatchEvent(new Event("keyup"));
    // Then: All options are hidden
    const options = elem.querySelectorAll(".dropdownOption");
    for (let i = 0; i < options.length; i++) {
      expect((options[i] as HTMLElement).style.display).toBe("none");
    }
    // And: "No results found" message is displayed
    const noResults = elem.querySelector(".dropdownNoResults") as HTMLElement;
    expect(noResults.style.display).toBe("block");
  });
});

/* ======================================================================
 * S11–S12: Keyboard navigation, apply / cancel and input guards
 * (Feature 061-05 keyboard accessibility)
 * @see docs/testing/perspectives/web/dropdown-test.md
 * ====================================================================== */

const KEYBOARD_OPTIONS = [
  { name: "Show All", value: "" },
  { name: "feature", value: "feature" },
  { name: "hotfix", value: "hotfix" },
  { name: "main", value: "main" }
];
const SINGLE_OPTIONS = [
  { name: "/a", value: "/a" },
  { name: "/b", value: "/b" }
];

interface KeyboardFixture {
  dropdown: Dropdown;
  elem: HTMLElement;
  trigger: HTMLButtonElement;
  input: HTMLInputElement;
  callback: ReturnType<typeof vi.fn>;
}

function createKeyboardFixture(selected: string[] = []): KeyboardFixture {
  document.body.innerHTML = '<button id="refreshBtn">refresh</button>';
  const elem = createDropdownElement("branchSelect");
  const callback = vi.fn();
  const dropdown = new Dropdown("branchSelect", false, "Branches", callback, true);
  dropdown.setOptions([...KEYBOARD_OPTIONS], selected);
  return {
    dropdown,
    elem,
    trigger: elem.querySelector(".dropdownCurrentValue") as HTMLButtonElement,
    input: elem.querySelector(".dropdownFilterInput") as HTMLInputElement,
    callback
  };
}

function createSingleFixture(selected = "/a"): KeyboardFixture {
  document.body.innerHTML = '<button id="refreshBtn">refresh</button>';
  const elem = createDropdownElement("repoSelect");
  const callback = vi.fn();
  const dropdown = new Dropdown("repoSelect", false, "Repos", callback);
  dropdown.setOptions([...SINGLE_OPTIONS], selected);
  return {
    dropdown,
    elem,
    trigger: elem.querySelector(".dropdownCurrentValue") as HTMLButtonElement,
    input: elem.querySelector(".dropdownFilterInput") as HTMLInputElement,
    callback
  };
}

function keyEvent(type: string, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init });
}

// keydown on the target, keyup on whichever element holds focus afterwards (as a browser does).
function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const down = keyEvent("keydown", key, init);
  target.dispatchEvent(down);
  const upTarget = document.activeElement === document.body ? target : document.activeElement!;
  upTarget.dispatchEvent(keyEvent("keyup", key, init));
  return down;
}

function typeFilter(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(keyEvent("keyup", text.slice(-1)));
}

function optionNamed(elem: HTMLElement, name: string): HTMLElement {
  const option = [...elem.querySelectorAll<HTMLElement>(".dropdownOption")].find(
    (candidate) => candidate.textContent === name
  );
  expect(option).toBeDefined();
  return option!;
}

function selectedNames(elem: HTMLElement): string[] {
  return [...elem.querySelectorAll<HTMLElement>('.dropdownOption[aria-selected="true"]')].map(
    (option) => option.textContent ?? ""
  );
}

function openByKey(fixture: KeyboardFixture): void {
  fixture.trigger.focus();
  press(fixture.trigger, "Enter");
}

describe("S11: Trigger button, option movement, internal Tab order and re-resolution", () => {
  it("opens from the trigger with Enter, Space and ArrowDown and focuses the filter (TC-039)", () => {
    // Case: TC-039
    for (const key of ["Enter", " ", "ArrowDown"]) {
      const { elem, trigger, input, dropdown } = createKeyboardFixture();
      trigger.focus();
      const down = press(trigger, key);
      expect(elem.classList.contains("dropdownOpen")).toBe(true);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(document.activeElement).toBe(input);
      expect(down.defaultPrevented).toBe(true);
      expect(dropdown.isOpen()).toBe(true);
    }
    const { elem, trigger } = createKeyboardFixture();
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.type).toBe("button");
    expect(trigger.getAttribute("aria-label")).toContain("Branches");
    const menu = elem.querySelector(".dropdownMenu") as HTMLElement;
    expect(menu.id).toBe("branchSelectMenu");
    expect(trigger.getAttribute("aria-controls")).toBe(menu.id);
  });

  it("treats typed characters and Space in the filter as search text (TC-040)", () => {
    // Case: TC-040
    const fixture = createKeyboardFixture(["hotfix"]);
    openByKey(fixture);
    const before = selectedNames(fixture.elem);
    typeFilter(fixture.input, "fe");
    const space = press(fixture.input, " ");
    fixture.input.value = "fe ";
    fixture.input.dispatchEvent(keyEvent("keyup", " "));
    expect(space.defaultPrevented).toBe(false);
    expect(fixture.input.value).toBe("fe ");
    expect(selectedNames(fixture.elem)).toEqual(before);
    expect(fixture.callback).not.toHaveBeenCalled();
    expect(optionNamed(fixture.elem, "hotfix").style.display).toBe("none");
  });

  it("moves from the filter to the first visible option with ArrowDown and the last with ArrowUp (TC-041)", () => {
    // Case: TC-041
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    typeFilter(fixture.input, "f");
    const down = press(fixture.input, "ArrowDown");
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "feature"));
    fixture.input.focus();
    press(fixture.input, "ArrowUp");
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "hotfix"));
  });

  it("stops at the ends of the visible options and skips hidden ones (TC-042)", () => {
    // Case: TC-042
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    typeFilter(fixture.input, "f");
    press(fixture.input, "ArrowDown");
    const feature = optionNamed(fixture.elem, "feature");
    press(feature, "ArrowUp");
    expect(document.activeElement).toBe(feature);
    press(feature, "ArrowDown");
    const hotfix = optionNamed(fixture.elem, "hotfix");
    expect(document.activeElement).toBe(hotfix);
    press(hotfix, "ArrowDown");
    expect(document.activeElement).toBe(hotfix);
  });

  it("moves to the first and last visible option with Home and End (TC-043)", () => {
    // Case: TC-043
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    const showAll = optionNamed(fixture.elem, "Show All");
    press(showAll, "End");
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "main"));
    press(optionNamed(fixture.elem, "main"), "Home");
    expect(document.activeElement).toBe(showAll);
  });

  it("renders listbox / option roles with aria-selected and no focusable inputs (TC-044)", () => {
    // Case: TC-044
    const multi = createKeyboardFixture(["hotfix"]);
    const listbox = multi.elem.querySelector(".dropdownOptions") as HTMLElement;
    expect(listbox.getAttribute("role")).toBe("listbox");
    expect(listbox.getAttribute("aria-multiselectable")).toBe("true");
    const options = [...multi.elem.querySelectorAll<HTMLElement>(".dropdownOption")];
    expect(options.every((option) => option.getAttribute("role") === "option")).toBe(true);
    expect(selectedNames(multi.elem)).toEqual(["hotfix"]);
    expect(multi.elem.querySelectorAll("input").length).toBe(1);
    const single = createSingleFixture("/b");
    const singleListbox = single.elem.querySelector(".dropdownOptions") as HTMLElement;
    expect(singleListbox.getAttribute("role")).toBe("listbox");
    expect(singleListbox.hasAttribute("aria-multiselectable")).toBe(false);
    expect(selectedNames(single.elem)).toEqual(["/b"]);
  });

  it("keeps exactly one option tab stop: first selected on entry, previous option on re-entry (TC-045)", () => {
    // Case: TC-045
    const withSelection = createKeyboardFixture(["hotfix"]);
    openByKey(withSelection);
    const stops = () =>
      [...withSelection.elem.querySelectorAll<HTMLElement>('.dropdownOption[tabindex="0"]')].map(
        (option) => option.textContent
      );
    expect(stops()).toEqual(["hotfix"]);
    press(withSelection.input, "Tab");
    expect(document.activeElement).toBe(optionNamed(withSelection.elem, "hotfix"));
    press(optionNamed(withSelection.elem, "hotfix"), "ArrowDown");
    press(optionNamed(withSelection.elem, "main"), "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(withSelection.input);
    expect(stops()).toEqual(["main"]);
    press(withSelection.input, "Tab");
    expect(document.activeElement).toBe(optionNamed(withSelection.elem, "main"));

    const noSelection = createKeyboardFixture();
    openByKey(noSelection);
    const noSelectionStops = noSelection.elem.querySelectorAll('.dropdownOption[tabindex="0"]');
    expect(noSelectionStops.length).toBe(1);
    expect(noSelectionStops[0].textContent).toBe("Show All");
  });

  it("keeps the filter focused and open when no option matches (TC-046)", () => {
    // Case: TC-046
    const fixture = createSingleFixture();
    openByKey(fixture);
    typeFilter(fixture.input, "zzz");
    press(fixture.input, "ArrowDown");
    expect(document.activeElement).toBe(fixture.input);
    press(fixture.input, "Enter");
    expect(document.activeElement).toBe(fixture.input);
    expect(fixture.input.value).toBe("zzz");
    expect(fixture.dropdown.isOpen()).toBe(true);
    const noResults = fixture.elem.querySelector(".dropdownNoResults") as HTMLElement;
    expect(noResults.style.display).toBe("block");
    expect(noResults.getAttribute("role")).toBe("status");
    expect(fixture.callback).not.toHaveBeenCalled();
  });

  it("disables the trigger with zero options and never opens (TC-047)", () => {
    // Case: TC-047
    const fixture = createKeyboardFixture();
    fixture.dropdown.setOptions([], []);
    expect(fixture.trigger.disabled).toBe(true);
    expect(fixture.trigger.textContent).toBe("Branches");
    fixture.trigger.click();
    press(fixture.trigger, "Enter");
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(false);
    expect(fixture.dropdown.isOpen()).toBe(false);
  });

  it("closes and restores the trigger when an open dropdown receives one option or fewer (TC-048)", () => {
    // Case: TC-048
    const fixture = createKeyboardFixture(["hotfix"]);
    openByKey(fixture);
    fixture.dropdown.setOptions([KEYBOARD_OPTIONS[0]], []);
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(false);
    expect(document.activeElement).toBe(fixture.trigger);
    expect(fixture.callback).not.toHaveBeenCalled();
    const single = createSingleFixture();
    openByKey(single);
    expect(() => single.dropdown.setOptions([], "")).not.toThrow();
    expect(single.trigger.textContent).toBe("Repos");
    expect(single.dropdown.isOpen()).toBe(false);
  });

  it("follows the internal Tab order filter → option → apply → cancel (TC-049)", () => {
    // Case: TC-049
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    const buttons = fixture.elem.querySelectorAll<HTMLButtonElement>(".dropdownHintBtn");
    expect(buttons.length).toBe(2);
    expect(buttons[0].type).toBe("button");
    press(fixture.input, "Tab");
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "Show All"));
    press(document.activeElement!, "Tab");
    expect(document.activeElement).toBe(buttons[0]);
    press(buttons[0], "Tab");
    expect(document.activeElement).toBe(buttons[1]);
    press(buttons[1], "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(buttons[0]);
    const single = createSingleFixture();
    openByKey(single);
    expect(single.elem.querySelectorAll(".dropdownHintBtn").length).toBe(0);
    press(single.input, "Tab");
    expect(document.activeElement).toBe(optionNamed(single.elem, "/a"));
    press(optionNamed(single.elem, "/a"), "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(single.input);
  });

  it("applies multi-select and discards single-select when Tab leaves, without stealing focus (TC-050)", () => {
    // Case: TC-050
    const multi = createKeyboardFixture();
    openByKey(multi);
    press(multi.input, "ArrowDown");
    press(optionNamed(multi.elem, "Show All"), "ArrowDown");
    press(optionNamed(multi.elem, "feature"), " ");
    const cancel = multi.elem.querySelectorAll<HTMLButtonElement>(".dropdownHintBtn")[1];
    cancel.focus();
    const tab = press(cancel, "Tab");
    expect(tab.defaultPrevented).toBe(false);
    expect(multi.dropdown.isOpen()).toBe(false);
    expect(multi.callback).toHaveBeenCalledTimes(1);
    expect(multi.callback).toHaveBeenCalledWith(["feature"]);
    expect(document.activeElement).not.toBe(multi.trigger);

    const single = createSingleFixture();
    openByKey(single);
    press(single.input, "ArrowDown");
    press(optionNamed(single.elem, "/a"), "ArrowDown");
    press(optionNamed(single.elem, "/b"), "Tab");
    expect(single.dropdown.isOpen()).toBe(false);
    expect(single.callback).not.toHaveBeenCalled();
    expect(single.trigger.textContent).toBe("/a");
    expect(document.activeElement).not.toBe(single.trigger);
  });

  it("applies on outside click and leaves focus with the click target (TC-051)", () => {
    // Case: TC-051
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "Show All"), "End");
    press(optionNamed(fixture.elem, "main"), " ");
    const refresh = document.getElementById("refreshBtn") as HTMLButtonElement;
    refresh.focus();
    refresh.click();
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.callback).toHaveBeenCalledWith(["main"]);
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(false);
    expect(document.activeElement).toBe(refresh);
  });

  it("closes from the trigger with click or Enter and keeps focus on it (TC-052)", () => {
    // Case: TC-052
    const multi = createKeyboardFixture();
    openByKey(multi);
    press(multi.input, "ArrowDown");
    press(optionNamed(multi.elem, "Show All"), "ArrowDown");
    press(optionNamed(multi.elem, "feature"), " ");
    multi.trigger.click();
    expect(multi.callback).toHaveBeenCalledTimes(1);
    expect(multi.trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(multi.trigger);

    const single = createSingleFixture();
    openByKey(single);
    press(single.input, "ArrowDown");
    press(optionNamed(single.elem, "/a"), "ArrowDown");
    single.trigger.focus();
    press(single.trigger, "Enter");
    expect(single.dropdown.isOpen()).toBe(false);
    expect(single.callback).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(single.trigger);
  });
});

describe("S12: Apply / cancel, input guards and the close / cancelAndClose contract", () => {
  it("applies a toggled option once with Enter and returns to the trigger (TC-053)", () => {
    // Case: TC-053
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    typeFilter(fixture.input, "hot");
    press(fixture.input, "ArrowDown");
    const hotfix = optionNamed(fixture.elem, "hotfix");
    expect(document.activeElement).toBe(hotfix);
    press(hotfix, " ");
    expect(optionNamed(fixture.elem, "hotfix").getAttribute("aria-selected")).toBe("true");
    expect(fixture.callback).not.toHaveBeenCalled();
    press(optionNamed(fixture.elem, "hotfix"), "Enter");
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.callback).toHaveBeenCalledWith(["hotfix"]);
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(false);
    expect(document.activeElement).toBe(fixture.trigger);
  });

  it("cancels to the selection at open on Escape keydown without reaching document listeners (TC-054)", () => {
    // Case: TC-054
    const fixture = createKeyboardFixture(["feature"]);
    const bubbleListener = vi.fn();
    document.addEventListener("keydown", bubbleListener);
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), "ArrowDown");
    press(optionNamed(fixture.elem, "hotfix"), " ");
    expect(selectedNames(fixture.elem)).toEqual(["feature", "hotfix"]);
    bubbleListener.mockClear();
    const down = keyEvent("keydown", "Escape");
    optionNamed(fixture.elem, "hotfix").dispatchEvent(down);
    expect(selectedNames(fixture.elem)).toEqual(["feature"]);
    expect(fixture.callback).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(fixture.trigger);
    expect(down.defaultPrevented).toBe(true);
    expect(bubbleListener).not.toHaveBeenCalled();
    fixture.trigger.dispatchEvent(keyEvent("keyup", "Escape"));
    expect(fixture.dropdown.isOpen()).toBe(false);
    expect(fixture.callback).not.toHaveBeenCalled();
    document.removeEventListener("keydown", bubbleListener);
  });

  it("does not cancel on an Escape keyup alone (TC-055)", () => {
    // Case: TC-055
    const fixture = createKeyboardFixture(["feature"]);
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), "ArrowDown");
    press(optionNamed(fixture.elem, "hotfix"), " ");
    optionNamed(fixture.elem, "hotfix").dispatchEvent(keyEvent("keyup", "Escape"));
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(true);
    expect(selectedNames(fixture.elem)).toEqual(["feature", "hotfix"]);
    expect(fixture.callback).not.toHaveBeenCalled();
  });

  it("uses the selection received by setOptions as the new cancel baseline (TC-056)", () => {
    // Case: TC-056
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowUp");
    press(optionNamed(fixture.elem, "main"), " ");
    expect(selectedNames(fixture.elem)).toEqual(["main"]);
    fixture.dropdown.setOptions(KEYBOARD_OPTIONS.slice(0, 3), ["feature"]);
    press(fixture.input, "Escape");
    expect(fixture.dropdown.isOpen()).toBe(false);
    expect(selectedNames(fixture.elem)).toEqual(["feature"]);
    expect(fixture.elem.querySelectorAll(".dropdownOption").length).toBe(3);
    expect(fixture.callback).not.toHaveBeenCalled();
  });

  it("confirms a single-select option with Enter or Space (TC-057)", () => {
    // Case: TC-057
    for (const key of ["Enter", " "]) {
      const fixture = createSingleFixture();
      openByKey(fixture);
      press(fixture.input, "ArrowUp");
      const target = optionNamed(fixture.elem, "/b");
      expect(document.activeElement).toBe(target);
      press(target, key);
      expect(fixture.callback).toHaveBeenCalledTimes(1);
      expect(fixture.callback).toHaveBeenCalledWith("/b");
      expect(fixture.elem.classList.contains("dropdownOpen")).toBe(false);
      expect(fixture.trigger.textContent).toBe("/b");
      expect(document.activeElement).toBe(fixture.trigger);
    }
  });

  it("confirms the first visible option on filter Enter and stays open with no match (TC-058)", () => {
    // Case: TC-058
    const fixture = createSingleFixture();
    openByKey(fixture);
    typeFilter(fixture.input, "b");
    press(fixture.input, "Enter");
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.callback).toHaveBeenCalledWith("/b");
    expect(fixture.dropdown.isOpen()).toBe(false);
    const empty = createSingleFixture();
    openByKey(empty);
    typeFilter(empty.input, "zzz");
    press(empty.input, "Enter");
    expect(empty.callback).not.toHaveBeenCalled();
    expect(empty.elem.classList.contains("dropdownOpen")).toBe(true);
    expect(empty.input.value).toBe("zzz");
  });

  it("applies multi-select on filter Enter (TC-059)", () => {
    // Case: TC-059
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), "ArrowDown");
    press(optionNamed(fixture.elem, "hotfix"), " ");
    fixture.input.focus();
    press(fixture.input, "Enter");
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.callback).toHaveBeenCalledWith(["hotfix"]);
    expect(fixture.dropdown.isOpen()).toBe(false);
    expect(document.activeElement).toBe(fixture.trigger);
  });

  it("keeps the Show All exclusivity under keyboard toggles (TC-060)", () => {
    // Case: TC-060
    const fixture = createKeyboardFixture(["feature", "hotfix"]);
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), "Home");
    press(optionNamed(fixture.elem, "Show All"), " ");
    expect(selectedNames(fixture.elem)).toEqual(["Show All"]);
    press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), " ");
    expect(selectedNames(fixture.elem)).toEqual(["feature"]);
  });

  it("does not apply on an Enter that belongs to IME composition (TC-061)", () => {
    // Case: TC-061
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), "ArrowDown");
    press(optionNamed(fixture.elem, "hotfix"), " ");
    fixture.input.focus();
    fixture.input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    fixture.input.dispatchEvent(keyEvent("keydown", "Enter", { isComposing: true }));
    fixture.input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    fixture.input.dispatchEvent(keyEvent("keyup", "Enter"));
    expect(fixture.elem.classList.contains("dropdownOpen")).toBe(true);
    expect(fixture.callback).not.toHaveBeenCalled();
  });

  it("applies once when Enter repeats (TC-062)", () => {
    // Case: TC-062
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
    const feature = optionNamed(fixture.elem, "feature");
    press(feature, " ");
    optionNamed(fixture.elem, "feature").dispatchEvent(keyEvent("keydown", "Enter"));
    document.activeElement!.dispatchEvent(keyEvent("keydown", "Enter", { repeat: true }));
    document.activeElement!.dispatchEvent(keyEvent("keydown", "Enter", { repeat: true }));
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.dropdown.isOpen()).toBe(false);
  });

  it("does not toggle or apply twice on keyup (TC-063)", () => {
    // Case: TC-063
    const fixture = createKeyboardFixture();
    openByKey(fixture);
    press(fixture.input, "ArrowDown");
    press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
    press(optionNamed(fixture.elem, "feature"), " ");
    expect(selectedNames(fixture.elem)).toEqual(["feature"]);
    press(optionNamed(fixture.elem, "feature"), "Enter");
    expect(fixture.callback).toHaveBeenCalledTimes(1);
    expect(fixture.callback).toHaveBeenCalledWith(["feature"]);
  });

  it("distinguishes close (apply) from cancelAndClose (cancel) and only moves focus with a reason (TC-064)", () => {
    // Case: TC-064
    const refresh = () => document.getElementById("refreshBtn") as HTMLButtonElement;
    const toggleFeature = (fixture: KeyboardFixture) => {
      openByKey(fixture);
      press(fixture.input, "ArrowDown");
      press(optionNamed(fixture.elem, "Show All"), "ArrowDown");
      press(optionNamed(fixture.elem, "feature"), " ");
      refresh().focus();
    };
    const applied = createKeyboardFixture();
    toggleFeature(applied);
    applied.dropdown.close("keyboard");
    expect(applied.callback).toHaveBeenCalledTimes(1);
    expect(applied.callback).toHaveBeenCalledWith(["feature"]);
    expect(document.activeElement).toBe(applied.trigger);

    const cancelled = createKeyboardFixture();
    toggleFeature(cancelled);
    cancelled.dropdown.cancelAndClose("keyboard");
    expect(cancelled.callback).not.toHaveBeenCalled();
    expect(selectedNames(cancelled.elem)).toEqual(["Show All"]);
    expect(document.activeElement).toBe(cancelled.trigger);

    const legacyClose = createKeyboardFixture();
    toggleFeature(legacyClose);
    legacyClose.dropdown.close();
    expect(legacyClose.callback).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(refresh());

    const legacyCancel = createKeyboardFixture();
    toggleFeature(legacyCancel);
    legacyCancel.dropdown.cancelAndClose();
    expect(legacyCancel.callback).not.toHaveBeenCalled();
    expect(selectedNames(legacyCancel.elem)).toEqual(["Show All"]);
    expect(document.activeElement).toBe(refresh());
  });

  it("does not change the selection by moving focus between options (TC-065)", () => {
    // Case: TC-065
    const fixture = createKeyboardFixture(["hotfix"]);
    openByKey(fixture);
    press(fixture.input, "Tab");
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "hotfix"));
    press(optionNamed(fixture.elem, "hotfix"), "ArrowDown");
    expect(document.activeElement).toBe(optionNamed(fixture.elem, "main"));
    expect(selectedNames(fixture.elem)).toEqual(["hotfix"]);
    press(optionNamed(fixture.elem, "main"), "Escape");
    expect(selectedNames(fixture.elem)).toEqual(["hotfix"]);
    expect(fixture.callback).not.toHaveBeenCalled();
  });

  it("leaves document Enter / Escape untouched while closed (TC-066)", () => {
    // Case: TC-066
    const fixture = createKeyboardFixture();
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    const enter = keyEvent("keydown", "Enter");
    other.dispatchEvent(enter);
    const escape = keyEvent("keydown", "Escape");
    document.dispatchEvent(escape);
    expect(enter.defaultPrevented).toBe(false);
    expect(escape.defaultPrevented).toBe(false);
    expect(fixture.callback).not.toHaveBeenCalled();
    expect(fixture.dropdown.isOpen()).toBe(false);
  });
});
