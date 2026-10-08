// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../web/utils", () => ({
  escapeHtml: vi.fn((s: string) => s),
  refInvalid: /[\s~^:?*[\]\\]/,
  svgIcons: { alert: "<svg></svg>", loading: "<svg></svg>", info: '<svg class="infoIcon"></svg>' }
}));

import type { ErrorDialogExplanation } from "../../web/dialogs";
import { escapeHtml } from "../../web/utils";

let showFormDialog: typeof import("../../web/dialogs").showFormDialog;
let showErrorDialog: typeof import("../../web/dialogs").showErrorDialog;
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
  showErrorDialog = mod.showErrorDialog;
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

  // S1 TC-003 ("no focus without text inputs") is superseded by S9 TC-047.
  // @see docs/testing/perspectives/web/dialogs-test.md
  it.each([
    {
      kind: "checkbox",
      inputs: [createCheckboxInput("Option")] as DialogInput[]
    },
    {
      kind: "select",
      inputs: [
        { type: "select", name: "", default: "a", options: [{ name: "A", value: "a" }] }
      ] as DialogInput[]
    }
  ])("focuses the first $kind input when no text input exists (TC-047)", ({ inputs }) => {
    // Case: TC-047
    // Given: a form whose only input is a checkbox / select
    // When: showFormDialog is called
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: that input holds the real focus
    expect(document.activeElement).toBe(document.getElementById("dialogInput0"));
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

describe("showFormDialog DialogInput plain text escaping (S4)", () => {
  function realEscape(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  beforeEach(() => {
    vi.mocked(escapeHtml).mockImplementation(realEscape);
  });

  afterEach(() => {
    vi.mocked(escapeHtml).mockImplementation((s: string) => s);
  });

  // Case: TC-017
  it("escapes input.name in multi form label cells (TC-017)", () => {
    // Given: a multi form whose label contains an HTML injection payload
    const hostile = "<img src=x onerror=alert(1)>";
    const inputs: DialogInput[] = [
      { type: "text", name: hostile, default: "", placeholder: null },
      { type: "text", name: "other", default: "", placeholder: null }
    ];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: no <img> element is inserted; label text equals the original string
    expect(dialogEl.querySelector("img")).toBeNull();
    const firstLabel = dialogEl.querySelectorAll("table.dialogForm td")[0];
    expect(firstLabel.textContent).toBe(hostile);
  });

  // Case: TC-018
  it("escapes text input default and placeholder so attributes are not broken (TC-018)", () => {
    // Given: text input whose default and placeholder both contain attribute-breaking payloads
    const hostileDefault = '" autofocus oninput="alert(1)';
    const hostilePlaceholder = "</input><script>alert(2)</script>";
    const inputs: DialogInput[] = [
      { type: "text", name: "Name", default: hostileDefault, placeholder: hostilePlaceholder }
    ];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: the input keeps the literal default and placeholder, with no extra script element
    const inputEl = document.getElementById("dialogInput0") as HTMLInputElement;
    expect(inputEl).not.toBeNull();
    expect(inputEl.value).toBe(hostileDefault);
    expect(inputEl.getAttribute("placeholder")).toBe(hostilePlaceholder);
    expect(inputEl.hasAttribute("autofocus")).toBe(false);
    expect(inputEl.hasAttribute("oninput")).toBe(false);
    expect(dialogEl.querySelector("script")).toBeNull();
  });

  // Case: TC-019
  it("escapes select option name and value (TC-019)", () => {
    // Given: a select option whose value and display name both contain HTML special chars
    const hostileValue = '1"';
    const hostileName = "<b>boom</b>";
    const inputs: DialogInput[] = [
      {
        type: "select",
        name: "",
        default: hostileValue,
        options: [{ value: hostileValue, name: hostileName }]
      }
    ];

    // When: showFormDialog renders the select
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: exactly one option exists; no <b> element; round-trip value is unescaped
    const selectEl = document.getElementById("dialogInput0") as HTMLSelectElement;
    expect(selectEl.querySelectorAll("option")).toHaveLength(1);
    expect(selectEl.querySelector("b")).toBeNull();
    expect(selectEl.options[0].textContent).toBe(hostileName);
    expect(selectEl.value).toBe(hostileValue);
  });

  // Case: TC-020
  it("escapes input.name in multi form checkbox name cell (TC-020)", () => {
    // Given: a multi form whose checkbox label tries to escape the cell
    const hostile = "</td><script>alert(1)</script>";
    const inputs: DialogInput[] = [
      { type: "text", name: "Other", default: "", placeholder: null },
      { type: "checkbox", name: hostile, value: false }
    ];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: no script element was injected; the cell text matches the literal label
    expect(dialogEl.querySelector("script")).toBeNull();
    const rows = dialogEl.querySelectorAll("tr");
    const checkboxRow = rows[1];
    const cells = checkboxRow.querySelectorAll("td");
    const nameCell = cells[cells.length - 1];
    expect(nameCell.textContent).toBe(hostile);
  });

  // Case: TC-021
  it("preserves HTML in the message argument (TC-021)", () => {
    // Given: a form whose message uses limited HTML for emphasis
    const inputs: DialogInput[] = [{ type: "text", name: "x", default: "", placeholder: null }];

    // When: showFormDialog renders the dialog
    showFormDialog("<b>hi</b>", inputs, "OK", vi.fn(), null);

    // Then: the <b> element is preserved (message is documented HTML contract)
    expect(dialogEl.querySelector("b")).not.toBeNull();
    expect(dialogEl.querySelector("b")!.textContent).toBe("hi");
  });
});

describe("showFormDialog ref input validation on input/keyup events", () => {
  const INVALID_CHARS_NOTICE = "Unable to OK, one or more invalid characters entered.";

  function openRefDialog(defaultValue: string): HTMLInputElement {
    // A text-ref input at index 0 with the given default value.
    const inputs: DialogInput[] = [createTextRefInput(defaultValue)];
    showFormDialog("Test", inputs, "OK", vi.fn(), null);
    return document.getElementById("dialogInput0") as HTMLInputElement;
  }

  it("marks the dialog active for a valid value on the input event (TC-022)", () => {
    // Case: TC-022
    // Given: a ref input that starts empty (noInput state)
    const refInput = openRefDialog("");
    expect(dialogEl.className).toBe("active noInput");

    // When: a valid value is set and the input event is dispatched
    refInput.value = "feature/x";
    refInput.dispatchEvent(new Event("input"));

    // Then: the dialog className becomes "active" with no noInput/inputInvalid flags
    expect(dialogEl.className).toBe("active");
  });

  it("marks the dialog inputInvalid and sets the notice on the input event (TC-023)", () => {
    // Case: TC-023
    // Given: a ref input with a valid default
    const refInput = openRefDialog("main");
    const actionBtn = document.getElementById("dialogAction") as HTMLElement;

    // When: a value matching refInvalid is set and the input event is dispatched
    refInput.value = "bad name";
    refInput.dispatchEvent(new Event("input"));

    // Then: className gains inputInvalid and the action button title holds the notice
    expect(dialogEl.className).toBe("active inputInvalid");
    expect(actionBtn.title).toBe(INVALID_CHARS_NOTICE);
  });

  it("marks the dialog noInput for an empty value on the input event (TC-024)", () => {
    // Case: TC-024
    // Given: a ref input with a valid default (active state)
    const refInput = openRefDialog("main");
    expect(dialogEl.className).toBe("active");

    // When: the value is cleared and the input event is dispatched
    refInput.value = "";
    refInput.dispatchEvent(new Event("input"));

    // Then: className becomes "active noInput"
    expect(dialogEl.className).toBe("active noInput");
  });

  it("still validates on the keyup event (TC-025)", () => {
    // Case: TC-025
    // Given: a ref input that starts empty (noInput state)
    const refInput = openRefDialog("");
    expect(dialogEl.className).toBe("active noInput");

    // When: a valid value is set and the keyup event is dispatched
    refInput.value = "feature/x";
    refInput.dispatchEvent(new Event("keyup"));

    // Then: className becomes "active" (keyup shares the same validateRefInput handler)
    expect(dialogEl.className).toBe("active");
  });

  it("validates on an input event that is not preceded by keyup (TC-026)", () => {
    // Case: TC-026
    // Given: a ref input that starts empty (noInput state), simulating a paste
    const refInput = openRefDialog("");
    expect(dialogEl.className).toBe("active noInput");

    // When: the value is changed and only the input event is dispatched (no keyup)
    refInput.value = "pasted-branch";
    refInput.dispatchEvent(new Event("input"));

    // Then: validateRefInput ran and className became "active"
    expect(dialogEl.className).toBe("active");
  });

  it("clears the invalid notice when a valid value replaces an invalid one (TC-027)", () => {
    // Case: TC-027
    // Given: a ref input driven into the inputInvalid state via the input event
    const refInput = openRefDialog("main");
    const actionBtn = document.getElementById("dialogAction") as HTMLElement;
    refInput.value = "bad name";
    refInput.dispatchEvent(new Event("input"));
    expect(dialogEl.className).toBe("active inputInvalid");
    expect(actionBtn.title).toBe(INVALID_CHARS_NOTICE);

    // When: a valid value is set and the input event is dispatched
    refInput.value = "valid-branch";
    refInput.dispatchEvent(new Event("input"));

    // Then: className returns to "active" and the notice is cleared to empty string
    expect(dialogEl.className).toBe("active");
    expect(actionBtn.title).toBe("");
  });
});

describe("showFormDialog multi-form checkbox label association", () => {
  function realEscape(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  afterEach(() => {
    vi.mocked(escapeHtml).mockImplementation((s: string) => s);
  });

  // Case: TC-028
  it("renders a label whose for attribute matches the checkbox id in multi form (TC-028)", () => {
    // Given: a multi-element form with one text input and one checkbox
    const inputs: DialogInput[] = [createTextInput("Branch"), createCheckboxInput("Option")];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: exactly one label points at the checkbox id "dialogInput1" and its textContent
    // equals the checkbox name (the text input has its own label, see S9 TC-055)
    const labels = dialogEl.querySelectorAll('table.dialogForm td > label[for="dialogInput1"]');
    expect(labels).toHaveLength(1);
    const label = labels[0];
    expect(label.textContent).toBe("Option");
  });

  // Case: TC-029
  it("toggles the checkbox from unchecked to checked when its label is clicked (TC-029)", () => {
    // Given: a multi form (text + checkbox) whose checkbox starts unchecked
    const inputs: DialogInput[] = [createTextInput("Branch"), createCheckboxInput("Option")];
    showFormDialog("Test", inputs, "OK", vi.fn(), null);
    const checkbox = document.getElementById("dialogInput1") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // When: the associated label is clicked (jsdom labeled control activation)
    const label = dialogEl.querySelector('td > label[for="dialogInput1"]') as HTMLLabelElement;
    label.click();

    // Then: the checkbox checked state changes from false to true
    expect(checkbox.checked).toBe(true);
  });

  // Case: TC-030
  it("returns the checkbox to unchecked after two label clicks (TC-030)", () => {
    // Given: a multi form (text + checkbox) whose checkbox starts unchecked
    const inputs: DialogInput[] = [createTextInput("Branch"), createCheckboxInput("Option")];
    showFormDialog("Test", inputs, "OK", vi.fn(), null);
    const checkbox = document.getElementById("dialogInput1") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    const label = dialogEl.querySelector('td > label[for="dialogInput1"]') as HTMLLabelElement;

    // When: the label is clicked once
    label.click();

    // Then: the checkbox is checked
    expect(checkbox.checked).toBe(true);

    // When: the label is clicked a second time
    label.click();

    // Then: the checkbox returns to its original unchecked state
    expect(checkbox.checked).toBe(false);
  });

  // Case: TC-031
  it("toggles only the corresponding checkbox in an all-checkbox form (TC-031)", () => {
    // Given: a multi form of two checkboxes, both initially unchecked
    const inputs: DialogInput[] = [createCheckboxInput("First"), createCheckboxInput("Second")];
    showFormDialog("Test", inputs, "OK", vi.fn(), null);
    const firstCheckbox = document.getElementById("dialogInput0") as HTMLInputElement;
    const secondCheckbox = document.getElementById("dialogInput1") as HTMLInputElement;
    expect(firstCheckbox.checked).toBe(false);
    expect(secondCheckbox.checked).toBe(false);

    // When: the second checkbox's label is clicked
    const secondLabel = dialogEl.querySelector(
      'td > label[for="dialogInput1"]'
    ) as HTMLLabelElement;
    secondLabel.click();

    // Then: only the second checkbox toggles to true; the first stays unchecked
    expect(secondCheckbox.checked).toBe(true);
    expect(firstCheckbox.checked).toBe(false);
  });

  // Case: TC-032
  it("renders the info icon outside the label and does not toggle on info click (TC-032)", () => {
    // Given: a multi form containing a checkbox with an info tooltip, initially unchecked
    const inputs: DialogInput[] = [
      createTextInput("Branch"),
      { type: "checkbox", name: "Option", value: false, info: "Help text" }
    ];
    showFormDialog("Test", inputs, "OK", vi.fn(), null);
    const checkbox = document.getElementById("dialogInput1") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    // Then: the info icon is rendered outside the label (not a descendant of it)
    const label = dialogEl.querySelector('td > label[for="dialogInput1"]') as HTMLLabelElement;
    const infoSpan = dialogEl.querySelector(".dialogInfo");
    expect(infoSpan).not.toBeNull();
    expect(label.contains(infoSpan)).toBe(false);

    // When: the info icon is clicked
    (infoSpan as HTMLElement).click();

    // Then: the checkbox checked state remains false
    expect(checkbox.checked).toBe(false);
  });

  // Case: TC-033
  it("keeps the legacy structure without a for-attribute label cell in single form (TC-033)", () => {
    // Given: a single form with only one checkbox
    const inputs: DialogInput[] = [createCheckboxInput("Option")];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: the checkbox name is contained in the label inside .dialogFormCheckbox
    const checkboxLabel = dialogEl.querySelector(".dialogFormCheckbox > label");
    expect(checkboxLabel).not.toBeNull();
    expect(checkboxLabel!.textContent).toBe("Option");

    // And: no name cell label with a for attribute (td > label[for]) is generated
    expect(dialogEl.querySelector("td > label[for]")).toBeNull();
  });

  // Case: TC-034
  it("escapes the checkbox name so no HTML element expands inside the label (TC-034)", () => {
    // Given: a multi form whose checkbox name is an HTML payload, with real escaping behavior
    const hostile = "<b>boom</b>";
    vi.mocked(escapeHtml).mockClear();
    vi.mocked(escapeHtml).mockImplementation(realEscape);
    const inputs: DialogInput[] = [createTextInput("Other"), createCheckboxInput(hostile)];

    // When: showFormDialog renders the form
    showFormDialog("Test", inputs, "OK", vi.fn(), null);

    // Then: escapeHtml was called with the checkbox name
    expect(escapeHtml).toHaveBeenCalledWith(hostile);

    // And: no <b> element is created inside the label; the name renders as literal text
    const label = dialogEl.querySelector('td > label[for="dialogInput1"]');
    expect(label).not.toBeNull();
    expect(label!.querySelector("b")).toBeNull();
    expect(label!.textContent).toBe(hostile);
  });
});

// S7: showErrorDialog() 説明付きエラーダイアログの DOM 契約
// @see docs/testing/perspectives/web/dialogs-test.md
describe("showErrorDialog explanation", () => {
  function realEscape(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  function createExplanation(
    overrides: Partial<ErrorDialogExplanation> = {}
  ): ErrorDialogExplanation {
    return {
      summary: "summary text",
      reason: "reason text",
      guidance: "guidance text",
      rawOutputLabel: "Original Git output",
      ...overrides
    };
  }

  beforeEach(() => {
    vi.mocked(escapeHtml).mockImplementation(realEscape);
  });

  afterEach(() => {
    vi.mocked(escapeHtml).mockImplementation((s: string) => s);
  });

  // Case: TC-035
  it("renders summary, reason, guidance and closed details in order with only a dismiss button (TC-035)", () => {
    // Given: an explanation with all four values and a single-line git reason
    const explanation = createExplanation();

    // When: showErrorDialog is called with the explanation
    showErrorDialog("title", "error line", null, explanation);

    // Then: the explanation container holds exactly the four blocks in DOM order
    const containers = dialogEl.querySelectorAll(".errorExplanation");
    expect(containers).toHaveLength(1);
    const children = containers[0].children;
    expect(children).toHaveLength(4);
    expect(children[0].className).toBe("errorExplanationSummary");
    expect(children[0].textContent).toBe(explanation.summary);
    expect(children[1].className).toBe("errorExplanationReason");
    expect(children[1].textContent).toBe(explanation.reason);
    expect(children[2].className).toBe("errorExplanationGuidance");
    expect(children[2].textContent).toBe(explanation.guidance);
    expect(children[3].tagName).toBe("DETAILS");

    // And: the details element starts closed with the raw output label as its summary
    const details = children[3] as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")!.textContent).toBe(explanation.rawOutputLabel);

    // And: the only button is the dismiss button (no action button)
    expect(document.getElementById("dialogDismiss")).not.toBeNull();
    expect(document.getElementById("dialogAction")).toBeNull();
    expect(dialogEl.querySelectorAll(".roundedBtn")).toHaveLength(1);
  });

  // Case: TC-036
  it("keeps the full multi-line git output with newlines inside the pre element (TC-036)", () => {
    // Given: an explanation and a multi-line git reason
    const reason = "error: line1\nIf you are sure line2";

    // When: showErrorDialog is called with the explanation
    showErrorDialog("title", reason, null, createExplanation());

    // Then: the pre element holds the entire reason including the newline, without <br> elements
    const pre = dialogEl.querySelector("details > pre.errorOriginalOutputContent");
    expect(pre).not.toBeNull();
    expect(pre!.textContent).toBe(reason);
    expect(pre!.querySelector("br")).toBeNull();
  });

  // Case: TC-037
  it("escapes HTML payloads in the explanation and the git output (TC-037)", () => {
    // Given: a summary and a git reason that both carry HTML injection payloads
    const hostileSummary = "<b>summary</b>";
    const hostileReason = "<img src=x onerror=alert(1)>";

    // When: showErrorDialog is called with the hostile strings
    showErrorDialog("title", hostileReason, null, createExplanation({ summary: hostileSummary }));

    // Then: no img or b element is created anywhere in the dialog
    expect(dialogEl.querySelector("img")).toBeNull();
    expect(dialogEl.querySelector("b")).toBeNull();

    // And: both payloads are shown as literal text
    expect(dialogEl.querySelector(".errorExplanationSummary")!.textContent).toBe(hostileSummary);
    expect(dialogEl.querySelector(".errorOriginalOutputContent")!.textContent).toBe(hostileReason);
  });

  // Case: TC-038
  it("keeps the legacy errorReason structure for the three-argument call (TC-038)", () => {
    // Given: a legacy three-argument call without an explanation
    // When: showErrorDialog is called
    showErrorDialog("title", "error message", null);

    // Then: the reason is rendered in the existing .errorReason element
    const errorReason = dialogEl.querySelector(".errorReason");
    expect(errorReason).not.toBeNull();
    expect(errorReason!.textContent).toBe("error message");

    // And: no explanation blocks or details element are generated
    expect(dialogEl.querySelector(".errorExplanation")).toBeNull();
    expect(dialogEl.querySelector(".errorExplanationSummary")).toBeNull();
    expect(dialogEl.querySelector(".errorExplanationReason")).toBeNull();
    expect(dialogEl.querySelector(".errorExplanationGuidance")).toBeNull();
    expect(dialogEl.querySelector("details")).toBeNull();
  });
});

// S8: error-dialog-active state used to keep error dialogs open across refresh
// @see docs/testing/perspectives/web/dialogs-test.md
describe("isErrorDialogActive", () => {
  const BRANCH_ERROR_TITLE = "Unable to Delete Branch";
  const BRANCH_ERROR_REASON = "error: the branch 'feature' is not fully merged.";

  let dialogsModule: typeof import("../../web/dialogs");

  beforeAll(async () => {
    dialogsModule = await import("../../web/dialogs");
  });

  // Case: TC-039
  it("returns false before any dialog is shown (TC-039)", async () => {
    // Given: a freshly loaded dialogs module and no active dialog in the DOM
    vi.resetModules();
    const freshModule = await import("../../web/dialogs");

    // When: both queries are read before any dialog has been shown
    const errorActive = freshModule.isErrorDialogActive();
    const dialogActive = freshModule.isDialogActive();

    // Then: neither an error dialog nor any dialog is active
    expect(errorActive).toBe(false);
    expect(dialogActive).toBe(false);
  });

  // Case: TC-040
  it("returns true while an error dialog is shown (TC-040)", () => {
    // Given: no dialog is shown
    // When: the branch deletion error is shown with the three-argument call
    dialogsModule.showErrorDialog(BRANCH_ERROR_TITLE, BRANCH_ERROR_REASON, null);

    // Then: the error dialog and the dialog are both active
    expect(dialogsModule.isErrorDialogActive()).toBe(true);
    expect(dialogsModule.isDialogActive()).toBe(true);
  });

  // Case: TC-041
  it.each([
    {
      name: "showConfirmationDialog",
      message: "Confirm next action?",
      show: (message: string) => dialogsModule.showConfirmationDialog(message, vi.fn(), null)
    },
    {
      name: "showRefInputDialog",
      message: "Enter a branch name",
      show: (message: string) =>
        dialogsModule.showRefInputDialog(message, "feature", "Create", vi.fn(), null)
    },
    {
      name: "showCheckboxDialog",
      message: "Delete the branch?",
      show: (message: string) =>
        dialogsModule.showCheckboxDialog(message, "Force", false, "Delete", vi.fn(), null)
    },
    {
      name: "showSelectDialog",
      message: "Select a mode",
      show: (message: string) =>
        dialogsModule.showSelectDialog(
          message,
          "soft",
          [{ name: "Soft", value: "soft" }],
          "Reset",
          vi.fn(),
          null
        )
    },
    {
      name: "showFormDialog",
      message: "Fill in the form",
      show: (message: string) =>
        dialogsModule.showFormDialog(message, [createTextInput("Message")], "OK", vi.fn(), null)
    }
  ])("returns false after $name replaces the error dialog (TC-041)", ({ message, show }) => {
    // Given: the branch deletion error dialog is shown
    dialogsModule.showErrorDialog(BRANCH_ERROR_TITLE, BRANCH_ERROR_REASON, null);

    // When: another kind of dialog is shown
    show(message);

    // Then: only the generic dialog state stays active
    expect(dialogsModule.isErrorDialogActive()).toBe(false);
    expect(dialogsModule.isDialogActive()).toBe(true);

    // And: the new dialog replaces the error text
    expect(dialogEl.textContent).toContain(message);
    expect(dialogEl.textContent).not.toContain(BRANCH_ERROR_REASON);
    expect(dialogEl.querySelector(".errorReason")).toBeNull();
  });

  // Case: TC-042
  it("returns false after hideDialog closes the error dialog (TC-042)", () => {
    // Given: the branch deletion error dialog is shown
    dialogsModule.showErrorDialog(BRANCH_ERROR_TITLE, BRANCH_ERROR_REASON, null);

    // When: the dialog is hidden by code
    dialogsModule.hideDialog();

    // Then: neither an error dialog nor any dialog is active
    expect(dialogsModule.isErrorDialogActive()).toBe(false);
    expect(dialogsModule.isDialogActive()).toBe(false);
  });

  // Case: TC-043
  it("returns false after the user clicks Dismiss (TC-043)", () => {
    // Given: the branch deletion error dialog is shown
    dialogsModule.showErrorDialog(BRANCH_ERROR_TITLE, BRANCH_ERROR_REASON, null);

    // When: the Dismiss button is clicked
    document.getElementById("dialogDismiss")!.click();

    // Then: the dialog is closed and the error state is cleared
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(dialogsModule.isErrorDialogActive()).toBe(false);
  });

  // Case: TC-044
  it("stays true when another error dialog replaces the first one (TC-044)", () => {
    // Given: the branch deletion error dialog is shown
    dialogsModule.showErrorDialog(BRANCH_ERROR_TITLE, BRANCH_ERROR_REASON, null);

    // When: a pull error dialog replaces it
    dialogsModule.showErrorDialog("Unable to Pull", "CONFLICT", null);

    // Then: the error state stays active and the second error text is shown
    expect(dialogsModule.isErrorDialogActive()).toBe(true);
    expect(dialogEl.querySelector(".errorReason")!.textContent).toBe("CONFLICT");
    expect(dialogEl.textContent).toContain("Unable to Pull");
    expect(dialogEl.textContent).not.toContain(BRANCH_ERROR_REASON);
  });

  // Case: TC-045
  it("returns false while only a confirmation dialog is shown (TC-045)", () => {
    // Given: no earlier error dialog
    // When: a confirmation dialog is shown
    dialogsModule.showConfirmationDialog("Are you sure?", vi.fn(), null);

    // Then: the dialog is active but it is not an error dialog
    expect(dialogsModule.isErrorDialogActive()).toBe(false);
    expect(dialogsModule.isDialogActive()).toBe(true);
  });

  // Case: TC-046
  it("keeps the error dialog DOM free of any state marker (TC-046)", () => {
    // Given: no dialog is shown
    // When: an error dialog is shown with the three-argument call
    dialogsModule.showErrorDialog("title", "error message", null);

    // Then: the dialog and its backing carry exactly the active class
    expect(dialogEl.className).toBe("active");
    expect(document.getElementById("dialogBacking")!.className).toBe("active");

    // And: the dialog has no attribute other than id, class and the modal ARIA attributes
    // (role / aria-modal / aria-labelledby, see S9 TC-055)
    expect(dialogEl.getAttributeNames().sort()).toEqual([
      "aria-labelledby",
      "aria-modal",
      "class",
      "id",
      "role"
    ]);

    // And: it contains one dismiss button and no action button
    expect(dialogEl.querySelectorAll("#dialogDismiss")).toHaveLength(1);
    expect(dialogEl.querySelector("#dialogAction")).toBeNull();
  });
});

// S9: モーダルのフォーカス・Tab 循環・Escape keydown・IME 保護・起点復元
// @see docs/testing/perspectives/web/dialogs-test.md
describe("modal focus, Tab cycle, Escape keydown, IME guard and origin restore (S9)", () => {
  const DIALOG_MESSAGE = "Enter the branch name:";
  let dialogs: typeof import("../../web/dialogs");
  let refreshBtn: HTMLButtonElement;
  let content: HTMLDivElement;
  let rowM: HTMLTableRowElement;
  let sourceElem: HTMLButtonElement;
  let actioned: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    dialogs = await import("../../web/dialogs");
  });

  beforeEach(() => {
    refreshBtn = document.createElement("button");
    refreshBtn.id = "refreshBtn";
    refreshBtn.type = "button";
    document.body.appendChild(refreshBtn);
    content = document.createElement("div");
    content.id = "content";
    content.innerHTML = '<table><tbody><tr id="rowM" tabindex="0"><td>M</td></tr></tbody></table>';
    document.body.appendChild(content);
    rowM = content.querySelector("tr")!;
    sourceElem = document.createElement("button");
    sourceElem.id = "menuSource";
    sourceElem.type = "button";
    document.body.appendChild(sourceElem);
    actioned = vi.fn();
  });

  afterEach(() => {
    dialogs.hideDialog();
    refreshBtn.remove();
    content.remove();
    sourceElem.remove();
  });

  function key(type: "keydown" | "keyup", target: Element, init: KeyboardEventInit): KeyboardEvent {
    const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  }

  function pressKey(target: Element, init: KeyboardEventInit): KeyboardEvent {
    const keydown = key("keydown", target, init);
    key("keyup", target, init);
    return keydown;
  }

  function activeElement(): Element | null {
    return document.activeElement;
  }

  function setValue(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event("input"));
  }

  function input(index: number): HTMLInputElement {
    return document.getElementById(`dialogInput${index}`) as HTMLInputElement;
  }

  function actionBtn(): HTMLButtonElement {
    return document.getElementById("dialogAction") as HTMLButtonElement;
  }

  function dismissBtn(): HTMLButtonElement {
    return document.getElementById("dialogDismiss") as HTMLButtonElement;
  }

  function openRefAndTextForm(source: HTMLElement | null = sourceElem): void {
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [createTextRefInput(""), createTextInput("Path", "../x")],
      "Create",
      actioned,
      source
    );
  }

  // Case: TC-047
  it("moves the real focus from the menu source to the text-ref input (TC-047)", () => {
    // Given: the menu source element holds the real focus
    sourceElem.focus();
    expect(activeElement()).toBe(sourceElem);

    // When: a form with a text-ref input and a text input opens from that source
    openRefAndTextForm();

    // Then: the text-ref input is the active element and the dialog is active
    expect(activeElement()).toBe(input(0));
    expect(input(0).type).toBe("text");
    expect(dialogEl.classList.contains("active")).toBe(true);
  });

  // Case: TC-047
  it("focuses the first text input when there is no text-ref input (TC-047)", () => {
    // Given: a form with a checkbox before two text inputs
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [createCheckboxInput("Force"), createTextInput("First"), createTextInput("Second")],
      "OK",
      actioned,
      sourceElem
    );

    // Then: the first text input (index 1) holds focus, not the checkbox nor the second text
    expect(activeElement()).toBe(input(1));
  });

  // Case: TC-048
  it("runs the action only after a valid ref value and never on keyup (TC-048)", () => {
    // Given: a ref input dialog whose value is empty (noInput) at open
    openRefAndTextForm();
    const refInput = input(0);
    expect(dialogEl.className).toBe("active noInput");
    expect(actionBtn().disabled).toBe(true);

    // When: Enter is pressed with the empty value
    pressKey(refInput, { key: "Enter" });

    // Then: nothing ran and the dialog stays open
    expect(actioned).not.toHaveBeenCalled();
    expect(dialogEl.classList.contains("active")).toBe(true);

    // When: an invalid value is entered (space is invalid) and Enter is pressed
    setValue(refInput, "bad name");
    expect(dialogEl.className).toBe("active inputInvalid");
    expect(actionBtn().disabled).toBe(true);
    pressKey(refInput, { key: "Enter" });

    // Then: still nothing ran and the dialog stays open
    expect(actioned).not.toHaveBeenCalled();
    expect(dialogEl.classList.contains("active")).toBe(true);

    // When: a valid value is entered and Enter keydown then keyup are sent
    setValue(refInput, "feature/x");
    expect(dialogEl.className).toBe("active");
    expect(actionBtn().disabled).toBe(false);
    key("keydown", refInput, { key: "Enter" });

    // Then: the action ran once with every value and the dialog closed
    expect(actioned).toHaveBeenCalledTimes(1);
    expect(actioned).toHaveBeenCalledWith(["feature/x", "../x"]);
    expect(dialogEl.classList.contains("active")).toBe(false);

    // When: the matching keyup arrives on the detached input
    key("keyup", refInput, { key: "Enter" });

    // Then: no additional execution
    expect(actioned).toHaveBeenCalledTimes(1);
  });

  // Case: TC-049
  it.each([
    {
      name: "showConfirmationDialog",
      label: "No",
      show: () => dialogs.showConfirmationDialog("Are you sure?", vi.fn(), null)
    },
    {
      name: "showErrorDialog",
      label: "Dismiss",
      show: () => dialogs.showErrorDialog("Unable to Fetch", "fatal", null)
    }
  ])("focuses the native dismiss button of $name initially (TC-049)", ({ label, show }) => {
    // Given: the background refresh button holds focus
    refreshBtn.focus();

    // When: a dialog without inputs opens
    show();

    // Then: the dismiss button is a native type="button" with the translated name and has focus
    const dismiss = dismissBtn();
    expect(activeElement()).toBe(dismiss);
    expect(dismiss.tagName).toBe("BUTTON");
    expect(dismiss.getAttribute("type")).toBe("button");
    expect(dismiss.textContent).toBe(label);
  });

  // Case: TC-049
  it("renders the action button as a native type=button with its name (TC-049)", () => {
    // Given / When: a confirmation dialog opens
    dialogs.showConfirmationDialog("Are you sure?", vi.fn(), null);

    // Then: the action button is a native button carrying the Yes label, and dismiss has focus
    const action = actionBtn();
    expect(action.tagName).toBe("BUTTON");
    expect(action.getAttribute("type")).toBe("button");
    expect(action.textContent).toBe("Yes");
    expect(activeElement()).toBe(dismissBtn());
  });

  // Case: TC-050
  it("cycles Tab and Shift+Tab inside the dialog without reaching the background (TC-050)", () => {
    // Given: a two-input form (valid ref) with action and dismiss buttons
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [createTextRefInput("main"), createTextInput("Path", "../x")],
      "Create",
      actioned,
      sourceElem
    );
    expect(activeElement()).toBe(input(0));
    const order = [input(1), actionBtn(), dismissBtn(), input(0), input(1)];

    // When: Tab is pressed five times from the first input
    const consumed: boolean[] = [];
    const visited: (Element | null)[] = [];
    for (let i = 0; i < 5; i++) {
      consumed.push(pressKey(activeElement()!, { key: "Tab" }).defaultPrevented);
      visited.push(activeElement());
    }

    // Then: input 1 -> input 2 -> action -> dismiss -> input 1 -> input 2, never the background
    expect(visited).toEqual(order);
    expect(consumed[2]).toBe(true);
    expect(visited).not.toContain(refreshBtn);

    // When: Shift+Tab is pressed on the first input
    input(0).focus();
    const shiftTab = pressKey(input(0), { key: "Tab", shiftKey: true });

    // Then: focus wraps to the dismiss button and the key is consumed
    expect(shiftTab.defaultPrevented).toBe(true);
    expect(activeElement()).toBe(dismissBtn());
  });

  // Case: TC-050
  it("skips a disabled action button in the Tab cycle (TC-050)", () => {
    // Given: a form whose ref input is empty, so the action button is disabled
    openRefAndTextForm();
    expect(actionBtn().disabled).toBe(true);
    input(1).focus();

    // When: Tab is pressed on the last input
    pressKey(input(1), { key: "Tab" });

    // Then: focus lands on dismiss, not on the disabled action button
    expect(activeElement()).toBe(dismissBtn());

    // When: Shift+Tab is pressed on dismiss
    pressKey(dismissBtn(), { key: "Tab", shiftKey: true });

    // Then: focus returns to the last input, again skipping the disabled action button
    expect(activeElement()).toBe(input(1));
  });

  // Case: TC-051
  it("closes only this dialog on Escape keydown and restores the source element (TC-051)", () => {
    // Given: a form opened from the menu source, with a document listener behind the dialog
    sourceElem.focus();
    openRefAndTextForm();
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);
    expect(activeElement()).toBe(input(0));

    // When: Escape keydown is pressed on the input
    const keydown = key("keydown", input(0), { key: "Escape" });

    // Then: the dialog closed without running the action, focus is back on the source, and the
    // keydown was consumed before reaching the global Escape chain
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(actioned).not.toHaveBeenCalled();
    expect(activeElement()).toBe(sourceElem);
    expect(keydown.defaultPrevented).toBe(true);
    expect(documentKeydown).not.toHaveBeenCalled();

    // When: the matching keyup arrives
    key("keyup", sourceElem, { key: "Escape" });

    // Then: nothing changes
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(activeElement()).toBe(sourceElem);
    document.removeEventListener("keydown", documentKeydown);
  });

  // Case: TC-051
  it("restores the source element when the dismiss button closes the dialog (TC-051)", () => {
    // Given: a confirmation dialog opened from the menu source
    sourceElem.focus();
    const confirmed = vi.fn();
    dialogs.showConfirmationDialog("Are you sure?", confirmed, sourceElem);
    expect(activeElement()).toBe(dismissBtn());

    // When: Enter is pressed on the dismiss button
    pressKey(dismissBtn(), { key: "Enter" });

    // Then: the dialog closed without confirming and the source holds focus again
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(confirmed).not.toHaveBeenCalled();
    expect(activeElement()).toBe(sourceElem);
  });

  // Case: TC-052
  it("does not close the dialog on an Escape keyup alone (TC-052)", () => {
    // Given: an open form dialog
    openRefAndTextForm();

    // When: only the Escape keyup is sent
    key("keyup", input(0), { key: "Escape" });

    // Then: the dialog is still active with focus inside
    expect(dialogEl.classList.contains("active")).toBe(true);
    expect(activeElement()).toBe(input(0));
  });

  // Case: TC-052
  it("ignores a repeated Escape keydown (TC-052)", () => {
    // Given: an open form dialog
    openRefAndTextForm();

    // When: Escape arrives as a key repeat
    const repeat = key("keydown", input(0), { key: "Escape", repeat: true });

    // Then: the dialog stays open and the repeat is still consumed locally
    expect(dialogEl.classList.contains("active")).toBe(true);
    expect(repeat.defaultPrevented).toBe(true);
  });

  // Case: TC-053
  it("does not run the action for Enter during IME composition (TC-053)", () => {
    // Given: a valid text form
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [createTextInput("Message", "wip")],
      "Stash",
      actioned,
      null
    );
    const textInput = input(0);

    // When: a composition starts and Enter keydown arrives while composing
    textInput.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    key("keydown", textInput, { key: "Enter", isComposing: true });

    // Then: nothing ran and the dialog stays open
    expect(actioned).not.toHaveBeenCalled();
    expect(dialogEl.classList.contains("active")).toBe(true);

    // When: the composition ends and the matching keyup arrives
    textInput.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
    key("keyup", textInput, { key: "Enter" });

    // Then: still nothing ran
    expect(actioned).not.toHaveBeenCalled();

    // When: a normal Enter follows
    pressKey(textInput, { key: "Enter" });

    // Then: the action ran exactly once
    expect(actioned).toHaveBeenCalledTimes(1);
    expect(actioned).toHaveBeenCalledWith(["wip"]);
  });

  // Case: TC-054
  it("does not run the action for repeated Enter keydown (TC-054)", () => {
    // Given: a valid text form
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [createTextInput("Message", "wip")],
      "Stash",
      actioned,
      null
    );

    // When: Enter keydown arrives three times as a key repeat
    for (let i = 0; i < 3; i++) {
      key("keydown", input(0), { key: "Enter", repeat: true });
    }

    // Then: the action never ran and the dialog is still open
    expect(actioned).not.toHaveBeenCalled();
    expect(dialogEl.classList.contains("active")).toBe(true);
  });

  // Case: TC-055
  it("exposes role, aria-modal, a name and labels for every input (TC-055)", () => {
    // Given / When: a multi form with an unnamed ref input and a named text input opens
    openRefAndTextForm();

    // Then: the dialog is a modal dialog named by the question text
    expect(dialogEl.getAttribute("role")).toBe("dialog");
    expect(dialogEl.getAttribute("aria-modal")).toBe("true");
    const labelledBy = dialogEl.getAttribute("aria-labelledby");
    expect(labelledBy).not.toBeNull();
    const messageEl = document.getElementById(labelledBy!);
    expect(messageEl).not.toBeNull();
    expect(messageEl!.textContent).toBe(DIALOG_MESSAGE);

    // And: the unnamed ref input borrows the question as its name
    expect(input(0).getAttribute("aria-labelledby")).toBe(labelledBy);

    // And: the named text input has a label with a matching for attribute
    const label = dialogEl.querySelector('label[for="dialogInput1"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toBe("Path");
    expect(input(1).hasAttribute("aria-labelledby")).toBe(false);
  });

  // Case: TC-055
  it("names a single named input and a single select without a visible label (TC-055)", () => {
    // Given / When: a single text-ref form whose name is not rendered as a cell
    dialogs.showFormDialog(
      DIALOG_MESSAGE,
      [{ type: "text-ref", name: "Name: ", default: "" }],
      "Add Tag",
      actioned,
      null
    );

    // Then: the input is named by aria-label
    expect(input(0).getAttribute("aria-label")).toBe("Name: ");
    expect(input(0).hasAttribute("aria-labelledby")).toBe(false);

    // When: a select dialog with an empty name replaces it
    dialogs.showSelectDialog(
      "Select a mode",
      "soft",
      [{ name: "Soft", value: "soft" }],
      "Reset",
      vi.fn(),
      null
    );

    // Then: the select borrows the question text as its name
    expect(input(0).tagName).toBe("SELECT");
    expect(input(0).getAttribute("aria-labelledby")).toBe("dialogMessage");
  });

  // Case: TC-056
  it("excludes the background while open and restores it on close (TC-056)", () => {
    // Given: the background controls and a commit row exist, none inert
    expect(refreshBtn.closest("[inert]")).toBeNull();
    expect(rowM.closest("[inert]")).toBeNull();

    // When: a dialog opens
    openRefAndTextForm();

    // Then: the background controls are inert while the dialog is not
    expect(refreshBtn.closest("[inert]")).not.toBeNull();
    expect(rowM.closest("[inert]")).not.toBeNull();
    expect(dialogEl.closest("[inert]")).toBeNull();

    // When: focus escapes to the background refresh button
    refreshBtn.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    // Then: the active element is pulled back inside the dialog
    expect(dialogEl.contains(activeElement())).toBe(true);

    // When: Ctrl+F is pressed inside the dialog with a document listener behind it
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);
    key("keydown", input(0), { key: "f", ctrlKey: true });

    // Then: the dialog consumed the shortcut before the global handler
    expect(documentKeydown).not.toHaveBeenCalled();
    document.removeEventListener("keydown", documentKeydown);

    // When: the dialog closes
    dialogs.hideDialog();

    // Then: the background is back to its original state
    expect(refreshBtn.closest("[inert]")).toBeNull();
    expect(rowM.closest("[inert]")).toBeNull();
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
  });

  // Case: TC-056
  it("keeps an element that was already inert untouched after close (TC-056)", () => {
    // Given: a background element that is inert on its own
    content.setAttribute("inert", "");

    // When: a dialog opens and closes
    openRefAndTextForm();
    dialogs.hideDialog();

    // Then: the pre-existing inert attribute survives, while others were removed
    expect(content.hasAttribute("inert")).toBe(true);
    expect(refreshBtn.hasAttribute("inert")).toBe(false);
  });

  // Case: TC-057
  it("runs the action once for Enter on the focused action button (TC-057)", () => {
    // Given: a confirmation dialog whose action button has focus and a click listener
    const confirmed = vi.fn();
    dialogs.showConfirmationDialog("Are you sure?", confirmed, sourceElem);
    const action = actionBtn();
    action.focus();
    expect(activeElement()).toBe(action);

    // When: Enter keydown then keyup are pressed on the button
    const keydown = pressKey(action, { key: "Enter" });

    // Then: the confirm ran exactly once, the keydown default (native click) was suppressed and
    // the dialog closed
    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(keydown.defaultPrevented).toBe(true);
    expect(dialogEl.classList.contains("active")).toBe(false);

    // When: a stale native click still reaches the detached button
    action.click();

    // Then: no second execution
    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  // Case: TC-057
  it("does not run the action for Enter on a disabled action button (TC-057)", () => {
    // Given: a form whose empty ref input disables the action button
    openRefAndTextForm();
    const action = actionBtn();
    expect(action.disabled).toBe(true);

    // When: Enter is pressed on the disabled action button
    pressKey(action, { key: "Enter" });

    // Then: nothing ran and the dialog stays open
    expect(actioned).not.toHaveBeenCalled();
    expect(dialogEl.classList.contains("active")).toBe(true);
  });

  // Case: TC-058
  it("ignores a stale close from a replaced dialog and restores only for the owner (TC-058)", () => {
    // Given: dialog A opened from the menu source, then replaced by confirmation dialog B
    sourceElem.focus();
    openRefAndTextForm();
    const staleDismiss = dismissBtn();
    const confirmed = vi.fn();
    dialogs.showConfirmationDialog("Replace?", confirmed, null);
    expect(activeElement()).toBe(dismissBtn());
    expect(staleDismiss.isConnected).toBe(false);

    // When: A's dismiss handler runs after the replacement
    staleDismiss.click();

    // Then: B stays open and focus stays inside B
    expect(dialogEl.classList.contains("active")).toBe(true);
    expect(dialogEl.textContent).toContain("Replace?");
    expect(activeElement()).toBe(dismissBtn());
    expect(activeElement()).not.toBe(sourceElem);

    // When: an asynchronous error replaces B and a stale close of the error dialog runs after
    // yet another dialog C took over
    dialogs.showErrorDialog("Unable to Fetch", "fatal", null);
    const staleErrorDismiss = dismissBtn();
    dialogs.showConfirmationDialog("Again?", vi.fn(), null);
    const activeBefore = activeElement();
    key("keydown", staleErrorDismiss, { key: "Escape" });
    staleErrorDismiss.click();

    // Then: the stale error close changes neither the dialog nor the focus
    expect(dialogEl.textContent).toContain("Again?");
    expect(activeElement()).toBe(activeBefore);

    // When: the error dialog is the current owner and closes by Escape
    dialogs.showErrorDialog("Unable to Fetch", "fatal", null);
    key("keydown", dismissBtn(), { key: "Escape" });

    // Then: focus returns to the launch origin inherited through the replacements
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(activeElement()).toBe(sourceElem);
  });

  // Case: TC-058
  it("returns to the element focused before an error dialog opened with no source (TC-058)", () => {
    // Given: the background refresh button holds focus and an error arrives with no source
    refreshBtn.focus();
    dialogs.showErrorDialog("Unable to Fetch", "fatal", null);
    expect(activeElement()).toBe(dismissBtn());

    // When: the error dialog is dismissed by Enter on its button
    pressKey(dismissBtn(), { key: "Enter" });

    // Then: the refresh button holds focus again
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(activeElement()).toBe(refreshBtn);
  });
});

