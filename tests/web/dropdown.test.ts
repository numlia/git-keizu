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

describe("S6: Multi-select mode initialization", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("enables multi-select mode with multipleAllowed=true (TC-016)", () => {
    // Given: Dropdown created with multipleAllowed=true
    const { elem } = createMultiDropdown();
    // When: options are rendered
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: checkboxes are present in each option
    expect(options.length).toBe(MULTI_SELECT_OPTIONS.length);
    expect(options[0].querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it("maintains single-select mode with multipleAllowed=false (TC-017)", () => {
    // Given: Dropdown created without multipleAllowed (defaults to false)
    const elem = createDropdownElement("singleDropdown");
    const dropdown = new Dropdown("singleDropdown", false, "Branches", () => {});
    dropdown.setOptions([...MULTI_SELECT_OPTIONS], "");
    // When: options are rendered
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: no checkboxes are present
    for (let i = 0; i < options.length; i++) {
      expect(options[i].querySelector('input[type="checkbox"]')).toBeNull();
    }
  });

  it("renders checkbox elements for each option in multi-select mode (TC-018)", () => {
    // Given: Multi-select dropdown with options set
    const { elem } = createMultiDropdown();
    // When: render() was called via setOptions
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: every option contains a checkbox input and customCheckbox span
    for (let i = 0; i < options.length; i++) {
      const checkbox = options[i].querySelector('input[type="checkbox"]');
      const customCheckbox = options[i].querySelector(".customCheckbox");
      expect(checkbox).not.toBeNull();
      expect(customCheckbox).not.toBeNull();
    }
  });

  it("does not render checkboxes in single-select mode (TC-019)", () => {
    // Given: Single-select dropdown
    const elem = createDropdownElement("noCheckbox");
    const dropdown = new Dropdown("noCheckbox", false, "Branches", () => {});
    dropdown.setOptions([...MULTI_SELECT_OPTIONS], "main");
    // When: render() was called via setOptions
    const options = elem.querySelectorAll(".dropdownOption");
    // Then: no option contains a checkbox
    for (let i = 0; i < options.length; i++) {
      expect(options[i].querySelector('input[type="checkbox"]')).toBeNull();
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
