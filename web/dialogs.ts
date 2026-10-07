import { t } from "./i18n";
import {
  captureFocusOrigin,
  type FocusCloseReason,
  type FocusOrigin,
  isKeyboardActionBlocked,
  restoreFocus
} from "./keyboardNavigation";
import { escapeHtml, refInvalid, svgIcons } from "./utils";

const dialog = document.getElementById("dialog")!;
const dialogBacking = document.getElementById("dialogBacking")!;
let dialogMenuSource: HTMLElement | null = null;
let errorDialogShown = false;

const DIALOG_CLASS_NO_INPUT = "active noInput";
const DIALOG_CLASS_INPUT_INVALID = "active inputInvalid";
const CLASS_ACTIVE = "active";
const CLASS_ROUNDED_BTN = "roundedBtn";
const CLASS_SOURCE_DIALOG_ACTIVE = "dialogActive";
const DIALOG_MESSAGE_ID = "dialogMessage";
const DIALOG_ACTION_ID = "dialogAction";
const DIALOG_DISMISS_ID = "dialogDismiss";
const DIALOG_INPUT_ID_PREFIX = "dialogInput";
const ROLE_DIALOG = "dialog";
const ATTR_ROLE = "role";
const ATTR_ARIA_MODAL = "aria-modal";
const ATTR_ARIA_LABELLEDBY = "aria-labelledby";
const ATTR_INERT = "inert";
const ATTR_TABINDEX = "tabindex";
const TABINDEX_EXCLUDED = "-1";
const INPUT_TYPE_TEXT = "text";
const INPUT_TYPE_CHECKBOX = "checkbox";
const CHECKBOX_CHECKED = "checked";
const CHECKBOX_UNCHECKED = "unchecked";
const KEY_ENTER = "Enter";
const KEY_ESCAPE = "Escape";
const KEY_TAB = "Tab";
const EVENT_KEYDOWN = "keydown";
const EVENT_KEYUP = "keyup";
const EVENT_INPUT = "input";
const EVENT_CLICK = "click";
const EVENT_FOCUS_IN = "focusin";
const CAPTURE: AddEventListenerOptions = { capture: true };
const REASON_KEYBOARD: FocusCloseReason = "keyboard";
// Candidates for the Tab cycle; disabled, hidden and tabindex="-1" elements are filtered out.
const FOCUSABLE_SELECTOR = "input, select, textarea, button, summary, [tabindex]";
const HIDDEN_ANCESTOR_SELECTOR = '[hidden], [aria-hidden="true"]';
const DISPLAY_NONE = "none";

// One session per shown dialog: closures compare their session with the active one so a
// dialog that was replaced later neither closes the newer dialog nor moves focus.
interface DialogSession {
  readonly origin: FocusOrigin | null;
  readonly source: HTMLElement | null;
}

let activeSession: DialogSession | null = null;
let lastDialogFocus: HTMLElement | null = null;
let inertBackground: readonly Element[] = [];

function isDialogSubmittable(): boolean {
  return (
    dialog.className !== DIALOG_CLASS_NO_INPUT && dialog.className !== DIALOG_CLASS_INPUT_INVALID
  );
}

export function showConfirmationDialog(
  message: string,
  confirmed: () => void,
  sourceElem: HTMLElement | null
) {
  showDialog(
    message,
    "",
    t("dialog.yes"),
    t("dialog.no"),
    () => {
      hideDialog(REASON_KEYBOARD);
      confirmed();
    },
    sourceElem
  );
}

export function showRefInputDialog(
  message: string,
  defaultValue: string,
  actionName: string,
  actioned: (value: string) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "text-ref", name: "", default: defaultValue }],
    actionName,
    (values) => actioned(values[0]),
    sourceElem
  );
}