// @see docs/testing/perspectives/web/dialogs-test.md
describe("origin restore for a dialog opened without a source after its menu closed (S10)", () => {
  const REPO = "/test/repo";
  const MERGE_MESSAGE = "Merge?";
  let dialogs: typeof import("../../web/dialogs");
  let configureFocusContext: typeof import("../../web/keyboardNavigation").configureFocusContext;
  let disposeContext: () => void;
  let content: HTMLDivElement;
  let rowM: HTMLTableRowElement;
  let sourceElem: HTMLButtonElement;
  let actioned: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    // The same module registry as `web/dialogs` so the context reaches its restoreFocus.
    dialogs = await import("../../web/dialogs");
    configureFocusContext = (await import("../../web/keyboardNavigation")).configureFocusContext;
  });

  beforeEach(() => {
    content = document.createElement("div");
    content.id = "content";
    content.innerHTML =
      '<div id="commitTable" tabindex="-1"><table><tbody><tr id="rowM" tabindex="0"><td>M</td></tr></tbody></table></div>';
    document.body.appendChild(content);
    rowM = content.querySelector("tr")!;
    sourceElem = document.createElement("button");
    sourceElem.type = "button";
    document.body.appendChild(sourceElem);
    actioned = vi.fn();
    disposeContext = configureFocusContext({
      getRepo: () => REPO,
      getActiveRow: () => rowM,
      getTabStops: () => [rowM]
    });
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);
  });

  afterEach(() => {
    dialogs.hideDialog();
    disposeContext();
    content.remove();
    sourceElem.remove();
  });

  function openMergeForm(source: HTMLElement | null): void {
    dialogs.showFormDialog(
      MERGE_MESSAGE,
      [
        createCheckboxInput("No FF"),
        createCheckboxInput("Squash"),
        createCheckboxInput("No Commit")
      ],
      "Yes, merge",
      actioned,
      source
    );
  }

  function keydown(target: Element, key: string): void {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
  }

  // Case: TC-059
  it("falls back to the active row when no source is given and nothing is focused (TC-059)", () => {
    // Given: a form dialog opened with no source while the activeElement is body
    openMergeForm(null);
    expect(dialogEl.classList.contains("active")).toBe(true);
    expect(dialogEl.contains(document.activeElement)).toBe(true);

    // When: Escape closes it
    keydown(document.activeElement!, "Escape");

    // Then: the active row of the focus context holds focus
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(actioned).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(rowM);

    // When: the same dialog is confirmed from its action button
    rowM.blur();
    openMergeForm(null);
    const actionBtn = document.getElementById("dialogAction")!;
    actionBtn.focus();
    keydown(actionBtn, "Enter");

    // Then: the action ran once and the row holds focus again
    expect(actioned).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(rowM);

    // When: the dismiss button closes it
    rowM.blur();
    openMergeForm(null);
    const dismissBtn = document.getElementById("dialogDismiss")!;
    dismissBtn.focus();
    keydown(dismissBtn, "Enter");

    // Then: the row holds focus and the action did not run again
    expect(actioned).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(rowM);
  });

  // Case: TC-060
  it("restores the given source element ahead of the context fallback (TC-060)", () => {
    // Given: the same form opened with the menu's source while the activeElement is body
    openMergeForm(sourceElem);
    expect(dialogEl.contains(document.activeElement)).toBe(true);

    // When: Escape closes it
    keydown(document.activeElement!, "Escape");

    // Then: the source element holds focus, not the active row
    expect(dialogEl.classList.contains("active")).toBe(false);
    expect(document.activeElement).toBe(sourceElem);
  });
});
