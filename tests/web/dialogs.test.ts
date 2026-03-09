// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/utils", () => ({
  escapeHtml: vi.fn((s: string) => s),
  refInvalid: /[\s~^:?*[\]\\]/,
  svgIcons: { alert: "<svg></svg>", loading: "<svg></svg>", info: '<svg class="infoIcon"></svg>' }
}));

import { escapeHtml } from "../../web/utils";

let showFormDialog: typeof import("../../web/dialogs").showFormDialog;
let hideDialog: typeof import("../../web/dialogs").hideDialog;
let dialogEl: HTMLDivElement;

beforeAll(async () => {
  // Given: dialog and dialogBacking DOM elements exist before module loads
  dialogEl = document.createElement("div");
  dialogEl.id = "dialog";
  document.body.appendChild(dialogEl);

  const dialogBackingEl = document.createElement("div");
  dialogBackingEl.id = "dialogBacking";
  document.body.appendChild(dialogBackingEl);

  const mod = await import("../../web/dialogs");
  showFormDialog = mod.showFormDialog;
  hideDialog = mod.hideDialog;
});

afterEach(() => {
  hideDialog();
});

function createTextRefInput(defaultValue: string): DialogTextRefInput {
  return { type: "text-ref", name: "", default: defaultValue };
}

function createTextInput(name: string, defaultValue = ""): DialogTextInput {
  return { type: "text", name, default: defaultValue, placeholder: null };
}

function createCheckboxInput(name: string): DialogCheckboxInput {
  return { type: "checkbox", name, value: false };
}

describe("showFormDialog focus priority", () => {
  it("focuses text-ref input when both text-ref and text inputs exist (TC-001)", () => {
    // Given: inputs with text-ref (index 0) and text (index 1)
    const inputs: DialogInput[] = [createTextRefInput("main"), createTextInput("Message")];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: text-ref input (dialogInput0) is focused
    const textRefElem = document.getElementById("dialogInput0");
    expect(document.activeElement).toBe(textRefElem);
  });

  it("focuses first text input when no text-ref input exists (TC-002)", () => {
    // Given: inputs with only a text field (like Stash dialog)
    const inputs: DialogInput[] = [createTextInput("Message")];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: first text input (dialogInput0) is focused
    const textElem = document.getElementById("dialogInput0");
    expect(document.activeElement).toBe(textElem);
  });

  it("does not error when no focusable input exists (TC-003)", () => {
    // Given: inputs with only a checkbox (no text/text-ref)
    const inputs: DialogInput[] = [createCheckboxInput("Option")];

    // When: showFormDialog is called
    // Then: no error is thrown
    expect(() => {
      showFormDialog("Test", inputs, "OK", vi.fn(), null);
    }).not.toThrow();

    // And: no input element is focused (activeElement stays on body or dialog)
    const checkboxElem = document.getElementById("dialogInput0");
    expect(document.activeElement).not.toBe(checkboxElem);
  });

  it("focuses the first text input when multiple text inputs exist (TC-004)", () => {
    // Given: multiple text inputs
    const inputs: DialogInput[] = [createTextInput("First"), createTextInput("Second")];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: first text input (dialogInput0) is focused, not the second
    const firstElem = document.getElementById("dialogInput0");
    const secondElem = document.getElementById("dialogInput1");
    expect(document.activeElement).toBe(firstElem);
    expect(document.activeElement).not.toBe(secondElem);
  });
});

describe("showFormDialog Enter key handling", () => {
  let actioned: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    actioned = vi.fn();
  });

  it("triggers action button click on Enter key in valid state (TC-005)", () => {
    // Given: a form dialog with a text input in valid state
    const inputs: DialogInput[] = [createTextInput("Name", "test-value")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // When: Enter key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    inputElem.dispatchEvent(event);

    // Then: actioned callback is invoked with the input value
    expect(actioned).toHaveBeenCalledTimes(1);
    expect(actioned).toHaveBeenCalledWith(["test-value"]);
  });

  it("calls preventDefault on Enter key press (TC-006)", () => {
    // Given: a form dialog with a text input
    const inputs: DialogInput[] = [createTextInput("Name", "value")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // When: Enter key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true
    });
    inputElem.dispatchEvent(event);

    // Then: event.preventDefault() was called
    expect(event.defaultPrevented).toBe(true);
  });

  it("does not trigger action when dialog has noInput class (TC-007)", () => {
    // Given: a form dialog with noInput state (empty text-ref input)
    const inputs: DialogInput[] = [createTextRefInput("")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // Verify precondition: dialog has noInput class
    expect(dialogEl.className).toBe("active noInput");

    // When: Enter key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    inputElem.dispatchEvent(event);

    // Then: actioned callback is NOT invoked
    expect(actioned).not.toHaveBeenCalled();
  });

  it("does not trigger action when dialog has inputInvalid class (TC-008)", () => {
    // Given: a form dialog with a text-ref input that has a valid default
    const inputs: DialogInput[] = [createTextRefInput("valid-name")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // Simulate invalid state by setting className directly
    dialogEl.className = "active inputInvalid";

    // When: Enter key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    inputElem.dispatchEvent(event);

    // Then: actioned callback is NOT invoked
    expect(actioned).not.toHaveBeenCalled();
  });

  it("does not trigger action on Escape key (TC-009)", () => {
    // Given: a form dialog with a text input in valid state
    const inputs: DialogInput[] = [createTextInput("Name", "value")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // When: Escape key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    inputElem.dispatchEvent(event);

    // Then: actioned callback is NOT invoked
    expect(actioned).not.toHaveBeenCalled();
  });

  it("does not trigger action on Tab key (TC-010)", () => {
    // Given: a form dialog with a text input in valid state
    const inputs: DialogInput[] = [createTextInput("Name", "value")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // When: Tab key is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
    inputElem.dispatchEvent(event);

    // Then: actioned callback is NOT invoked
    expect(actioned).not.toHaveBeenCalled();
  });

  it("triggers action on Shift+Enter in valid state (TC-011)", () => {
    // Given: a form dialog with a text input in valid state
    const inputs: DialogInput[] = [createTextInput("Name", "value")];
    showFormDialog("Test", inputs, "OK", actioned, null);

    // When: Shift+Enter is pressed on the input
    const inputElem = document.getElementById("dialogInput0")!;
    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      shiftKey: true,
      bubbles: true
    });
    inputElem.dispatchEvent(event);

    // Then: actioned callback IS invoked (handler only checks e.key, not modifiers)
    expect(actioned).toHaveBeenCalledTimes(1);
  });
});