export function showCheckboxDialog(
  message: string,
  checkboxLabel: string,
  checkboxValue: boolean,
  actionName: string,
  actioned: (value: boolean) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "checkbox", name: checkboxLabel, value: checkboxValue }],
    actionName,
    (values) => actioned(values[0] === CHECKBOX_CHECKED),
    sourceElem
  );
}

export function showSelectDialog(
  message: string,
  defaultValue: string,
  options: { name: string; value: string }[],
  actionName: string,
  actioned: (value: string) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "select", name: "", options: options, default: defaultValue }],
    actionName,
    (values) => actioned(values[0]),
    sourceElem
  );
}

function inputId(index: number): string {
  return `${DIALOG_INPUT_ID_PREFIX}${index}`;
}

// Accessible name for an input whose name is not rendered as a <label>: an empty name points at
// the dialog question, a single-form name becomes aria-label.
function inputNameAttribute(input: DialogInput, multiElementForm: boolean): string {
  if (input.name === "") return ` ${ATTR_ARIA_LABELLEDBY}="${DIALOG_MESSAGE_ID}"`;
  if (multiElementForm || input.type === INPUT_TYPE_CHECKBOX) return "";
  return ` aria-label="${escapeHtml(input.name)}"`;
}

function buildInputHtml(
  input: DialogInput,
  index: number,
  multiElementForm: boolean,
  infoHtml: string
): string {
  const id = inputId(index);
  const nameAttr = inputNameAttribute(input, multiElementForm);
  if (input.type === "select") {
    let html = `<select id="${id}"${nameAttr}>`;
    for (let j = 0; j < input.options.length; j++) {
      html += `<option value="${escapeHtml(input.options[j].value)}"${input.options[j].value === input.default ? " selected" : ""}>${escapeHtml(input.options[j].name)}</option>`;
    }
    return `${html}</select>`;
  }
  if (input.type === INPUT_TYPE_CHECKBOX) {
    return `<span class="dialogFormCheckbox"><label><input id="${id}" type="checkbox"${input.value ? " checked" : ""}${nameAttr}/><span class="customCheckbox"></span>${multiElementForm ? "" : escapeHtml(input.name)}</label>${multiElementForm ? "" : infoHtml}</span>`;
  }
  const placeholder =
    input.type === INPUT_TYPE_TEXT && input.placeholder !== null
      ? ` placeholder="${escapeHtml(input.placeholder)}"`
      : "";
  return `<input id="${id}" type="text" value="${escapeHtml(input.default)}"${placeholder}${nameAttr}/>`;
}

function buildFormRowHtml(input: DialogInput, index: number, multiElementForm: boolean): string {
  const isCheckbox = input.type === INPUT_TYPE_CHECKBOX;
  const id = inputId(index);
  const nameCell =
    multiElementForm && !isCheckbox
      ? `<td><label for="${id}">${escapeHtml(input.name)}</label></td>`
      : "";
  const infoHtml =
    input.type === INPUT_TYPE_CHECKBOX && input.info !== undefined && input.info !== ""
      ? `<span class="dialogInfo" title="${escapeHtml(input.info)}">${svgIcons.info}</span>`
      : "";
  const checkboxNameCell =
    multiElementForm && isCheckbox
      ? `<td><label for="${id}">${escapeHtml(input.name)}</label>${infoHtml}</td>`
      : "";
  return `<tr>${nameCell}<td>${buildInputHtml(input, index, multiElementForm, infoHtml)}</td>${checkboxNameCell}</tr>`;
}

function readInputValue(input: DialogInput, index: number): string {
  const elem = document.getElementById(inputId(index));
  if (input.type === "select") return (<HTMLSelectElement>elem).value;
  if (input.type === INPUT_TYPE_CHECKBOX) {
    return (<HTMLInputElement>elem).checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
  }
  return (<HTMLInputElement>elem).value;
}

