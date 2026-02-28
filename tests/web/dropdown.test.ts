/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";

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