describe("showFormDialog info tooltip rendering", () => {
  it("renders info icon with title when info property is set (TC-012)", () => {
    // Given: a single checkbox with info property
    const inputs: DialogInput[] = [
      { type: "checkbox", name: "Test Option", value: false, info: "Explanation text" }
    ];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: info icon is rendered with title attribute
    const infoSpan = dialogEl.querySelector(".dialogInfo");
    expect(infoSpan).not.toBeNull();
    expect(infoSpan!.getAttribute("title")).toBe("Explanation text");
    expect(infoSpan!.innerHTML).toContain("svg");
  });

  it("does not render info icon when info property is not set (TC-013)", () => {
    // Given: a single checkbox without info property
    const inputs: DialogInput[] = [{ type: "checkbox", name: "Test Option", value: false }];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: no info icon is rendered
    const infoSpan = dialogEl.querySelector(".dialogInfo");
    expect(infoSpan).toBeNull();
  });

  it("escapes HTML special characters in info text (TC-014)", () => {
    // Given: a checkbox with info containing HTML special characters
    const specialChars = "<script>&\"'";
    const escapedText = "&lt;script&gt;&amp;&quot;&#x27;";
    vi.mocked(escapeHtml).mockClear();
    vi.mocked(escapeHtml).mockReturnValueOnce(escapedText);
    const inputs: DialogInput[] = [
      { type: "checkbox", name: "Test", value: false, info: specialChars }
    ];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: escapeHtml is called with the special characters to prevent XSS
    expect(escapeHtml).toHaveBeenCalledWith(specialChars);

    // And: the title attribute contains the full original text decoded from escaped entities
    // (without escaping, the " would break the attribute and truncate the value)
    const infoSpan = dialogEl.querySelector(".dialogInfo");
    expect(infoSpan).not.toBeNull();
    expect(infoSpan!.getAttribute("title")).toBe(specialChars);
  });

  it("places info icon in the name column for multi form layout (TC-015)", () => {
    // Given: a multi-element form with text + checkbox with info
    const inputs: DialogInput[] = [
      { type: "text", name: "Branch", default: "", placeholder: null },
      { type: "checkbox", name: "Option", value: false, info: "Help text" }
    ];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: the table has "multi" class (multi-element form)
    const table = dialogEl.querySelector("table.dialogForm");
    expect(table!.classList.contains("multi")).toBe(true);

    // And: info icon is in the name column (last td of checkbox row)
    const rows = dialogEl.querySelectorAll("tr");
    const checkboxRow = rows[1];
    const lastTd = checkboxRow.querySelectorAll("td");
    const nameCell = lastTd[lastTd.length - 1];
    expect(nameCell.textContent).toContain("Option");
    const infoSpan = nameCell.querySelector(".dialogInfo");
    expect(infoSpan).not.toBeNull();
    expect(infoSpan!.getAttribute("title")).toBe("Help text");
  });

  it("places info icon after label for single form layout (TC-016)", () => {
    // Given: a single checkbox with info
    const inputs: DialogInput[] = [
      { type: "checkbox", name: "Option", value: false, info: "Help text" }
    ];

    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: the table has "single" class
    const table = dialogEl.querySelector("table.dialogForm");
    expect(table!.classList.contains("single")).toBe(true);

    // And: info icon is inside the dialogFormCheckbox span, after the label
    const checkboxSpan = dialogEl.querySelector(".dialogFormCheckbox");
    const infoSpan = checkboxSpan!.querySelector(".dialogInfo");
    expect(infoSpan).not.toBeNull();
    expect(infoSpan!.getAttribute("title")).toBe("Help text");
  });
});