// Initial focus: text-ref, then the first text input, then the first enabled input of any kind.
function initialFormInput(inputs: DialogInput[]): HTMLElement | null {
  const byIndex = (index: number) => document.getElementById(inputId(index));
  const textRef = inputs.findIndex((input) => input.type === "text-ref");
  if (textRef > -1) return byIndex(textRef);
  const text = inputs.findIndex((input) => input.type === INPUT_TYPE_TEXT);
  if (text > -1) return byIndex(text);
  return inputs.map((_input, index) => byIndex(index)).find(isTabStop) ?? null;
}

export function showFormDialog(
  message: string,
  inputs: DialogInput[],
  actionName: string,
  actioned: (values: string[]) => void,
  sourceElem: HTMLElement | null,
  afterCreate?: (dialogElement: HTMLElement) => void
) {
  const multiElementForm = inputs.length > 1;
  const rows = inputs.map((input, index) => buildFormRowHtml(input, index, multiElementForm));
  const formHtml = `<br><table class="dialogForm ${multiElementForm ? "multi" : "single"}">${rows.join("")}</table>`;
  showDialog(
    message,
    formHtml,
    actionName,
    t("dialog.cancel"),
    () => {
      if (!isDialogSubmittable()) return;
      const values = inputs.map(readInputValue);
      hideDialog(REASON_KEYBOARD);
      actioned(values);
    },
    sourceElem
  );

  if (afterCreate) {
    afterCreate(dialog);
  }

  const dialogActionBtn = <HTMLButtonElement>document.getElementById(DIALOG_ACTION_ID)!;
  const textRefInput = inputs.findIndex((input) => input.type === "text-ref");
  if (textRefInput > -1) {
    const dialogInput = <HTMLInputElement>document.getElementById(inputId(textRefInput));
    const validateRefInput = () => {
      const noInput = dialogInput.value === "",
        invalidInput = dialogInput.value.match(refInvalid) !== null;
      const newClassName = `${CLASS_ACTIVE}${noInput ? " noInput" : invalidInput ? " inputInvalid" : ""}`;
      dialogActionBtn.disabled = noInput || invalidInput;
      if (dialog.className !== newClassName) {
        dialog.className = newClassName;
        dialogActionBtn.title = invalidInput
          ? t("dialog.validation.invalidCharacters", actionName)
          : "";
      }
    };
    validateRefInput();
    dialogInput.addEventListener(EVENT_KEYUP, validateRefInput);
    dialogInput.addEventListener(EVENT_INPUT, validateRefInput);
  }

  focusInDialog(initialFormInput(inputs));
}

export interface ErrorDialogExplanation {
  summary: string;
  reason: string;
  guidance: string;
  rawOutputLabel: string;
}

export function showErrorDialog(
  message: string,
  reason: string | null,
  sourceElem: HTMLElement | null,
  explanation?: ErrorDialogExplanation
) {
  const reasonHtml =
    explanation !== undefined && reason !== null
      ? `<div class="errorExplanation"><div class="errorExplanationSummary">${escapeHtml(explanation.summary)}</div><div class="errorExplanationReason">${escapeHtml(explanation.reason)}</div><div class="errorExplanationGuidance">${escapeHtml(explanation.guidance)}</div><details class="errorOriginalOutput"><summary>${escapeHtml(explanation.rawOutputLabel)}</summary><pre class="errorOriginalOutputContent">${escapeHtml(reason)}</pre></details></div>`
      : `${reason !== null ? `<br><span class="errorReason">${escapeHtml(reason).split("\n").join("<br>")}</span>` : ""}`;
  showDialog(
    `${svgIcons.alert}${t("dialog.error")} ${message}`,
    reasonHtml,
    null,
    t("dialog.dismiss"),
    null,
    sourceElem
  );
  errorDialogShown = true;
}

/* === Focus origin, Tab cycle and background exclusion === */

// The launch origin: the menu's source element when given, else the element focused before the
// dialog opened. A dialog replacing another one while focus is inside inherits the origin. With
// nothing focused (a menu action has already hidden its menu) only the repository is kept, so a
// keyboard close falls through to the context chain (active row → list container).
function captureSession(sourceElem: HTMLElement | null): DialogSession {
  if (sourceElem !== null) return { origin: captureFocusOrigin(sourceElem), source: sourceElem };
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) {
    const contextOrigin = captureFocusOrigin(document.body);
    return {
      origin: contextOrigin === null ? null : { ...contextOrigin, source: null },
      source: null
    };
  }
  if (dialog.contains(active)) {
    return { origin: activeSession?.origin ?? null, source: activeSession?.source ?? null };
  }
  return { origin: captureFocusOrigin(active), source: active };
}

// Resolves the semantic key first so a regenerated element with the same key wins; an unmarked
// origin is focused directly while it is still connected.
function focusOrigin(session: DialogSession): void {
  const { origin, source } = session;
  if ((origin === null || origin.keys.length === 0) && source !== null && source.isConnected) {
    source.focus();
    if (document.activeElement === source) return;
  }
  restoreFocus(origin, REASON_KEYBOARD);
}

function isTabStop(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !dialog.contains(element)) return false;
  if (element.matches(":disabled") || element.getAttribute(ATTR_TABINDEX) === TABINDEX_EXCLUDED) {
    return false;
  }
  if (element.closest(HIDDEN_ANCESTOR_SELECTOR) !== null) return false;
  return getComputedStyle(element).display !== DISPLAY_NONE;
}

function tabStops(): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isTabStop);
}

function focusInDialog(preferred: HTMLElement | null): void {
  const target = isTabStop(preferred) ? preferred : (tabStops()[0] ?? null);
  if (target !== null) target.focus();
}

// Tab / Shift+Tab cycle among the enabled visible elements of the dialog; the background is
// never reached even where the `inert` attribute is unsupported.
function cycleFocus(event: KeyboardEvent): void {
  event.preventDefault();
  const stops = tabStops();
  if (stops.length === 0) return;
  const direction = event.shiftKey ? -1 : 1;
  const active = document.activeElement;
  const index = active instanceof HTMLElement ? stops.indexOf(active) : -1;
  const next =
    index === -1
      ? stops[direction === 1 ? 0 : stops.length - 1]
      : stops[(index + direction + stops.length) % stops.length];
  next.focus();
}

function handleEnter(event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof HTMLButtonElement) {
    // Running the handler from keydown and cancelling the default keeps the native click from
    // executing it a second time.
    event.preventDefault();
    if (isKeyboardActionBlocked(event)) return;
    target.click();
    return;
  }
  if (target instanceof HTMLInputElement && target.type === INPUT_TYPE_TEXT) {
    event.preventDefault();
    if (isKeyboardActionBlocked(event) || !isDialogSubmittable()) return;
    document.getElementById(DIALOG_ACTION_ID)?.click();
  }
}

function handleDialogKeydown(event: KeyboardEvent): void {
  const session = activeSession;
  if (session === null) return;
  // Keys pressed inside the dialog belong to it; the background shortcuts never see them.
  event.stopPropagation();
  if (event.key === KEY_ESCAPE) {
    event.preventDefault();
    if (isKeyboardActionBlocked(event)) return;
    closeSession(session, REASON_KEYBOARD);
  } else if (event.key === KEY_TAB) {
    cycleFocus(event);
  } else if (event.key === KEY_ENTER) {
    handleEnter(event);
  }
}

// Focus that escapes the dialog (for example via a pointer) is pulled back to the last focused
// element of the dialog.
function handleDocumentFocusIn(event: FocusEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (dialog.contains(target)) {
    lastDialogFocus = target;
    return;
  }
  focusInDialog(lastDialogFocus);
}

function excludeBackground(): void {
  if (inertBackground.length > 0) return;
  inertBackground = Array.from(document.body.children).filter(
    (element) =>
      element instanceof HTMLElement &&
      !(element instanceof HTMLScriptElement) &&
      element !== dialog &&
      element !== dialogBacking &&
      !element.hasAttribute(ATTR_INERT)
  );
  inertBackground.forEach((element) => element.setAttribute(ATTR_INERT, ""));
}

function restoreBackground(): void {
  inertBackground.forEach((element) => element.removeAttribute(ATTR_INERT));
  inertBackground = [];
}

function closeSession(session: DialogSession, reason: FocusCloseReason): void {
  if (activeSession !== session) return;
  hideDialog(reason);
}

function showDialog(
  messageHtml: string,
  bodyHtml: string,
  actionName: string | null,
  dismissName: string,
  actioned: (() => void) | null,
  sourceElem: HTMLElement | null
) {
  const session = captureSession(sourceElem);
  activeSession = session;
  lastDialogFocus = null;
  dialogBacking.className = CLASS_ACTIVE;
  dialog.className = CLASS_ACTIVE;
  dialog.setAttribute(ATTR_ROLE, ROLE_DIALOG);
  dialog.setAttribute(ATTR_ARIA_MODAL, "true");
  dialog.setAttribute(ATTR_ARIA_LABELLEDBY, DIALOG_MESSAGE_ID);
  const actionHtml =
    actionName !== null
      ? `<button type="button" id="${DIALOG_ACTION_ID}" class="${CLASS_ROUNDED_BTN}">${actionName}</button>`
      : "";
  dialog.innerHTML = `<span id="${DIALOG_MESSAGE_ID}">${messageHtml}</span>${bodyHtml}<br>${actionHtml}<button type="button" id="${DIALOG_DISMISS_ID}" class="${CLASS_ROUNDED_BTN}">${dismissName}</button>`;
  if (actionName !== null && actioned !== null) {
    document.getElementById(DIALOG_ACTION_ID)!.addEventListener(EVENT_CLICK, () => {
      if (activeSession === session) actioned();
    });
  }
  const dismissBtn = document.getElementById(DIALOG_DISMISS_ID)!;
  dismissBtn.addEventListener(EVENT_CLICK, () => closeSession(session, REASON_KEYBOARD));

  dialogMenuSource = sourceElem;
  if (dialogMenuSource !== null) dialogMenuSource.classList.add(CLASS_SOURCE_DIALOG_ACTIVE);
  errorDialogShown = false;

  excludeBackground();
  dialog.addEventListener(EVENT_KEYDOWN, handleDialogKeydown);
  document.addEventListener(EVENT_FOCUS_IN, handleDocumentFocusIn, CAPTURE);
  focusInDialog(dismissBtn);
}

/**
 * Closes the dialog. Without `reason` (programmatic close) and for every reason other than
 * `"keyboard"` focus is left where it is; `"keyboard"` restores the launch origin.
 */
export function hideDialog(reason?: FocusCloseReason) {
  const session = activeSession;
  activeSession = null;
  lastDialogFocus = null;
  dialog.removeEventListener(EVENT_KEYDOWN, handleDialogKeydown);
  document.removeEventListener(EVENT_FOCUS_IN, handleDocumentFocusIn, CAPTURE);
  dialogBacking.className = "";
  dialog.className = "";
  dialog.innerHTML = "";
  dialog.removeAttribute(ATTR_ROLE);
  dialog.removeAttribute(ATTR_ARIA_MODAL);
  dialog.removeAttribute(ATTR_ARIA_LABELLEDBY);
  errorDialogShown = false;
  if (dialogMenuSource !== null) {
    dialogMenuSource.classList.remove(CLASS_SOURCE_DIALOG_ACTIVE);
    dialogMenuSource = null;
  }
  restoreBackground();
  if (reason === REASON_KEYBOARD && session !== null) focusOrigin(session);
}

export function isDialogActive() {
  return dialog.classList.contains(CLASS_ACTIVE);
}

export function isErrorDialogActive(): boolean {
  return errorDialogShown && isDialogActive();
}
